"""
Giving/Offering API Routes for Mobile App.

Handles member donations, payment processing with iPaymu, and giving history.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request, Header
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime, timedelta
from decimal import Decimal
import logging
import uuid

from models.giving import (
    GivingFund,
    GivingFundCreate,
    GivingFundUpdate,
    GivingTransaction,
    GivingTransactionCreate,
    GivingPaymentIntentResponse,
    GivingTransactionResponse,
    GivingHistoryResponse,
    IPaymuCallback
)
from utils.dependencies import get_db, get_current_user, get_session_church_id
from services.ipaymu_service import get_ipaymu_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/giving", tags=["Giving"])


# ===========================
# GIVING FUNDS MANAGEMENT
# ===========================

@router.get("/funds", response_model=List[GivingFund])
async def list_giving_funds(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all active giving funds for current church.

    Used by mobile app to show fund selection dropdown.
    """
    church_id = get_session_church_id(current_user)

    funds = await db.giving_funds.find({
        "church_id": church_id,
        "is_active": True
    }).sort("display_order", 1).to_list(100)

    if not funds:
        # Create default funds if none exist
        default_funds = [
            {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "name": "General Offering",
                "name_id": "Persembahan Umum",
                "description": "General church offerings",
                "description_id": "Persembahan gereja umum",
                "is_active": True,
                "display_order": 1,
                "icon": "church",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "name": "Tithe",
                "name_id": "Persepuluhan",
                "description": "Tithes (10% of income)",
                "description_id": "Persepuluhan (10% dari pendapatan)",
                "is_active": True,
                "display_order": 2,
                "icon": "heart",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "name": "Mission",
                "name_id": "Misi",
                "description": "Mission and evangelism fund",
                "description_id": "Dana misi dan penginjilan",
                "is_active": True,
                "display_order": 3,
                "icon": "globe",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            },
            {
                "id": str(uuid.uuid4()),
                "church_id": church_id,
                "name": "Building Fund",
                "name_id": "Dana Pembangunan",
                "description": "Church building and facilities",
                "description_id": "Gedung dan fasilitas gereja",
                "is_active": True,
                "display_order": 4,
                "icon": "building",
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            }
        ]

        await db.giving_funds.insert_many(default_funds)
        return default_funds

    # Remove _id before returning
    for fund in funds:
        fund.pop("_id", None)

    return funds


