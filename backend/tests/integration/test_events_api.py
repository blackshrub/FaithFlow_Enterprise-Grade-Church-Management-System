"""
Integration tests for Events API endpoints.

Tests cover:
- Event CRUD operations
- RSVP management
- Seat selection
- Attendance tracking
- Recurring events
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from tests.fixtures.factories import EventFactory, MemberFactory


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_event_success(test_client, auth_headers, church_data):
    """Test creating an event with valid data."""
    event_data = {
        "church_id": church_data["id"],
        "name": "Sunday Service",
        "description": "Weekly Sunday worship service",
        "event_type": "single",
        "event_date": (datetime.utcnow() + timedelta(days=7)).isoformat(),
        "start_time": "10:00",
        "end_time": "12:00",
        "location": "Main Sanctuary",
        "max_participants": 200,
        "requires_rsvp": True,
        "enable_seat_selection": False
    }

    response = await test_client.post(
        "/api/events/",
        json=event_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Sunday Service"
    assert data["requires_rsvp"] is True
    assert "id" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_events(test_client, auth_headers, test_db, church_data):
    """Test listing events."""
    # Create test events
    for i in range(3):
        event = EventFactory.create(
            church_id=church_data["id"],
            name=f"Event {i+1}"
        )
        await test_db.events.insert_one(event)

    response = await test_client.get("/api/events/", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_event_by_id(test_client, auth_headers, test_db, church_data):
    """Test retrieving a single event."""
    event = EventFactory.create(church_id=church_data["id"], name="Test Event")
    await test_db.events.insert_one(event)

    response = await test_client.get(f"/api/events/{event['id']}", headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == event["id"]
    assert data["name"] == "Test Event"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_rsvp(test_client, auth_headers, test_db, church_data):
    """Test creating an RSVP for an event."""
    # Create event
    event = EventFactory.create(
        church_id=church_data["id"],
        requires_rsvp=True,
        max_participants=100
    )
    await test_db.events.insert_one(event)

    # Create member
    member = MemberFactory.create(church_id=church_data["id"])
    await test_db.members.insert_one(member)

    # Create RSVP
    rsvp_data = {
        "event_id": event["id"],
        "member_id": member["id"],
        "attendance_type": "adult",
        "guest_count": 2
    }

    response = await test_client.post(
        f"/api/events/{event['id']}/rsvp",
        json=rsvp_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["member_id"] == member["id"]
    assert data["guest_count"] == 2


@pytest.mark.integration
@pytest.mark.asyncio
async def test_rsvp_exceeds_capacity(test_client, auth_headers, test_db, church_data):
    """Test RSVP fails when event is full."""
    # Create event with small capacity
    event = EventFactory.create(
        church_id=church_data["id"],
        max_participants=2,
        requires_rsvp=True
    )
    await test_db.events.insert_one(event)

    # Create 2 RSVPs to fill capacity
    for i in range(2):
        member = MemberFactory.create(church_id=church_data["id"])
        await test_db.members.insert_one(member)
        await test_db.rsvps.insert_one({
            "id": f"rsvp-{i}",
            "event_id": event["id"],
            "member_id": member["id"],
            "church_id": church_data["id"],
            "status": "confirmed"
        })

    # Try to create 3rd RSVP (should fail)
    member3 = MemberFactory.create(church_id=church_data["id"])
    await test_db.members.insert_one(member3)

    rsvp_data = {
        "event_id": event["id"],
        "member_id": member3["id"],
        "attendance_type": "adult"
    }

    response = await test_client.post(
        f"/api/events/{event['id']}/rsvp",
        json=rsvp_data,
        headers=auth_headers
    )

    assert response.status_code == 400  # Event full


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_events_multi_tenant_isolation(test_client, test_db, church_data, second_church_data, auth_headers):
    """Test that events are isolated by church_id."""
    # Create event for Church A
    event_a = EventFactory.create(church_id=church_data["id"], name="Church A Event")
    await test_db.events.insert_one(event_a)

    # Create event for Church B
    event_b = EventFactory.create(church_id=second_church_data["id"], name="Church B Event")
    await test_db.events.insert_one(event_b)

    # List events (authenticated as Church A)
    response = await test_client.get("/api/events/", headers=auth_headers)

    assert response.status_code == 200
    events = response.json()

    # Should only see Church A's event
    assert len(events) == 1
    assert events[0]["id"] == event_a["id"]

    # Try to get Church B's event directly (should fail)
    response = await test_client.get(f"/api/events/{event_b['id']}", headers=auth_headers)
    assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_record_attendance(test_client, auth_headers, test_db, church_data):
    """Test recording attendance for an event."""
    # Create event
    event = EventFactory.create(church_id=church_data["id"])
    await test_db.events.insert_one(event)

    # Create member
    member = MemberFactory.create(church_id=church_data["id"])
    await test_db.members.insert_one(member)

    # Record attendance
    attendance_data = {
        "member_id": member["id"],
        "attendance_type": "adult",
        "check_in_time": datetime.utcnow().isoformat()
    }

    response = await test_client.post(
        f"/api/events/{event['id']}/attendance",
        json=attendance_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["member_id"] == member["id"]
    assert data["event_id"] == event["id"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_event(test_client, auth_headers, test_db, church_data):
    """Test soft deleting an event."""
    event = EventFactory.create(church_id=church_data["id"])
    await test_db.events.insert_one(event)

    response = await test_client.delete(f"/api/events/{event['id']}", headers=auth_headers)

    assert response.status_code == 204

    # Verify soft delete
    deleted_event = await test_db.events.find_one({"id": event["id"]})
    assert deleted_event is not None
    assert deleted_event.get("deleted") is True
