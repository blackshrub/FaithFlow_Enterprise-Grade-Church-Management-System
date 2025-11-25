"""
Explore Content Models

Multi-tenant content model with:
- Content scope: "global" (platform-wide) or "church" (church-specific)
- Multi-language support (en + id)
- Versioning support
- AI-generated flag
"""

from datetime import datetime
from typing import Optional, Literal, List, Dict, Any
from pydantic import BaseModel, Field


# ==================== ENUMS ====================

ContentScope = Literal["global", "church"]
ContentStatus = Literal["draft", "scheduled", "published", "archived"]
ContentType = Literal[
    "daily_devotion",
    "verse_of_the_day",
    "bible_figure_of_the_day",
    "daily_quiz",
    "bible_study",
    "bible_figure",
    "topical_category",
    "topical_verse",
    "devotion_plan",
    "practice_quiz",
    "knowledge_resource",
    "shareable_image",
]
Language = Literal["en", "id"]


# ==================== BASE MODELS ====================

class BibleReference(BaseModel):
    """Bible verse reference"""
    book: str  # e.g., "Genesis", "John"
    chapter: int
    verse_start: int
    verse_end: Optional[int] = None  # For verse ranges
    translation: str = "NIV"  # NIV, ESV, NLT, NKJV, TB


class MultilingualText(BaseModel):
    """Text with multi-language support"""
    en: str
    id: str  # Bahasa Indonesia


class AIGenerationMetadata(BaseModel):
    """Metadata for AI-generated content"""
    generated_by: Literal["anthropic", "openai", "stability_ai"]
    model: str  # e.g., "claude-3-5-sonnet-20241022"
    prompt_version: str  # Reference to prompt configuration
    generated_at: datetime
    reviewed: bool = False
    reviewed_by: Optional[str] = None
    reviewed_at: Optional[datetime] = None


# ==================== DAILY CONTENT ====================

class DailyDevotion(BaseModel):
    """Daily Devotion content"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    scope: ContentScope
    church_id: Optional[str] = None  # Required if scope="church"

    # Multilingual content
    title: MultilingualText
    content: MultilingualText  # Markdown supported
    author: Optional[MultilingualText] = None
    summary: Optional[MultilingualText] = None

    # Bible references
    main_verse: BibleReference
    additional_verses: List[BibleReference] = []

    # Metadata
    reading_time_minutes: int = 3
    tags: List[str] = []
    image_url: Optional[str] = None

    # AI generation
    ai_generated: bool = False
    ai_metadata: Optional[AIGenerationMetadata] = None

    # Status & versioning
    status: ContentStatus = "draft"
    version: int = 1
    previous_version_id: Optional[str] = None

    # Publishing
    scheduled_for: Optional[datetime] = None
    published_at: Optional[datetime] = None

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


class VerseOfTheDay(BaseModel):
    """Verse of the Day content"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    scope: ContentScope
    church_id: Optional[str] = None

    # Bible reference
    verse: BibleReference

    # Multilingual commentary
    commentary: Optional[MultilingualText] = None
    reflection_prompt: Optional[MultilingualText] = None

    # Visual
    background_image_url: Optional[str] = None
    background_color: Optional[str] = None  # Hex color

    # AI generation
    ai_generated: bool = False
    ai_metadata: Optional[AIGenerationMetadata] = None

    # Status
    status: ContentStatus = "draft"
    scheduled_for: Optional[datetime] = None
    published_at: Optional[datetime] = None

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


class BibleFigureOfTheDay(BaseModel):
    """Bible Figure of the Day content"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    scope: ContentScope
    church_id: Optional[str] = None

    # Figure info
    name: MultilingualText
    title: MultilingualText  # e.g., "King of Israel", "Apostle"
    summary: MultilingualText  # Short bio
    full_story: MultilingualText  # Detailed story (markdown)

    # Key information
    key_verses: List[BibleReference] = []
    key_lessons: MultilingualText  # Bullet points
    time_period: Optional[MultilingualText] = None  # e.g., "circa 1000 BC"

    # Visual
    image_url: Optional[str] = None
    image_attribution: Optional[str] = None

    # Related content
    related_figure_ids: List[str] = []
    related_study_ids: List[str] = []

    # AI generation
    ai_generated: bool = False
    ai_metadata: Optional[AIGenerationMetadata] = None

    # Status
    status: ContentStatus = "draft"
    scheduled_for: Optional[datetime] = None
    published_at: Optional[datetime] = None

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


# ==================== QUIZ MODELS ====================

class QuizQuestion(BaseModel):
    """Single quiz question"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    question: MultilingualText
    options: List[MultilingualText]  # 4 options
    correct_answer_index: int  # 0-3
    explanation: MultilingualText
    difficulty: Literal["easy", "medium", "hard"] = "medium"
    related_verse: Optional[BibleReference] = None


