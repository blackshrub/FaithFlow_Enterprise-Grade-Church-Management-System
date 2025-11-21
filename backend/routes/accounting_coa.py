from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime

from models.accounting_coa import ChartOfAccountCreate, ChartOfAccountUpdate, ChartOfAccount
from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_session_church_id
from utils.error_response import error_response
from utils import error_codes
from services import accounting_service, audit_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/accounting/coa", tags=["Chart of Accounts"])


@router.get("/")
async def list_coa(
    account_type: Optional[str] = None,
    search: Optional[str] = None,
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all Chart of Accounts.
    """
    church_id = get_session_church_id(current_user)
    
    query = {"church_id": church_id}
    
    if account_type:
        query["account_type"] = account_type
    
    if is_active is not None:
        query["is_active"] = is_active
    
    if search:
        query["$or"] = [
            {"code": {"$regex": search, "$options": "i"}},
            {"name": {"$regex": search, "$options": "i"}}
        ]
    
    cursor = db.chart_of_accounts.find(query, {"_id": 0}).sort("code", 1)
    accounts = await cursor.to_list(length=None)
    
    return accounts


@router.get("/tree")
async def get_coa_tree(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get COA as tree structure with hierarchy.
    """
    church_id = get_session_church_id(current_user)
    
    tree = await accounting_service.get_coa_hierarchy(db, church_id)
    
    return tree


@router.get("/{account_id}")
async def get_coa(
    account_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get single Chart of Account.
    """
    church_id = get_session_church_id(current_user)
    
    account = await db.chart_of_accounts.find_one(
        {"id": account_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Account not found"}
        )
    
    return account


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_coa(
    coa_data: ChartOfAccountCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create new Chart of Account.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    # Override church_id from token
    coa_dict = coa_data.model_dump()
    coa_dict["church_id"] = church_id
    
    # Check code uniqueness per church
    existing = await db.chart_of_accounts.find_one({
        "church_id": church_id,
        "code": coa_dict["code"]
    })
    
    if existing:
        error_response(
            error_code=error_codes.ACCOUNT_CODE_EXISTS,
            message=f"Account code {coa_dict['code']} already exists"
        )
    
    # Calculate level based on parent
    if coa_dict.get("parent_id"):
        parent = await db.chart_of_accounts.find_one({"id": coa_dict["parent_id"]})
        if parent:
            coa_dict["level"] = parent.get("level", 0) + 1
    
    # Create account
    import uuid
    coa_dict["id"] = str(uuid.uuid4())
    coa_dict["created_at"] = datetime.utcnow()
    coa_dict["updated_at"] = datetime.utcnow()
    
    await db.chart_of_accounts.insert_one(coa_dict)
    
    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="create",
        module="coa",
        description=f"Created account {coa_dict['code']} - {coa_dict['name']}",
        after_data={"id": coa_dict["id"], "code": coa_dict["code"], "name": coa_dict["name"]}
    )
    
    coa_dict.pop("_id", None)
    return coa_dict


@router.put("/{account_id}")
async def update_coa(
    account_id: str,
    coa_data: ChartOfAccountUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update Chart of Account.
    Protected fields (account_type, normal_balance, parent_id) cannot be updated if account is used in journals.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    # Get existing account
    existing = await db.chart_of_accounts.find_one(
        {"id": account_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Account not found"}
        )
    
    # Check if account is used in journals
    is_used = await accounting_service.check_coa_usage(db, account_id, church_id)
    
    update_dict = coa_data.model_dump(exclude_unset=True)
    
    if is_used:
        # Check if trying to update protected fields
        protected_fields = ["account_type", "normal_balance", "parent_id"]
        for field in protected_fields:
            if field in update_dict:
                error_response(
                    error_code=error_codes.COA_EDIT_NOT_ALLOWED,
                    message=f"Cannot update {field} for accounts used in journals",
                    status_code=status.HTTP_403_FORBIDDEN
                )
    
    if not update_dict:
        return existing
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.chart_of_accounts.update_one(
        {"id": account_id},
        {"$set": update_dict}
    )
    
    # Audit log
    updated = await db.chart_of_accounts.find_one({"id": account_id}, {"_id": 0})
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="update",
        module="coa",
        description=f"Updated account {existing['code']} - {existing['name']}",
        before_data={k: existing.get(k) for k in update_dict.keys()},
        after_data={k: updated.get(k) for k in update_dict.keys()}
    )
    
    return updated


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_coa(
    account_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete Chart of Account (only if not used in journals).
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    # Get existing account
    existing = await db.chart_of_accounts.find_one(
        {"id": account_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Account not found"}
        )
    
    # Check if account is used
    is_used = await accounting_service.check_coa_usage(db, account_id, church_id)
    
    if is_used:
        error_response(
            error_code=error_codes.CANNOT_DELETE_USED_ACCOUNT,
            message="Cannot delete account that is used in journals",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    # Delete account
    await db.chart_of_accounts.delete_one({"id": account_id})
    
    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="delete",
        module="coa",
        description=f"Deleted account {existing['code']} - {existing['name']}",
        before_data={"id": existing.get("id"), "code": existing.get("code"), "name": existing.get("name")}
    )
    
    return None


@router.post("/seed-default", status_code=status.HTTP_201_CREATED)
async def seed_default_coa(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Seed default Indonesian church Chart of Accounts.
    Only works if no accounts exist for this church.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    # Check if accounts already exist
    count = await db.chart_of_accounts.count_documents({"church_id": church_id})
    
    if count > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "VALIDATION_ERROR",
                "message": "Chart of Accounts already exists for this church"
            }
        )
    
    # Import and run seeder
    from scripts.seed_coa import seed_indonesian_coa
    created_count = await seed_indonesian_coa(db, church_id)
    
    # Audit log
    await audit_service.log_action(
        db=db,
        church_id=church_id,
        user_id=user_id,
        action_type="create",
        module="coa",
        description=f"Seeded default Indonesian COA ({created_count} accounts)"
    )
    
    return {"message": f"Successfully created {created_count} default accounts"}
