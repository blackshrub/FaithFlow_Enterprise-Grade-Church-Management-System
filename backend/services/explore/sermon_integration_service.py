"""
Sermon Integration Service

Links weekly content to sermon themes:
1. Admin inputs sermon topic, scripture, themes
2. Daily content echoes themes (not direct repeat)
3. Partial integration option (Mon-Wed only)
4. Different scriptures but related themes

Thematic Echo Approach:
- Monday: Foundational verse on theme
- Tuesday: Related Old Testament story
- Wednesday: Practical application
- Thursday-Saturday: Related but varied content
- Sunday: Sermon recap devotion (optional)
"""

from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Literal
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
import logging

from services.explore.profile_service import get_profile_service

logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class SermonInput(BaseModel):
    """Sermon information input by admin"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str

    # Basic info
    title: Dict[str, str]  # {"en": "...", "id": "..."}
    date: date  # Sunday date
    preacher: Optional[str] = None
    series_name: Optional[Dict[str, str]] = None

    # Scripture
    main_scripture: Dict[str, Any]  # {"book": "John", "chapter": 15, "verses": "1-8"}
    supporting_scriptures: List[Dict[str, Any]] = []

    # Themes
    primary_theme: str  # Internal theme identifier
    secondary_themes: List[str] = []
    custom_themes: List[str] = []  # Free-text themes

    # Keywords for content matching
    keywords: List[str] = []

    # Summary points (optional)
    key_points: Optional[Dict[str, List[str]]] = None  # {"en": [...], "id": [...]}

    # Integration settings
    integration_mode: Literal["full", "partial", "disabled"] = "full"
    # full = All week, partial = Mon-Wed only, disabled = No integration
    include_sunday_recap: bool = False

    # Status
    content_generated: bool = False
    content_reviewed: bool = False

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False


class SermonThemeMapping(BaseModel):
    """Maps sermon themes to content generation guidance"""
    theme: str
    display_name: Dict[str, str]
    description: Dict[str, str]
    related_topics: List[str]
    suggested_scriptures: List[Dict[str, Any]]
    content_angles: List[str]  # Different perspectives for variety


# ==================== THEME MAPPINGS ====================

SERMON_THEME_MAPPINGS = {
    "faith": SermonThemeMapping(
        theme="faith",
        display_name={"en": "Faith & Trust", "id": "Iman & Kepercayaan"},
        description={"en": "Living by faith, trusting God", "id": "Hidup dengan iman, percaya Tuhan"},
        related_topics=["trust", "belief", "confidence", "assurance"],
        suggested_scriptures=[
            {"book": "Hebrews", "chapter": 11, "verses": "1", "topic": "Faith defined"},
            {"book": "Romans", "chapter": 10, "verses": "17", "topic": "Faith comes by hearing"},
            {"book": "James", "chapter": 2, "verses": "17", "topic": "Faith and works"},
            {"book": "Mark", "chapter": 11, "verses": "22-24", "topic": "Have faith in God"},
        ],
        content_angles=[
            "Faith in difficult circumstances",
            "Growing faith through trials",
            "Faith of biblical heroes",
            "Practical steps of faith",
            "Faith vs fear",
        ],
    ),
    "love": SermonThemeMapping(
        theme="love",
        display_name={"en": "God's Love", "id": "Kasih Tuhan"},
        description={"en": "Understanding and sharing God's love", "id": "Memahami dan membagikan kasih Tuhan"},
        related_topics=["compassion", "kindness", "grace", "mercy"],
        suggested_scriptures=[
            {"book": "1 John", "chapter": 4, "verses": "7-8", "topic": "God is love"},
            {"book": "John", "chapter": 3, "verses": "16", "topic": "God so loved"},
            {"book": "Romans", "chapter": 8, "verses": "38-39", "topic": "Nothing separates"},
            {"book": "1 Corinthians", "chapter": 13, "verses": "4-7", "topic": "Love is patient"},
        ],
        content_angles=[
            "Experiencing God's love",
            "Loving difficult people",
            "Self-love vs God's love",
            "Love in action",
            "Unconditional love",
        ],
    ),
    "prayer": SermonThemeMapping(
        theme="prayer",
        display_name={"en": "Prayer Life", "id": "Kehidupan Doa"},
        description={"en": "Deepening prayer and communion with God", "id": "Memperdalam doa dan persekutuan dengan Tuhan"},
        related_topics=["intercession", "worship", "listening", "communion"],
        suggested_scriptures=[
            {"book": "Matthew", "chapter": 6, "verses": "9-13", "topic": "Lord's Prayer"},
            {"book": "Philippians", "chapter": 4, "verses": "6-7", "topic": "Pray about everything"},
            {"book": "1 Thessalonians", "chapter": 5, "verses": "16-18", "topic": "Pray continually"},
            {"book": "James", "chapter": 5, "verses": "16", "topic": "Prayer of righteous"},
        ],
        content_angles=[
            "Different types of prayer",
            "Hearing God's voice",
            "When prayers seem unanswered",
            "Building a prayer habit",
            "Praying with faith",
        ],
    ),
    "grace": SermonThemeMapping(
        theme="grace",
        display_name={"en": "Grace", "id": "Anugerah"},
        description={"en": "Living in and extending grace", "id": "Hidup dalam dan memberikan anugerah"},
        related_topics=["forgiveness", "mercy", "salvation", "redemption"],
        suggested_scriptures=[
            {"book": "Ephesians", "chapter": 2, "verses": "8-9", "topic": "Saved by grace"},
            {"book": "2 Corinthians", "chapter": 12, "verses": "9", "topic": "Grace sufficient"},
            {"book": "Titus", "chapter": 2, "verses": "11", "topic": "Grace appeared"},
            {"book": "Romans", "chapter": 5, "verses": "20", "topic": "Grace abounds"},
        ],
        content_angles=[
            "Grace vs works",
            "Extending grace to others",
            "Grace in failure",
            "Amazing grace stories",
            "Living in daily grace",
        ],
    ),
    "purpose": SermonThemeMapping(
        theme="purpose",
        display_name={"en": "Purpose & Calling", "id": "Tujuan & Panggilan"},
        description={"en": "Discovering and living God's purpose", "id": "Menemukan dan menjalani tujuan Tuhan"},
        related_topics=["calling", "destiny", "gifts", "mission"],
        suggested_scriptures=[
            {"book": "Jeremiah", "chapter": 29, "verses": "11", "topic": "Plans for you"},
            {"book": "Ephesians", "chapter": 2, "verses": "10", "topic": "Created for works"},
            {"book": "Romans", "chapter": 8, "verses": "28", "topic": "Called according to purpose"},
            {"book": "Proverbs", "chapter": 19, "verses": "21", "topic": "Lord's purpose prevails"},
        ],
        content_angles=[
            "Discovering your calling",
            "Purpose in every season",
            "When purpose seems unclear",
            "Living intentionally",
            "Purpose in ordinary life",
        ],
    ),
    "peace": SermonThemeMapping(
        theme="peace",
        display_name={"en": "Peace", "id": "Damai Sejahtera"},
        description={"en": "Finding and maintaining God's peace", "id": "Menemukan dan menjaga damai Tuhan"},
        related_topics=["rest", "anxiety", "trust", "surrender"],
        suggested_scriptures=[
            {"book": "Philippians", "chapter": 4, "verses": "6-7", "topic": "Peace of God"},
            {"book": "John", "chapter": 14, "verses": "27", "topic": "My peace I give"},
            {"book": "Isaiah", "chapter": 26, "verses": "3", "topic": "Perfect peace"},
            {"book": "Colossians", "chapter": 3, "verses": "15", "topic": "Let peace rule"},
        ],
        content_angles=[
            "Peace in chaos",
            "Inner peace vs external peace",
            "Guarding your peace",
            "Peacemaking",
            "Rest in God's presence",
        ],
    ),
    "holiness": SermonThemeMapping(
        theme="holiness",
        display_name={"en": "Holiness", "id": "Kekudusan"},
        description={"en": "Pursuing holiness and sanctification", "id": "Mengejar kekudusan dan pengudusan"},
        related_topics=["purity", "sanctification", "obedience", "character"],
        suggested_scriptures=[
            {"book": "1 Peter", "chapter": 1, "verses": "15-16", "topic": "Be holy"},
            {"book": "Hebrews", "chapter": 12, "verses": "14", "topic": "Pursue holiness"},
            {"book": "Romans", "chapter": 12, "verses": "1-2", "topic": "Living sacrifice"},
            {"book": "2 Corinthians", "chapter": 7, "verses": "1", "topic": "Perfecting holiness"},
        ],
        content_angles=[
            "Practical holiness",
            "Holiness in modern life",
            "Grace and holiness together",
            "Heart transformation",
            "Community accountability",
        ],
    ),
    "service": SermonThemeMapping(
        theme="service",
        display_name={"en": "Service & Giving", "id": "Pelayanan & Memberi"},
        description={"en": "Serving others and generous living", "id": "Melayani sesama dan hidup murah hati"},
        related_topics=["generosity", "ministry", "helping", "sacrifice"],
        suggested_scriptures=[
            {"book": "Mark", "chapter": 10, "verses": "45", "topic": "Serve not be served"},
            {"book": "Galatians", "chapter": 5, "verses": "13", "topic": "Serve one another"},
            {"book": "1 Peter", "chapter": 4, "verses": "10", "topic": "Use your gifts"},
            {"book": "Acts", "chapter": 20, "verses": "35", "topic": "Blessed to give"},
        ],
        content_angles=[
            "Serving in your gifting",
            "Everyday service opportunities",
            "Generous living",
            "Serving the marginalized",
            "Service without recognition",
        ],
    ),
}


class SermonIntegrationService:
    """Service for integrating sermon themes with daily content"""

    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        self.sermons_collection = db.sermon_inputs
        self.content_plans_collection = db.sermon_content_plans

    # ==================== SERMON MANAGEMENT ====================

    async def create_sermon_input(
        self,
        church_id: str,
        created_by: str,
        sermon_data: Dict[str, Any],
    ) -> SermonInput:
        """Create a new sermon input"""
        sermon = SermonInput(
            church_id=church_id,
            created_by=created_by,
            **sermon_data,
        )

        await self.sermons_collection.insert_one(sermon.model_dump())

        # Update user profiles with sermon theme
        await self._broadcast_sermon_theme(church_id, sermon)

        logger.info(f"Created sermon input for {sermon.date}: {sermon.title}")
        return sermon

    async def get_sermon_input(
        self,
        church_id: str,
        sermon_id: str,
    ) -> Optional[SermonInput]:
        """Get sermon input by ID"""
        sermon = await self.sermons_collection.find_one({
            "id": sermon_id,
            "church_id": church_id,
            "deleted": False,
        })
        return SermonInput(**sermon) if sermon else None

    async def get_sermon_for_date(
        self,
        church_id: str,
        target_date: date,
    ) -> Optional[SermonInput]:
        """Get sermon for a specific date (finds the relevant Sunday)"""
        # Find the Sunday of the week containing target_date
        days_since_sunday = (target_date.weekday() + 1) % 7
        sunday = target_date - timedelta(days=days_since_sunday)

        sermon = await self.sermons_collection.find_one({
            "church_id": church_id,
            "date": sunday,
            "deleted": False,
        })
        return SermonInput(**sermon) if sermon else None

    async def get_upcoming_sermons(
        self,
        church_id: str,
        weeks: int = 4,
    ) -> List[SermonInput]:
        """Get upcoming sermons for the next N weeks"""
        today = date.today()
        # Find this Sunday
        days_since_sunday = (today.weekday() + 1) % 7
        this_sunday = today - timedelta(days=days_since_sunday)
        end_date = this_sunday + timedelta(weeks=weeks)

        cursor = self.sermons_collection.find({
            "church_id": church_id,
            "date": {"$gte": this_sunday, "$lt": end_date},
            "deleted": False,
        }).sort("date", 1)

        sermons = await cursor.to_list(weeks)
        return [SermonInput(**s) for s in sermons]

    async def update_sermon_input(
        self,
        church_id: str,
        sermon_id: str,
        updated_by: str,
        updates: Dict[str, Any],
    ) -> Optional[SermonInput]:
        """Update sermon input"""
        updates["updated_by"] = updated_by
        updates["updated_at"] = datetime.now()

        await self.sermons_collection.update_one(
            {"id": sermon_id, "church_id": church_id, "deleted": False},
            {"$set": updates}
        )

        return await self.get_sermon_input(church_id, sermon_id)

    async def delete_sermon_input(
        self,
        church_id: str,
        sermon_id: str,
    ) -> None:
        """Soft delete sermon input"""
        await self.sermons_collection.update_one(
            {"id": sermon_id, "church_id": church_id},
            {"$set": {"deleted": True, "deleted_at": datetime.now()}}
        )

    # ==================== THEME INTEGRATION ====================

    async def get_content_guidance_for_day(
        self,
        church_id: str,
        target_date: date,
    ) -> Optional[Dict[str, Any]]:
        """
        Get content generation guidance based on sermon theme

        Returns guidance for content generation including:
        - Theme to emphasize
        - Scriptures to consider
        - Content angle to use
        """
        sermon = await self.get_sermon_for_date(church_id, target_date)
        if not sermon or sermon.integration_mode == "disabled":
            return None

        # Calculate day of week (0 = Sunday)
        day_of_week = (target_date.weekday() + 1) % 7

        # Check partial integration
        if sermon.integration_mode == "partial" and day_of_week > 3:  # After Wednesday
            return None

        # Get theme mapping
        theme_mapping = SERMON_THEME_MAPPINGS.get(sermon.primary_theme)
        if not theme_mapping:
            # Use custom approach
            return {
                "sermon_title": sermon.title,
                "primary_theme": sermon.primary_theme,
                "keywords": sermon.keywords,
                "main_scripture": sermon.main_scripture,
                "integration_note": f"Echo theme: {sermon.primary_theme}",
            }

        # Get content angle based on day
        content_angles = theme_mapping.content_angles
        angle_index = day_of_week % len(content_angles)
        selected_angle = content_angles[angle_index]

        # Get scripture (different from main sermon scripture)
        scriptures = [s for s in theme_mapping.suggested_scriptures
                     if s != sermon.main_scripture]
        selected_scripture = scriptures[day_of_week % len(scriptures)] if scriptures else None

        return {
            "sermon_title": sermon.title,
            "sermon_date": sermon.date.isoformat(),
            "primary_theme": sermon.primary_theme,
            "theme_display_name": theme_mapping.display_name,
            "content_angle": selected_angle,
            "suggested_scripture": selected_scripture,
            "related_topics": theme_mapping.related_topics,
            "keywords": sermon.keywords,
            "integration_note": f"Thematic echo: {selected_angle}",
            "is_partial_integration": sermon.integration_mode == "partial",
            "include_sermon_reference": day_of_week <= 2,  # Sun-Tue can reference sermon
        }

    async def get_weekly_content_plan(
        self,
        church_id: str,
        sunday_date: date,
    ) -> List[Dict[str, Any]]:
        """
        Get content plan for the entire week based on sermon

        Returns guidance for each day of the week.
        """
        sermon = await self.get_sermon_for_date(church_id, sunday_date)
        if not sermon or sermon.integration_mode == "disabled":
            return []

        plan = []
        for day_offset in range(7):
            target_date = sunday_date + timedelta(days=day_offset)
            guidance = await self.get_content_guidance_for_day(church_id, target_date)
            if guidance:
                plan.append({
                    "date": target_date.isoformat(),
                    "day_name": target_date.strftime("%A"),
                    **guidance,
                })

        return plan

    # ==================== PROFILE INTEGRATION ====================

    async def _broadcast_sermon_theme(
        self,
        church_id: str,
        sermon: SermonInput,
    ) -> None:
        """
        Update all user profiles with current sermon theme

        This allows profile-aware content to consider sermon theme.
        """
        # Calculate expiration (end of sermon week - Saturday)
        days_until_saturday = (5 - sermon.date.weekday()) % 7 + 1
        expires_at = datetime.combine(
            sermon.date + timedelta(days=days_until_saturday),
            datetime.max.time()
        )

        # Bulk update all profiles in church
        await self.db.user_spiritual_profiles.update_many(
            {"church_id": church_id, "deleted": False},
            {
                "$set": {
                    "current_sermon_theme": sermon.primary_theme,
                    "sermon_theme_expires_at": expires_at,
                }
            }
        )

        logger.info(f"Broadcast sermon theme '{sermon.primary_theme}' to church {church_id}")

    # ==================== THEME HELPERS ====================

    def get_available_themes(self) -> List[Dict[str, Any]]:
        """Get list of available sermon themes"""
        return [
            {
                "theme": theme,
                "display_name": mapping.display_name,
                "description": mapping.description,
                "related_topics": mapping.related_topics,
            }
            for theme, mapping in SERMON_THEME_MAPPINGS.items()
        ]

    def get_theme_scriptures(self, theme: str) -> List[Dict[str, Any]]:
        """Get suggested scriptures for a theme"""
        mapping = SERMON_THEME_MAPPINGS.get(theme)
        return mapping.suggested_scriptures if mapping else []


# ==================== SINGLETON ACCESS ====================

_sermon_service: Optional[SermonIntegrationService] = None


def get_sermon_integration_service(db: AsyncIOMotorClient) -> SermonIntegrationService:
    """Get or create SermonIntegrationService instance"""
    global _sermon_service
    if _sermon_service is None:
        _sermon_service = SermonIntegrationService(db)
    return _sermon_service
