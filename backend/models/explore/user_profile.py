"""
User Spiritual Profile Models

Comprehensive user profiling system that combines:
1. Implicit signals (tracked automatically from user behavior)
2. Explicit preferences (minimal onboarding questions)
3. Computed spiritual profile for content personalization

This enables AI-powered content personalization without being intrusive.
"""

from datetime import datetime, time, date
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


# ==================== ONBOARDING MODELS ====================

class OnboardingQuestion(BaseModel):
    """A single onboarding question"""
    id: str
    question: Dict[str, str]  # {"en": "...", "id": "..."}
    description: Optional[Dict[str, str]] = None  # Optional helper text
    question_type: Literal["single_choice", "multiple_choice", "slider", "text"]
    options: Optional[List[Dict[str, str]]] = None  # For choice types
    option_values: Optional[List[str]] = None  # Internal values for choices
    min_value: Optional[int] = None  # For slider
    max_value: Optional[int] = None  # For slider
    slider_labels: Optional[Dict[str, Dict[str, str]]] = None  # {"min": {"en": "...", "id": "..."}, "max": {...}}
    required: bool = True
    order: int = 0
    category: str  # "faith_journey", "learning_style", "life_situation", "interests"


class OnboardingResponse(BaseModel):
    """User's response to an onboarding question"""
    question_id: str
    response_value: Any  # String for choice, int for slider, list for multiple
    responded_at: datetime = Field(default_factory=datetime.now)


# ==================== IMPLICIT SIGNAL TRACKING ====================

class ContentEngagement(BaseModel):
    """Tracks engagement with a specific content piece"""
    content_id: str
    content_type: str
    first_viewed_at: datetime
    last_viewed_at: datetime
    total_views: int = 1
    time_spent_seconds: int = 0
    completion_percentage: int = 0
    bookmarked: bool = False
    favorited: bool = False
    shared: bool = False
    companion_interactions: int = 0  # How many times user used companion for this content


class TopicInterest(BaseModel):
    """Tracks interest in a topic based on behavior"""
    topic: str  # e.g., "prayer", "faith", "relationships", "grief"
    engagement_score: float = 0.0  # 0-100, computed from behavior
    explicit_interest: bool = False  # User explicitly selected this
    first_engagement: datetime
    last_engagement: datetime
    content_count: int = 0  # Number of content pieces engaged with on this topic


class BibleExploration(BaseModel):
    """Tracks which parts of the Bible user explores"""
    book: str  # e.g., "Genesis", "Psalms", "John"
    testament: Literal["old", "new"]
    chapters_explored: List[int] = []
    verses_bookmarked: List[str] = []  # "Genesis 1:1" format
    total_time_spent_seconds: int = 0
    engagement_count: int = 0
    last_explored: datetime


class LearningPattern(BaseModel):
    """Tracks user's learning patterns"""
    # Time patterns
    preferred_hours: List[int] = []  # Hours of day (0-23) when most active
    preferred_days: List[int] = []  # Days of week (0-6) when most active
    average_session_minutes: float = 0.0

    # Content depth preference
    short_content_percentage: float = 0.0  # <3 min content
    medium_content_percentage: float = 0.0  # 3-10 min
    long_content_percentage: float = 0.0  # >10 min

    # Learning style indicators
    completes_reflection_questions: float = 0.0  # 0-100% completion rate
    uses_companion_for_questions: bool = False
    prefers_quizzes: bool = False
    prefers_reading: bool = False
    prefers_visual_content: bool = False

    # Engagement trends
    engagement_trend: Literal["increasing", "stable", "decreasing", "new_user"] = "new_user"
    last_updated: datetime = Field(default_factory=datetime.now)


class QuizPerformance(BaseModel):
    """Tracks quiz performance patterns"""
    total_quizzes_taken: int = 0
    average_score: float = 0.0
    strongest_categories: List[str] = []  # Categories where user scores highest
    weakest_categories: List[str] = []  # Categories where user scores lowest
    improvement_trend: Literal["improving", "stable", "declining", "insufficient_data"] = "insufficient_data"

    # Detailed breakdown
    category_scores: Dict[str, float] = {}  # {"old_testament": 75.0, "new_testament": 82.0, ...}
    last_quiz_date: Optional[datetime] = None


