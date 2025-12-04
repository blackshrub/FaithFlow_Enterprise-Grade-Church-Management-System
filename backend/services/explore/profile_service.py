"""
User Spiritual Profile Service

Handles:
1. Implicit signal tracking (automatic behavior tracking)
2. Profile computation (deriving insights from behavior)
3. Content personalization recommendations
4. Onboarding management

Hybrid Approach:
- Daily content: Pre-generated variants selected based on profile
- Journeys/special situations: On-demand generation with user context
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
import logging
from collections import Counter

from models.explore.user_profile import (
    UserSpiritualProfile,
    OnboardingResponse,
    ContentEngagement,
    TopicInterest,
    BibleExploration,
    LearningPattern,
    QuizPerformance,
    LifeSituation,
    SpiritualGrowthIndicators,
    ProfileComputationResult,
    DEFAULT_ONBOARDING_QUESTIONS,
)

logger = logging.getLogger(__name__)


# Topic mapping from content to broader themes
CONTENT_TOPIC_MAPPING = {
    # Bible books to topics
    "Psalms": ["worship", "prayer", "emotions", "praise"],
    "Proverbs": ["wisdom", "practical_living", "relationships"],
    "Job": ["suffering", "faith", "perseverance"],
    "Romans": ["theology", "salvation", "faith"],
    "Philippians": ["joy", "contentment", "faith"],
    "James": ["practical_faith", "wisdom", "perseverance"],
    "John": ["love", "salvation", "jesus"],
    "Matthew": ["kingdom", "jesus", "discipleship"],
    "Genesis": ["creation", "beginnings", "faith"],
    "Exodus": ["deliverance", "god_faithfulness", "leadership"],

    # Content categories to topics
    "prayer": ["prayer", "spiritual_disciplines"],
    "faith": ["faith", "trust"],
    "hope": ["hope", "encouragement"],
    "love": ["love", "relationships"],
    "peace": ["peace", "anxiety_relief"],
    "joy": ["joy", "gratitude"],
    "wisdom": ["wisdom", "decision_making"],
    "guidance": ["guidance", "direction"],
    "healing": ["healing", "restoration"],
    "relationships": ["relationships", "family"],
    "work": ["faith_work", "calling"],
    "leadership": ["leadership", "service"],
}

# Life challenge to topic priorities
CHALLENGE_TOPIC_PRIORITIES = {
    "work_stress": ["peace", "wisdom", "faith_work", "trust"],
    "family": ["relationships", "love", "patience", "wisdom"],
    "health": ["healing", "hope", "faith", "peace"],
    "anxiety": ["peace", "trust", "hope", "faith"],
    "grief": ["comfort", "hope", "healing", "god_faithfulness"],
    "financial": ["trust", "provision", "contentment", "wisdom"],
    "direction": ["guidance", "wisdom", "calling", "trust"],
}


class ProfileService:
    """Manages user spiritual profiles and personalization"""

    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        self.collection = db.user_spiritual_profiles

    # ==================== PROFILE CRUD ====================

    async def get_or_create_profile(
        self, church_id: str, user_id: str
    ) -> UserSpiritualProfile:
        """Get user profile or create if not exists"""
        profile = await self.collection.find_one(
            {"church_id": church_id, "user_id": user_id, "deleted": False}
        )

        if profile:
            return UserSpiritualProfile(**profile)

        # Create new profile
        new_profile = UserSpiritualProfile(
            id=f"{church_id}_{user_id}",
            church_id=church_id,
            user_id=user_id,
        )

        await self.collection.insert_one(new_profile.model_dump())
        logger.info(f"Created spiritual profile for user {user_id} in church {church_id}")

        return new_profile

    async def get_profile(
        self, church_id: str, user_id: str
    ) -> Optional[UserSpiritualProfile]:
        """Get user profile if exists"""
        profile = await self.collection.find_one(
            {"church_id": church_id, "user_id": user_id, "deleted": False}
        )
        return UserSpiritualProfile(**profile) if profile else None

    async def update_profile(
        self, church_id: str, user_id: str, updates: Dict[str, Any]
    ) -> UserSpiritualProfile:
        """Update user profile"""
        updates["updated_at"] = datetime.now()

        await self.collection.update_one(
            {"church_id": church_id, "user_id": user_id, "deleted": False},
            {"$set": updates}
        )

        return await self.get_or_create_profile(church_id, user_id)

    # ==================== ONBOARDING ====================

    async def get_onboarding_questions(self) -> List[Dict[str, Any]]:
        """Get onboarding questions"""
        return [q.model_dump() for q in DEFAULT_ONBOARDING_QUESTIONS]

    async def submit_onboarding(
        self,
        church_id: str,
        user_id: str,
        responses: List[Dict[str, Any]],
        skipped: bool = False
    ) -> UserSpiritualProfile:
        """Submit onboarding responses"""
        profile = await self.get_or_create_profile(church_id, user_id)

        # Parse responses
        onboarding_responses = []
        life_situation = LifeSituation()
        explicit_interests = []

        for resp in responses:
            question_id = resp.get("question_id")
            value = resp.get("value")

            onboarding_responses.append(OnboardingResponse(
                question_id=question_id,
                response_value=value,
            ))

            # Map responses to profile fields
            if question_id == "faith_journey":
                life_situation.faith_journey = value
            elif question_id == "life_challenges":
                if isinstance(value, list):
                    life_situation.current_challenges = [v for v in value if v != "none"]
            elif question_id == "interest_topics":
                if isinstance(value, list):
                    explicit_interests = value[:3]  # Max 3
            elif question_id == "reading_depth":
                # Map to recommended difficulty
                depth_to_difficulty = {
                    "simple": "beginner",
                    "balanced": "intermediate",
                    "deep": "advanced",
                }
                profile.recommended_difficulty = depth_to_difficulty.get(value, "beginner")

        # Compute initial priority topics from challenges and interests
        priority_topics = []
        for challenge in life_situation.current_challenges:
            topics = CHALLENGE_TOPIC_PRIORITIES.get(challenge, [])
            priority_topics.extend(topics[:2])  # Top 2 per challenge

        priority_topics.extend(explicit_interests)
        priority_topics = list(dict.fromkeys(priority_topics))[:6]  # Unique, max 6

        # Update profile
        updates = {
            "onboarding_completed": not skipped,
            "onboarding_completed_at": datetime.now() if not skipped else None,
            "onboarding_responses": [r.model_dump() for r in onboarding_responses],
            "onboarding_skipped": skipped,
            "life_situation": life_situation.model_dump(),
            "explicit_interests": explicit_interests,
            "priority_topics": priority_topics,
            "updated_at": datetime.now(),
        }

        if profile.recommended_difficulty != "beginner":
            updates["recommended_difficulty"] = profile.recommended_difficulty

        await self.collection.update_one(
            {"id": profile.id},
            {"$set": updates}
        )

        logger.info(f"User {user_id} completed onboarding (skipped={skipped})")
        return await self.get_or_create_profile(church_id, user_id)

    async def skip_onboarding(
        self, church_id: str, user_id: str
    ) -> UserSpiritualProfile:
        """Mark onboarding as skipped"""
        return await self.submit_onboarding(church_id, user_id, [], skipped=True)

    # ==================== IMPLICIT SIGNAL TRACKING ====================

    async def track_content_view(
        self,
        church_id: str,
        user_id: str,
        content_id: str,
        content_type: str,
        content_topics: List[str] = None,
        bible_reference: Dict[str, Any] = None,
    ) -> None:
        """Track content view (called when user opens content)"""
        profile = await self.get_or_create_profile(church_id, user_id)
        now = datetime.now()

        # Find existing engagement
        engagements = profile.content_engagements
        existing_idx = next(
            (i for i, e in enumerate(engagements) if e.content_id == content_id),
            None
        )

        if existing_idx is not None:
            # Update existing
            engagements[existing_idx].last_viewed_at = now
            engagements[existing_idx].total_views += 1
        else:
            # Add new
            engagements.append(ContentEngagement(
                content_id=content_id,
                content_type=content_type,
                first_viewed_at=now,
                last_viewed_at=now,
            ))

        # Keep last 100 engagements
        if len(engagements) > 100:
            engagements = sorted(engagements, key=lambda x: x.last_viewed_at, reverse=True)[:100]

        # Update topic interests
        if content_topics:
            await self._update_topic_interests(profile, content_topics)

        # Update Bible exploration
        if bible_reference:
            await self._update_bible_exploration(profile, bible_reference)

        # Update last activity and learning pattern
        await self._update_learning_pattern(profile, now)

        await self.collection.update_one(
            {"id": profile.id},
            {
                "$set": {
                    "content_engagements": [e.model_dump() for e in engagements],
                    "last_activity": now,
                    "updated_at": now,
                }
            }
        )

    async def track_content_completion(
        self,
        church_id: str,
        user_id: str,
        content_id: str,
        completion_percentage: int,
        time_spent_seconds: int,
    ) -> None:
        """Track content completion (called when user finishes content)"""
        profile = await self.get_or_create_profile(church_id, user_id)

        # Find engagement
        engagements = profile.content_engagements
        existing_idx = next(
            (i for i, e in enumerate(engagements) if e.content_id == content_id),
            None
        )

        if existing_idx is not None:
            engagements[existing_idx].completion_percentage = completion_percentage
            engagements[existing_idx].time_spent_seconds += time_spent_seconds
            engagements[existing_idx].last_viewed_at = datetime.now()

            await self.collection.update_one(
                {"id": profile.id},
                {
                    "$set": {
                        f"content_engagements.{existing_idx}": engagements[existing_idx].model_dump(),
                        "updated_at": datetime.now(),
                    }
                }
            )

    async def track_content_action(
        self,
        church_id: str,
        user_id: str,
        content_id: str,
        action: str,  # "bookmark", "favorite", "share", "companion"
        value: bool = True,
    ) -> None:
        """Track user action on content"""
        profile = await self.get_or_create_profile(church_id, user_id)

        engagements = profile.content_engagements
        existing_idx = next(
            (i for i, e in enumerate(engagements) if e.content_id == content_id),
            None
        )

        if existing_idx is not None:
            update_field = None
            if action == "bookmark":
                engagements[existing_idx].bookmarked = value
                update_field = f"content_engagements.{existing_idx}.bookmarked"
            elif action == "favorite":
                engagements[existing_idx].favorited = value
                update_field = f"content_engagements.{existing_idx}.favorited"
            elif action == "share":
                engagements[existing_idx].shared = True
                update_field = f"content_engagements.{existing_idx}.shared"
            elif action == "companion":
                engagements[existing_idx].companion_interactions += 1
                update_field = f"content_engagements.{existing_idx}.companion_interactions"

            if update_field:
                await self.collection.update_one(
                    {"id": profile.id},
                    {"$set": {update_field: getattr(engagements[existing_idx], action.replace("companion", "companion_interactions")) if action != "companion" else engagements[existing_idx].companion_interactions}}
                )

    async def track_quiz_result(
        self,
        church_id: str,
        user_id: str,
        quiz_id: str,
        score: int,
        categories: List[str],
    ) -> None:
        """Track quiz result for performance analysis"""
        profile = await self.get_or_create_profile(church_id, user_id)

        quiz_perf = profile.quiz_performance
        quiz_perf.total_quizzes_taken += 1

        # Update average score
        prev_total = quiz_perf.average_score * (quiz_perf.total_quizzes_taken - 1)
        quiz_perf.average_score = (prev_total + score) / quiz_perf.total_quizzes_taken

        # Update category scores
        for cat in categories:
            if cat in quiz_perf.category_scores:
                # Running average
                quiz_perf.category_scores[cat] = (quiz_perf.category_scores[cat] + score) / 2
            else:
                quiz_perf.category_scores[cat] = float(score)

        quiz_perf.last_quiz_date = datetime.now()

        # Determine strongest/weakest categories
        if quiz_perf.category_scores:
            sorted_cats = sorted(quiz_perf.category_scores.items(), key=lambda x: x[1], reverse=True)
            quiz_perf.strongest_categories = [c[0] for c in sorted_cats[:3]]
            quiz_perf.weakest_categories = [c[0] for c in sorted_cats[-3:]]

        await self.collection.update_one(
            {"id": profile.id},
            {"$set": {"quiz_performance": quiz_perf.model_dump(), "updated_at": datetime.now()}}
        )

    async def track_companion_interaction(
        self,
        church_id: str,
        user_id: str,
        context: str,  # "devotion_reflection", "bible_study_qa", "general"
        topics_discussed: List[str] = None,
    ) -> None:
        """Track companion usage for profile insights"""
        profile = await self.get_or_create_profile(church_id, user_id)

        # Update learning pattern
        profile.learning_pattern.uses_companion_for_questions = True

        # Update topic interests from conversation
        if topics_discussed:
            await self._update_topic_interests(profile, topics_discussed)

        await self.collection.update_one(
            {"id": profile.id},
            {
                "$set": {
                    "learning_pattern.uses_companion_for_questions": True,
                    "updated_at": datetime.now(),
                }
            }
        )

    # ==================== PROFILE COMPUTATION ====================

    async def compute_profile_insights(
        self, church_id: str, user_id: str
    ) -> ProfileComputationResult:
        """
        Compute profile insights for content personalization

        This is called when selecting content for a user.
        Returns weights and priorities for content selection.
        """
        profile = await self.get_or_create_profile(church_id, user_id)

        result = ProfileComputationResult(user_id=user_id)

        # 1. Compute content type weights
        result.content_weights = self._compute_content_weights(profile)

        # 2. Compute topic priorities
        result.topic_priorities = self._compute_topic_priorities(profile)

        # 3. Determine recommended settings
        result.recommended_difficulty = profile.recommended_difficulty
        result.recommended_depth = self._compute_recommended_depth(profile)
        result.recommended_session_length = self._compute_session_length(profile)

        # 4. Check special conditions
        result.needs_encouragement = self._check_needs_encouragement(profile)
        result.exploring_doubt = profile.life_situation.faith_journey == "questioning"

        # 5. Add contextual factors
        if profile.current_sermon_theme and profile.sermon_theme_expires_at:
            if profile.sermon_theme_expires_at > datetime.now():
                result.sermon_theme = profile.current_sermon_theme

        if profile.prayer_content_weights and profile.prayer_weights_expires_at:
            if profile.prayer_weights_expires_at > datetime.now():
                result.prayer_influenced_topics = list(profile.prayer_content_weights.keys())

        if profile.active_journeys:
            result.journey_content_priority = profile.active_journeys[0]  # Primary journey

        return result

    async def compute_and_update_growth_indicators(
        self, church_id: str, user_id: str
    ) -> SpiritualGrowthIndicators:
        """Compute and store growth indicators"""
        profile = await self.get_or_create_profile(church_id, user_id)

        indicators = SpiritualGrowthIndicators()

        # Consistency score (based on activity frequency)
        if profile.last_activity:
            days_since_activity = (datetime.now() - profile.last_activity).days
            if days_since_activity <= 1:
                indicators.consistency_score = 100
            elif days_since_activity <= 3:
                indicators.consistency_score = 75
            elif days_since_activity <= 7:
                indicators.consistency_score = 50
            else:
                indicators.consistency_score = max(0, 50 - (days_since_activity - 7) * 5)

        # Get streak from progress service if exists
        progress = await self.db.user_explore_progress.find_one(
            {"church_id": church_id, "user_id": user_id, "deleted": False}
        )
        if progress:
            indicators.current_streak = progress.get("streak", {}).get("current_streak", 0)
            indicators.longest_streak = progress.get("streak", {}).get("longest_streak", 0)

        # Depth score (based on content completion and types)
        completed_count = sum(1 for e in profile.content_engagements if e.completion_percentage >= 80)
        total_engagements = len(profile.content_engagements) or 1
        indicators.depth_score = min(100, (completed_count / total_engagements) * 100)

        # Bible study completion rate
        study_engagements = [e for e in profile.content_engagements if e.content_type == "bible_study"]
        if study_engagements:
            indicators.bible_study_completion_rate = sum(e.completion_percentage for e in study_engagements) / len(study_engagements)

        # Breadth score
        indicators.topics_explored = len(profile.topic_interests)
        indicators.bible_books_explored = len(profile.bible_exploration)
        indicators.breadth_score = min(100, (indicators.topics_explored * 5) + (indicators.bible_books_explored * 3))

        # Computed maturity
        avg_score = (indicators.consistency_score + indicators.depth_score + indicators.breadth_score) / 3
        if avg_score >= 70:
            indicators.computed_maturity = "advanced"
        elif avg_score >= 40:
            indicators.computed_maturity = "intermediate"
        else:
            indicators.computed_maturity = "beginner"

        indicators.last_computed = datetime.now()

        # Update profile
        await self.collection.update_one(
            {"id": profile.id},
            {"$set": {"growth_indicators": indicators.model_dump(), "updated_at": datetime.now()}}
        )

        return indicators

    # ==================== CONTENT SELECTION HELPERS ====================

    async def get_variant_selection_context(
        self, church_id: str, user_id: str
    ) -> Dict[str, Any]:
        """
        Get context for selecting pre-generated content variants

        Used by the Hybrid approach to pick the best variant for a user.
        """
        profile = await self.get_or_create_profile(church_id, user_id)
        insights = await self.compute_profile_insights(church_id, user_id)

        return {
            "difficulty": insights.recommended_difficulty,
            "depth": insights.recommended_depth,
            "priority_topics": insights.topic_priorities[:3],
            "faith_journey": profile.life_situation.faith_journey,
            "current_challenges": profile.life_situation.current_challenges,
            "sermon_theme": insights.sermon_theme,
            "prayer_topics": insights.prayer_influenced_topics,
            "needs_encouragement": insights.needs_encouragement,
            "exploring_doubt": insights.exploring_doubt,
            "content_weights": insights.content_weights,
        }

    async def get_ondemand_generation_context(
        self, church_id: str, user_id: str, content_type: str
    ) -> Dict[str, Any]:
        """
        Get full context for on-demand content generation

        Used for journeys and special situations where content
        is generated specifically for this user.
        """
        profile = await self.get_or_create_profile(church_id, user_id)
        insights = await self.compute_profile_insights(church_id, user_id)

        # Get recent activity for context
        recent_content = profile.content_engagements[:10]
        recent_topics = [t.topic for t in profile.topic_interests[:5]]

        return {
            "user_id": user_id,
            "content_type": content_type,

            # Profile basics
            "faith_journey": profile.life_situation.faith_journey,
            "life_stage": profile.life_situation.life_stage,
            "current_challenges": profile.life_situation.current_challenges,
            "age_range": profile.life_situation.age_range,

            # Preferences
            "difficulty": insights.recommended_difficulty,
            "depth": insights.recommended_depth,
            "explicit_interests": profile.explicit_interests,
            "priority_topics": insights.topic_priorities,

            # Context
            "sermon_theme": insights.sermon_theme,
            "prayer_topics": insights.prayer_influenced_topics,
            "active_journeys": profile.active_journeys,

            # Recent activity
            "recent_topics_engaged": recent_topics,
            "recent_content_types": list(set(e.content_type for e in recent_content)),

            # Special states
            "needs_encouragement": insights.needs_encouragement,
            "exploring_doubt": insights.exploring_doubt,
            "in_crisis": insights.in_crisis,

            # Growth indicators
            "maturity_level": profile.growth_indicators.computed_maturity,
            "consistency_score": profile.growth_indicators.consistency_score,
        }

    # ==================== PRIVATE HELPERS ====================

    async def _update_topic_interests(
        self, profile: UserSpiritualProfile, topics: List[str]
    ) -> None:
        """Update topic interest scores"""
        now = datetime.now()
        interests = {t.topic: t for t in profile.topic_interests}

        for topic in topics:
            if topic in interests:
                interests[topic].engagement_score = min(100, interests[topic].engagement_score + 2)
                interests[topic].content_count += 1
                interests[topic].last_engagement = now
            else:
                interests[topic] = TopicInterest(
                    topic=topic,
                    engagement_score=10.0,
                    first_engagement=now,
                    last_engagement=now,
                    content_count=1,
                )

        # Decay old interests
        for topic_interest in interests.values():
            days_since = (now - topic_interest.last_engagement).days
            if days_since > 7:
                topic_interest.engagement_score = max(0, topic_interest.engagement_score - (days_since * 0.5))

        profile.topic_interests = sorted(
            interests.values(),
            key=lambda x: x.engagement_score,
            reverse=True
        )[:20]  # Keep top 20

        await self.collection.update_one(
            {"id": profile.id},
            {"$set": {"topic_interests": [t.model_dump() for t in profile.topic_interests]}}
        )

    async def _update_bible_exploration(
        self, profile: UserSpiritualProfile, bible_ref: Dict[str, Any]
    ) -> None:
        """Update Bible exploration tracking"""
        book = bible_ref.get("book")
        chapter = bible_ref.get("chapter")
        if not book:
            return

        now = datetime.now()
        exploration = {e.book: e for e in profile.bible_exploration}

        testament = "old" if book in [
            "Genesis", "Exodus", "Leviticus", "Numbers", "Deuteronomy",
            "Joshua", "Judges", "Ruth", "1 Samuel", "2 Samuel",
            "1 Kings", "2 Kings", "1 Chronicles", "2 Chronicles",
            "Ezra", "Nehemiah", "Esther", "Job", "Psalms", "Proverbs",
            "Ecclesiastes", "Song of Solomon", "Isaiah", "Jeremiah",
            "Lamentations", "Ezekiel", "Daniel", "Hosea", "Joel", "Amos",
            "Obadiah", "Jonah", "Micah", "Nahum", "Habakkuk", "Zephaniah",
            "Haggai", "Zechariah", "Malachi"
        ] else "new"

        if book in exploration:
            exploration[book].engagement_count += 1
            exploration[book].last_explored = now
            if chapter and chapter not in exploration[book].chapters_explored:
                exploration[book].chapters_explored.append(chapter)
        else:
            exploration[book] = BibleExploration(
                book=book,
                testament=testament,
                chapters_explored=[chapter] if chapter else [],
                engagement_count=1,
                last_explored=now,
            )

        profile.bible_exploration = list(exploration.values())

        await self.collection.update_one(
            {"id": profile.id},
            {"$set": {"bible_exploration": [e.model_dump() for e in profile.bible_exploration]}}
        )

    async def _update_learning_pattern(
        self, profile: UserSpiritualProfile, now: datetime
    ) -> None:
        """Update learning pattern from activity"""
        hour = now.hour
        day = now.weekday()

        pattern = profile.learning_pattern

        # Update preferred hours (keep top 5)
        if hour not in pattern.preferred_hours:
            pattern.preferred_hours.append(hour)
        if len(pattern.preferred_hours) > 5:
            # Keep most frequent
            hour_counts = Counter(pattern.preferred_hours)
            pattern.preferred_hours = [h for h, _ in hour_counts.most_common(5)]

        # Update preferred days
        if day not in pattern.preferred_days:
            pattern.preferred_days.append(day)
        if len(pattern.preferred_days) > 4:
            day_counts = Counter(pattern.preferred_days)
            pattern.preferred_days = [d for d, _ in day_counts.most_common(4)]

        pattern.last_updated = now

        await self.collection.update_one(
            {"id": profile.id},
            {"$set": {"learning_pattern": pattern.model_dump()}}
        )

    def _compute_content_weights(self, profile: UserSpiritualProfile) -> Dict[str, float]:
        """Compute weights for content type selection"""
        weights = profile.content_affinity.copy()

        # Boost based on engagement
        content_type_counts = Counter(e.content_type for e in profile.content_engagements)
        total = sum(content_type_counts.values()) or 1

        for ct, count in content_type_counts.items():
            if ct in weights:
                # Higher engagement = higher weight (max 1.5x boost)
                weights[ct] = weights[ct] * (1 + min(0.5, count / total))

        # Apply quiz preference
        if profile.learning_pattern.prefers_quizzes:
            weights["daily_quiz"] = weights.get("daily_quiz", 50) * 1.3

        return weights

    def _compute_topic_priorities(self, profile: UserSpiritualProfile) -> List[str]:
        """Compute ordered list of topic priorities"""
        priorities = []

        # 1. Explicit interests (highest priority)
        priorities.extend(profile.explicit_interests)

        # 2. Challenge-based topics
        for challenge in profile.life_situation.current_challenges:
            topics = CHALLENGE_TOPIC_PRIORITIES.get(challenge, [])
            for t in topics:
                if t not in priorities:
                    priorities.append(t)

        # 3. High-engagement topics
        for interest in profile.topic_interests[:5]:
            if interest.topic not in priorities:
                priorities.append(interest.topic)

        # 4. Prayer-influenced topics
        for topic in profile.prayer_content_weights.keys():
            if topic not in priorities:
                priorities.append(topic)

        return priorities[:10]  # Max 10

    def _compute_recommended_depth(self, profile: UserSpiritualProfile) -> str:
        """Compute recommended content depth"""
        # Based on onboarding response
        for resp in profile.onboarding_responses:
            if resp.question_id == "reading_depth":
                depth_map = {
                    "simple": "brief",
                    "balanced": "standard",
                    "deep": "in_depth",
                }
                return depth_map.get(resp.response_value, "standard")

        # Default based on engagement
        avg_completion = sum(e.completion_percentage for e in profile.content_engagements) / (len(profile.content_engagements) or 1)
        if avg_completion >= 80:
            return "standard"
        elif avg_completion >= 50:
            return "brief"
        else:
            return "brief"

    def _compute_session_length(self, profile: UserSpiritualProfile) -> str:
        """Compute recommended session length"""
        avg_time = profile.learning_pattern.average_session_minutes

        if avg_time >= 15:
            return "long"
        elif avg_time >= 7:
            return "medium"
        else:
            return "short"

    def _check_needs_encouragement(self, profile: UserSpiritualProfile) -> bool:
        """Check if user needs encouragement"""
        # Streak loss
        if profile.growth_indicators.current_streak == 0 and profile.growth_indicators.longest_streak > 7:
            return True

        # Declining engagement
        if profile.learning_pattern.engagement_trend == "decreasing":
            return True

        # No activity in a while
        if profile.last_activity:
            days_inactive = (datetime.now() - profile.last_activity).days
            if days_inactive >= 7:
                return True

        return False


# ==================== SINGLETON ACCESS ====================

_profile_service: Optional[ProfileService] = None


def get_profile_service(db: AsyncIOMotorClient) -> ProfileService:
    """Get or create ProfileService instance"""
    global _profile_service
    if _profile_service is None:
        _profile_service = ProfileService(db)
    return _profile_service
