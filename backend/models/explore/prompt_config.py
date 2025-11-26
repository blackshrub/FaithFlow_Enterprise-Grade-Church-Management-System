"""
AI Prompt Configuration Models

Granular configuration options for each Explore content type.
Each content type has specific dimensions that can be customized
to control the AI generation output.
"""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from enum import Enum


# ==================== SHARED ENUMS ====================

class DoctrinalFoundation(str, Enum):
    EVANGELICAL = "evangelical"
    REFORMED = "reformed"
    CHARISMATIC = "charismatic"
    CATHOLIC = "catholic"
    MAINLINE = "mainline"
    NON_DENOMINATIONAL = "non_denominational"
    BALANCED = "balanced"  # Broadly acceptable across traditions


class ToneOfVoice(str, Enum):
    WARM_PASTORAL = "warm_pastoral"  # Caring, shepherd-like
    CONVERSATIONAL = "conversational"  # Friendly, approachable
    ACADEMIC = "academic"  # Scholarly, precise
    ENCOURAGING = "encouraging"  # Uplifting, positive
    CHALLENGING = "challenging"  # Provocative, stretching
    MEDITATIVE = "meditative"  # Reflective, contemplative
    INSTRUCTIVE = "instructive"  # Teaching-focused


class TargetAudience(str, Enum):
    NEW_BELIEVERS = "new_believers"
    GROWING_CHRISTIANS = "growing_christians"
    MATURE_BELIEVERS = "mature_believers"
    SEEKERS = "seekers"
    YOUTH = "youth"
    YOUNG_ADULTS = "young_adults"
    SENIORS = "seniors"
    FAMILIES = "families"
    GENERAL = "general"


class ReadingLevel(str, Enum):
    SIMPLE = "simple"  # 6th grade level
    MODERATE = "moderate"  # 8th-10th grade
    ADVANCED = "advanced"  # College level


class ContentLength(str, Enum):
    BRIEF = "brief"  # 150-250 words
    MODERATE = "moderate"  # 300-500 words
    DETAILED = "detailed"  # 500-800 words
    COMPREHENSIVE = "comprehensive"  # 800+ words


# ==================== IMAGE GENERATION ENUMS ====================


class ImageStyle(str, Enum):
    """Visual style for AI-generated images"""
    SPIRITUAL_ART = "spiritual_art"  # Soft, ethereal spiritual artwork
    BIBLICAL_CLASSICAL = "biblical_classical"  # Renaissance religious art style
    MODERN_MINIMAL = "modern_minimal"  # Clean, contemporary design
    PHOTOREALISTIC = "photorealistic"  # Natural photography style
    WATERCOLOR = "watercolor"  # Artistic watercolor painting
    STAINED_GLASS = "stained_glass"  # Cathedral stained glass aesthetic
    CONTEMPORARY_WORSHIP = "contemporary_worship"  # Modern church/worship style
    NATURE_INSPIRED = "nature_inspired"  # God's creation, landscapes


class ImageMood(str, Enum):
    """Mood/atmosphere for generated images"""
    PEACEFUL = "peaceful"  # Serene, tranquil, restful
    JOYFUL = "joyful"  # Celebration, brightness, gratitude
    REVERENT = "reverent"  # Sacred, holy, worship
    POWERFUL = "powerful"  # Dramatic, majestic, strong
    CONTEMPLATIVE = "contemplative"  # Reflective, meditative, deep
    HOPEFUL = "hopeful"  # Optimistic, new beginnings, light
    COMFORTING = "comforting"  # Warm, reassuring, safe
    CELEBRATORY = "celebratory"  # Festive, praise, thanksgiving


class ImageColorPalette(str, Enum):
    """Color palette preferences for images"""
    WARM_GOLDEN = "warm_golden"  # Gold, amber, sunset tones
    COOL_SERENE = "cool_serene"  # Blue, teal, calming tones
    EARTH_TONES = "earth_tones"  # Brown, green, natural colors
    VIBRANT = "vibrant"  # Bold, saturated colors
    PASTEL = "pastel"  # Soft, muted, gentle colors
    MONOCHROME = "monochrome"  # Single hue with accents
    ROYAL_DEEP = "royal_deep"  # Deep purple, blue, gold
    SUNRISE_SUNSET = "sunrise_sunset"  # Pink, orange, purple gradient


