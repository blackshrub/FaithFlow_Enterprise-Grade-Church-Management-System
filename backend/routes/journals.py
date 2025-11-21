from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, date

from models.journal import JournalBase, JournalUpdate
from utils.dependencies import get_db, get_current_user
from utils.dependencies import get_session_church_id
from utils import error_codes
from utils.error_response import error_response
from services import accounting_service, audit_service, pagination_service
import uuid

router = APIRouter(prefix="/accounting/journals", tags=["Journals"])


@router.get("/")
async def list_journals(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    status: Optional[str] = None,
    journal_type: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List journals with pagination (REQUIRED)."""
    church_id = get_session_church_id(current_user)
    
    # Validate pagination
    limit, offset = pagination_service.validate_pagination_params(limit, offset)
    
    query = {"church_id": church_id}
    
    if start_date or end_date:
        query["date"] = {}
        if start_date:
            query["date"]["$gte"] = start_date
        if end_date:
            query["date"]["$lte"] = end_date
    
    if status:
        query["status"] = status
    
    if journal_type:
        query["journal_type"] = journal_type
    
    # Get total count
    total = await db.journals.count_documents(query)
    
    # Get paginated data
    cursor = db.journals.find(query, {"_id": 0}).sort("date", -1).skip(offset).limit(limit)
    journals = await cursor.to_list(length=limit)
    
    return pagination_service.build_pagination_response(journals, total, limit, offset)


@router.get("/{journal_id}")
async def get_journal(
    journal_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single journal."""
    church_id = get_session_church_id(current_user)
    
    journal = await db.journals.find_one(
        {"id": journal_id, "church_id": church_id},
        {"_id": 0}
    )
    
    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Journal not found"}
        )
    
    return journal


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_journal(
    journal_data: JournalBase,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new journal entry."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    journal_dict = journal_data.model_dump()
    journal_dict["church_id"] = church_id
    journal_dict["created_by"] = user_id
    journal_dict["status"] = "draft"  # Default to draft
    
    # Validate fiscal period
    journal_date = journal_dict["date"]
    can_perform, error_code, period = await accounting_service.validate_fiscal_period(
        db, church_id, journal_date, "create"
    )
    
    if not can_perform:
        error_response(
            error_code=error_code,
            message=f"Cannot create journal in {period.get('status')} period"
        )
    
    # Generate journal number
    journal_dict["journal_number"] = await accounting_service.generate_journal_number(
        db, church_id, journal_date
    )
    
    # Calculate totals
    from models.journal import Journal
    journal_obj = Journal(**journal_dict)
    journal_obj.calculate_totals()
    journal_dict = journal_obj.model_dump()
    
    journal_dict["id"] = str(uuid.uuid4())
    journal_dict["created_at"] = datetime.utcnow()
    journal_dict["updated_at"] = datetime.utcnow()
    
    # Convert date to ISO string for MongoDB
    if isinstance(journal_dict.get("date"), date):
        journal_dict["date"] = journal_dict["date"].isoformat()
    
    # Convert Decimal to float for MongoDB
    journal_dict["total_debit"] = float(journal_dict["total_debit"])
    journal_dict["total_credit"] = float(journal_dict["total_credit"])
    for line in journal_dict["lines"]:
        line["debit"] = float(line["debit"])
        line["credit"] = float(line["credit"])
    
    await db.journals.insert_one(journal_dict)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="journal",
        description=f"Created journal {journal_dict['journal_number']}",
        after_data={"id": journal_dict["id"], "journal_number": journal_dict["journal_number"]}
    )
    
    journal_dict.pop("_id", None)
    return journal_dict


@router.put("/{journal_id}")
async def update_journal(
    journal_id: str,
    journal_data: JournalUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update journal (only if draft)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    existing = await db.journals.find_one(
        {"id": journal_id, "church_id": church_id}
    )
    
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Journal not found"}
        )
    
    if existing.get("status") != "draft":
        error_response(
            error_code=error_codes.CANNOT_EDIT_APPROVED_JOURNAL,
            message="Cannot edit approved journal",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    # Validate fiscal period
    journal_date = journal_data.date if journal_data.date else existing["date"]
    # Convert string date to date object if needed
    if isinstance(journal_date, str):
        from datetime import datetime as dt
        journal_date = dt.fromisoformat(journal_date).date()
    can_perform, error_code, _ = await accounting_service.validate_fiscal_period(
        db, church_id, journal_date, "edit"
    )
    
    if not can_perform:
        error_response(
            error_code=error_code,
            message="Cannot edit journal in locked period"
        )
    
    update_dict = journal_data.model_dump(exclude_unset=True)
    if not update_dict:
        return existing
    
    # Recalculate totals if lines changed
    if "lines" in update_dict:
        from models.journal import Journal, JournalBase
        temp_dict = {**existing, **update_dict}
        temp_obj = Journal(**temp_dict)
        temp_obj.calculate_totals()
        update_dict["total_debit"] = float(temp_obj.total_debit)
        update_dict["total_credit"] = float(temp_obj.total_credit)
        update_dict["is_balanced"] = temp_obj.is_balanced
        
        # Convert Decimal
        for line in update_dict["lines"]:
            line["debit"] = float(line["debit"])
            line["credit"] = float(line["credit"])
    
    update_dict["updated_at"] = datetime.utcnow()
    
    await db.journals.update_one(
        {"id": journal_id},
        {"$set": update_dict}
    )
    
    updated = await db.journals.find_one({"id": journal_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="journal",
        description=f"Updated journal {existing['journal_number']}"
    )
    
    return updated


@router.post("/{journal_id}/approve")
async def approve_journal(
    journal_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Approve journal."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    journal = await db.journals.find_one(
        {"id": journal_id, "church_id": church_id}
    )
    
    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Journal not found"}
        )
    
    if journal.get("status") != "draft":
        error_response(
            error_code=error_codes.INVALID_STATUS_TRANSITION,
            message="Journal is already approved"
        )
    
    # Validate fiscal period
    journal_date = journal["date"]
    # Convert string date to date object if needed
    if isinstance(journal_date, str):
        from datetime import datetime as dt
        journal_date = dt.fromisoformat(journal_date).date()
    can_perform, error_code, _ = await accounting_service.validate_fiscal_period(
        db, church_id, journal_date, "approve"
    )
    
    if not can_perform:
        error_response(
            error_code=error_code,
            message="Cannot approve journal in closed/locked period"
        )
    
    # Update status
    await db.journals.update_one(
        {"id": journal_id},
        {
            "$set": {
                "status": "approved",
                "approved_by": user_id,
                "approved_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    updated = await db.journals.find_one({"id": journal_id}, {"_id": 0})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="approve", module="journal",
        description=f"Approved journal {journal['journal_number']}",
        before_data={"status": "draft"},
        after_data={"status": "approved"}
    )
    
    return updated


@router.delete("/{journal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_journal(
    journal_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Delete journal (only if draft)."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("id")
    
    journal = await db.journals.find_one(
        {"id": journal_id, "church_id": church_id}
    )
    
    if not journal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "Journal not found"}
        )
    
    if journal.get("status") != "draft":
        error_response(
            error_code="CANNOT_DELETE_APPROVED",
            message="Cannot delete approved journal",
            status_code=status.HTTP_403_FORBIDDEN
        )
    
    await db.journals.delete_one({"id": journal_id})
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="delete", module="journal",
        description=f"Deleted journal {journal['journal_number']}",
        before_data={"id": journal.get("id"), "journal_number": journal.get("journal_number")}
    )
    
    return None
