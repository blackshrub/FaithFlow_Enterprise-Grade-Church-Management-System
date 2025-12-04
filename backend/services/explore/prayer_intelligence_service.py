"""
Prayer Network Intelligence Service

Analyzes prayer requests to:
1. Extract themes and emotional states
2. Provide immediate relevant resources
3. Subtly personalize content for following weeks
4. Trigger follow-up prompts after 14 days

Privacy-first approach:
- Never explicitly reference prayer content in generated content
- Uses themes/weights, not actual prayer text
- User has full control over privacy settings
"""

import re
import logging
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field

from services.explore.profile_service import get_profile_service

logger = logging.getLogger(__name__)


# ==================== MODELS ====================

class PrayerThemeAnalysis(BaseModel):
    """Analysis result for a prayer request"""
    prayer_request_id: str
    analyzed_at: datetime = Field(default_factory=datetime.now)

    # Extracted themes with confidence (0-1)
    themes: Dict[str, float] = {}  # {"health": 0.8, "anxiety": 0.6}

    # Emotional state indicators
    emotional_indicators: Dict[str, float] = {}  # {"distress": 0.7, "hope": 0.3}

    # Urgency level
    urgency: str = "normal"  # "low", "normal", "high", "crisis"

    # Suggested content themes
    content_themes: List[str] = []

    # Suggested scriptures
    suggested_scriptures: List[Dict[str, Any]] = []


