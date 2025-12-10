"""Kiosk backend endpoints - OTP, member lookup, event registration, etc."""

from fastapi import APIRouter, Depends, HTTPException, status, Query, BackgroundTasks
from motor.motor_asyncio import AsyncIOMotorDatabase
from pymongo.errors import DuplicateKeyError
from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime, timedelta, timezone
import asyncio
import uuid
import random
import json
import logging
import traceback

from utils.dependencies import get_db
from services.whatsapp_service import send_whatsapp_message
from services.explore.prayer_intelligence_service import get_prayer_intelligence_service
from services.redis.checkin_cache import (
    is_checked_in,
    mark_checked_in,
    cache_rsvp,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kiosk", tags=["Kiosk"])

# OTP Configuration - SECURITY: 6-digit codes with 3-minute expiry
OTP_LENGTH = 6  # 6-digit OTP (1,000,000 combinations vs 10,000 for 4-digit)
OTP_TTL_SECONDS = 180  # 3 minutes (reduced from 5 for better security)
OTP_MAX_ATTEMPTS = 5
OTP_RATE_LIMIT_WINDOW = 300  # 5 minutes
OTP_RATE_LIMIT_MAX = 3  # Max 3 OTPs per phone per window


async def _get_redis():
    """Get Redis connection for OTP storage."""
    try:
        from config.redis import get_redis
        return await get_redis()
    except Exception as e:
        logger.warning(f"Redis unavailable for OTP: {e}")
        return None


def _otp_key(phone: str) -> str:
    """Generate Redis key for OTP."""
    return f"faithflow:otp:{phone}"

class OTPSendRequest(BaseModel):
    phone: str

class OTPVerifyRequest(BaseModel):
    phone: str
    code: str

class PINVerifyRequest(BaseModel):
    pin: str


def _otp_rate_key(phone: str) -> str:
    """Generate Redis key for OTP rate limiting."""
    return f"faithflow:otp_rate:{phone}"


@router.post("/send-otp")
async def send_otp(
    request: OTPSendRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send OTP to phone via WhatsApp."""
    try:
        phone = request.phone

        # Rate limit OTP sends to prevent SMS flooding
        redis = await _get_redis()
        if redis:
            rate_key = _otp_rate_key(phone)
            current_count = await redis.get(rate_key)
            if current_count and int(current_count) >= OTP_RATE_LIMIT_MAX:
                logger.warning(f"OTP rate limit exceeded for {phone}")
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Terlalu banyak permintaan OTP. Coba lagi dalam {OTP_RATE_LIMIT_WINDOW // 60} menit."
                )
            # Increment rate counter
            pipe = redis.pipeline()
            pipe.incr(rate_key)
            pipe.expire(rate_key, OTP_RATE_LIMIT_WINDOW)
            await pipe.execute()

        # Generate 6-digit OTP (cryptographically secure)
        import secrets
        code = ''.join(secrets.choice('0123456789') for _ in range(OTP_LENGTH))

        # Store OTP in Redis with TTL (auto-expires, O(1) lookup)
        redis = await _get_redis()
        otp_data = {
            "code": code,
            "attempts": 0,
            "created_at": datetime.utcnow().isoformat()
        }

        if redis:
            otp_key = _otp_key(phone)
            await redis.set(otp_key, json.dumps(otp_data), ex=OTP_TTL_SECONDS)
            logger.info(f"🔐 OTP for {phone}: {code} (Redis, expires in {OTP_TTL_SECONDS}s)")
        else:
            # Fallback to MongoDB if Redis unavailable
            expires_at = datetime.utcnow() + timedelta(seconds=OTP_TTL_SECONDS)
            await db.otp_codes.update_one(
                {"phone": phone},
                {"$set": {"phone": phone, "code": code, "expires_at": expires_at, "attempts": 0, "created_at": datetime.utcnow()}},
                upsert=True
            )
            logger.info(f"🔐 OTP for {phone}: {code} (MongoDB fallback)")

        # Get WhatsApp config from SYSTEM SETTINGS (global, configured in Integrations)
        from utils.system_config import get_whatsapp_settings
        wa_settings = await get_whatsapp_settings(db)

        whatsapp_url = (wa_settings.get('whatsapp_api_url') or '').strip()
        whatsapp_user = (wa_settings.get('whatsapp_username') or '').strip()
        whatsapp_pass = (wa_settings.get('whatsapp_password') or '').strip()
        whatsapp_enabled = wa_settings.get('whatsapp_enabled', True)


        # Send via WhatsApp if enabled and URL is configured
        if whatsapp_enabled and whatsapp_url:
            whatsapp_phone = phone.replace('+', '')  # Remove + for gateway
            message = f"Kode verifikasi Anda adalah: {code}. Kode ini berlaku selama {OTP_TTL_SECONDS // 60} menit."


            try:
                whatsapp_result = await send_whatsapp_message(
                    whatsapp_phone,
                    message,
                    api_url=whatsapp_url,
                    api_username=whatsapp_user if whatsapp_user else None,
                    api_password=whatsapp_pass if whatsapp_pass else None
                )


                if whatsapp_result.get('success'):
                    logger.info(f"✅ WhatsApp OTP sent successfully to {phone}")
                else:
                    logger.warning(f"⚠️ WhatsApp failed: {whatsapp_result.get('message')}")

                return {
                    "success": True,
                    "message": "OTP sent successfully",
                    "whatsapp_status": whatsapp_result.get('delivery_status', 'unknown'),
                    "whatsapp_sent": whatsapp_result.get('success', False),
                    "expires_in_seconds": OTP_TTL_SECONDS
                }
            except Exception as wa_error:
                logger.error(f"⚠️ WhatsApp error: {wa_error}")
                logger.error(f"⚠️ WhatsApp full traceback:\n{traceback.format_exc()}")
        else:
            logger.info("WhatsApp not enabled or URL not configured")

        return {
            "success": True,
            "message": "OTP generated (WhatsApp not configured)",
            "whatsapp_sent": False,
            "expires_in_seconds": OTP_TTL_SECONDS
        }
    
    except Exception as e:
        logger.error(f"❌ Error sending OTP: {e}")
        logger.error(f"❌ Full traceback:\n{traceback.format_exc()}")
        # Still return success with console OTP
        # Generate 6-digit OTP for fallback case
        if 'code' not in locals():
            import secrets
            code = ''.join(secrets.choice('0123456789') for _ in range(OTP_LENGTH))
        return {
            "success": True,
            "message": "OTP generated (error occurred)",
            "whatsapp_sent": False,
            "expires_in_seconds": OTP_TTL_SECONDS
        }


@router.post("/verify-otp")
async def verify_otp(
    request: OTPVerifyRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Verify OTP code.

    Uses atomic operations to prevent race conditions:
    - Redis: Lua script for atomic verify-and-delete
    - MongoDB: findOneAndDelete for atomic verification
    """
    try:
        phone = request.phone
        code = request.code

        # Try Redis first with atomic verification
        redis = await _get_redis()
        otp_doc = None
        verified_atomically = False

        if redis:
            otp_key = _otp_key(phone)

            # Lua script for atomic OTP verification
            # Returns: 1=success, 0=wrong_code, -1=not_found, -2=expired, -3=too_many_attempts
            verify_lua = """
            local data = redis.call('GET', KEYS[1])
            if not data then
                return {-1, ''}
            end

            local otp = cjson.decode(data)
            local stored_code = otp.code
            local attempts = otp.attempts or 0

            -- Check attempts limit
            if attempts >= tonumber(ARGV[2]) then
                redis.call('DEL', KEYS[1])
                return {-3, ''}
            end

            -- Verify code
            if stored_code == ARGV[1] then
                -- Success - delete atomically
                redis.call('DEL', KEYS[1])
                return {1, ''}
            else
                -- Wrong code - increment attempts atomically
                otp.attempts = attempts + 1
                local ttl = redis.call('TTL', KEYS[1])
                if ttl > 0 then
                    redis.call('SET', KEYS[1], cjson.encode(otp), 'EX', ttl)
                end
                return {0, tostring(otp.attempts)}
            end
            """

            try:
                result = await redis.eval(verify_lua, 1, otp_key, code, str(OTP_MAX_ATTEMPTS))
                status_code = int(result[0])

                if status_code == 1:
                    # Success - OTP verified and deleted atomically
                    await db.otp_codes.delete_one({"phone": phone})  # Clean up MongoDB backup too
                    return {"success": True, "message": "OTP verified"}
                elif status_code == 0:
                    # Wrong code
                    return {"success": False, "message": "Invalid OTP"}
                elif status_code == -3:
                    # Too many attempts
                    await db.otp_codes.delete_one({"phone": phone})
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail={"error_code": "TOO_MANY_ATTEMPTS", "message": "Too many attempts. Please request a new code."}
                    )
                # -1 means not found in Redis, fall through to MongoDB
                verified_atomically = (status_code != -1)
            except Exception as lua_error:
                logger.warning(f"Redis Lua script failed, falling back to MongoDB: {lua_error}")
                # Fall through to MongoDB

            if not verified_atomically:
                otp_data = await redis.get(otp_key)
                if otp_data:
                    otp_doc = json.loads(otp_data)
                    otp_doc["_source"] = "redis"
                else:
                    logger.debug(f"No OTP found in Redis for {phone}")

        # Fallback to MongoDB if not in Redis (or if Redis verification returned not found)
        if not otp_doc and not verified_atomically:
            # Use atomic findOneAndDelete for verification to prevent race conditions
            # First check if OTP exists and is valid
            mongo_doc = await db.otp_codes.find_one({"phone": phone})

            if not mongo_doc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error_code": "OTP_NOT_FOUND", "message": "No OTP found. Please request a new code."}
                )

            # Check expiry
            if datetime.utcnow() > mongo_doc['expires_at']:
                await db.otp_codes.delete_one({"phone": phone})
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error_code": "OTP_EXPIRED", "message": "OTP expired. Please request a new code."}
                )

            # Check attempts
            if mongo_doc['attempts'] >= OTP_MAX_ATTEMPTS:
                await db.otp_codes.delete_one({"phone": phone})
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error_code": "TOO_MANY_ATTEMPTS", "message": "Too many attempts. Please request a new code."}
                )

            # Verify code
            if mongo_doc['code'] != code:
                # Wrong code - increment attempts atomically
                await db.otp_codes.update_one({"phone": phone}, {"$inc": {"attempts": 1}})
                return {"success": False, "message": "Invalid OTP"}

            # Correct code - use atomic findOneAndDelete to prevent race conditions
            # This ensures only one concurrent request can successfully verify
            deleted_doc = await db.otp_codes.find_one_and_delete({
                "phone": phone,
                "code": code  # Must match both phone AND code for atomic verification
            })

            if deleted_doc:
                # Successfully deleted - we won the race
                return {"success": True, "message": "OTP verified"}
            else:
                # Another request already verified this OTP
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail={"error_code": "OTP_ALREADY_USED", "message": "OTP already used. Please request a new code."}
                )

        # If we reached here with no otp_doc and verified_atomically is False, something went wrong
        if not otp_doc and not verified_atomically:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "OTP_NOT_FOUND", "message": "No OTP found. Please request a new code."}
            )

        # If Redis verification already handled the request, we won't reach here
        # But just in case there's a code path issue:
        return {"success": True, "message": "OTP verified"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify OTP")


@router.post("/verify-pin")
async def verify_staff_pin(
    request: PINVerifyRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Verify staff PIN for kiosk access.

    PIN lookup priority:
    1. First, look for user in the selected church with matching PIN
    2. Then, look for super_admin (church_id=None) with matching PIN

    This ensures PINs are effectively unique per church.
    """
    try:
        # First, try to find a user in this specific church with this PIN
        user = await db.users.find_one({
            "kiosk_pin": request.pin,
            "church_id": church_id,
            "is_active": True
        }, {"_id": 0, "id": 1, "full_name": 1, "role": 1, "church_id": 1})

        # If not found in church, check for super_admin (who has church_id=None)
        if not user:
            user = await db.users.find_one({
                "kiosk_pin": request.pin,
                "role": "super_admin",
                "church_id": None,
                "is_active": True
            }, {"_id": 0, "id": 1, "full_name": 1, "role": 1, "church_id": 1})

        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_PIN", "message": "Invalid PIN"}
            )
        
        return {
            "success": True,
            "user": {
                "id": user['id'],
                "full_name": user['full_name'],
                "role": user['role']
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying PIN: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal error"
        )


class EventRSVPRequest(BaseModel):
    event_id: str
    member_id: str


# =============================================================================
# GROUP REGISTRATION MODELS
# =============================================================================

class CompanionRegistration(BaseModel):
    """A companion to register alongside the primary member."""
    type: Literal["existing", "new"]
    # For existing members
    member_id: Optional[str] = None
    # For new guests
    full_name: Optional[str] = None
    phone: Optional[str] = None  # Optional - for WhatsApp ticket
    gender: Optional[str] = None  # Optional
    date_of_birth: Optional[str] = None  # Optional


class GroupRegistrationRequest(BaseModel):
    """Request to register multiple people for an event."""
    event_id: str
    church_id: str
    primary_member_id: str  # The verified member who initiated
    include_self: bool = True  # Whether primary registers themselves
    companions: List[CompanionRegistration] = []


class TicketResponse(BaseModel):
    """A single ticket for a registered attendee."""
    member_id: str
    member_name: str
    phone: Optional[str] = None
    confirmation_code: str
    qr_code: str  # Base64 PNG
    qr_data: str
    is_primary: bool
    is_new_member: bool
    whatsapp_status: str  # "sent" | "pending" | "no_phone" | "failed" | "sending"


class GroupRegistrationResponse(BaseModel):
    """Response from group registration."""
    success: bool
    event_id: str
    event_name: str
    event_date: Optional[str] = None
    location: Optional[str] = None
    start_time: Optional[str] = None
    total_registered: int
    tickets: List[TicketResponse]
    duplicates: List[dict] = []  # Already registered members
    errors: List[dict] = []  # Any failures


@router.post("/register-event")
async def register_event_kiosk(
    request: EventRSVPRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Register for event from kiosk (public - no auth)."""
    try:
        from services.qr_service import generate_confirmation_code, generate_rsvp_qr_data
        
        event = await db.events.find_one({"id": request.event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")
        
        member = await db.members.find_one({"id": request.member_id})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        # Check duplicate
        duplicate = any(r.get('member_id') == request.member_id for r in event.get('rsvp_list', []))
        if duplicate:
            return {"success": True, "message": "Already registered"}
        
        # Generate confirmation
        confirmation_code = generate_confirmation_code()
        qr_result = generate_rsvp_qr_data(request.event_id, request.member_id, '', confirmation_code)

        rsvp_entry = {
            "member_id": request.member_id,
            "member_name": member.get("full_name"),
            "session_id": None,
            "seat": None,
            "timestamp": datetime.utcnow(),
            "status": "registered",
            "confirmation_code": confirmation_code,
            "qr_code": qr_result.get("qr_code"),
            "qr_data": qr_result.get("qr_data"),
            "source": "kiosk"
        }
        
        await db.events.update_one(
            {"id": request.event_id},
            {"$push": {"rsvp_list": rsvp_entry}}
        )
        
        logger.info(f"Kiosk RSVP: Event {request.event_id}, Member {request.member_id}")
        
        return {"success": True, "message": "Registered successfully"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kiosk event registration error: {e}")
        raise HTTPException(status_code=500, detail="Registration failed")


# =============================================================================
# GROUP REGISTRATION ENDPOINT
# =============================================================================

def _format_event_date(date_str: str) -> str:
    """Format event date for human-readable display."""
    if not date_str:
        return ''
    try:
        # Handle ISO strings like "2025-12-06T00:00:00"
        if isinstance(date_str, str):
            if 'T' in date_str:
                date_str = date_str.split('T')[0]
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            # Format as "Saturday, December 6, 2025" / "Sabtu, 6 Desember 2025"
            return dt.strftime('%A, %B %d, %Y')
        elif isinstance(date_str, datetime):
            return date_str.strftime('%A, %B %d, %Y')
    except Exception:
        pass
    return date_str


async def _send_ticket_whatsapp(
    db: AsyncIOMotorDatabase,
    phone: str,
    member_name: str,
    event_name: str,
    event_date: str,
    location: str,
    start_time: str,
    confirmation_code: str,
    qr_code: str
) -> str:
    """Send event ticket via WhatsApp. Returns status string."""
    if not phone:
        return "no_phone"

    try:
        from utils.system_config import get_whatsapp_settings
        from services.whatsapp_service import send_whatsapp_message

        wa_settings = await get_whatsapp_settings(db)
        whatsapp_url = (wa_settings.get('whatsapp_api_url') or '').strip()
        whatsapp_user = (wa_settings.get('whatsapp_username') or '').strip()
        whatsapp_pass = (wa_settings.get('whatsapp_password') or '').strip()
        whatsapp_enabled = wa_settings.get('whatsapp_enabled', True)

        if not whatsapp_enabled or not whatsapp_url:
            logger.info(f"WhatsApp not enabled or configured for ticket send")
            return "not_configured"

        # Format date for display
        formatted_date = _format_event_date(event_date)

        # Format time - remove T if present
        formatted_time = start_time
        if start_time and 'T' in start_time:
            try:
                dt = datetime.fromisoformat(start_time.replace('Z', '+00:00'))
                formatted_time = dt.strftime('%I:%M %p')  # e.g., "09:00 AM"
            except Exception:
                formatted_time = start_time

        # Format message
        message = f"""🎫 Tiket Acara / Event Ticket

Halo {member_name},

Pendaftaran Anda telah dikonfirmasi!
Your registration is confirmed!

📅 Acara: {event_name}
📆 Tanggal: {formatted_date}
🕐 Waktu: {formatted_time or 'Lihat detail acara'}
📍 Lokasi: {location or 'Lihat detail acara'}

🔑 Kode Konfirmasi: {confirmation_code}

Tunjukkan QR code di atas saat check-in.
Show the QR code above at check-in.

Sampai jumpa! 🙏
"""

        # Clean phone number
        clean_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
        if clean_phone.startswith('0'):
            clean_phone = '62' + clean_phone[1:]

        result = await send_whatsapp_message(
            clean_phone,
            message,
            image_base64=qr_code,
            api_url=whatsapp_url,
            api_username=whatsapp_user if whatsapp_user else None,
            api_password=whatsapp_pass if whatsapp_pass else None
        )

        if result.get('success'):
            logger.info(f"✅ Ticket sent via WhatsApp to {phone}")
            return "sent"
        else:
            logger.warning(f"⚠️ WhatsApp ticket send failed: {result.get('message')}")
            return "failed"

    except Exception as e:
        logger.error(f"Error sending WhatsApp ticket: {e}")
        return "failed"


def _send_whatsapp_tickets_background(
    tickets_data: list,
    event_id: str,
    mongo_url: str,
    db_name: str
):
    """Background task to send WhatsApp tickets and update DB status.

    This runs in a separate thread, so we need to create a new MongoDB connection.
    """
    import asyncio
    from motor.motor_asyncio import AsyncIOMotorClient

    async def _do_send():
        # Create new MongoDB connection for this background task
        client = AsyncIOMotorClient(mongo_url)
        db = client[db_name]

        try:
            for ticket_info in tickets_data:
                try:
                    status = await _send_ticket_whatsapp(
                        db,
                        ticket_info['phone'],
                        ticket_info['member_name'],
                        ticket_info['event_name'],
                        ticket_info['event_date'],
                        ticket_info['location'],
                        ticket_info['start_time'],
                        ticket_info['confirmation_code'],
                        ticket_info['qr_code']
                    )

                    # Update the RSVP entry in database with actual status
                    await db.events.update_one(
                        {
                            "id": event_id,
                            "rsvp_list.member_id": ticket_info['member_id'],
                            "rsvp_list.confirmation_code": ticket_info['confirmation_code']
                        },
                        {"$set": {"rsvp_list.$.whatsapp_status": status}}
                    )
                    logger.info(f"✅ Background: WhatsApp status '{status}' for {ticket_info['member_name']}")

                except Exception as e:
                    logger.error(f"Background WhatsApp error for {ticket_info['member_name']}: {e}")
                    # Update status to failed
                    try:
                        await db.events.update_one(
                            {
                                "id": event_id,
                                "rsvp_list.member_id": ticket_info['member_id'],
                                "rsvp_list.confirmation_code": ticket_info['confirmation_code']
                            },
                            {"$set": {"rsvp_list.$.whatsapp_status": "failed"}}
                        )
                    except Exception:
                        pass
        finally:
            client.close()

    # Run the async function in a new event loop
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    try:
        loop.run_until_complete(_do_send())
    finally:
        loop.close()


@router.post("/register-group", response_model=GroupRegistrationResponse)
async def register_group_kiosk(
    request: GroupRegistrationRequest,
    background_tasks: BackgroundTasks,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Register a group (primary member + companions) for an event.

    This endpoint allows a verified member to register themselves and/or
    companions for an event in a single request. Companions can be existing
    members or new guests (who will be created as Pre-Visitors).

    WhatsApp tickets are sent in the background for fast response.
    """
    try:
        from services.qr_service import generate_confirmation_code, generate_rsvp_qr_data

        # 1. Validate event
        event = await db.events.find_one({"id": request.event_id, "church_id": request.church_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        if not event.get("is_active", True):
            raise HTTPException(status_code=400, detail="Event is not active")

        # 2. Validate primary member
        primary_member = await db.members.find_one({
            "id": request.primary_member_id,
            "church_id": request.church_id
        })
        if not primary_member:
            raise HTTPException(status_code=404, detail="Primary member not found")

        # 3. Get existing RSVP member IDs for duplicate checking
        existing_rsvp_ids = {
            r.get('member_id') for r in event.get('rsvp_list', [])
        }

        # 4. Process registrations
        tickets = []
        duplicates = []
        errors = []
        rsvp_entries = []
        whatsapp_tasks = []

        # Event details for tickets
        event_name = event.get('name', 'Event')
        event_date = event.get('event_date', '')
        if isinstance(event_date, datetime):
            event_date = event_date.strftime('%Y-%m-%d')
        location = event.get('location', '')
        start_time = event.get('start_time', '')

        # Check WhatsApp configuration upfront to set correct initial status
        from utils.system_config import get_whatsapp_settings
        wa_settings = await get_whatsapp_settings(db)
        whatsapp_configured = bool(
            wa_settings.get('whatsapp_enabled', True) and
            (wa_settings.get('whatsapp_api_url') or '').strip()
        )

        def get_initial_whatsapp_status(phone: str) -> str:
            """Get initial WhatsApp status based on configuration."""
            if not phone:
                return "no_phone"
            if not whatsapp_configured:
                return "not_configured"
            return "sending"  # Will be updated after actual send

        # 4a. Register primary member if include_self
        logger.info(f"Group registration: include_self={request.include_self}, primary_member_id={request.primary_member_id}")
        if request.include_self:
            if request.primary_member_id in existing_rsvp_ids:
                duplicates.append({
                    "member_id": request.primary_member_id,
                    "member_name": primary_member.get("full_name"),
                    "reason": "Already registered"
                })
            else:
                confirmation_code = generate_confirmation_code()
                qr_result = generate_rsvp_qr_data(
                    request.event_id,
                    request.primary_member_id,
                    '',
                    confirmation_code
                )

                phone = primary_member.get("phone_whatsapp")
                photo_url = primary_member.get("photo_url") or primary_member.get("photo_thumbnail_url")
                rsvp_entry = {
                    "member_id": request.primary_member_id,
                    "member_name": primary_member.get("full_name"),
                    "phone": phone,
                    "photo_url": photo_url,
                    "session_id": None,
                    "seat": None,
                    "timestamp": datetime.utcnow(),
                    "status": "registered",
                    "confirmation_code": confirmation_code,
                    "qr_code": qr_result.get("qr_code"),
                    "qr_data": qr_result.get("qr_data"),
                    "whatsapp_status": get_initial_whatsapp_status(phone),
                    "source": "kiosk_group",
                    "registered_by": request.primary_member_id,
                    "is_primary": True
                }
                rsvp_entries.append(rsvp_entry)
                existing_rsvp_ids.add(request.primary_member_id)
                primary_ticket = TicketResponse(
                    member_id=request.primary_member_id,
                    member_name=primary_member.get("full_name"),
                    phone=phone,
                    confirmation_code=confirmation_code,
                    qr_code=qr_result.get("qr_code"),
                    qr_data=qr_result.get("qr_data"),
                    is_primary=True,
                    is_new_member=False,
                    whatsapp_status=get_initial_whatsapp_status(phone)
                )
                tickets.append(primary_ticket)
                logger.info(f"Created primary ticket for {primary_member.get('full_name')}, confirmation_code={confirmation_code}")

        # 4b. Process companions
        for idx, companion in enumerate(request.companions):
            try:
                member_id = None
                member_name = None
                member_phone = None
                member_photo = None
                is_new = False

                if companion.type == "existing":
                    # Lookup existing member
                    if not companion.member_id:
                        errors.append({
                            "index": idx,
                            "type": "existing",
                            "reason": "member_id required for existing companion"
                        })
                        continue

                    existing_member = await db.members.find_one({
                        "id": companion.member_id,
                        "church_id": request.church_id
                    })
                    if not existing_member:
                        errors.append({
                            "index": idx,
                            "type": "existing",
                            "member_id": companion.member_id,
                            "reason": "Member not found"
                        })
                        continue

                    member_id = companion.member_id
                    member_name = existing_member.get("full_name")
                    member_phone = existing_member.get("phone_whatsapp")
                    member_photo = existing_member.get("photo_url") or existing_member.get("photo_thumbnail_url")

                elif companion.type == "new":
                    # Create new Pre-Visitor
                    if not companion.full_name:
                        errors.append({
                            "index": idx,
                            "type": "new",
                            "reason": "full_name required for new guest"
                        })
                        continue

                    # Check if phone already exists (to prevent duplicates)
                    if companion.phone:
                        clean_phone = companion.phone.replace('+', '').replace('-', '').replace(' ', '')
                        phone_variations = [
                            companion.phone,
                            clean_phone,
                            f"+{clean_phone}",
                        ]
                        if clean_phone.startswith('0'):
                            phone_variations.append('62' + clean_phone[1:])
                            phone_variations.append('+62' + clean_phone[1:])

                        existing_by_phone = await db.members.find_one({
                            "church_id": request.church_id,
                            "phone_whatsapp": {"$in": phone_variations},
                            "is_deleted": {"$ne": True}
                        })

                        if existing_by_phone:
                            # Use existing member instead of creating new
                            member_id = existing_by_phone.get("id")
                            member_name = existing_by_phone.get("full_name")
                            member_phone = existing_by_phone.get("phone_whatsapp")
                            member_photo = existing_by_phone.get("photo_url") or existing_by_phone.get("photo_thumbnail_url")
                            logger.info(f"Found existing member by phone: {member_name}")
                        else:
                            # Create new member
                            member_id = str(uuid.uuid4())
                            member_name = companion.full_name
                            member_phone = companion.phone
                            is_new = True

                            new_member = {
                                "id": member_id,
                                "church_id": request.church_id,
                                "full_name": companion.full_name,
                                "phone_whatsapp": companion.phone,
                                "gender": companion.gender.capitalize() if companion.gender else None,
                                "date_of_birth": companion.date_of_birth,
                                "member_status": "Pre-Visitor",
                                "created_at": datetime.utcnow(),
                                "updated_at": datetime.utcnow(),
                                "source": "kiosk_companion",
                                "registered_by_member_id": request.primary_member_id
                            }
                            await db.members.insert_one(new_member)
                            logger.info(f"Created new companion: {member_name}")
                    else:
                        # No phone - just create new member
                        member_id = str(uuid.uuid4())
                        member_name = companion.full_name
                        member_phone = None
                        is_new = True

                        new_member = {
                            "id": member_id,
                            "church_id": request.church_id,
                            "full_name": companion.full_name,
                            "gender": companion.gender.capitalize() if companion.gender else None,
                            "date_of_birth": companion.date_of_birth,
                            "member_status": "Pre-Visitor",
                            "created_at": datetime.utcnow(),
                            "updated_at": datetime.utcnow(),
                            "source": "kiosk_companion",
                            "registered_by_member_id": request.primary_member_id
                        }
                        await db.members.insert_one(new_member)
                        logger.info(f"Created new companion (no phone): {member_name}")

                # Check for duplicate registration
                if member_id in existing_rsvp_ids:
                    duplicates.append({
                        "member_id": member_id,
                        "member_name": member_name,
                        "reason": "Already registered"
                    })
                    continue

                # Generate ticket
                confirmation_code = generate_confirmation_code()
                qr_result = generate_rsvp_qr_data(
                    request.event_id,
                    member_id,
                    '',
                    confirmation_code
                )

                rsvp_entry = {
                    "member_id": member_id,
                    "member_name": member_name,
                    "phone": member_phone,
                    "photo_url": member_photo,
                    "session_id": None,
                    "seat": None,
                    "timestamp": datetime.utcnow(),
                    "status": "registered",
                    "confirmation_code": confirmation_code,
                    "qr_code": qr_result.get("qr_code"),
                    "qr_data": qr_result.get("qr_data"),
                    "whatsapp_status": get_initial_whatsapp_status(member_phone),
                    "source": "kiosk_group",
                    "registered_by": request.primary_member_id,
                    "is_primary": False
                }
                rsvp_entries.append(rsvp_entry)
                existing_rsvp_ids.add(member_id)

                tickets.append(TicketResponse(
                    member_id=member_id,
                    member_name=member_name,
                    phone=member_phone,
                    confirmation_code=confirmation_code,
                    qr_code=qr_result.get("qr_code"),
                    qr_data=qr_result.get("qr_data"),
                    is_primary=False,
                    is_new_member=is_new,
                    whatsapp_status=get_initial_whatsapp_status(member_phone)
                ))

            except Exception as e:
                logger.error(f"Error processing companion {idx}: {e}")
                errors.append({
                    "index": idx,
                    "type": companion.type,
                    "reason": str(e)
                })

        # 5. Bulk add RSVP entries to event
        if rsvp_entries:
            await db.events.update_one(
                {"id": request.event_id},
                {"$push": {"rsvp_list": {"$each": rsvp_entries}}}
            )
            logger.info(f"Group registration: Added {len(rsvp_entries)} RSVPs to event {request.event_id}")

        # 6. Schedule WhatsApp tickets in background (non-blocking for fast response)
        tickets_to_send = []
        for ticket in tickets:
            if ticket.phone and ticket.whatsapp_status == "sending":
                tickets_to_send.append({
                    'member_id': ticket.member_id,
                    'phone': ticket.phone,
                    'member_name': ticket.member_name,
                    'event_name': event_name,
                    'event_date': event_date,
                    'location': location,
                    'start_time': start_time,
                    'confirmation_code': ticket.confirmation_code,
                    'qr_code': ticket.qr_code
                })

        if tickets_to_send:
            # Get MongoDB connection info for background task
            import os
            mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
            db_name = os.environ.get('DB_NAME', 'faithflow')

            # Schedule background task - returns immediately
            background_tasks.add_task(
                _send_whatsapp_tickets_background,
                tickets_to_send,
                request.event_id,
                mongo_url,
                db_name
            )
            logger.info(f"Scheduled {len(tickets_to_send)} WhatsApp tickets for background sending")

        # 7. Return response immediately (WhatsApp sends in background)
        logger.info(f"Group registration complete: {len(tickets)} tickets created, primary count={sum(1 for t in tickets if t.is_primary)}")
        for i, t in enumerate(tickets):
            logger.info(f"  Ticket {i}: member_id={t.member_id}, name={t.member_name}, is_primary={t.is_primary}")

        return GroupRegistrationResponse(
            success=True,
            event_id=request.event_id,
            event_name=event_name,
            event_date=event_date,
            location=location,
            start_time=start_time,
            total_registered=len(tickets),
            tickets=tickets,
            duplicates=duplicates,
            errors=errors
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Group registration error: {e}")
        raise HTTPException(status_code=500, detail=f"Group registration failed: {str(e)}")


class GroupJoinRequest(BaseModel):
    group_id: str
    member_id: str
    message: Optional[str] = None

@router.post("/join-group")
async def join_group_kiosk(
    request: GroupJoinRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create group join request from kiosk (public)."""
    try:
        group = await db.groups.find_one({"id": request.group_id})
        if not group:
            raise HTTPException(status_code=404, detail="Group not found")
        
        member = await db.members.find_one({"id": request.member_id})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")
        
        church_id = group["church_id"]
        
        # Check existing request
        existing = await db.group_join_requests.find_one({
            "church_id": church_id,
            "group_id": request.group_id,
            "member_id": request.member_id,
            "status": "pending"
        })
        
        if existing:
            return {"success": True, "message": "Request already pending"}
        
        # Create join request
        join_req = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "group_id": request.group_id,
            "member_id": request.member_id,
            "message": request.message or "",
            "status": "pending",
            "submitted_at": datetime.utcnow()
        }
        
        await db.group_join_requests.insert_one(join_req)
        
        logger.info(f"Kiosk group join: Group {request.group_id}, Member {request.member_id}")
        
        return {"success": True, "message": "Join request created"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kiosk group join error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create join request")


# Default profile fields for kiosk (always shown)
DEFAULT_KIOSK_PROFILE_FIELDS = ["full_name", "phone", "date_of_birth", "address"]

# All available profile fields that can be enabled
ALL_PROFILE_FIELDS = [
    "full_name",      # Always shown
    "phone",          # Always shown
    "email",
    "date_of_birth",  # Always shown
    "gender",
    "marital_status",
    "blood_type",
    "occupation",
    "address",        # Always shown
    "city",
    "state",
    "country"
]


@router.get("/settings")
async def get_public_kiosk_settings(
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get public kiosk settings for a church (no auth required).

    Returns which kiosk services are enabled, timeout settings, and profile fields.
    """
    try:
        settings = await db.church_settings.find_one(
            {"church_id": church_id},
            {"_id": 0, "kiosk_settings": 1}
        )

        if settings and settings.get("kiosk_settings"):
            kiosk_settings = settings["kiosk_settings"]
            # Get profile fields - use configured or defaults
            profile_fields = kiosk_settings.get("profile_fields", DEFAULT_KIOSK_PROFILE_FIELDS)

            # Return only public-facing settings
            return {
                "enable_kiosk": kiosk_settings.get("enable_kiosk", True),
                "enable_event_registration": kiosk_settings.get("enable_event_registration", True),
                "enable_prayer": kiosk_settings.get("enable_prayer", True),
                "enable_counseling": kiosk_settings.get("enable_counseling", True),
                "enable_groups": kiosk_settings.get("enable_groups", True),
                "enable_profile_update": kiosk_settings.get("enable_profile_update", True),
                # Member Care Services (new)
                "enable_accept_jesus": kiosk_settings.get("enable_accept_jesus", True),
                "enable_baptism": kiosk_settings.get("enable_baptism", True),
                "enable_child_dedication": kiosk_settings.get("enable_child_dedication", True),
                "enable_holy_matrimony": kiosk_settings.get("enable_holy_matrimony", True),
                "timeout_minutes": kiosk_settings.get("timeout_minutes", 2),
                "default_language": kiosk_settings.get("default_language", "id"),
                "home_title": kiosk_settings.get("home_title", ""),
                "home_subtitle": kiosk_settings.get("home_subtitle", ""),
                "profile_fields": profile_fields,
                "all_profile_fields": ALL_PROFILE_FIELDS
            }

        # Return defaults if no settings found
        return {
            "enable_kiosk": True,
            "enable_event_registration": True,
            "enable_prayer": True,
            "enable_counseling": True,
            "enable_groups": True,
            "enable_profile_update": True,
            # Member Care Services (new)
            "enable_accept_jesus": True,
            "enable_baptism": True,
            "enable_child_dedication": True,
            "enable_holy_matrimony": True,
            "timeout_minutes": 2,
            "default_language": "id",
            "home_title": "",
            "home_subtitle": "",
            "profile_fields": DEFAULT_KIOSK_PROFILE_FIELDS,
            "all_profile_fields": ALL_PROFILE_FIELDS
        }

    except Exception as e:
        logger.error(f"Error fetching kiosk settings: {e}")
        # Return defaults on error
        return {
            "enable_kiosk": True,
            "enable_event_registration": True,
            "enable_prayer": True,
            "enable_counseling": True,
            "enable_groups": True,
            "enable_profile_update": True,
            # Member Care Services (new)
            "enable_accept_jesus": True,
            "enable_baptism": True,
            "enable_child_dedication": True,
            "enable_holy_matrimony": True,
            "timeout_minutes": 2,
            "default_language": "id",
            "home_title": "",
            "home_subtitle": "",
            "profile_fields": DEFAULT_KIOSK_PROFILE_FIELDS,
            "all_profile_fields": ALL_PROFILE_FIELDS
        }


class ProfileUpdateRequest(BaseModel):
    """Profile update request from kiosk.

    Only includes user-editable fields. System fields like member_status,
    church_id, demographic_category, etc. are NOT editable by members.
    """
    # Basic info
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None  # phone_whatsapp - requires OTP verification if changed

    # Personal details
    date_of_birth: Optional[str] = None
    gender: Optional[str] = None  # 'Male' or 'Female'
    blood_type: Optional[str] = None  # 'A', 'B', 'AB', 'O'
    marital_status: Optional[str] = None  # 'Married', 'Not Married', 'Widower', 'Widow'
    occupation: Optional[str] = None

    # Address
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    country: Optional[str] = None

    # Custom fields (church-specific additional fields)
    custom_fields: Optional[dict] = None


class CreateMemberRequest(BaseModel):
    """Create new member (pre-visitor) from kiosk."""
    full_name: str
    phone_whatsapp: str
    email: Optional[str] = None
    church_id: str
    member_status: str = "Pre-Visitor"


class PrayerRequestKiosk(BaseModel):
    """Prayer request from kiosk."""
    member_id: str
    church_id: str
    request_text: str
    is_anonymous: bool = False
    category: Optional[str] = None


@router.get("/events")
async def get_public_events_kiosk(
    church_id: str = Query(..., description="Church ID"),
    limit: int = Query(50, ge=1, le=100),
    for_registration: bool = Query(False, description="If true, only show events that require RSVP"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get upcoming events for kiosk (public - no auth required).

    Args:
        for_registration: If true, only returns events with requires_rsvp=true (for member registration).
                         If false (default), returns all active events (for staff check-in).
    """
    try:
        # Use today's date at midnight for comparison (event_date is stored as ISO string)
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_str = today.strftime("%Y-%m-%d")

        # Base query for today's and future active events
        query = {
            "church_id": church_id,
            "event_date": {"$gte": today_str},
            "is_active": True,
        }

        # For registration flow, only show events that require RSVP
        if for_registration:
            query["requires_rsvp"] = True
            query["enable_registration"] = {"$ne": False}

        projection = {
            "_id": 0,
            "id": 1,
            "name": 1,
            "event_date": 1,
            "start_time": 1,
            "end_time": 1,
            "location": 1,
            "description": 1,
            "cover_image": 1,
            "category": 1,
            "max_capacity": 1,
            "enable_registration": 1,
            "registration_deadline": 1
        }

        events = await db.events.find(query, projection).sort("event_date", 1).limit(limit).to_list(length=limit)

        # Add RSVP counts
        for event in events:
            rsvp_count = await db.events.aggregate([
                {"$match": {"id": event["id"]}},
                {"$project": {"rsvp_count": {"$size": {"$ifNull": ["$rsvp_list", []]}}}}
            ]).to_list(length=1)
            event["rsvp_count"] = rsvp_count[0]["rsvp_count"] if rsvp_count else 0

        logger.info(f"Kiosk events: Found {len(events)} upcoming events for church {church_id}")

        return {"data": events, "total": len(events)}

    except Exception as e:
        logger.error(f"Kiosk events error: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch events")


@router.post("/create-member")
async def create_member_kiosk(
    request: CreateMemberRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create new pre-visitor member from kiosk (public - no auth required)."""
    try:
        # Check if phone already exists
        existing = await db.members.find_one({
            "church_id": request.church_id,
            "phone_whatsapp": request.phone_whatsapp
        })

        if existing:
            # Return existing member instead of error
            return {
                "success": True,
                "message": "Member already exists",
                "member": {
                    "id": existing["id"],
                    "full_name": existing["full_name"],
                    "phone_whatsapp": existing["phone_whatsapp"]
                }
            }

        # Create new member
        member_id = str(uuid.uuid4())
        member = {
            "id": member_id,
            "church_id": request.church_id,
            "full_name": request.full_name,
            "phone_whatsapp": request.phone_whatsapp,
            "email": request.email,
            "member_status": request.member_status,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "source": "kiosk"
        }

        await db.members.insert_one(member)

        logger.info(f"Kiosk member created: {member_id} ({request.full_name})")

        return {
            "success": True,
            "message": "Member created successfully",
            "member": {
                "id": member_id,
                "full_name": request.full_name,
                "phone_whatsapp": request.phone_whatsapp
            }
        }

    except Exception as e:
        logger.error(f"Kiosk create member error: {e}")
        raise HTTPException(status_code=500, detail="Failed to create member")


@router.post("/prayer-request")
async def submit_prayer_request_kiosk(
    request: PrayerRequestKiosk,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Submit prayer request from kiosk (public - no auth required).

    After submission, Prayer Intelligence analyzes the request to:
    1. Extract themes (health, anxiety, relationships, etc.)
    2. Detect emotional state and urgency
    3. Suggest relevant scriptures and content
    4. Schedule 14-day follow-up prompt
    5. Update user profile for subtle content personalization
    """
    try:
        # Get member info
        member = await db.members.find_one({"id": request.member_id})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        prayer_id = str(uuid.uuid4())
        prayer_request = {
            "id": prayer_id,
            "church_id": request.church_id,
            "member_id": request.member_id,
            "member_name": member.get("full_name", "Anonymous") if not request.is_anonymous else "Anonymous",
            "request_text": request.request_text,
            "is_anonymous": request.is_anonymous,
            "category": request.category,
            "status": "pending",
            "source": "kiosk",
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }

        await db.prayer_requests.insert_one(prayer_request)
        logger.info(f"Kiosk prayer request: {prayer_id} from member {request.member_id}")

        # Prayer Intelligence: Analyze request and get immediate resources
        immediate_resources = None
        try:
            prayer_service = get_prayer_intelligence_service(db)
            analysis = await prayer_service.analyze_prayer_request(
                church_id=request.church_id,
                user_id=request.member_id,
                prayer_request_id=prayer_id,
                prayer_text=request.request_text,
                prayer_category=request.category,
            )

            # Get immediate resources to show user
            immediate_resources = await prayer_service.get_immediate_resources(prayer_id)

            # Store analysis reference in prayer request
            await db.prayer_requests.update_one(
                {"id": prayer_id},
                {"$set": {
                    "analysis": {
                        "themes": list(analysis.themes.keys()),
                        "urgency": analysis.urgency,
                        "analyzed_at": datetime.utcnow(),
                    }
                }}
            )

            logger.info(f"Prayer intelligence analyzed: themes={list(analysis.themes.keys())}, urgency={analysis.urgency}")

        except Exception as e:
            # Don't fail the request if intelligence analysis fails
            logger.warning(f"Prayer intelligence analysis failed: {e}")

        return {
            "success": True,
            "message": "Prayer request submitted successfully",
            "id": prayer_id,
            "resources": immediate_resources,  # Scriptures, content themes, guided prayer
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kiosk prayer request error: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit prayer request")


@router.get("/prayer-request/{prayer_id}/resources")
async def get_prayer_resources(
    prayer_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get resources for a prayer request (scriptures, themes, guided prayer).

    Called after prayer submission to display relevant content.
    """
    try:
        prayer_service = get_prayer_intelligence_service(db)
        resources = await prayer_service.get_immediate_resources(prayer_id)

        if not resources:
            return {"resources": None, "message": "No analysis available"}

        return {"resources": resources}

    except Exception as e:
        logger.error(f"Error getting prayer resources: {e}")
        raise HTTPException(status_code=500, detail="Failed to get resources")


class GuidedPrayerRequest(BaseModel):
    themes: list[str] = []
    language: str = "en"


class PrayerFollowUpResponse(BaseModel):
    followup_id: str
    sentiment: str  # "improved", "same", "worse", "resolved"
    notes: Optional[str] = None


@router.post("/prayer-request/followup-response")
async def respond_to_prayer_followup(
    request: PrayerFollowUpResponse,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Record user's response to a 14-day prayer follow-up.

    Sentiment options:
    - "improved": Things are getting better
    - "same": No change, still praying
    - "worse": Situation has worsened (may trigger pastoral outreach)
    - "resolved": Prayer has been answered
    """
    try:
        prayer_service = get_prayer_intelligence_service(db)

        # Record the response
        await prayer_service.record_followup_response(
            followup_id=request.followup_id,
            sentiment=request.sentiment,
        )

        logger.info(f"Prayer follow-up response: {request.followup_id} = {request.sentiment}")

        # If situation worsened, we might want to flag for pastoral attention
        if request.sentiment == "worse":
            # Get the follow-up to find the original prayer
            followup = await db.prayer_followups.find_one({"id": request.followup_id})
            if followup:
                # Update original prayer request with pastoral flag
                await db.prayer_requests.update_one(
                    {"id": followup.get("prayer_request_id")},
                    {"$set": {"needs_pastoral_attention": True, "followup_sentiment": "worse"}}
                )
                logger.info(f"Flagged prayer {followup.get('prayer_request_id')} for pastoral attention")

        return {
            "success": True,
            "message": "Thank you for sharing your update. We continue to pray with you.",
        }

    except Exception as e:
        logger.error(f"Error recording prayer follow-up response: {e}")
        raise HTTPException(status_code=500, detail="Failed to record response")


@router.post("/prayer-request/guided-prayer")
async def get_guided_prayer(
    request: GuidedPrayerRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Generate a guided prayer based on themes.

    Called to help user pray with AI-generated prayer prompts.
    """
    try:
        prayer_service = get_prayer_intelligence_service(db)
        guided_prayer = await prayer_service.generate_guided_prayer(
            themes=request.themes,
            language=request.language,
        )

        return {"guided_prayer": guided_prayer}

    except Exception as e:
        logger.error(f"Error generating guided prayer: {e}")
        raise HTTPException(status_code=500, detail="Failed to generate guided prayer")


@router.patch("/update-profile/{member_id}")
async def update_member_profile_kiosk(
    member_id: str,
    request: ProfileUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update member profile from kiosk (public - no auth required).

    This endpoint allows members to update their own profile via kiosk
    after OTP verification. Only user-editable fields can be updated.
    System fields (member_status, church_id, etc.) are NOT allowed.
    """
    try:
        # Find member
        member = await db.members.find_one({"id": member_id})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        # Build update dict with only provided fields
        update_data = {}

        # Basic info
        if request.full_name is not None:
            update_data["full_name"] = request.full_name
            # Auto-generate first/last name
            name_parts = request.full_name.strip().split(maxsplit=1)
            update_data["first_name"] = name_parts[0] if name_parts else ""
            update_data["last_name"] = name_parts[1] if len(name_parts) > 1 else ""

        if request.email is not None:
            update_data["email"] = request.email

        if request.phone is not None:
            update_data["phone_whatsapp"] = request.phone

        # Personal details
        if request.date_of_birth is not None:
            update_data["date_of_birth"] = request.date_of_birth

        if request.gender is not None:
            # Accept both cases - store capitalized
            gender_val = request.gender.lower() if request.gender else ''
            if gender_val in ['male', 'female', '']:
                update_data["gender"] = gender_val.capitalize() if gender_val else None

        if request.blood_type is not None:
            # Accept blood types with optional Rh factor
            valid_blood_types = ['A', 'B', 'AB', 'O', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '']
            if request.blood_type.upper() in [bt.upper() for bt in valid_blood_types]:
                update_data["blood_type"] = request.blood_type if request.blood_type else None

        if request.marital_status is not None:
            # Accept various case formats - store capitalized
            status_mapping = {
                'single': 'Single',
                'married': 'Married',
                'divorced': 'Divorced',
                'widowed': 'Widowed',
                'not married': 'Single',
                'widower': 'Widowed',
                'widow': 'Widowed',
                '': None
            }
            status_lower = request.marital_status.lower()
            if status_lower in status_mapping:
                update_data["marital_status"] = status_mapping[status_lower]

        if request.occupation is not None:
            update_data["occupation"] = request.occupation

        # Address
        if request.address is not None:
            update_data["address"] = request.address

        if request.city is not None:
            update_data["city"] = request.city

        if request.state is not None:
            update_data["state"] = request.state

        if request.country is not None:
            update_data["country"] = request.country

        # Custom fields (merge with existing)
        if request.custom_fields is not None:
            existing_custom = member.get("custom_fields", {})
            existing_custom.update(request.custom_fields)
            update_data["custom_fields"] = existing_custom

        if not update_data:
            return {"success": True, "message": "No changes to save"}

        # Add updated_at timestamp
        update_data["updated_at"] = datetime.utcnow()

        # Update member
        result = await db.members.update_one(
            {"id": member_id},
            {"$set": update_data}
        )

        if result.modified_count > 0:
            logger.info(f"Kiosk profile update: Member {member_id}, Fields: {list(update_data.keys())}")
            return {"success": True, "message": "Profile updated successfully"}
        else:
            return {"success": True, "message": "No changes made"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kiosk profile update error: {e}")
        raise HTTPException(status_code=500, detail="Failed to update profile")


@router.get("/lookup-member")
async def lookup_member_by_phone(
    phone: str = Query(None, description="Phone number to lookup"),
    search: str = Query(None, description="Search by name or phone"),
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Lookup member by phone or name (public endpoint for kiosk).

    Supports:
    - phone parameter: Tries multiple phone formats to find match
    - search parameter: Searches by name (case-insensitive) OR phone
    """
    try:
        # Use search param if provided, otherwise use phone param
        query_term = search or phone
        if not query_term:
            return {"success": False, "member": None, "members": []}

        logger.info(f"Kiosk member lookup: query={query_term}")

        # Check if query looks like a phone number (mostly digits)
        clean_query = query_term.replace('+', '').replace('-', '').replace(' ', '')
        is_phone_search = clean_query.isdigit() and len(clean_query) >= 8

        # Helper to clean member for response
        def clean_member(m):
            """Return only needed fields for kiosk lookup."""
            return {
                "id": m.get("id"),
                "full_name": m.get("full_name"),
                "phone_whatsapp": m.get("phone_whatsapp"),
                "photo_url": m.get("photo_url"),
                "photo_thumbnail_url": m.get("photo_thumbnail_url"),
                "gender": m.get("gender"),
                "status": m.get("status"),
                "membership_date": m.get("membership_date"),
            }

        if is_phone_search:
            # Phone search - try multiple formats
            phone_variations = [
                query_term,  # Original
                clean_query,  # Without +
                f"+{clean_query}",  # With +
            ]

            # If starts with 0, also try with 62
            if clean_query.startswith('0'):
                phone_variations.append('62' + clean_query[1:])
                phone_variations.append('+62' + clean_query[1:])

            member = await db.members.find_one({
                "church_id": church_id,
                "phone_whatsapp": {"$in": phone_variations},
                "is_deleted": {"$ne": True}
            }, {"_id": 0})

            if member:
                logger.info(f"Member found by phone: {member.get('full_name')}, photo_url: {member.get('photo_url')}")
                cleaned = clean_member(member)
                return {
                    "success": True,
                    "member": cleaned,
                    "members": [cleaned]
                }
        else:
            # Name search - case-insensitive regex
            import re
            name_pattern = re.compile(re.escape(query_term), re.IGNORECASE)

            members = await db.members.find({
                "church_id": church_id,
                "full_name": {"$regex": name_pattern},
                "is_deleted": {"$ne": True}
            }, {"_id": 0}).limit(10).to_list(length=10)

            if members:
                logger.info(f"Found {len(members)} members by name search: {query_term}")
                cleaned_members = [clean_member(m) for m in members]
                return {
                    "success": True,
                    "member": cleaned_members[0],  # First match for backward compatibility
                    "members": cleaned_members
                }

        logger.info(f"Member not found for query: {query_term}")
        return {
            "success": False,
            "member": None,
            "members": []
        }

    except Exception as e:
        logger.error(f"Member lookup error: {e}")
        raise HTTPException(status_code=500, detail="Lookup failed")


# =============================================================================
# FACE RECOGNITION ENDPOINTS
# =============================================================================

class FaceCheckinRequest(BaseModel):
    """Face check-in request."""
    event_id: str
    member_id: str
    church_id: Optional[str] = None  # Can be sent in body or query
    descriptor: Optional[list] = None  # Face descriptor for verification
    photo_base64: Optional[str] = None  # Captured photo (optional, for progressive learning)
    confidence: Optional[str] = None  # Match confidence level
    source: Optional[str] = None  # Source of check-in (kiosk_face, etc.)


class SaveFacePhotoRequest(BaseModel):
    """Save face photo for progressive learning."""
    member_id: str
    descriptor: Optional[list] = None  # 512D face descriptor (optional - backend can regenerate)
    photo_base64: str  # Base64 encoded JPEG


@router.get("/face-descriptors")
async def get_face_descriptors(
    church_id: str = Query(..., description="Church ID"),
    event_id: Optional[str] = Query(None, description="Event ID to filter by RSVP list"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all members with face descriptors for client-side matching.

    Returns members with their face descriptors for browser-based face recognition.
    If event_id is provided, optionally prioritize RSVPed members.

    Response is optimized for kiosk use:
    - Only returns members with face_checkin_enabled=true
    - Only returns members with at least one face descriptor
    - Returns last 5 descriptors per member for accuracy
    """
    try:
        # Query members with face descriptors
        query = {
            "church_id": church_id,
            "face_checkin_enabled": {"$ne": False},  # Include if not explicitly disabled
            "face_descriptors": {"$exists": True, "$ne": []},
            "is_deleted": {"$ne": True}
        }

        projection = {
            "_id": 0,
            "id": 1,
            "full_name": 1,
            "photo_url": 1,
            "photo_thumbnail_url": 1,
            "face_descriptors": {"$slice": -5},  # Last 5 descriptors
        }

        members = await db.members.find(query, projection).to_list(length=2000)

        # Format for client consumption
        result = []
        for member in members:
            if member.get("face_descriptors"):
                result.append({
                    "member_id": member["id"],
                    "member_name": member["full_name"],
                    "photo_url": member.get("photo_thumbnail_url") or member.get("photo_url"),
                    "descriptors": [
                        fd.get("descriptor") for fd in member["face_descriptors"]
                        if fd.get("descriptor")
                    ]
                })

        logger.info(f"Face descriptors: Returning {len(result)} members for church {church_id}")

        return {
            "success": True,
            "members": result,
            "total": len(result)
        }

    except Exception as e:
        logger.error(f"Error fetching face descriptors: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch face descriptors")


@router.get("/face-descriptors/event/{event_id}")
async def get_event_scoped_face_descriptors(
    event_id: str,
    church_id: str = Query(..., description="Church ID"),
    include_recent: bool = Query(True, description="Include recent attendees"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get face descriptors scoped to an event for faster loading.

    Optimized endpoint that returns only:
    1. Members with RSVPs for this specific event
    2. Members who attended the last 3 similar events (optional)
    3. Fallback: Most active 200 members if no RSVPs

    This reduces payload by 80-90% compared to loading all members.
    """
    try:
        # Get event and RSVP list
        event = await db.events.find_one(
            {"id": event_id, "church_id": church_id},
            {"_id": 0, "id": 1, "name": 1, "rsvp_list": 1, "event_type": 1}
        )

        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Collect member IDs to include
        member_ids = set()

        # 1. Add RSVPed members
        for rsvp in event.get("rsvp_list", []):
            if rsvp.get("member_id"):
                member_ids.add(rsvp["member_id"])

        # 2. Add recent attendees (from last 3 events) if enabled
        if include_recent and len(member_ids) < 100:
            # Get recent attendance
            recent_attendance = await db.event_attendance.find(
                {"church_id": church_id},
                {"_id": 0, "member_id": 1}
            ).sort("check_in_time", -1).limit(300).to_list(length=300)

            for att in recent_attendance:
                if att.get("member_id"):
                    member_ids.add(att["member_id"])

        # 3. Fallback: If still too few, get most active members
        if len(member_ids) < 50:
            active_members = await db.members.find(
                {
                    "church_id": church_id,
                    "face_checkin_enabled": {"$ne": False},
                    "face_descriptors": {"$exists": True, "$ne": []},
                    "is_deleted": {"$ne": True}
                },
                {"_id": 0, "id": 1}
            ).sort("updated_at", -1).limit(200).to_list(length=200)

            for m in active_members:
                member_ids.add(m["id"])

        if not member_ids:
            return {"success": True, "members": [], "total": 0}

        # Query only the targeted members
        query = {
            "church_id": church_id,
            "id": {"$in": list(member_ids)},
            "face_checkin_enabled": {"$ne": False},
            "face_descriptors": {"$exists": True, "$ne": []},
            "is_deleted": {"$ne": True}
        }

        projection = {
            "_id": 0,
            "id": 1,
            "full_name": 1,
            "photo_url": 1,
            "photo_thumbnail_url": 1,
            "face_descriptors": {"$slice": -3},  # Only last 3 for event scope
        }

        members = await db.members.find(query, projection).to_list(length=500)

        # Format for client
        result = []
        for member in members:
            if member.get("face_descriptors"):
                result.append({
                    "member_id": member["id"],
                    "member_name": member["full_name"],
                    "photo_url": member.get("photo_thumbnail_url") or member.get("photo_url"),
                    "descriptors": [
                        fd.get("descriptor") for fd in member["face_descriptors"]
                        if fd.get("descriptor")
                    ]
                })

        logger.info(
            f"Event-scoped face descriptors: {len(result)} members "
            f"(from {len(member_ids)} targeted) for event {event_id}"
        )

        return {
            "success": True,
            "members": result,
            "total": len(result),
            "event_id": event_id,
            "rsvp_count": len(event.get("rsvp_list", []))
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching event-scoped face descriptors: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch face descriptors")


class BatchFaceCheckinItem(BaseModel):
    member_id: str
    confidence: Optional[float] = None


class BatchFaceCheckinRequest(BaseModel):
    event_id: str
    church_id: str
    items: list  # List of BatchFaceCheckinItem


@router.post("/face-checkin/batch")
async def batch_face_checkin(
    request: BatchFaceCheckinRequest,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Batch check-in multiple members at once.

    Optimized for high-throughput scenarios where multiple people
    are detected and need to be checked in quickly.

    Returns results for each member (success, already_checked_in, or error).
    """
    if not request.items:
        return {"success": True, "results": [], "total": 0}

    results = []
    now = datetime.now(timezone.utc)

    # Get event info once
    event = await db.events.find_one(
        {"id": request.event_id, "church_id": request.church_id},
        {"_id": 0, "id": 1, "name": 1, "event_date": 1, "requires_rsvp": 1, "rsvp_list": 1}
    )

    if not event:
        raise HTTPException(status_code=404, detail="Event not found")

    # Build RSVP lookup set for O(1) checks
    rsvp_member_ids = {
        r.get("member_id") for r in event.get("rsvp_list", [])
    } if event.get("requires_rsvp") else None

    # Get all members in one query
    member_ids = [item.get("member_id") for item in request.items if item.get("member_id")]
    members = await db.members.find(
        {"id": {"$in": member_ids}, "church_id": request.church_id},
        {"_id": 0, "id": 1, "full_name": 1, "photo_thumbnail_url": 1, "photo_url": 1}
    ).to_list(length=len(member_ids))

    member_lookup = {m["id"]: m for m in members}

    for item in request.items:
        member_id = item.get("member_id")
        confidence = item.get("confidence")

        if not member_id:
            results.append({"member_id": None, "success": False, "error": "Missing member_id"})
            continue

        member = member_lookup.get(member_id)
        if not member:
            results.append({"member_id": member_id, "success": False, "error": "Member not found"})
            continue

        # Check RSVP if required
        if rsvp_member_ids is not None and member_id not in rsvp_member_ids:
            results.append({
                "member_id": member_id,
                "member_name": member["full_name"],
                "success": False,
                "requires_rsvp": True,
                "error": "RSVP required"
            })
            continue

        # Check Redis cache for already checked in
        if await is_checked_in(request.event_id, member_id, None):
            results.append({
                "member_id": member_id,
                "member_name": member["full_name"],
                "success": True,
                "already_checked_in": True
            })
            continue

        # Create attendance record
        attendance_record = {
            "id": str(uuid.uuid4()),
            "church_id": request.church_id,
            "event_id": request.event_id,
            "member_id": member_id,
            "member_name": member["full_name"],
            "session_id": None,
            "check_in_time": now,
            "check_in_method": "face",
            "source": "kiosk_batch",
            "confidence": confidence,
            "event_name": event.get("name"),
            "event_date": event.get("event_date"),
        }

        try:
            await db.event_attendance.insert_one(attendance_record)
            await mark_checked_in(request.event_id, member_id, None, "face")

            # Legacy attendance_list update
            legacy_entry = {
                "member_id": member_id,
                "member_name": member["full_name"],
                "checked_in_at": now,
                "source": "face_recognition_batch",
                "check_in_method": "face"
            }
            await db.events.update_one(
                {"id": request.event_id},
                {"$push": {"attendance_list": legacy_entry}}
            )

            results.append({
                "member_id": member_id,
                "member_name": member["full_name"],
                "success": True,
                "photo_url": member.get("photo_thumbnail_url") or member.get("photo_url")
            })

        except DuplicateKeyError:
            results.append({
                "member_id": member_id,
                "member_name": member["full_name"],
                "success": True,
                "already_checked_in": True
            })

    success_count = sum(1 for r in results if r.get("success") and not r.get("already_checked_in"))
    logger.info(f"Batch face check-in: {success_count} new, {len(results)} total for event {request.event_id}")

    return {
        "success": True,
        "results": results,
        "total": len(results),
        "new_checkins": success_count
    }


@router.post("/face-checkin")
async def face_checkin(
    request: FaceCheckinRequest,
    church_id: Optional[str] = Query(None, description="Church ID (can also be sent in request body)"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Check-in member using face recognition.

    Optimized with:
    - O(1) Redis cache for duplicate detection
    - Separate event_attendance collection for scalability
    - Database-level unique constraint for race condition safety

    The actual face matching happens client-side. This endpoint
    processes the check-in after a match is confirmed.
    """
    effective_church_id = church_id or request.church_id
    if not effective_church_id:
        raise HTTPException(status_code=400, detail="church_id is required (query param or body)")

    try:
        # O(1) Redis cache check first (before any DB queries)
        if await is_checked_in(request.event_id, request.member_id, None):
            # Still need member info for response, but skip attendance check
            member = await db.members.find_one(
                {"id": request.member_id, "church_id": effective_church_id},
                {"_id": 0, "id": 1, "full_name": 1, "photo_thumbnail_url": 1, "photo_url": 1}
            )
            return {
                "success": True,
                "message": "Already checked in",
                "member": {
                    "id": member["id"] if member else request.member_id,
                    "full_name": member.get("full_name", "Unknown") if member else "Unknown",
                    "photo_url": (member.get("photo_thumbnail_url") or member.get("photo_url")) if member else None
                },
                "already_checked_in": True
            }

        # Verify member exists (with projection for performance)
        member = await db.members.find_one(
            {"id": request.member_id, "church_id": effective_church_id},
            {"_id": 0, "id": 1, "full_name": 1, "photo_thumbnail_url": 1, "photo_url": 1}
        )
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        # Get event (with projection)
        event = await db.events.find_one(
            {"id": request.event_id},
            {"_id": 0, "id": 1, "name": 1, "church_id": 1, "requires_rsvp": 1,
             "rsvp_list": 1, "event_date": 1}
        )
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Check RSVP requirement
        if event.get("requires_rsvp", False):
            is_rsvped = any(
                r.get("member_id") == request.member_id
                for r in event.get("rsvp_list", [])
            )
            if not is_rsvped:
                return {
                    "success": False,
                    "message": "RSVP required",
                    "requires_rsvp": True,
                    "member": {
                        "id": member["id"],
                        "full_name": member["full_name"],
                        "photo_url": member.get("photo_thumbnail_url") or member.get("photo_url")
                    }
                }

        # Create attendance record for new collection
        now = datetime.now(timezone.utc)
        attendance_record = {
            "id": str(uuid.uuid4()),
            "church_id": effective_church_id,
            "event_id": request.event_id,
            "member_id": request.member_id,
            "member_name": member["full_name"],
            "session_id": None,
            "check_in_time": now,
            "check_in_method": "face",
            "source": "kiosk_face",
            "confidence": getattr(request, 'confidence', None),
            "event_name": event.get("name"),
            "event_date": event.get("event_date"),
        }

        try:
            # Insert into new collection (unique index prevents duplicates)
            await db.event_attendance.insert_one(attendance_record)

            # Mark in Redis cache
            await mark_checked_in(request.event_id, request.member_id, None, "face")

            # Update legacy attendance_list for backward compatibility
            legacy_entry = {
                "member_id": request.member_id,
                "member_name": member["full_name"],
                "checked_in_at": now,
                "source": "face_recognition",
                "check_in_method": "face"
            }
            await db.events.update_one(
                {"id": request.event_id},
                {"$push": {"attendance_list": legacy_entry}}
            )

            # Update RSVP status if exists
            await db.events.update_one(
                {"id": request.event_id, "rsvp_list.member_id": request.member_id},
                {"$set": {"rsvp_list.$.status": "attended", "rsvp_list.$.attended_at": now}}
            )

        except DuplicateKeyError:
            # Race condition - already checked in
            return {
                "success": True,
                "message": "Already checked in",
                "member": {
                    "id": member["id"],
                    "full_name": member["full_name"],
                    "photo_url": member.get("photo_thumbnail_url") or member.get("photo_url")
                },
                "already_checked_in": True
            }

        logger.info(f"Face check-in: Event {request.event_id}, Member {request.member_id} ({member['full_name']})")

        return {
            "success": True,
            "message": "Checked in successfully",
            "member": {
                "id": member["id"],
                "full_name": member["full_name"],
                "photo_url": member.get("photo_thumbnail_url") or member.get("photo_url")
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Face check-in error: {e}")
        raise HTTPException(status_code=500, detail="Check-in failed")


@router.post("/save-face-photo")
async def save_face_photo(
    request: SaveFacePhotoRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Save captured face photo for progressive learning.

    This endpoint:
    1. Checks if enough time has passed since last photo (7 days)
    2. Generates face embedding using InsightFace
    3. Saves photo to SeaweedFS
    4. Adds descriptor to member's face_descriptors array
    5. Keeps only last 5 descriptors per member

    Called silently after successful face check-in.
    """
    try:
        # Get member
        member = await db.members.find_one({
            "id": request.member_id,
            "church_id": church_id
        })

        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        # Check if enough time has passed (7 days for progressive learning)
        last_photo_at = member.get("last_face_photo_at")
        if last_photo_at:
            days_since = (datetime.utcnow() - last_photo_at).days
            if days_since < 7:
                logger.info(f"[Progressive Learning] Skipping for {member.get('full_name')}: Only {days_since} days since last capture (need 7)")
                return {
                    "success": True,
                    "saved": False,
                    "reason": f"Photo captured {days_since} days ago, waiting for 7 days"
                }

        # Generate face embedding using InsightFace
        from services.face_recognition import face_recognition_service
        import base64

        logger.info(f"[Progressive Learning] Generating embedding for {member.get('full_name')}...")

        embedding_result = await face_recognition_service.get_embedding(
            request.photo_base64,
            enforce_detection=False
        )

        if not embedding_result or not embedding_result.get('embedding'):
            logger.warning(f"[Progressive Learning] No face detected in photo for {member.get('full_name')}")
            return {
                "success": True,
                "saved": False,
                "reason": "No face detected in captured photo"
            }

        embedding = embedding_result['embedding']
        logger.info(f"[Progressive Learning] Embedding generated ({len(embedding)}D) for {member.get('full_name')}")

        # Save photo to SeaweedFS
        photo_url = None
        try:
            from services.seaweedfs_service import seaweedfs_service

            # Decode base64
            if request.photo_base64.startswith('data:'):
                photo_data = base64.b64decode(request.photo_base64.split(',')[1])
            else:
                photo_data = base64.b64decode(request.photo_base64)

            # Upload to SeaweedFS
            result = await seaweedfs_service.upload_file(
                file_data=photo_data,
                filename=f"face_{request.member_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.jpg",
                content_type="image/jpeg",
                path=f"churches/{church_id}/face_photos/{request.member_id}"
            )

            if result and result.get("url"):
                photo_url = result["url"]
                logger.info(f"[Progressive Learning] Photo saved to SeaweedFS: {photo_url}")
        except Exception as e:
            logger.warning(f"[Progressive Learning] Failed to save photo to SeaweedFS: {e}")

        # Create new descriptor entry with InsightFace-generated embedding
        new_descriptor = {
            "descriptor": embedding,  # Use InsightFace-generated embedding
            "captured_at": datetime.utcnow(),
            "photo_url": photo_url,
            "source": "progressive_learning"  # Track where this came from
        }

        # Get existing descriptors
        existing_descriptors = member.get("face_descriptors", [])

        # Add new descriptor and keep only last 5
        existing_descriptors.append(new_descriptor)
        if len(existing_descriptors) > 5:
            existing_descriptors = existing_descriptors[-5:]

        # Update member
        await db.members.update_one(
            {"id": request.member_id},
            {
                "$set": {
                    "face_descriptors": existing_descriptors,
                    "last_face_photo_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        logger.info(f"[Progressive Learning] ✅ New embedding saved for {member.get('full_name')} (total: {len(existing_descriptors)} embeddings)")

        return {
            "success": True,
            "saved": True,
            "total_descriptors": len(existing_descriptors),
            "photo_url": photo_url
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Save face photo error: {e}")
        raise HTTPException(status_code=500, detail="Failed to save face photo")


@router.post("/rsvp-and-checkin")
async def rsvp_and_checkin(
    request: FaceCheckinRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """RSVP and check-in in one step (for face recognition when not RSVPed).

    Optimized with Redis cache and event_attendance collection.
    Used when face recognition identifies a member who hasn't RSVPed
    for an event that requires RSVP.
    """
    try:
        from services.qr_service import generate_confirmation_code, generate_rsvp_qr_data

        # O(1) Redis cache check first
        if await is_checked_in(request.event_id, request.member_id, None):
            member = await db.members.find_one(
                {"id": request.member_id, "church_id": church_id},
                {"_id": 0, "id": 1, "full_name": 1, "photo_thumbnail_url": 1, "photo_url": 1}
            )
            return {
                "success": True,
                "message": "Already checked in",
                "member": {
                    "id": member["id"] if member else request.member_id,
                    "full_name": member.get("full_name", "Unknown") if member else "Unknown",
                    "photo_url": (member.get("photo_thumbnail_url") or member.get("photo_url")) if member else None
                },
                "already_checked_in": True
            }

        # Verify member (with projection)
        member = await db.members.find_one(
            {"id": request.member_id, "church_id": church_id},
            {"_id": 0, "id": 1, "full_name": 1, "photo_thumbnail_url": 1, "photo_url": 1}
        )
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        # Get event (with projection)
        event = await db.events.find_one(
            {"id": request.event_id},
            {"_id": 0, "id": 1, "name": 1, "church_id": 1, "rsvp_list": 1, "event_date": 1}
        )
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        now = datetime.now(timezone.utc)

        # Check if already RSVPed
        is_rsvped = any(
            r.get("member_id") == request.member_id
            for r in event.get("rsvp_list", [])
        )

        # Add RSVP if not already RSVPed
        confirmation_code = None
        if not is_rsvped:
            confirmation_code = generate_confirmation_code()
            qr_data = generate_rsvp_qr_data(request.event_id, request.member_id, '', confirmation_code)

            rsvp_entry = {
                "member_id": request.member_id,
                "member_name": member["full_name"],
                "session_id": None,
                "seat": None,
                "timestamp": now,
                "status": "attended",
                "attended_at": now,
                "confirmation_code": confirmation_code,
                "qr_data": qr_data,
                "source": "face_recognition_kiosk"
            }

            await db.events.update_one(
                {"id": request.event_id},
                {"$push": {"rsvp_list": rsvp_entry}}
            )

            # Cache the RSVP for future lookups
            await cache_rsvp(request.event_id, confirmation_code, rsvp_entry)

            logger.info(f"Face RSVP added: Event {request.event_id}, Member {request.member_id}")

        # Create attendance record for new collection
        attendance_record = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "event_id": request.event_id,
            "member_id": request.member_id,
            "member_name": member["full_name"],
            "session_id": None,
            "check_in_time": now,
            "check_in_method": "face",
            "source": "kiosk_face_rsvp",
            "event_name": event.get("name"),
            "event_date": event.get("event_date"),
        }

        try:
            # Insert into new collection
            await db.event_attendance.insert_one(attendance_record)

            # Mark in Redis cache
            await mark_checked_in(request.event_id, request.member_id, None, "face")

            # Update legacy attendance_list
            legacy_entry = {
                "member_id": request.member_id,
                "member_name": member["full_name"],
                "checked_in_at": now,
                "source": "face_recognition",
                "check_in_method": "face"
            }
            await db.events.update_one(
                {"id": request.event_id},
                {"$push": {"attendance_list": legacy_entry}}
            )

        except DuplicateKeyError:
            # Race condition - already checked in
            return {
                "success": True,
                "message": "Already checked in",
                "member": {
                    "id": member["id"],
                    "full_name": member["full_name"],
                    "photo_url": member.get("photo_thumbnail_url") or member.get("photo_url")
                },
                "already_checked_in": True
            }

        logger.info(f"Face RSVP+Check-in: Event {request.event_id}, Member {request.member_id}")

        return {
            "success": True,
            "message": "RSVPed and checked in successfully",
            "member": {
                "id": member["id"],
                "full_name": member["full_name"],
                "photo_url": member.get("photo_thumbnail_url") or member.get("photo_url")
            }
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"RSVP and check-in error: {e}")
        raise HTTPException(status_code=500, detail="Failed to RSVP and check-in")


@router.get("/event-attendance-count/{event_id}")
async def get_event_attendance_count(
    event_id: str,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get the current attendance count for an event.

    Used by the kiosk UI to display real-time attendance numbers.
    Uses the new event_attendance collection for O(1) count.
    """
    try:
        # First try the new event_attendance collection
        count = await db.event_attendance.count_documents({
            "event_id": event_id,
            "church_id": church_id
        })

        # If no records in new collection, fall back to counting attendance_list
        if count == 0:
            event = await db.events.find_one(
                {"id": event_id, "church_id": church_id},
                {"_id": 0, "attendance_list": 1}
            )
            if event and event.get("attendance_list"):
                count = len(event["attendance_list"])

        return {
            "success": True,
            "count": count,
            "event_id": event_id
        }

    except Exception as e:
        logger.error(f"Error getting attendance count: {e}")
        return {"success": True, "count": 0, "event_id": event_id}


# =============================================================================
# MEMBER CARE REQUEST ENDPOINTS
# =============================================================================

from services.member_care_service import MemberCareService, MemberSearchService
from models.member_care_request import (
    AcceptJesusCreate,
    BaptismCreate,
    ChildDedicationCreate,
    HolyMatrimonyCreate,
    MemberCareSubmissionResponse,
    MemberSearchResponse,
)


class AcceptJesusKioskRequest(BaseModel):
    """Request model for Accept Jesus submission from kiosk."""
    member_id: str
    full_name: str
    phone: str
    email: Optional[str] = None
    commitment_type: Literal["first_time", "recommitment"]
    prayer_read: bool = False
    follow_up_requested: bool = True
    notes: Optional[str] = None


class BaptismKioskRequest(BaseModel):
    """Request model for Baptism submission from kiosk."""
    member_id: str
    full_name: str
    phone: str
    email: Optional[str] = None
    preferred_date: Optional[str] = None
    previous_baptism: bool = False
    testimony: Optional[str] = None
    notes: Optional[str] = None


class PersonInfoRequest(BaseModel):
    """Person info for Child Dedication and Holy Matrimony."""
    name: str
    phone: Optional[str] = None
    member_id: Optional[str] = None
    is_baptized: Optional[bool] = None


class ChildInfoRequest(BaseModel):
    """Child info for Child Dedication."""
    name: str
    birth_date: str  # YYYY-MM-DD
    gender: Optional[Literal["male", "female"]] = None
    photo_url: str
    photo_fid: Optional[str] = None
    photo_thumbnail_url: Optional[str] = None


class ChildDedicationKioskRequest(BaseModel):
    """Request model for Child Dedication submission from kiosk."""
    member_id: str
    full_name: str
    phone: str
    email: Optional[str] = None
    father: PersonInfoRequest
    mother: PersonInfoRequest
    child: ChildInfoRequest
    preferred_date: Optional[str] = None
    notes: Optional[str] = None


class HolyMatrimonyKioskRequest(BaseModel):
    """Request model for Holy Matrimony submission from kiosk."""
    member_id: str
    full_name: str
    phone: str
    email: Optional[str] = None
    person_a: PersonInfoRequest
    person_b: PersonInfoRequest
    planned_wedding_date: Optional[str] = None
    venue_preference: Optional[Literal["church", "offsite", "undecided"]] = None
    notes: Optional[str] = None


@router.post("/member-care/accept-jesus")
async def submit_accept_jesus(
    request: AcceptJesusKioskRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Submit Accept Jesus / Recommitment request from kiosk.

    This is called after OTP verification. The requester has:
    1. Read the guided salvation prayer
    2. Confirmed they prayed the prayer
    3. Optionally requested follow-up contact
    """
    try:
        service = MemberCareService(db)

        # Parse date if provided
        from datetime import date
        create_data = AcceptJesusCreate(
            member_id=request.member_id,
            full_name=request.full_name,
            phone=request.phone,
            email=request.email,
            commitment_type=request.commitment_type,
            prayer_read=request.prayer_read,
            follow_up_requested=request.follow_up_requested,
            notes=request.notes,
        )

        result = await service.create_accept_jesus_request(
            church_id=church_id,
            data=create_data,
            source="kiosk",
        )

        return MemberCareSubmissionResponse(
            success=True,
            message="Your decision has been recorded. Welcome to God's family!",
            message_key="member_care.accept_jesus.success",
            request_id=result["id"],
            request_type="accept_jesus",
        )

    except Exception as e:
        logger.error(f"Accept Jesus submission error: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit request")


@router.post("/member-care/baptism")
async def submit_baptism(
    request: BaptismKioskRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Submit Baptism request from kiosk.

    Called after OTP verification with optional preferred date.
    """
    try:
        service = MemberCareService(db)

        from datetime import date
        preferred_date = None
        if request.preferred_date:
            preferred_date = date.fromisoformat(request.preferred_date)

        create_data = BaptismCreate(
            member_id=request.member_id,
            full_name=request.full_name,
            phone=request.phone,
            email=request.email,
            preferred_date=preferred_date,
            previous_baptism=request.previous_baptism,
            testimony=request.testimony,
            notes=request.notes,
        )

        result = await service.create_baptism_request(
            church_id=church_id,
            data=create_data,
            source="kiosk",
        )

        return MemberCareSubmissionResponse(
            success=True,
            message="Your baptism request has been received. We will contact you soon.",
            message_key="member_care.baptism.success",
            request_id=result["id"],
            request_type="baptism",
        )

    except Exception as e:
        logger.error(f"Baptism submission error: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit request")


@router.post("/member-care/child-dedication")
async def submit_child_dedication(
    request: ChildDedicationKioskRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Submit Child Dedication request from kiosk.

    Requires:
    - Father info (name, phone, optional member_id)
    - Mother info (name, phone, optional member_id)
    - Child info (name, birth_date, photo_url - required)
    """
    try:
        service = MemberCareService(db)

        from datetime import date
        from models.member_care_request import PersonInfoCreate, ChildInfoCreate

        preferred_date = None
        if request.preferred_date:
            preferred_date = date.fromisoformat(request.preferred_date)

        child_birth_date = date.fromisoformat(request.child.birth_date)

        create_data = ChildDedicationCreate(
            member_id=request.member_id,
            full_name=request.full_name,
            phone=request.phone,
            email=request.email,
            father=PersonInfoCreate(
                name=request.father.name,
                phone=request.father.phone,
                member_id=request.father.member_id,
            ),
            mother=PersonInfoCreate(
                name=request.mother.name,
                phone=request.mother.phone,
                member_id=request.mother.member_id,
            ),
            child=ChildInfoCreate(
                name=request.child.name,
                birth_date=child_birth_date,
                gender=request.child.gender,
                photo_url=request.child.photo_url,
                photo_fid=request.child.photo_fid,
                photo_thumbnail_url=request.child.photo_thumbnail_url,
            ),
            preferred_date=preferred_date,
            notes=request.notes,
        )

        result = await service.create_child_dedication_request(
            church_id=church_id,
            data=create_data,
            source="kiosk",
        )

        return MemberCareSubmissionResponse(
            success=True,
            message="Your child dedication request has been received. We will contact you to schedule the ceremony.",
            message_key="member_care.child_dedication.success",
            request_id=result["id"],
            request_type="child_dedication",
        )

    except Exception as e:
        logger.error(f"Child dedication submission error: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit request")


@router.post("/member-care/holy-matrimony")
async def submit_holy_matrimony(
    request: HolyMatrimonyKioskRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Submit Holy Matrimony request from kiosk.

    Requires:
    - Person A info (submitter or partner)
    - Person B info (partner - can be searched or newly registered)
    - Planned wedding date (optional)
    - Baptism status for each person
    """
    try:
        service = MemberCareService(db)

        from datetime import date
        from models.member_care_request import PersonInfoCreate

        planned_date = None
        if request.planned_wedding_date:
            planned_date = date.fromisoformat(request.planned_wedding_date)

        create_data = HolyMatrimonyCreate(
            member_id=request.member_id,
            full_name=request.full_name,
            phone=request.phone,
            email=request.email,
            person_a=PersonInfoCreate(
                name=request.person_a.name,
                phone=request.person_a.phone,
                member_id=request.person_a.member_id,
                is_baptized=request.person_a.is_baptized,
            ),
            person_b=PersonInfoCreate(
                name=request.person_b.name,
                phone=request.person_b.phone,
                member_id=request.person_b.member_id,
                is_baptized=request.person_b.is_baptized,
            ),
            planned_wedding_date=planned_date,
            venue_preference=request.venue_preference,
            notes=request.notes,
        )

        result = await service.create_holy_matrimony_request(
            church_id=church_id,
            data=create_data,
            source="kiosk",
        )

        return MemberCareSubmissionResponse(
            success=True,
            message="Your holy matrimony request has been received. Our pastoral team will contact you soon.",
            message_key="member_care.holy_matrimony.success",
            request_id=result["id"],
            request_type="holy_matrimony",
        )

    except Exception as e:
        logger.error(f"Holy matrimony submission error: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit request")


@router.get("/member-care/guided-prayer")
async def get_guided_prayer(
    church_id: str = Query(..., description="Church ID"),
    language: str = Query("id", description="Language: 'en' or 'id'"),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Get the guided salvation prayer for Accept Jesus flow.

    Returns the prayer text in the requested language.
    Uses church-specific text if configured, otherwise default.
    """
    try:
        service = MemberCareService(db)
        prayer_text = await service.get_guided_prayer(church_id, language)

        return {
            "success": True,
            "prayer": prayer_text,
            "language": language,
        }

    except Exception as e:
        logger.error(f"Get guided prayer error: {e}")
        raise HTTPException(status_code=500, detail="Failed to get prayer")


@router.get("/members/search")
async def search_members_for_selection(
    q: str = Query(..., min_length=2, description="Search query (name or phone)"),
    church_id: str = Query(..., description="Church ID"),
    exclude_ids: Optional[str] = Query(None, description="Comma-separated member IDs to exclude"),
    limit: int = Query(10, ge=1, le=50),
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Search members for spouse/couple selection in Child Dedication and Holy Matrimony.

    Returns limited member info: id, name, phone, photo.
    Used by MemberSearchSelect component in kiosk and mobile.
    """
    try:
        service = MemberSearchService(db)

        exclude_list = None
        if exclude_ids:
            exclude_list = [id.strip() for id in exclude_ids.split(",") if id.strip()]

        result = await service.search_members(
            church_id=church_id,
            query=q,
            limit=limit,
            exclude_ids=exclude_list,
        )

        return MemberSearchResponse(**result)

    except Exception as e:
        logger.error(f"Member search error: {e}")
        raise HTTPException(status_code=500, detail="Search failed")


class ChildPhotoUpload(BaseModel):
    """Request body for child photo upload"""
    photo_base64: str
    church_id: str


@router.post("/member-care/upload-child-photo")
async def upload_child_photo(
    data: ChildPhotoUpload,
    db: AsyncIOMotorDatabase = Depends(get_db),
):
    """
    Upload child photo for Child Dedication request.

    Accepts base64 encoded image and stores in SeaweedFS.
    Returns URL and file ID for use in submission.
    """
    try:
        from services.seaweedfs_service import SeaweedFSService, StorageCategory
        import base64

        # Extract from data model
        photo_base64 = data.photo_base64
        church_id = data.church_id

        # Decode base64
        if photo_base64.startswith("data:"):
            # Remove data URL prefix
            photo_base64 = photo_base64.split(",")[1]

        photo_bytes = base64.b64decode(photo_base64)

        # Upload to SeaweedFS
        seaweed_service = SeaweedFSService()
        result = await seaweed_service.upload_by_category(
            content=photo_bytes,
            file_name=f"child_photo_{uuid.uuid4()}.jpg",
            mime_type="image/jpeg",
            category=StorageCategory.MEMBER_DOCUMENT,
            church_id=church_id,
        )

        # upload_by_category returns: url, fid, thumbnail_url (not success)
        if not result.get("url"):
            raise HTTPException(status_code=500, detail="Failed to upload photo")

        return {
            "success": True,
            "photo_url": result.get("url"),
            "photo_fid": result.get("fid"),
            "photo_thumbnail_url": result.get("thumbnail_url"),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Child photo upload error: {e}")
        raise HTTPException(status_code=500, detail="Failed to upload photo")

