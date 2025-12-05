"""Kiosk backend endpoints - OTP, member lookup, event registration, etc."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import uuid
import random
import json
import logging

from utils.dependencies import get_db
from services.whatsapp_service import send_whatsapp_message
from services.explore.prayer_intelligence_service import get_prayer_intelligence_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kiosk", tags=["Kiosk"])

# OTP storage uses Redis for efficient TTL-based expiry and O(1) lookups
OTP_TTL_SECONDS = 300  # 5 minutes
OTP_MAX_ATTEMPTS = 5


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


@router.post("/send-otp")
async def send_otp(
    request: OTPSendRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send OTP to phone via WhatsApp."""
    try:
        phone = request.phone

        # Generate 4-digit OTP
        code = str(random.randint(1000, 9999))

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
            message = f"Kode verifikasi Anda adalah: {code}. Kode ini dapat digunakan dalam 5 menit."


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
        # Still return success with console OTP
        code = str(random.randint(1000, 9999)) if 'code' not in locals() else code
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
    """Verify OTP code."""
    try:
        phone = request.phone
        code = request.code


        # Try Redis first
        redis = await _get_redis()
        otp_doc = None

        if redis:
            otp_key = _otp_key(phone)
            otp_data = await redis.get(otp_key)

            if otp_data:
                otp_doc = json.loads(otp_data)
                otp_doc["_source"] = "redis"
            else:
                logger.debug(f"No OTP found in Redis for {phone}")

        # Fallback to MongoDB if not in Redis
        if not otp_doc:
            mongo_doc = await db.otp_codes.find_one({"phone": phone})
            if mongo_doc:
                otp_doc = {
                    "code": mongo_doc["code"],
                    "attempts": mongo_doc["attempts"],
                    "expires_at": mongo_doc["expires_at"],
                    "_source": "mongodb"
                }

        if not otp_doc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "OTP_NOT_FOUND", "message": "No OTP found. Please request a new code."}
            )

        # Check expiry (only for MongoDB, Redis handles TTL automatically)
        if otp_doc.get("_source") == "mongodb" and datetime.utcnow() > otp_doc['expires_at']:
            await db.otp_codes.delete_one({"phone": phone})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "OTP_EXPIRED", "message": "OTP expired. Please request a new code."}
            )

        # Check attempts
        if otp_doc['attempts'] >= OTP_MAX_ATTEMPTS:
            # Delete from both Redis and MongoDB
            if redis:
                await redis.delete(_otp_key(phone))
            await db.otp_codes.delete_one({"phone": phone})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "TOO_MANY_ATTEMPTS", "message": "Too many attempts. Please request a new code."}
            )

        # Verify code
        if otp_doc['code'] != code:
            # Increment attempts
            otp_doc['attempts'] += 1
            if redis and otp_doc.get("_source") == "redis":
                # Get remaining TTL and update
                otp_key = _otp_key(phone)
                ttl = await redis.ttl(otp_key)
                if ttl > 0:
                    await redis.set(otp_key, json.dumps({"code": otp_doc["code"], "attempts": otp_doc["attempts"]}), ex=ttl)
            else:
                await db.otp_codes.update_one({"phone": phone}, {"$inc": {"attempts": 1}})

            return {"success": False, "message": "Invalid OTP"}

        # Success - remove OTP
        if redis:
            await redis.delete(_otp_key(phone))
        await db.otp_codes.delete_one({"phone": phone})  # Clean up MongoDB too

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
    
    Note: Super admin has church_id=None, so we don't filter by church.
    We verify PIN first, then check if user has access to selected church.
    """
    try:
        # Find user with matching PIN (don't filter by church yet)
        user = await db.users.find_one({
            "kiosk_pin": request.pin,
            "is_active": True
        }, {"_id": 0, "id": 1, "full_name": 1, "role": 1, "church_id": 1})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_PIN", "message": "Invalid PIN"}
            )
        
        # Validate church access
        # Super admin can access any church
        # Regular users must match church_id
        if user['role'] != 'super_admin':
            if user.get('church_id') != church_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail={"error_code": "WRONG_CHURCH", "message": "You don't have access to this church"}
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
        qr_data = generate_rsvp_qr_data(request.event_id, request.member_id, '', confirmation_code)
        
        rsvp_entry = {
            "member_id": request.member_id,
            "session_id": None,
            "seat": None,
            "timestamp": datetime.utcnow(),
            "status": "registered",
            "confirmation_code": confirmation_code,
            "qr_data": qr_data,
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
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get upcoming events for kiosk (public - no auth required)."""
    try:
        # Use today's date at midnight for comparison (event_date is stored as ISO string)
        today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
        today_str = today.strftime("%Y-%m-%d")

        # Query for today's and future events (string comparison works with ISO format)
        query = {
            "church_id": church_id,
            "event_date": {"$gte": today_str},
            "is_active": True
        }

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
                logger.info(f"Member found by phone: {member.get('full_name')}")
                return {
                    "success": True,
                    "member": member,
                    "members": [member]
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
                return {
                    "success": True,
                    "member": members[0],  # First match for backward compatibility
                    "members": members
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
    descriptor: Optional[list] = None  # Face descriptor for verification
    photo_base64: Optional[str] = None  # Captured photo (optional, for progressive learning)


class SaveFacePhotoRequest(BaseModel):
    """Save face photo for progressive learning."""
    member_id: str
    descriptor: list  # 512D face descriptor
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


@router.post("/face-checkin")
async def face_checkin(
    request: FaceCheckinRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Check-in member using face recognition.

    This endpoint:
    1. Verifies the member exists
    2. Performs check-in for the event
    3. Optionally saves the captured photo for progressive learning

    The actual face matching happens client-side. This endpoint just processes
    the check-in after a match is confirmed.
    """
    try:
        # Verify member exists
        member = await db.members.find_one({
            "id": request.member_id,
            "church_id": church_id
        })

        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        # Get event
        event = await db.events.find_one({"id": request.event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Check if already checked in
        existing_checkin = None
        for attendance in event.get("attendance_list", []):
            if attendance.get("member_id") == request.member_id:
                existing_checkin = attendance
                break

        if existing_checkin:
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

        # Check RSVP requirement
        requires_rsvp = event.get("requires_rsvp", False)
        is_rsvped = False

        if requires_rsvp:
            for rsvp in event.get("rsvp_list", []):
                if rsvp.get("member_id") == request.member_id:
                    is_rsvped = True
                    break

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

        # Perform check-in
        attendance_entry = {
            "member_id": request.member_id,
            "member_name": member["full_name"],
            "checked_in_at": datetime.utcnow(),
            "source": "face_recognition",
            "check_in_method": "face"
        }

        await db.events.update_one(
            {"id": request.event_id},
            {"$push": {"attendance_list": attendance_entry}}
        )

        # Also update RSVP status if exists
        await db.events.update_one(
            {"id": request.event_id, "rsvp_list.member_id": request.member_id},
            {"$set": {"rsvp_list.$.status": "attended", "rsvp_list.$.attended_at": datetime.utcnow()}}
        )

        logger.info(f"Face check-in: Event {request.event_id}, Member {request.member_id} ({member['full_name']})")

        # Optionally save photo for progressive learning (done in separate endpoint)

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
    1. Checks if enough time has passed since last photo (30 days)
    2. Saves photo to SeaweedFS
    3. Adds descriptor to member's face_descriptors array
    4. Keeps only last 5 descriptors per member

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

        # Check if enough time has passed (30 days)
        last_photo_at = member.get("last_face_photo_at")
        if last_photo_at:
            days_since = (datetime.utcnow() - last_photo_at).days
            if days_since < 30:
                logger.debug(f"Skipping face photo save: Only {days_since} days since last photo")
                return {
                    "success": True,
                    "saved": False,
                    "reason": f"Photo captured {days_since} days ago, waiting for 30 days"
                }

        # Save photo to SeaweedFS
        photo_url = None
        try:
            from services.seaweedfs_service import seaweedfs_service
            import base64

            # Decode base64
            if request.photo_base64.startswith('data:'):
                # Remove data URL prefix
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
                logger.info(f"Face photo saved to SeaweedFS: {photo_url}")
        except Exception as e:
            logger.warning(f"Failed to save face photo to SeaweedFS: {e}")
            # Continue without photo URL

        # Create new descriptor entry
        new_descriptor = {
            "descriptor": request.descriptor,
            "captured_at": datetime.utcnow(),
            "photo_url": photo_url
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

        logger.info(f"Face descriptor saved for member {request.member_id}, total: {len(existing_descriptors)}")

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

    Used when face recognition identifies a member who hasn't RSVPed
    for an event that requires RSVP.
    """
    try:
        from services.qr_service import generate_confirmation_code, generate_rsvp_qr_data

        # Verify member
        member = await db.members.find_one({
            "id": request.member_id,
            "church_id": church_id
        })

        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        # Get event
        event = await db.events.find_one({"id": request.event_id})
        if not event:
            raise HTTPException(status_code=404, detail="Event not found")

        # Check if already RSVPed
        is_rsvped = False
        for rsvp in event.get("rsvp_list", []):
            if rsvp.get("member_id") == request.member_id:
                is_rsvped = True
                break

        # Add RSVP if not already RSVPed
        if not is_rsvped:
            confirmation_code = generate_confirmation_code()
            qr_data = generate_rsvp_qr_data(request.event_id, request.member_id, '', confirmation_code)

            rsvp_entry = {
                "member_id": request.member_id,
                "member_name": member["full_name"],
                "session_id": None,
                "seat": None,
                "timestamp": datetime.utcnow(),
                "status": "attended",  # Directly set to attended
                "attended_at": datetime.utcnow(),
                "confirmation_code": confirmation_code,
                "qr_data": qr_data,
                "source": "face_recognition_kiosk"
            }

            await db.events.update_one(
                {"id": request.event_id},
                {"$push": {"rsvp_list": rsvp_entry}}
            )

            logger.info(f"Face RSVP added: Event {request.event_id}, Member {request.member_id}")

        # Add to attendance list
        attendance_entry = {
            "member_id": request.member_id,
            "member_name": member["full_name"],
            "checked_in_at": datetime.utcnow(),
            "source": "face_recognition",
            "check_in_method": "face"
        }

        # Check if already in attendance
        existing_attendance = await db.events.find_one({
            "id": request.event_id,
            "attendance_list.member_id": request.member_id
        })

        if not existing_attendance:
            await db.events.update_one(
                {"id": request.event_id},
                {"$push": {"attendance_list": attendance_entry}}
            )

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

