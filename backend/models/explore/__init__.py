"""
Explore Feature Models

Multi-tenant content management with:
- Global platform content shared across churches
- Church-specific content with takeover mechanism
- Multi-language support (EN + ID)
- AI-generated content tracking
- User progress and streak tracking
"""

from .content import (
    # Enums
    ContentScope,
    ContentStatus,
    ContentType,
    Language,
    # Base models
    BibleReference,
    MultilingualText,
    AIGenerationMetadata,
    # Daily content
    DailyDevotion,
    VerseOfTheDay,
    BibleFigureOfTheDay,
    # Quiz
    QuizQuestion,
    DailyQuiz,
    # Self-paced content
    StudyLesson,
    BibleStudy,
    TopicalCategory,
    TopicalVerse,
    DevotionPlan,
    ShareableImage,
)

from .settings import (
    # Platform settings
    APIConfiguration,
    PromptConfiguration,
    PlatformSettings,
    # Church adoption
    FeatureConfiguration,
    ChurchExploreSettings,
    # Schedule
    ContentScheduleEntry,
    # User progress
    ContentProgress,
    QuizAttempt,
    StreakData,
    UserExploreProgress,
    # Analytics
    ContentAnalytics,
)

from .prompt_config import (
    # Enums
    DoctrinalFoundation,
    ToneOfVoice,
    TargetAudience,
    ReadingLevel,
    ContentLength,
    # Image generation enums
    ImageStyle,
    ImageMood,
    ImageColorPalette,
    # Image configuration
    GlobalImageConfig,
    # Content type configs
    DailyDevotionConfig,
    VerseOfTheDayConfig,
    BibleFigureConfig,
    DailyQuizConfig,
    BibleStudyConfig,
    TopicalCategoryConfig,
    TopicalVerseConfig,
    DevotionPlanConfig,
    ShareableImageConfig,
    # Master config
    ExplorePromptConfiguration,
    # Helpers
    get_config_schema_with_placeholders,
)

__all__ = [
    # Enums
    "ContentScope",
    "ContentStatus",
    "ContentType",
    "Language",
    # Base models
    "BibleReference",
    "MultilingualText",
    "AIGenerationMetadata",
    # Daily content
    "DailyDevotion",
    "VerseOfTheDay",
    "BibleFigureOfTheDay",
    # Quiz
    "QuizQuestion",
    "DailyQuiz",
    # Self-paced content
    "StudyLesson",
    "BibleStudy",
    "TopicalCategory",
    "TopicalVerse",
    "DevotionPlan",
    "ShareableImage",
    # Platform settings
    "APIConfiguration",
    "PromptConfiguration",
    "PlatformSettings",
    # Church adoption
    "FeatureConfiguration",
    "ChurchExploreSettings",
    # Schedule
    "ContentScheduleEntry",
    # User progress
    "ContentProgress",
    "QuizAttempt",
    "StreakData",
    "UserExploreProgress",
    # Analytics
    "ContentAnalytics",
    # Prompt Configuration Enums
    "DoctrinalFoundation",
    "ToneOfVoice",
    "TargetAudience",
    "ReadingLevel",
    "ContentLength",
    # Image Generation Enums & Config
    "ImageStyle",
    "ImageMood",
    "ImageColorPalette",
    "GlobalImageConfig",
    # Prompt Configurations
    "DailyDevotionConfig",
    "VerseOfTheDayConfig",
    "BibleFigureConfig",
    "DailyQuizConfig",
    "BibleStudyConfig",
    "TopicalCategoryConfig",
    "TopicalVerseConfig",
    "DevotionPlanConfig",
    "ShareableImageConfig",
    "ExplorePromptConfiguration",
    "get_config_schema_with_placeholders",
]
