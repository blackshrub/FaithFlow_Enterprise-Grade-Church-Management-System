"""
Push Notification API Routes for Mobile App.

Handles FCM device token registration and notification preferences.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime
import logging
import uuid

from models.notification import (
    DeviceToken,
    DeviceTokenRegister,
    NotificationPreferences,
    NotificationPreferencesUpdate,
    PushNotification,
    SendNotificationRequest
)
from utils.dependencies import get_db, get_current_user, get_session_church_id, require_admin
from services.fcm_service import get_fcm_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/notifications", tags=["Notifications"])


# ===========================
# DEVICE TOKEN MANAGEMENT
# ===========================

@router.post("/register-device", response_model=DeviceToken, status_code=status.HTTP_201_CREATED)
async def register_device_token(
    device_data: DeviceTokenRegister,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Register FCM device token for push notifications.

    Called by mobile app on launch to register/update device token.
    If token already exists for this member+church, it's updated.
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("sub")

    # Check if token already exists
    existing = await db.device_tokens.find_one({
        "fcm_token": device_data.fcm_token,
        "church_id": church_id
    })

    if existing:
        # Update existing token
        await db.device_tokens.update_one(
            {"_id": existing["_id"]},
            {
                "$set": {
                    "member_id": member_id,  # In case user changed
                    "device_type": device_data.device_type,
                    "device_name": device_data.device_name,
                    "app_version": device_data.app_version,
                    "is_active": True,
                    "updated_at": datetime.utcnow(),
                    "last_used_at": datetime.utcnow()
                }
            }
        )

        existing["member_id"] = member_id
        existing["updated_at"] = datetime.utcnow()
        existing.pop("_id", None)

        logger.info(f"Device token updated for member {member_id}")
        return existing

    else:
        # Create new token
        token_record = {
            "id": str(uuid.uuid4()),
            "member_id": member_id,
            "church_id": church_id,
            "fcm_token": device_data.fcm_token,
            "device_type": device_data.device_type,
            "device_name": device_data.device_name,
            "app_version": device_data.app_version,
            "is_active": True,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
            "last_used_at": datetime.utcnow()
        }

        await db.device_tokens.insert_one(token_record)
        token_record.pop("_id", None)

        logger.info(f"Device token registered for member {member_id}")
        return token_record


@router.delete("/unregister-device/{token_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unregister_device_token(
    token_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Unregister device token (mark as inactive).

    Called when user logs out from mobile app.
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("sub")

    result = await db.device_tokens.update_one(
        {
            "id": token_id,
            "member_id": member_id,
            "church_id": church_id
        },
        {
            "$set": {
                "is_active": False,
                "updated_at": datetime.utcnow()
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Device token not found"
        )

    logger.info(f"Device token unregistered for member {member_id}")
    return None


# ===========================
# NOTIFICATION PREFERENCES
# ===========================

@router.get("/preferences", response_model=NotificationPreferences)
async def get_notification_preferences(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get member's notification preferences."""
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("sub")

    prefs = await db.notification_preferences.find_one({
        "member_id": member_id,
        "church_id": church_id
    })

    if not prefs:
        # Create default preferences
        prefs = {
            "id": str(uuid.uuid4()),
            "member_id": member_id,
            "church_id": church_id,
            "events_enabled": True,
            "groups_enabled": True,
            "prayers_enabled": True,
            "devotions_enabled": True,
            "announcements_enabled": True,
            "giving_receipts_enabled": True,
            "push_enabled": True,
            "whatsapp_enabled": True,
            "updated_at": datetime.utcnow()
        }

        await db.notification_preferences.insert_one(prefs)

    prefs.pop("_id", None)
    return prefs


@router.patch("/preferences", response_model=NotificationPreferences)
async def update_notification_preferences(
    prefs_data: NotificationPreferencesUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update member's notification preferences."""
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("sub")

    # Build update data (only include non-None fields)
    update_data = {
        k: v for k, v in prefs_data.dict().items() if v is not None
    }

    if not update_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No fields to update"
        )

    update_data["updated_at"] = datetime.utcnow()

    result = await db.notification_preferences.update_one(
        {
            "member_id": member_id,
            "church_id": church_id
        },
        {"$set": update_data},
        upsert=True
    )

    # Get updated preferences
    prefs = await db.notification_preferences.find_one({
        "member_id": member_id,
        "church_id": church_id
    })

    prefs.pop("_id", None)

    logger.info(f"Notification preferences updated for member {member_id}")
    return prefs


# ===========================
# NOTIFICATION HISTORY
# ===========================

@router.get("/history", response_model=List[PushNotification])
async def get_notification_history(
    limit: int = 50,
    offset: int = 0,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get member's notification history.

    Shows push notifications sent to this member.
    """
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("sub")

    notifications = await db.push_notifications.find({
        "member_id": member_id,
        "church_id": church_id
    }).sort("sent_at", -1).skip(offset).limit(limit).to_list(limit)

    for notif in notifications:
        notif.pop("_id", None)

    return notifications


@router.patch("/history/{notification_id}/read", status_code=status.HTTP_204_NO_CONTENT)
async def mark_notification_as_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Mark notification as read."""
    church_id = get_session_church_id(current_user)
    member_id = current_user.get("sub")

    result = await db.push_notifications.update_one(
        {
            "id": notification_id,
            "member_id": member_id,
            "church_id": church_id
        },
        {
            "$set": {
                "is_read": True,
                "read_at": datetime.utcnow()
            }
        }
    )

    if result.modified_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Notification not found"
        )

    return None


# ===========================
# ADMIN: SEND NOTIFICATIONS
# ===========================

@router.post("/send", status_code=status.HTTP_202_ACCEPTED)
async def send_push_notification(
    request: SendNotificationRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Send push notification to multiple members (admin only).

    Used by admin to send announcements or alerts.
    """
    church_id = get_session_church_id(current_user)

    fcm = get_fcm_service()

    # Send notifications
    results = await fcm.send_to_multiple_members(
        db=db,
        member_ids=request.member_ids,
        church_id=church_id,
        title=request.title,
        body=request.body,
        notification_type=request.notification_type,
        data=request.data
    )

    logger.info(f"Bulk notification sent: {results['sent']} sent, {results['failed']} failed")

    return {
        "success": True,
        "message": f"Notifications sent to {results['sent']} members",
        "results": results
    }