# ==================== LIFE STAGE & SPIRITUAL MATURITY ====================

class LifeSituation(BaseModel):
    """User's current life situation (can be updated)"""
    # Demographics (optional, from onboarding)
    age_range: Optional[Literal["13-17", "18-25", "26-35", "36-45", "46-55", "56-65", "65+"]] = None

    # Life stage (from onboarding or inferred)
    life_stage: Optional[Literal[
        "student",
        "young_professional",
        "newly_married",
        "parent_young_children",
        "parent_teens",
        "empty_nester",
        "retired",
        "career_transition",
        "other"
    ]] = None

    # Current challenges (from onboarding, multiple choice)
    current_challenges: List[str] = []  # ["work_stress", "family", "health", "grief", "anxiety", etc.]

    # Faith journey stage
    faith_journey: Optional[Literal[
        "exploring",  # New to faith, curious
        "new_believer",  # Recently committed
        "growing",  # Active in faith growth
        "mature",  # Established faith, may mentor others
        "questioning",  # Going through doubts
        "returning"  # Coming back after time away
    ]] = None

    # Updated when user changes situation
    last_updated: datetime = Field(default_factory=datetime.now)


class SpiritualGrowthIndicators(BaseModel):
    """Computed indicators of spiritual growth"""
    # Consistency
    consistency_score: float = 0.0  # 0-100, based on regular engagement
    current_streak: int = 0
    longest_streak: int = 0

    # Depth
    depth_score: float = 0.0  # 0-100, based on engagement with deeper content
    reflection_engagement: float = 0.0  # How often user engages with reflection questions
    bible_study_completion_rate: float = 0.0

    # Breadth
    breadth_score: float = 0.0  # 0-100, variety of content explored
    topics_explored: int = 0
    bible_books_explored: int = 0

    # Application
    application_score: float = 0.0  # 0-100, engagement with practical application content
    prayer_engagement: float = 0.0  # Based on prayer-related content engagement

    # Computed maturity level (used for content selection)
    computed_maturity: Literal["beginner", "intermediate", "advanced"] = "beginner"

    last_computed: datetime = Field(default_factory=datetime.now)


# ==================== MAIN USER PROFILE ====================

