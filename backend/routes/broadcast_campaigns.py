"""
Broadcast Campaign API Routes.

Handles CRUD operations for broadcast campaigns, sending, scheduling, and analytics.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime, timedelta
import logging
import uuid
import re

from models.broadcast_campaign import (
    BroadcastCampaignCreate,
    BroadcastCampaignUpdate,
    BroadcastCampaign,
    BroadcastCampaignResponse,
    BroadcastCampaignListResponse,
    AudienceEstimateRequest,
    AudienceEstimateResponse,
    BroadcastAnalyticsSummary,
    SendCampaignResponse,
    DeliveryStats,
)
import pytz
from utils.dependencies import get_db, get_current_user, get_session_church_id, require_admin
from services.broadcast_service import get_broadcast_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/broadcasts", tags=["Broadcasts"])


# =============================================================================
# CAMPAIGN CRUD
# =============================================================================

@router.get("/", response_model=BroadcastCampaignListResponse)
async def list_campaigns(
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in title/body"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List broadcast campaigns with filtering and pagination.

    Query params:
    - status: draft, scheduled, sending, sent, cancelled, failed
    - search: Search term for title/body
    - limit, offset: Pagination
    """
    church_id = get_session_church_id(current_user)

    # Build query
    query = {"church_id": church_id}

    if status:
        query["status"] = status

    if search:
        # Escape special regex characters to prevent regex injection
        escaped_search = re.escape(search)
        query["$or"] = [
            {"title": {"$regex": escaped_search, "$options": "i"}},
            {"body": {"$regex": escaped_search, "$options": "i"}}
        ]

    # Get total count
    total = await db.broadcast_campaigns.count_documents(query)

    # Get campaigns with pagination
    campaigns = await db.broadcast_campaigns.find(query).sort(
        "created_at", -1
    ).skip(offset).limit(limit).to_list(limit)

    # Clean up _id
    for c in campaigns:
        c.pop("_id", None)

    return {
        "data": campaigns,
        "total": total,
        "limit": limit,
        "offset": offset
    }


@router.get("/{campaign_id}", response_model=BroadcastCampaignResponse)
async def get_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get a single campaign by ID."""
    church_id = get_session_church_id(current_user)

    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    campaign.pop("_id", None)
    return campaign


@router.post("/", response_model=BroadcastCampaignResponse, status_code=status.HTTP_201_CREATED)
async def create_campaign(
    campaign_data: BroadcastCampaignCreate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Create a new broadcast campaign.

    Campaign is created in 'draft' status.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    # Create campaign document
    campaign = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "title": campaign_data.title,
        "body": campaign_data.body,
        "image_url": campaign_data.image_url,
        "image_fid": campaign_data.image_fid,
        "action_type": campaign_data.action_type,
        "action_data": campaign_data.action_data,
        "audience": campaign_data.audience.model_dump(),
        "send_type": campaign_data.send_type,
        "scheduled_at": campaign_data.scheduled_at,
        "scheduled_timezone": campaign_data.scheduled_timezone,
        "notification_type": campaign_data.notification_type,
        "priority": campaign_data.priority,
        "status": "draft",
        "stats": DeliveryStats().model_dump(),
        "failed_recipients": [],
        "error_message": None,
        "created_by": user_id,
        "updated_by": None,
        "sent_by": None,
        "sent_at": None,
        "cancelled_at": None,
        "cancelled_by": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await db.broadcast_campaigns.insert_one(campaign)
    campaign.pop("_id", None)

    logger.info(f"Campaign created: {campaign['id']} by {user_id}")
    return campaign


@router.put("/{campaign_id}", response_model=BroadcastCampaignResponse)
async def update_campaign(
    campaign_id: str,
    campaign_data: BroadcastCampaignUpdate,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Update an existing campaign.

    Only draft and scheduled campaigns can be updated.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    # Get existing campaign
    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    # Check if can be updated
    if campaign["status"] not in ["draft", "scheduled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot update campaign with status '{campaign['status']}'"
        )

    # Build update data
    update_data = {"updated_at": datetime.utcnow(), "updated_by": user_id}

    for field, value in campaign_data.dict(exclude_unset=True).items():
        if value is not None:
            if field == "audience":
                update_data["audience"] = value
            else:
                update_data[field] = value

    await db.broadcast_campaigns.update_one(
        {"id": campaign_id, "church_id": church_id},
        {"$set": update_data}
    )

    # Get updated campaign
    updated = await db.broadcast_campaigns.find_one({"id": campaign_id, "church_id": church_id})
    updated.pop("_id", None)

    logger.info(f"Campaign updated: {campaign_id} by {user_id}")
    return updated


@router.delete("/{campaign_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete a campaign.

    Only draft campaigns can be deleted.
    """
    church_id = get_session_church_id(current_user)

    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    if campaign["status"] != "draft":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only draft campaigns can be deleted"
        )

    await db.broadcast_campaigns.delete_one({"id": campaign_id, "church_id": church_id})
    logger.info(f"Campaign deleted: {campaign_id}")
    return None


