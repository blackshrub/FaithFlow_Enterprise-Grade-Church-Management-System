"""Kiosk backend endpoints - OTP, member lookup, etc."""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timedelta
import uuid
import random
import logging

from utils.dependencies import get_db

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
    """Send OTP to phone via WhatsApp.
    
    For demo: Generates 4-digit code and stores in memory.
    In production: Call WhatsApp gateway.
    """
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
        
        # TODO: Send via WhatsApp gateway
        # For now, just log
        logger.info(f"OTP for {phone}: {code}")
        print(f"\n🔐 OTP for {phone}: {code}\n")
        
        # In production:
        # await send_whatsapp_message(phone, f"Your verification code is: {code}")
        
        return {
            "success": True,
            "message": "OTP sent successfully",
            "debug_code": code  # Remove in production!
        }
    
    except Exception as e:
        logger.error(f"Error sending OTP: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send OTP"
        )


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
                detail={"error_code": "OTP_NOT_FOUND", "message": "No OTP found for this phone"}
            )
        
        stored = otp_store[phone]
        
        # Check expiry
        if datetime.utcnow() > stored['expires_at']:
            del otp_store[phone]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "OTP_EXPIRED", "message": "OTP has expired"}
            )
        
        # Check attempts
        if stored['attempts'] >= 3:
            del otp_store[phone]
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error_code": "TOO_MANY_ATTEMPTS", "message": "Too many failed attempts"}
            )
        
        # Verify code
        if stored['code'] != code:
            stored['attempts'] += 1
            return {
                "success": False,
                "message": "Invalid OTP"
            }
        
        # Success - remove OTP
        del otp_store[phone]
        
        return {
            "success": True,
            "message": "OTP verified successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying OTP: {e}")
        raise HTTPException(
            status_code=500,
            detail="Failed to verify OTP"
        )


@router.post("/verify-pin")
async def verify_staff_pin(
    request: PINVerifyRequest,
    church_id: str = Query(..., description="Church ID"),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Verify staff PIN for kiosk event check-in access."""
    try:
        # Find user with matching PIN in this church
        user = await db.users.find_one({
            "church_id": church_id,
            "kiosk_pin": request.pin,
            "is_active": True
        }, {"_id": 0, "id": 1, "full_name": 1, "role": 1, "email": 1})
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail={"error_code": "INVALID_PIN", "message": "Invalid PIN"}
            )
        
        return {
            "success": True,
            "user": user
        }
    
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error verifying PIN: {e}")
        raise HTTPException(
            status_code=500,
            detail="Internal error"
        )
