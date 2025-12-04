"""
Explore Services

Business logic for Explore feature:
- Content resolution with multi-tenant support
- Daily scheduling
- User progress tracking
- User spiritual profiling
- Life stage journeys
- Sermon integration
- Prayer intelligence
- Contextual companion
- News context awareness
"""

from .content_resolver import ContentResolver
from .schedule_service import ScheduleService
from .progress_service import ProgressService
from .profile_service import ProfileService, get_profile_service
from .journey_service import JourneyService, get_journey_service
from .sermon_integration_service import SermonIntegrationService, get_sermon_integration_service
from .prayer_intelligence_service import PrayerIntelligenceService, get_prayer_intelligence_service
from .contextual_companion_service import ContextualCompanionService, get_contextual_companion_service
from .news_context_service import NewsContextService, get_news_context_service

__all__ = [
    # Core services
    "ContentResolver",
    "ScheduleService",
    "ProgressService",
    # Feature 1: User Profiling
    "ProfileService",
    "get_profile_service",
    # Feature 7: Life Stage Journeys
    "JourneyService",
    "get_journey_service",
    # Feature 6: Sermon Integration
    "SermonIntegrationService",
    "get_sermon_integration_service",
    # Feature 8: Prayer Intelligence
    "PrayerIntelligenceService",
    "get_prayer_intelligence_service",
    # Feature 4: Contextual Companion
    "ContextualCompanionService",
    "get_contextual_companion_service",
    # Feature 2: News Context
    "NewsContextService",
    "get_news_context_service",
]
