from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import date, datetime
from decimal import Decimal
from typing import Optional, Dict, Any, List
import logging

logger = logging.getLogger(__name__)


async def generate_journal_number(
    db: AsyncIOMotorDatabase,
    church_id: str,
    journal_date: date
) -> str:
    """
    Generate unique journal number in format: JRN-YYYY-MM-XXXX
    
    Args:
        db: Database instance
        church_id: Church ID
        journal_date: Journal date
    
    Returns:
        Generated journal number
    """
    from datetime import datetime as dt
    
    year = journal_date.year
    month = journal_date.month
    
    # Convert dates to datetime for MongoDB query
    start_date = dt(year, month, 1)
    if month < 12:
        end_date = dt(year, month + 1, 1)
    else:
        end_date = dt(year + 1, 1, 1)
    
    # Get count of journals for this month
    count = await db.journals.count_documents({
        "church_id": church_id,
        "date": {
            "$gte": journal_date.isoformat(),
            "$lt": end_date.date().isoformat()
        }
    })
    
    sequence = count + 1
    journal_number = f"JRN-{year}-{month:02d}-{sequence:04d}"
    
    return journal_number


async def check_coa_usage(
    db: AsyncIOMotorDatabase,
    account_id: str,
    church_id: str
) -> bool:
    """
    Check if a Chart of Account is used in any journal entries.
    
    Args:
        db: Database instance
        account_id: Account ID to check
        church_id: Church ID
    
    Returns:
        True if account is used in journals, False otherwise
    """
    count = await db.journals.count_documents({
        "church_id": church_id,
        "lines.account_id": account_id
    })
    
    return count > 0


async def validate_fiscal_period(
    db: AsyncIOMotorDatabase,
    church_id: str,
    journal_date: date,
    operation_type: str
) -> tuple[bool, Optional[str], Optional[Dict]]:
    """
    Validate if an operation can be performed in a fiscal period.
    
    Args:
        db: Database instance
        church_id: Church ID
        journal_date: Journal date
        operation_type: 'create', 'edit', 'approve'
    
    Returns:
        Tuple of (is_valid, error_code, period_data)
    """
    month = journal_date.month
    year = journal_date.year
    
    # Get or create fiscal period
    period = await db.fiscal_periods.find_one({
        "church_id": church_id,
        "month": month,
        "year": year
    })
    
    if not period:
        # Auto-create with open status
        period = {
            "church_id": church_id,
            "month": month,
            "year": year,
            "status": "open",
            "created_at": datetime.utcnow()
        }
        await db.fiscal_periods.insert_one(period)
        return True, None, period
    
    # Check status
    status = period.get("status", "open")
    
    if status == "locked":
        return False, "PERIOD_LOCKED", period
    
    if status == "closed" and operation_type == "approve":
        return False, "PERIOD_CLOSED", period
    
    return True, None, period


async def calculate_account_balance(
    db: AsyncIOMotorDatabase,
    account_id: str,
    church_id: str,
    as_of_date: Optional[date] = None
) -> Decimal:
    """
    Calculate account balance as of a specific date.
    
    Args:
        db: Database instance
        account_id: Account ID
        church_id: Church ID
        as_of_date: Calculate balance up to this date (None = all time)
    
    Returns:
        Account balance
    """
    query: Dict[str, Any] = {
        "church_id": church_id,
        "status": "approved",
        "lines.account_id": account_id
    }
    
    if as_of_date:
        query["date"] = {"$lte": as_of_date}
    
    # Get all journals with this account
    cursor = db.journals.find(query)
    
    total_debit = Decimal('0')
    total_credit = Decimal('0')
    
    async for journal in cursor:
        for line in journal.get("lines", []):
            if line.get("account_id") == account_id:
                total_debit += Decimal(str(line.get("debit", 0)))
                total_credit += Decimal(str(line.get("credit", 0)))
    
    # Get account type to determine balance calculation
    account = await db.chart_of_accounts.find_one({
        "id": account_id,
        "church_id": church_id
    })
    
    if not account:
        return Decimal('0')
    
    normal_balance = account.get("normal_balance")
    
    # Calculate balance based on normal balance
    if normal_balance == "Debit":
        # Asset, Expense accounts
        return total_debit - total_credit
    else:
        # Liability, Equity, Income accounts
        return total_credit - total_debit


async def get_coa_hierarchy(
    db: AsyncIOMotorDatabase,
    church_id: str
) -> List[Dict[str, Any]]:
    """
    Build COA tree structure with parent-child relationships.
    
    Args:
        db: Database instance
        church_id: Church ID
    
    Returns:
        List of root accounts with nested children
    """
    # Get all accounts
    cursor = db.chart_of_accounts.find({
        "church_id": church_id,
        "is_active": True
    }, {"_id": 0}).sort("code", 1)
    
    accounts = await cursor.to_list(length=None)
    
    # Build map of accounts by ID
    accounts_map = {acc["id"]: {**acc, "children": []} for acc in accounts}
    
    # Build tree
    root_accounts = []
    
    for account in accounts:
        parent_id = account.get("parent_id")
        if parent_id and parent_id in accounts_map:
            accounts_map[parent_id]["children"].append(accounts_map[account["id"]])
        else:
            root_accounts.append(accounts_map[account["id"]])
    
    return root_accounts


def format_currency_backend(amount: Decimal) -> str:
    """
    Format currency for backend responses.
    
    Args:
        amount: Decimal amount
    
    Returns:
        Formatted string
    """
    return f"Rp {amount:,.2f}"
