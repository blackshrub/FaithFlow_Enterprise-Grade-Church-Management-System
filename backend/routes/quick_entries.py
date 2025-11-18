from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date, datetime
from decimal import Decimal
import uuid

from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_current_church_id
from services import accounting_service, audit_service
from models.journal import JournalLine

router = APIRouter(prefix="/accounting/quick", tags=["Quick Entries"])


class WeeklyGivingInput(BaseModel):
    date: date
    service_name: str = Field(..., min_length=1)
    giving_type: str = Field(..., min_length=1)
    amount: Decimal = Field(..., gt=0)
    from_account_id: str
    to_account_id: str
    file_ids: list[str] = Field(default_factory=list)


class OutgoingMoneyInput(BaseModel):
    date: date
    description: str = Field(..., min_length=1)
    amount: Decimal = Field(..., gt=0)
    from_account_id: str
    to_account_id: str
    responsibility_center_id: Optional[str] = None
    file_ids: list[str] = Field(default_factory=list)


@router.post("/weekly-giving", status_code=status.HTTP_201_CREATED)
async def create_weekly_giving(
    data: WeeklyGivingInput,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create weekly giving entry (auto-generates balanced journal)."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    # Validate fiscal period
    can_perform, error_code, _ = await accounting_service.validate_fiscal_period(
        db, church_id, data.date, "create"
    )
    
    if not can_perform:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": error_code, "message": "Cannot create entry in locked period"}
        )
    
    # Generate journal
    journal_number = await accounting_service.generate_journal_number(db, church_id, data.date)
    
    lines = [
        JournalLine(
            account_id=data.from_account_id,
            description=f"{data.giving_type} - {data.service_name}",
            debit=data.amount,
            credit=Decimal('0')
        ),
        JournalLine(
            account_id=data.to_account_id,
            description=f"{data.giving_type} - {data.service_name}",
            debit=Decimal('0'),
            credit=data.amount
        )
    ]
    
    journal = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "journal_number": journal_number,
        "date": datetime.combine(data.date, datetime.min.time()),
        "reference_number": None,
        "description": f"Persembahan {data.service_name} - {data.giving_type}",
        "status": "approved",
        "journal_type": "quick_giving",
        "lines": [line.model_dump() for line in lines],
        "total_debit": float(data.amount),
        "total_credit": float(data.amount),
        "is_balanced": True,
        "approved_by": user_id,
        "approved_at": datetime.utcnow(),
        "created_by": user_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "attachments": data.file_ids
    }
    
    # Convert Decimal to float
    for line in journal["lines"]:
        line["debit"] = float(line["debit"])
        line["credit"] = float(line["credit"])
    
    await db.journals.insert_one(journal)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="quick_entry",
        description=f"Quick giving entry: {journal_number}",
        after_data={"id": journal["id"], "journal_number": journal_number}
    )
    
    journal.pop("_id", None)
    return journal


@router.post("/outgoing-money", status_code=status.HTTP_201_CREATED)
async def create_outgoing_money(
    data: OutgoingMoneyInput,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create outgoing money entry (auto-generates balanced journal)."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    # Validate fiscal period
    can_perform, error_code, _ = await accounting_service.validate_fiscal_period(
        db, church_id, data.date, "create"
    )
    
    if not can_perform:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": error_code, "message": "Cannot create entry in locked period"}
        )
    
    # Generate journal
    journal_number = await accounting_service.generate_journal_number(db, church_id, data.date)
    
    lines = [
        JournalLine(
            account_id=data.to_account_id,
            description=data.description,
            debit=data.amount,
            credit=Decimal('0'),
            responsibility_center_id=data.responsibility_center_id
        ),
        JournalLine(
            account_id=data.from_account_id,
            description=data.description,
            debit=Decimal('0'),
            credit=data.amount
        )
    ]
    
    journal = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "journal_number": journal_number,
        "date": datetime.combine(data.date, datetime.min.time()),
        "reference_number": None,
        "description": f"Pengeluaran: {data.description}",
        "status": "approved",
        "journal_type": "quick_expense",
        "lines": [line.model_dump() for line in lines],
        "total_debit": float(data.amount),
        "total_credit": float(data.amount),
        "is_balanced": True,
        "approved_by": user_id,
        "approved_at": datetime.utcnow(),
        "created_by": user_id,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "attachments": data.file_ids
    }
    
    # Convert Decimal to float
    for line in journal["lines"]:
        line["debit"] = float(line["debit"])
        line["credit"] = float(line["credit"])
    
    await db.journals.insert_one(journal)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="quick_entry",
        description=f"Quick expense entry: {journal_number}",
        after_data={"id": journal["id"], "journal_number": journal_number}
    )
    
    journal.pop("_id", None)
    return journal
