"""
Explore Settings Models

Platform-wide settings and church-specific adoption configuration.
"""

from datetime import datetime, time
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field


# ==================== PLATFORM SETTINGS ====================

class APIConfiguration(BaseModel):
    """API provider configuration"""
    provider: str  # "anthropic", "openai", "stability_ai"
    api_key_encrypted: str
    model_id: str
    enabled: bool = True
    priority: int = 1  # Lower = higher priority
    rate_limit_per_minute: Optional[int] = None
    timeout_seconds: int = 30


class PromptConfiguration(BaseModel):
    """AI prompt templates"""
    prompt_id: str
    content_type: str  # "daily_devotion", "verse_commentary", etc.
    language: str  # "en", "id"
    version: str  # Semantic versioning
    template: str  # Prompt template with variables
    variables: List[str] = []  # List of variable names
    active: bool = True
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None


class PlatformSettings(BaseModel):
    """Platform-wide Explore settings (Super Admin only)"""
    id: str = "explore_platform_settings"
    church_id: str = "global"  # Special church_id for platform settings

    # AI Configuration
    ai_providers: List[APIConfiguration] = []
    ai_prompts: List[PromptConfiguration] = []

    # Default content language
    default_content_language: str = "en"
    supported_languages: List[str] = ["en", "id"]

    # Content generation defaults
    auto_generate_daily_content: bool = True
    auto_generate_days_ahead: int = 7  # Generate content 7 days in advance

    # Daily schedule (UTC)
    daily_content_release_time: time = time(0, 0)  # Midnight UTC

    # Audit
    updated_by: str
    updated_at: datetime = Field(default_factory=datetime.now)


# ==================== CHURCH ADOPTION ====================

class FeatureConfiguration(BaseModel):
    """Configuration for a specific feature"""
    enabled: bool = True
    custom_label: Optional[Dict[str, str]] = None  # {"en": "...", "id": "..."}
    sort_order: int = 0
    visible: bool = True


