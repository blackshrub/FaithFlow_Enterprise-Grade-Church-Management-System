"""
News Context Service

Monitors national news (Indonesia-focused) to enable contextually aware content generation.
Uses RSS feeds and public APIs to detect significant events that warrant spiritual content.

Features:
1. RSS feed monitoring (Kompas, Detik, CNN Indonesia)
2. BMKG API integration for disaster alerts
3. AI analysis for significance
4. Auto-generate contextual spiritual content
5. Admin notification for review
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
import feedparser
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class NewsItem(BaseModel):
    """A single news item"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    source: str  # "kompas", "detik", "cnn_indonesia", "bmkg"
    title: str
    summary: Optional[str] = None
    url: str
    published_at: datetime
    fetched_at: datetime = Field(default_factory=datetime.now)

    # Analysis
    category: Optional[str] = None  # "disaster", "crisis", "celebration", "general"
    significance_score: float = 0.0  # 0-100
    spiritual_relevance: Optional[str] = None  # Brief note on spiritual relevance
    keywords: List[str] = []

    # Content generation
    content_generated: bool = False
    content_id: Optional[str] = None
    reviewed: bool = False


class NewsContext(BaseModel):
    """Current news context for content generation"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    date: datetime
    church_id: str = "global"  # Can be church-specific if needed

    # Significant events
    significant_events: List[Dict[str, Any]] = []

    # BMKG alerts
    disaster_alerts: List[Dict[str, Any]] = []

    # Generated content
    contextual_content_ids: List[str] = []

    # Status
    processed: bool = False
    admin_notified: bool = False

    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)


# ==================== RSS FEED SOURCES ====================

RSS_FEEDS = {
    "kompas": {
        "url": "https://rss.kompas.com/nasional",
        "language": "id",
        "priority": 1,
    },
    "kompas_regional": {
        "url": "https://rss.kompas.com/regional",
        "language": "id",
        "priority": 2,
    },
    "detik": {
        "url": "https://rss.detik.com/index.php/detikcom",
        "language": "id",
        "priority": 1,
    },
    "cnn_indonesia": {
        "url": "https://www.cnnindonesia.com/nasional/rss",
        "language": "id",
        "priority": 1,
    },
}

# Keywords that indicate significant events
SIGNIFICANCE_KEYWORDS = {
    "disaster": [
        "banjir", "gempa", "tsunami", "longsor", "kebakaran", "erupsi",
        "flood", "earthquake", "disaster", "landslide", "fire", "eruption",
        "bencana", "korban", "evakuasi", "darurat", "porak-poranda",
    ],
    "crisis": [
        "krisis", "darurat", "konflik", "kerusuhan", "demo", "protes",
        "crisis", "emergency", "conflict", "riot", "protest",
        "kecelakaan", "tragedi", "meninggal", "tewas",
    ],
    "celebration": [
        "kemerdekaan", "natal", "paskah", "lebaran", "imlek", "waisak",
        "independence", "christmas", "easter", "eid",
        "perayaan", "syukuran", "prestasi", "juara",
    ],
    "national": [
        "presiden", "pemerintah", "nasional", "indonesia",
        "president", "government", "national",
        "kebijakan", "undang-undang", "regulasi",
    ],
}

# Spiritual themes mapped to event types
EVENT_SPIRITUAL_THEMES = {
    "disaster": {
        "themes": ["hope", "comfort", "community", "prayer", "god_faithfulness"],
        "scriptures": [
            {"book": "Psalms", "chapter": 46, "verses": "1-3", "topic": "God our refuge"},
            {"book": "Isaiah", "chapter": 41, "verses": "10", "topic": "Fear not"},
            {"book": "Romans", "chapter": 8, "verses": "28", "topic": "God works all things"},
            {"book": "2 Corinthians", "chapter": 1, "verses": "3-4", "topic": "God of comfort"},
        ],
    },
    "crisis": {
        "themes": ["peace", "trust", "wisdom", "prayer"],
        "scriptures": [
            {"book": "Philippians", "chapter": 4, "verses": "6-7", "topic": "Peace of God"},
            {"book": "Proverbs", "chapter": 3, "verses": "5-6", "topic": "Trust in the Lord"},
            {"book": "James", "chapter": 1, "verses": "5", "topic": "Ask for wisdom"},
        ],
    },
    "celebration": {
        "themes": ["gratitude", "joy", "praise", "thanksgiving"],
        "scriptures": [
            {"book": "Psalms", "chapter": 100, "verses": "1-5", "topic": "Enter with thanksgiving"},
            {"book": "1 Thessalonians", "chapter": 5, "verses": "16-18", "topic": "Rejoice always"},
        ],
    },
}


class NewsContextService:
    """Service for monitoring news and generating contextual content"""

    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        self.news_collection = db.news_items
        self.context_collection = db.news_contexts
        self.http_client = None

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self.http_client is None:
            self.http_client = httpx.AsyncClient(timeout=30.0)
        return self.http_client

    # ==================== NEWS FETCHING ====================

    async def fetch_rss_feeds(self) -> List[NewsItem]:
        """Fetch news from all RSS feeds"""
        client = await self._get_http_client()
        all_news = []

        for source_id, source_config in RSS_FEEDS.items():
            try:
                response = await client.get(source_config["url"])
                if response.status_code == 200:
                    feed = feedparser.parse(response.text)

                    for entry in feed.entries[:10]:  # Limit to 10 per source
                        news_item = NewsItem(
                            source=source_id,
                            title=entry.get("title", ""),
                            summary=entry.get("summary", entry.get("description", "")),
                            url=entry.get("link", ""),
                            published_at=datetime(*entry.published_parsed[:6]) if hasattr(entry, "published_parsed") and entry.published_parsed else datetime.now(),
                        )
                        all_news.append(news_item)

                    logger.info(f"Fetched {len(feed.entries[:10])} items from {source_id}")
            except Exception as e:
                logger.error(f"Error fetching RSS from {source_id}: {e}")

        return all_news

    async def fetch_bmkg_alerts(self) -> List[Dict[str, Any]]:
        """Fetch disaster alerts from BMKG"""
        client = await self._get_http_client()
        alerts = []

        # BMKG earthquake data API
        try:
            # Recent earthquakes
            response = await client.get("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")
            if response.status_code == 200:
                data = response.json()
                gempa = data.get("Infogempa", {}).get("gempa", {})
                if gempa:
                    magnitude = float(gempa.get("Magnitude", 0))
                    if magnitude >= 5.0:  # Significant earthquake
                        alerts.append({
                            "type": "earthquake",
                            "magnitude": magnitude,
                            "location": gempa.get("Wilayah", ""),
                            "depth": gempa.get("Kedalaman", ""),
                            "time": gempa.get("Tanggal", "") + " " + gempa.get("Jam", ""),
                            "potential": gempa.get("Potensi", ""),
                            "severity": "high" if magnitude >= 6.0 else "medium",
                        })
        except Exception as e:
            logger.error(f"Error fetching BMKG earthquake data: {e}")

        # Weather warnings
        try:
            response = await client.get("https://data.bmkg.go.id/DataMKG/MEWS/DigitalForecast/DigitalForecast-Indonesia.xml")
            # Parse weather warnings if needed
            # For now, we'll focus on earthquakes as the primary disaster source
        except Exception as e:
            logger.debug(f"Weather data not available: {e}")

        return alerts

    # ==================== NEWS ANALYSIS ====================

    async def analyze_news_significance(self, news_items: List[NewsItem]) -> List[NewsItem]:
        """Analyze news items for significance and spiritual relevance"""
        for news in news_items:
            text = f"{news.title} {news.summary or ''}".lower()

            # Check for keywords
            found_keywords = []
            max_score = 0
            detected_category = "general"

            for category, keywords in SIGNIFICANCE_KEYWORDS.items():
                category_score = 0
                for keyword in keywords:
                    if keyword in text:
                        found_keywords.append(keyword)
                        category_score += 1

                if category_score > 0:
                    # Weight disaster and crisis higher
                    weight = 2.0 if category in ["disaster", "crisis"] else 1.0
                    weighted_score = category_score * weight

                    if weighted_score > max_score:
                        max_score = weighted_score
                        detected_category = category

            news.keywords = found_keywords
            news.category = detected_category
            news.significance_score = min(100, max_score * 20)  # Scale to 0-100

            # Add spiritual relevance note
            if news.significance_score >= 40:
                themes = EVENT_SPIRITUAL_THEMES.get(detected_category, {}).get("themes", [])
                if themes:
                    news.spiritual_relevance = f"Relevant themes: {', '.join(themes[:3])}"

        return news_items

    async def filter_significant_news(
        self, news_items: List[NewsItem], threshold: float = 40.0
    ) -> List[NewsItem]:
        """Filter news to only significant items"""
        return [n for n in news_items if n.significance_score >= threshold]

    # ==================== CONTEXT CREATION ====================

    async def create_daily_context(self) -> Optional[NewsContext]:
        """Create today's news context"""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        # Check if already exists
        existing = await self.context_collection.find_one({
            "date": {"$gte": today, "$lt": today + timedelta(days=1)},
            "church_id": "global",
        })
        if existing:
            return NewsContext(**existing)

        # Fetch and analyze news
        news_items = await self.fetch_rss_feeds()
        analyzed = await self.analyze_news_significance(news_items)
        significant = await self.filter_significant_news(analyzed)

        # Fetch disaster alerts
        disaster_alerts = await self.fetch_bmkg_alerts()

        # Store news items
        for news in significant:
            await self.news_collection.update_one(
                {"id": news.id},
                {"$set": news.model_dump()},
                upsert=True
            )

        # Create context
        context = NewsContext(
            date=today,
            significant_events=[{
                "id": n.id,
                "title": n.title,
                "category": n.category,
                "significance_score": n.significance_score,
                "spiritual_relevance": n.spiritual_relevance,
                "keywords": n.keywords,
            } for n in significant],
            disaster_alerts=disaster_alerts,
        )

        await self.context_collection.insert_one(context.model_dump())

        logger.info(f"Created news context with {len(significant)} significant events and {len(disaster_alerts)} disaster alerts")
        return context

    async def get_current_context(self) -> Optional[NewsContext]:
        """Get the current news context"""
        today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

        context = await self.context_collection.find_one({
            "date": {"$gte": today, "$lt": today + timedelta(days=1)},
            "church_id": "global",
        })

        return NewsContext(**context) if context else None

    # ==================== CONTENT GENERATION HELPERS ====================

    async def get_contextual_prompt_additions(self) -> Dict[str, Any]:
        """
        Get prompt additions for content generation based on current news

        Returns context to be added to AI content generation prompts.
        """
        context = await self.get_current_context()
        if not context:
            return {}

        # Check for high-priority events
        disaster_events = [e for e in context.significant_events if e.get("category") == "disaster"]
        crisis_events = [e for e in context.significant_events if e.get("category") == "crisis"]

        if context.disaster_alerts or disaster_events:
            # High priority - disaster context
            return {
                "contextual_situation": "disaster",
                "prompt_addition": self._build_disaster_prompt(context.disaster_alerts, disaster_events),
                "themes": EVENT_SPIRITUAL_THEMES["disaster"]["themes"],
                "suggested_scriptures": EVENT_SPIRITUAL_THEMES["disaster"]["scriptures"],
            }
        elif crisis_events:
            # Medium priority - crisis context
            return {
                "contextual_situation": "crisis",
                "prompt_addition": self._build_crisis_prompt(crisis_events),
                "themes": EVENT_SPIRITUAL_THEMES["crisis"]["themes"],
                "suggested_scriptures": EVENT_SPIRITUAL_THEMES["crisis"]["scriptures"],
            }

        return {}

    def _build_disaster_prompt(
        self, alerts: List[Dict], events: List[Dict]
    ) -> str:
        """Build prompt addition for disaster context"""
        parts = ["CONTEXTUAL AWARENESS - DISASTER SITUATION:"]

        if alerts:
            for alert in alerts:
                if alert.get("type") == "earthquake":
                    parts.append(
                        f"- Recent earthquake (M{alert.get('magnitude')}) in {alert.get('location')}. "
                        f"Many may be affected or anxious."
                    )

        if events:
            for event in events[:2]:
                parts.append(f"- News: {event.get('title')}")

        parts.append(
            "\nPLEASE: Generate content that provides comfort, hope, and practical spiritual "
            "encouragement for those affected or anxious about these events. "
            "Focus on God's presence in times of trouble without minimizing real suffering."
        )

        return "\n".join(parts)

    def _build_crisis_prompt(self, events: List[Dict]) -> str:
        """Build prompt addition for crisis context"""
        parts = ["CONTEXTUAL AWARENESS - CURRENT EVENTS:"]

        for event in events[:2]:
            parts.append(f"- {event.get('title')}")

        parts.append(
            "\nPLEASE: Be sensitive to current national mood. "
            "Provide content that brings peace and wisdom without being political."
        )

        return "\n".join(parts)

    # ==================== ADMIN NOTIFICATIONS ====================

    async def check_and_notify_admins(self) -> bool:
        """Check if admin notification is needed for significant events"""
        context = await self.get_current_context()
        if not context or context.admin_notified:
            return False

        # Check if we have high-significance events
        high_sig_events = [
            e for e in context.significant_events
            if e.get("significance_score", 0) >= 70
        ]

        needs_notification = len(high_sig_events) > 0 or len(context.disaster_alerts) > 0

        if needs_notification:
            # Send notification to super admins about high-significance events
            try:
                # Get all super admins to notify
                super_admins = await self.db.users.find({
                    "role": "super_admin",
                    "is_active": True
                }).to_list(50)

                # Build notification message
                event_summaries = []
                for event in high_sig_events[:5]:  # Top 5 events
                    event_summaries.append(
                        f"• {event.get('title', 'Unknown')} "
                        f"(Significance: {event.get('significance_score', 0):.0f}%)"
                    )

                disaster_summaries = []
                for alert in context.disaster_alerts[:3]:  # Top 3 alerts
                    disaster_summaries.append(
                        f"• {alert.get('type', 'Alert')}: {alert.get('description', 'No details')}"
                    )

                notification_data = {
                    "type": "news_context_alert",
                    "title": "Konten Kontekstual Perlu Direview",
                    "message": f"Ditemukan {len(high_sig_events)} berita signifikan dan {len(context.disaster_alerts)} peringatan bencana yang mungkin memerlukan konten spiritual khusus.",
                    "events": event_summaries,
                    "disasters": disaster_summaries,
                    "context_id": context.id,
                    "created_at": datetime.now().isoformat(),
                }

                # Store notification in database for admin dashboard
                await self.db.admin_notifications.insert_one({
                    "id": f"news_context_{context.id}",
                    "church_id": "global",  # System-wide notification
                    "type": "news_context_alert",
                    "title": notification_data["title"],
                    "message": notification_data["message"],
                    "data": notification_data,
                    "read": False,
                    "created_at": datetime.now(),
                })

                # Try to send WhatsApp to super admins with phone numbers
                from services.whatsapp_service import send_whatsapp_message

                for admin in super_admins:
                    phone = admin.get("phone") or admin.get("phone_whatsapp")
                    if phone:
                        try:
                            wa_message = f"""
*🔔 FaithFlow - Peringatan Konten Kontekstual*

{notification_data['message']}

*Berita Signifikan:*
{chr(10).join(event_summaries[:3]) if event_summaries else 'Tidak ada'}

*Peringatan Bencana:*
{chr(10).join(disaster_summaries) if disaster_summaries else 'Tidak ada'}

Silakan login ke Content Center untuk review dan buat konten spiritual yang sesuai.
""".strip()
                            await send_whatsapp_message(phone, wa_message)
                        except Exception as wa_error:
                            logger.warning(f"Failed to send WhatsApp to admin: {wa_error}")

                logger.info(f"Admin notification sent for {len(high_sig_events)} significant events")

            except Exception as notify_error:
                logger.error(f"Failed to send admin notification: {notify_error}")
                # Continue even if notification fails

            # Mark as notified
            await self.context_collection.update_one(
                {"id": context.id},
                {"$set": {"admin_notified": True, "updated_at": datetime.now()}}
            )
            return True

        return False


# ==================== SINGLETON ACCESS ====================

_news_service: Optional[NewsContextService] = None


def get_news_context_service(db: AsyncIOMotorClient) -> NewsContextService:
    """Get or create NewsContextService instance"""
    global _news_service
    if _news_service is None:
        _news_service = NewsContextService(db)
    return _news_service
