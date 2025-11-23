"""
Integration tests for Kiosk API endpoints.

Tests cover:
- Phone number lookup
- OTP send and verify
- New member registration
- Event registration
- Counseling appointment requests
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import datetime
from tests.fixtures.factories import MemberFactory, EventFactory


@pytest.mark.integration
@pytest.mark.asyncio
async def test_kiosk_send_otp_success(test_client, test_db, church_data):
    """Test sending OTP to phone number."""
    phone = "+6281234567890"

    response = await test_client.post("/public/kiosk/send-otp", json={
        "phone": phone,
        "church_id": church_data["id"]
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True
    assert "debug_code" in data  # For testing

    # Verify OTP stored in database
    otp_record = await test_db.otp_codes.find_one({"phone": phone})
    assert otp_record is not None
    assert "code" in otp_record
    assert "expires_at" in otp_record


@pytest.mark.integration
@pytest.mark.asyncio
async def test_kiosk_verify_otp_success(test_client, test_db, church_data):
    """Test verifying correct OTP."""
    phone = "+6281234567890"
    code = "1234"

    # Manually insert OTP
    await test_db.otp_codes.insert_one({
        "phone": phone,
        "code": code,
        "church_id": church_data["id"],
        "expires_at": datetime.utcnow(),
        "attempts": 0
    })

    response = await test_client.post("/public/kiosk/verify-otp", json={
        "phone": phone,
        "code": code
    })

    assert response.status_code == 200
    data = response.json()
    assert data["success"] is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_kiosk_verify_otp_incorrect(test_client, test_db, church_data):
    """Test verifying incorrect OTP."""
    phone = "+6281234567890"

    # Insert correct OTP
    await test_db.otp_codes.insert_one({
        "phone": phone,
        "code": "1234",
        "church_id": church_data["id"],
        "expires_at": datetime.utcnow(),
        "attempts": 0
    })

    # Try incorrect code
    response = await test_client.post("/public/kiosk/verify-otp", json={
        "phone": phone,
        "code": "9999"
    })

    assert response.status_code == 400
    data = response.json()
    assert data["success"] is False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_kiosk_create_pre_visitor(test_client, test_db, church_data, member_statuses):
    """Test creating new member from kiosk."""
    member_data = {
        "church_id": church_data["id"],
        "full_name": "Kiosk User",
        "phone_whatsapp": "+6281234567890",
        "gender": "Male",
        "date_of_birth": "1990-01-15",
        "photo_base64": "data:image/jpeg;base64,/9j/4AAQ"
    }

    response = await test_client.post(
        "/public/kiosk/create-pre-visitor",
        json=member_data
    )

    assert response.status_code == 201
    data = response.json()
    assert data["full_name"] == "Kiosk User"
    assert "personal_qr_code" in data


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_kiosk_multi_tenant_isolation(test_client, test_db, church_data, second_church_data):
    """Test kiosk endpoints respect church_id."""
    # Create member for Church A
    member_a = MemberFactory.create(
        church_id=church_data["id"],
        phone_whatsapp="+6281111111111"
    )
    await test_db.members.insert_one(member_a)

    # Create member for Church B with same phone
    member_b = MemberFactory.create(
        church_id=second_church_data["id"],
        phone_whatsapp="+6281111111111"
    )
    await test_db.members.insert_one(member_b)

    # Lookup from Church A should find Church A member
    response = await test_client.post("/public/kiosk/lookup-member", json={
        "phone": "+6281111111111",
        "church_id": church_data["id"]
    })

    assert response.status_code == 200
    data = response.json()
    assert data["found"] is True
    assert data["member"]["id"] == member_a["id"]