# ==================== IMAGE CONFIGURATION ====================


class GlobalImageConfig(BaseModel):
    """
    Global image generation settings that apply across all content types.
    These settings control the visual style of AI-generated images.
    """

    # Primary Style
    default_style: ImageStyle = Field(
        default=ImageStyle.SPIRITUAL_ART,
        description="Default visual style for all generated images"
    )
    style_notes: Optional[str] = Field(
        default=None,
        description="Additional style guidance for image generation",
        json_schema_extra={
            "placeholder": "e.g., 'Prefer warm lighting. Avoid dark/moody images. Include subtle cross imagery when appropriate.'"
        }
    )

    # Mood & Atmosphere
    default_mood: ImageMood = Field(
        default=ImageMood.PEACEFUL,
        description="Default mood/atmosphere for images"
    )
    mood_auto_detect: bool = Field(
        default=True,
        description="Automatically detect mood from content (overrides default when confident)"
    )

    # Color Preferences
    color_palette: ImageColorPalette = Field(
        default=ImageColorPalette.WARM_GOLDEN,
        description="Preferred color palette for images"
    )
    brand_colors: Optional[List[str]] = Field(
        default=None,
        description="Church brand colors to subtly incorporate (hex codes)",
        json_schema_extra={
            "placeholder": "e.g., ['#1E40AF', '#F59E0B', '#10B981']"
        }
    )

    # Quality & Technical
    aspect_ratio: str = Field(
        default="16:9",
        description="Default aspect ratio for generated images",
        json_schema_extra={
            "options": ["16:9", "1:1", "4:3", "9:16", "3:2"],
            "placeholder": "16:9 - Ideal for cover images and headers"
        }
    )
    quality_level: str = Field(
        default="high",
        description="Image quality/detail level",
        json_schema_extra={
            "options": ["standard", "high", "ultra"],
            "placeholder": "high - Good balance of quality and generation speed"
        }
    )

    # Content Guidelines
    include_people: bool = Field(
        default=True,
        description="Allow human figures in generated images"
    )
    people_style: str = Field(
        default="silhouette",
        description="How to represent people when included",
        json_schema_extra={
            "options": ["silhouette", "back_view", "partial", "full_figure", "avoid"],
            "placeholder": "silhouette - Recognizable but not detailed faces"
        }
    )
    cultural_sensitivity: str = Field(
        default="diverse",
        description="Approach to cultural representation",
        json_schema_extra={
            "options": ["diverse", "middle_eastern", "universal", "local_context"],
            "placeholder": "diverse - Inclusive representation when people appear"
        }
    )

    # Content-Specific Overrides
    devotion_style: Optional[ImageStyle] = Field(
        default=None,
        description="Style override specifically for devotions (uses default if not set)"
    )
    verse_style: Optional[ImageStyle] = Field(
        default=None,
        description="Style override specifically for verse images"
    )
    figure_style: Optional[ImageStyle] = Field(
        default=ImageStyle.BIBLICAL_CLASSICAL,
        description="Style specifically for biblical figure portraits"
    )
    quiz_style: Optional[ImageStyle] = Field(
        default=ImageStyle.MODERN_MINIMAL,
        description="Style specifically for quiz cover images"
    )
    study_style: Optional[ImageStyle] = Field(
        default=None,
        description="Style override specifically for Bible study covers"
    )
    shareable_style: Optional[ImageStyle] = Field(
        default=ImageStyle.MODERN_MINIMAL,
        description="Style specifically for shareable social images"
    )

    # Things to Avoid (Negative Prompts)
    avoid_elements: List[str] = Field(
        default=["text_on_image", "modern_technology", "violence"],
        description="Elements to explicitly avoid in images",
        json_schema_extra={
            "options": [
                "text_on_image",
                "modern_technology",
                "violence",
                "dark_imagery",
                "cartoon_style",
                "fantasy_elements",
                "branded_items",
                "specific_faces",
                "denominational_symbols"
            ],
            "placeholder": "Select elements that should never appear in generated images"
        }
    )
    custom_avoid: Optional[str] = Field(
        default=None,
        description="Additional elements to avoid in image generation",
        json_schema_extra={
            "placeholder": "e.g., 'Avoid Catholic-specific imagery like rosaries. No Halloween-themed elements.'"
        }
    )

    # Advanced
    seed_consistency: bool = Field(
        default=False,
        description="Use consistent seeds for similar content (experimental)"
    )
    regeneration_variation: str = Field(
        default="moderate",
        description="How different regenerated images should be",
        json_schema_extra={
            "options": ["subtle", "moderate", "significant"],
            "placeholder": "moderate - Noticeable but thematically consistent variation"
        }
    )


