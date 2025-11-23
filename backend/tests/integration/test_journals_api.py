"""
Integration tests for Journal Entry API endpoints.

Tests cover:
- Journal CRUD operations
- Double-entry validation (balanced entries)
- Journal line validation
- Status transitions (draft → approved)
- Fiscal period validation
- Protection of approved journals
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import datetime, date, timedelta
from tests.fixtures.factories import ChartOfAccountFactory


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_journal_success(test_client, auth_headers, test_db, church_data):
    """Test creating a balanced journal entry."""
    # Create accounts first
    cash_account = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        code="1100",
        name="Kas",
        account_type="Asset"
    )
    income_account = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        code="4100",
        name="Persembahan",
        account_type="Income"
    )
    await test_db.chart_of_accounts.insert_one(cash_account)
    await test_db.chart_of_accounts.insert_one(income_account)

    # Create fiscal period
    await test_db.fiscal_periods.insert_one({
        "id": "fp-001",
        "church_id": church_data["id"],
        "name": "2025",
        "start_date": date(2025, 1, 1).isoformat(),
        "end_date": date(2025, 12, 31).isoformat(),
        "status": "open"
    })

    journal_data = {
        "date": date.today().isoformat(),
        "description": "Persembahan minggu ini",
        "reference_number": "REF-001",
        "journal_type": "general",
        "lines": [
            {
                "account_id": cash_account["id"],
                "description": "Terima persembahan",
                "debit": 5000000,
                "credit": 0
            },
            {
                "account_id": income_account["id"],
                "description": "Pendapatan persembahan",
                "debit": 0,
                "credit": 5000000
            }
        ]
    }

    response = await test_client.post(
        "/api/v1/accounting/journals/",
        json=journal_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["description"] == "Persembahan minggu ini"
    assert data["status"] == "draft"
    assert data["total_debit"] == 5000000
    assert data["total_credit"] == 5000000
    assert data["is_balanced"] is True
    assert "journal_number" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_journal_unbalanced_fails(test_client, auth_headers, test_db, church_data):
    """Test creating unbalanced journal fails validation."""
    # Create accounts
    cash = ChartOfAccountFactory.create(church_id=church_data["id"])
    income = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_many([cash, income])

    journal_data = {
        "date": date.today().isoformat(),
        "description": "Unbalanced entry",
        "lines": [
            {"account_id": cash["id"], "description": "Cash", "debit": 5000, "credit": 0},
            {"account_id": income["id"], "description": "Income", "debit": 0, "credit": 3000}  # Not balanced!
        ]
    }

    response = await test_client.post(
        "/api/v1/accounting/journals/",
        json=journal_data,
        headers=auth_headers
    )

    assert response.status_code == 422  # Validation error
    assert "not balanced" in str(response.json()).lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_journal_less_than_2_lines_fails(test_client, auth_headers, test_db, church_data):
    """Test journal with less than 2 lines fails."""
    cash = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_one(cash)

    journal_data = {
        "date": date.today().isoformat(),
        "description": "Single line journal",
        "lines": [
            {"account_id": cash["id"], "description": "Cash", "debit": 5000, "credit": 0}
        ]  # Only 1 line!
    }

    response = await test_client.post(
        "/api/v1/accounting/journals/",
        json=journal_data,
        headers=auth_headers
    )

    assert response.status_code == 422
    assert "at least 2 lines" in str(response.json()).lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_journal_both_debit_credit_fails(test_client, auth_headers, test_db, church_data):
    """Test journal line with both debit and credit fails."""
    cash = ChartOfAccountFactory.create(church_id=church_data["id"])
    income = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_many([cash, income])

    journal_data = {
        "date": date.today().isoformat(),
        "description": "Invalid line",
        "lines": [
            {"account_id": cash["id"], "description": "Invalid", "debit": 5000, "credit": 5000},  # Both!
            {"account_id": income["id"], "description": "Income", "debit": 0, "credit": 5000}
        ]
    }

    response = await test_client.post(
        "/api/v1/accounting/journals/",
        json=journal_data,
        headers=auth_headers
    )

    assert response.status_code == 422
    assert "both debit and credit" in str(response.json()).lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_journals_with_pagination(test_client, auth_headers, test_db, church_data):
    """Test listing journals with pagination."""
    # Create accounts
    cash = ChartOfAccountFactory.create(church_id=church_data["id"])
    income = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_many([cash, income])

    # Create 15 journals
    for i in range(15):
        await test_db.journals.insert_one({
            "id": f"journal-{i}",
            "church_id": church_data["id"],
            "journal_number": f"JV-2025-{i+1:04d}",
            "date": date.today().isoformat(),
            "description": f"Journal {i+1}",
            "status": "draft",
            "total_debit": 1000,
            "total_credit": 1000,
            "is_balanced": True,
            "lines": [
                {"account_id": cash["id"], "description": "Cash", "debit": 1000, "credit": 0},
                {"account_id": income["id"], "description": "Income", "debit": 0, "credit": 1000}
            ]
        })

    response = await test_client.get(
        "/api/v1/accounting/journals/?limit=10&offset=0",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert len(result["data"]) == 10
    assert result["pagination"]["total"] == 15
    assert result["pagination"]["has_more"] is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_journals_by_date_range(test_client, auth_headers, test_db, church_data):
    """Test filtering journals by date range."""
    cash = ChartOfAccountFactory.create(church_id=church_data["id"])
    income = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_many([cash, income])

    # Create journals with different dates
    dates = [
        date.today() - timedelta(days=30),
        date.today() - timedelta(days=15),
        date.today() - timedelta(days=5),
        date.today()
    ]

    for i, journal_date in enumerate(dates):
        await test_db.journals.insert_one({
            "id": f"journal-{i}",
            "church_id": church_data["id"],
            "journal_number": f"JV-{i}",
            "date": journal_date.isoformat(),
            "description": f"Journal {i}",
            "status": "draft",
            "lines": [],
            "total_debit": 1000,
            "total_credit": 1000
        })

    # Filter last 7 days
    start_date = (date.today() - timedelta(days=7)).isoformat()
    response = await test_client.get(
        f"/api/v1/accounting/journals/?start_date={start_date}",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pagination"]["total"] == 2  # Only last 2


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_journals_by_status(test_client, auth_headers, test_db, church_data):
    """Test filtering journals by status."""
    for status in ["draft", "draft", "approved", "draft"]:
        await test_db.journals.insert_one({
            "id": f"journal-{status}-{id(status)}",
            "church_id": church_data["id"],
            "journal_number": f"JV-{status}",
            "date": date.today().isoformat(),
            "description": "Test journal",
            "status": status,
            "lines": [],
            "total_debit": 1000,
            "total_credit": 1000
        })

    response = await test_client.get(
        "/api/v1/accounting/journals/?status=draft",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()
    assert result["pagination"]["total"] == 3


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_journal_by_id(test_client, auth_headers, test_db, church_data):
    """Test retrieving single journal by ID."""
    cash = ChartOfAccountFactory.create(church_id=church_data["id"])
    income = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_many([cash, income])

    journal = {
        "id": "journal-001",
        "church_id": church_data["id"],
        "journal_number": "JV-2025-0001",
        "date": date.today().isoformat(),
        "description": "Test journal",
        "status": "draft",
        "total_debit": 5000,
        "total_credit": 5000,
        "is_balanced": True,
        "lines": [
            {"account_id": cash["id"], "description": "Cash", "debit": 5000, "credit": 0},
            {"account_id": income["id"], "description": "Income", "debit": 0, "credit": 5000}
        ]
    }
    await test_db.journals.insert_one(journal)

    response = await test_client.get(
        "/api/v1/accounting/journals/journal-001",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == "journal-001"
    assert data["journal_number"] == "JV-2025-0001"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_journal_draft_success(test_client, auth_headers, test_db, church_data):
    """Test updating a draft journal."""
    cash = ChartOfAccountFactory.create(church_id=church_data["id"])
    income = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_many([cash, income])

    # Create fiscal period
    await test_db.fiscal_periods.insert_one({
        "id": "fp-001",
        "church_id": church_data["id"],
        "status": "open",
        "start_date": date(2025, 1, 1).isoformat(),
        "end_date": date(2025, 12, 31).isoformat()
    })

    journal = {
        "id": "journal-001",
        "church_id": church_data["id"],
        "journal_number": "JV-001",
        "date": date.today().isoformat(),
        "description": "Old description",
        "status": "draft",
        "lines": [],
        "total_debit": 1000,
        "total_credit": 1000
    }
    await test_db.journals.insert_one(journal)

    update_data = {
        "description": "Updated description"
    }

    response = await test_client.put(
        "/api/v1/accounting/journals/journal-001",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["description"] == "Updated description"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_approved_journal_forbidden(test_client, auth_headers, test_db, church_data):
    """Test cannot update approved journal."""
    journal = {
        "id": "journal-001",
        "church_id": church_data["id"],
        "journal_number": "JV-001",
        "date": date.today().isoformat(),
        "description": "Approved journal",
        "status": "approved",  # Already approved
        "lines": [],
        "total_debit": 1000,
        "total_credit": 1000
    }
    await test_db.journals.insert_one(journal)

    response = await test_client.put(
        "/api/v1/accounting/journals/journal-001",
        json={"description": "Try to update"},
        headers=auth_headers
    )

    assert response.status_code == 403
    assert "cannot edit approved" in response.json()["detail"]["message"].lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_approve_journal_success(test_client, auth_headers, test_db, church_data):
    """Test approving a draft journal."""
    # Create fiscal period
    await test_db.fiscal_periods.insert_one({
        "id": "fp-001",
        "church_id": church_data["id"],
        "status": "open",
        "start_date": date(2025, 1, 1).isoformat(),
        "end_date": date(2025, 12, 31).isoformat()
    })

    journal = {
        "id": "journal-001",
        "church_id": church_data["id"],
        "journal_number": "JV-001",
        "date": date.today().isoformat(),
        "description": "Test journal",
        "status": "draft",
        "lines": [],
        "total_debit": 1000,
        "total_credit": 1000
    }
    await test_db.journals.insert_one(journal)

    response = await test_client.post(
        "/api/v1/accounting/journals/journal-001/approve",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"
    assert data["approved_by"] is not None
    assert data["approved_at"] is not None


@pytest.mark.integration
@pytest.mark.asyncio
async def test_approve_already_approved_journal_fails(test_client, auth_headers, test_db, church_data):
    """Test cannot approve already approved journal."""
    journal = {
        "id": "journal-001",
        "church_id": church_data["id"],
        "journal_number": "JV-001",
        "date": date.today().isoformat(),
        "description": "Already approved",
        "status": "approved",  # Already approved
        "lines": []
    }
    await test_db.journals.insert_one(journal)

    response = await test_client.post(
        "/api/v1/accounting/journals/journal-001/approve",
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "already approved" in response.json()["detail"]["message"].lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_draft_journal_success(test_client, auth_headers, test_db, church_data):
    """Test deleting a draft journal."""
    journal = {
        "id": "journal-001",
        "church_id": church_data["id"],
        "journal_number": "JV-001",
        "date": date.today().isoformat(),
        "description": "Draft journal",
        "status": "draft",
        "lines": []
    }
    await test_db.journals.insert_one(journal)

    response = await test_client.delete(
        "/api/v1/accounting/journals/journal-001",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Verify deleted
    deleted = await test_db.journals.find_one({"id": "journal-001"})
    assert deleted is None


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_approved_journal_forbidden(test_client, auth_headers, test_db, church_data):
    """Test cannot delete approved journal."""
    journal = {
        "id": "journal-001",
        "church_id": church_data["id"],
        "journal_number": "JV-001",
        "date": date.today().isoformat(),
        "description": "Approved journal",
        "status": "approved",  # Approved
        "lines": []
    }
    await test_db.journals.insert_one(journal)

    response = await test_client.delete(
        "/api/v1/accounting/journals/journal-001",
        headers=auth_headers
    )

    assert response.status_code == 403
    assert "cannot delete approved" in response.json()["detail"]["message"].lower()


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_journals_multi_tenant_isolation(
    test_client, test_db, church_data, second_church_data, auth_headers
):
    """Test journals are isolated between churches."""
    # Create journal for Church A
    journal_a = {
        "id": "journal-a",
        "church_id": church_data["id"],
        "journal_number": "JV-A-001",
        "date": date.today().isoformat(),
        "description": "Church A Journal",
        "status": "draft",
        "lines": [],
        "total_debit": 1000,
        "total_credit": 1000
    }
    await test_db.journals.insert_one(journal_a)

    # Create journal for Church B
    journal_b = {
        "id": "journal-b",
        "church_id": second_church_data["id"],
        "journal_number": "JV-B-001",
        "date": date.today().isoformat(),
        "description": "Church B Journal",
        "status": "draft",
        "lines": [],
        "total_debit": 1000,
        "total_credit": 1000
    }
    await test_db.journals.insert_one(journal_b)

    # List journals (authenticated as Church A)
    response = await test_client.get(
        "/api/v1/accounting/journals/",
        headers=auth_headers
    )

    assert response.status_code == 200
    result = response.json()

    # Should only see Church A's journal
    assert result["pagination"]["total"] == 1
    assert result["data"][0]["id"] == "journal-a"

    # Try to access Church B's journal directly (should fail)
    response = await test_client.get(
        "/api/v1/accounting/journals/journal-b",
        headers=auth_headers
    )

    assert response.status_code == 404
