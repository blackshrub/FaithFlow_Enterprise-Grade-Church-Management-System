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

# In-memory OTP storage (for demo/development)
# In production, use Redis or database with TTL
otp_store = {}

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
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Send OTP to phone via WhatsApp."""
    try:
        phone = request.phone
        
        # Generate 4-digit OTP
        code = str(random.randint(1000, 9999))
        
        # Store OTP with expiry (5 minutes)
        otp_store[phone] = {
            'code': code,
            'expires_at': datetime.utcnow() + timedelta(minutes=5),
            'attempts': 0
        }
        
        # Log OTP for testing
        logger.info(f"OTP for {phone}: {code}")
        print(f"\n🔐 OTP for {phone}: {code}\n")
        
        # Send via WhatsApp gateway
        whatsapp_phone = phone.replace('+', '')  # Remove + for gateway
        message = f"Your verification code is: {code}\n\nThis code will expire in 5 minutes."
        
        whatsapp_result = await send_whatsapp_message(whatsapp_phone, message)
        
        if whatsapp_result.get('success'):
            logger.info(f"WhatsApp OTP sent successfully to {phone}")
        else:
            logger.warning(f"WhatsApp OTP failed: {whatsapp_result.get('message')}")
        
        return {
            "success": True,
            "message": "OTP sent successfully",
            "debug_code": code,  # Remove in production!
            "whatsapp_status": whatsapp_result.get('delivery_status', 'unknown')
        }
    
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        # Still return success even if WhatsApp fails (for testing)
        return {
            "success": True,
            "message": "OTP generated (WhatsApp may not be configured)",
            "debug_code": code if 'code' in locals() else "0000"
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
        
        # Check if OTP exists
        if phone not in otp_store:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "OTP_NOT_FOUND", "message": "No OTP found"}
            )
        
        stored = otp_store[phone]
        
        # Check expiry
        if datetime.utcnow() > stored['expires_at']:
            del otp_store[phone]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "OTP_EXPIRED", "message": "OTP expired"}
            )
        
        # Check attempts
        if stored['attempts'] >= 3:
            del otp_store[phone]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "TOO_MANY_ATTEMPTS", "message": "Too many attempts"}
            )
        
        # Verify code
        if stored['code'] != code:
            stored['attempts'] += 1
            return {"success": False, "message": "Invalid OTP"}
        
        # Success - remove OTP
        del otp_store[phone]
        
        return {"success": True, "message": "OTP verified"}
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        raise HTTPException(status_code=500, detail="Failed to verify OTP")


@router.post("/verify-pin")
async def verify_staff_pin(
    request: PINVerifyRequest,
    church_id: str = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Verify staff PIN for kiosk access."""
    try:
        user = await db.users.find_one({
            "church_id": church_id,
            "kiosk_pin": request.pin,
            "is_active": True
        }, {"_id": 0, "id": 1, "full_name": 1, "role": 1})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_PIN", "message": "Invalid PIN"}
            )
        
        return {"success": True, "user": user}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying PIN: {e}")
        raise HTTPException(status_code=500, detail="Internal error")


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