# ==================== CONTENT TYPE CONFIGURATIONS ====================


class DailyDevotionConfig(BaseModel):
    """Configuration for Daily Devotion AI generation"""

    # Theological Direction
    doctrinal_foundation: DoctrinalFoundation = Field(
        default=DoctrinalFoundation.BALANCED,
        description="Theological tradition to align with"
    )
    doctrinal_notes: Optional[str] = Field(
        default=None,
        description="Specific doctrinal guidelines or topics to emphasize/avoid",
        json_schema_extra={
            "placeholder": "e.g., 'Emphasize grace and faith. Avoid predestination debates. Focus on practical holiness.'"
        }
    )

    # Voice & Style
    tone: ToneOfVoice = Field(
        default=ToneOfVoice.WARM_PASTORAL,
        description="The overall tone and voice of the devotion"
    )
    writing_style: str = Field(
        default="story_driven",
        description="Narrative approach: story_driven, expository, reflective, poetic",
        json_schema_extra={
            "options": ["story_driven", "expository", "reflective", "poetic", "testimonial"],
            "placeholder": "story_driven - Uses real-life stories and illustrations"
        }
    )

    # Audience
    target_audience: TargetAudience = Field(
        default=TargetAudience.GENERAL,
        description="Primary audience for the devotion"
    )
    reading_level: ReadingLevel = Field(
        default=ReadingLevel.MODERATE,
        description="Vocabulary and sentence complexity"
    )

    # Content Structure
    length: ContentLength = Field(
        default=ContentLength.MODERATE,
        description="Overall devotion length"
    )
    include_opening_story: bool = Field(
        default=True,
        description="Start with a relatable story or illustration"
    )
    include_prayer: bool = Field(
        default=True,
        description="Include a closing prayer"
    )
    include_reflection_questions: bool = Field(
        default=True,
        description="Add questions for personal reflection"
    )
    num_reflection_questions: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Number of reflection questions"
    )

    # Focus Areas
    emphasis: str = Field(
        default="application",
        description="Primary focus: application, theological_depth, encouragement, challenge, comfort",
        json_schema_extra={
            "options": ["application", "theological_depth", "encouragement", "challenge", "comfort", "growth"],
            "placeholder": "application - Focus on practical life application"
        }
    )

    # Church Context
    church_context: Optional[str] = Field(
        default=None,
        description="Specific church context or values to incorporate",
        json_schema_extra={
            "placeholder": "e.g., 'Our church values community service, family, and global missions. We're in an urban multicultural setting.'"
        }
    )

    # Seasonal/Thematic
    seasonal_awareness: bool = Field(
        default=True,
        description="Consider liturgical calendar (Advent, Lent, Easter, etc.)"
    )
    current_theme: Optional[str] = Field(
        default=None,
        description="Current sermon series or church theme to align with",
        json_schema_extra={
            "placeholder": "e.g., 'Faith in Uncertain Times' - our current 6-week series on trusting God"
        }
    )


