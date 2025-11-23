"""
Integration tests for User Management API endpoints.

Tests cover:
- User CRUD operations
- Role-based access control
- Email uniqueness validation
- Password hashing
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import datetime


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_users(test_client, admin_auth_headers, test_db, church_data):
    """Test listing users for current church."""
    # Create users
    for i in range(3):
        await test_db.users.insert_one({
            "id": f"user-{i}",
            "church_id": church_data["id"],
            "email": f"user{i}@church.org",
            "full_name": f"User {i}",
            "role": "staff" if i > 0 else "admin",
            "is_active": True,
            "hashed_password": "hashed",
            "created_at": datetime.utcnow()
        })

    response = await test_client.get(
        "/api/users/management",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["success"] is True
    assert len(result["data"]) == 3
    # Verify passwords are removed
    for user in result["data"]:
        assert "hashed_password" not in user


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_users_by_role(test_client, admin_auth_headers, test_db, church_data):
    """Test filtering users by role."""
    # Create users with different roles
    for role in ["admin", "staff", "staff"]:
        await test_db.users.insert_one({
            "id": f"user-{role}-{id(role)}",
            "church_id": church_data["id"],
            "email": f"{role}@church.org",
            "full_name": role.title(),
            "role": role,
            "is_active": True,
            "created_at": datetime.utcnow()
        })

    response = await test_client.get(
        "/api/users/management?role=staff",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert len(result["data"]) == 2
    for user in result["data"]:
        assert user["role"] == "staff"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_user_success(test_client, admin_auth_headers, church_data):
    """Test creating a new user."""
    user_data = {
        "email": "newstaff@church.org",
        "full_name": "New Staff Member",
        "phone": "+6281234567890",
        "password": "SecurePass123!",
        "role": "staff",
        "church_id": church_data["id"],
        "kiosk_pin": "123456"
    }

    response = await test_client.post(
        "/api/users/management",
        json=user_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["success"] is True
    assert data["user"]["email"] == "newstaff@church.org"
    assert data["user"]["role"] == "staff"
    assert "hashed_password" not in data["user"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_user_duplicate_email_fails(test_client, admin_auth_headers, test_db, church_data):
    """Test creating user with duplicate email fails."""
    # Create existing user
    await test_db.users.insert_one({
        "id": "user-001",
        "email": "existing@church.org",
        "full_name": "Existing User",
        "church_id": church_data["id"],
        "role": "staff",
        "is_active": True,
        "created_at": datetime.utcnow()
    })

    # Try to create with same email
    user_data = {
        "email": "existing@church.org",  # Duplicate
        "full_name": "New User",
        "password": "password123",
        "role": "staff",
        "church_id": church_data["id"]
    }

    response = await test_client.post(
        "/api/users/management",
        json=user_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_user_by_id(test_client, admin_auth_headers, test_db, church_data):
    """Test retrieving single user by ID."""
    await test_db.users.insert_one({
        "id": "user-001",
        "church_id": church_data["id"],
        "email": "staff@church.org",
        "full_name": "Staff Member",
        "role": "staff",
        "is_active": True,
        "hashed_password": "hashed",
        "created_at": datetime.utcnow()
    })

    response = await test_client.get(
        "/api/users/management/user-001",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    user = response.json()
    assert user["id"] == "user-001"
    assert user["email"] == "staff@church.org"
    assert "hashed_password" not in user


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_user_success(test_client, admin_auth_headers, test_db, church_data):
    """Test updating user."""
    await test_db.users.insert_one({
        "id": "user-001",
        "church_id": church_data["id"],
        "email": "old@church.org",
        "full_name": "Old Name",
        "role": "staff",
        "is_active": True,
        "created_at": datetime.utcnow()
    })

    update_data = {
        "full_name": "New Name",
        "phone": "+6281234567890"
    }

    response = await test_client.patch(
        "/api/users/management/user-001",
        json=update_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    user = response.json()
    assert user["full_name"] == "New Name"
    assert user["phone"] == "+6281234567890"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_user_password(test_client, admin_auth_headers, test_db, church_data):
    """Test updating user password."""
    await test_db.users.insert_one({
        "id": "user-001",
        "church_id": church_data["id"],
        "email": "user@church.org",
        "full_name": "User",
        "role": "staff",
        "is_active": True,
        "hashed_password": "old_hash",
        "created_at": datetime.utcnow()
    })

    update_data = {
        "password": "NewSecurePass123!"
    }

    response = await test_client.patch(
        "/api/users/management/user-001",
        json=update_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 200

    # Verify password was hashed (not stored as plaintext)
    updated_user = await test_db.users.find_one({"id": "user-001"})
    assert updated_user["hashed_password"] != "NewSecurePass123!"
    assert updated_user["hashed_password"] != "old_hash"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_deactivate_user(test_client, admin_auth_headers, test_db, church_data):
    """Test deactivating user."""
    await test_db.users.insert_one({
        "id": "user-001",
        "church_id": church_data["id"],
        "email": "user@church.org",
        "full_name": "User",
        "role": "staff",
        "is_active": True,
        "created_at": datetime.utcnow()
    })

    update_data = {
        "is_active": False
    }

    response = await test_client.patch(
        "/api/users/management/user-001",
        json=update_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    user = response.json()
    assert user["is_active"] is False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_user(test_client, admin_auth_headers, test_db, church_data):
    """Test deleting user."""
    await test_db.users.insert_one({
        "id": "user-001",
        "church_id": church_data["id"],
        "email": "user@church.org",
        "full_name": "User",
        "role": "staff",
        "is_active": True,
        "created_at": datetime.utcnow()
    })

    response = await test_client.delete(
        "/api/users/management/user-001",
        headers=admin_auth_headers
    )

    assert response.status_code == 204

    # Verify deleted
    deleted = await test_db.users.find_one({"id": "user-001"})
    assert deleted is None


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_users_multi_tenant_isolation(
    test_client, test_db, church_data, second_church_data, admin_auth_headers
):
    """Test users are isolated between churches."""
    # Create user for Church A
    await test_db.users.insert_one({
        "id": "user-a",
        "church_id": church_data["id"],
        "email": "user-a@church-a.org",
        "full_name": "Church A User",
        "role": "staff",
        "is_active": True,
        "created_at": datetime.utcnow()
    })

    # Create user for Church B
    await test_db.users.insert_one({
        "id": "user-b",
        "church_id": second_church_data["id"],
        "email": "user-b@church-b.org",
        "full_name": "Church B User",
        "role": "staff",
        "is_active": True,
        "created_at": datetime.utcnow()
    })

    # List users (authenticated as Church A admin)
    response = await test_client.get(
        "/api/users/management",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    result = response.json()

    # Should only see Church A's user
    assert len(result["data"]) == 1
    assert result["data"][0]["id"] == "user-a"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_cannot_create_super_admin_as_regular_admin(test_client, admin_auth_headers, church_data):
    """Test regular admin cannot create super_admin users."""
    user_data = {
        "email": "super@church.org",
        "full_name": "Super Admin",
        "password": "password123",
        "role": "super_admin",  # Not allowed
        "church_id": None
    }

    response = await test_client.post(
        "/api/users/management",
        json=user_data,
        headers=admin_auth_headers
    )

    # Should fail (exact error depends on implementation)
    assert response.status_code in [400, 403]
