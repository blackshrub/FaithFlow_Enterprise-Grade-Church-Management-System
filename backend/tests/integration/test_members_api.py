"""
Integration tests for Members API endpoints.

These tests verify:
- Member CRUD operations
- Multi-tenant isolation
- Authentication & authorization
- Data validation
- QR code generation

Run with: pytest tests/integration/test_members_api.py
"""

import pytest
from httpx import AsyncClient
from tests.fixtures.factories import MemberFactory


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_member_success(test_client: AsyncClient, auth_headers, church_data, member_statuses):
    """Test creating a member with valid data."""
    member_data = {
        "church_id": church_data["id"],
        "full_name": "John Doe",
        "email": "john@example.com",
        "phone_whatsapp": "+6281234567890",
        "gender": "Male",
        "date_of_birth": "1990-01-15",
        "member_status": "Active"
    }

    response = await test_client.post(
        "/api/members/",
        json=member_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "John Doe"
    assert data["email"] == "john@example.com"
    assert "id" in data
    assert "personal_qr_code" in data  # QR code should be auto-generated


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_member_validation_error_missing_name(test_client, auth_headers, church_data):
    """Test member creation fails when required field is missing."""
    member_data = {
        "church_id": church_data["id"],
        # Missing full_name
        "email": "john@example.com"
    }

    response = await test_client.post(
        "/api/members/",
        json=member_data,
        headers=auth_headers
    )

    assert response.status_code == 422  # Validation error


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_member_validation_error_invalid_email(test_client, auth_headers, church_data):
    """Test member creation fails with invalid email format."""
    member_data = {
        "church_id": church_data["id"],
        "full_name": "John Doe",
        "email": "invalid-email"  # Invalid format
    }

    response = await test_client.post(
        "/api/members/",
        json=member_data,
        headers=auth_headers
    )

    assert response.status_code == 422


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_members_empty(test_client, auth_headers):
    """Test listing members when database is empty."""
    response = await test_client.get(
        "/api/members/",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) == 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_members_with_data(test_client, auth_headers, test_db, church_data):
    """Test listing members returns all members for the church."""
    # Create 3 test members using factory
    members = []
    for i in range(3):
        member = MemberFactory.create(
            church_id=church_data["id"],
            full_name=f"Member {i+1}"
        )
        await test_db.members.insert_one(member)
        members.append(member)

    response = await test_client.get(
        "/api/members/",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    assert data[0]["full_name"] == "Member 1"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_member_by_id(test_client, auth_headers, test_db, church_data):
    """Test retrieving a single member by ID."""
    # Create test member
    member = MemberFactory.create(
        church_id=church_data["id"],
        full_name="John Doe"
    )
    await test_db.members.insert_one(member)

    response = await test_client.get(
        f"/api/members/{member['id']}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == member["id"]
    assert data["full_name"] == "John Doe"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_member_not_found(test_client, auth_headers):
    """Test retrieving non-existent member returns 404."""
    response = await test_client.get(
        "/api/members/non-existent-id",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_member(test_client, auth_headers, test_db, church_data):
    """Test updating member information."""
    # Create test member
    member = MemberFactory.create(
        church_id=church_data["id"],
        full_name="John Doe"
    )
    await test_db.members.insert_one(member)

    # Update member
    update_data = {
        "full_name": "John Smith",
        "email": "john.smith@example.com"
    }

    response = await test_client.patch(
        f"/api/members/{member['id']}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == "John Smith"
    assert data["email"] == "john.smith@example.com"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_member(test_client, auth_headers, test_db, church_data):
    """Test soft deleting a member."""
    # Create test member
    member = MemberFactory.create(church_id=church_data["id"])
    await test_db.members.insert_one(member)

    response = await test_client.delete(
        f"/api/members/{member['id']}",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Verify member is soft-deleted (not actually deleted)
    deleted_member = await test_db.members.find_one({"id": member["id"]})
    assert deleted_member is not None
    assert deleted_member.get("deleted") is True


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_multi_tenant_isolation(test_client, test_db, church_data, second_church_data, auth_headers):
    """
    Test that members are isolated by church_id.

    This is a CRITICAL test for multi-tenant systems:
    - Church A cannot access Church B's members
    - List endpoint only returns Church A's members
    - Get by ID returns 404 for Church B's members
    """
    # Create member for Church A
    member_a = MemberFactory.create(
        church_id=church_data["id"],
        full_name="Church A Member"
    )
    await test_db.members.insert_one(member_a)

    # Create member for Church B
    member_b = MemberFactory.create(
        church_id=second_church_data["id"],
        full_name="Church B Member"
    )
    await test_db.members.insert_one(member_b)

    # List members (authenticated as Church A admin)
    response = await test_client.get("/api/members/", headers=auth_headers)

    assert response.status_code == 200
    members = response.json()

    # Should only see Church A's member
    assert len(members) == 1
    assert members[0]["id"] == member_a["id"]
    assert member_b["id"] not in [m["id"] for m in members]

    # Attempt to get Church B's member directly
    response = await test_client.get(
        f"/api/members/{member_b['id']}",
        headers=auth_headers
    )

    # Should return 404 (not 403, to prevent info leak)
    assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_members_pagination(test_client, auth_headers, test_db, church_data):
    """Test member listing with pagination."""
    # Create 25 test members
    for i in range(25):
        member = MemberFactory.create(
            church_id=church_data["id"],
            full_name=f"Member {i+1:02d}"
        )
        await test_db.members.insert_one(member)

    # Get first page (limit=10)
    response = await test_client.get(
        "/api/members/?limit=10&offset=0",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10

    # Get second page
    response = await test_client.get(
        "/api/members/?limit=10&offset=10",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 10

    # Get third page
    response = await test_client.get(
        "/api/members/?limit=10&offset=20",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5  # Remaining members


@pytest.mark.integration
@pytest.mark.asyncio
async def test_search_members_by_name(test_client, auth_headers, test_db, church_data):
    """Test searching members by name."""
    # Create members with different names
    await test_db.members.insert_one(
        MemberFactory.create(church_id=church_data["id"], full_name="John Doe")
    )
    await test_db.members.insert_one(
        MemberFactory.create(church_id=church_data["id"], full_name="Jane Smith")
    )
    await test_db.members.insert_one(
        MemberFactory.create(church_id=church_data["id"], full_name="John Smith")
    )

    # Search for "John"
    response = await test_client.get(
        "/api/members/?search=John",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert all("John" in m["full_name"] for m in data)


@pytest.mark.integration
@pytest.mark.asyncio
async def test_unauthorized_access_no_token(test_client):
    """Test that endpoints require authentication."""
    response = await test_client.get("/api/members/")

    assert response.status_code == 401  # Unauthorized


@pytest.mark.integration
@pytest.mark.asyncio
async def test_staff_can_create_member(test_client, staff_auth_headers, church_data, member_statuses):
    """Test that staff users can create members."""
    member_data = {
        "church_id": church_data["id"],
        "full_name": "Staff Created Member",
        "email": "staff@example.com"
    }

    response = await test_client.post(
        "/api/members/",
        json=member_data,
        headers=staff_auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Staff Created Member"