# =============================================================================
# CAMPAIGN ACTIONS
# =============================================================================

@router.post("/{campaign_id}/send", response_model=SendCampaignResponse)
async def send_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Send or schedule a campaign.

    If send_type is 'immediate', sends now.
    If send_type is 'scheduled', validates scheduled_at and updates status.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    if campaign["status"] not in ["draft", "scheduled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot send campaign with status '{campaign['status']}'"
        )

    broadcast_service = get_broadcast_service()

    if campaign.get("send_type") == "scheduled":
        # Validate scheduled_at
        scheduled_at = campaign.get("scheduled_at")
        if not scheduled_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="scheduled_at is required for scheduled campaigns"
            )

        # Ensure it's in the future (at least 1 minute)
        if isinstance(scheduled_at, str):
            scheduled_at = datetime.fromisoformat(scheduled_at.replace("Z", "+00:00"))

        if scheduled_at <= datetime.utcnow() + timedelta(minutes=1):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="scheduled_at must be at least 1 minute in the future"
            )

        # Update status to scheduled
        await db.broadcast_campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "status": "scheduled",
                    "updated_by": user_id,
                    "updated_at": datetime.utcnow()
                }
            }
        )

        logger.info(f"Campaign scheduled: {campaign_id} for {scheduled_at}")

        return {
            "success": True,
            "message": f"Campaign scheduled for {scheduled_at.isoformat()}",
            "campaign_id": campaign_id,
            "status": "scheduled",
            "stats": None
        }

    else:
        # Send immediately
        result = await broadcast_service.send_campaign(db, campaign_id, user_id)

        return {
            "success": result["success"],
            "message": result["message"],
            "campaign_id": campaign_id,
            "status": "sent" if result["success"] else "failed",
            "stats": DeliveryStats(**result["stats"]) if result.get("stats") else None
        }


@router.post("/{campaign_id}/cancel", response_model=SendCampaignResponse)
async def cancel_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Cancel a scheduled campaign."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    if campaign["status"] != "scheduled":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only scheduled campaigns can be cancelled"
        )

    await db.broadcast_campaigns.update_one(
        {"id": campaign_id},
        {
            "$set": {
                "status": "cancelled",
                "cancelled_at": datetime.utcnow(),
                "cancelled_by": user_id,
                "updated_at": datetime.utcnow()
            }
        }
    )

    logger.info(f"Campaign cancelled: {campaign_id} by {user_id}")

    return {
        "success": True,
        "message": "Campaign cancelled successfully",
        "campaign_id": campaign_id,
        "status": "cancelled",
        "stats": None
    }


@router.post("/{campaign_id}/duplicate", response_model=BroadcastCampaignResponse)
async def duplicate_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Create a copy of an existing campaign as a new draft."""
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    # Create duplicate
    new_campaign = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "title": f"{campaign['title']} (Copy)",
        "body": campaign["body"],
        "image_url": campaign.get("image_url"),
        "image_fid": campaign.get("image_fid"),
        "action_type": campaign.get("action_type", "none"),
        "action_data": campaign.get("action_data"),
        "audience": campaign.get("audience", {}),
        "send_type": "immediate",  # Reset to immediate
        "scheduled_at": None,  # Clear schedule
        "notification_type": campaign.get("notification_type", "announcement"),
        "priority": campaign.get("priority", "normal"),
        "status": "draft",
        "stats": DeliveryStats().model_dump(),
        "failed_recipients": [],
        "error_message": None,
        "created_by": user_id,
        "updated_by": None,
        "sent_by": None,
        "sent_at": None,
        "cancelled_at": None,
        "cancelled_by": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow()
    }

    await db.broadcast_campaigns.insert_one(new_campaign)
    new_campaign.pop("_id", None)

    logger.info(f"Campaign duplicated: {campaign_id} -> {new_campaign['id']}")
    return new_campaign


@router.post("/{campaign_id}/test")
async def test_send_campaign(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Send a test notification to the admin's device.

    Useful for previewing notifications before broadcasting.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    broadcast_service = get_broadcast_service()

    result = await broadcast_service.send_test_notification(
        db=db,
        campaign_id=campaign_id,
        admin_member_id=user_id,
        church_id=church_id
    )

    if not result["success"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["message"]
        )

    return result


# =============================================================================
# IMAGE UPLOAD
# =============================================================================

@router.post("/{campaign_id}/upload-image", status_code=status.HTTP_201_CREATED)
async def upload_campaign_image(
    campaign_id: str,
    file: UploadFile = File(...),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Upload an image for the campaign notification.

    Stores in SeaweedFS.
    """
    church_id = get_session_church_id(current_user)

    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    if campaign["status"] not in ["draft", "scheduled"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot upload image for sent/cancelled campaigns"
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/gif", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}"
        )

    # Upload to SeaweedFS
    try:
        from services.seaweedfs_service import upload_file

        file_content = await file.read()
        file_path = f"faithflow/{church_id}/broadcasts/{campaign_id}/{file.filename}"

        result = await upload_file(
            file_content=file_content,
            file_path=file_path,
            content_type=file.content_type
        )

        # Update campaign with image URL
        await db.broadcast_campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "image_url": result["public_url"],
                    "image_fid": result["fid"],
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return {
            "success": True,
            "image_url": result["public_url"],
            "fid": result["fid"]
        }

    except Exception as e:
        logger.error(f"Failed to upload campaign image: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload image: {str(e)}"
        )


