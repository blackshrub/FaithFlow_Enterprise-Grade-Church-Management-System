"""
Life Stage Journey Models

Curated multi-week spiritual programs for specific life situations.
Users self-select journeys based on their current needs.

Journey Types:
- Grief Recovery (6 weeks)
- New Believer Foundation (8 weeks)
- Marriage Strengthening (4 weeks)
- Career Transition (4 weeks)
- Parenting with Faith (6 weeks)
- Overcoming Anxiety (4 weeks)
- Spiritual Disciplines (8 weeks)
- Leadership Development (6 weeks)
"""

from datetime import datetime, date
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


# ==================== JOURNEY CONTENT ====================

class JourneyDayContent(BaseModel):
    """Content for a single day in a journey"""
    day_number: int  # 1-based
    title: Dict[str, str]  # {"en": "...", "id": "..."}
    focus: Dict[str, str]  # Brief focus statement

    # Scripture for the day
    main_scripture: Dict[str, Any]  # {"book": "Psalms", "chapter": 23, "verses": "1-6"}
    scripture_text: Optional[Dict[str, str]] = None  # Pre-loaded text in both languages

    # Devotional content
    devotion_content: Dict[str, str]  # Markdown content

    # Reflection questions
    reflection_questions: Dict[str, List[str]]  # {"en": [...], "id": [...]}

    # Practical application
    application: Dict[str, str]

    # Prayer prompt
    prayer_prompt: Dict[str, str]

    # Optional: Companion prompt (for context-bound Faith Assistant)
    companion_prompt: Optional[Dict[str, str]] = None

    # Optional: Related content IDs
    related_devotion_id: Optional[str] = None
    related_study_id: Optional[str] = None

    # Estimated time
    estimated_minutes: int = 10


class JourneyWeek(BaseModel):
    """A week within a journey"""
    week_number: int  # 1-based
    title: Dict[str, str]  # Week theme
    description: Dict[str, str]  # Week overview
    focus_theme: str  # Internal theme identifier

    # Days content
    days: List[JourneyDayContent]  # Usually 5-7 days

    # Week milestone/celebration
    completion_message: Dict[str, str]
    milestone_badge: Optional[str] = None  # Badge ID if applicable

    # Optional: Week summary video or audio
    summary_media_url: Optional[str] = None


class JourneyDefinition(BaseModel):
    """Complete journey definition"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str = "global"  # "global" for platform-wide, church_id for church-specific

    # Basic info
    slug: str  # URL-friendly identifier (e.g., "grief-recovery")
    title: Dict[str, str]  # {"en": "Grief Recovery Journey", "id": "..."}
    subtitle: Optional[Dict[str, str]] = None
    description: Dict[str, str]  # Detailed description

    # Target audience
    target_situation: str  # "grief", "new_believer", "career_transition", etc.
    target_description: Dict[str, str]  # Who this is for

    # Duration
    duration_weeks: int
    total_days: int  # Actual content days (may be less than duration_weeks * 7)

    # Structure
    weeks: List[JourneyWeek]

    # Visual
    cover_image_url: Optional[str] = None
    thumbnail_url: Optional[str] = None
    icon: str = "heart"  # Icon identifier
    color: str = "#4F46E5"  # Primary color

    # Categorization
    category: Literal[
        "life_transition",
        "spiritual_growth",
        "relationships",
        "emotional_health",
        "leadership",
        "foundation"
    ]
    difficulty: Literal["beginner", "intermediate", "advanced"] = "beginner"
    tags: List[str] = []

    # Prerequisites
    prerequisites: List[str] = []  # Journey IDs that should be completed first

    # Engagement
    enrollments_count: int = 0
    completions_count: int = 0
    average_rating: float = 0.0
    ratings_count: int = 0

    # Testimonials (featured)
    featured_testimonials: List[Dict[str, str]] = []  # [{quote, author_initial}]

    # Status
    status: Literal["draft", "published", "archived"] = "draft"
    published_at: Optional[datetime] = None

    # AI generation metadata
    ai_generated: bool = False
    ai_metadata: Optional[Dict[str, Any]] = None

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


# ==================== USER JOURNEY PROGRESS ====================

class JourneyDayProgress(BaseModel):
    """User's progress on a single day"""
    day_number: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    time_spent_seconds: int = 0

    # Engagement
    scripture_read: bool = False
    devotion_read: bool = False
    reflection_answered: bool = False
    prayer_completed: bool = False

    # Notes/journal
    user_notes: Optional[str] = None
    reflection_responses: List[str] = []

    # Companion interactions
    companion_conversations: int = 0

    # Rating
    day_rating: Optional[int] = None  # 1-5


