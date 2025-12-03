"""
Community Messages API Routes

Endpoints for sending, receiving, and managing messages in community channels.

Routes:
- GET  /v1/communities/{id}/messages - Get messages (paginated)
- POST /v1/communities/{id}/messages - Send message
- PUT  /v1/messages/{id} - Edit message
- DELETE /v1/messages/{id} - Delete message
- POST /v1/messages/{id}/react - Add/remove reaction
- POST /v1/messages/{id}/read - Mark as read
- GET  /v1/communities/{id}/messages/search - Search messages

Mobile Routes (member auth):
- GET  /mobile/communities/{id}/messages
- POST /mobile/communities/{id}/messages
- PUT  /mobile/messages/{id}
- DELETE /mobile/messages/{id}
- POST /mobile/messages/{id}/react
- POST /mobile/messages/{id}/read
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Form
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List
from datetime import datetime, timedelta
import uuid
import re
import logging

from models.community_message import (
    CommunityMessage,
    CommunityMessageCreate,
    CommunityMessageUpdate,
    MessageListResponse,
    MessageSendResponse,
    MessageMedia,
    MessageLocation,
    ReplyPreview,
    ReadReceipt,
    ChannelType,
    create_system_message,
    SystemMessageData
)
from utils.dependencies import get_db, get_current_user, get_current_member
from utils.tenant_utils import get_session_church_id_from_user
from services.mqtt_service import get_mqtt, MQTTService
from services.seaweedfs_service import get_seaweedfs, SeaweedFSService
from services.fcm_service import send_push_notification

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1", tags=["Community Messages"])
mobile_router = APIRouter(prefix="/mobile", tags=["Mobile Community Messages"])


# ============================================================================
# Helper Functions
# ============================================================================

async def get_community_or_404(
    db: AsyncIOMotorDatabase,
    community_id: str,
    church_id: str
) -> dict:
    """Get community or raise 404."""
    community = await db.communities.find_one({
        "id": community_id,
        "church_id": church_id
    })
    if not community:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Community not found"
        )
    return community


async def check_membership(
    db: AsyncIOMotorDatabase,
    community_id: str,
    member_id: str,
    church_id: str
) -> dict:
    """Check if member is part of community."""
    membership = await db.community_memberships.find_one({
        "community_id": community_id,
        "member_id": member_id,
        "church_id": church_id,
        "status": "active"
    })
    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You are not a member of this community"
        )
    return membership


async def can_send_message(
    community: dict,
    membership: dict,
    channel_type: str
) -> bool:
    """Check if member can send messages based on community settings."""
    settings = community.get("settings", {})
    role = membership.get("role", "member")

    if channel_type == "announcement":
        # Only leaders can post announcements (unless settings allow all)
        who_can_announce = settings.get("who_can_announce", "leaders_only")
        if who_can_announce == "leaders_only" and role not in ["leader", "admin"]:
            return False

    # Check general message permission
    who_can_send = settings.get("who_can_send_messages", "all_members")
    if who_can_send == "leaders_only" and role not in ["leader", "admin"]:
        return False

    return True


def extract_mentions(text: str) -> tuple[List[str], bool]:
    """
    Extract @mentions from message text.

    Returns:
        Tuple of (mentioned_member_ids, mentions_everyone)
    """
    if not text:
        return [], False

    mentions_everyone = "@everyone" in text.lower()

    # Extract @member_id mentions (format: @[member-uuid])
    member_ids = re.findall(r'@\[([a-f0-9-]+)\]', text)

    return member_ids, mentions_everyone


async def get_member_info(db: AsyncIOMotorDatabase, member_id: str, church_id: str) -> dict:
    """Get member's display info."""
    member = await db.members.find_one(
        {"id": member_id, "church_id": church_id},
        {"full_name": 1, "photo": 1}
    )
    if member:
        return {
            "name": member.get("full_name", "Unknown"),
            "avatar_fid": member.get("photo")
        }
    return {"name": "Unknown", "avatar_fid": None}


# ============================================================================
# Admin Routes (for web dashboard)
# ============================================================================

