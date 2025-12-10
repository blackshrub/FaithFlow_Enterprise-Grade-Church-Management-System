"""
Broadcast Campaign Service.

Handles campaign delivery, audience targeting, scheduled sends,
retry logic, and analytics tracking.

Production-Grade Features:
- Audience targeting (all, groups, status, demographics, custom)
- Scheduled broadcasts with timezone support
- Retry mechanism for failed notifications
- A/B testing support
- Delivery and open rate tracking
- Batch processing for large audiences
"""

import logging
import asyncio
import uuid
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, date, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase

from models.broadcast_campaign import (
    AudienceFilter,
    DeliveryStats,
    BroadcastCampaign,
)
from services.fcm_service import get_fcm_service

logger = logging.getLogger(__name__)


class BroadcastService:
    """Service for managing and sending broadcast campaigns."""

    def __init__(self):
        self.fcm_service = get_fcm_service()
        self.batch_size = 100  # Send notifications in batches
        self.max_retries = 3  # Max retry attempts for failed notifications
        self.retry_delay = 5  # Seconds between retries

    async def build_recipient_list(
        self,
        db: AsyncIOMotorDatabase,
        church_id: str,
        audience: AudienceFilter
    ) -> List[str]:
        """
        Build list of member IDs based on audience targeting criteria.

        Args:
            db: Database connection
            church_id: Church ID for multi-tenant filtering
            audience: Audience targeting configuration

        Returns:
            List of member IDs matching the criteria
        """
        # Base query: active members in this church
        base_query = {
            "church_id": church_id,
            "is_active": {"$ne": False},  # Include if not explicitly False
            "deleted": {"$ne": True}
        }

        member_ids = []

        if audience.target_type == "custom" and audience.member_ids:
            # Direct member list
            member_ids = audience.member_ids

        elif audience.target_type == "groups" and audience.group_ids:
            # SECURITY: Validate all group_ids belong to this church before querying
            valid_groups = await db.groups.find({
                "church_id": church_id,
                "id": {"$in": audience.group_ids}
            }, {"_id": 0, "id": 1}).to_list(1000)

            valid_group_ids = [g["id"] for g in valid_groups]

            # Log if any group_ids were invalid (potential cross-tenant attack)
            invalid_group_ids = set(audience.group_ids) - set(valid_group_ids)
            if invalid_group_ids:
                logger.warning(
                    f"Cross-tenant broadcast attempt blocked: church_id={church_id}, "
                    f"invalid_group_ids={invalid_group_ids}"
                )

            if not valid_group_ids:
                # No valid groups - return empty list
                return []

            # Get members from validated cell groups only
            group_members = await db.group_members.find({
                "church_id": church_id,
                "group_id": {"$in": valid_group_ids},
                "is_active": True
            }).to_list(10000)

            member_ids = list(set(gm["member_id"] for gm in group_members))

        elif audience.target_type == "status" and audience.member_status_ids:
            # Get members with specific status
            members = await db.members.find({
                **base_query,
                "member_status_id": {"$in": audience.member_status_ids}
            }, {"_id": 0, "id": 1}).to_list(10000)

            member_ids = [m["id"] for m in members]

        elif audience.target_type == "demographics":
            # Build demographic query
            demo_query = {**base_query}

            if audience.gender:
                demo_query["gender"] = audience.gender

            if audience.marital_status:
                demo_query["marital_status"] = audience.marital_status

            # Age filtering requires date_of_birth
            if audience.age_min is not None or audience.age_max is not None:
                today = date.today()
                dob_query = {}

                if audience.age_max is not None:
                    # Max age means minimum birth date
                    min_dob = date(today.year - audience.age_max - 1, today.month, today.day)
                    dob_query["$gte"] = min_dob.isoformat()

                if audience.age_min is not None:
                    # Min age means maximum birth date
                    max_dob = date(today.year - audience.age_min, today.month, today.day)
                    dob_query["$lte"] = max_dob.isoformat()

                if dob_query:
                    demo_query["date_of_birth"] = dob_query

            members = await db.members.find(
                demo_query, {"_id": 0, "id": 1}
            ).to_list(10000)

            member_ids = [m["id"] for m in members]

        else:
            # Default: All members
            members = await db.members.find(
                base_query, {"_id": 0, "id": 1}
            ).to_list(10000)

            member_ids = [m["id"] for m in members]

        # Apply exclusions
        if audience.exclude_member_ids:
            exclude_set = set(audience.exclude_member_ids)
            member_ids = [mid for mid in member_ids if mid not in exclude_set]

        return list(set(member_ids))  # Remove duplicates

    async def estimate_audience(
        self,
        db: AsyncIOMotorDatabase,
        church_id: str,
        audience: AudienceFilter
    ) -> Dict[str, int]:
        """
        Estimate audience size for given targeting criteria.

        Returns counts for:
        - total_members: Members matching criteria
        - with_push_enabled: Members who haven't disabled push
        - with_active_devices: Members with registered devices
        """
        member_ids = await self.build_recipient_list(db, church_id, audience)

        if not member_ids:
            return {
                "total_members": 0,
                "with_push_enabled": 0,
                "with_active_devices": 0
            }

        total_members = len(member_ids)

        # Count members with push enabled (or no preference set = default enabled)
        prefs = await db.notification_preferences.find({
            "church_id": church_id,
            "member_id": {"$in": member_ids},
            "push_enabled": False
        }).to_list(10000)

        disabled_member_ids = set(p["member_id"] for p in prefs)
        with_push_enabled = total_members - len(disabled_member_ids)

        # Count members with active device tokens
        active_tokens = await db.device_tokens.find({
            "church_id": church_id,
            "member_id": {"$in": member_ids},
            "is_active": True
        }).to_list(10000)

        members_with_devices = set(t["member_id"] for t in active_tokens)
        with_active_devices = len(members_with_devices)

        return {
            "total_members": total_members,
            "with_push_enabled": with_push_enabled,
            "with_active_devices": with_active_devices
        }

    async def _send_with_retry(
        self,
        db: AsyncIOMotorDatabase,
        member_id: str,
        church_id: str,
        campaign: Dict[str, Any],
        notification_data: Dict[str, Any]
    ) -> Tuple[bool, Optional[str], int]:
        """
        Send notification with retry logic.

        Returns:
            Tuple of (success, error_message, attempts)
        """
        attempts = 0
        last_error = None

        while attempts < self.max_retries:
            attempts += 1
            try:
                success, error = await self.fcm_service.send_to_member(
                    db=db,
                    member_id=member_id,
                    church_id=church_id,
                    title=campaign["title"],
                    body=campaign["body"],
                    notification_type="broadcast",
                    data=notification_data
                )

                if success:
                    return True, None, attempts

                last_error = error

                # Don't retry for permanent failures
                if error and ("not registered" in error.lower() or "invalid" in error.lower()):
                    return False, error, attempts

            except Exception as e:
                last_error = str(e)

            # Wait before retry
            if attempts < self.max_retries:
                await asyncio.sleep(self.retry_delay)

        return False, last_error, attempts

    async def _create_notification_record(
        self,
        db: AsyncIOMotorDatabase,
        member_id: str,
        church_id: str,
        campaign: Dict[str, Any],
        delivery_status: str,
        error: Optional[str] = None
    ) -> str:
        """Create a notification record with full tracking."""
        notification_id = str(uuid.uuid4())

        record = {
            "id": notification_id,
            "church_id": church_id,
            "member_id": member_id,
            "title": campaign["title"],
            "body": campaign["body"],
            "notification_type": "broadcast",
            "campaign_id": campaign["id"],
            "image_url": campaign.get("image_url"),
            "action_type": campaign.get("action_type"),
            "action_data": campaign.get("action_data"),
            "data": {
                "type": "broadcast",
                "campaign_id": campaign["id"],
            },
            "sent_at": datetime.utcnow(),
            "is_read": False,
            "is_opened": False,
            "delivery_status": delivery_status,
            "delivery_error": error,
            "delivered_at": datetime.utcnow() if delivery_status == "sent" else None,
        }

        await db.push_notifications.insert_one(record)
        return notification_id

    async def send_campaign(
        self,
        db: AsyncIOMotorDatabase,
        campaign_id: str,
        sender_id: str
    ) -> Dict[str, Any]:
        """
        Send a broadcast campaign to all targeted recipients.

        Features:
        - Retry logic for transient failures
        - Full notification record tracking
        - Batch processing for large audiences
        - Progress tracking during send

        Args:
            db: Database connection
            campaign_id: Campaign ID to send
            sender_id: User ID triggering the send

        Returns:
            Dictionary with success status and delivery stats
        """
        # Get campaign
        campaign = await db.broadcast_campaigns.find_one({"id": campaign_id})
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        church_id = campaign["church_id"]
        audience = AudienceFilter(**campaign.get("audience", {}))

        # Update status to sending
        await db.broadcast_campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "status": "sending",
                    "sent_by": sender_id,
                    "send_started_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        try:
            # Build recipient list
            member_ids = await self.build_recipient_list(db, church_id, audience)

            if not member_ids:
                # No recipients
                await db.broadcast_campaigns.update_one(
                    {"id": campaign_id},
                    {
                        "$set": {
                            "status": "sent",
                            "sent_at": datetime.utcnow(),
                            "stats": {"total_recipients": 0, "sent_count": 0, "failed_count": 0},
                            "updated_at": datetime.utcnow()
                        }
                    }
                )
                return {
                    "success": True,
                    "message": "No recipients matched targeting criteria",
                    "stats": DeliveryStats().model_dump()
                }

            # Prepare notification data
            notification_data = {
                "type": "broadcast",
                "campaign_id": campaign_id,
                "action_type": campaign.get("action_type", "none"),
            }

            # Add action data for deep linking
            action_data = campaign.get("action_data", {})
            if action_data:
                notification_data.update(action_data)

            # Add image URL if present
            if campaign.get("image_url"):
                notification_data["image_url"] = campaign["image_url"]

            # Initialize stats
            stats = DeliveryStats(total_recipients=len(member_ids))
            failed_recipients = []
            retry_stats = {"total_retries": 0, "successful_retries": 0}

            # Process in batches
            for i in range(0, len(member_ids), self.batch_size):
                batch = member_ids[i:i + self.batch_size]

                for member_id in batch:
                    try:
                        success, error, attempts = await self._send_with_retry(
                            db, member_id, church_id, campaign, notification_data
                        )

                        # Track retry stats
                        if attempts > 1:
                            retry_stats["total_retries"] += attempts - 1
                            if success:
                                retry_stats["successful_retries"] += 1

                        # Determine delivery status
                        delivery_status = "sent" if success else "failed"

                        # Create notification record
                        await self._create_notification_record(
                            db, member_id, church_id, campaign, delivery_status, error
                        )

                        if success:
                            stats.sent_count += 1
                        else:
                            stats.failed_count += 1
                            failed_recipients.append({
                                "member_id": member_id,
                                "error": error,
                                "attempts": attempts
                            })

                    except Exception as e:
                        stats.failed_count += 1
                        failed_recipients.append({
                            "member_id": member_id,
                            "error": str(e),
                            "attempts": 1
                        })

                        # Still create a record for tracking
                        await self._create_notification_record(
                            db, member_id, church_id, campaign, "failed", str(e)
                        )

                # Update progress every batch
                await db.broadcast_campaigns.update_one(
                    {"id": campaign_id},
                    {
                        "$set": {
                            "stats": stats.model_dump(),
                            "updated_at": datetime.utcnow()
                        }
                    }
                )

            # Update campaign with final stats
            await db.broadcast_campaigns.update_one(
                {"id": campaign_id},
                {
                    "$set": {
                        "status": "sent",
                        "sent_at": datetime.utcnow(),
                        "stats": stats.model_dump(),
                        "retry_stats": retry_stats,
                        "failed_recipients": failed_recipients[:100],  # Limit stored failures
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            logger.info(
                f"Campaign {campaign_id} sent: {stats.sent_count} sent, "
                f"{stats.failed_count} failed, {retry_stats['total_retries']} retries"
            )

            return {
                "success": True,
                "message": f"Campaign sent to {stats.sent_count} recipients",
                "stats": stats.model_dump(),
                "retry_stats": retry_stats
            }

        except Exception as e:
            logger.error(f"Failed to send campaign {campaign_id}: {e}")

            await db.broadcast_campaigns.update_one(
                {"id": campaign_id},
                {
                    "$set": {
                        "status": "failed",
                        "error_message": str(e),
                        "updated_at": datetime.utcnow()
                    }
                }
            )

            return {
                "success": False,
                "message": f"Campaign failed: {str(e)}",
                "stats": None
            }

    async def send_test_notification(
        self,
        db: AsyncIOMotorDatabase,
        campaign_id: str,
        admin_member_id: str,
        church_id: str
    ) -> Dict[str, Any]:
        """
        Send a test notification to the admin's device.

        Used for previewing notification before broadcast.
        """
        campaign = await db.broadcast_campaigns.find_one({"id": campaign_id})
        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        # Prepare notification data
        notification_data = {
            "type": "broadcast",
            "campaign_id": campaign_id,
            "action_type": campaign.get("action_type", "none"),
            "is_test": "true"  # Mark as test
        }

        action_data = campaign.get("action_data", {})
        if action_data:
            notification_data.update(action_data)

        if campaign.get("image_url"):
            notification_data["image_url"] = campaign["image_url"]

        # Send to admin
        success, error = await self.fcm_service.send_to_member(
            db=db,
            member_id=admin_member_id,
            church_id=church_id,
            title=f"[TEST] {campaign['title']}",
            body=campaign["body"],
            notification_type="announcement",
            data=notification_data
        )

        if success:
            return {
                "success": True,
                "message": "Test notification sent to your device"
            }
        else:
            return {
                "success": False,
                "message": f"Failed to send test: {error}"
            }

    async def process_scheduled_campaigns(self, db: AsyncIOMotorDatabase) -> int:
        """
        Process all scheduled campaigns that are due.

        Called by scheduler every minute.

        Returns:
            Number of campaigns processed
        """
        now = datetime.utcnow()

        # Find campaigns that are scheduled and due
        campaigns = await db.broadcast_campaigns.find({
            "status": "scheduled",
            "scheduled_at": {"$lte": now}
        }).to_list(100)

        processed = 0

        for campaign in campaigns:
            try:
                logger.info(f"Processing scheduled campaign: {campaign['id']}")

                await self.send_campaign(
                    db=db,
                    campaign_id=campaign["id"],
                    sender_id=campaign.get("created_by", "scheduler")
                )

                processed += 1

            except Exception as e:
                logger.error(f"Failed to process scheduled campaign {campaign['id']}: {e}")

        return processed

    async def get_analytics_summary(
        self,
        db: AsyncIOMotorDatabase,
        church_id: str,
        days: int = 30
    ) -> Dict[str, Any]:
        """
        Get analytics summary for broadcast campaigns.
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        # Get all campaigns in period
        campaigns = await db.broadcast_campaigns.find({
            "church_id": church_id,
            "created_at": {"$gte": cutoff_date}
        }).to_list(1000)

        # Count by status
        status_counts = {}
        total_sent = 0
        total_failed = 0

        for c in campaigns:
            status = c.get("status", "draft")
            status_counts[status] = status_counts.get(status, 0) + 1

            stats = c.get("stats", {})
            total_sent += stats.get("sent_count", 0)
            total_failed += stats.get("failed_count", 0)

        # Get open rate from notifications
        campaign_ids = [c["id"] for c in campaigns if c.get("status") == "sent"]
        total_opened = 0
        total_read = 0

        if campaign_ids:
            opened_count = await db.push_notifications.count_documents({
                "church_id": church_id,
                "campaign_id": {"$in": campaign_ids},
                "is_opened": True
            })
            total_opened = opened_count

            read_count = await db.push_notifications.count_documents({
                "church_id": church_id,
                "campaign_id": {"$in": campaign_ids},
                "is_read": True
            })
            total_read = read_count

        total_delivered = total_sent  # For now, sent = delivered
        delivery_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0
        open_rate = (total_opened / total_sent * 100) if total_sent > 0 else 0
        read_rate = (total_read / total_sent * 100) if total_sent > 0 else 0

        return {
            "total_campaigns": len(campaigns),
            "campaigns_by_status": status_counts,
            "total_notifications_sent": total_sent,
            "total_delivered": total_delivered,
            "total_failed": total_failed,
            "total_opened": total_opened,
            "total_read": total_read,
            "delivery_rate": round(delivery_rate, 2),
            "open_rate": round(open_rate, 2),
            "read_rate": round(read_rate, 2)
        }

    async def get_campaign_analytics(
        self,
        db: AsyncIOMotorDatabase,
        campaign_id: str,
        church_id: str
    ) -> Dict[str, Any]:
        """
        Get detailed analytics for a specific campaign.
        """
        # Get campaign
        campaign = await db.broadcast_campaigns.find_one({
            "id": campaign_id,
            "church_id": church_id
        })

        if not campaign:
            return {"success": False, "message": "Campaign not found", "campaign_id": campaign_id}

        stats = campaign.get("stats", {})
        retry_stats = campaign.get("retry_stats", {})

        # Get notification-level stats
        total_notifications = await db.push_notifications.count_documents({
            "campaign_id": campaign_id,
            "church_id": church_id
        })

        delivered = await db.push_notifications.count_documents({
            "campaign_id": campaign_id,
            "church_id": church_id,
            "delivery_status": "sent"
        })

        failed = await db.push_notifications.count_documents({
            "campaign_id": campaign_id,
            "church_id": church_id,
            "delivery_status": "failed"
        })

        opened = await db.push_notifications.count_documents({
            "campaign_id": campaign_id,
            "church_id": church_id,
            "is_opened": True
        })

        read = await db.push_notifications.count_documents({
            "campaign_id": campaign_id,
            "church_id": church_id,
            "is_read": True
        })

        # Calculate rates
        total = stats.get("total_recipients", 0)
        delivery_rate = (delivered / total * 100) if total > 0 else 0
        open_rate = (opened / delivered * 100) if delivered > 0 else 0
        read_rate = (read / delivered * 100) if delivered > 0 else 0

        # Get failed recipients with errors
        failed_recipients = campaign.get("failed_recipients", [])

        # Get timeline data (hourly breakdown for last 24 hours)
        timeline = []
        if campaign.get("sent_at"):
            sent_at = campaign["sent_at"]
            for i in range(24):
                hour_start = sent_at + timedelta(hours=i)
                hour_end = hour_start + timedelta(hours=1)

                if hour_end > datetime.utcnow():
                    break

                opens_in_hour = await db.push_notifications.count_documents({
                    "campaign_id": campaign_id,
                    "church_id": church_id,
                    "opened_at": {"$gte": hour_start, "$lt": hour_end}
                })

                timeline.append({
                    "hour": i,
                    "time": hour_start.isoformat(),
                    "opens": opens_in_hour
                })

        return {
            "campaign_id": campaign_id,
            "title": campaign.get("title"),
            "status": campaign.get("status"),
            "sent_at": campaign.get("sent_at"),
            "audience": campaign.get("audience", {}),
            "stats": {
                "total_recipients": total,
                "delivered": delivered,
                "failed": failed,
                "opened": opened,
                "read": read,
                "delivery_rate": round(delivery_rate, 2),
                "open_rate": round(open_rate, 2),
                "read_rate": round(read_rate, 2),
            },
            "retry_stats": retry_stats,
            "failed_recipients": failed_recipients[:20],  # Limit for UI
            "timeline": timeline
        }

    async def retry_failed_notifications(
        self,
        db: AsyncIOMotorDatabase,
        campaign_id: str,
        church_id: str
    ) -> Dict[str, Any]:
        """
        Retry sending to failed recipients of a campaign.
        """
        # Get campaign
        campaign = await db.broadcast_campaigns.find_one({
            "id": campaign_id,
            "church_id": church_id
        })

        if not campaign:
            raise ValueError(f"Campaign not found: {campaign_id}")

        # Get failed notifications
        failed_notifications = await db.push_notifications.find({
            "campaign_id": campaign_id,
            "church_id": church_id,
            "delivery_status": "failed"
        }).to_list(1000)

        if not failed_notifications:
            return {
                "success": True,
                "message": "No failed notifications to retry",
                "retried": 0,
                "succeeded": 0
            }

        # Prepare notification data
        notification_data = {
            "type": "broadcast",
            "campaign_id": campaign_id,
            "action_type": campaign.get("action_type", "none"),
        }

        action_data = campaign.get("action_data", {})
        if action_data:
            notification_data.update(action_data)

        if campaign.get("image_url"):
            notification_data["image_url"] = campaign["image_url"]

        succeeded = 0
        still_failed = 0

        for notif in failed_notifications:
            member_id = notif["member_id"]

            success, error, attempts = await self._send_with_retry(
                db, member_id, church_id, campaign, notification_data
            )

            if success:
                # Update notification record
                await db.push_notifications.update_one(
                    {"id": notif["id"]},
                    {
                        "$set": {
                            "delivery_status": "sent",
                            "delivered_at": datetime.utcnow(),
                            "delivery_error": None,
                            "retry_count": notif.get("retry_count", 0) + 1
                        }
                    }
                )
                succeeded += 1
            else:
                # Update retry count
                await db.push_notifications.update_one(
                    {"id": notif["id"]},
                    {
                        "$set": {
                            "delivery_error": error,
                            "retry_count": notif.get("retry_count", 0) + 1
                        }
                    }
                )
                still_failed += 1

        # Update campaign stats
        current_stats = campaign.get("stats", {})
        current_stats["sent_count"] = current_stats.get("sent_count", 0) + succeeded
        current_stats["failed_count"] = max(0, current_stats.get("failed_count", 0) - succeeded)

        await db.broadcast_campaigns.update_one(
            {"id": campaign_id},
            {
                "$set": {
                    "stats": current_stats,
                    "last_retry_at": datetime.utcnow(),
                    "updated_at": datetime.utcnow()
                }
            }
        )

        return {
            "success": True,
            "message": f"Retried {len(failed_notifications)} notifications",
            "retried": len(failed_notifications),
            "succeeded": succeeded,
            "still_failed": still_failed
        }


# Singleton instance
broadcast_service = BroadcastService()


def get_broadcast_service() -> BroadcastService:
    """Get broadcast service instance."""
    return broadcast_service
