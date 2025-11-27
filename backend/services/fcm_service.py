"""
Firebase Cloud Messaging (FCM) Service for Push Notifications.

Integrates with Expo Push Notifications for React Native mobile app.
"""

import logging
from typing import List, Dict, Optional, Any
import httpx
from datetime import datetime

logger = logging.getLogger(__name__)


class FCMService:
    """
    Firebase Cloud Messaging service using Expo Push Notifications.

    Expo provides a unified API for both iOS and Android push notifications.
    """

    def __init__(self):
        """Initialize FCM service with Expo Push API."""
        self.expo_push_url = "https://exp.host/--/api/v2/push/send"
        self.timeout = 30.0

    async def send_push_notification(
        self,
        expo_tokens: List[str],
        title: str,
        body: str,
        data: Optional[Dict[str, Any]] = None,
        sound: str = "default",
        badge: Optional[int] = None,
        channel_id: str = "default"
    ) -> tuple[bool, Optional[str]]:
        """
        Send push notification via Expo Push Service.

        Args:
            expo_tokens: List of Expo push tokens (e.g., ExponentPushToken[...])
            title: Notification title
            body: Notification body
            data: Custom data payload
            sound: Sound to play ("default" or None)
            badge: Badge count (iOS)
            channel_id: Android notification channel

        Returns:
            Tuple of (success, error_message)
        """
        if not expo_tokens:
            return False, "No push tokens provided"

        try:
            # Build Expo push message
            # Format: https://docs.expo.dev/push-notifications/sending-notifications/
            messages = []

            for token in expo_tokens:
                message = {
                    "to": token,
                    "title": title,
                    "body": body,
                    "sound": sound,
                    "priority": "high"
                }

                if data:
                    message["data"] = data

                if badge is not None:
                    message["badge"] = badge

                if channel_id:
                    message["channelId"] = channel_id

                messages.append(message)

            # Send to Expo Push API
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.post(
                    self.expo_push_url,
                    json=messages,
                    headers={"Content-Type": "application/json"}
                )

                if response.status_code == 200:
                    result = response.json()

                    # Check for errors in response
                    errors = []
                    for item in result.get("data", []):
                        if item.get("status") == "error":
                            errors.append(item.get("message", "Unknown error"))

                    if errors:
                        logger.error(f"Expo Push errors: {errors}")
                        return False, f"Push notification errors: {', '.join(errors)}"

                    logger.info(f"Push notifications sent successfully to {len(expo_tokens)} devices")
                    return True, None

                else:
                    error_msg = f"Expo Push API error: {response.status_code}"
                    logger.error(error_msg)
                    return False, error_msg

        except httpx.TimeoutException:
            logger.error("Expo Push API timeout")
            return False, "Push notification timeout"

        except Exception as e:
            logger.error(f"Push notification error: {e}")
            return False, str(e)

    async def send_to_member(
        self,
        db,
        member_id: str,
        church_id: str,
        title: str,
        body: str,
        notification_type: str = "general",
        data: Optional[Dict[str, Any]] = None
    ) -> tuple[bool, Optional[str]]:
        """
        Send push notification to a specific member.

        Gets all active device tokens for the member and sends notification.

        Args:
            db: Database connection
            member_id: Member ID
            church_id: Church ID
            title: Notification title
            body: Notification body
            notification_type: Type of notification
            data: Custom data

        Returns:
            Tuple of (success, error_message)
        """
        try:
            # Get member's active device tokens
            tokens = await db.device_tokens.find({
                "member_id": member_id,
                "church_id": church_id,
                "is_active": True
            }).to_list(10)  # Max 10 devices per member

            if not tokens:
                logger.info(f"No active devices for member {member_id}")
                return False, "No active devices"

            # Check notification preferences
            prefs = await db.notification_preferences.find_one({
                "member_id": member_id,
                "church_id": church_id
            })

            if prefs and not prefs.get("push_enabled", True):
                logger.info(f"Push notifications disabled for member {member_id}")
                return False, "Push notifications disabled"

            # Check type-specific preferences
            type_pref_map = {
                "event": "events_enabled",
                "community": "communities_enabled",  # New community notifications
                "group": "communities_enabled",      # Legacy alias for backward compatibility
                "prayer": "prayers_enabled",
                "devotion": "devotions_enabled",
                "announcement": "announcements_enabled",
                "giving": "giving_receipts_enabled"
            }

            pref_key = type_pref_map.get(notification_type)
            if pref_key and prefs and not prefs.get(pref_key, True):
                logger.info(f"{notification_type} notifications disabled for member {member_id}")
                return False, f"{notification_type} notifications disabled"

            # Extract FCM tokens
            fcm_tokens = [t["fcm_token"] for t in tokens]

            # Send push notification
            success, error = await self.send_push_notification(
                expo_tokens=fcm_tokens,
                title=title,
                body=body,
                data=data or {},
                channel_id=notification_type
            )

            if success:
                # Save notification record
                notification_record = {
                    "id": str(uuid.uuid4()),
                    "church_id": church_id,
                    "member_id": member_id,
                    "title": title,
                    "body": body,
                    "data": data,
                    "notification_type": notification_type,
                    "sent_at": datetime.utcnow(),
                    "is_read": False
                }

                await db.push_notifications.insert_one(notification_record)

            return success, error

        except Exception as e:
            logger.error(f"Send to member error: {e}")
            return False, str(e)

    async def send_to_multiple_members(
        self,
        db,
        member_ids: List[str],
        church_id: str,
        title: str,
        body: str,
        notification_type: str = "general",
        data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Send push notification to multiple members.

        Args:
            db: Database connection
            member_ids: List of member IDs
            church_id: Church ID
            title: Notification title
            body: Notification body
            notification_type: Type of notification
            data: Custom data

        Returns:
            Dictionary with success count and errors
        """
        results = {
            "total": len(member_ids),
            "sent": 0,
            "failed": 0,
            "errors": []
        }

        for member_id in member_ids:
            success, error = await self.send_to_member(
                db=db,
                member_id=member_id,
                church_id=church_id,
                title=title,
                body=body,
                notification_type=notification_type,
                data=data
            )

            if success:
                results["sent"] += 1
            else:
                results["failed"] += 1
                results["errors"].append({
                    "member_id": member_id,
                    "error": error
                })

        return results


# Singleton instance
import uuid
fcm_service = FCMService()


def get_fcm_service() -> FCMService:
    """Get FCM service instance."""
    return fcm_service


# Module-level convenience function for direct import
async def send_push_notification(
    expo_tokens: List[str],
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None,
    sound: str = "default",
    badge: Optional[int] = None,
    channel_id: str = "default"
) -> tuple[bool, Optional[str]]:
    """
    Send push notification via Expo Push Service.

    This is a module-level wrapper for FCMService.send_push_notification().

    Args:
        expo_tokens: List of Expo push tokens
        title: Notification title
        body: Notification body
        data: Custom data payload
        sound: Sound to play
        badge: Badge count (iOS)
        channel_id: Android notification channel

    Returns:
        Tuple of (success, error_message)
    """
    return await fcm_service.send_push_notification(
        expo_tokens=expo_tokens,
        title=title,
        body=body,
        data=data,
        sound=sound,
        badge=badge,
        channel_id=channel_id
    )
