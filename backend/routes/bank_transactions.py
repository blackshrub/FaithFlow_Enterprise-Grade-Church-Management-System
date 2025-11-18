from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
from datetime import datetime, date
import uuid
import csv
import io

from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_current_church_id
from services import pagination_service, audit_service

router = APIRouter(prefix="/accounting/bank-transactions", tags=["Bank Transactions"])


@router.get("/")
async def list_bank_transactions(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    bank_account_id: Optional[str] = None,
    is_reconciled: Optional[bool] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """List bank transactions with pagination."""
    church_id = get_current_church_id(current_user)
    
    limit, offset = pagination_service.validate_pagination_params(limit, offset)
    
    query = {"church_id": church_id}
    if bank_account_id:
        query["bank_account_id"] = bank_account_id
    if is_reconciled is not None:
        query["is_reconciled"] = is_reconciled
    if start_date or end_date:
        query["transaction_date"] = {}
        if start_date:
            query["transaction_date"]["$gte"] = start_date
        if end_date:
            query["transaction_date"]["$lte"] = end_date
    
    total = await db.bank_transactions.count_documents(query)
    cursor = db.bank_transactions.find(query, {"_id": 0}).sort("transaction_date", -1).skip(offset).limit(limit)
    transactions = await cursor.to_list(length=limit)
    
    return pagination_service.build_pagination_response(transactions, total, limit, offset)


@router.post("/import")
async def import_bank_transactions(
    bank_account_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Import bank transactions from CSV."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    content = await file.read()
    csv_content = content.decode('utf-8')
    csv_reader = csv.DictReader(io.StringIO(csv_content))
    
    success_count = 0
    error_count = 0
    errors = []
    
    for row_num, row in enumerate(csv_reader, start=2):
        try:
            transaction = {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "bank_account_id": bank_account_id,
                "transaction_date": datetime.strptime(row["date"], "%Y-%m-%d").date(),
                "description": row["description"],
                "amount": float(row["amount"]),
                "type": row["type"],
                "balance": float(row.get("balance", 0)),
                "is_reconciled": False,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow(),
                "attachments": []
            }
            await db.bank_transactions.insert_one(transaction)
            success_count += 1
        except Exception as e:
            error_count += 1
            errors.append({"row": row_num, "error": str(e)})
    
    # Create import log
    log = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "bank_account_id": bank_account_id,
        "file_name": file.filename,
        "import_date": datetime.utcnow(),
        "total_rows": success_count + error_count,
        "success_count": success_count,
        "error_count": error_count,
        "errors": errors,
        "imported_by": user_id,
        "created_at": datetime.utcnow()
    }
    await db.bank_import_logs.insert_one(log)
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="create", module="bank_import",
        description=f"Imported {success_count} transactions"
    )
    
    return {
        "message": f"Import completed: {success_count} success, {error_count} errors",
        "success_count": success_count,
        "error_count": error_count,
        "errors": errors
    }


@router.post("/{transaction_id}/match")
async def match_transaction(
    transaction_id: str,
    journal_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Match bank transaction to journal."""
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    await db.bank_transactions.update_one(
        {"id": transaction_id, "church_id": church_id},
        {
            "$set": {
                "is_reconciled": True,
                "matched_journal_id": journal_id,
                "reconciled_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        }
    )
    
    await audit_service.log_action(
        db=db, church_id=church_id, user_id=user_id,
        action_type="update", module="bank_reconciliation",
        description=f"Matched transaction to journal {journal_id}"
    )
    
    updated = await db.bank_transactions.find_one({"id": transaction_id}, {"_id": 0})
    return updated
