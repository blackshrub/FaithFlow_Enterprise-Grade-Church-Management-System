"""
Pytest configuration and global fixtures for FaithFlow backend testing.

This file provides:
- Test database setup and teardown
- Async test client for FastAPI
- Authentication fixtures (users, tokens)
- Test data factories (churches, members, events)
- Multi-tenant isolation helpers
"""

import pytest
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from httpx import AsyncClient
from datetime import datetime, timedelta
from typing import Dict, Any
import os

# Import main app
from server import app
from utils.dependencies import get_db
from utils.auth import get_password_hash, create_access_token

# Test database configuration
TEST_MONGO_URL = os.environ.get("TEST_MONGO_URL", "mongodb://localhost:27018")
TEST_DB_NAME = os.environ.get("TEST_DB_NAME", "faithflow_test")


@pytest.fixture(scope="session")
def event_loop():
    """
    Create event loop for async tests.

    This fixture ensures we have a single event loop for the entire test session,
    which is required for async tests with pytest-asyncio.
    """
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="function")
async def test_db():
    """
    Create fresh test database for each test.

    This fixture:
    1. Connects to test MongoDB instance
    2. Cleans all collections before test
    3. Yields database connection
    4. Cleans all collections after test
    5. Closes connection

    Usage:
        async def test_example(test_db):
            await test_db.members.insert_one({"name": "Test"})
    """
    client = AsyncIOMotorClient(TEST_MONGO_URL)
    db = client[TEST_DB_NAME]

    # Clean database before test
    await cleanup_test_db(db)

    yield db

    # Clean database after test
    await cleanup_test_db(db)
    client.close()


async def cleanup_test_db(db):
    """
    Drop all collections in test database.

    Args:
        db: MongoDB database instance
    """
    collections = await db.list_collection_names()
    for collection in collections:
        await db[collection].delete_many({})


@pytest.fixture
async def test_client(test_db):
    """
    Create test client with test database dependency override.

    This fixture:
    1. Overrides get_db dependency to use test database
    2. Creates async HTTP client for FastAPI
    3. Yields client for testing
    4. Clears dependency overrides after test

    Usage:
        async def test_api(test_client):
            response = await test_client.get("/api/members/")
            assert response.status_code == 200
    """
    app.dependency_overrides[get_db] = lambda: test_db

    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


# ==================== Church Fixtures ====================

@pytest.fixture
async def church_data(test_db):
    """
    Create test church.

    Returns:
        dict: Church document with standard test data
    """
    church = {
        "id": "test-church-001",
        "name": "Test Church",
        "email": "test@church.org",
        "timezone": "Asia/Jakarta",
        "locale": "id",
        "address": "Test Address 123",
        "phone": "+6281234567890",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await test_db.churches.insert_one(church)
    return church


@pytest.fixture
async def second_church_data(test_db):
    """
    Create second test church for multi-tenant testing.

    Returns:
        dict: Second church document
    """
    church = {
        "id": "test-church-002",
        "name": "Second Test Church",
        "email": "test2@church.org",
        "timezone": "Asia/Jakarta",
        "locale": "en",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await test_db.churches.insert_one(church)
    return church


# ==================== User Fixtures ====================

@pytest.fixture
async def admin_user(test_db, church_data):
    """
    Create test admin user for first church.

    Returns:
        dict: Admin user document with credentials
    """
    user = {
        "id": "test-admin-001",
        "email": "admin@test.org",
        "password_hash": get_password_hash("test123"),
        "full_name": "Test Admin",
        "role": "admin",
        "church_id": church_data["id"],
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await test_db.users.insert_one(user)
    # Add plain password for easy access in tests
    user["password"] = "test123"
    return user


@pytest.fixture
async def staff_user(test_db, church_data):
    """
    Create test staff user for first church.

    Returns:
        dict: Staff user document with credentials
    """
    user = {
        "id": "test-staff-001",
        "email": "staff@test.org",
        "password_hash": get_password_hash("test123"),
        "full_name": "Test Staff",
        "role": "staff",
        "church_id": church_data["id"],
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await test_db.users.insert_one(user)
    user["password"] = "test123"
    return user


@pytest.fixture
async def super_admin_user(test_db):
    """
    Create test super admin user (no church_id).

    Returns:
        dict: Super admin user document with credentials
    """
    user = {
        "id": "test-super-001",
        "email": "super@test.org",
        "password_hash": get_password_hash("test123"),
        "full_name": "Test Super Admin",
        "role": "super_admin",
        "church_id": None,  # Super admin has no church_id
        "is_active": True,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }
    await test_db.users.insert_one(user)
    user["password"] = "test123"
    return user


# ==================== Auth Header Fixtures ====================

@pytest.fixture
async def auth_headers(test_client, admin_user):
    """
    Get authentication headers for admin user.

    Performs login and returns headers with JWT token.

    Usage:
        async def test_protected_endpoint(test_client, auth_headers):
            response = await test_client.get("/api/members/", headers=auth_headers)
    """
    response = await test_client.post("/api/auth/login", json={
        "email": admin_user["email"],
        "password": admin_user["password"]
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
async def staff_auth_headers(test_client, staff_user):
    """
    Get authentication headers for staff user.
    """
    response = await test_client.post("/api/auth/login", json={
        "email": staff_user["email"],
        "password": staff_user["password"]
    })
    assert response.status_code == 200
    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def admin_token(admin_user, church_data):
    """
    Generate JWT token for admin user without making HTTP request.

    Useful for unit tests that need a token but don't need full auth flow.

    Returns:
        str: JWT access token
    """
    token_data = {
        "sub": admin_user["id"],
        "email": admin_user["email"],
        "role": admin_user["role"],
        "church_id": admin_user["church_id"],
        "session_church_id": church_data["id"],
        "exp": datetime.utcnow() + timedelta(hours=24)
    }
    return create_access_token(token_data)


# ==================== Member Status Fixtures ====================

@pytest.fixture
async def member_statuses(test_db, church_data):
    """
    Create default member statuses for testing.

    Returns:
        list: List of member status documents
    """
    statuses = [
        {
            "id": "status-visitor",
            "church_id": church_data["id"],
            "name": "Visitor",
            "slug": "visitor",
            "description": "First time visitor",
            "color": "#6B7280",
            "order": 1,
            "is_default_for_new": True,
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "id": "status-active",
            "church_id": church_data["id"],
            "name": "Active",
            "slug": "active",
            "description": "Active member",
            "color": "#10B981",
            "order": 2,
            "is_default_for_new": False,
            "is_active": True,
            "created_at": datetime.utcnow()
        },
        {
            "id": "status-inactive",
            "church_id": church_data["id"],
            "name": "Inactive",
            "slug": "inactive",
            "description": "Inactive member",
            "color": "#EF4444",
            "order": 3,
            "is_default_for_new": False,
            "is_active": True,
            "created_at": datetime.utcnow()
        }
    ]

    await test_db.member_statuses.insert_many(statuses)
    return statuses


# ==================== Test Markers ====================

def pytest_configure(config):
    """
    Configure custom pytest markers.
    """
    config.addinivalue_line(
        "markers", "unit: Unit tests (fast, no DB)"
    )
    config.addinivalue_line(
        "markers", "integration: Integration tests (require DB)"
    )
    config.addinivalue_line(
        "markers", "e2e: End-to-end tests (slow, full stack)"
    )
    config.addinivalue_line(
        "markers", "slow: Slow tests (skip in quick runs)"
    )
    config.addinivalue_line(
        "markers", "multi_tenant: Multi-tenant isolation tests"
    )
