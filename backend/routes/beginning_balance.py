from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal
import uuid

from models.beginning_balance import BeginningBalanceBase, BeginningBalanceUpdate, BeginningBalanceEntry
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id
from utils import error_codes
from utils.error_response import error_response
from services import accounting_service, audit_service, fiscal_period_service

router = APIRouter(prefix="/accounting/beginning-balance", tags=["Beginning Balance"])


@router.get("/")
async def list_beginning_balances(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all beginning balance entries."""
    church_id = get_session_church_id(current_user)
    
    query = {"church_id": church_id}
    if status:
        query["status"] = status
    
    cursor = db.beginning_balances.find(query, {"_id": 0}).sort("created_at", -1)
    balances = await cursor.to_list(length=None)
    
    return balances


@router.get("/{balance_id}")
async def get_beginning_balance(
    balance_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single beginning balance entry."""
    church_id = get_session_church_id(current_user)
    
    balance = await db.beginning_balances.find_one(
        {"id": balance_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not balance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Beginning balance not found"}
        )
    
    return balance


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_beginning_balance(
    balance_data: BeginningBalanceBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create beginning balance entry."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    balance_dict = balance_data.model_dump()
    balance_dict["church_id"] = church_id
    balance_dict["created_by"] = user_id
    
    # Calculate totals
    from models.beginning_balance import BeginningBalance
    balance_obj = BeginningBalance(**balance_dict)
    balance_obj.calculate_totals()
    balance_dict = balance_obj.model_dump()
    
    balance_dict["id"] = str(uuid.uuid4())
    balance_dict["created_at"] = datetime.utcnow()
    balance_dict["updated_at"] = datetime.utcnow()
    
    # Convert date to ISO string for MongoDB
    if isinstance(balance_dict.get("effective_date"), date):
        balance_dict["effective_date"] = balance_dict["effective_date"].isoformat()
    
    # Convert Decimal to float
    balance_dict["total_debit"] = float(balance_dict["total_debit"])
    balance_dict["total_credit"] = float(balance_dict["total_credit"])
    for entry in balance_dict["entries"]:
        entry["amount"] = float(entry["amount"])
    
    await db.beginning_balances.insert_one(balance_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="beginning_balance",
        description=f"Created beginning balance for {balance_dict['effective_date']}",
        after_data={"id": balance_dict["id"]}
    )
    
    balance_dict.pop("_id", None)
    return balance_dict


@router.post("/{balance_id}/post")
async def post_beginning_balance(
    balance_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Post beginning balance (generates opening journal)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    balance = await db.beginning_balances.find_one(
        {"id": balance_id, "church_id": church_id}
    )
    
    if not balance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Beginning balance not found"}
        )
    
    if balance.get("status") != "draft":
        error_response(
            error_code="INVALID_STATUS",
            message="Beginning balance is already posted"
        )
    
    # Check if opening period (month 0) is locked
    # For simplicity, we check the effective date's period
    effective_date_str = balance["effective_date"]
    # Convert string to date object if needed
    if isinstance(effective_date_str, str):
        from datetime import datetime as dt
        effective_date = dt.fromisoformat(effective_date_str).date()
    else:
        effective_date = effective_date_str
        
    can_perform, error_code, _ = await accounting_service.validate_fiscal_period(
        db, church_id, effective_date, "create"
    )
    
    if not can_perform:
        error_response(
            error_code=error_code,
            message="Cannot post beginning balance in locked period"
        )
    
    # Generate opening journal
    journal_number = await accounting_service.generate_journal_number(db, church_id, effective_date)
    
    lines = []
    for entry in balance["entries"]:
        if entry["balance_type"] == "debit":
            lines.append({
                "account_id": entry["account_id"],
                "description": "Opening Balance",
                "debit": entry["amount"],
                "credit": 0
            })
        else:
            lines.append({
                "account_id": entry["account_id"],
                "description": "Opening Balance",
                "debit": 0,
                "credit": entry["amount"]
            })
    
    journal = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "journal_number": journal_number,
        "date": effective_date.isoformat() if isinstance(effective_date, date) else effective_date,
        "reference_number": None,
        "description": "Opening Balance Entry",
        "status": "approved",
        "journal_type": "opening_balance",
        "lines": lines,
        "total_debit": balance["total_debit"],
        "total_credit": balance["total_credit"],
        "is_balanced": True,
        "approved_by": user_id,
        "approved_at": datetime.utcnow(),
        "created_by": user_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "attachments": []
    }
    
    await db.journals.insert_one(journal)
    
    # Update beginning balance status
    await db.beginning_balances.update_one(
        {"id": balance_id},
        {
            "$set": {
                "status": "posted",
                "journal_id": journal["id"],
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="beginning_balance",
        description=f"Posted beginning balance, created journal {journal_number}",
        after_data={"status": "posted", "journal_id": journal["id"]}
    )
    
    journal.pop("_id", None)
    return journal


@router.delete("/{balance_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_beginning_balance(
    balance_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete beginning balance (only if draft)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    balance = await db.beginning_balances.find_one(
        {"id": balance_id, "church_id": church_id}
    )
    
    if not balance:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Beginning balance not found"}
        )
    
    if balance.get("status") != "draft":
        error_response(
            error_code="CANNOT_DELETE",
            message="Cannot delete posted beginning balance",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    await db.beginning_balances.delete_one({"id": balance_id})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="delete", module="beginning_balance",
        description=f"Deleted beginning balance {balance_id}"
    )
    
    return None
