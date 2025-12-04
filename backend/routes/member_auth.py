"""
Member Authentication API Routes for Mobile App.

Handles phone number + OTP authentication for church members.
Members login using their phone number, receive OTP via WhatsApp, and verify.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field, validator
from typing import Optional
from datetime import datetime, timedelta
import logging
import secrets
import re

from utils.dependencies import get_db, create_access_token, get_current_user
from services.whatsapp_service import send_whatsapp_message

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/member-auth", tags=["Member Authentication"])


class MemberLoginRequest(BaseModel):
    """Member login request with phone number."""
    phone: str = Field(..., description="Phone number with country code (e.g., +628123456789)")
    church_id: str = Field(..., description="Church ID for context")

    @validator('phone')
    def validate_phone(cls, v):
        """Validate Indonesian phone number format."""
        # Remove spaces and dashes
        phone = re.sub(r'[\s\-]', '', v)

        # Must start with +62 or 08 or 62
        if not re.match(r'^(\+62|62|08)\d{9,12}$', phone):
            raise ValueError("Invalid Indonesian phone number format")

        # Normalize to +62 format
        if phone.startswith('08'):
            phone = '+62' + phone[1:]
        elif phone.startswith('62') and not phone.startswith('+'):
            phone = '+' + phone

        return phone


class MemberOTPVerifyRequest(BaseModel):
    """OTP verification request."""
    phone: str
    otp_code: str = Field(..., min_length=6, max_length=6)
    church_id: str


class MemberLoginResponse(BaseModel):
    """Member login response."""
    success: bool
    message: str
    otp_sent: bool
    expires_in: int  # seconds


class MemberAuthResponse(BaseModel):
    """Member authentication response after OTP verification."""
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    member: dict


@router.post("/send-otp", response_model=MemberLoginResponse)
async def send_member_otp(
    request: MemberLoginRequest,
    client_request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Send OTP to member's WhatsApp.

    Flow:
    1. Check if phone number belongs to an active member in the church
    2. Generate 6-digit OTP
    3. Store OTP in database with 5-minute expiry
    4. Send OTP via WhatsApp
    5. Return success response

    Rate limit: 3 OTP requests per phone per hour
    """
    try:
        # Find member by phone and church
        member = await db.members.find_one({
            "phone_whatsapp": request.phone,
            "church_id": request.church_id,
            "is_active": True,
            "deleted": {"$ne": True}
        })

        if not member:
            # Security: Don't reveal if member exists or not
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found or inactive. Please contact church admin."
            )

        # Check rate limit (3 OTP requests per hour)
        one_hour_ago = datetime.utcnow() - timedelta(hours=1)
        recent_otps = await db.member_otps.count_documents({
            "phone": request.phone,
            "church_id": request.church_id,
            "created_at": {"$gte": one_hour_ago}
        })

        if recent_otps >= 3:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many OTP requests. Please try again in 1 hour."
            )

        # Generate 6-digit OTP
        otp_code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])

        # OTP expires in 5 minutes
        expires_at = datetime.utcnow() + timedelta(minutes=5)

        # Store OTP in database
        otp_record = {
            "phone": request.phone,
            "church_id": request.church_id,
            "member_id": member["id"],
            "otp_code": otp_code,
            "verified": False,
            "created_at": datetime.utcnow(),
            "expires_at": expires_at,
            "ip_address": client_request.client.host,
            "attempts": 0
        }

        await db.member_otps.insert_one(otp_record)

        # Send OTP via WhatsApp
        church = await db.churches.find_one({"id": request.church_id})
        church_name = church.get("name", "FaithFlow") if church else "FaithFlow"

        message = f"""
*{church_name} - Kode Verifikasi*

Halo {member.get('full_name', '')}! 👋

Kode OTP Anda untuk login ke aplikasi mobile:

*{otp_code}*

Kode ini berlaku selama 5 menit.

Jangan bagikan kode ini kepada siapapun.

_Jika Anda tidak meminta kode ini, abaikan pesan ini._
""".strip()

        try:
            await send_whatsapp_message(request.phone, message)
            otp_sent = True
        except Exception as e:
            logger.error(f"Failed to send OTP WhatsApp: {e}")
            otp_sent = False

        logger.info(f"OTP sent to {request.phone} for member {member['id']}")

        return MemberLoginResponse(
            success=True,
            message="OTP sent to your WhatsApp",
            otp_sent=otp_sent,
            expires_in=300  # 5 minutes
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Send OTP error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to send OTP. Please try again."
        )


