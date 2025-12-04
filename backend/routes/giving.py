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
import os

from models.giving import (
    GivingFund,
    GivingFundCreate,
    GivingFundUpdate,
    GivingTransaction,
    GivingTransactionCreate,
    GivingPaymentIntentResponse,
    GivingTransactionResponse,
    GivingHistoryResponse,
    IPaymuCallback,
    GivingConfig,
    ManualBankAccount,
)
from utils.dependencies import get_db, get_current_user, get_session_church_id
from utils.system_config import get_payment_settings
from services.payments import get_payment_provider, PaymentMethod
from services.whatsapp_service import send_whatsapp_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/giving", tags=["Giving"])


# ===========================
# GIVING CONFIGURATION
# ===========================

@router.get("/config", response_model=GivingConfig)
async def get_giving_config(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get giving configuration for current church.

    Returns payment settings, supported methods, and manual bank accounts.
    Used by mobile app to determine payment flow.
    """
    church_id = get_session_church_id(current_user)

    # Get church settings
    settings = await db.church_settings.find_one({"church_id": church_id})

    if not settings:
        # Return default config (online disabled)
        return GivingConfig(
            online_enabled=False,
            provider=None,
            supported_methods=[],
            manual_bank_accounts=[],
            currency="IDR",
            minimum_amount=Decimal("10000")
        )

    # Extract payment configuration
    online_enabled = settings.get("payment_online_enabled", False)
    provider_name = settings.get("payment_provider")
    provider_config = settings.get("payment_provider_config", {})
    manual_accounts_data = settings.get("payment_manual_bank_accounts", [])
    currency = settings.get("currency", "IDR")

    # Parse manual bank accounts
    manual_accounts = [
        ManualBankAccount(**account) for account in manual_accounts_data
    ]

    # Get supported payment methods if online enabled
    supported_methods = []
    if online_enabled and provider_name:
        try:
            # Get payment environment from system settings (with env var fallback)
            system_payment_settings = await get_payment_settings(db)
            payment_env = system_payment_settings.get("ipaymu_env", "sandbox")

            provider = get_payment_provider(
                payment_online_enabled=online_enabled,
                payment_provider=provider_name,
                payment_provider_config=provider_config,
                environment=payment_env
            )

            if provider:
                supported_methods = [method.value for method in provider.get_supported_methods()]
        except Exception as e:
            logger.error(f"Failed to get payment provider: {e}")

    return GivingConfig(
        online_enabled=online_enabled,
        provider=provider_name if online_enabled else None,
        supported_methods=supported_methods,
        manual_bank_accounts=manual_accounts,
        currency=currency,
        minimum_amount=Decimal("10000")
    )


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

    # Get church payment settings
    church_settings = await db.church_settings.find_one({"church_id": church_id})

    if not church_settings:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Church settings not found"
        )

    # Check if online payment is enabled
    online_enabled = church_settings.get("payment_online_enabled", False)

    if not online_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Online payment is disabled. Please use manual bank transfer."
        )

    # Get payment provider
    provider_name = church_settings.get("payment_provider")
    provider_config = church_settings.get("payment_provider_config", {})

    # Get payment environment from system settings (with env var fallback)
    system_payment_settings = await get_payment_settings(db)
    payment_env = system_payment_settings.get("ipaymu_env", "sandbox")

    provider = get_payment_provider(
        payment_online_enabled=online_enabled,
        payment_provider=provider_name,
        payment_provider_config=provider_config,
        environment=payment_env
    )

    if not provider:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Payment provider not configured"
        )

    # Build callback URLs
    base_url = str(request.base_url).replace("http://", "https://")
    notify_url = f"{base_url}api/giving/webhook/{provider.provider_name}"
    return_url = f"faithflow://giving/success?transaction_id={transaction_id}"
    cancel_url = f"faithflow://giving/cancelled?transaction_id={transaction_id}"

    # Map payment method string to enum
    try:
        payment_method_enum = PaymentMethod(giving_data.payment_method)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid payment method: {giving_data.payment_method}"
        )

    # Create payment
    payment_result = await provider.create_payment(
        transaction_id=transaction_id,
        customer_name=member_name,
        customer_phone=member_phone,
        customer_email=member_email,
        amount=giving_data.amount,
        payment_method=payment_method_enum,
        description=fund.get("name"),
        notify_url=notify_url,
        return_url=return_url,
        cancel_url=cancel_url,
        expired_duration=24
    )

    if not payment_result.success:
        # Payment creation failed
        logger.error(f"Payment creation failed: {payment_result.error_message}")

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
            detail=f"Payment gateway error: {payment_result.error_message}"
        )

    # Update transaction with payment data
    await db.giving_transactions.update_one(
        {"id": transaction_id},
        {
            "$set": {
                "ipaymu_transaction_id": payment_result.transaction_id,
                "ipaymu_session_id": payment_result.session_id,
                "ipaymu_payment_url": payment_result.payment_url,
                "ipaymu_va_number": payment_result.va_number,
                "ipaymu_qr_string": payment_result.qr_string,
                "payment_status": "processing",
                "updated_at": datetime.utcnow()
            }
        }
    )

    # Get payment instructions
    language = church_settings.get("default_language", "id")
    instructions = provider.get_payment_instructions(payment_method_enum, language)

    logger.info(f"Giving transaction created: {transaction_id} for member {member_id}")

    return GivingPaymentIntentResponse(
        transaction_id=transaction_id,
        payment_url=payment_result.payment_url,
        va_number=payment_result.va_number,
        qr_string=payment_result.qr_string,
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


# Alias for mobile app compatibility
@router.get("/history", response_model=GivingHistoryResponse)
async def get_giving_history_alias(
    status_filter: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Alias for /my-history - Mobile app compatibility."""
    return await get_my_giving_history(status_filter, limit, offset, current_user, db)


@router.get("/summary")
async def get_giving_summary(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get giving summary for current member.

    Returns total giving, this month, this year, and recent transactions count.
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("id")

    now = datetime.utcnow()
    start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    start_of_year = now.replace(month=1, day=1, hour=0, minute=0, second=0, microsecond=0)

    # Base query for successful transactions
    base_query = {
        "church_id": church_id,
        "member_id": member_id,
        "payment_status": "success"
    }

    # Total all time
    total_pipeline = [
        {"$match": base_query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}, "count": {"$sum": 1}}}
    ]
    total_result = await db.giving_transactions.aggregate(total_pipeline).to_list(1)
    total_amount = float(total_result[0]["total"]) if total_result else 0
    total_count = total_result[0]["count"] if total_result else 0

    # This month
    month_query = {**base_query, "created_at": {"$gte": start_of_month}}
    month_pipeline = [
        {"$match": month_query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    month_result = await db.giving_transactions.aggregate(month_pipeline).to_list(1)
    month_amount = float(month_result[0]["total"]) if month_result else 0

    # This year
    year_query = {**base_query, "created_at": {"$gte": start_of_year}}
    year_pipeline = [
        {"$match": year_query},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]
    year_result = await db.giving_transactions.aggregate(year_pipeline).to_list(1)
    year_amount = float(year_result[0]["total"]) if year_result else 0

    return {
        "total_amount": total_amount,
        "total_count": total_count,
        "this_month": month_amount,
        "this_year": year_amount,
        "currency": "IDR"
    }


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
# PAYMENT WEBHOOK
# ===========================

@router.post("/webhook/{provider_name}")
async def payment_webhook(
    provider_name: str,
    request: Request,
    signature: Optional[str] = Header(None),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Payment provider webhook/callback.

    Called by payment gateway when payment status changes.
    Supports multiple providers through abstraction layer.
    """
    try:
        # Get callback data
        callback_data = await request.json()

        logger.info(f"{provider_name} webhook received: {callback_data}")

        # Get church from transaction (we need to look up church settings)
        # First, extract reference_id from callback to find the transaction
        reference_id = callback_data.get("reference_id") or callback_data.get("referenceId")

        if not reference_id:
            logger.error("No reference_id in webhook")
            return {"status": "error", "message": "No reference_id"}

        # Find transaction to get church_id
        transaction = await db.giving_transactions.find_one({"id": reference_id})

        if not transaction:
            logger.error(f"Transaction not found: {reference_id}")
            return {"status": "error", "message": "Transaction not found"}

        church_id = transaction.get("church_id")

        # Get church settings to initialize provider
        church_settings = await db.church_settings.find_one({"church_id": church_id})

        if not church_settings:
            logger.error(f"Church settings not found for {church_id}")
            return {"status": "error", "message": "Church settings not found"}

        # Get payment provider
        provider_config = church_settings.get("payment_provider_config", {})

        provider = get_payment_provider(
            payment_online_enabled=True,
            payment_provider=provider_name,
            payment_provider_config=provider_config,
            environment="production"
        )

        if not provider:
            logger.error(f"Payment provider {provider_name} not configured")
            return {"status": "error", "message": "Provider not configured"}

        # Verify signature if provided
        if signature:
            is_valid = provider.verify_webhook_signature(callback_data, signature)
            if not is_valid:
                logger.warning(f"Invalid {provider_name} webhook signature")
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid signature"
                )

        # Parse webhook payload into standardized format
        parsed_data = provider.parse_webhook_payload(callback_data)

        # Extract standardized data
        reference_id = parsed_data.get("reference_id")
        payment_status = parsed_data.get("status")
        amount = parsed_data.get("amount")

        # Update transaction
        update_data = {
            "payment_status": payment_status.value if hasattr(payment_status, "value") else str(payment_status),
            "updated_at": datetime.utcnow()
        }

        if payment_status.value == "success":
            update_data["paid_at"] = datetime.utcnow()

        await db.giving_transactions.update_one(
            {"id": reference_id},
            {"$set": update_data}
        )

        logger.info(f"Transaction {reference_id} updated to status: {payment_status}")

        # Send WhatsApp notification to member on successful payment
        if payment_status.value == "success":
            try:
                await _send_giving_confirmation_whatsapp(
                    db=db,
                    transaction=transaction,
                    amount=amount,
                    church_id=church_id
                )
            except Exception as e:
                logger.error(f"Failed to send WhatsApp notification: {e}")
                # Don't fail webhook - notification is non-critical

            # Record in accounting journal
            try:
                await _record_giving_in_accounting(
                    db=db,
                    transaction=transaction,
                    amount=amount,
                    church_id=church_id
                )
            except Exception as e:
                logger.error(f"Failed to record in accounting: {e}")
                # Don't fail webhook - accounting is non-critical
                # Admin can manually reconcile

        return {"status": "success", "message": "Webhook processed"}

    except Exception as e:
        logger.error(f"{provider_name} webhook error: {e}")
        return {"status": "error", "message": str(e)}


# ===========================
# HELPER FUNCTIONS
# ===========================

async def _send_giving_confirmation_whatsapp(
    db: AsyncIOMotorDatabase,
    transaction: dict,
    amount: float,
    church_id: str
) -> None:
    """
    Send WhatsApp confirmation message to member after successful giving.
    """
    member_phone = transaction.get("member_phone")
    if not member_phone:
        logger.warning(f"No phone number for transaction {transaction['id']}")
        return

    # Get church name
    church = await db.churches.find_one({"id": church_id})
    church_name = church.get("name", "Gereja Anda") if church else "Gereja Anda"

    # Format amount with Indonesian formatting
    amount_formatted = f"Rp {int(amount):,}".replace(",", ".")

    # Build confirmation message (Indonesian)
    message = f"""
✅ *{church_name} - Konfirmasi Persembahan*

Shalom {transaction.get('member_name', 'Saudara/i')}! 🙏

Persembahan Anda telah berhasil diterima:

📋 *Detail Persembahan:*
• Dana: {transaction.get('fund_name', 'Persembahan')}
• Jumlah: {amount_formatted}
• Metode: {transaction.get('payment_method', 'Online').upper()}
• ID Transaksi: {transaction.get('id', '')[:8]}...

Terima kasih atas kemurahan hati Anda. Tuhan memberkati!

_"Setiap orang hendaklah memberikan menurut kerelaan hatinya, jangan dengan sedih hati atau karena paksaan, sebab Allah mengasihi orang yang memberi dengan sukacita."_ - 2 Korintus 9:7

---
{church_name}
""".strip()

    try:
        await send_whatsapp_message(phone_number=member_phone, message=message)
        logger.info(f"WhatsApp confirmation sent for transaction {transaction['id']}")
    except Exception as e:
        logger.error(f"Failed to send WhatsApp for {transaction['id']}: {e}")
        raise


async def _record_giving_in_accounting(
    db: AsyncIOMotorDatabase,
    transaction: dict,
    amount: float,
    church_id: str
) -> None:
    """
    Record successful giving transaction in the accounting journal.

    Creates a simple journal entry:
    - Debit: Bank/Cash account (asset increases)
    - Credit: Giving Income account (revenue increases)
    """
    import uuid as uuid_module
    from datetime import date as date_type

    # Get church accounting settings
    settings = await db.church_settings.find_one({"church_id": church_id})
    if not settings:
        logger.warning(f"No church settings for {church_id}, skipping accounting")
        return

    # Get or use default account codes
    # These should be configured in church settings or use standard codes
    bank_account_code = settings.get("giving_bank_account_code", "1101")  # Default: Bank account
    income_account_code = settings.get("giving_income_account_code", "4101")  # Default: Giving Income

    # Create journal entry
    journal_id = str(uuid_module.uuid4())
    today = date_type.today()

    # Generate journal number (simple format for giving)
    journal_number = f"GV-{today.strftime('%Y%m%d')}-{transaction['id'][:6].upper()}"

    journal_entry = {
        "id": journal_id,
        "church_id": church_id,
        "journal_number": journal_number,
        "date": today.isoformat(),
        "description": f"Persembahan online - {transaction.get('fund_name', 'General')} - {transaction.get('member_name', 'Anonymous')}",
        "journal_type": "revenue",
        "status": "posted",  # Auto-post giving entries
        "lines": [
            {
                "account_code": bank_account_code,
                "account_name": "Bank",
                "description": f"Penerimaan via {transaction.get('payment_method', 'Online').upper()}",
                "debit": float(amount),
                "credit": 0.0,
            },
            {
                "account_code": income_account_code,
                "account_name": "Pendapatan Persembahan",
                "description": transaction.get('fund_name', 'Persembahan'),
                "debit": 0.0,
                "credit": float(amount),
            }
        ],
        "total_debit": float(amount),
        "total_credit": float(amount),
        "reference_type": "giving",
        "reference_id": transaction.get("id"),
        "created_by": "system",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    try:
        await db.journals.insert_one(journal_entry)
        logger.info(f"Accounting journal created for giving {transaction['id']}: {journal_number}")
    except Exception as e:
        logger.error(f"Failed to create accounting journal: {e}")
        raise