@router.delete("/{campaign_id}/image", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campaign_image(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Remove the image from a campaign."""
    church_id = get_session_church_id(current_user)

    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    # Delete from SeaweedFS if fid exists
    if campaign.get("image_fid"):
        try:
            from services.seaweedfs_service import delete_file
            await delete_file(campaign["image_fid"])
        except Exception as e:
            logger.warning(f"Failed to delete image from SeaweedFS: {e}")

    # Clear image fields
    await db.broadcast_campaigns.update_one(
        {"id": campaign_id},
        {
            "$set": {
                "image_url": None,
                "image_fid": None,
                "updated_at": datetime.utcnow()
            }
        }
    )

    return None


# =============================================================================
# TIMEZONES
# =============================================================================

# Common timezones grouped by region for UI convenience
COMMON_TIMEZONES = {
    "Asia": [
        "Asia/Jakarta",
        "Asia/Singapore",
        "Asia/Makassar",
        "Asia/Jayapura",
        "Asia/Tokyo",
        "Asia/Seoul",
        "Asia/Shanghai",
        "Asia/Hong_Kong",
        "Asia/Manila",
        "Asia/Bangkok",
        "Asia/Kolkata",
        "Asia/Dubai",
    ],
    "Americas": [
        "America/New_York",
        "America/Chicago",
        "America/Denver",
        "America/Los_Angeles",
        "America/Toronto",
        "America/Sao_Paulo",
        "America/Mexico_City",
    ],
    "Europe": [
        "Europe/London",
        "Europe/Paris",
        "Europe/Berlin",
        "Europe/Rome",
        "Europe/Amsterdam",
        "Europe/Moscow",
    ],
    "Pacific": [
        "Australia/Sydney",
        "Australia/Melbourne",
        "Pacific/Auckland",
        "Pacific/Honolulu",
    ],
    "UTC": ["UTC"],
}


@router.get("/timezones")
async def get_timezones(
    current_user: dict = Depends(require_admin)
):
    """
    Get list of common timezones for scheduling.

    Returns timezones grouped by region with their current UTC offsets.
    """
    now = datetime.utcnow()
    result = {}

    for region, zones in COMMON_TIMEZONES.items():
        result[region] = []
        for tz_name in zones:
            try:
                tz = pytz.timezone(tz_name)
                offset = tz.utcoffset(now)
                hours = int(offset.total_seconds() // 3600)
                minutes = int((offset.total_seconds() % 3600) // 60)
                offset_str = f"UTC{hours:+d}" if minutes == 0 else f"UTC{hours:+d}:{minutes:02d}"

                result[region].append({
                    "value": tz_name,
                    "label": tz_name.replace("_", " "),
                    "offset": offset_str,
                    "offset_seconds": int(offset.total_seconds())
                })
            except Exception:
                continue

    return {"timezones": result}


# =============================================================================
# AUDIENCE ESTIMATION
# =============================================================================

@router.post("/estimate-audience", response_model=AudienceEstimateResponse)
async def estimate_audience(
    request: AudienceEstimateRequest,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Estimate audience size for given targeting criteria.

    Returns:
    - total_members: Members matching criteria
    - with_push_enabled: Members with push notifications enabled
    - with_active_devices: Members with registered devices
    """
    church_id = get_session_church_id(current_user)

    broadcast_service = get_broadcast_service()
    result = await broadcast_service.estimate_audience(db, church_id, request.audience)

    return result


# =============================================================================
# ANALYTICS
# =============================================================================

@router.get("/analytics/summary", response_model=BroadcastAnalyticsSummary)
async def get_analytics_summary(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get analytics summary for broadcast campaigns.
    """
    church_id = get_session_church_id(current_user)

    broadcast_service = get_broadcast_service()
    result = await broadcast_service.get_analytics_summary(db, church_id, days)

    return result


@router.get("/{campaign_id}/analytics")
async def get_campaign_analytics(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get detailed analytics for a specific campaign.

    Returns comprehensive delivery and engagement metrics including:
    - Delivery stats (sent, delivered, failed)
    - Engagement stats (opened, read)
    - Delivery timeline with hourly breakdown
    - Failed recipients details
    """
    church_id = get_session_church_id(current_user)

    broadcast_service = get_broadcast_service()
    result = await broadcast_service.get_campaign_analytics(db, campaign_id, church_id)

    if not result.get("success", True):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=result.get("message", "Campaign not found")
        )

    return result


@router.post("/{campaign_id}/retry")
async def retry_failed_notifications(
    campaign_id: str,
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Retry sending to all failed recipients of a campaign.

    This endpoint will:
    1. Find all failed push notification records for this campaign
    2. Attempt to resend to each failed recipient
    3. Update delivery status based on retry results

    Returns the number of successful retries and updated stats.
    """
    church_id = get_session_church_id(current_user)

    campaign = await db.broadcast_campaigns.find_one({
        "id": campaign_id,
        "church_id": church_id
    })

    if not campaign:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Campaign not found"
        )

    if campaign["status"] not in ["sent", "failed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Can only retry campaigns that have been sent"
        )

    broadcast_service = get_broadcast_service()
    result = await broadcast_service.retry_failed_notifications(db, campaign_id, church_id)

    return result


# =============================================================================
# BULK ACTIONS
# =============================================================================

@router.post("/bulk/delete", status_code=status.HTTP_200_OK)
async def bulk_delete_campaigns(
    campaign_ids: List[str],
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Bulk delete draft campaigns.

    Only drafts can be deleted. Other statuses will be skipped.
    """
    church_id = get_session_church_id(current_user)

    # Find all drafts among provided IDs
    drafts = await db.broadcast_campaigns.find({
        "id": {"$in": campaign_ids},
        "church_id": church_id,
        "status": "draft"
    }).to_list(len(campaign_ids))

    draft_ids = [c["id"] for c in drafts]

    if not draft_ids:
        return {
            "success": True,
            "deleted_count": 0,
            "skipped_count": len(campaign_ids),
            "message": "No draft campaigns found to delete"
        }

    # Delete drafts
    result = await db.broadcast_campaigns.delete_many({
        "id": {"$in": draft_ids},
        "church_id": church_id
    })

    deleted_count = result.deleted_count
    skipped_count = len(campaign_ids) - deleted_count

    logger.info(f"Bulk deleted {deleted_count} campaigns, skipped {skipped_count}")

    return {
        "success": True,
        "deleted_count": deleted_count,
        "skipped_count": skipped_count,
        "deleted_ids": draft_ids,
        "message": f"Deleted {deleted_count} campaigns"
    }


@router.post("/bulk/archive", status_code=status.HTTP_200_OK)
async def bulk_archive_campaigns(
    campaign_ids: List[str],
    current_user: dict = Depends(require_admin),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Bulk archive sent/cancelled campaigns.

    Sets archived flag to true for soft archival.
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user.get("sub")

    # Find archivable campaigns (sent, cancelled, failed)
    archivable = await db.broadcast_campaigns.find({
        "id": {"$in": campaign_ids},
        "church_id": church_id,
        "status": {"$in": ["sent", "cancelled", "failed"]},
        "archived": {"$ne": True}
    }).to_list(len(campaign_ids))

    archivable_ids = [c["id"] for c in archivable]

    if not archivable_ids:
        return {
            "success": True,
            "archived_count": 0,
            "skipped_count": len(campaign_ids),
            "message": "No campaigns found to archive"
        }

    # Archive campaigns
    result = await db.broadcast_campaigns.update_many(
        {
            "id": {"$in": archivable_ids},
            "church_id": church_id
        },
        {
            "$set": {
                "archived": True,
                "archived_at": datetime.utcnow(),
                "archived_by": user_id
            }
        }
    )

    archived_count = result.modified_count
    skipped_count = len(campaign_ids) - archived_count

    logger.info(f"Bulk archived {archived_count} campaigns, skipped {skipped_count}")

    return {
        "success": True,
        "archived_count": archived_count,
        "skipped_count": skipped_count,
        "archived_ids": archivable_ids,
        "message": f"Archived {archived_count} campaigns"
    }