class TheologicalTradition:
    """
    Theological tradition identifiers.

    These influence the implicit style and emphasis of generated content
    WITHOUT explicitly mentioning denomination names in the content itself.

    When multiple traditions are selected, content focuses ONLY on points
    of agreement between all selected traditions, avoiding controversial topics.
    """
    EVANGELICAL = "evangelical"          # Broad evangelical (default)
    REFORMED = "reformed"                # Reformed/Calvinist emphasis
    CHARISMATIC = "charismatic"          # Pentecostal/Charismatic emphasis
    LITURGICAL = "liturgical"            # Catholic/Orthodox/Anglican style
    MAINLINE = "mainline"                # Moderate mainline Protestant
    BAPTIST = "baptist"                  # Baptist distinctives

    # Style guides for each tradition (used in prompts, not shown to users)
    STYLE_GUIDES = {
        "evangelical": {
            "emphasis": "personal relationship with Jesus, Scripture authority, evangelism",
            "prayer_style": "conversational, personal",
            "language": "accessible, warm, relational",
            "themes": "salvation, grace, faith, transformation",
            # Topics this tradition is comfortable with
            "safe_topics": ["salvation by faith", "Bible study", "prayer", "evangelism", "sanctification"],
            # Topics that might be controversial with other traditions
            "distinctive_topics": ["altar calls", "decision theology", "rapture"],
        },
        "reformed": {
            "emphasis": "God's sovereignty, Scripture alone, covenant theology",
            "prayer_style": "reverent, God-centered",
            "language": "theological depth, doctrinal precision",
            "themes": "sovereignty, election, glory of God, sanctification",
            "safe_topics": ["God's sovereignty", "Scripture authority", "grace", "holiness", "covenant"],
            "distinctive_topics": ["predestination", "limited atonement", "cessationism", "infant baptism"],
        },
        "charismatic": {
            "emphasis": "Holy Spirit work, spiritual gifts, worship, healing",
            "prayer_style": "passionate, expectant, Spirit-led",
            "language": "dynamic, experiential, faith-filled",
            "themes": "power, breakthrough, prophetic, praise",
            "safe_topics": ["Holy Spirit", "worship", "faith", "praise", "God's power"],
            "distinctive_topics": ["speaking in tongues", "prophecy today", "healing ministry", "slain in Spirit"],
        },
        "liturgical": {
            "emphasis": "sacred tradition, sacraments, church calendar, mystery",
            "prayer_style": "structured, contemplative, reverent",
            "language": "formal, beautiful, timeless",
            "themes": "incarnation, liturgy, saints, sacred space",
            "safe_topics": ["reverence", "mystery of God", "church history", "contemplation", "incarnation"],
            "distinctive_topics": ["sacraments", "saints veneration", "Mary", "apostolic succession", "tradition"],
        },
        "mainline": {
            "emphasis": "social justice, community, service, inclusivity",
            "prayer_style": "thoughtful, community-focused",
            "language": "inclusive, progressive, pastoral",
            "themes": "justice, compassion, unity, service",
            "safe_topics": ["love", "service", "community", "compassion", "justice"],
            "distinctive_topics": ["social gospel", "inclusive theology", "progressive interpretation"],
        },
        "baptist": {
            "emphasis": "believer's baptism, local church, soul liberty, Scripture",
            "prayer_style": "heartfelt, direct",
            "language": "practical, Scripture-saturated",
            "themes": "believer's faith, obedience, discipleship, missions",
            "safe_topics": ["personal faith", "Scripture", "discipleship", "missions", "obedience"],
            "distinctive_topics": ["believer's baptism only", "congregational polity", "separation of church/state"],
        },
    }

    # Topics that ALL traditions agree on (universal Christian themes)
    UNIVERSAL_SAFE_TOPICS = [
        "God's love", "salvation through Christ", "prayer", "faith", "hope",
        "love for neighbor", "forgiveness", "grace", "Scripture reading",
        "Jesus' teachings", "fruits of the Spirit", "God's faithfulness",
        "trust in God", "gratitude", "serving others", "worship",
        "God's creation", "redemption", "eternal life", "peace",
    ]

    # Topics to AVOID when multiple traditions are selected (controversial between traditions)
    CONTROVERSIAL_TOPICS = {
        # Reformed vs Charismatic conflicts
        ("reformed", "charismatic"): [
            "speaking in tongues", "continuation of gifts", "cessationism",
            "prophecy today", "healing ministry", "predestination emphasis"
        ],
        # Liturgical vs Baptist conflicts
        ("liturgical", "baptist"): [
            "infant baptism", "sacraments", "tradition authority",
            "saints", "Mary", "apostolic succession"
        ],
        # Reformed vs Mainline conflicts
        ("reformed", "mainline"): [
            "inerrancy", "exclusive salvation", "progressive theology",
            "social gospel priority"
        ],
        # Charismatic vs Liturgical conflicts
        ("charismatic", "liturgical"): [
            "spontaneous worship", "structured liturgy", "miraculous gifts",
            "tradition vs Spirit leading"
        ],
        # Baptist vs Liturgical conflicts
        ("baptist", "liturgical"): [
            "believer's baptism", "infant baptism", "sacramental theology",
            "church authority structure"
        ],
        # Evangelical vs Mainline conflicts
        ("evangelical", "mainline"): [
            "Biblical inerrancy", "exclusive salvation", "social gospel",
            "progressive interpretation"
        ],
    }

    @classmethod
    def get_controversial_topics(cls, traditions: list) -> list:
        """Get list of topics to avoid for a combination of traditions."""
        if len(traditions) <= 1:
            return []

        avoid = set()
        traditions_set = set(traditions)

        for pair, topics in cls.CONTROVERSIAL_TOPICS.items():
            # Check if both traditions in the pair are selected
            if set(pair).issubset(traditions_set):
                avoid.update(topics)

        return list(avoid)

    @classmethod
    def get_common_ground(cls, traditions: list) -> dict:
        """Get the common ground between multiple traditions."""
        if not traditions:
            traditions = ["evangelical"]

        if len(traditions) == 1:
            return cls.STYLE_GUIDES.get(traditions[0], cls.STYLE_GUIDES["evangelical"])

        # Find intersection of safe topics
        safe_topics_sets = []
        for t in traditions:
            style = cls.STYLE_GUIDES.get(t, {})
            safe_topics_sets.append(set(style.get("safe_topics", [])))

        common_safe = set.intersection(*safe_topics_sets) if safe_topics_sets else set()
        common_safe.update(cls.UNIVERSAL_SAFE_TOPICS)

        # Get topics to avoid
        avoid_topics = cls.get_controversial_topics(traditions)

        # Combine emphasis from all traditions (common themes)
        all_themes = []
        for t in traditions:
            style = cls.STYLE_GUIDES.get(t, {})
            all_themes.extend(style.get("themes", "").split(", "))

        # Find common themes (appear in multiple traditions)
        theme_counts = {}
        for theme in all_themes:
            theme_counts[theme] = theme_counts.get(theme, 0) + 1

        common_themes = [t for t, count in theme_counts.items() if count > 1]
        if not common_themes:
            common_themes = ["faith", "grace", "love", "hope"]

        return {
            "emphasis": "common Christian faith, Scripture, prayer, Christ-centered living",
            "prayer_style": "heartfelt, reverent",
            "language": "accessible, warm, biblically grounded",
            "themes": ", ".join(common_themes),
            "safe_topics": list(common_safe),
            "avoid_topics": avoid_topics,
        }


