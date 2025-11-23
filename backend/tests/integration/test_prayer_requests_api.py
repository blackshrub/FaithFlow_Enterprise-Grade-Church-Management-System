"""
Integration tests for Prayer Requests API endpoints.

Tests cover:
- Prayer request CRUD operations
- Status transitions (new → prayed)
- Category filtering
- Assignment to staff
- Member linkage
- Pagination and search
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from tests.fixtures.factories import PrayerRequestFactory, MemberFactory, UserFactory


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_prayer_request_success(test_client, auth_headers, church_data):
    """Test creating a prayer request."""
    prayer_data = {
        "requester_name": "John Doe",
        "requester_contact": "+6281234567890",
        "title": "Prayer for healing",
        "description": "Please pray for my mother's recovery from surgery",
        "category": "healing",
        "status": "new",
        "source": "admin_input"
    }

    response = await test_client.post(
        "/api/prayer-requests/",
        json=prayer_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["title"] == "Prayer for healing"
    assert data["status"] == "new"
    assert data["category"] == "healing"
    assert data["church_id"] == church_data["id"]
    assert "id" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_prayer_request_with_member_link(test_client, auth_headers, test_db, church_data):
    """Test creating prayer request linked to member."""
    # Create member
    member = MemberFactory.create(church_id=church_data["id"])
    await test_db.members.insert_one(member)

    prayer_data = {
        "member_id": member["id"],
        "requester_name": member["full_name"],
        "requester_contact": member["phone_whatsapp"],
        "title": "Prayer for guidance",
        "description": "Seeking direction for new job opportunity",
        "category": "guidance",
        "status": "new"
    }

    response = await test_client.post(
        "/api/prayer-requests/",
        json=prayer_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["member_id"] == member["id"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_prayer_requests_with_pagination(test_client, auth_headers, test_db, church_data):
    """Test listing prayer requests with pagination."""
    # Create 15 prayer requests
    for i in range(15):
        prayer = PrayerRequestFactory.create(
            church_id=church_data["id"],
            title=f"Prayer request {i+1}"
        )
        await test_db.prayer_requests.insert_one(prayer)

    # Get first page (limit 10)
    response = await test_client.get(
        "/api/prayer-requests/?limit=10&offset=0",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert len(result["data"]) == 10
    assert result["pagination"]["total"] == 15
    assert result["pagination"]["has_more"] is True

    # Get second page
    response = await test_client.get(
        "/api/prayer-requests/?limit=10&offset=10",
        headers=auth_headers
    )

    result = response.json()
    assert len(result["data"]) == 5
    assert result["pagination"]["has_more"] is False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_prayer_requests_by_status(test_client, auth_headers, test_db, church_data):
    """Test filtering prayer requests by status."""
    # Create requests with different statuses
    for status in ["new", "prayed", "new", "prayed", "new"]:
        prayer = PrayerRequestFactory.create(
            church_id=church_data["id"],
            status=status
        )
        await test_db.prayer_requests.insert_one(prayer)

    # Filter by "new" status
    response = await test_client.get(
        "/api/prayer-requests/?status=new",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pagination"]["total"] == 3
    for req in result["data"]:
        assert req["status"] == "new"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_prayer_requests_by_category(test_client, auth_headers, test_db, church_data):
    """Test filtering prayer requests by category."""
    categories = ["healing", "guidance", "healing", "thanksgiving", "healing"]

    for cat in categories:
        prayer = PrayerRequestFactory.create(
            church_id=church_data["id"],
            category=cat
        )
        await test_db.prayer_requests.insert_one(prayer)

    # Filter by "healing" category
    response = await test_client.get(
        "/api/prayer-requests/?category=healing",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pagination"]["total"] == 3
    for req in result["data"]:
        assert req["category"] == "healing"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_search_prayer_requests(test_client, auth_headers, test_db, church_data):
    """Test searching prayer requests by text."""
    prayers = [
        {"title": "Healing for cancer patient", "requester_name": "Sarah Johnson"},
        {"title": "Guidance for career", "requester_name": "Michael Chen"},
        {"title": "Thanksgiving for recovery", "requester_name": "Emma Wilson"}
    ]

    for prayer_info in prayers:
        prayer = PrayerRequestFactory.create(
            church_id=church_data["id"],
            **prayer_info
        )
        await test_db.prayer_requests.insert_one(prayer)

    # Search by title
    response = await test_client.get(
        "/api/prayer-requests/?search=healing",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pagination"]["total"] == 1
    assert "Healing" in result["data"][0]["title"]

    # Search by requester name
    response = await test_client.get(
        "/api/prayer-requests/?search=Chen",
        headers=auth_headers
    )

    result = response.json()
    assert result["pagination"]["total"] == 1
    assert "Chen" in result["data"][0]["requester_name"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_prayer_request_by_id(test_client, auth_headers, test_db, church_data):
    """Test retrieving single prayer request."""
    prayer = PrayerRequestFactory.create(
        church_id=church_data["id"],
        title="Prayer for family"
    )
    await test_db.prayer_requests.insert_one(prayer)

    response = await test_client.get(
        f"/api/prayer-requests/{prayer['id']}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == prayer["id"]
    assert data["title"] == "Prayer for family"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_prayer_request_with_member_info(test_client, auth_headers, test_db, church_data):
    """Test prayer request includes member info when linked."""
    # Create member
    member = MemberFactory.create(church_id=church_data["id"])
    await test_db.members.insert_one(member)

    # Create prayer request linked to member
    prayer = PrayerRequestFactory.create(
        church_id=church_data["id"],
        member_id=member["id"]
    )
    await test_db.prayer_requests.insert_one(prayer)

    response = await test_client.get(
        f"/api/prayer-requests/{prayer['id']}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["member_id"] == member["id"]
    assert "member" in data
    assert data["member"]["full_name"] == member["full_name"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_prayer_request_not_found(test_client, auth_headers):
    """Test 404 when prayer request doesn't exist."""
    response = await test_client.get(
        "/api/prayer-requests/nonexistent-id",
        headers=auth_headers
    )

    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "NOT_FOUND"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_prayer_request_status(test_client, auth_headers, test_db, church_data):
    """Test updating prayer request status."""
    prayer = PrayerRequestFactory.create(
        church_id=church_data["id"],
        status="new"
    )
    await test_db.prayer_requests.insert_one(prayer)

    # Update status to "prayed"
    response = await test_client.put(
        f"/api/prayer-requests/{prayer['id']}",
        json={"status": "prayed"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "prayed"
    assert data["prayed_at"] is not None  # Auto-set timestamp


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_prayer_request_clear_prayed_at(test_client, auth_headers, test_db, church_data):
    """Test changing status back to 'new' clears prayed_at."""
    prayer = PrayerRequestFactory.create(
        church_id=church_data["id"],
        status="prayed",
        prayed_at=datetime.utcnow()
    )
    await test_db.prayer_requests.insert_one(prayer)

    # Change status back to "new"
    response = await test_client.put(
        f"/api/prayer-requests/{prayer['id']}",
        json={"status": "new"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "new"
    assert data["prayed_at"] is None  # Should be cleared


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_prayer_request_assignment(test_client, auth_headers, test_db, church_data):
    """Test assigning prayer request to staff member."""
    # Create staff user
    staff_user = UserFactory.create(
        church_id=church_data["id"],
        role="staff"
    )
    await test_db.users.insert_one(staff_user)

    # Create prayer request
    prayer = PrayerRequestFactory.create(
        church_id=church_data["id"],
        assigned_to_user_id=None
    )
    await test_db.prayer_requests.insert_one(prayer)

    # Assign to staff
    response = await test_client.put(
        f"/api/prayer-requests/{prayer['id']}",
        json={"assigned_to_user_id": staff_user["id"]},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["assigned_to_user_id"] == staff_user["id"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_prayer_request_follow_up(test_client, auth_headers, test_db, church_data):
    """Test marking prayer request for follow-up."""
    prayer = PrayerRequestFactory.create(
        church_id=church_data["id"],
        needs_follow_up=False
    )
    await test_db.prayer_requests.insert_one(prayer)

    # Mark for follow-up
    response = await test_client.put(
        f"/api/prayer-requests/{prayer['id']}",
        json={
            "needs_follow_up": True,
            "follow_up_notes": "Needs pastoral counseling appointment"
        },
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["needs_follow_up"] is True
    assert "counseling" in data["follow_up_notes"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_prayer_request_not_found(test_client, auth_headers):
    """Test updating non-existent prayer request returns 404."""
    response = await test_client.put(
        "/api/prayer-requests/nonexistent-id",
        json={"status": "prayed"},
        headers=auth_headers
    )

    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "NOT_FOUND"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_prayer_request(test_client, auth_headers, test_db, church_data):
    """Test deleting a prayer request."""
    prayer = PrayerRequestFactory.create(church_id=church_data["id"])
    await test_db.prayer_requests.insert_one(prayer)

    response = await test_client.delete(
        f"/api/prayer-requests/{prayer['id']}",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Verify deleted from database
    deleted = await test_db.prayer_requests.find_one({"id": prayer["id"]})
    assert deleted is None


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_prayer_request_not_found(test_client, auth_headers):
    """Test deleting non-existent prayer request returns 404."""
    response = await test_client.delete(
        "/api/prayer-requests/nonexistent-id",
        headers=auth_headers
    )

    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "NOT_FOUND"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_by_assigned_staff(test_client, auth_headers, test_db, church_data):
    """Test filtering prayer requests by assigned staff."""
    # Create staff users
    staff1 = UserFactory.create(church_id=church_data["id"], role="staff")
    staff2 = UserFactory.create(church_id=church_data["id"], role="staff")
    await test_db.users.insert_one(staff1)
    await test_db.users.insert_one(staff2)

    # Create prayer requests assigned to different staff
    for i in range(3):
        prayer = PrayerRequestFactory.create(
            church_id=church_data["id"],
            assigned_to_user_id=staff1["id"]
        )
        await test_db.prayer_requests.insert_one(prayer)

    for i in range(2):
        prayer = PrayerRequestFactory.create(
            church_id=church_data["id"],
            assigned_to_user_id=staff2["id"]
        )
        await test_db.prayer_requests.insert_one(prayer)

    # Filter by staff1
    response = await test_client.get(
        f"/api/prayer-requests/?assigned_to={staff1['id']}",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pagination"]["total"] == 3
    for req in result["data"]:
        assert req["assigned_to_user_id"] == staff1["id"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_by_date_range(test_client, auth_headers, test_db, church_data):
    """Test filtering prayer requests by date range."""
    # Create requests with different dates
    old_date = datetime.utcnow() - timedelta(days=30)
    recent_date = datetime.utcnow() - timedelta(days=5)

    old_prayer = PrayerRequestFactory.create(
        church_id=church_data["id"],
        created_at=old_date
    )
    await test_db.prayer_requests.insert_one(old_prayer)

    for i in range(3):
        recent_prayer = PrayerRequestFactory.create(
            church_id=church_data["id"],
            created_at=recent_date
        )
        await test_db.prayer_requests.insert_one(recent_prayer)

    # Filter last 7 days
    start_date = (datetime.utcnow() - timedelta(days=7)).isoformat()
    response = await test_client.get(
        f"/api/prayer-requests/?start_date={start_date}",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pagination"]["total"] == 3  # Only recent ones


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_prayer_requests_multi_tenant_isolation(
    test_client, test_db, church_data, second_church_data, auth_headers
):
    """Test prayer requests are isolated between churches."""
    # Create prayer request for Church A
    prayer_a = PrayerRequestFactory.create(
        church_id=church_data["id"],
        title="Church A Prayer"
    )
    await test_db.prayer_requests.insert_one(prayer_a)

    # Create prayer request for Church B
    prayer_b = PrayerRequestFactory.create(
        church_id=second_church_data["id"],
        title="Church B Prayer"
    )
    await test_db.prayer_requests.insert_one(prayer_b)

    # List prayer requests (authenticated as Church A)
    response = await test_client.get(
        "/api/prayer-requests/",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()

    # Should only see Church A's prayer request
    assert result["pagination"]["total"] == 1
    assert result["data"][0]["id"] == prayer_a["id"]
    assert result["data"][0]["title"] == "Church A Prayer"

    # Try to access Church B's prayer request directly (should fail)
    response = await test_client.get(
        f"/api/prayer-requests/{prayer_b['id']}",
        headers=auth_headers
    )

    assert response.status_code == 404  # Not found due to church_id mismatch