class DailyQuiz(BaseModel):
    """Daily Quiz content"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    scope: ContentScope
    church_id: Optional[str] = None

    # Quiz info
    title: MultilingualText
    description: Optional[MultilingualText] = None
    theme: Optional[MultilingualText] = None  # e.g., "Books of the Bible"

    # Questions
    questions: List[QuizQuestion]  # 5-10 questions
    time_limit_seconds: Optional[int] = None  # No limit if None
    passing_score_percentage: int = 70

    # AI generation
    ai_generated: bool = False
    ai_metadata: Optional[AIGenerationMetadata] = None

    # Status
    status: ContentStatus = "draft"
    scheduled_for: Optional[datetime] = None
    published_at: Optional[datetime] = None

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


# ==================== SELF-PACED CONTENT ====================

class BibleStudy(BaseModel):
    """Bible Study content (self-paced)"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    scope: ContentScope
    church_id: Optional[str] = None

    # Study info
    title: MultilingualText
    subtitle: Optional[MultilingualText] = None
    description: MultilingualText
    full_content: MultilingualText  # Markdown with sections

    # Study structure
    sections: List[Dict[str, Any]] = []  # List of {title, content, verses}
    estimated_duration_minutes: int = 15

    # Bible references
    main_passage: BibleReference
    supporting_verses: List[BibleReference] = []

    # Categorization
    categories: List[str] = []  # e.g., ["Prayer", "Faith", "Leadership"]
    difficulty: Literal["beginner", "intermediate", "advanced"] = "beginner"
    series_id: Optional[str] = None  # Group related studies
    series_order: Optional[int] = None

    # Visual
    cover_image_url: Optional[str] = None

    # AI generation
    ai_generated: bool = False
    ai_metadata: Optional[AIGenerationMetadata] = None

    # Status
    status: ContentStatus = "draft"
    published_at: Optional[datetime] = None

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


class TopicalCategory(BaseModel):
    """Topical verse category"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    scope: ContentScope
    church_id: Optional[str] = None

    # Category info
    name: MultilingualText
    description: MultilingualText
    icon: str  # Icon identifier
    color: str  # Hex color

    # Hierarchy
    parent_category_id: Optional[str] = None
    sort_order: int = 0

    # Status
    status: ContentStatus = "published"

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


class TopicalVerse(BaseModel):
    """Verse tagged with topics"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    scope: ContentScope
    church_id: Optional[str] = None

    # Verse
    verse: BibleReference

    # Categories
    category_ids: List[str]  # Links to TopicalCategory

    # Commentary
    commentary: Optional[MultilingualText] = None
    application: Optional[MultilingualText] = None

    # AI generation
    ai_generated: bool = False
    ai_metadata: Optional[AIGenerationMetadata] = None

    # Status
    status: ContentStatus = "published"

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


class DevotionPlan(BaseModel):
    """Multi-day devotion plan"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    scope: ContentScope
    church_id: Optional[str] = None

    # Plan info
    title: MultilingualText
    description: MultilingualText
    duration_days: int  # 7, 14, 21, 30, etc.

    # Days
    days: List[str] = []  # List of DailyDevotion IDs

    # Categorization
    categories: List[str] = []
    difficulty: Literal["beginner", "intermediate", "advanced"] = "beginner"

    # Visual
    cover_image_url: Optional[str] = None

    # Status
    status: ContentStatus = "draft"
    published_at: Optional[datetime] = None

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None


class ShareableImage(BaseModel):
    """Shareable image with verse"""
    id: str = Field(default_factory=lambda: str(datetime.now().timestamp()))
    scope: ContentScope
    church_id: Optional[str] = None

    # Content
    verse: BibleReference
    image_url: str
    overlay_text: Optional[MultilingualText] = None

    # Design
    template_id: Optional[str] = None
    font_family: str = "Inter"
    text_color: str = "#FFFFFF"
    text_position: Literal["top", "center", "bottom"] = "center"

    # AI generation
    ai_generated: bool = False
    ai_metadata: Optional[AIGenerationMetadata] = None

    # Categorization
    tags: List[str] = []

    # Status
    status: ContentStatus = "published"

    # Audit
    created_by: str
    created_at: datetime = Field(default_factory=datetime.now)
    updated_by: Optional[str] = None
    updated_at: Optional[datetime] = None
    deleted: bool = False
    deleted_at: Optional[datetime] = None
