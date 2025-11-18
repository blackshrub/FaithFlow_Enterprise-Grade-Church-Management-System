from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, date

from models.fixed_asset import FixedAssetCreate, FixedAssetUpdate
from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_current_church_id
from utils.error_response import error_response
from services import audit_service, accounting_service, fiscal_period_service
import uuid

router = APIRouter(prefix="/accounting/assets", tags=["Fixed Assets"])


@router.get("/")
async def list_assets(
    is_active: Optional[bool] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List all fixed assets."""
    church_id = get_current_church_id(current_user)
    
    query = {"church_id": church_id}
    if is_active is not None:
        query["is_active"] = is_active
    
    cursor = db.fixed_assets.find(query, {"_id": 0}).sort("asset_code", 1)
    assets = await cursor.to_list(length=None)
    
    return assets


@router.get("/{asset_id}")
async def get_asset(
    asset_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single fixed asset."""
    church_id = get_current_church_id(current_user)
    
    asset = await db.fixed_assets.find_one(
        {"id": asset_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Asset not found"}
        )
    
    return asset


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_asset(
    asset_data: FixedAssetBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new fixed asset."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    asset_dict = asset_data.model_dump()
    asset_dict["church_id"] = church_id
    
    # Check code uniqueness
    existing = await db.fixed_assets.find_one({
        "church_id": church_id,
        "asset_code": asset_dict["asset_code"]
    })
    
    if existing:
        error_response(
            error_code="CODE_EXISTS",
            message=f"Asset code {asset_dict['asset_code']} already exists"
        )
    
    asset_dict["id"] = str(uuid.uuid4())
    asset_dict["created_at"] = datetime.utcnow()
    asset_dict["updated_at"] = datetime.utcnow()
    
    # Convert Decimal to float
    asset_dict["cost"] = float(asset_dict["cost"])
    asset_dict["salvage_value"] = float(asset_dict["salvage_value"])
    
    await db.fixed_assets.insert_one(asset_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="fixed_asset",
        description=f"Created asset {asset_dict['asset_code']}",
        after_data={"id": asset_dict["id"], "asset_code": asset_dict["asset_code"]}
    )
    
    asset_dict.pop("_id", None)
    return asset_dict


@router.put("/{asset_id}")
async def update_asset(
    asset_id: str,
    asset_data: FixedAssetUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update fixed asset."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.fixed_assets.find_one(
        {"id": asset_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Asset not found"}
        )
    
    update_dict = asset_data.model_dump(exclude_unset=True)
    if not update_dict:
        return existing
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.fixed_assets.update_one(
        {"id": asset_id},
        {"$set": update_dict}
    )
    
    updated = await db.fixed_assets.find_one({"id": asset_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="fixed_asset",
        description=f"Updated asset {existing['asset_code']}"
    )
    
    return updated


@router.delete("/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_asset(
    asset_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Deactivate fixed asset."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.fixed_assets.find_one(
        {"id": asset_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Asset not found"}
        )
    
    await db.fixed_assets.update_one(
        {"id": asset_id},
        {"$set": {"is_active": False, "updated_at": datetime.utcnow()}}
    )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="fixed_asset",
        description=f"Deactivated asset {existing['asset_code']}"
    )
    
    return None


@router.post("/run-monthly-depreciation")
async def run_monthly_depreciation(
    month: int = Query(..., ge=1, le=12),
    year: int = Query(..., ge=1900, le=2100),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Run depreciation for all active assets for a specific month."""
    from decimal import Decimal
    
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    # Check fiscal period
    can_perform, error_code = await fiscal_period_service.can_perform_operation(
        db, church_id, month, year, "create"
    )
    
    if not can_perform:
        error_response(
            error_code=error_code,
            message="Cannot run depreciation in locked period"
        )
    
    # Get all active assets
    cursor = db.fixed_assets.find({"church_id": church_id, "is_active": True})
    assets = await cursor.to_list(length=None)
    
    created_journals = []
    
    for asset in assets:
        # Check if already depreciated for this period
        existing_log = await db.asset_depreciation_logs.find_one({
            "church_id": church_id,
            "asset_id": asset["id"],
            "period_month": month,
            "period_year": year
        })
        
        if existing_log:
            continue  # Skip if already done
        
        # Calculate depreciation
        from models.fixed_asset import FixedAsset
        asset_obj = FixedAsset(**asset)
        monthly_depreciation = asset_obj.calculate_monthly_depreciation()
        
        period_date = date(year, month, 1)
        accumulated = asset_obj.get_depreciation_to_date(period_date)
        book_value = asset_obj.get_book_value(period_date)
        
        # Create journal
        journal_number = await accounting_service.generate_journal_number(
            db, church_id, period_date
        )
        
        journal = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "journal_number": journal_number,
            "date": period_date,
            "reference_number": asset["asset_code"],
            "description": f"Depreciation for {asset['name']}",
            "status": "approved",
            "journal_type": "depreciation",
            "lines": [
                {
                    "account_id": asset["depreciation_expense_account_id"],
                    "description": f"Depreciation expense - {asset['name']}",
                    "debit": float(monthly_depreciation),
                    "credit": 0
                },
                {
                    "account_id": asset["accumulated_depreciation_account_id"],
                    "description": f"Accumulated depreciation - {asset['name']}",
                    "debit": 0,
                    "credit": float(monthly_depreciation)
                }
            ],
            "total_debit": float(monthly_depreciation),
            "total_credit": float(monthly_depreciation),
            "is_balanced": True,
            "approved_by": user_id,
            "approved_at": datetime.utcnow(),
            "created_by": user_id,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "attachments": []
        }
        
        await db.journals.insert_one(journal)
        
        # Create depreciation log
        log = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "asset_id": asset["id"],
            "period_month": month,
            "period_year": year,
            "depreciation_amount": float(monthly_depreciation),
            "accumulated_depreciation": float(accumulated),
            "book_value": float(book_value),
            "journal_id": journal["id"],
            "created_at": datetime.utcnow()
        }
        
        await db.asset_depreciation_logs.insert_one(log)
        
        created_journals.append({
            "asset_id": asset["id"],
            "asset_code": asset["asset_code"],
            "journal_number": journal_number,
            "depreciation_amount": float(monthly_depreciation)
        })
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="depreciation",
        description=f"Ran depreciation for {year}-{month:02d}, created {len(created_journals)} journals"
    )
    
    return {
        "message": f"Depreciation completed for {len(created_journals)} assets",
        "created_journals": created_journals
    }


@router.get("/{asset_id}/depreciation-schedule")
async def get_depreciation_schedule(
    asset_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get depreciation schedule for an asset."""
    church_id = get_current_church_id(current_user)
    
    asset = await db.fixed_assets.find_one(
        {"id": asset_id, "church_id": church_id}
    )
    
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Asset not found"}
        )
    
    # Get depreciation logs
    cursor = db.asset_depreciation_logs.find(
        {"church_id": church_id, "asset_id": asset_id},
        {"_id": 0}
    ).sort([("period_year", 1), ("period_month", 1)])
    
    logs = await cursor.to_list(length=None)
    
    return {
        "asset": asset,
        "schedule": logs
    }
