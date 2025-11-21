from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import date, datetime
from decimal import Decimal

from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_session_church_id
from services import accounting_service

router = APIRouter(prefix="/accounting/reports", tags=["Reports"])


@router.get("/general-ledger")
async def general_ledger_report(
    account_id: Optional[str] = None,
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate General Ledger report."""
    church_id = get_session_church_id(current_user)
    
    # Convert date to datetime for MongoDB compatibility
    start_datetime = datetime.combine(start_date, datetime.min.time())
    end_datetime = datetime.combine(end_date, datetime.max.time())
    
    query = {
        "church_id": church_id,
        "status": "approved",
        "date": {"$gte": start_datetime, "$lte": end_datetime}
    }
    
    if account_id:
        query["lines.account_id"] = account_id
    
    cursor = db.journals.find(query, {"_id": 0}).sort("date", 1)
    journals = await cursor.to_list(length=None)
    
    return {"journals": journals, "start_date": start_date, "end_date": end_date}


@router.get("/trial-balance")
async def trial_balance_report(
    as_of_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate Trial Balance report."""
    church_id = get_session_church_id(current_user)
    
    # Get all accounts
    accounts = await db.chart_of_accounts.find(
        {"church_id": church_id, "is_active": True},
        {"_id": 0}
    ).to_list(length=None)
    
    trial_balance = []
    total_debit = Decimal('0')
    total_credit = Decimal('0')
    
    for account in accounts:
        balance = await accounting_service.calculate_account_balance(
            db, account["id"], church_id, as_of_date
        )
        
        if balance != 0:
            if account["normal_balance"] == "Debit":
                trial_balance.append({
                    "account_code": account["code"],
                    "account_name": account["name"],
                    "debit": float(balance) if balance > 0 else 0,
                    "credit": float(abs(balance)) if balance < 0 else 0
                })
                if balance > 0:
                    total_debit += balance
                else:
                    total_credit += abs(balance)
            else:
                trial_balance.append({
                    "account_code": account["code"],
                    "account_name": account["name"],
                    "debit": float(abs(balance)) if balance < 0 else 0,
                    "credit": float(balance) if balance > 0 else 0
                })
                if balance > 0:
                    total_credit += balance
                else:
                    total_debit += abs(balance)
    
    return {
        "as_of_date": as_of_date,
        "trial_balance": trial_balance,
        "total_debit": float(total_debit),
        "total_credit": float(total_credit),
        "is_balanced": total_debit == total_credit
    }


@router.get("/income-statement")
async def income_statement_report(
    start_date: date = Query(...),
    end_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate Income Statement (P&L) report."""
    church_id = get_session_church_id(current_user)
    
    # Get income and expense accounts
    income_accounts = await db.chart_of_accounts.find(
        {"church_id": church_id, "account_type": "Income", "is_active": True}
    ).to_list(length=None)
    
    expense_accounts = await db.chart_of_accounts.find(
        {"church_id": church_id, "account_type": "Expense", "is_active": True}
    ).to_list(length=None)
    
    total_income = Decimal('0')
    total_expenses = Decimal('0')
    
    income_data = []
    for account in income_accounts:
        balance = await accounting_service.calculate_account_balance(
            db, account["id"], church_id, end_date
        )
        if balance != 0:
            income_data.append({
                "account_code": account["code"],
                "account_name": account["name"],
                "amount": float(balance)
            })
            total_income += balance
    
    expense_data = []
    for account in expense_accounts:
        balance = await accounting_service.calculate_account_balance(
            db, account["id"], church_id, end_date
        )
        if balance != 0:
            expense_data.append({
                "account_code": account["code"],
                "account_name": account["name"],
                "amount": float(balance)
            })
            total_expenses += balance
    
    net_income = total_income - total_expenses
    
    return {
        "start_date": start_date,
        "end_date": end_date,
        "income": income_data,
        "expenses": expense_data,
        "total_income": float(total_income),
        "total_expenses": float(total_expenses),
        "net_income": float(net_income)
    }


@router.get("/balance-sheet")
async def balance_sheet_report(
    as_of_date: date = Query(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate Balance Sheet report."""
    church_id = get_session_church_id(current_user)
    
    # Get assets, liabilities, equity accounts
    assets = await db.chart_of_accounts.find(
        {"church_id": church_id, "account_type": "Asset", "is_active": True}
    ).to_list(length=None)
    
    liabilities = await db.chart_of_accounts.find(
        {"church_id": church_id, "account_type": "Liability", "is_active": True}
    ).to_list(length=None)
    
    equity = await db.chart_of_accounts.find(
        {"church_id": church_id, "account_type": "Equity", "is_active": True}
    ).to_list(length=None)
    
    total_assets = Decimal('0')
    total_liabilities = Decimal('0')
    total_equity = Decimal('0')
    
    asset_data = []
    for account in assets:
        balance = await accounting_service.calculate_account_balance(
            db, account["id"], church_id, as_of_date
        )
        if balance != 0:
            asset_data.append({
                "account_code": account["code"],
                "account_name": account["name"],
                "amount": float(balance)
            })
            total_assets += balance
    
    liability_data = []
    for account in liabilities:
        balance = await accounting_service.calculate_account_balance(
            db, account["id"], church_id, as_of_date
        )
        if balance != 0:
            liability_data.append({
                "account_code": account["code"],
                "account_name": account["name"],
                "amount": float(balance)
            })
            total_liabilities += balance
    
    equity_data = []
    for account in equity:
        balance = await accounting_service.calculate_account_balance(
            db, account["id"], church_id, as_of_date
        )
        if balance != 0:
            equity_data.append({
                "account_code": account["code"],
                "account_name": account["name"],
                "amount": float(balance)
            })
            total_equity += balance
    
    return {
        "as_of_date": as_of_date,
        "assets": asset_data,
        "liabilities": liability_data,
        "equity": equity_data,
        "total_assets": float(total_assets),
        "total_liabilities": float(total_liabilities),
        "total_equity": float(total_equity),
        "is_balanced": total_assets == (total_liabilities + total_equity)
    }
