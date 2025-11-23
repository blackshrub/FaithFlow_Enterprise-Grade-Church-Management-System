"""
Integration tests for Settings API endpoints.

Tests cover:
- Member status CRUD operations
- Church settings management
- Default status handling
- Demographic presets
- Event categories
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import datetime


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_member_status(test_client, admin_auth_headers, church_data):
    """Test creating a member status."""
    status_data = {
        "church_id": church_data["id"],
        "name": "New Believer",
        "description": "Recently accepted Christ",
        "color": "#3B82F6",
        "icon": "user-plus",
        "display_order": 1,
        "is_default": False,
        "is_active": True
    }

    response = await test_client.post(
        "/api/settings/member-statuses",
        json=status_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "New Believer"
    assert data["color"] == "#3B82F6"
    assert "id" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_member_status_duplicate_name_fails(test_client, admin_auth_headers, test_db, church_data):
    """Test creating duplicate member status fails."""
    # Create first status
    await test_db.member_statuses.insert_one({
        "id": "status-001",
        "church_id": church_data["id"],
        "name": "Active Member",
        "display_order": 1,
        "is_default": False,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    # Try to create duplicate
    status_data = {
        "church_id": church_data["id"],
        "name": "Active Member",  # Duplicate
        "display_order": 2
    }

    response = await test_client.post(
        "/api/settings/member-statuses",
        json=status_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"].lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_default_status_unsets_others(test_client, admin_auth_headers, test_db, church_data):
    """Test creating default status unsets other defaults."""
    # Create existing default status
    await test_db.member_statuses.insert_one({
        "id": "status-001",
        "church_id": church_data["id"],
        "name": "Visitor",
        "is_default": True,
        "display_order": 1,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    # Create new default status
    status_data = {
        "church_id": church_data["id"],
        "name": "New Member",
        "is_default": True,
        "display_order": 2
    }

    response = await test_client.post(
        "/api/settings/member-statuses",
        json=status_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 201

    # Verify old default was unset
    old_status = await test_db.member_statuses.find_one({"id": "status-001"})
    assert old_status["is_default"] is False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_member_statuses(test_client, admin_auth_headers, test_db, church_data):
    """Test listing member statuses."""
    # Create multiple statuses
    for i in range(3):
        await test_db.member_statuses.insert_one({
            "id": f"status-{i}",
            "church_id": church_data["id"],
            "name": f"Status {i}",
            "display_order": i,
            "is_default": i == 0,
            "created_at": datetime.utcnow().isoformat(),
            "updated_at": datetime.utcnow().isoformat()
        })

    response = await test_client.get(
        "/api/settings/member-statuses",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    statuses = response.json()
    assert len(statuses) == 3
    # Should be sorted by display_order
    assert statuses[0]["name"] == "Status 0"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_member_status_by_id(test_client, admin_auth_headers, test_db, church_data):
    """Test retrieving single member status."""
    await test_db.member_statuses.insert_one({
        "id": "status-001",
        "church_id": church_data["id"],
        "name": "Active",
        "display_order": 1,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    response = await test_client.get(
        "/api/settings/member-statuses/status-001",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "status-001"
    assert data["name"] == "Active"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_member_status(test_client, admin_auth_headers, test_db, church_data):
    """Test updating member status."""
    await test_db.member_statuses.insert_one({
        "id": "status-001",
        "church_id": church_data["id"],
        "name": "Old Name",
        "color": "#000000",
        "display_order": 1,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    update_data = {
        "name": "New Name",
        "color": "#FF0000"
    }

    response = await test_client.patch(
        "/api/settings/member-statuses/status-001",
        json=update_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["color"] == "#FF0000"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_member_status(test_client, admin_auth_headers, test_db, church_data):
    """Test deleting member status."""
    await test_db.member_statuses.insert_one({
        "id": "status-001",
        "church_id": church_data["id"],
        "name": "Inactive",
        "display_order": 1,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    response = await test_client.delete(
        "/api/settings/member-statuses/status-001",
        headers=admin_auth_headers
    )

    assert response.status_code == 204

    # Verify deleted
    deleted = await test_db.member_statuses.find_one({"id": "status-001"})
    assert deleted is None


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_member_statuses_multi_tenant_isolation(
    test_client, test_db, church_data, second_church_data, admin_auth_headers
):
    """Test member statuses are isolated between churches."""
    # Create status for Church A
    await test_db.member_statuses.insert_one({
        "id": "status-a",
        "church_id": church_data["id"],
        "name": "Church A Status",
        "display_order": 1,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    # Create status for Church B
    await test_db.member_statuses.insert_one({
        "id": "status-b",
        "church_id": second_church_data["id"],
        "name": "Church B Status",
        "display_order": 1,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    })

    # List statuses (authenticated as Church A admin)
    response = await test_client.get(
        "/api/settings/member-statuses",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    statuses = response.json()

    # Should only see Church A's status
    assert len(statuses) == 1
    assert statuses[0]["id"] == "status-a"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_church_settings(test_client, admin_auth_headers, test_db, church_data):
    """Test retrieving church settings."""
    # Create church settings
    await test_db.church_settings.insert_one({
        "id": "settings-001",
        "church_id": church_data["id"],
        "timezone": "Asia/Jakarta",
        "locale": "id",
        "enable_kiosk": True,
        "enable_online_giving": False,
        "require_photo": True
    })

    response = await test_client.get(
        "/api/settings/church",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    settings = response.json()
    assert settings["timezone"] == "Asia/Jakarta"
    assert settings["enable_kiosk"] is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_church_settings(test_client, admin_auth_headers, test_db, church_data):
    """Test updating church settings."""
    # Create initial settings
    await test_db.church_settings.insert_one({
        "id": "settings-001",
        "church_id": church_data["id"],
        "timezone": "Asia/Jakarta",
        "enable_kiosk": False
    })

    update_data = {
        "enable_kiosk": True,
        "require_photo": True
    }

    response = await test_client.patch(
        "/api/settings/church",
        json=update_data,
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    settings = response.json()
    assert settings["enable_kiosk"] is True
    assert settings["require_photo"] is True