@router.get("/communities/{community_id}/messages", response_model=MessageListResponse)
async def get_messages(
    community_id: str,
    channel_type: ChannelType = Query("general", description="Channel type"),
    subgroup_id: Optional[str] = Query(None, description="Subgroup ID"),
    before: Optional[str] = Query(None, description="Get messages before this message ID"),
    after: Optional[str] = Query(None, description="Get messages after this message ID"),
    limit: int = Query(50, ge=1, le=100, description="Number of messages to fetch"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get messages from a community channel.
    Paginated using cursor-based pagination (before/after message ID).
    """
    church_id = get_session_church_id_from_user(current_user)

    # Verify community exists
    await get_community_or_404(db, community_id, church_id)

    # Build query
    query = {
        "church_id": church_id,
        "community_id": community_id,
        "channel_type": channel_type,
        "is_deleted": {"$ne": True}
    }

    if subgroup_id:
        query["subgroup_id"] = subgroup_id

    # Cursor pagination
    if before:
        before_msg = await db.community_messages.find_one({"id": before})
        if before_msg:
            query["created_at"] = {"$lt": before_msg["created_at"]}

    if after:
        after_msg = await db.community_messages.find_one({"id": after})
        if after_msg:
            query["created_at"] = {"$gt": after_msg["created_at"]}

    # Get total count
    total = await db.community_messages.count_documents({
        "church_id": church_id,
        "community_id": community_id,
        "channel_type": channel_type,
        "is_deleted": {"$ne": True}
    })

    # Fetch messages (newest first for 'before', oldest first for 'after')
    sort_order = -1 if not after else 1
    cursor = db.community_messages.find(query, {"_id": 0}).sort("created_at", sort_order).limit(limit + 1)
    messages = await cursor.to_list(length=limit + 1)

    has_more = len(messages) > limit
    messages = messages[:limit]

    # Reverse if we fetched oldest first
    if after:
        messages.reverse()

    return MessageListResponse(
        messages=[CommunityMessage(**m) for m in messages],
        total=total,
        has_more=has_more,
        oldest_message_id=messages[-1]["id"] if messages else None,
        newest_message_id=messages[0]["id"] if messages else None
    )


@router.post("/communities/{community_id}/messages", response_model=MessageSendResponse)
async def send_message(
    community_id: str,
    message_data: CommunityMessageCreate,
    channel_type: ChannelType = Query("general"),
    subgroup_id: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """
    Send a message to a community channel (admin/staff).
    """
    church_id = get_session_church_id_from_user(current_user)

    # Verify community
    community = await get_community_or_404(db, community_id, church_id)

    # Get sender info (admin/staff user)
    sender_name = current_user.get("full_name", current_user.get("email", "Admin"))
    sender_id = current_user.get("id", "admin")

    # Build message
    mentioned_ids, mentions_everyone = extract_mentions(message_data.text)

    message = CommunityMessage(
        id=str(uuid.uuid4()),
        church_id=church_id,
        community_id=community_id,
        channel_type=channel_type,
        subgroup_id=subgroup_id,
        sender_member_id=sender_id,
        sender_name=sender_name,
        sender_avatar_fid=None,
        message_type=message_data.message_type,
        text=message_data.text,
        media=message_data.media,
        location=message_data.location,
        mentioned_member_ids=mentioned_ids,
        mentions_everyone=mentions_everyone,
        created_at=datetime.utcnow()
    )

    # Handle reply
    if message_data.reply_to_message_id:
        original = await db.community_messages.find_one({"id": message_data.reply_to_message_id})
        if original:
            message.reply_to_message_id = original["id"]
            message.reply_to_preview = ReplyPreview(
                message_id=original["id"],
                sender_id=original["sender_member_id"],
                sender_name=original["sender_name"],
                text_preview=(original.get("text") or "")[:100],
                media_type=original.get("media", {}).get("mime_type") if original.get("media") else None
            )

    # Store in MongoDB
    await db.community_messages.insert_one(message.model_dump(mode='json'))

    # Publish to MQTT
    mqtt_published = await mqtt.publish_message(
        church_id=church_id,
        community_id=community_id,
        message=message.model_dump(mode='json'),
        channel_type=channel_type,
        subgroup_id=subgroup_id
    )

    return MessageSendResponse(message=message, mqtt_published=mqtt_published)


@router.put("/messages/{message_id}", response_model=CommunityMessage)
async def edit_message(
    message_id: str,
    update: CommunityMessageUpdate,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Edit a message (text only)."""
    church_id = get_session_church_id_from_user(current_user)

    # Get message
    message = await db.community_messages.find_one({
        "id": message_id,
        "church_id": church_id
    })

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Only sender can edit (or admin)
    if message["sender_member_id"] != current_user.get("id") and current_user.get("role") != "super_admin":
        raise HTTPException(status_code=403, detail="Cannot edit others' messages")

    # Update message
    await db.community_messages.update_one(
        {"id": message_id},
        {
            "$set": {
                "text": update.text,
                "is_edited": True,
                "edited_at": datetime.utcnow()
            }
        }
    )

    # Publish update to MQTT
    await mqtt.publish_message_update(
        church_id=church_id,
        community_id=message["community_id"],
        message_id=message_id,
        update_type="edit",
        data={"text": update.text, "edited_at": datetime.utcnow().isoformat()},
        subgroup_id=message.get("subgroup_id")
    )

    # Return updated message
    updated = await db.community_messages.find_one({"id": message_id}, {"_id": 0})
    return CommunityMessage(**updated)


@router.delete("/messages/{message_id}")
async def delete_message(
    message_id: str,
    for_everyone: bool = Query(False, description="Delete for all members"),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Delete a message."""
    church_id = get_session_church_id_from_user(current_user)

    message = await db.community_messages.find_one({
        "id": message_id,
        "church_id": church_id
    })

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Check permission
    is_sender = message["sender_member_id"] == current_user.get("id")
    is_admin = current_user.get("role") in ["super_admin", "admin"]

    if not is_sender and not is_admin:
        raise HTTPException(status_code=403, detail="Cannot delete others' messages")

    # Update message
    await db.community_messages.update_one(
        {"id": message_id},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": datetime.utcnow(),
                "deleted_for_everyone": for_everyone,
                "text": None if for_everyone else message.get("text"),
                "media": None if for_everyone else message.get("media")
            }
        }
    )

    # Publish to MQTT
    await mqtt.publish_message_update(
        church_id=church_id,
        community_id=message["community_id"],
        message_id=message_id,
        update_type="delete",
        data={"deleted_for_everyone": for_everyone},
        subgroup_id=message.get("subgroup_id")
    )

    return {"success": True, "message": "Message deleted"}


# ============================================================================
# Mobile Routes (member auth)
# ============================================================================

@mobile_router.get("/communities/{community_id}/messages", response_model=MessageListResponse)
async def mobile_get_messages(
    community_id: str,
    channel_type: ChannelType = Query("general"),
    subgroup_id: Optional[str] = Query(None),
    before: Optional[str] = Query(None),
    after: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get messages for mobile app (authenticated member)."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Verify community and membership
    community = await get_community_or_404(db, community_id, church_id)
    await check_membership(db, community_id, member_id, church_id)

    # Build query
    query = {
        "church_id": church_id,
        "community_id": community_id,
        "channel_type": channel_type,
        "is_deleted": {"$ne": True}
    }

    if subgroup_id:
        query["subgroup_id"] = subgroup_id

    if before:
        before_msg = await db.community_messages.find_one({"id": before})
        if before_msg:
            query["created_at"] = {"$lt": before_msg["created_at"]}

    if after:
        after_msg = await db.community_messages.find_one({"id": after})
        if after_msg:
            query["created_at"] = {"$gt": after_msg["created_at"]}

    total = await db.community_messages.count_documents({
        "church_id": church_id,
        "community_id": community_id,
        "channel_type": channel_type,
        "is_deleted": {"$ne": True}
    })

    sort_order = -1 if not after else 1
    cursor = db.community_messages.find(query, {"_id": 0}).sort("created_at", sort_order).limit(limit + 1)
    messages = await cursor.to_list(length=limit + 1)

    has_more = len(messages) > limit
    messages = messages[:limit]

    if after:
        messages.reverse()

    return MessageListResponse(
        messages=[CommunityMessage(**m) for m in messages],
        total=total,
        has_more=has_more,
        oldest_message_id=messages[-1]["id"] if messages else None,
        newest_message_id=messages[0]["id"] if messages else None
    )


@mobile_router.post("/communities/{community_id}/messages", response_model=MessageSendResponse)
async def mobile_send_message(
    community_id: str,
    message_data: CommunityMessageCreate,
    channel_type: ChannelType = Query("general"),
    subgroup_id: Optional[str] = Query(None),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Send a message from mobile app."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Verify community and membership
    community = await get_community_or_404(db, community_id, church_id)
    membership = await check_membership(db, community_id, member_id, church_id)

    # Check permission
    if not await can_send_message(community, membership, channel_type):
        raise HTTPException(
            status_code=403,
            detail="You don't have permission to send messages in this channel"
        )

    # Get sender info
    sender_info = await get_member_info(db, member_id, church_id)

    # Extract mentions
    mentioned_ids, mentions_everyone = extract_mentions(message_data.text)

    # Build message
    message = CommunityMessage(
        id=str(uuid.uuid4()),
        church_id=church_id,
        community_id=community_id,
        channel_type=channel_type,
        subgroup_id=subgroup_id,
        sender_member_id=member_id,
        sender_name=sender_info["name"],
        sender_avatar_fid=sender_info["avatar_fid"],
        message_type=message_data.message_type,
        text=message_data.text,
        media=message_data.media,
        location=message_data.location,
        mentioned_member_ids=mentioned_ids,
        mentions_everyone=mentions_everyone,
        created_at=datetime.utcnow()
    )

    # Handle reply
    if message_data.reply_to_message_id:
        original = await db.community_messages.find_one({"id": message_data.reply_to_message_id})
        if original:
            message.reply_to_message_id = original["id"]
            message.reply_to_preview = ReplyPreview(
                message_id=original["id"],
                sender_id=original["sender_member_id"],
                sender_name=original["sender_name"],
                text_preview=(original.get("text") or "")[:100],
                media_type=original.get("media", {}).get("mime_type") if original.get("media") else None
            )

    # Store in MongoDB
    await db.community_messages.insert_one(message.model_dump(mode='json'))

    # Publish to MQTT
    mqtt_published = await mqtt.publish_message(
        church_id=church_id,
        community_id=community_id,
        message=message.model_dump(mode='json'),
        channel_type=channel_type,
        subgroup_id=subgroup_id
    )

    # TODO: Send push notifications to mentioned members and offline members

    return MessageSendResponse(message=message, mqtt_published=mqtt_published)


@mobile_router.post("/messages/{message_id}/react")
async def mobile_react_to_message(
    message_id: str,
    emoji: str = Query(..., max_length=10, description="Emoji reaction"),
    action: str = Query("add", regex="^(add|remove)$"),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Add or remove reaction from a message."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get message
    message = await db.community_messages.find_one({
        "id": message_id,
        "church_id": church_id
    })

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Verify membership
    await check_membership(db, message["community_id"], member_id, church_id)

    # Get sender info
    sender_info = await get_member_info(db, member_id, church_id)

    # Update reactions
    if action == "add":
        await db.community_messages.update_one(
            {"id": message_id},
            {"$addToSet": {f"reactions.{emoji}": member_id}}
        )
    else:
        await db.community_messages.update_one(
            {"id": message_id},
            {"$pull": {f"reactions.{emoji}": member_id}}
        )

    # Publish to MQTT
    await mqtt.publish_reaction(
        church_id=church_id,
        community_id=message["community_id"],
        message_id=message_id,
        member_id=member_id,
        member_name=sender_info["name"],
        emoji=emoji,
        action=action
    )

    return {"success": True, "action": action, "emoji": emoji}


@mobile_router.post("/messages/{message_id}/read")
async def mobile_mark_as_read(
    message_id: str,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Mark a message as read."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    message = await db.community_messages.find_one({
        "id": message_id,
        "church_id": church_id
    })

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Get member info
    sender_info = await get_member_info(db, member_id, church_id)

    # Update read receipts (limit to 50 for performance)
    read_receipt = {
        "member_id": member_id,
        "member_name": sender_info["name"],
        "read_at": datetime.utcnow()
    }

    # Only add if not already read by this member
    await db.community_messages.update_one(
        {
            "id": message_id,
            "read_by.member_id": {"$ne": member_id}
        },
        {
            "$push": {
                "read_by": {
                    "$each": [read_receipt],
                    "$slice": -50  # Keep last 50 receipts
                }
            },
            "$inc": {"read_count": 1}
        }
    )

    # Publish to MQTT
    await mqtt.publish_read_receipt(
        church_id=church_id,
        community_id=message["community_id"],
        member_id=member_id,
        message_id=message_id,
        subgroup_id=message.get("subgroup_id")
    )

    return {"success": True}


@mobile_router.put("/messages/{message_id}", response_model=CommunityMessage)
async def mobile_edit_message(
    message_id: str,
    update: CommunityMessageUpdate,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Edit own message."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    message = await db.community_messages.find_one({
        "id": message_id,
        "church_id": church_id
    })

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message["sender_member_id"] != member_id:
        raise HTTPException(status_code=403, detail="Can only edit your own messages")

    # Update
    await db.community_messages.update_one(
        {"id": message_id},
        {
            "$set": {
                "text": update.text,
                "is_edited": True,
                "edited_at": datetime.utcnow()
            }
        }
    )

    # Publish to MQTT
    await mqtt.publish_message_update(
        church_id=church_id,
        community_id=message["community_id"],
        message_id=message_id,
        update_type="edit",
        data={"text": update.text, "edited_at": datetime.utcnow().isoformat()},
        subgroup_id=message.get("subgroup_id")
    )

    updated = await db.community_messages.find_one({"id": message_id}, {"_id": 0})
    return CommunityMessage(**updated)


@mobile_router.delete("/messages/{message_id}")
async def mobile_delete_message(
    message_id: str,
    for_everyone: bool = Query(False),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Delete own message."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    message = await db.community_messages.find_one({
        "id": message_id,
        "church_id": church_id
    })

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    if message["sender_member_id"] != member_id:
        raise HTTPException(status_code=403, detail="Can only delete your own messages")

    await db.community_messages.update_one(
        {"id": message_id},
        {
            "$set": {
                "is_deleted": True,
                "deleted_at": datetime.utcnow(),
                "deleted_for_everyone": for_everyone,
                "text": None if for_everyone else message.get("text"),
                "media": None if for_everyone else message.get("media")
            }
        }
    )

    await mqtt.publish_message_update(
        church_id=church_id,
        community_id=message["community_id"],
        message_id=message_id,
        update_type="delete",
        data={"deleted_for_everyone": for_everyone},
        subgroup_id=message.get("subgroup_id")
    )

    return {"success": True}


@mobile_router.post("/communities/{community_id}/typing")
async def mobile_typing_indicator(
    community_id: str,
    is_typing: bool = Query(True),
    subgroup_id: Optional[str] = Query(None),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Send typing indicator."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Verify membership
    await check_membership(db, community_id, member_id, church_id)

    sender_info = await get_member_info(db, member_id, church_id)

    await mqtt.publish_typing_indicator(
        church_id=church_id,
        community_id=community_id,
        member_id=member_id,
        member_name=sender_info["name"],
        is_typing=is_typing,
        subgroup_id=subgroup_id
    )

    return {"success": True}


# ============================================================================
# Message Search Routes
# ============================================================================

@mobile_router.get("/communities/{community_id}/messages/search")
async def mobile_search_messages(
    community_id: str,
    query: str = Query(..., min_length=2, max_length=100, description="Search query"),
    limit: int = Query(20, ge=1, le=50),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Search messages in a community.
    Searches in message text content.
    """
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Verify membership
    await check_membership(db, community_id, member_id, church_id)

    # Build search query with text index or regex
    search_query = {
        "church_id": church_id,
        "community_id": community_id,
        "is_deleted": {"$ne": True},
        "text": {"$regex": query, "$options": "i"}
    }

    # Fetch messages
    cursor = db.community_messages.find(
        search_query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)

    messages = await cursor.to_list(length=limit)

    return {
        "messages": [CommunityMessage(**m) for m in messages],
        "total": len(messages),
        "query": query
    }


@router.get("/communities/{community_id}/messages/search")
async def admin_search_messages(
    community_id: str,
    query: str = Query(..., min_length=2, max_length=100),
    limit: int = Query(20, ge=1, le=50),
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Search messages (admin route)."""
    church_id = get_session_church_id_from_user(current_user)

    search_query = {
        "church_id": church_id,
        "community_id": community_id,
        "is_deleted": {"$ne": True},
        "text": {"$regex": query, "$options": "i"}
    }

    cursor = db.community_messages.find(
        search_query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)

    messages = await cursor.to_list(length=limit)

    return {
        "messages": [CommunityMessage(**m) for m in messages],
        "total": len(messages),
        "query": query
    }


# ============================================================================
# Poll Routes
# ============================================================================

@mobile_router.post("/communities/{community_id}/polls")
async def mobile_create_poll(
    community_id: str,
    question: str = Form(..., max_length=200),
    options: str = Form(..., description="JSON array of option strings"),
    allow_multiple: bool = Form(False),
    is_anonymous: bool = Form(False),
    duration_hours: Optional[int] = Form(None),
    channel_type: ChannelType = Query("general"),
    subgroup_id: Optional[str] = Query(None),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Create a poll in a community."""
    import json

    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Parse options
    try:
        option_list = json.loads(options)
        if not isinstance(option_list, list) or len(option_list) < 2:
            raise HTTPException(status_code=400, detail="Poll must have at least 2 options")
        if len(option_list) > 10:
            raise HTTPException(status_code=400, detail="Poll can have at most 10 options")
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid options format")

    # Verify community and membership
    community = await get_community_or_404(db, community_id, church_id)
    membership = await check_membership(db, community_id, member_id, church_id)

    # Get sender info
    sender_info = await get_member_info(db, member_id, church_id)

    # Build poll options
    poll_options = [
        {
            "id": str(uuid.uuid4()),
            "text": opt.strip(),
            "vote_count": 0,
            "voters": []
        }
        for opt in option_list
    ]

    # Build poll object
    poll_id = str(uuid.uuid4())
    poll = {
        "id": poll_id,
        "question": question.strip(),
        "options": poll_options,
        "total_votes": 0,
        "allow_multiple": allow_multiple,
        "is_anonymous": is_anonymous,
        "expires_at": (datetime.utcnow() + timedelta(hours=duration_hours)).isoformat() if duration_hours else None,
        "created_by": {
            "id": member_id,
            "name": sender_info["name"]
        },
        "created_at": datetime.utcnow().isoformat()
    }

    # Build message with poll
    message = CommunityMessage(
        id=str(uuid.uuid4()),
        church_id=church_id,
        community_id=community_id,
        channel_type=channel_type,
        subgroup_id=subgroup_id,
        sender_member_id=member_id,
        sender_name=sender_info["name"],
        sender_avatar_fid=sender_info["avatar_fid"],
        message_type="poll",
        text=None,
        poll=poll,
        created_at=datetime.utcnow()
    )

    # Store in MongoDB
    await db.community_messages.insert_one(message.model_dump(mode='json'))

    # Publish to MQTT
    mqtt_published = await mqtt.publish_message(
        church_id=church_id,
        community_id=community_id,
        message=message.model_dump(mode='json'),
        channel_type=channel_type,
        subgroup_id=subgroup_id
    )

    return {"message": message, "poll_id": poll_id, "mqtt_published": mqtt_published}


@mobile_router.post("/polls/{message_id}/vote")
async def mobile_vote_poll(
    message_id: str,
    option_id: str = Query(..., description="Option ID to vote for"),
    action: str = Query("add", regex="^(add|remove)$"),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Vote on a poll option."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get message with poll
    message = await db.community_messages.find_one({
        "id": message_id,
        "church_id": church_id,
        "message_type": "poll"
    })

    if not message:
        raise HTTPException(status_code=404, detail="Poll not found")

    poll = message.get("poll", {})

    # Check if poll is expired
    if poll.get("expires_at"):
        expires = datetime.fromisoformat(poll["expires_at"].replace("Z", "+00:00"))
        if datetime.utcnow() > expires:
            raise HTTPException(status_code=400, detail="Poll has expired")

    # Verify membership
    await check_membership(db, message["community_id"], member_id, church_id)

    # Find option
    option_idx = None
    for idx, opt in enumerate(poll.get("options", [])):
        if opt["id"] == option_id:
            option_idx = idx
            break

    if option_idx is None:
        raise HTTPException(status_code=404, detail="Option not found")

    # Check if already voted (for single-choice polls)
    if not poll.get("allow_multiple") and action == "add":
        # Remove existing votes first
        for idx, opt in enumerate(poll.get("options", [])):
            if member_id in opt.get("voters", []):
                await db.community_messages.update_one(
                    {"id": message_id},
                    {
                        "$pull": {f"poll.options.{idx}.voters": member_id},
                        "$inc": {
                            f"poll.options.{idx}.vote_count": -1,
                            "poll.total_votes": -1
                        }
                    }
                )

    # Update vote
    if action == "add":
        await db.community_messages.update_one(
            {"id": message_id},
            {
                "$addToSet": {f"poll.options.{option_idx}.voters": member_id},
                "$inc": {
                    f"poll.options.{option_idx}.vote_count": 1,
                    "poll.total_votes": 1
                }
            }
        )
    else:
        await db.community_messages.update_one(
            {"id": message_id},
            {
                "$pull": {f"poll.options.{option_idx}.voters": member_id},
                "$inc": {
                    f"poll.options.{option_idx}.vote_count": -1,
                    "poll.total_votes": -1
                }
            }
        )

    # Get updated poll
    updated_message = await db.community_messages.find_one({"id": message_id}, {"_id": 0})

    # Publish update to MQTT
    await mqtt.publish_message_update(
        church_id=church_id,
        community_id=message["community_id"],
        message_id=message_id,
        update_type="poll_vote",
        data={
            "option_id": option_id,
            "action": action,
            "poll": updated_message.get("poll")
        },
        subgroup_id=message.get("subgroup_id")
    )

    return {"success": True, "poll": updated_message.get("poll")}


# ============================================================================
# Community Settings Routes (Mobile)
# ============================================================================

@mobile_router.patch("/communities/{community_id}/settings")
async def mobile_update_community_settings(
    community_id: str,
    settings: dict,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Update community settings (leaders only)."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Verify community
    community = await get_community_or_404(db, community_id, church_id)

    # Verify membership and role
    membership = await check_membership(db, community_id, member_id, church_id)

    if membership.get("role") not in ["leader", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only leaders can update community settings"
        )

    # Allowed settings fields (must match CommunitySettings model)
    allowed_fields = {
        "allow_member_create_subgroups", "subgroup_requires_approval",
        "allow_announcement_replies", "who_can_announce",
        "who_can_send_messages", "allow_media_sharing",
        "allow_polls", "allow_events",
        "show_member_list", "show_online_status", "show_read_receipts"
    }

    # Filter to allowed fields only
    filtered_settings = {k: v for k, v in settings.items() if k in allowed_fields}

    if not filtered_settings:
        raise HTTPException(status_code=400, detail="No valid settings provided")

    # Update settings (merge with existing)
    await db.communities.update_one(
        {"id": community_id, "church_id": church_id},
        {"$set": {f"settings.{k}": v for k, v in filtered_settings.items()}}
    )

    # Get updated community
    updated = await db.communities.find_one(
        {"id": community_id},
        {"_id": 0, "settings": 1}
    )

    return {"success": True, "settings": updated.get("settings", {})}


# ============================================================================
# Message Starring Routes
# ============================================================================

@mobile_router.post("/messages/{message_id}/star")
async def mobile_star_message(
    message_id: str,
    action: str = Query("add", regex="^(add|remove)$"),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Star or unstar a message for the current member."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get message
    message = await db.community_messages.find_one({
        "id": message_id,
        "church_id": church_id
    })

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")

    # Verify membership
    await check_membership(db, message["community_id"], member_id, church_id)

    # Update starred_by array
    if action == "add":
        await db.community_messages.update_one(
            {"id": message_id},
            {"$addToSet": {"starred_by": member_id}}
        )
    else:
        await db.community_messages.update_one(
            {"id": message_id},
            {"$pull": {"starred_by": member_id}}
        )

    return {"success": True, "action": action, "message_id": message_id}


@mobile_router.get("/starred-messages")
async def mobile_get_starred_messages(
    community_id: Optional[str] = Query(None, description="Filter by community"),
    limit: int = Query(50, ge=1, le=100),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get all starred messages for the current member."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    query = {
        "church_id": church_id,
        "starred_by": member_id,
        "is_deleted": {"$ne": True}
    }

    if community_id:
        query["community_id"] = community_id

    cursor = db.community_messages.find(
        query,
        {"_id": 0}
    ).sort("created_at", -1).limit(limit)

    messages = await cursor.to_list(length=limit)

    return {
        "messages": [CommunityMessage(**m) for m in messages],
        "total": len(messages)
    }


# ============================================================================
# Message Forwarding Routes
# ============================================================================

@mobile_router.post("/messages/{message_id}/forward")
async def mobile_forward_message(
    message_id: str,
    target_community_ids: List[str] = Query(..., description="Community IDs to forward to"),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db),
    mqtt: MQTTService = Depends(get_mqtt)
):
    """Forward a message to one or more communities."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Get original message
    original = await db.community_messages.find_one({
        "id": message_id,
        "church_id": church_id
    })

    if not original:
        raise HTTPException(status_code=404, detail="Message not found")

    # Verify membership in original community
    await check_membership(db, original["community_id"], member_id, church_id)

    # Get sender info
    sender_info = await get_member_info(db, member_id, church_id)

    # Get original community name
    original_community = await db.communities.find_one(
        {"id": original["community_id"]},
        {"name": 1}
    )
    original_community_name = original_community.get("name", "Unknown") if original_community else "Unknown"

    forwarded_messages = []

    for target_community_id in target_community_ids:
        # Verify membership in target community
        try:
            await check_membership(db, target_community_id, member_id, church_id)
        except HTTPException:
            continue  # Skip communities where member is not a member

        # Create forwarded message
        forwarded = CommunityMessage(
            id=str(uuid.uuid4()),
            church_id=church_id,
            community_id=target_community_id,
            channel_type="general",
            sender_member_id=member_id,
            sender_name=sender_info["name"],
            sender_avatar_fid=sender_info["avatar_fid"],
            message_type=original.get("message_type", "text"),
            text=original.get("text"),
            media=original.get("media"),
            location=original.get("location"),
            is_forwarded=True,
            forwarded_from_community_id=original["community_id"],
            forwarded_from_community_name=original_community_name,
            created_at=datetime.utcnow()
        )

        # Store in MongoDB
        await db.community_messages.insert_one(forwarded.model_dump(mode='json'))

        # Publish to MQTT
        await mqtt.publish_message(
            church_id=church_id,
            community_id=target_community_id,
            message=forwarded.model_dump(mode='json'),
            channel_type="general"
        )

        forwarded_messages.append(forwarded)

    return {
        "success": True,
        "forwarded_count": len(forwarded_messages),
        "messages": forwarded_messages
    }


# ============================================================================
# Disappearing Messages Routes
# ============================================================================

@mobile_router.patch("/communities/{community_id}/disappearing-messages")
async def mobile_set_disappearing_messages(
    community_id: str,
    duration: Optional[str] = Query(None, regex="^(off|24h|7d|90d)$", description="Disappearing duration"),
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Set disappearing messages setting for a community."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Verify community exists
    community = await get_community_or_404(db, community_id, church_id)

    # Verify membership and role (only leaders can change this)
    membership = await check_membership(db, community_id, member_id, church_id)

    if membership.get("role") not in ["leader", "admin"]:
        raise HTTPException(
            status_code=403,
            detail="Only leaders can change disappearing messages setting"
        )

    # Calculate expiration duration in seconds
    duration_map = {
        "off": None,
        "24h": 24 * 60 * 60,         # 24 hours
        "7d": 7 * 24 * 60 * 60,      # 7 days
        "90d": 90 * 24 * 60 * 60     # 90 days
    }

    expiration_seconds = duration_map.get(duration)

    # Update community settings
    await db.communities.update_one(
        {"id": community_id, "church_id": church_id},
        {
            "$set": {
                "settings.disappearing_messages": duration,
                "settings.disappearing_messages_seconds": expiration_seconds
            }
        }
    )

    # If enabled, schedule existing messages for deletion (background task)
    # This would typically be handled by a scheduled job

    return {
        "success": True,
        "community_id": community_id,
        "disappearing_messages": duration
    }


@mobile_router.get("/communities/{community_id}/disappearing-messages")
async def mobile_get_disappearing_messages_setting(
    community_id: str,
    current_member: dict = Depends(get_current_member),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """Get disappearing messages setting for a community."""
    member_id = current_member.get("id")
    church_id = current_member.get("church_id")

    # Verify membership
    await check_membership(db, community_id, member_id, church_id)

    # Get community settings
    community = await db.communities.find_one(
        {"id": community_id, "church_id": church_id},
        {"_id": 0, "settings.disappearing_messages": 1, "settings.disappearing_messages_seconds": 1}
    )

    if not community:
        raise HTTPException(status_code=404, detail="Community not found")

    settings = community.get("settings", {})

    return {
        "community_id": community_id,
        "disappearing_messages": settings.get("disappearing_messages", "off"),
        "disappearing_messages_seconds": settings.get("disappearing_messages_seconds")
    }
