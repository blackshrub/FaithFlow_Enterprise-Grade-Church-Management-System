"""
Integration tests for Counseling API endpoints.

Tests cover:
- Appointment CRUD operations
- Appointment approval/rejection
- Counselor assignment
- Urgency levels
- Status transitions
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, timedelta
from tests.fixtures.factories import AppointmentFactory, MemberFactory, UserFactory


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_appointment(test_client, auth_headers, test_db, church_data):
    """Test creating a counseling appointment."""
    # Create member
    member = MemberFactory.create(church_id=church_data["id"])
    await test_db.members.insert_one(member)

    appointment_data = {
        "church_id": church_data["id"],
        "member_id": member["id"],
        "date": (datetime.utcnow() + timedelta(days=3)).isoformat(),
        "start_time": "10:00",
        "end_time": "11:00",
        "type": "counseling",
        "topic": "Personal guidance",
        "urgency": "normal"
    }

    response = await test_client.post(
        "/api/v1/counseling/appointments",
        json=appointment_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["member_id"] == member["id"]
    assert data["status"] == "pending"
    assert data["urgency"] == "normal"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_appointments_with_filters(test_client, auth_headers, test_db, church_data):
    """Test listing appointments with status filter."""
    # Create appointments with different statuses
    for status in ["pending", "approved", "completed"]:
        appt = AppointmentFactory.create(
            church_id=church_data["id"],
            status=status
        )
        await test_db.counseling_appointments.insert_one(appt)

    # Filter by pending
    response = await test_client.get(
        "/api/v1/counseling/appointments?status=pending",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["status"] == "pending"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_approve_appointment(test_client, auth_headers, test_db, church_data, admin_user):
    """Test approving an appointment."""
    # Create pending appointment
    appt = AppointmentFactory.create(
        church_id=church_data["id"],
        status="pending"
    )
    await test_db.counseling_appointments.insert_one(appt)

    response = await test_client.post(
        f"/api/v1/counseling/appointments/{appt['id']}/approve",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_reject_appointment(test_client, auth_headers, test_db, church_data):
    """Test rejecting an appointment."""
    appt = AppointmentFactory.create(
        church_id=church_data["id"],
        status="pending"
    )
    await test_db.counseling_appointments.insert_one(appt)

    response = await test_client.post(
        f"/api/v1/counseling/appointments/{appt['id']}/reject",
        json={"reason": "Schedule conflict"},
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "rejected"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_by_urgency(test_client, auth_headers, test_db, church_data):
    """Test filtering appointments by urgency."""
    # Create appointments with different urgency levels
    for urgency in ["low", "normal", "high", "crisis"]:
        appt = AppointmentFactory.create(
            church_id=church_data["id"],
            urgency=urgency
        )
        await test_db.counseling_appointments.insert_one(appt)

    # Filter by crisis urgency
    response = await test_client.get(
        "/api/v1/counseling/appointments?urgency=crisis",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["urgency"] == "crisis"


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_appointments_multi_tenant_isolation(test_client, test_db, church_data, second_church_data, auth_headers):
    """Test appointment isolation between churches."""
    # Create appointment for Church A
    appt_a = AppointmentFactory.create(church_id=church_data["id"])
    await test_db.counseling_appointments.insert_one(appt_a)

    # Create appointment for Church B
    appt_b = AppointmentFactory.create(church_id=second_church_data["id"])
    await test_db.counseling_appointments.insert_one(appt_b)

    # List appointments (as Church A admin)
    response = await test_client.get(
        "/api/v1/counseling/appointments",
        headers=auth_headers
    )

    assert response.status_code == 200
    appointments = response.json()

    # Should only see Church A's appointment
    assert len(appointments) == 1
    assert appointments[0]["id"] == appt_a["id"]