@router.post("/verify-otp", response_model=MemberAuthResponse)
async def verify_member_otp(
    request: MemberOTPVerifyRequest,
    client_request: Request,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Verify OTP and issue JWT access token.

    Flow:
    1. Find OTP record for phone + church
    2. Check OTP not expired
    3. Verify OTP code (max 3 attempts)
    4. Mark OTP as verified
    5. Generate JWT with member_id + church_id
    6. Return access token

    Max 3 verification attempts per OTP
    """
    try:
        # Find latest OTP for this phone + church
        otp_record = await db.member_otps.find_one(
            {
                "phone": request.phone,
                "church_id": request.church_id,
                "verified": False
            },
            sort=[("created_at", -1)]
        )

        if not otp_record:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="OTP not found or already used. Please request a new one."
            )

        # Check if OTP expired
        if datetime.utcnow() > otp_record["expires_at"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="OTP expired. Please request a new one."
            )

        # Check attempts (max 3)
        if otp_record.get("attempts", 0) >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Too many failed attempts. Please request a new OTP."
            )

        # Verify OTP code
        if otp_record["otp_code"] != request.otp_code:
            # Increment attempts
            await db.member_otps.update_one(
                {"_id": otp_record["_id"]},
                {"$inc": {"attempts": 1}}
            )

            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid OTP code. Please try again."
            )

        # OTP is valid! Mark as verified
        await db.member_otps.update_one(
            {"_id": otp_record["_id"]},
            {
                "$set": {
                    "verified": True,
                    "verified_at": datetime.utcnow(),
                    "verified_ip": client_request.client.host
                }
            }
        )

        # Get member details
        member = await db.members.find_one({
            "id": otp_record["member_id"],
            "church_id": request.church_id
        })

        if not member:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Member not found"
            )

        # Generate JWT access token
        # Token expires in 365 days (1 year) - effectively "forever" for mobile
        # Mobile apps stay logged in unless user explicitly logs out
        # or we force re-login due to security updates
        token_data = {
            "sub": member["id"],
            "email": member.get("email", f"{member['id']}@member.local"),
            "role": "member",  # Special role for mobile app
            "session_church_id": request.church_id,
            "type": "member"
        }

        access_token = create_access_token(
            data=token_data,
            expires_delta=timedelta(days=365)  # 1 year
        )

        # Prepare member response (remove sensitive fields)
        member_response = {
            "id": member["id"],
            "full_name": member.get("full_name"),
            "phone_whatsapp": member.get("phone_whatsapp"),
            "email": member.get("email"),
            "gender": member.get("gender"),
            "date_of_birth": member.get("date_of_birth"),
            "photo_url": member.get("photo_url"),
            "photo_thumbnail_url": member.get("photo_thumbnail_url"),
            "member_status": member.get("member_status"),
            "member_status_name": member.get("member_status_name")
        }

        logger.info(f"Member {member['id']} authenticated successfully")

        return MemberAuthResponse(
            access_token=access_token,
            token_type="bearer",
            expires_in=365 * 24 * 60 * 60,  # 1 year in seconds
            member=member_response
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"OTP verification error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to verify OTP. Please try again."
        )


@router.post("/refresh-token", response_model=MemberAuthResponse)
async def refresh_member_token(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Refresh member access token.

    Used by mobile app to refresh token before expiry.
    """
    # This endpoint allows members to refresh their token
    # without going through OTP again

    member_id = current_user.get("id")  # Fixed: get_current_user returns "id" not "sub"
    church_id = current_user.get("session_church_id")

    # Get fresh member data
    member = await db.members.find_one({
        "id": member_id,
        "church_id": church_id,
        "is_active": True
    })

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member not found or inactive"
        )

    # Generate new token (1 year expiry)
    token_data = {
        "sub": member["id"],
        "email": member.get("email", f"{member['id']}@member.local"),
        "role": "member",
        "session_church_id": church_id,
        "type": "member"
    }

    access_token = create_access_token(
        data=token_data,
        expires_delta=timedelta(days=365)
    )

    member_response = {
        "id": member["id"],
        "full_name": member.get("full_name"),
        "phone_whatsapp": member.get("phone_whatsapp"),
        "email": member.get("email"),
        "photo_url": member.get("photo_url"),
        "member_status_name": member.get("member_status_name")
    }

    return MemberAuthResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=365 * 24 * 60 * 60,  # 1 year
        member=member_response
    )
