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
]