class JourneyWeekProgress(BaseModel):
    """User's progress on a week"""
    week_number: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    # Day progress
    days_progress: List[JourneyDayProgress]

    # Milestone
    milestone_achieved: bool = False
    milestone_achieved_at: Optional[datetime] = None


class UserJourneyEnrollment(BaseModel):
    """User's enrollment and progress in a journey"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    church_id: str
    user_id: str
    journey_id: str
    journey_slug: str  # For quick lookup

    # Enrollment
    enrolled_at: datetime = Field(default_factory=datetime.now)
    enrollment_source: Literal["self_selected", "pastoral_recommendation", "ai_suggested"] = "self_selected"
    enrollment_note: Optional[str] = None  # Pastoral note if recommended

    # Progress
    status: Literal["active", "paused", "completed", "abandoned"] = "active"
    current_week: int = 1
    current_day: int = 1

    # Week progress
    weeks_progress: List[JourneyWeekProgress] = []

    # Schedule
    start_date: date  # When user started
    scheduled_completion_date: Optional[date] = None
    actual_completion_date: Optional[date] = None

    # Pause/resume
    paused_at: Optional[datetime] = None
    pause_reason: Optional[str] = None
    resumed_at: Optional[datetime] = None

    # Stats
    total_days_completed: int = 0
    total_time_spent_seconds: int = 0
    streak_current: int = 0
    streak_longest: int = 0

    # Completion
    completed_at: Optional[datetime] = None
    completion_rating: Optional[int] = None  # 1-5 overall journey rating
    completion_testimony: Optional[str] = None

    # Pastoral follow-up
    pastoral_followup_requested: bool = False
    pastoral_followup_completed: bool = False
    pastoral_notes: Optional[str] = None

    # Audit
    updated_at: datetime = Field(default_factory=datetime.now)
    deleted: bool = False
    deleted_at: Optional[datetime] = None


# ==================== JOURNEY RECOMMENDATIONS ====================

class JourneyRecommendation(BaseModel):
    """AI-suggested journey for a user"""
    journey_id: str
    journey_slug: str
    relevance_score: float  # 0-100
    reason: Dict[str, str]  # {"en": "Based on your...", "id": "..."}
    matched_factors: List[str]  # What triggered this recommendation


# ==================== PREDEFINED JOURNEY TEMPLATES ====================

# These are template structures that can be used to generate full journey content
JOURNEY_TEMPLATES = {
    "grief-recovery": {
        "slug": "grief-recovery",
        "title": {"en": "Grief Recovery Journey", "id": "Perjalanan Pemulihan Dukacita"},
        "subtitle": {"en": "Finding hope and healing after loss", "id": "Menemukan harapan dan pemulihan setelah kehilangan"},
        "target_situation": "grief",
        "target_description": {
            "en": "For those walking through the pain of losing a loved one, relationship, job, or season of life",
            "id": "Bagi mereka yang berjalan melalui rasa sakit kehilangan orang yang dicintai, hubungan, pekerjaan, atau musim kehidupan"
        },
        "duration_weeks": 6,
        "category": "emotional_health",
        "difficulty": "beginner",
        "icon": "heart",
        "color": "#8B5CF6",
        "week_themes": [
            {"theme": "acknowledging_grief", "title": {"en": "Acknowledging Your Grief", "id": "Mengakui Dukacitamu"}},
            {"theme": "god_presence", "title": {"en": "God's Presence in Pain", "id": "Kehadiran Tuhan dalam Rasa Sakit"}},
            {"theme": "lament", "title": {"en": "Learning to Lament", "id": "Belajar Meratap"}},
            {"theme": "community", "title": {"en": "Community in Sorrow", "id": "Komunitas dalam Kesedihan"}},
            {"theme": "hope", "title": {"en": "Seeds of Hope", "id": "Benih Harapan"}},
            {"theme": "forward", "title": {"en": "Moving Forward", "id": "Melangkah Maju"}},
        ],
    },
    "new-believer": {
        "slug": "new-believer",
        "title": {"en": "New Believer Foundation", "id": "Fondasi Petobat Baru"},
        "subtitle": {"en": "Building your faith from the ground up", "id": "Membangun imanmu dari dasar"},
        "target_situation": "new_believer",
        "target_description": {
            "en": "For those who have recently committed their life to Christ and want to grow in faith",
            "id": "Bagi mereka yang baru saja berkomitmen pada Kristus dan ingin bertumbuh dalam iman"
        },
        "duration_weeks": 8,
        "category": "foundation",
        "difficulty": "beginner",
        "icon": "sprout",
        "color": "#10B981",
        "week_themes": [
            {"theme": "new_identity", "title": {"en": "Your New Identity in Christ", "id": "Identitas Barumu dalam Kristus"}},
            {"theme": "bible", "title": {"en": "Understanding the Bible", "id": "Memahami Alkitab"}},
            {"theme": "prayer", "title": {"en": "Talking with God", "id": "Berbicara dengan Tuhan"}},
            {"theme": "holy_spirit", "title": {"en": "The Holy Spirit", "id": "Roh Kudus"}},
            {"theme": "church", "title": {"en": "The Church Community", "id": "Komunitas Gereja"}},
            {"theme": "baptism", "title": {"en": "Baptism & Communion", "id": "Baptisan & Perjamuan"}},
            {"theme": "growth", "title": {"en": "Spiritual Growth", "id": "Pertumbuhan Rohani"}},
            {"theme": "sharing", "title": {"en": "Sharing Your Faith", "id": "Membagikan Imanmu"}},
        ],
    },
    "overcoming-anxiety": {
        "slug": "overcoming-anxiety",
        "title": {"en": "Overcoming Anxiety", "id": "Mengatasi Kecemasan"},
        "subtitle": {"en": "Finding peace in God's promises", "id": "Menemukan damai dalam janji Tuhan"},
        "target_situation": "anxiety",
        "target_description": {
            "en": "For those struggling with worry, fear, or anxious thoughts",
            "id": "Bagi mereka yang bergumul dengan kekhawatiran, ketakutan, atau pikiran cemas"
        },
        "duration_weeks": 4,
        "category": "emotional_health",
        "difficulty": "beginner",
        "icon": "cloud-sun",
        "color": "#0EA5E9",
        "week_themes": [
            {"theme": "understanding", "title": {"en": "Understanding Anxiety", "id": "Memahami Kecemasan"}},
            {"theme": "gods_peace", "title": {"en": "God's Peace", "id": "Damai Tuhan"}},
            {"theme": "renewing_mind", "title": {"en": "Renewing Your Mind", "id": "Memperbarui Pikiranmu"}},
            {"theme": "trust", "title": {"en": "Living in Trust", "id": "Hidup dalam Kepercayaan"}},
        ],
    },
    "career-transition": {
        "slug": "career-transition",
        "title": {"en": "Career Transition", "id": "Transisi Karir"},
        "subtitle": {"en": "Finding God's calling in your work", "id": "Menemukan panggilan Tuhan dalam pekerjaanmu"},
        "target_situation": "career_transition",
        "target_description": {
            "en": "For those navigating job changes, career decisions, or seeking purpose in work",
            "id": "Bagi mereka yang sedang menghadapi perubahan pekerjaan, keputusan karir, atau mencari tujuan dalam pekerjaan"
        },
        "duration_weeks": 4,
        "category": "life_transition",
        "difficulty": "intermediate",
        "icon": "briefcase",
        "color": "#F59E0B",
        "week_themes": [
            {"theme": "calling", "title": {"en": "Understanding Calling", "id": "Memahami Panggilan"}},
            {"theme": "gifts", "title": {"en": "Your Gifts & Talents", "id": "Karunia & Talentamu"}},
            {"theme": "decisions", "title": {"en": "Making Wise Decisions", "id": "Membuat Keputusan Bijak"}},
            {"theme": "trust_transition", "title": {"en": "Trusting Through Change", "id": "Percaya Melalui Perubahan"}},
        ],
    },
    "marriage-strengthening": {
        "slug": "marriage-strengthening",
        "title": {"en": "Marriage Strengthening", "id": "Menguatkan Pernikahan"},
        "subtitle": {"en": "Building a Christ-centered marriage", "id": "Membangun pernikahan yang berpusat pada Kristus"},
        "target_situation": "marriage",
        "target_description": {
            "en": "For married couples seeking to deepen their relationship and faith together",
            "id": "Bagi pasangan yang menikah yang ingin memperdalam hubungan dan iman bersama"
        },
        "duration_weeks": 4,
        "category": "relationships",
        "difficulty": "intermediate",
        "icon": "heart-handshake",
        "color": "#EC4899",
        "week_themes": [
            {"theme": "foundation", "title": {"en": "God's Design for Marriage", "id": "Rancangan Tuhan untuk Pernikahan"}},
            {"theme": "communication", "title": {"en": "Communication & Conflict", "id": "Komunikasi & Konflik"}},
            {"theme": "intimacy", "title": {"en": "Emotional & Spiritual Intimacy", "id": "Keintiman Emosional & Rohani"}},
            {"theme": "serving", "title": {"en": "Serving Together", "id": "Melayani Bersama"}},
        ],
    },
    "spiritual-disciplines": {
        "slug": "spiritual-disciplines",
        "title": {"en": "Spiritual Disciplines", "id": "Disiplin Rohani"},
        "subtitle": {"en": "Practices for a deeper faith", "id": "Praktik untuk iman yang lebih dalam"},
        "target_situation": "spiritual_growth",
        "target_description": {
            "en": "For believers wanting to develop consistent spiritual habits",
            "id": "Bagi orang percaya yang ingin mengembangkan kebiasaan rohani yang konsisten"
        },
        "duration_weeks": 8,
        "category": "spiritual_growth",
        "difficulty": "intermediate",
        "icon": "flame",
        "color": "#EF4444",
        "week_themes": [
            {"theme": "bible_reading", "title": {"en": "Bible Reading & Study", "id": "Membaca & Mempelajari Alkitab"}},
            {"theme": "prayer", "title": {"en": "Prayer & Listening", "id": "Doa & Mendengar"}},
            {"theme": "fasting", "title": {"en": "Fasting", "id": "Puasa"}},
            {"theme": "solitude", "title": {"en": "Solitude & Silence", "id": "Kesendirian & Keheningan"}},
            {"theme": "worship", "title": {"en": "Worship & Gratitude", "id": "Penyembahan & Syukur"}},
            {"theme": "service", "title": {"en": "Service & Giving", "id": "Pelayanan & Memberi"}},
            {"theme": "community", "title": {"en": "Community & Accountability", "id": "Komunitas & Akuntabilitas"}},
            {"theme": "witness", "title": {"en": "Witness & Evangelism", "id": "Kesaksian & Penginjilan"}},
        ],
    },
    "parenting-with-faith": {
        "slug": "parenting-with-faith",
        "title": {"en": "Parenting with Faith", "id": "Mengasuh dengan Iman"},
        "subtitle": {"en": "Raising children in God's way", "id": "Membesarkan anak dengan cara Tuhan"},
        "target_situation": "parenting",
        "target_description": {
            "en": "For parents seeking to raise children with a foundation of faith",
            "id": "Bagi orang tua yang ingin membesarkan anak dengan fondasi iman"
        },
        "duration_weeks": 6,
        "category": "relationships",
        "difficulty": "intermediate",
        "icon": "users",
        "color": "#06B6D4",
        "week_themes": [
            {"theme": "calling", "title": {"en": "The Calling of Parenthood", "id": "Panggilan Menjadi Orang Tua"}},
            {"theme": "modeling", "title": {"en": "Modeling Faith", "id": "Meneladankan Iman"}},
            {"theme": "teaching", "title": {"en": "Teaching Scripture", "id": "Mengajarkan Firman"}},
            {"theme": "discipline", "title": {"en": "Discipline with Love", "id": "Mendisiplin dengan Kasih"}},
            {"theme": "prayer", "title": {"en": "Praying for Your Children", "id": "Mendoakan Anak-anakmu"}},
            {"theme": "releasing", "title": {"en": "Releasing to God", "id": "Menyerahkan kepada Tuhan"}},
        ],
    },
    "leadership-development": {
        "slug": "leadership-development",
        "title": {"en": "Leadership Development", "id": "Pengembangan Kepemimpinan"},
        "subtitle": {"en": "Leading like Jesus", "id": "Memimpin seperti Yesus"},
        "target_situation": "leadership",
        "target_description": {
            "en": "For those in leadership or aspiring to lead with biblical principles",
            "id": "Bagi mereka yang memimpin atau bercita-cita memimpin dengan prinsip-prinsip Alkitab"
        },
        "duration_weeks": 6,
        "category": "leadership",
        "difficulty": "advanced",
        "icon": "crown",
        "color": "#6366F1",
        "week_themes": [
            {"theme": "servant", "title": {"en": "Servant Leadership", "id": "Kepemimpinan Hamba"}},
            {"theme": "character", "title": {"en": "Character First", "id": "Karakter Utama"}},
            {"theme": "vision", "title": {"en": "Casting Vision", "id": "Membangun Visi"}},
            {"theme": "team", "title": {"en": "Building Teams", "id": "Membangun Tim"}},
            {"theme": "decisions", "title": {"en": "Wise Decision Making", "id": "Pengambilan Keputusan Bijak"}},
            {"theme": "legacy", "title": {"en": "Leaving a Legacy", "id": "Meninggalkan Warisan"}},
        ],
    },
}
