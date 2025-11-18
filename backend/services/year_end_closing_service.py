from motor.motor_asyncio import AsyncIOMotorDatabase
from datetime import datetime, date
from decimal import Decimal
from typing import Optional, tuple, Dict, Any
import uuid
import logging

logger = logging.getLogger(__name__)


async def validate_prerequisites(
    db: AsyncIOMotorDatabase,
    church_id: str,
    year: int
) -> tuple[bool, Optional[str]]:
    """Check if all 12 months are closed/locked."""
    for month in range(1, 13):
        period = await db.fiscal_periods.find_one({
            "church_id": church_id,
            "month": month,
            "year": year
        })
        
        if not period or period.get("status") not in ["closed", "locked"]:
            return False, f"Month {month} is not closed"
    
    return True, None


async def calculate_year_totals(
    db: AsyncIOMotorDatabase,
    church_id: str,
    year: int
) -> tuple[Decimal, Decimal, Decimal]:
    """Calculate total income and expenses for the year."""
    start_date = date(year, 1, 1)
    end_date = date(year, 12, 31)
    
    # Get all income and expense accounts
    income_accounts = await db.chart_of_accounts.find({
        "church_id": church_id,
        "account_type": "Income"
    }).to_list(length=None)
    
    expense_accounts = await db.chart_of_accounts.find({
        "church_id": church_id,
        "account_type": "Expense"
    }).to_list(length=None)
    
    total_income = Decimal('0')
    total_expenses = Decimal('0')
    
    # Sum income
    for account in income_accounts:
        cursor = db.journals.find({
            "church_id": church_id,
            "status": "approved",
            "date": {"$gte": start_date, "$lte": end_date}
        })
        
        async for journal in cursor:
            for line in journal.get("lines", []):
                if line.get("account_id") == account["id"]:
                    total_income += Decimal(str(line.get("credit", 0)))
                    total_income -= Decimal(str(line.get("debit", 0)))
    
    # Sum expenses
    for account in expense_accounts:
        cursor = db.journals.find({
            "church_id": church_id,
            "status": "approved",
            "date": {"$gte": start_date, "$lte": end_date}
        })
        
        async for journal in cursor:
            for line in journal.get("lines", []):
                if line.get("account_id") == account["id"]:
                    total_expenses += Decimal(str(line.get("debit", 0)))
                    total_expenses -= Decimal(str(line.get("credit", 0)))
    
    net_income = total_income - total_expenses
    
    return total_income, total_expenses, net_income


async def get_retained_earnings_account(
    db: AsyncIOMotorDatabase,
    church_id: str
) -> Optional[str]:
    """Get retained earnings account."""
    account = await db.chart_of_accounts.find_one({
        "church_id": church_id,
        "account_type": "Equity",
        "name": {"$regex": "Laba Ditahan|Retained Earnings", "$options": "i"}
    })
    
    return account["id"] if account else None


async def execute_year_end_closing(
    db: AsyncIOMotorDatabase,
    church_id: str,
    year: int,
    user_id: str,
    retained_earnings_account_id: str
) -> tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """Execute year-end closing process."""
    try:
        # Validate prerequisites
        is_valid, error_msg = await validate_prerequisites(db, church_id, year)
        if not is_valid:
            return False, "PREREQUISITES_NOT_MET", None
        
        # Check if already closed
        existing = await db.year_end_closings.find_one({
            "church_id": church_id,
            "fiscal_year": year
        })
        
        if existing:
            return False, "YEAR_ALREADY_CLOSED", None
        
        # Calculate totals
        total_income, total_expenses, net_income = await calculate_year_totals(
            db, church_id, year
        )
        
        # Generate closing journal
        journal_number = f"JRN-{year}-12-CLOSE"
        closing_date = date(year, 12, 31)
        
        # Build lines
        lines = []
        
        # Get all income accounts
        income_accounts = await db.chart_of_accounts.find({
            "church_id": church_id,
            "account_type": "Income"
        }).to_list(length=None)
        
        for account in income_accounts:
            lines.append({
                "account_id": account["id"],
                "description": "Year-end closing",
                "debit": float(total_income),
                "credit": 0
            })
        
        # Get all expense accounts
        expense_accounts = await db.chart_of_accounts.find({
            "church_id": church_id,
            "account_type": "Expense"
        }).to_list(length=None)
        
        for account in expense_accounts:
            lines.append({
                "account_id": account["id"],
                "description": "Year-end closing",
                "debit": 0,
                "credit": float(total_expenses)
            })
        
        # Retained earnings
        if net_income > 0:
            lines.append({
                "account_id": retained_earnings_account_id,
                "description": "Net income for the year",
                "debit": 0,
                "credit": float(net_income)
            })
        else:
            lines.append({
                "account_id": retained_earnings_account_id,
                "description": "Net loss for the year",
                "debit": float(abs(net_income)),
                "credit": 0
            })
        
        journal_id = str(uuid.uuid4())
        journal = {
            "id": journal_id,
            "church_id": church_id,
            "journal_number": journal_number,
            "date": closing_date,
            "description": f"Year-end closing for {year}",
            "status": "approved",
            "journal_type": "year_end_closing",
            "lines": lines,
            "total_debit": float(total_income) + (float(abs(net_income)) if net_income < 0 else 0),
            "total_credit": float(total_income) + (float(net_income) if net_income > 0 else 0),
            "is_balanced": True,
            "approved_by": user_id,
            "approved_at": datetime.utcnow(),
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "attachments": []
        }
        
        await db.journals.insert_one(journal)
        
        # Create year-end closing record
        closing_id = str(uuid.uuid4())
        closing = {
            "id": closing_id,
            "church_id": church_id,
            "fiscal_year": year,
            "closing_journal_id": journal_id,
            "net_income": float(net_income),
            "total_income": float(total_income),
            "total_expenses": float(total_expenses),
            "retained_earnings_account_id": retained_earnings_account_id,
            "status": "success",
            "error_message": None,
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "completed_at": datetime.utcnow()
        }
        
        await db.year_end_closings.insert_one(closing)
        
        # Lock all 12 months
        for month in range(1, 13):
            await db.fiscal_periods.update_one(
                {"church_id": church_id, "month": month, "year": year},
                {
                    "$set": {
                        "status": "locked",
                        "locked_by": user_id,
                        "locked_at": datetime.utcnow(),
                        "updated_at": datetime.utcnow()
                    }
                }
            )
        
        logger.info(f"Year-end closing completed for {year}, church {church_id}")
        
        closing.pop("_id", None)
        return True, None, closing
        
    except Exception as e:
        logger.error(f"Year-end closing failed: {str(e)}")
        return False, "CLOSING_FAILED", None