class VerseOfTheDayConfig(BaseModel):
    """Configuration for Verse of the Day AI generation"""

    # Commentary Style
    commentary_depth: str = Field(
        default="moderate",
        description="How deep the verse explanation goes",
        json_schema_extra={
            "options": ["brief", "moderate", "detailed"],
            "placeholder": "moderate - 150-200 word explanation with context"
        }
    )
    commentary_style: str = Field(
        default="devotional",
        description="Approach to explaining the verse",
        json_schema_extra={
            "options": ["devotional", "academic", "practical", "poetic"],
            "placeholder": "devotional - Heart-focused, spiritually enriching"
        }
    )

    # Theological
    doctrinal_foundation: DoctrinalFoundation = Field(
        default=DoctrinalFoundation.BALANCED,
        description="Theological tradition to align with"
    )

    # Tone
    tone: ToneOfVoice = Field(
        default=ToneOfVoice.MEDITATIVE,
        description="Overall mood of the content"
    )

    # Application
    application_focus: str = Field(
        default="personal",
        description="Where to focus application",
        json_schema_extra={
            "options": ["personal", "relational", "societal", "spiritual_disciplines", "all"],
            "placeholder": "personal - Focus on individual life application"
        }
    )

    # Cross-references
    include_cross_references: bool = Field(
        default=True,
        description="Include related Scripture passages"
    )
    num_cross_references: int = Field(
        default=2,
        ge=0,
        le=5,
        description="Number of related verses to suggest"
    )

    # Reflection
    reflection_style: str = Field(
        default="open_ended",
        description="Type of reflection prompt",
        json_schema_extra={
            "options": ["open_ended", "specific", "action_oriented", "journaling"],
            "placeholder": "open_ended - Questions that invite personal exploration"
        }
    )

    # Visual Suggestions
    suggest_background_style: str = Field(
        default="nature",
        description="Style of background image to suggest",
        json_schema_extra={
            "options": ["nature", "abstract", "minimalist", "photography", "illustration"],
            "placeholder": "nature - Peaceful natural imagery (mountains, water, sky)"
        }
    )


class BibleFigureConfig(BaseModel):
    """Configuration for Bible Figure AI generation"""

    # Depth & Length
    biographical_depth: str = Field(
        default="detailed",
        description="How comprehensive the biography should be",
        json_schema_extra={
            "options": ["overview", "detailed", "comprehensive"],
            "placeholder": "detailed - Full life story with major events and context"
        }
    )

    # Focus Areas
    lesson_emphasis: str = Field(
        default="character",
        description="What aspect of their life to emphasize",
        json_schema_extra={
            "options": ["character", "faith", "leadership", "service", "redemption", "obedience", "all"],
            "placeholder": "character - Focus on personality traits and growth"
        }
    )

    # Modern Connection
    modern_relevance: str = Field(
        default="strong",
        description="How much to connect to modern life",
        json_schema_extra={
            "options": ["light", "moderate", "strong"],
            "placeholder": "strong - Explicit connections to today's challenges"
        }
    )

    # Content Sections
    include_timeline: bool = Field(
        default=True,
        description="Include chronological timeline of major events"
    )
    include_key_verses: bool = Field(
        default=True,
        description="List key Scripture references about this person"
    )
    num_key_lessons: int = Field(
        default=5,
        ge=3,
        le=10,
        description="Number of life lessons to highlight"
    )
    include_related_figures: bool = Field(
        default=True,
        description="Suggest related biblical figures to study"
    )

    # Theological
    doctrinal_foundation: DoctrinalFoundation = Field(
        default=DoctrinalFoundation.BALANCED,
        description="Theological perspective on the figure"
    )

    # Presentation
    show_human_flaws: bool = Field(
        default=True,
        description="Include their mistakes and weaknesses (not just heroic aspects)"
    )
    cultural_context: bool = Field(
        default=True,
        description="Explain historical and cultural background"
    )


