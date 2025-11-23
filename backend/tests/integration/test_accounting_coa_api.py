"""
Integration tests for Chart of Accounts (COA) API endpoints.

Tests cover:
- COA CRUD operations
- Account code uniqueness validation
- Account hierarchy (parent/child relationships)
- Filtering by account type
- Tree structure generation
- Protection of used accounts (cannot delete/modify)
- Default COA seeding
- Multi-tenant isolation
"""

import pytest
from httpx import AsyncClient
from datetime import datetime
from tests.fixtures.factories import ChartOfAccountFactory


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_coa_success(test_client, auth_headers, church_data):
    """Test creating a chart of account."""
    coa_data = {
        "church_id": church_data["id"],
        "code": "1100",
        "name": "Kas",
        "description": "Cash on hand",
        "account_type": "Asset",
        "normal_balance": "Debit",
        "level": 0,
        "is_active": True
    }

    response = await test_client.post(
        "/api/v1/accounting/coa/",
        json=coa_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "1100"
    assert data["name"] == "Kas"
    assert data["account_type"] == "Asset"
    assert data["normal_balance"] == "Debit"
    assert "id" in data


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_coa_duplicate_code(test_client, auth_headers, test_db, church_data):
    """Test creating COA with duplicate code fails."""
    # Create first account
    coa1 = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        code="1100"
    )
    await test_db.chart_of_accounts.insert_one(coa1)

    # Try to create with same code
    coa_data = {
        "church_id": church_data["id"],
        "code": "1100",  # Duplicate
        "name": "Another Cash Account",
        "account_type": "Asset",
        "normal_balance": "Debit"
    }

    response = await test_client.post(
        "/api/v1/accounting/coa/",
        json=coa_data,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]["message"].lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_create_coa_with_parent(test_client, auth_headers, test_db, church_data):
    """Test creating child account with parent."""
    # Create parent account
    parent = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        code="1000",
        name="Assets",
        level=0
    )
    await test_db.chart_of_accounts.insert_one(parent)

    # Create child account
    child_data = {
        "church_id": church_data["id"],
        "code": "1100",
        "name": "Current Assets",
        "account_type": "Asset",
        "normal_balance": "Debit",
        "parent_id": parent["id"]
    }

    response = await test_client.post(
        "/api/v1/accounting/coa/",
        json=child_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["parent_id"] == parent["id"]
    assert data["level"] == 1  # Auto-calculated from parent


@pytest.mark.integration
@pytest.mark.asyncio
async def test_list_coa(test_client, auth_headers, test_db, church_data):
    """Test listing all chart of accounts."""
    # Create multiple accounts
    for i in range(5):
        coa = ChartOfAccountFactory.create(
            church_id=church_data["id"],
            code=f"{1100+i}"
        )
        await test_db.chart_of_accounts.insert_one(coa)

    response = await test_client.get(
        "/api/v1/accounting/coa/",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 5


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_coa_by_account_type(test_client, auth_headers, test_db, church_data):
    """Test filtering COA by account type."""
    # Create accounts of different types
    types = ["Asset", "Asset", "Liability", "Income", "Expense"]
    for acc_type in types:
        coa = ChartOfAccountFactory.create(
            church_id=church_data["id"],
            account_type=acc_type
        )
        await test_db.chart_of_accounts.insert_one(coa)

    # Filter by Asset
    response = await test_client.get(
        "/api/v1/accounting/coa/?account_type=Asset",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for account in data:
        assert account["account_type"] == "Asset"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_filter_coa_by_active_status(test_client, auth_headers, test_db, church_data):
    """Test filtering COA by active status."""
    # Create active and inactive accounts
    for is_active in [True, True, False, True]:
        coa = ChartOfAccountFactory.create(
            church_id=church_data["id"],
            is_active=is_active
        )
        await test_db.chart_of_accounts.insert_one(coa)

    # Filter by active only
    response = await test_client.get(
        "/api/v1/accounting/coa/?is_active=true",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data) == 3
    for account in data:
        assert account["is_active"] is True


@pytest.mark.integration
@pytest.mark.asyncio
async def test_search_coa_by_code_or_name(test_client, auth_headers, test_db, church_data):
    """Test searching COA by code or name."""
    accounts = [
        {"code": "1100", "name": "Kas"},
        {"code": "1200", "name": "Bank BCA"},
        {"code": "2100", "name": "Utang Usaha"}
    ]

    for acc in accounts:
        coa = ChartOfAccountFactory.create(
            church_id=church_data["id"],
            **acc
        )
        await test_db.chart_of_accounts.insert_one(coa)

    # Search by code
    response = await test_client.get(
        "/api/v1/accounting/coa/?search=11",
        headers=auth_headers
    )

    data = response.json()
    assert len(data) == 1
    assert data[0]["code"] == "1100"

    # Search by name
    response = await test_client.get(
        "/api/v1/accounting/coa/?search=Bank",
        headers=auth_headers
    )

    data = response.json()
    assert len(data) == 1
    assert "Bank" in data[0]["name"]


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_coa_by_id(test_client, auth_headers, test_db, church_data):
    """Test retrieving single COA by ID."""
    coa = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        code="1100",
        name="Kas"
    )
    await test_db.chart_of_accounts.insert_one(coa)

    response = await test_client.get(
        f"/api/v1/accounting/coa/{coa['id']}",
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["id"] == coa["id"]
    assert data["code"] == "1100"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_coa_not_found(test_client, auth_headers):
    """Test 404 when COA doesn't exist."""
    response = await test_client.get(
        "/api/v1/accounting/coa/nonexistent-id",
        headers=auth_headers
    )

    assert response.status_code == 404
    assert response.json()["detail"]["error_code"] == "NOT_FOUND"


@pytest.mark.integration
@pytest.mark.asyncio
async def test_get_coa_tree_structure(test_client, auth_headers, test_db, church_data):
    """Test retrieving COA as tree structure."""
    # Create parent
    parent = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        code="1000",
        name="Assets",
        level=0
    )
    await test_db.chart_of_accounts.insert_one(parent)

    # Create children
    child1 = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        code="1100",
        name="Current Assets",
        parent_id=parent["id"],
        level=1
    )
    child2 = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        code="1200",
        name="Fixed Assets",
        parent_id=parent["id"],
        level=1
    )
    await test_db.chart_of_accounts.insert_one(child1)
    await test_db.chart_of_accounts.insert_one(child2)

    response = await test_client.get(
        "/api/v1/accounting/coa/tree",
        headers=auth_headers
    )

    assert response.status_code == 200
    tree = response.json()
    assert isinstance(tree, list)
    # Verify tree structure contains parent and children


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_coa_success(test_client, auth_headers, test_db, church_data):
    """Test updating COA successfully."""
    coa = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        name="Old Name",
        description="Old description"
    )
    await test_db.chart_of_accounts.insert_one(coa)

    update_data = {
        "name": "New Name",
        "description": "New description",
        "is_active": False
    }

    response = await test_client.put(
        f"/api/v1/accounting/coa/{coa['id']}",
        json=update_data,
        headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "New Name"
    assert data["description"] == "New description"
    assert data["is_active"] is False


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_coa_not_found(test_client, auth_headers):
    """Test updating non-existent COA returns 404."""
    response = await test_client.put(
        "/api/v1/accounting/coa/nonexistent-id",
        json={"name": "New Name"},
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_update_protected_fields_when_used(test_client, auth_headers, test_db, church_data):
    """Test cannot update protected fields if account is used in journals."""
    # Create COA
    coa = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        account_type="Asset",
        normal_balance="Debit"
    )
    await test_db.chart_of_accounts.insert_one(coa)

    # Create journal entry using this account (simulating usage)
    await test_db.journal_entries.insert_one({
        "id": "journal-001",
        "church_id": church_data["id"],
        "account_id": coa["id"],
        "debit": 1000,
        "credit": 0,
        "description": "Test entry"
    })

    # Try to update protected field (account_type)
    response = await test_client.put(
        f"/api/v1/accounting/coa/{coa['id']}",
        json={"account_type": "Liability"},
        headers=auth_headers
    )

    assert response.status_code == 403
    assert "not allowed" in response.json()["detail"]["message"].lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_coa_success(test_client, auth_headers, test_db, church_data):
    """Test deleting COA successfully."""
    coa = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_one(coa)

    response = await test_client.delete(
        f"/api/v1/accounting/coa/{coa['id']}",
        headers=auth_headers
    )

    assert response.status_code == 204

    # Verify deleted
    deleted = await test_db.chart_of_accounts.find_one({"id": coa["id"]})
    assert deleted is None


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_coa_not_found(test_client, auth_headers):
    """Test deleting non-existent COA returns 404."""
    response = await test_client.delete(
        "/api/v1/accounting/coa/nonexistent-id",
        headers=auth_headers
    )

    assert response.status_code == 404


@pytest.mark.integration
@pytest.mark.asyncio
async def test_delete_used_coa_forbidden(test_client, auth_headers, test_db, church_data):
    """Test cannot delete COA that is used in journals."""
    # Create COA
    coa = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_one(coa)

    # Create journal entry using this account
    await test_db.journal_entries.insert_one({
        "id": "journal-001",
        "church_id": church_data["id"],
        "account_id": coa["id"],
        "debit": 1000,
        "credit": 0,
        "description": "Test entry"
    })

    # Try to delete
    response = await test_client.delete(
        f"/api/v1/accounting/coa/{coa['id']}",
        headers=auth_headers
    )

    assert response.status_code == 403
    assert "cannot delete" in response.json()["detail"]["message"].lower()


@pytest.mark.integration
@pytest.mark.asyncio
async def test_seed_default_coa_success(test_client, auth_headers, test_db, church_data):
    """Test seeding default Indonesian COA."""
    # Ensure no accounts exist
    await test_db.chart_of_accounts.delete_many({"church_id": church_data["id"]})

    response = await test_client.post(
        "/api/v1/accounting/coa/seed-default",
        headers=auth_headers
    )

    assert response.status_code == 201
    assert "created" in response.json()["message"].lower()

    # Verify accounts were created
    count = await test_db.chart_of_accounts.count_documents({"church_id": church_data["id"]})
    assert count > 0


@pytest.mark.integration
@pytest.mark.asyncio
async def test_seed_default_coa_fails_if_exists(test_client, auth_headers, test_db, church_data):
    """Test seeding fails if COA already exists."""
    # Create one account
    coa = ChartOfAccountFactory.create(church_id=church_data["id"])
    await test_db.chart_of_accounts.insert_one(coa)

    response = await test_client.post(
        "/api/v1/accounting/coa/seed-default",
        headers=auth_headers
    )

    assert response.status_code == 400
    assert "already exists" in response.json()["detail"]["message"].lower()


@pytest.mark.integration
@pytest.mark.multi_tenant
@pytest.mark.asyncio
async def test_coa_multi_tenant_isolation(
    test_client, test_db, church_data, second_church_data, auth_headers
):
    """Test COA is isolated between churches."""
    # Create COA for Church A
    coa_a = ChartOfAccountFactory.create(
        church_id=church_data["id"],
        code="1100",
        name="Church A Cash"
    )
    await test_db.chart_of_accounts.insert_one(coa_a)

    # Create COA for Church B
    coa_b = ChartOfAccountFactory.create(
        church_id=second_church_data["id"],
        code="1100",  # Same code, different church
        name="Church B Cash"
    )
    await test_db.chart_of_accounts.insert_one(coa_b)

    # List COA (authenticated as Church A)
    response = await test_client.get(
        "/api/v1/accounting/coa/",
        headers=auth_headers
    )

    assert response.status_code == 200
    accounts = response.json()

    # Should only see Church A's account
    assert len(accounts) == 1
    assert accounts[0]["id"] == coa_a["id"]
    assert accounts[0]["name"] == "Church A Cash"

    # Try to access Church B's account directly (should fail)
    response = await test_client.get(
        f"/api/v1/accounting/coa/{coa_b['id']}",
        headers=auth_headers
    )

    assert response.status_code == 404  # Not found due to church_id mismatch


@pytest.mark.integration
@pytest.mark.asyncio
async def test_coa_code_uppercase_normalization(test_client, auth_headers, church_data):
    """Test COA code is normalized to uppercase."""
    coa_data = {
        "church_id": church_data["id"],
        "code": "abc123",  # lowercase
        "name": "Test Account",
        "account_type": "Asset",
        "normal_balance": "Debit"
    }

    response = await test_client.post(
        "/api/v1/accounting/coa/",
        json=coa_data,
        headers=auth_headers
    )

    assert response.status_code == 201
    data = response.json()
    assert data["code"] == "ABC123"  # Should be uppercase