class PrayerFollowUp(BaseModel):
    """Follow-up tracking for prayer request"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str
    user_id: str
    prayer_request_id: str

    # Original prayer info
    prayer_category: str
    prayer_themes: List[str]
    submitted_at: datetime

    # Follow-up tracking
    follow_up_due_at: datetime
    follow_up_sent: bool = False
    follow_up_sent_at: Optional[datetime] = None
    user_responded: bool = False
    response_sentiment: Optional[str] = None  # "improved", "same", "worse", "resolved"

    # Audit
    created_at: datetime = Field(default_factory=datetime.now)
    deleted: bool = False


# ==================== THEME KEYWORD MAPPING ====================

PRAYER_THEME_KEYWORDS = {
    "health": {
        "keywords_en": [
            "sick", "illness", "disease", "cancer", "surgery", "hospital", "doctor",
            "healing", "recovery", "pain", "treatment", "diagnosis", "health",
            "medical", "operation", "therapy", "medicine",
        ],
        "keywords_id": [
            "sakit", "penyakit", "kanker", "operasi", "rumah sakit", "dokter",
            "sembuh", "pemulihan", "rasa sakit", "pengobatan", "diagnosa", "kesehatan",
            "medis", "terapi", "obat",
        ],
        "content_themes": ["healing", "hope", "faith", "trust"],
        "scriptures": [
            {"book": "Jeremiah", "chapter": 17, "verses": "14", "topic": "Heal me, O Lord"},
            {"book": "Psalms", "chapter": 103, "verses": "2-3", "topic": "He heals all diseases"},
            {"book": "Isaiah", "chapter": 53, "verses": "5", "topic": "By His wounds healed"},
            {"book": "3 John", "chapter": 1, "verses": "2", "topic": "Good health"},
        ],
    },
    "anxiety": {
        "keywords_en": [
            "anxious", "worried", "fear", "afraid", "panic", "stress", "overwhelmed",
            "nervous", "terrified", "scared", "anxiety", "worry", "struggling",
            "cant sleep", "restless", "troubled",
        ],
        "keywords_id": [
            "cemas", "khawatir", "takut", "panik", "stres", "kewalahan",
            "gelisah", "ketakutan", "kecemasan", "bergumul",
            "tidak bisa tidur", "resah", "bermasalah",
        ],
        "content_themes": ["peace", "trust", "faith", "rest"],
        "scriptures": [
            {"book": "Philippians", "chapter": 4, "verses": "6-7", "topic": "Do not be anxious"},
            {"book": "Isaiah", "chapter": 41, "verses": "10", "topic": "Fear not"},
            {"book": "Psalms", "chapter": 23, "verses": "4", "topic": "I will fear no evil"},
            {"book": "Matthew", "chapter": 6, "verses": "25-27", "topic": "Do not worry"},
        ],
    },
    "grief": {
        "keywords_en": [
            "died", "death", "passed away", "lost", "mourning", "grief", "grieving",
            "funeral", "miss", "gone", "departed", "bereaved", "widow", "orphan",
        ],
        "keywords_id": [
            "meninggal", "kematian", "wafat", "kehilangan", "berduka", "berkabung",
            "pemakaman", "rindu", "pergi", "almarhum", "janda", "yatim",
        ],
        "content_themes": ["comfort", "hope", "eternal_life", "god_presence"],
        "scriptures": [
            {"book": "Revelation", "chapter": 21, "verses": "4", "topic": "No more tears"},
            {"book": "Psalms", "chapter": 34, "verses": "18", "topic": "Near to brokenhearted"},
            {"book": "John", "chapter": 11, "verses": "25-26", "topic": "Resurrection and life"},
            {"book": "2 Corinthians", "chapter": 1, "verses": "3-4", "topic": "God of comfort"},
        ],
    },
    "financial": {
        "keywords_en": [
            "money", "financial", "job", "work", "unemployed", "debt", "bills",
            "rent", "mortgage", "provision", "income", "salary", "fired", "laid off",
            "business", "broke", "poor",
        ],
        "keywords_id": [
            "uang", "keuangan", "kerja", "pekerjaan", "pengangguran", "hutang", "tagihan",
            "sewa", "cicilan", "rezeki", "pendapatan", "gaji", "dipecat", "phk",
            "bisnis", "miskin",
        ],
        "content_themes": ["provision", "trust", "contentment", "wisdom"],
        "scriptures": [
            {"book": "Philippians", "chapter": 4, "verses": "19", "topic": "God supplies needs"},
            {"book": "Matthew", "chapter": 6, "verses": "31-33", "topic": "Seek first the kingdom"},
            {"book": "Proverbs", "chapter": 3, "verses": "9-10", "topic": "Honor the Lord"},
            {"book": "Psalms", "chapter": 37, "verses": "25", "topic": "Never forsaken"},
        ],
    },
    "relationships": {
        "keywords_en": [
            "marriage", "husband", "wife", "spouse", "divorce", "separation", "conflict",
            "family", "children", "parents", "relationship", "friend", "lonely", "alone",
            "reconciliation", "forgiveness", "broken",
        ],
        "keywords_id": [
            "pernikahan", "suami", "istri", "pasangan", "cerai", "perpisahan", "konflik",
            "keluarga", "anak", "orang tua", "hubungan", "teman", "kesepian", "sendiri",
            "rekonsiliasi", "pengampunan", "patah hati",
        ],
        "content_themes": ["love", "forgiveness", "reconciliation", "patience"],
        "scriptures": [
            {"book": "1 Corinthians", "chapter": 13, "verses": "4-7", "topic": "Love is patient"},
            {"book": "Ephesians", "chapter": 4, "verses": "32", "topic": "Be kind, forgiving"},
            {"book": "Colossians", "chapter": 3, "verses": "13", "topic": "Forgive as the Lord"},
            {"book": "Proverbs", "chapter": 17, "verses": "17", "topic": "Friend loves always"},
        ],
    },
    "guidance": {
        "keywords_en": [
            "guidance", "direction", "decision", "choice", "path", "future", "plan",
            "confused", "lost", "uncertain", "calling", "purpose", "will of god",
            "what should", "which way", "dont know",
        ],
        "keywords_id": [
            "bimbingan", "arah", "keputusan", "pilihan", "jalan", "masa depan", "rencana",
            "bingung", "tersesat", "tidak pasti", "panggilan", "tujuan", "kehendak tuhan",
            "harus apa", "kemana", "tidak tahu",
        ],
        "content_themes": ["wisdom", "trust", "guidance", "faith"],
        "scriptures": [
            {"book": "Proverbs", "chapter": 3, "verses": "5-6", "topic": "Trust and He directs"},
            {"book": "James", "chapter": 1, "verses": "5", "topic": "Ask for wisdom"},
            {"book": "Psalms", "chapter": 32, "verses": "8", "topic": "I will instruct you"},
            {"book": "Isaiah", "chapter": 30, "verses": "21", "topic": "This is the way"},
        ],
    },
    "faith_struggle": {
        "keywords_en": [
            "doubt", "faith", "believe", "trust", "struggling", "questioning", "why god",
            "where is god", "doesnt care", "silent", "abandoned", "distant", "cold",
        ],
        "keywords_id": [
            "ragu", "iman", "percaya", "bergumul", "pertanyaan", "mengapa tuhan",
            "dimana tuhan", "tidak peduli", "diam", "ditinggalkan", "jauh",
        ],
        "content_themes": ["faith", "trust", "god_presence", "perseverance"],
        "scriptures": [
            {"book": "Mark", "chapter": 9, "verses": "24", "topic": "Help my unbelief"},
            {"book": "Hebrews", "chapter": 11, "verses": "1", "topic": "Faith is assurance"},
            {"book": "Psalms", "chapter": 13, "verses": "1-3", "topic": "How long, O Lord"},
            {"book": "Deuteronomy", "chapter": 31, "verses": "6", "topic": "Never leave you"},
        ],
    },
    "gratitude": {
        "keywords_en": [
            "thank", "grateful", "blessed", "praise", "answered", "testimony", "miracle",
            "thankful", "appreciate", "wonderful", "amazing", "joy",
        ],
        "keywords_id": [
            "syukur", "bersyukur", "diberkati", "puji", "dijawab", "kesaksian", "mujizat",
            "berterima kasih", "menghargai", "luar biasa", "sukacita",
        ],
        "content_themes": ["gratitude", "praise", "joy", "testimony"],
        "scriptures": [
            {"book": "1 Thessalonians", "chapter": 5, "verses": "18", "topic": "Give thanks"},
            {"book": "Psalms", "chapter": 100, "verses": "4", "topic": "Enter with thanksgiving"},
            {"book": "Psalms", "chapter": 107, "verses": "1", "topic": "Give thanks, He is good"},
        ],
    },
}

# Emotional indicators
EMOTIONAL_KEYWORDS = {
    "distress": {
        "en": ["help", "please", "desperate", "urgent", "immediately", "crisis", "emergency", "cant take"],
        "id": ["tolong", "mohon", "putus asa", "mendesak", "segera", "krisis", "darurat", "tidak kuat"],
    },
    "hope": {
        "en": ["hope", "believe", "faith", "trust", "confident", "expecting", "waiting"],
        "id": ["harap", "percaya", "iman", "yakin", "berharap", "menanti"],
    },
    "surrender": {
        "en": ["thy will", "your will", "surrender", "submit", "accept", "whatever you decide"],
        "id": ["kehendak-mu", "serahkan", "menyerah", "terima", "apapun keputusan-mu"],
    },
}


class PrayerIntelligenceService:
    """Service for analyzing prayers and providing intelligent responses"""

    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        self.analysis_collection = db.prayer_analyses
        self.followup_collection = db.prayer_followups

    # ==================== PRAYER ANALYSIS ====================

    async def analyze_prayer_request(
        self,
        church_id: str,
        user_id: str,
        prayer_request_id: str,
        prayer_text: str,
        prayer_category: Optional[str] = None,
    ) -> PrayerThemeAnalysis:
        """
        Analyze a prayer request to extract themes and provide resources

        This is called when a new prayer request is submitted.
        """
        analysis = PrayerThemeAnalysis(prayer_request_id=prayer_request_id)
        text_lower = prayer_text.lower()

        # 1. Extract themes
        for theme, config in PRAYER_THEME_KEYWORDS.items():
            keywords = config["keywords_en"] + config["keywords_id"]
            matches = sum(1 for kw in keywords if kw in text_lower)

            if matches > 0:
                # Confidence based on matches (max 1.0)
                confidence = min(1.0, matches * 0.25)
                analysis.themes[theme] = confidence
                analysis.content_themes.extend(config["content_themes"])
                analysis.suggested_scriptures.extend(config["scriptures"][:2])

        # 2. Detect emotional state
        for emotion, keywords in EMOTIONAL_KEYWORDS.items():
            all_keywords = keywords["en"] + keywords["id"]
            matches = sum(1 for kw in all_keywords if kw in text_lower)
            if matches > 0:
                analysis.emotional_indicators[emotion] = min(1.0, matches * 0.3)

        # 3. Determine urgency
        distress_level = analysis.emotional_indicators.get("distress", 0)
        if distress_level >= 0.7:
            analysis.urgency = "crisis"
        elif distress_level >= 0.4:
            analysis.urgency = "high"
        elif distress_level > 0:
            analysis.urgency = "normal"
        else:
            analysis.urgency = "low"

        # 4. Deduplicate content themes
        analysis.content_themes = list(dict.fromkeys(analysis.content_themes))[:5]

        # 5. Store analysis
        await self.analysis_collection.update_one(
            {"prayer_request_id": prayer_request_id},
            {"$set": analysis.model_dump()},
            upsert=True
        )

        # 6. Update user profile with prayer themes (for subtle content personalization)
        await self._update_user_prayer_themes(church_id, user_id, analysis)

        # 7. Schedule follow-up
        await self._schedule_followup(
            church_id=church_id,
            user_id=user_id,
            prayer_request_id=prayer_request_id,
            prayer_category=prayer_category or "general",
            themes=list(analysis.themes.keys()),
        )

        logger.info(f"Analyzed prayer request {prayer_request_id}: themes={list(analysis.themes.keys())}, urgency={analysis.urgency}")
        return analysis

    async def get_immediate_resources(
        self, prayer_request_id: str
    ) -> Dict[str, Any]:
        """
        Get immediate resources for a prayer request

        Returns relevant scriptures, devotions, and guided prayer.
        """
        analysis = await self.analysis_collection.find_one({"prayer_request_id": prayer_request_id})
        if not analysis:
            return {}

        return {
            "themes": list(analysis.get("themes", {}).keys()),
            "suggested_scriptures": analysis.get("suggested_scriptures", []),
            "content_themes": analysis.get("content_themes", []),
            "urgency": analysis.get("urgency", "normal"),
            "guided_prayer_available": analysis.get("urgency") != "low",
        }

    async def generate_guided_prayer(
        self, themes: List[str], language: str = "en"
    ) -> str:
        """Generate a guided prayer based on themes"""
        # This would typically use AI, but here's a template approach
        prayer_parts = []

        if language == "id":
            prayer_parts.append("Bapa di surga,")
            if "health" in themes:
                prayer_parts.append("Kami datang kepada-Mu dengan keyakinan bahwa Engkau adalah Penyembuh. Sentuh dan pulihkan menurut kehendak-Mu.")
            if "anxiety" in themes:
                prayer_parts.append("Kami menyerahkan kecemasan kami kepada-Mu. Gantikan ketakutan kami dengan damai sejahtera-Mu yang melampaui segala akal.")
            if "grief" in themes:
                prayer_parts.append("Hibur kami dalam kesedihan. Biarkan kami merasakan kehadiran-Mu yang dekat dengan yang patah hati.")
            if "financial" in themes:
                prayer_parts.append("Kami percaya pada pemeliharaan-Mu. Buka jalan di mana tampaknya tidak ada jalan.")
            if "guidance" in themes:
                prayer_parts.append("Tunjukkan jalan-Mu dengan jelas. Beri kami hikmat untuk keputusan yang ada di hadapan kami.")
            prayer_parts.append("Dalam nama Yesus, Amin.")
        else:
            prayer_parts.append("Heavenly Father,")
            if "health" in themes:
                prayer_parts.append("We come to You believing that You are the Healer. Touch and restore according to Your will.")
            if "anxiety" in themes:
                prayer_parts.append("We surrender our anxieties to You. Replace our fears with Your peace that surpasses understanding.")
            if "grief" in themes:
                prayer_parts.append("Comfort us in our sorrow. Let us feel Your presence near to the brokenhearted.")
            if "financial" in themes:
                prayer_parts.append("We trust in Your provision. Make a way where there seems to be no way.")
            if "guidance" in themes:
                prayer_parts.append("Make Your path clear. Give us wisdom for the decisions before us.")
            prayer_parts.append("In Jesus' name, Amen.")

        return "\n\n".join(prayer_parts)

    # ==================== PROFILE INTEGRATION ====================

    async def _update_user_prayer_themes(
        self,
        church_id: str,
        user_id: str,
        analysis: PrayerThemeAnalysis,
    ) -> None:
        """
        Update user profile with prayer themes for subtle content personalization

        These weights decay over 14 days to ensure content relevance.
        """
        profile_service = get_profile_service(self.db)
        profile = await profile_service.get_or_create_profile(church_id, user_id)

        # Convert analysis themes to content weights
        prayer_weights = {}
        for theme, confidence in analysis.themes.items():
            content_themes = PRAYER_THEME_KEYWORDS.get(theme, {}).get("content_themes", [])
            for ct in content_themes:
                # Add weight based on confidence (1.0 + up to 0.5 boost)
                current = prayer_weights.get(ct, 1.0)
                prayer_weights[ct] = min(2.0, current + (confidence * 0.5))

        # Set expiration (14 days)
        expires_at = datetime.now() + timedelta(days=14)

        # Merge with existing weights (if any)
        existing_weights = profile.prayer_content_weights or {}
        for theme, weight in prayer_weights.items():
            existing_weights[theme] = max(existing_weights.get(theme, 1.0), weight)

        await profile_service.update_profile(
            church_id, user_id,
            {
                "prayer_themes": analysis.themes,
                "prayer_themes_updated_at": datetime.now(),
                "prayer_content_weights": existing_weights,
                "prayer_weights_expires_at": expires_at,
            }
        )

    async def _schedule_followup(
        self,
        church_id: str,
        user_id: str,
        prayer_request_id: str,
        prayer_category: str,
        themes: List[str],
    ) -> None:
        """Schedule a follow-up for 14 days after prayer submission"""
        followup = PrayerFollowUp(
            church_id=church_id,
            user_id=user_id,
            prayer_request_id=prayer_request_id,
            prayer_category=prayer_category,
            prayer_themes=themes,
            submitted_at=datetime.now(),
            follow_up_due_at=datetime.now() + timedelta(days=14),
        )

        await self.followup_collection.insert_one(followup.model_dump())

    # ==================== FOLLOW-UP PROCESSING ====================

    async def get_due_followups(
        self, church_id: Optional[str] = None, limit: int = 100
    ) -> List[PrayerFollowUp]:
        """Get follow-ups that are due"""
        query = {
            "follow_up_sent": False,
            "follow_up_due_at": {"$lte": datetime.now()},
            "deleted": False,
        }
        if church_id:
            query["church_id"] = church_id

        followups = await self.followup_collection.find(query).limit(limit).to_list(limit)
        return [PrayerFollowUp(**f) for f in followups]

    async def mark_followup_sent(self, followup_id: str) -> None:
        """Mark a follow-up as sent"""
        await self.followup_collection.update_one(
            {"id": followup_id},
            {
                "$set": {
                    "follow_up_sent": True,
                    "follow_up_sent_at": datetime.now(),
                }
            }
        )

    async def record_followup_response(
        self,
        followup_id: str,
        sentiment: str,
    ) -> None:
        """Record user's response to follow-up"""
        await self.followup_collection.update_one(
            {"id": followup_id},
            {
                "$set": {
                    "user_responded": True,
                    "response_sentiment": sentiment,
                }
            }
        )

    # ==================== CONTENT PERSONALIZATION HELPERS ====================

    async def get_content_weight_adjustments(
        self, church_id: str, user_id: str
    ) -> Dict[str, float]:
        """
        Get content weight adjustments based on prayer history

        Returns weights to apply to content selection.
        """
        profile_service = get_profile_service(self.db)
        profile = await profile_service.get_or_create_profile(church_id, user_id)

        # Check if weights have expired
        if profile.prayer_weights_expires_at and profile.prayer_weights_expires_at < datetime.now():
            # Weights expired, clear them
            await profile_service.update_profile(
                church_id, user_id,
                {"prayer_content_weights": {}, "prayer_weights_expires_at": None}
            )
            return {}

        return profile.prayer_content_weights or {}

    async def get_relevant_content_for_prayer(
        self,
        prayer_request_id: str,
    ) -> Dict[str, Any]:
        """
        Get relevant content IDs for a specific prayer

        Used to show related content after prayer submission.
        """
        analysis = await self.analysis_collection.find_one({"prayer_request_id": prayer_request_id})
        if not analysis:
            return {}

        themes = list(analysis.get("themes", {}).keys())
        content_themes = analysis.get("content_themes", [])

        # TODO: Query actual content based on themes
        # For now, return structure for frontend to handle

        return {
            "themes": themes,
            "content_themes": content_themes,
            "scriptures": analysis.get("suggested_scriptures", []),
            "devotion_topics": content_themes[:3],
            "suggested_journey": self._get_suggested_journey(themes),
        }

    def _get_suggested_journey(self, themes: List[str]) -> Optional[str]:
        """Suggest a journey based on prayer themes"""
        theme_to_journey = {
            "grief": "grief-recovery",
            "anxiety": "overcoming-anxiety",
            "guidance": "career-transition",
            "faith_struggle": "spiritual-disciplines",
            "relationships": "marriage-strengthening",
        }

        for theme in themes:
            if theme in theme_to_journey:
                return theme_to_journey[theme]

        return None


# ==================== SINGLETON ACCESS ====================

_prayer_service: Optional[PrayerIntelligenceService] = None


def get_prayer_intelligence_service(db: AsyncIOMotorClient) -> PrayerIntelligenceService:
    """Get or create PrayerIntelligenceService instance"""
    global _prayer_service
    if _prayer_service is None:
        _prayer_service = PrayerIntelligenceService(db)
    return _prayer_service
