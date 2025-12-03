"""
Daily Schedule Service

Manages content scheduling:
- Auto-generate schedules for daily content
- Support for church takeovers
- Timezone-aware scheduling
- Bulk schedule operations
"""

from datetime import datetime, timedelta, time
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import pytz
import logging

from models.explore import (
    ContentType,
    ContentScheduleEntry,
    ChurchExploreSettings,
    PlatformSettings,
)

logger = logging.getLogger(__name__)


class ScheduleService:
    """Manages content scheduling"""

    def __init__(self, db: AsyncIOMotorClient):
        self.db = db

    async def generate_daily_schedule(
        self,
        start_date: datetime,
        days: int = 30,
        church_id: str = "global",
    ) -> List[Dict[str, Any]]:
        """
        Generate daily content schedule

        Args:
            start_date: Start date for schedule
            days: Number of days to schedule
            church_id: "global" for platform, or specific church_id

        Returns:
            List of created schedule entries
        """
        schedule_entries = []

        # Daily content types that need scheduling
        daily_content_types = [
            "daily_devotion",
            "verse_of_the_day",
            "bible_figure_of_the_day",
            "daily_quiz",
        ]

        # Get release time
        release_time = await self._get_release_time(church_id)

        for day_offset in range(days):
            schedule_date = start_date + timedelta(days=day_offset)
            schedule_datetime = datetime.combine(schedule_date.date(), release_time)

            for content_type in daily_content_types:
                # Check if already scheduled
                existing = await self.db.content_schedule.find_one(
                    {
                        "church_id": church_id,
                        "date": schedule_datetime,
                        "content_type": content_type,
                        "deleted": False,
                    }
                )

                if existing:
                    logger.debug(
                        f"Already scheduled: {content_type} for {schedule_datetime}"
                    )
                    continue

                # Find available content
                content = await self._find_available_content(
                    content_type, schedule_datetime, church_id
                )

                if not content:
                    logger.warning(
                        f"No content available for {content_type} on {schedule_datetime}"
                    )
                    continue

                # Create schedule entry
                entry = {
                    "id": f"{church_id}_{content_type}_{schedule_datetime.isoformat()}",
                    "church_id": church_id,
                    "date": schedule_datetime,
                    "content_type": content_type,
                    "content_id": content["id"],
                    "is_takeover": church_id != "global",
                    "replaced_content_id": None,
                    "published": False,
                    "published_at": None,
                    "created_by": "system",
                    "created_at": datetime.now(),
                    "deleted": False,
                }

                # Insert into database
                await self.db.content_schedule.insert_one(entry)
                schedule_entries.append(entry)

                logger.info(
                    f"Scheduled {content_type} for {schedule_datetime} (church: {church_id})"
                )

        return schedule_entries

    async def create_takeover(
        self,
        church_id: str,
        date: datetime,
        content_type: ContentType,
        content_id: str,
        created_by: str,
    ) -> Dict[str, Any]:
        """
        Create a church-specific takeover (override global content)

        Args:
            church_id: Church ID
            date: Target date
            content_type: Content type to override
            content_id: Church-specific content ID
            created_by: User creating the takeover

        Returns:
            Created schedule entry
        """
        # Verify church has takeover enabled
        settings = await self._get_church_settings(church_id)
        if not settings or not settings.get("takeover_enabled"):
            raise ValueError(f"Takeover not enabled for church {church_id}")

        if content_type not in settings.get("takeover_content_types", []):
            raise ValueError(
                f"Content type {content_type} not allowed for takeover in church {church_id}"
            )

        # Get release time for church
        release_time = await self._get_release_time(church_id)
        schedule_datetime = datetime.combine(date.date(), release_time)

        # Check for existing schedule
        existing = await self.db.content_schedule.find_one(
            {
                "church_id": church_id,
                "date": schedule_datetime,
                "content_type": content_type,
                "deleted": False,
            }
        )

        if existing:
            # Update existing
            await self.db.content_schedule.update_one(
                {"id": existing["id"]},
                {
                    "$set": {
                        "content_id": content_id,
                        "is_takeover": True,
                        "updated_by": created_by,
                        "updated_at": datetime.now(),
                    }
                },
            )
            return await self.db.content_schedule.find_one({"id": existing["id"]})

        # Find what global content would be replaced
        global_schedule = await self.db.content_schedule.find_one(
            {
                "church_id": "global",
                "date": schedule_datetime,
                "content_type": content_type,
                "deleted": False,
            }
        )

        replaced_content_id = (
            global_schedule["content_id"] if global_schedule else None
        )

        # Create new takeover entry
        entry = {
            "id": f"{church_id}_{content_type}_{schedule_datetime.isoformat()}",
            "church_id": church_id,
            "date": schedule_datetime,
            "content_type": content_type,
            "content_id": content_id,
            "is_takeover": True,
            "replaced_content_id": replaced_content_id,
            "published": False,
            "published_at": None,
            "created_by": created_by,
            "created_at": datetime.now(),
            "deleted": False,
        }

        await self.db.content_schedule.insert_one(entry)
        logger.info(
            f"Created takeover for church {church_id}, date {schedule_datetime}, type {content_type}"
        )
        return entry

    async def remove_takeover(
        self, church_id: str, date: datetime, content_type: ContentType
    ) -> bool:
        """Remove church takeover (revert to global content)"""
        release_time = await self._get_release_time(church_id)
        schedule_datetime = datetime.combine(date.date(), release_time)

        result = await self.db.content_schedule.delete_one(
            {
                "church_id": church_id,
                "date": schedule_datetime,
                "content_type": content_type,
                "is_takeover": True,
            }
        )

        if result.deleted_count > 0:
            logger.info(
                f"Removed takeover for church {church_id}, date {schedule_datetime}, type {content_type}"
            )
            return True

        return False

    async def publish_scheduled_content(
        self, schedule_id: str, published_by: str
    ) -> bool:
        """Mark scheduled content as published"""
        result = await self.db.content_schedule.update_one(
            {"id": schedule_id, "deleted": False},
            {
                "$set": {
                    "published": True,
                    "published_at": datetime.now(),
                    "updated_by": published_by,
                    "updated_at": datetime.now(),
                }
            },
        )

        return result.modified_count > 0

    async def get_schedule(
        self,
        church_id: str,
        start_date: datetime,
        end_date: datetime,
        content_type: Optional[ContentType] = None,
    ) -> List[Dict[str, Any]]:
        """
        Get schedule for a date range

        Args:
            church_id: Church ID or "global"
            start_date: Start of range
            end_date: End of range
            content_type: Optional filter by content type

        Returns:
            List of schedule entries
        """
        query: Dict[str, Any] = {
            "church_id": church_id,
            "date": {"$gte": start_date, "$lt": end_date},
            "deleted": False,
        }

        if content_type:
            query["content_type"] = content_type

        cursor = self.db.content_schedule.find(query).sort("date", 1)
        return await cursor.to_list(length=None)

    async def auto_publish_due_content(self) -> int:
        """
        Auto-publish content that is due (scheduled time has passed)

        Should be run by a background job every few minutes

        Returns:
            Number of items published
        """
        now = datetime.now()

        # Find unpublished content that's past due
        cursor = self.db.content_schedule.find(
            {"date": {"$lte": now}, "published": False, "deleted": False}
        )

        published_count = 0
        async for entry in cursor:
            await self.db.content_schedule.update_one(
                {"id": entry["id"]},
                {
                    "$set": {
                        "published": True,
                        "published_at": now,
                        "updated_by": "system",
                        "updated_at": now,
                    }
                },
            )
            published_count += 1
            logger.info(
                f"Auto-published: {entry['content_type']} for {entry['date']} (church: {entry['church_id']})"
            )

        return published_count

    # ==================== PRIVATE HELPERS ====================

    async def _get_release_time(self, church_id: str) -> time:
        """Get daily content release time for church"""
        if church_id != "global":
            settings = await self._get_church_settings(church_id)
            if settings and settings.get("daily_content_release_time"):
                return settings["daily_content_release_time"]

        # Fallback to platform default
        platform_settings = await self.db.platform_settings.find_one(
            {"id": "explore_platform_settings"}
        )

        if platform_settings and platform_settings.get("daily_content_release_time"):
            return platform_settings["daily_content_release_time"]

        # Ultimate fallback: midnight UTC
        return time(0, 0)

    async def _get_church_settings(self, church_id: str) -> Optional[Dict[str, Any]]:
        """Get church settings"""
        return await self.db.church_explore_settings.find_one(
            {"church_id": church_id, "deleted": False}
        )

    async def _find_available_content(
        self, content_type: ContentType, schedule_date: datetime, church_id: str
    ) -> Optional[Dict[str, Any]]:
        """
        Find available content for scheduling

        Logic:
        1. Look for content not already scheduled
        2. Prefer content with similar dates
        3. Round-robin through available content
        """
        collection_map = {
            "daily_devotion": self.db.daily_devotions,
            "verse_of_the_day": self.db.verses_of_the_day,
            "bible_figure_of_the_day": self.db.bible_figures_of_the_day,
            "daily_quiz": self.db.daily_quizzes,
        }

        collection = collection_map.get(content_type)
        if collection is None:
            return None

        # Determine scope
        scope_query: Dict[str, Any] = {"scope": "global"}
        if church_id != "global":
            settings = await self._get_church_settings(church_id)
            if settings and settings.get("allow_church_content"):
                scope_query = {
                    "$or": [{"scope": "global"}, {"scope": "church", "church_id": church_id}]
                }

        # Find content not already scheduled
        scheduled_ids = []
        async for entry in self.db.content_schedule.find(
            {"content_type": content_type, "deleted": False}
        ):
            scheduled_ids.append(entry["content_id"])

        query = {
            **scope_query,
            "status": "published",
            "deleted": False,
            "id": {"$nin": scheduled_ids} if scheduled_ids else {"$exists": True},
        }

        # Find content
        content = await collection.find_one(query)

        # If no unscheduled content, reuse oldest scheduled content
        if not content:
            logger.warning(
                f"No unscheduled {content_type} available, reusing oldest content"
            )
            content = await collection.find_one(
                {**scope_query, "status": "published", "deleted": False}
            )

        return content
