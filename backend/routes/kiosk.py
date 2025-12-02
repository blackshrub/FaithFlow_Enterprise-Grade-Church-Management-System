"""Kiosk backend endpoints - OTP, member lookup, event registration, etc."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import uuid
import random
import logging

from utils.dependencies import get_db
from services.whatsapp_service import send_whatsapp_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kiosk", tags=["Kiosk"])

# Note: OTP storage moved to database for persistence across restarts and multiple instances

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

        # Store OTP in database for persistence (survives restarts and works with multiple instances)
        expires_at = datetime.utcnow() + timedelta(minutes=5)
        await db.otp_codes.update_one(
            {"phone": phone},
            {
                "$set": {
                    "phone": phone,
                    "code": code,
                    "expires_at": expires_at,
                    "attempts": 0,
                    "created_at": datetime.utcnow()
                }
            },
            upsert=True
        )

        # Log OTP for testing
        logger.info(f"🔐 OTP for {phone}: {code} (expires: {expires_at})")
        print(f"\n🔐 OTP for {phone}: {code}\n")
        print(f"📦 Stored in database, expires at: {expires_at}\n")
        
        # Get WhatsApp config from settings for THIS church
        settings = await db.church_settings.find_one({"church_id": church_id}, {"_id": 0})
        
        if settings:
            whatsapp_url = settings.get('whatsapp_api_url', '').strip()
            whatsapp_user = settings.get('whatsapp_username', '').strip()
            whatsapp_pass = settings.get('whatsapp_password', '').strip()
            
            print(f"📱 WhatsApp Config from DB (Church: {church_id}):")
            print(f"   URL: '{whatsapp_url}'")
            print(f"   Username: '{whatsapp_user}'")
            print(f"   Password: {'***' if whatsapp_pass else '(empty)'}")
            
            # Send via WhatsApp if URL is configured
            if whatsapp_url:
                whatsapp_phone = phone.replace('+', '')  # Remove + for gateway
                message = f"Your verification code is: {code}\\n\\nThis code will expire in 5 minutes."
                
                print(f"📨 Attempting WhatsApp send to: {whatsapp_phone}")
                
                # Temporarily set env vars (for whatsapp_service to use)
                import os
                old_url = os.environ.get('WHATSAPP_API_URL')
                old_user = os.environ.get('WHATSAPP_USERNAME')
                old_pass = os.environ.get('WHATSAPP_PASSWORD')
                
                os.environ['WHATSAPP_API_URL'] = whatsapp_url
                os.environ['WHATSAPP_USERNAME'] = whatsapp_user
                os.environ['WHATSAPP_PASSWORD'] = whatsapp_pass
                
                try:
                    whatsapp_result = await send_whatsapp_message(
                        whatsapp_phone, 
                        message,
                        api_url=whatsapp_url,
                        api_username=whatsapp_user if whatsapp_user else None,
                        api_password=whatsapp_pass if whatsapp_pass else None
                    )
                    
                    print(f"📨 WhatsApp Result: {whatsapp_result}")
                    
                    if whatsapp_result.get('success'):
                        logger.info(f"✅ WhatsApp OTP sent successfully to {phone}")
                        print(f"✅ WhatsApp OTP delivered to {phone}")
                    else:
                        logger.warning(f"⚠️ WhatsApp failed: {whatsapp_result.get('message')}")
                        print(f"⚠️ WhatsApp send failed: {whatsapp_result.get('message')}")
                    
                    return {
                        "success": True,
                        "message": "OTP sent successfully",
                        "debug_code": code,
                        "whatsapp_status": whatsapp_result.get('delivery_status', 'unknown'),
                        "whatsapp_sent": whatsapp_result.get('success', False)
                    }
                finally:
                    # No need to restore env vars since we're passing as parameters
                    pass
            else:
                print("⚠️ WhatsApp URL not configured in settings")
        else:
            print("⚠️ No church settings found")
        
        return {
            "success": True,
            "message": "OTP generated (WhatsApp not configured)",
            "debug_code": code,
            "whatsapp_sent": False
        }
    
    except Exception as e:
        logger.error(f"❌ Error sending OTP: {e}")
        import traceback
        traceback.print_exc()
        # Still return success with console OTP
        code = str(random.randint(1000, 9999)) if 'code' not in locals() else code
        return {
            "success": True,
            "message": "OTP generated (error occurred)",
            "debug_code": code,
            "whatsapp_sent": False
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

        print(f"🔍 Verifying OTP for phone: {phone}, code: {code}")

        # Find OTP in database
        otp_doc = await db.otp_codes.find_one({"phone": phone})

        if not otp_doc:
            # Debug: show all phones in database
            all_otps = await db.otp_codes.find({}, {"phone": 1, "created_at": 1}).to_list(length=10)
            print(f"❌ No OTP found for {phone}")
            print(f"📦 Database has OTPs for: {[doc['phone'] for doc in all_otps]}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "OTP_NOT_FOUND", "message": "No OTP found. Please request a new code."}
            )

        print(f"📦 Found OTP in database for {phone}")

        # Check expiry
        if datetime.utcnow() > otp_doc['expires_at']:
            print(f"❌ OTP expired for {phone}")
            await db.otp_codes.delete_one({"phone": phone})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "OTP_EXPIRED", "message": "OTP expired. Please request a new code."}
            )

        # Check attempts
        if otp_doc['attempts'] >= 5:
            print(f"❌ Too many attempts for {phone}")
            await db.otp_codes.delete_one({"phone": phone})
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "TOO_MANY_ATTEMPTS", "message": "Too many attempts. Please request a new code."}
            )

        # Verify code
        if otp_doc['code'] != code:
            # Increment attempts
            await db.otp_codes.update_one(
                {"phone": phone},
                {"$inc": {"attempts": 1}}
            )
            print(f"❌ Wrong code for {phone}. Expected: {otp_doc['code']}, Got: {code}, Attempts: {otp_doc['attempts'] + 1}")
            return {"success": False, "message": "Invalid OTP"}

        # Success - remove OTP from database
        await db.otp_codes.delete_one({"phone": phone})
        print(f"✅ OTP verified successfully for {phone}")

        return {"success": True, "message": "OTP verified"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        import traceback
        traceback.print_exc()
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
        now = datetime.utcnow()

        # Query for upcoming events
        query = {
            "church_id": church_id,
            "event_date": {"$gte": now}
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
    """Submit prayer request from kiosk (public - no auth required)."""
    try:
        # Get member info
        member = await db.members.find_one({"id": request.member_id})
        if not member:
            raise HTTPException(status_code=404, detail="Member not found")

        prayer_request = {
            "id": str(uuid.uuid4()),
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

        logger.info(f"Kiosk prayer request: {prayer_request['id']} from member {request.member_id}")

        return {
            "success": True,
            "message": "Prayer request submitted successfully",
            "id": prayer_request["id"]
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Kiosk prayer request error: {e}")
        raise HTTPException(status_code=500, detail="Failed to submit prayer request")


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
    phone: str = Query(..., description="Phone number to lookup"),
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Lookup member by phone (public endpoint for kiosk).

    Tries multiple phone formats to find match.
    """
    try:
        # Clean phone number
        clean_phone = phone.replace('+', '').replace('-', '').replace(' ', '')
        
        logger.info(f"Kiosk member lookup: {phone} → {clean_phone}")
        
        # Try multiple formats
        phone_variations = [
            phone,  # Original
            clean_phone,  # Without +
            f"+{clean_phone}",  # With +
        ]
        
        # If starts with 0, also try with 62
        if clean_phone.startswith('0'):
            phone_variations.append('62' + clean_phone[1:])
            phone_variations.append('+62' + clean_phone[1:])
        
        # Search with regex to match any variation
        member = await db.members.find_one({
            "church_id": church_id,
            "phone_whatsapp": {"$in": phone_variations}
        }, {"_id": 0})
        
        if member:
            logger.info(f"Member found: {member.get('full_name')}")
            return {
                "success": True,
                "member": member
            }
        else:
            logger.info(f"Member not found for phone: {phone}")
            return {
                "success": False,
                "member": None
            }
    
    except Exception as e:
        logger.error(f"Member lookup error: {e}")
        raise HTTPException(status_code=500, detail="Lookup failed")

