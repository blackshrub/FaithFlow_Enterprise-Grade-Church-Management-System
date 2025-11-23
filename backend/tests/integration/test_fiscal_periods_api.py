"""
Integration tests for Fiscal Periods API endpoints.

Tests cover:
- Listing fiscal periods
- Current period retrieval (auto-creation)
- Period status transitions (open → closed → locked)
- Admin-only operations
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import date


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_fiscal_periods(test_client, auth_headers, test_db, church_data):
    """Test listing fiscal periods."""
    # Create periods
    for month in range(1, 4):
        await test_db.fiscal_periods.insert_one({
            "id": f"fp-{month}",
            "church_id": church_data["id"],
            "month": month,
            "year": 2025,
            "status": "open"
        })

    response = await test_client.get(
        "/api/v1/accounting/fiscal-periods/list",
        headers=auth_headers
    )

    assert response.status_code == 200
    periods = response.json()
    assert len(periods) == 3


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_periods_by_year(test_client, auth_headers, test_db, church_data):
    """Test filtering periods by year."""
    for year in [2024, 2025, 2025]:
        await test_db.fiscal_periods.insert_one({
            "id": f"fp-{year}-{id(year)}",
            "church_id": church_data["id"],
            "month": 1,
            "year": year,
            "status": "open"
        })

    response = await test_client.get(
        "/api/v1/accounting/fiscal-periods/list?year=2025",
        headers=auth_headers
    )

    assert response.status_code == 200
    periods = response.json()
    assert len(periods) == 2
    for period in periods:
        assert period["year"] == 2025


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_periods_by_status(test_client, auth_headers, test_db, church_data):
    """Test filtering periods by status."""
    for status in ["open", "closed", "open", "locked"]:
        await test_db.fiscal_periods.insert_one({
            "id": f"fp-{status}-{id(status)}",
            "church_id": church_data["id"],
            "month": 1,
            "year": 2025,
            "status": status
        })

    response = await test_client.get(
        "/api/v1/accounting/fiscal-periods/list?status=open",
        headers=auth_headers
    )

    assert response.status_code == 200
    periods = response.json()
    assert len(periods) == 2
    for period in periods:
        assert period["status"] == "open"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_current_period_auto_creates(test_client, auth_headers, test_db, church_data):
    """Test current period endpoint auto-creates if doesn't exist."""
    # Don't create period first - should auto-create
    response = await test_client.get(
        "/api/v1/accounting/fiscal-periods/current",
        headers=auth_headers
    )

    assert response.status_code == 200
    period = response.json()
    assert period["month"] == date.today().month
    assert period["year"] == date.today().year
    assert period["status"] == "open"
    assert period["church_id"] == church_data["id"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_close_period_success(test_client, admin_auth_headers, test_db, church_data):
    """Test closing an open period."""
    # Create open period
    await test_db.fiscal_periods.insert_one({
        "id": "fp-001",
        "church_id": church_data["id"],
        "month": 1,
        "year": 2025,
        "status": "open"
    })

    response = await test_client.post(
        "/api/v1/accounting/fiscal-periods/close?month=1&year=2025",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    period = response.json()
    assert period["status"] == "closed"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_lock_period_success(test_client, admin_auth_headers, test_db, church_data):
    """Test locking a closed period."""
    # Create closed period
    await test_db.fiscal_periods.insert_one({
        "id": "fp-001",
        "church_id": church_data["id"],
        "month": 1,
        "year": 2025,
        "status": "closed"
    })

    response = await test_client.post(
        "/api/v1/accounting/fiscal-periods/lock?month=1&year=2025",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    period = response.json()
    assert period["status"] == "locked"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_unlock_period_success(test_client, admin_auth_headers, test_db, church_data):
    """Test unlocking a locked period."""
    # Create locked period
    await test_db.fiscal_periods.insert_one({
        "id": "fp-001",
        "church_id": church_data["id"],
        "month": 1,
        "year": 2025,
        "status": "locked"
    })

    response = await test_client.post(
        "/api/v1/accounting/fiscal-periods/unlock?month=1&year=2025",
        headers=admin_auth_headers
    )

    assert response.status_code == 200
    period = response.json()
    assert period["status"] == "open"


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_fiscal_periods_multi_tenant_isolation(
    test_client, test_db, church_data, second_church_data, auth_headers
):
    """Test fiscal periods are isolated between churches."""
    # Create period for Church A
    await test_db.fiscal_periods.insert_one({
        "id": "fp-a",
        "church_id": church_data["id"],
        "month": 1,
        "year": 2025,
        "status": "open"
    })

    # Create period for Church B
    await test_db.fiscal_periods.insert_one({
        "id": "fp-b",
        "church_id": second_church_data["id"],
        "month": 1,
        "year": 2025,
        "status": "open"
    })

    # List periods (authenticated as Church A)
    response = await test_client.get(
        "/api/v1/accounting/fiscal-periods/list",
        headers=auth_headers
    )

    assert response.status_code == 200
    periods = response.json()

    # Should only see Church A's period
    assert len(periods) == 1
    assert periods[0]["id"] == "fp-a"
