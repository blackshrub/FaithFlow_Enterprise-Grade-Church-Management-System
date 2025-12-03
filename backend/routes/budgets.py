from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime

from models.budget import BudgetBase, BudgetUpdate
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id
from utils.error_response import error_response
from utils import error_codes
from services import audit_service
import uuid

router = APIRouter(prefix="/accounting/budgets", tags=["Budgets"])


@router.get("/")
async def list_budgets(
    fiscal_year: Optional[int] = None,
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all budgets."""
    church_id = get_session_church_id(current_user)
    
    query = {"church_id": church_id}
    if fiscal_year:
        query["fiscal_year"] = fiscal_year
    if status:
        query["status"] = status
    
    cursor = db.budgets.find(query, {"_id": 0}).sort("fiscal_year", -1)
    budgets = await cursor.to_list(length=None)
    
    return budgets


@router.get("/{budget_id}")
async def get_budget(
    budget_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single budget."""
    church_id = get_session_church_id(current_user)
    
    budget = await db.budgets.find_one(
        {"id": budget_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Budget not found"}
        )
    
    return budget


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_budget(
    budget_data: BudgetBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new budget."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    budget_dict = budget_data.model_dump(mode='json')
    budget_dict["church_id"] = church_id
    budget_dict["status"] = "draft"  # Default to draft
    budget_dict["id"] = str(uuid.uuid4())
    budget_dict["created_at"] = datetime.utcnow()
    budget_dict["updated_at"] = datetime.utcnow()
    
    # Convert Decimal to float
    for line in budget_dict["lines"]:
        line["annual_amount"] = float(line["annual_amount"])
        if line.get("monthly_amounts"):
            line["monthly_amounts"] = {k: float(v) for k, v in line["monthly_amounts"].items()}
    
    await db.budgets.insert_one(budget_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="budget",
        description=f"Created budget {budget_dict['name']}",
        after_data={"id": budget_dict["id"], "name": budget_dict["name"]}
    )
    
    budget_dict.pop("_id", None)
    return budget_dict


@router.put("/{budget_id}")
async def update_budget(
    budget_id: str,
    budget_data: BudgetUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update budget (only if draft)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.budgets.find_one(
        {"id": budget_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Budget not found"}
        )
    
    if existing.get("status") != "draft":
        error_response(
            error_code="CANNOT_EDIT_ACTIVE_BUDGET",
            message="Cannot edit active budget",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    update_dict = budget_data.model_dump(mode='json', exclude_unset=True)
    if not update_dict:
        return existing
    
    # Convert Decimal to float
    if "lines" in update_dict:
        for line in update_dict["lines"]:
            line["annual_amount"] = float(line["annual_amount"])
            if line.get("monthly_amounts"):
                line["monthly_amounts"] = {k: float(v) for k, v in line["monthly_amounts"].items()}
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.budgets.update_one(
        {"id": budget_id},
        {"$set": update_dict}
    )
    
    updated = await db.budgets.find_one({"id": budget_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="budget",
        description=f"Updated budget {existing['name']}"
    )
    
    return updated


@router.post("/{budget_id}/activate")
async def activate_budget(
    budget_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Activate budget (validates monthly == annual)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    budget = await db.budgets.find_one(
        {"id": budget_id, "church_id": church_id}
    )
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Budget not found"}
        )
    
    # Validate monthly == annual
    from models.budget import Budget
    budget_obj = Budget(**budget)
    is_valid, message = budget_obj.validate_activation()
    
    if not is_valid:
        error_response(
            error_code=error_codes.BUDGET_MONTHLY_ANNUAL_MISMATCH,
            message=message
        )
    
    await db.budgets.update_one(
        {"id": budget_id},
        {
            "$set": {
                "status": "active",
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    updated = await db.budgets.find_one({"id": budget_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="budget",
        description=f"Activated budget {budget['name']}",
        after_data={"status": "active"}
    )
    
    return updated


@router.post("/{budget_id}/distribute-monthly")
async def distribute_monthly(
    budget_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Auto-distribute annual amounts to monthly."""
    church_id = get_session_church_id(current_user)
    
    budget = await db.budgets.find_one(
        {"id": budget_id, "church_id": church_id}
    )
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Budget not found"}
        )
    
    # Distribute
    from models.budget import Budget
    budget_obj = Budget(**budget)
    budget_obj.distribute_monthly()
    
    # Update database
    lines = []
    for line in budget_obj.lines:
        line_dict = line.model_dump(mode='json')
        line_dict["annual_amount"] = float(line_dict["annual_amount"])
        line_dict["monthly_amounts"] = {k: float(v) for k, v in line_dict["monthly_amounts"].items()}
        lines.append(line_dict)
    
    await db.budgets.update_one(
        {"id": budget_id},
        {
            "$set": {
                "lines": lines,
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    updated = await db.budgets.find_one({"id": budget_id}, {"_id": 0})
    return updated


@router.get("/{budget_id}/variance")
async def get_budget_variance(
    budget_id: str,
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=1900, le=2100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Calculate budget vs actual variance."""
    from datetime import date
    from decimal import Decimal
    
    church_id = get_session_church_id(current_user)
    
    budget = await db.budgets.find_one(
        {"id": budget_id, "church_id": church_id}
    )
    
    if not budget:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Budget not found"}
        )
    
    # Calculate actuals from journals
    start_date = date(year, month, 1)
    if month == 12:
        end_date = date(year + 1, 1, 1)
    else:
        end_date = date(year, month + 1, 1)
    
    variance_data = []
    
    for line in budget["lines"]:
        account_id = line["account_id"]
        monthly_key = f"{month:02d}"
        budgeted = Decimal(str(line.get("monthly_amounts", {}).get(monthly_key, 0)))
        
        # Get actual from journals
        from services.accounting_service import calculate_account_balance
        actual = await calculate_account_balance(db, account_id, church_id, end_date)
        
        variance = actual - budgeted
        variance_pct = (variance / budgeted * 100) if budgeted > 0 else 0
        
        variance_data.append({
            "account_id": account_id,
            "responsibility_center_id": line.get("responsibility_center_id"),
            "budgeted_amount": float(budgeted),
            "actual_amount": float(actual),
            "variance": float(variance),
            "variance_percentage": float(variance_pct),
            "status": "over" if variance > 0 else "under" if variance < 0 else "on_track"
        })
    
    return {
        "budget_id": budget_id,
        "month": month,
        "year": year,
        "variance_data": variance_data
    }