class ChurchExploreSettings(BaseModel):
    """Church-specific Explore adoption settings"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str

    # Master toggle
    explore_enabled: bool = False

    # AI Content Generation Settings
    auto_publish_ai_content: bool = True  # If True, AI content publishes immediately; if False, goes to review queue
    theological_traditions: List[str] = ["evangelical"]  # Multiple traditions = content on common ground only without explicit mention

    # Feature toggles
    features: Dict[str, FeatureConfiguration] = {
        # Daily content
        "daily_devotion": FeatureConfiguration(enabled=True, sort_order=1),
        "verse_of_the_day": FeatureConfiguration(enabled=True, sort_order=2),
        "bible_figure_of_the_day": FeatureConfiguration(enabled=True, sort_order=3),
        "daily_quiz": FeatureConfiguration(enabled=True, sort_order=4),
        # Self-paced content
        "bible_studies": FeatureConfiguration(enabled=True, sort_order=5),
        "bible_figures": FeatureConfiguration(enabled=True, sort_order=6),
        "topical_verses": FeatureConfiguration(enabled=True, sort_order=7),
        "devotion_plans": FeatureConfiguration(enabled=True, sort_order=8),
        "practice_quiz": FeatureConfiguration(enabled=True, sort_order=9),
        "knowledge_resources": FeatureConfiguration(enabled=True, sort_order=10),
        "shareable_images": FeatureConfiguration(enabled=True, sort_order=11),
        # Features
        "streak_tracking": FeatureConfiguration(enabled=True),
        "progress_tracking": FeatureConfiguration(enabled=True),
        "celebrations": FeatureConfiguration(enabled=True),
        "offline_mode": FeatureConfiguration(enabled=True),
    }

    # Content preferences
    preferred_bible_translation: str = "NIV"
    content_language: str = "en"  # Primary content language for this church

    # Use church-specific content
    allow_church_content: bool = False  # Can church admins create content?
    prioritize_church_content: bool = False  # Show church content first?

    # Takeover mechanism
    takeover_enabled: bool = False  # Can override global content with church content?
    takeover_content_types: List[str] = []  # Which content types can be overridden?

    # Schedule customization
    daily_content_release_time: Optional[time] = None  # Override platform time
    timezone: str = "UTC"

    # UI customization
    primary_color: Optional[str] = None  # Hex color for branding
    show_church_branding: bool = False
    custom_welcome_message: Optional[Dict[str, str]] = None  # {"en": "...", "id": "..."}

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


# ==================== CONTENT SCHEDULE ====================

class ContentScheduleEntry(BaseModel):
    """Scheduled content for a specific date"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str  # "global" for platform, specific church_id for church override

    # Schedule
    date: datetime  # Specific date for this content
    content_type: str  # "daily_devotion", "verse_of_the_day", etc.
    content_id: str  # Reference to actual content

    # Takeover mechanism
    is_takeover: bool = False  # Is this overriding global content?
    replaced_content_id: Optional[str] = None  # What global content is being replaced?

    # Status
    published: bool = False
    published_at: Optional[datetime] = None

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


# ==================== USER PROGRESS ====================

class ContentProgress(BaseModel):
    """User progress on a specific content piece"""
    content_id: str
    content_type: str
    started_at: datetime
    completed_at: Optional[datetime] = None
    progress_percentage: int = 0  # 0-100
    bookmarked: bool = False
    favorited: bool = False
    notes: Optional[str] = None


class QuizAttempt(BaseModel):
    """User's quiz attempt"""
    quiz_id: str
    quiz_type: str  # "daily_quiz" or "practice_quiz"
    attempted_at: datetime
    completed_at: Optional[datetime] = None
    score: Optional[int] = None  # Percentage 0-100
    answers: List[Dict[str, Any]] = []  # List of {question_id, answer_index, correct}
    time_taken_seconds: Optional[int] = None


class StreakData(BaseModel):
    """User's streak tracking"""
    current_streak: int = 0
    longest_streak: int = 0
    last_activity_date: Optional[datetime] = None
    total_days_active: int = 0
    streak_milestones: List[int] = []  # [7, 14, 30, 100, etc.]


class UserExploreProgress(BaseModel):
    """User's overall progress in Explore feature"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str
    user_id: str

    # Content progress
    content_progress: List[ContentProgress] = []

    # Quiz history
    quiz_attempts: List[QuizAttempt] = []

    # Streak tracking
    streak: StreakData = Field(default_factory=StreakData)

    # Statistics
    total_devotions_read: int = 0
    total_studies_completed: int = 0
    total_quizzes_completed: int = 0
    total_verses_read: int = 0
    total_figures_learned: int = 0

    # Achievements (simple badges)
    achievements: List[str] = []  # List of achievement IDs

    # Preferences
    notification_enabled: bool = True
    daily_reminder_time: Optional[time] = None

    # Audit
    created_at: datetime = Field(default_factory=datetime.now)
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


# ==================== ANALYTICS ====================

class ContentAnalytics(BaseModel):
    """Analytics for a specific content piece"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str
    content_id: str
    content_type: str

    # Engagement metrics
    views: int = 0
    completions: int = 0
    bookmarks: int = 0
    favorites: int = 0
    shares: int = 0

    # Time metrics
    avg_time_spent_seconds: Optional[float] = None
    avg_completion_rate: Optional[float] = None  # 0-100

    # Date range
    period_start: datetime
    period_end: datetime

    # Updated
    updated_at: datetime = Field(default_factory=datetime.now)
