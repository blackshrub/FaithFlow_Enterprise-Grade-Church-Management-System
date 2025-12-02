"""
Content Resolver Service

Handles content resolution with:
- Multi-tenant scoping (global vs church-specific)
- Takeover mechanism (church content overrides global)
- Schedule-based content delivery
- Language preference
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import logging

from models.explore import (
    ContentType,
    ContentScope,
    Language,
    DailyDevotion,
    VerseOfTheDay,
    BibleFigureOfTheDay,
    DailyQuiz,
    BibleStudy,
    TopicalCategory,
    TopicalVerse,
    DevotionPlan,
    ShareableImage,
    ContentScheduleEntry,
    ChurchExploreSettings,
)

logger = logging.getLogger(__name__)


class ContentResolver:
    """Resolves content based on church context and schedule"""

    def __init__(self, db: AsyncIOMotorClient):
        self.db = db

    async def get_daily_content(
        self,
        church_id: str,
        date: datetime,
        content_type: ContentType,
        language: Language = "en",
    ) -> Optional[Dict[str, Any]]:
        """
        Get daily content for a specific date

        Args:
            church_id: Church identifier
            date: Target date
            content_type: Type of content to retrieve
            language: Preferred language

        Returns:
            Content dict or None if not found
        """
        # Step 1: Check church settings
        settings = await self._get_church_settings(church_id)
        if not settings or not settings.get("explore_enabled"):
            logger.info(f"Explore not enabled for church {church_id}")
            return None

        # Check if specific feature is enabled
        feature_key = content_type
        if not settings.get("features", {}).get(feature_key, {}).get("enabled", False):
            logger.info(f"Feature {content_type} not enabled for church {church_id}")
            return None

        # Step 2: Check for scheduled content (with takeover support)
        scheduled_content = await self._get_scheduled_content(
            church_id, date, content_type
        )

        if scheduled_content:
            # Get the actual content
            content = await self._get_content_by_id(
                scheduled_content["content_id"], content_type
            )
            if content:
                return self._format_content(content, language)

        # Step 3: Fallback to platform default (if no church-specific content)
        default_content = await self._get_default_daily_content(date, content_type)
        if default_content:
            return self._format_content(default_content, language)

        logger.warning(
            f"No content found for church={church_id}, date={date}, type={content_type}"
        )
        return None

    async def get_self_paced_content(
        self,
        church_id: str,
        content_type: ContentType,
        language: Language = "en",
        skip: int = 0,
        limit: int = 20,
        filters: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Get self-paced content (studies, figures, topical, etc.)

        Args:
            church_id: Church identifier
            content_type: Type of content
            language: Preferred language
            skip: Pagination offset
            limit: Items per page
            filters: Additional filters (categories, difficulty, etc.)

        Returns:
            Dict with items, total, page info
        """
        # Check church settings
        settings = await self._get_church_settings(church_id)
        if not settings or not settings.get("explore_enabled"):
            return {"items": [], "total": 0, "page": 0, "page_size": limit, "has_more": False}

        # Build query
        query = await self._build_content_query(
            church_id, content_type, filters, settings
        )

        # Get collection
        collection = self._get_collection_for_content_type(content_type)

        # Execute query with pagination
        cursor = collection.find(query).skip(skip).limit(limit)
        items = await cursor.to_list(length=limit)

        # Get total count
        total = await collection.count_documents(query)

        # Format items
        formatted_items = [self._format_content(item, language) for item in items]

        return {
            "items": formatted_items,
            "total": total,
            "page": skip // limit,
            "page_size": limit,
            "has_more": total > (skip + limit),
        }

    async def get_content_by_id(
        self,
        church_id: str,
        content_id: str,
        content_type: ContentType,
        language: Language = "en",
    ) -> Optional[Dict[str, Any]]:
        """Get specific content by ID"""
        # Check church settings
        settings = await self._get_church_settings(church_id)
        if not settings or not settings.get("explore_enabled"):
            return None

        # Get content
        content = await self._get_content_by_id(content_id, content_type)
        if not content:
            return None

        # Verify access (church_id scope)
        if not self._can_access_content(content, church_id):
            logger.warning(
                f"Church {church_id} cannot access content {content_id} (scope mismatch)"
            )
            return None

        return self._format_content(content, language)

    # ==================== PRIVATE HELPERS ====================

    async def _get_church_settings(self, church_id: str) -> Optional[Dict[str, Any]]:
        """Get church Explore settings"""
        return await self.db.church_explore_settings.find_one(
            {"church_id": church_id, "deleted": False}
        )

    async def _get_scheduled_content(
        self, church_id: str, date: datetime, content_type: ContentType
    ) -> Optional[Dict[str, Any]]:
        """
        Get scheduled content for a date

        Priority:
        1. Church-specific takeover content
        2. Global scheduled content
        """
        date_start = datetime(date.year, date.month, date.day)
        date_end = date_start + timedelta(days=1)

        # Check for church takeover first
        takeover = await self.db.content_schedule.find_one(
            {
                "church_id": church_id,
                "content_type": content_type,
                "date": {"$gte": date_start, "$lt": date_end},
                "is_takeover": True,
                "published": True,
                "deleted": False,
            }
        )

        if takeover:
            logger.info(
                f"Found takeover content for church {church_id}, date {date}, type {content_type}"
            )
            return takeover

        # Fallback to global schedule
        global_schedule = await self.db.content_schedule.find_one(
            {
                "church_id": "global",
                "content_type": content_type,
                "date": {"$gte": date_start, "$lt": date_end},
                "published": True,
                "deleted": False,
            }
        )

        return global_schedule

    async def _get_default_daily_content(
        self, date: datetime, content_type: ContentType
    ) -> Optional[Dict[str, Any]]:
        """Get default platform daily content (not scheduled)"""
        collection = self._get_collection_for_content_type(content_type)

        # Find published global content closest to the date
        date_start = datetime(date.year, date.month, date.day)
        date_end = date_start + timedelta(days=1)

        content = await collection.find_one(
            {
                "scope": "global",
                "status": "published",
                "published_at": {"$gte": date_start, "$lt": date_end},
                "deleted": False,
            }
        )

        return content

    async def _get_content_by_id(
        self, content_id: str, content_type: ContentType
    ) -> Optional[Dict[str, Any]]:
        """Get content by ID"""
        collection = self._get_collection_for_content_type(content_type)
        return await collection.find_one({"id": content_id, "deleted": False})

    async def _build_content_query(
        self,
        church_id: str,
        content_type: ContentType,
        filters: Optional[Dict[str, Any]],
        settings: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Build MongoDB query for content"""
        query: Dict[str, Any] = {
            "status": "published",
            "deleted": False,
        }

        # Scope: global + church-specific (if enabled)
        scope_filter = None
        if settings.get("allow_church_content"):
            scope_filter = {
                "$or": [
                    {"scope": "global"},
                    {"scope": "church", "church_id": church_id},
                ]
            }
        else:
            query["scope"] = "global"

        # Apply additional filters
        search_filter = None
        if filters:
            if "categories" in filters:
                query["categories"] = {"$in": filters["categories"]}
            if "difficulty" in filters:
                query["difficulty"] = filters["difficulty"]
            if "series_id" in filters:
                query["series_id"] = filters["series_id"]
            if "search" in filters:
                # Simple text search (can be enhanced with MongoDB text index)
                search_term = filters["search"]
                search_filter = {
                    "$or": [
                        {"title.en": {"$regex": search_term, "$options": "i"}},
                        {"title.id": {"$regex": search_term, "$options": "i"}},
                        {"description.en": {"$regex": search_term, "$options": "i"}},
                        {"description.id": {"$regex": search_term, "$options": "i"}},
                    ]
                }

        # Combine scope and search filters properly using $and
        if scope_filter and search_filter:
            query["$and"] = [scope_filter, search_filter]
        elif scope_filter:
            query["$or"] = scope_filter["$or"]
        elif search_filter:
            query["$or"] = search_filter["$or"]

        return query

    def _get_collection_for_content_type(self, content_type: ContentType):
        """Get MongoDB collection for content type"""
        collection_map = {
            "daily_devotion": self.db.daily_devotions,
            "verse_of_the_day": self.db.verses_of_the_day,
            "bible_figure_of_the_day": self.db.bible_figures_of_the_day,
            "daily_quiz": self.db.daily_quizzes,
            "bible_study": self.db.bible_studies,
            "bible_figure": self.db.bible_figures,
            "topical_category": self.db.topical_categories,
            "topical_verse": self.db.topical_verses,
            "devotion_plan": self.db.devotion_plans,
            "practice_quiz": self.db.practice_quizzes,
            "shareable_image": self.db.shareable_images,
        }
        collection = collection_map.get(content_type)
        if collection is None:
            raise ValueError(f"Unknown content type: {content_type}")
        return collection

    def _can_access_content(self, content: Dict[str, Any], church_id: str) -> bool:
        """Check if church can access content"""
        scope = content.get("scope")

        if scope == "global":
            return True

        if scope == "church":
            return content.get("church_id") == church_id

        return False

    def _format_content(
        self, content: Dict[str, Any], language: Language
    ) -> Dict[str, Any]:
        """
        Format content for API response

        Extracts language-specific text and cleans up internal fields
        """
        formatted = content.copy()

        # Remove MongoDB _id
        formatted.pop("_id", None)

        # Extract language-specific text for multilingual fields
        multilingual_fields = [
            "title",
            "content",
            "description",
            "summary",
            "author",
            "name",
            "commentary",
            "reflection_prompt",
            "key_lessons",
            "time_period",
            "subtitle",
            "full_content",
            "full_story",
            "application",
            "overlay_text",
            "custom_label",
        ]

        for field in multilingual_fields:
            if field in formatted and isinstance(formatted[field], dict):
                # Keep both languages but add a 'text' field with preferred language
                if language in formatted[field]:
                    formatted[f"{field}_text"] = formatted[field][language]

        return formatted