class DailyQuizConfig(BaseModel):
    """Configuration for Daily Quiz AI generation"""

    # Difficulty
    difficulty_level: str = Field(
        default="mixed",
        description="Overall quiz difficulty",
        json_schema_extra={
            "options": ["easy", "medium", "hard", "mixed"],
            "placeholder": "mixed - Combination of easy, medium, and hard questions"
        }
    )
    difficulty_distribution: Optional[str] = Field(
        default="40% easy, 40% medium, 20% hard",
        description="For mixed difficulty, the percentage breakdown",
        json_schema_extra={
            "placeholder": "e.g., '30% easy, 50% medium, 20% hard'"
        }
    )

    # Question Types
    question_types: List[str] = Field(
        default=["factual", "interpretive", "application"],
        description="Types of questions to include",
        json_schema_extra={
            "options": ["factual", "interpretive", "application", "chronological", "character", "geography"],
            "placeholder": "factual - Who, what, when, where questions"
        }
    )

    # Scripture Focus
    scripture_scope: str = Field(
        default="whole_bible",
        description="Which parts of the Bible to draw from",
        json_schema_extra={
            "options": ["old_testament", "new_testament", "gospels", "epistles", "whole_bible", "specific_book"],
            "placeholder": "whole_bible - Questions from anywhere in Scripture"
        }
    )
    specific_books: Optional[List[str]] = Field(
        default=None,
        description="If scope is specific_book, list the books",
        json_schema_extra={
            "placeholder": "e.g., ['Genesis', 'Exodus', 'Psalms']"
        }
    )

    # Explanations
    explanation_depth: str = Field(
        default="detailed",
        description="How thorough answer explanations should be",
        json_schema_extra={
            "options": ["brief", "moderate", "detailed"],
            "placeholder": "detailed - Full explanation with Scripture references"
        }
    )
    include_verse_references: bool = Field(
        default=True,
        description="Include Bible references in explanations"
    )

    # Learning Focus
    learning_objective: str = Field(
        default="knowledge",
        description="Primary learning goal",
        json_schema_extra={
            "options": ["knowledge", "understanding", "application", "engagement"],
            "placeholder": "knowledge - Build biblical literacy and familiarity"
        }
    )

    # Time
    suggested_time_per_question: int = Field(
        default=30,
        ge=15,
        le=120,
        description="Seconds to allocate per question"
    )


class BibleStudyConfig(BaseModel):
    """Configuration for Bible Study AI generation"""

    # Study Format
    study_format: str = Field(
        default="inductive",
        description="Methodological approach to the study",
        json_schema_extra={
            "options": ["inductive", "topical", "expository", "narrative", "word_study", "character_study"],
            "placeholder": "inductive - Observation, interpretation, application method"
        }
    )

    # Group Setting
    group_size: str = Field(
        default="small_group",
        description="Target group setting",
        json_schema_extra={
            "options": ["individual", "couples", "small_group", "large_group", "mixed"],
            "placeholder": "small_group - 6-12 people discussion format"
        }
    )

    # Depth & Duration
    depth_level: str = Field(
        default="intermediate",
        description="Theological and intellectual depth",
        json_schema_extra={
            "options": ["introductory", "intermediate", "advanced", "scholarly"],
            "placeholder": "intermediate - Assumes basic Bible familiarity"
        }
    )
    session_duration: int = Field(
        default=60,
        ge=30,
        le=120,
        description="Target minutes per session"
    )

    # Theological
    doctrinal_foundation: DoctrinalFoundation = Field(
        default=DoctrinalFoundation.BALANCED,
        description="Theological perspective"
    )
    doctrinal_notes: Optional[str] = Field(
        default=None,
        description="Specific theological emphasis or cautions",
        json_schema_extra={
            "placeholder": "e.g., 'Emphasize the sovereignty of God alongside human responsibility'"
        }
    )

    # Content Balance
    teaching_vs_discussion: str = Field(
        default="balanced",
        description="Ratio of teaching content to discussion",
        json_schema_extra={
            "options": ["teaching_heavy", "discussion_heavy", "balanced"],
            "placeholder": "balanced - 50% content, 50% discussion questions"
        }
    )

    # Application
    application_emphasis: str = Field(
        default="personal",
        description="Where to focus practical application",
        json_schema_extra={
            "options": ["personal", "community", "mission", "family", "workplace", "all"],
            "placeholder": "personal - Individual spiritual growth and character"
        }
    )

    # Structure
    include_icebreaker: bool = Field(
        default=True,
        description="Start with a warm-up question"
    )
    include_leader_notes: bool = Field(
        default=True,
        description="Add notes specifically for group leaders"
    )
    include_homework: bool = Field(
        default=False,
        description="Include between-session assignments"
    )
    num_discussion_questions: int = Field(
        default=5,
        ge=3,
        le=10,
        description="Number of discussion questions per section"
    )


