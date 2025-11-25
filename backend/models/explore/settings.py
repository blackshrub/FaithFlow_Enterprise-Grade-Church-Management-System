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


class ChurchExploreSettings(BaseModel):
    """Church-specific Explore adoption settings"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str

    # Master toggle
    explore_enabled: bool = False

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