class UserSpiritualProfile(BaseModel):
    """
    Complete user spiritual profile

    This is the main document stored per user, combining all profile data.
    Used by the content personalization system to select and customize content.
    """
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str
    user_id: str

    # ===== EXPLICIT DATA (from onboarding) =====
    onboarding_completed: bool = False
    onboarding_completed_at: Optional[datetime] = None
    onboarding_responses: List[OnboardingResponse] = []
    onboarding_skipped: bool = False

    # Life situation (from onboarding + can be updated)
    life_situation: LifeSituation = Field(default_factory=LifeSituation)

    # Explicit topic interests (from onboarding)
    explicit_interests: List[str] = []  # Topics user explicitly selected

    # Preferred content types (from onboarding or learned)
    preferred_content_types: List[str] = []  # ["devotion", "bible_study", "quiz", etc.]

    # Bible translation preference
    preferred_translation: str = "NIV"

    # Notification preferences
    preferred_devotion_time: Optional[time] = None  # When to send daily devotion notification
    notification_enabled: bool = True

    # ===== IMPLICIT DATA (tracked automatically) =====

    # Content engagement history (last 90 days, summarized)
    content_engagements: List[ContentEngagement] = []

    # Topic interests (computed from behavior)
    topic_interests: List[TopicInterest] = []

    # Bible exploration patterns
    bible_exploration: List[BibleExploration] = []

    # Learning patterns
    learning_pattern: LearningPattern = Field(default_factory=LearningPattern)

    # Quiz performance
    quiz_performance: QuizPerformance = Field(default_factory=QuizPerformance)

    # ===== COMPUTED PROFILE =====

    # Spiritual growth indicators
    growth_indicators: SpiritualGrowthIndicators = Field(default_factory=SpiritualGrowthIndicators)

    # Content affinity scores (0-100, used for content ranking)
    content_affinity: Dict[str, float] = {
        "daily_devotion": 50.0,
        "verse_of_the_day": 50.0,
        "bible_figure": 50.0,
        "bible_study": 50.0,
        "daily_quiz": 50.0,
        "topical_verses": 50.0,
    }

    # Current priority topics (computed based on recent behavior + life situation)
    priority_topics: List[str] = []

    # Recommended difficulty level
    recommended_difficulty: Literal["beginner", "intermediate", "advanced"] = "beginner"

    # ===== PRAYER INTELLIGENCE (Feature 8 integration) =====

    # Prayer themes extracted from prayer requests
    prayer_themes: Dict[str, float] = {}  # {"health": 0.8, "anxiety": 0.6, ...}
    prayer_themes_updated_at: Optional[datetime] = None

    # Content weight adjustments based on prayer (temporary, decays over time)
    prayer_content_weights: Dict[str, float] = {}  # {"peace": 1.5, "healing": 1.3, ...}
    prayer_weights_expires_at: Optional[datetime] = None

    # ===== JOURNEY TRACKING (Feature 7 integration) =====

    # Active life stage journeys
    active_journeys: List[str] = []  # Journey IDs
    completed_journeys: List[str] = []

    # ===== SERMON INTEGRATION (Feature 6 integration) =====

    # Current sermon theme (for content alignment)
    current_sermon_theme: Optional[str] = None
    sermon_theme_expires_at: Optional[datetime] = None

    # ===== AUDIT =====

    profile_version: int = 1  # For schema migrations
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: datetime = Field(default_factory=datetime.now)
    last_activity: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


# ==================== PROFILE COMPUTATION HELPERS ====================

class ProfileComputationResult(BaseModel):
    """Result of profile computation for content selection"""
    user_id: str

    # Content ranking weights
    content_weights: Dict[str, float] = {}  # {"daily_devotion": 1.2, ...}

    # Topic priorities
    topic_priorities: List[str] = []  # Ordered list of topics

    # Recommended content attributes
    recommended_difficulty: str = "beginner"
    recommended_depth: Literal["brief", "standard", "in_depth"] = "standard"
    recommended_session_length: Literal["short", "medium", "long"] = "medium"

    # Special considerations
    needs_encouragement: bool = False  # Based on streak loss, low engagement
    exploring_doubt: bool = False  # Based on companion conversations
    in_crisis: bool = False  # Based on prayer themes

    # Contextual factors (if available)
    sermon_theme: Optional[str] = None
    prayer_influenced_topics: List[str] = []
    journey_content_priority: Optional[str] = None

    computed_at: datetime = Field(default_factory=datetime.now)


# ==================== DEFAULT ONBOARDING QUESTIONS ====================