class TopicalCategoryConfig(BaseModel):
    """Configuration for Topical Category AI generation"""

    # Scope
    category_scope: str = Field(
        default="focused",
        description="How broad or narrow the category should be",
        json_schema_extra={
            "options": ["broad", "focused", "niche"],
            "placeholder": "focused - Clear topic with defined boundaries"
        }
    )

    # Emotional Tone
    emotional_tone: str = Field(
        default="balanced",
        description="The emotional feel of the category",
        json_schema_extra={
            "options": ["comforting", "challenging", "encouraging", "reflective", "joyful", "balanced"],
            "placeholder": "balanced - Appropriate to the topic's nature"
        }
    )

    # Visual Style
    color_palette: str = Field(
        default="warm",
        description="Suggested color family for the category",
        json_schema_extra={
            "options": ["warm", "cool", "vibrant", "muted", "earth_tones", "auto"],
            "placeholder": "warm - Reds, oranges, yellows for welcoming feel"
        }
    )
    icon_style: str = Field(
        default="simple",
        description="Icon visual style",
        json_schema_extra={
            "options": ["simple", "detailed", "symbolic", "modern"],
            "placeholder": "simple - Clean, recognizable icons"
        }
    )

    # Description
    description_style: str = Field(
        default="inviting",
        description="How to write the category description",
        json_schema_extra={
            "options": ["inviting", "informative", "pastoral", "academic"],
            "placeholder": "inviting - Welcoming language that draws readers in"
        }
    )


class TopicalVerseConfig(BaseModel):
    """Configuration for Topical Verse AI generation"""

    # Commentary Style
    commentary_style: str = Field(
        default="devotional",
        description="Approach to verse commentary",
        json_schema_extra={
            "options": ["devotional", "academic", "practical", "expository"],
            "placeholder": "devotional - Heart-centered, spiritually nourishing"
        }
    )
    commentary_length: ContentLength = Field(
        default=ContentLength.MODERATE,
        description="Length of the commentary section"
    )

    # Theological
    doctrinal_foundation: DoctrinalFoundation = Field(
        default=DoctrinalFoundation.BALANCED,
        description="Theological perspective"
    )

    # Application
    application_specificity: str = Field(
        default="actionable",
        description="How specific the application should be",
        json_schema_extra={
            "options": ["general", "specific", "actionable", "reflective"],
            "placeholder": "actionable - Concrete steps the reader can take"
        }
    )
    application_areas: List[str] = Field(
        default=["personal", "relational"],
        description="Life areas to address in application",
        json_schema_extra={
            "options": ["personal", "relational", "professional", "spiritual", "emotional", "physical"],
            "placeholder": "Which life areas should the application address"
        }
    )

    # Cross-references
    cross_reference_level: str = Field(
        default="few",
        description="How many related verses to include",
        json_schema_extra={
            "options": ["none", "few", "moderate", "many"],
            "placeholder": "few - 1-2 closely related verses"
        }
    )

    # Context
    include_historical_context: bool = Field(
        default=True,
        description="Explain the verse's original context"
    )
    include_word_study: bool = Field(
        default=False,
        description="Include Hebrew/Greek word meanings"
    )


