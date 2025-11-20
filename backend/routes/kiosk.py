"""Kiosk-specific routes for PIN verification."""

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel
import logging

from utils.dependencies import get_db
from utils.tenant_utils import get_current_church_id

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/kiosk", tags=["Kiosk"])


class PINVerifyRequest(BaseModel):
    """Request model for PIN verification."""
    pin: str


@router.post("/verify-pin")
async def verify_staff_pin(
    request: PINVerifyRequest,
    church_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Verify staff PIN for kiosk event check-in access.
    
    This is a public endpoint (no auth required) but requires church_id
    to be passed as query parameter.
    """
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