DEFAULT_ONBOARDING_QUESTIONS = [
    OnboardingQuestion(
        id="faith_journey",
        question={
            "en": "How would you describe your faith journey?",
            "id": "Bagaimana Anda menggambarkan perjalanan iman Anda?"
        },
        description={
            "en": "This helps us understand where you are in your spiritual journey",
            "id": "Ini membantu kami memahami di mana Anda berada dalam perjalanan rohani"
        },
        question_type="single_choice",
        options=[
            {"en": "I'm exploring faith for the first time", "id": "Saya sedang mengeksplorasi iman untuk pertama kalinya"},
            {"en": "I recently committed my life to Christ", "id": "Saya baru-baru ini berkomitmen pada Kristus"},
            {"en": "I'm actively growing in my faith", "id": "Saya aktif bertumbuh dalam iman"},
            {"en": "I've been walking with God for many years", "id": "Saya sudah berjalan dengan Tuhan selama bertahun-tahun"},
            {"en": "I'm going through a season of questioning", "id": "Saya sedang dalam masa pertanyaan"},
            {"en": "I'm returning to faith after time away", "id": "Saya kembali ke iman setelah waktu jauh"},
        ],
        option_values=["exploring", "new_believer", "growing", "mature", "questioning", "returning"],
        required=True,
        order=1,
        category="faith_journey"
    ),
    OnboardingQuestion(
        id="reading_depth",
        question={
            "en": "How deep do you like to go when studying Scripture?",
            "id": "Seberapa dalam Anda suka mendalami Alkitab?"
        },
        question_type="single_choice",
        options=[
            {"en": "Keep it simple and practical", "id": "Tetap sederhana dan praktis"},
            {"en": "Balance of depth and accessibility", "id": "Keseimbangan kedalaman dan kemudahan"},
            {"en": "I enjoy theological depth", "id": "Saya menikmati kedalaman teologis"},
        ],
        option_values=["simple", "balanced", "deep"],
        required=True,
        order=2,
        category="learning_style"
    ),
    OnboardingQuestion(
        id="life_challenges",
        question={
            "en": "What are you currently walking through? (Select all that apply)",
            "id": "Apa yang sedang Anda alami saat ini? (Pilih semua yang berlaku)"
        },
        description={
            "en": "This helps us provide relevant content and support",
            "id": "Ini membantu kami menyediakan konten dan dukungan yang relevan"
        },
        question_type="multiple_choice",
        options=[
            {"en": "Work or career challenges", "id": "Tantangan pekerjaan atau karir"},
            {"en": "Family or relationship issues", "id": "Masalah keluarga atau hubungan"},
            {"en": "Health concerns", "id": "Masalah kesehatan"},
            {"en": "Anxiety or worry", "id": "Kecemasan atau kekhawatiran"},
            {"en": "Grief or loss", "id": "Dukacita atau kehilangan"},
            {"en": "Financial pressure", "id": "Tekanan keuangan"},
            {"en": "Seeking direction", "id": "Mencari arah"},
            {"en": "None of the above - I'm in a good season", "id": "Tidak ada di atas - Saya dalam musim yang baik"},
        ],
        option_values=["work_stress", "family", "health", "anxiety", "grief", "financial", "direction", "none"],
        required=True,
        order=3,
        category="life_situation"
    ),
    OnboardingQuestion(
        id="interest_topics",
        question={
            "en": "What topics interest you most? (Select up to 3)",
            "id": "Topik apa yang paling menarik bagi Anda? (Pilih hingga 3)"
        },
        question_type="multiple_choice",
        options=[
            {"en": "Prayer and spiritual disciplines", "id": "Doa dan disiplin rohani"},
            {"en": "Understanding the Bible", "id": "Memahami Alkitab"},
            {"en": "Relationships and family", "id": "Hubungan dan keluarga"},
            {"en": "Faith and work", "id": "Iman dan pekerjaan"},
            {"en": "Dealing with emotions", "id": "Mengatasi emosi"},
            {"en": "God's promises and faithfulness", "id": "Janji dan kesetiaan Tuhan"},
            {"en": "Leadership and service", "id": "Kepemimpinan dan pelayanan"},
            {"en": "Evangelism and sharing faith", "id": "Penginjilan dan berbagi iman"},
        ],
        option_values=["prayer", "bible_understanding", "relationships", "faith_work", "emotions", "promises", "leadership", "evangelism"],
        required=False,
        order=4,
        category="interests"
    ),
    OnboardingQuestion(
        id="devotion_time",
        question={
            "en": "When do you prefer to have your quiet time?",
            "id": "Kapan Anda lebih suka saat teduh?"
        },
        question_type="single_choice",
        options=[
            {"en": "Early morning", "id": "Pagi-pagi sekali"},
            {"en": "Late morning", "id": "Pagi menjelang siang"},
            {"en": "Afternoon", "id": "Siang hari"},
            {"en": "Evening", "id": "Sore/Malam"},
            {"en": "No specific time", "id": "Tidak ada waktu tertentu"},
        ],
        option_values=["early_morning", "late_morning", "afternoon", "evening", "flexible"],
        required=False,
        order=5,
        category="learning_style"
    ),
]