class DevotionPlanConfig(BaseModel):
    """Configuration for Devotion Plan AI generation"""

    # Journey Arc
    journey_arc: str = Field(
        default="building",
        description="How the plan progresses emotionally/spiritually",
        json_schema_extra={
            "options": ["building", "consistent", "peaks_valleys", "climactic"],
            "placeholder": "building - Each day builds on the previous, crescendo at end"
        }
    )

    # Daily Commitment
    daily_minutes: int = Field(
        default=10,
        ge=5,
        le=30,
        description="Target minutes per day for the reader"
    )
    reading_level: ReadingLevel = Field(
        default=ReadingLevel.MODERATE,
        description="Vocabulary complexity"
    )

    # Theological
    doctrinal_foundation: DoctrinalFoundation = Field(
        default=DoctrinalFoundation.BALANCED,
        description="Theological alignment"
    )
    doctrinal_notes: Optional[str] = Field(
        default=None,
        description="Specific theological guidelines",
        json_schema_extra={
            "placeholder": "e.g., 'Emphasize the Holy Spirit's work in sanctification'"
        }
    )

    # Interactivity
    interactivity_level: str = Field(
        default="moderate",
        description="How interactive each day is",
        json_schema_extra={
            "options": ["reading_only", "with_questions", "with_exercises", "highly_interactive"],
            "placeholder": "moderate - Reading plus 2-3 reflection questions"
        }
    )
    include_journaling_prompts: bool = Field(
        default=True,
        description="Add journaling/writing exercises"
    )
    include_action_steps: bool = Field(
        default=True,
        description="Include practical daily action items"
    )
    include_prayer: bool = Field(
        default=True,
        description="Include daily closing prayers"
    )

    # Community
    community_aspect: str = Field(
        default="individual",
        description="Social dimension of the plan",
        json_schema_extra={
            "options": ["individual", "shareable", "group_discussion", "accountability_partner"],
            "placeholder": "individual - Designed for personal use"
        }
    )

    # Scripture
    scripture_approach: str = Field(
        default="thematic",
        description="How Scripture is integrated",
        json_schema_extra={
            "options": ["thematic", "sequential", "varied", "single_passage"],
            "placeholder": "thematic - Verses selected to support each day's theme"
        }
    )

    # Outcome
    transformation_goal: Optional[str] = Field(
        default=None,
        description="What change should readers experience by the end",
        json_schema_extra={
            "placeholder": "e.g., 'Readers will develop a consistent prayer habit and experience deeper intimacy with God'"
        }
    )


class ShareableImageConfig(BaseModel):
    """Configuration for Shareable Image AI generation"""

    # Visual Style
    visual_style: str = Field(
        default="minimalist",
        description="Overall visual approach",
        json_schema_extra={
            "options": ["minimalist", "decorative", "bold", "elegant", "modern", "classic"],
            "placeholder": "minimalist - Clean, simple design with focus on text"
        }
    )
    color_preference: str = Field(
        default="auto",
        description="Color scheme preference",
        json_schema_extra={
            "options": ["light", "dark", "colorful", "muted", "auto"],
            "placeholder": "auto - Match colors to the verse's emotional tone"
        }
    )

    # Text Treatment
    text_treatment: str = Field(
        default="quote_with_reference",
        description="How to present the verse text",
        json_schema_extra={
            "options": ["quote_only", "quote_with_reference", "with_hashtags", "with_call_to_action"],
            "placeholder": "quote_with_reference - Verse text plus Scripture reference"
        }
    )
    allow_paraphrase: bool = Field(
        default=True,
        description="Allow AI to shorten/paraphrase for visual impact"
    )
    max_words: int = Field(
        default=30,
        ge=10,
        le=50,
        description="Maximum words for overlay text"
    )

    # Platform
    platform_optimization: str = Field(
        default="instagram",
        description="Primary social platform to design for",
        json_schema_extra={
            "options": ["instagram", "facebook", "twitter", "pinterest", "all_platforms"],
            "placeholder": "instagram - Square format, visual-first"
        }
    )

    # Mood
    mood: str = Field(
        default="auto",
        description="Emotional mood to convey",
        json_schema_extra={
            "options": ["peaceful", "powerful", "joyful", "contemplative", "hopeful", "auto"],
            "placeholder": "auto - Match mood to verse content"
        }
    )

    # Branding
    include_church_branding: bool = Field(
        default=False,
        description="Add church logo/name to the image"
    )
    branding_position: str = Field(
        default="bottom_corner",
        description="Where to place branding",
        json_schema_extra={
            "options": ["bottom_corner", "top_corner", "watermark", "none"],
            "placeholder": "bottom_corner - Subtle placement in corner"
        }
    )

    # Caption
    caption_style: str = Field(
        default="engaging",
        description="Style of social media caption",
        json_schema_extra={
            "options": ["engaging", "informative", "questioning", "call_to_action", "simple"],
            "placeholder": "engaging - Invites interaction and sharing"
        }
    )
    include_hashtags: bool = Field(
        default=True,
        description="Generate relevant hashtags"
    )
    num_hashtags: int = Field(
        default=5,
        ge=0,
        le=10,
        description="Number of hashtags to suggest"
    )


