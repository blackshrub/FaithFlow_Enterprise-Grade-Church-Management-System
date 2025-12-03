from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime
import uuid

from models.bank_account import BankAccountCreate, BankAccountUpdate
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id
from services import audit_service

router = APIRouter(prefix="/accounting/bank-accounts", tags=["Bank Accounts"])


@router.get("/")
async def list_bank_accounts(
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all bank accounts."""
    church_id = get_session_church_id(current_user)
    
    query = {"church_id": church_id}
    if is_active is not None:
        query["is_active"] = is_active
    
    cursor = db.bank_accounts.find(query, {"_id": 0}).sort("name", 1)
    accounts = await cursor.to_list(length=None)
    
    return accounts


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_bank_account(
    account_data: BankAccountCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new bank account."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    account_dict = account_data.model_dump(mode='json')
    account_dict["church_id"] = church_id
    account_dict["id"] = str(uuid.uuid4())
    account_dict["created_at"] = datetime.utcnow()
    account_dict["updated_at"] = datetime.utcnow()
    
    await db.bank_accounts.insert_one(account_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="bank_account",
        description=f"Created bank account {account_dict['name']}",
        after_data={"id": account_dict["id"], "name": account_dict["name"]}
    )
    
    account_dict.pop("_id", None)
    return account_dict