@router.post("/funds", response_model=GivingFund, status_code=status.HTTP_201_CREATED)
async def create_giving_fund(
    fund_data: GivingFundCreate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new giving fund (admin only)."""
    church_id = get_session_church_id(current_user)

    # Check admin role
    if current_user.get("role") not in ["admin", "super_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create giving funds"
        )

    # Create fund
    fund = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        **fund_data.dict(),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await db.giving_funds.insert_one(fund)

    fund.pop("_id", None)
    return fund


# ===========================
# GIVING TRANSACTIONS
# ===========================

@router.post("/submit", response_model=GivingPaymentIntentResponse)
async def submit_giving(
    giving_data: GivingTransactionCreate,
    request: Request,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Submit giving/offering and create payment intent.

    Flow:
    1. Validate fund exists
    2. Create transaction record (pending)
    3. Call iPaymu to create payment
    4. Return payment URL/VA/QR for member

    Used by mobile app.
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("id")

    # Validate fund exists
    fund = await db.giving_funds.find_one({
        "id": giving_data.fund_id,
        "church_id": church_id,
        "is_active": True
    })

    if not fund:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Giving fund not found or inactive"
        )

    # Get member details
    member = await db.members.find_one({"id": member_id, "church_id": church_id})

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found"
        )

    member_name = member.get("full_name", "Anonymous")
    member_phone = member.get("phone_whatsapp", "")
    member_email = member.get("email", f"{member_id}@faithflow.local")

    # Create transaction record
    transaction_id = str(uuid.uuid4())

    transaction = {
        "id": transaction_id,
        "church_id": church_id,
        "member_id": member_id,
        "member_name": member_name if not giving_data.is_anonymous else "Anonymous",
        "member_phone": member_phone,
        "fund_id": giving_data.fund_id,
        "fund_name": fund.get("name"),
        "amount": giving_data.amount,
        "currency": "IDR",
        "payment_method": giving_data.payment_method,
        "payment_status": "pending",
        "ipaymu_transaction_id": None,
        "ipaymu_session_id": None,
        "ipaymu_payment_url": None,
        "ipaymu_va_number": None,
        "ipaymu_qr_string": None,
        "notes": giving_data.notes,
        "is_anonymous": giving_data.is_anonymous,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "paid_at": None,
        "expired_at": datetime.utcnow() + timedelta(hours=24),
        "created_by": "member",
        "ip_address": request.client.host
    }

    await db.giving_transactions.insert_one(transaction)

    # Create payment with iPaymu
    ipaymu = get_ipaymu_service()

    # Build callback URLs
    base_url = request.url_for("ipaymu_callback").replace("http://", "https://")
    notify_url = str(base_url)
    return_url = f"faithflow://giving/success?transaction_id={transaction_id}"
    cancel_url = f"faithflow://giving/cancelled?transaction_id={transaction_id}"

    success, payment_data, error = await ipaymu.create_payment(
        transaction_id=transaction_id,
        member_name=member_name,
        member_phone=member_phone,
        member_email=member_email,
        amount=giving_data.amount,
        payment_method=giving_data.payment_method,
        fund_name=fund.get("name"),
        notify_url=notify_url,
        return_url=return_url,
        cancel_url=cancel_url,
        expired_duration=24
    )

    if not success:
        # Payment creation failed
        logger.error(f"iPaymu payment creation failed: {error}")

        # Update transaction status
        await db.giving_transactions.update_one(
            {"id": transaction_id},
            {
                "$set": {
                    "payment_status": "failed",
                    "updated_at": datetime.utcnow()
                }
            }
        )

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Payment gateway error: {error}"
        )

    # Update transaction with payment data
    await db.giving_transactions.update_one(
        {"id": transaction_id},
        {
            "$set": {
                "ipaymu_transaction_id": payment_data.get("transaction_id"),
                "ipaymu_session_id": payment_data.get("session_id"),
                "ipaymu_payment_url": payment_data.get("payment_url"),
                "ipaymu_va_number": payment_data.get("va_number"),
                "ipaymu_qr_string": payment_data.get("qr_string"),
                "payment_status": "processing",
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Get payment instructions
    instructions = ipaymu.get_payment_instructions(giving_data.payment_method)

    logger.info(f"Giving transaction created: {transaction_id} for member {member_id}")

    return GivingPaymentIntentResponse(
        transaction_id=transaction_id,
        payment_url=payment_data.get("payment_url"),
        va_number=payment_data.get("va_number"),
        qr_string=payment_data.get("qr_string"),
        amount=giving_data.amount,
        expired_at=transaction["expired_at"],
        payment_method=giving_data.payment_method,
        instructions=instructions
    )


@router.get("/my-history", response_model=GivingHistoryResponse)
async def get_my_giving_history(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get giving history for current member.

    Query params:
    - status_filter: Filter by payment status (success, pending, failed)
    - limit: Number of records (default 50)
    - offset: Pagination offset (default 0)
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("id")

    # Build query
    query = {
        "church_id": church_id,
        "member_id": member_id
    }

    if status_filter:
        query["payment_status"] = status_filter

    # Get transactions
    cursor = db.giving_transactions.find(query).sort("created_at", -1).skip(offset).limit(limit)
    transactions = await cursor.to_list(length=limit)

    # Get total count
    total_count = await db.giving_transactions.count_documents(query)

    # Calculate total amount (success only)
    pipeline = [
        {
            "$match": {
                "church_id": church_id,
                "member_id": member_id,
                "payment_status": "success"
            }
        },
        {
            "$group": {
                "_id": None,
                "total": {"$sum": "$amount"}
            }
        }
    ]

    total_result = await db.giving_transactions.aggregate(pipeline).to_list(1)
    total_amount = Decimal(total_result[0]["total"]) if total_result else Decimal(0)

    # Format response
    transaction_responses = []
    for txn in transactions:
        transaction_responses.append(GivingTransactionResponse(
            id=txn["id"],
            fund_name=txn["fund_name"],
            amount=txn["amount"],
            currency=txn["currency"],
            payment_method=txn["payment_method"],
            payment_status=txn["payment_status"],
            notes=txn.get("notes"),
            is_anonymous=txn.get("is_anonymous", False),
            created_at=txn["created_at"],
            paid_at=txn.get("paid_at"),
            payment_url=txn.get("ipaymu_payment_url"),
            va_number=txn.get("ipaymu_va_number"),
            qr_string=txn.get("ipaymu_qr_string")
        ))

    return GivingHistoryResponse(
        transactions=transaction_responses,
        total_count=total_count,
        total_amount=total_amount,
        currency="IDR"
    )


@router.get("/transaction/{transaction_id}", response_model=GivingTransactionResponse)
async def get_giving_transaction(
    transaction_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get single giving transaction details."""
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("id")

    transaction = await db.giving_transactions.find_one({
        "id": transaction_id,
        "church_id": church_id,
        "member_id": member_id
    })

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return GivingTransactionResponse(
        id=transaction["id"],
        fund_name=transaction["fund_name"],
        amount=transaction["amount"],
        currency=transaction["currency"],
        payment_method=transaction["payment_method"],
        payment_status=transaction["payment_status"],
        notes=transaction.get("notes"),
        is_anonymous=transaction.get("is_anonymous", False),
        created_at=transaction["created_at"],
        paid_at=transaction.get("paid_at"),
        payment_url=transaction.get("ipaymu_payment_url"),
        va_number=transaction.get("ipaymu_va_number"),
        qr_string=transaction.get("ipaymu_qr_string")
    )


# ===========================
# IPAYMU CALLBACK/WEBHOOK
# ===========================

@router.post("/ipaymu/callback")
async def ipaymu_callback(
    request: Request,
    signature: Optional[str] = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    iPaymu payment notification callback.

    Called by iPaymu when payment status changes.
    Verifies signature and updates transaction status.
    """
    try:
        # Get callback data
        callback_data = await request.json()

        logger.info(f"iPaymu callback received: {callback_data}")

        # Verify signature
        ipaymu = get_ipaymu_service()

        if signature:
            is_valid = ipaymu.verify_callback_signature(callback_data, signature)
            if not is_valid:
                logger.warning("Invalid iPaymu callback signature")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid signature"
                )

        # Extract data
        reference_id = callback_data.get("reference_id")
        ipaymu_status = callback_data.get("status")
        ipaymu_status_desc = callback_data.get("status_desc")
        paid_amount = callback_data.get("amount")

        if not reference_id:
            logger.error("No reference_id in callback")
            return {"status": "error", "message": "No reference_id"}

        # Find transaction
        transaction = await db.giving_transactions.find_one({"id": reference_id})

        if not transaction:
            logger.error(f"Transaction not found: {reference_id}")
            return {"status": "error", "message": "Transaction not found"}

        # Map iPaymu status to our status
        # iPaymu status codes: 0 = pending, 1 = success, -1 = failed, 2 = expired
        status_map = {
            "0": "pending",
            "1": "success",
            "-1": "failed",
            "2": "expired"
        }

        new_status = status_map.get(str(ipaymu_status), "pending")

        # Update transaction
        update_data = {
            "payment_status": new_status,
            "updated_at": datetime.utcnow()
        }

        if new_status == "success":
            update_data["paid_at"] = datetime.utcnow()

        await db.giving_transactions.update_one(
            {"id": reference_id},
            {"$set": update_data}
        )

        logger.info(f"Transaction {reference_id} updated to status: {new_status}")

        # TODO: Send WhatsApp notification to member
        # TODO: Record in accounting journal if success

        return {"status": "success", "message": "Callback processed"}

    except Exception as e:
        logger.error(f"iPaymu callback error: {e}")
        return {"status": "error", "message": str(e)}