# ==================== MASTER CONFIGURATION ====================


class ExplorePromptConfiguration(BaseModel):
    """Master configuration containing all content type settings"""

    church_id: str
    updated_by: Optional[str] = None
    updated_at: Optional[str] = None

    # Global image generation settings
    image_config: GlobalImageConfig = Field(default_factory=GlobalImageConfig)

    # Per-content-type configurations
    daily_devotion: DailyDevotionConfig = Field(default_factory=DailyDevotionConfig)
    verse_of_the_day: VerseOfTheDayConfig = Field(default_factory=VerseOfTheDayConfig)
    bible_figure: BibleFigureConfig = Field(default_factory=BibleFigureConfig)
    daily_quiz: DailyQuizConfig = Field(default_factory=DailyQuizConfig)
    bible_study: BibleStudyConfig = Field(default_factory=BibleStudyConfig)
    topical_category: TopicalCategoryConfig = Field(default_factory=TopicalCategoryConfig)
    topical_verse: TopicalVerseConfig = Field(default_factory=TopicalVerseConfig)
    devotion_plan: DevotionPlanConfig = Field(default_factory=DevotionPlanConfig)
    shareable_image: ShareableImageConfig = Field(default_factory=ShareableImageConfig)


# ==================== HELPER FUNCTIONS ====================


def get_config_schema_with_placeholders() -> Dict[str, Any]:
    """Get the full schema with placeholders for UI display"""
    return {
        "image_config": {
            "label": "Image Generation",
            "description": "Configure visual style for AI-generated images across all content types",
            "config": GlobalImageConfig.model_json_schema(),
        },
        "daily_devotion": {
            "label": "Daily Devotion",
            "description": "Configure AI generation for daily devotional content",
            "config": DailyDevotionConfig.model_json_schema(),
        },
        "verse_of_the_day": {
            "label": "Verse of the Day",
            "description": "Configure AI generation for daily verse content",
            "config": VerseOfTheDayConfig.model_json_schema(),
        },
        "bible_figure": {
            "label": "Bible Figure",
            "description": "Configure AI generation for biblical character profiles",
            "config": BibleFigureConfig.model_json_schema(),
        },
        "daily_quiz": {
            "label": "Daily Quiz",
            "description": "Configure AI generation for Bible knowledge quizzes",
            "config": DailyQuizConfig.model_json_schema(),
        },
        "bible_study": {
            "label": "Bible Study",
            "description": "Configure AI generation for in-depth Bible studies",
            "config": BibleStudyConfig.model_json_schema(),
        },
        "topical_category": {
            "label": "Topical Category",
            "description": "Configure AI generation for topic categories",
            "config": TopicalCategoryConfig.model_json_schema(),
        },
        "topical_verse": {
            "label": "Topical Verse",
            "description": "Configure AI generation for verse commentary",
            "config": TopicalVerseConfig.model_json_schema(),
        },
        "devotion_plan": {
            "label": "Devotion Plan",
            "description": "Configure AI generation for multi-day devotion plans",
            "config": DevotionPlanConfig.model_json_schema(),
        },
        "shareable_image": {
            "label": "Shareable Image",
            "description": "Configure AI generation for social media images",
            "config": ShareableImageConfig.model_json_schema(),
        },
    }
