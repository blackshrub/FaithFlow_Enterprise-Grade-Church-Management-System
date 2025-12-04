"""
Life Stage Journey Service

Handles:
1. Journey discovery and browsing
2. Self-enrollment
3. Progress tracking
4. Pause/resume functionality
5. Completion and testimonials
6. Recommendations based on user profile
"""

from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any, Tuple
from motor.motor_asyncio import AsyncIOMotorClient
import logging

from models.explore.journey import (
    JourneyDefinition,
    UserJourneyEnrollment,
    JourneyWeekProgress,
    JourneyDayProgress,
    JourneyRecommendation,
    JOURNEY_TEMPLATES,
)
from services.explore.profile_service import get_profile_service

logger = logging.getLogger(__name__)


# Match situations to journey slugs
SITUATION_JOURNEY_MAP = {
    "grief": ["grief-recovery"],
    "new_believer": ["new-believer"],
    "exploring": ["new-believer"],
    "anxiety": ["overcoming-anxiety"],
    "work_stress": ["overcoming-anxiety", "career-transition"],
    "career_transition": ["career-transition"],
    "financial": ["career-transition", "overcoming-anxiety"],
    "family": ["marriage-strengthening", "parenting-with-faith"],
    "marriage": ["marriage-strengthening"],
    "parenting": ["parenting-with-faith"],
    "health": ["overcoming-anxiety", "grief-recovery"],
    "direction": ["spiritual-disciplines", "career-transition"],
    "leadership": ["leadership-development"],
    "spiritual_growth": ["spiritual-disciplines"],
    "returning": ["new-believer", "spiritual-disciplines"],
}


class JourneyService:
    """Manages life stage journeys"""

    def __init__(self, db: AsyncIOMotorClient):
        self.db = db
        self.journeys_collection = db.journey_definitions
        self.enrollments_collection = db.user_journey_enrollments

    # ==================== JOURNEY DISCOVERY ====================

    async def list_available_journeys(
        self,
        church_id: str,
        category: Optional[str] = None,
        difficulty: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """List all available journeys for a church"""
        query = {
            "status": "published",
            "deleted": False,
            "$or": [
                {"church_id": "global"},
                {"church_id": church_id},
            ]
        }

        if category:
            query["category"] = category

        if difficulty:
            query["difficulty"] = difficulty

        cursor = self.journeys_collection.find(query).sort("enrollments_count", -1)
        journeys = await cursor.to_list(100)

        return [self._format_journey_summary(j) for j in journeys]

    async def get_journey_details(
        self,
        journey_id: str,
        church_id: str,
    ) -> Optional[Dict[str, Any]]:
        """Get full journey details"""
        journey = await self.journeys_collection.find_one({
            "_id": journey_id,
            "status": "published",
            "deleted": False,
            "$or": [
                {"church_id": "global"},
                {"church_id": church_id},
            ]
        })

        if not journey:
            # Try by slug
            journey = await self.journeys_collection.find_one({
                "slug": journey_id,
                "status": "published",
                "deleted": False,
                "$or": [
                    {"church_id": "global"},
                    {"church_id": church_id},
                ]
            })

        return self._format_journey_full(journey) if journey else None

    async def get_journey_by_slug(
        self, slug: str, church_id: str
    ) -> Optional[JourneyDefinition]:
        """Get journey by slug"""
        journey = await self.journeys_collection.find_one({
            "slug": slug,
            "status": "published",
            "deleted": False,
            "$or": [
                {"church_id": "global"},
                {"church_id": church_id},
            ]
        })
        return JourneyDefinition(**journey) if journey else None

    async def get_recommended_journeys(
        self,
        church_id: str,
        user_id: str,
        limit: int = 3,
    ) -> List[JourneyRecommendation]:
        """Get AI-recommended journeys based on user profile"""
        profile_service = get_profile_service(self.db)
        profile = await profile_service.get_or_create_profile(church_id, user_id)

        recommendations = []
        matched_slugs = set()

        # 1. Match based on life challenges
        for challenge in profile.life_situation.current_challenges:
            slugs = SITUATION_JOURNEY_MAP.get(challenge, [])
            for slug in slugs:
                if slug not in matched_slugs:
                    matched_slugs.add(slug)
                    recommendations.append(JourneyRecommendation(
                        journey_id="",  # Will be filled
                        journey_slug=slug,
                        relevance_score=90 - len(recommendations) * 5,
                        reason={
                            "en": f"Recommended based on your current life situation",
                            "id": f"Direkomendasikan berdasarkan situasi hidup Anda saat ini"
                        },
                        matched_factors=[challenge],
                    ))

        # 2. Match based on faith journey
        faith_journey = profile.life_situation.faith_journey
        if faith_journey:
            slugs = SITUATION_JOURNEY_MAP.get(faith_journey, [])
            for slug in slugs:
                if slug not in matched_slugs:
                    matched_slugs.add(slug)
                    recommendations.append(JourneyRecommendation(
                        journey_id="",
                        journey_slug=slug,
                        relevance_score=85 - len(recommendations) * 5,
                        reason={
                            "en": f"Matches your faith journey stage",
                            "id": f"Sesuai dengan tahap perjalanan iman Anda"
                        },
                        matched_factors=[faith_journey],
                    ))

        # 3. Match based on explicit interests
        for interest in profile.explicit_interests:
            slugs = SITUATION_JOURNEY_MAP.get(interest, [])
            for slug in slugs:
                if slug not in matched_slugs:
                    matched_slugs.add(slug)
                    recommendations.append(JourneyRecommendation(
                        journey_id="",
                        journey_slug=slug,
                        relevance_score=80 - len(recommendations) * 5,
                        reason={
                            "en": f"Based on your interest in {interest.replace('_', ' ')}",
                            "id": f"Berdasarkan minat Anda dalam {interest.replace('_', ' ')}"
                        },
                        matched_factors=[interest],
                    ))

        # 4. Default recommendations if nothing matched
        if not recommendations:
            default_recommendations = ["spiritual-disciplines", "new-believer", "overcoming-anxiety"]
            for slug in default_recommendations:
                recommendations.append(JourneyRecommendation(
                    journey_id="",
                    journey_slug=slug,
                    relevance_score=70,
                    reason={
                        "en": "Popular choice for spiritual growth",
                        "id": "Pilihan populer untuk pertumbuhan rohani"
                    },
                    matched_factors=["popular"],
                ))

        # Get journey IDs
        for rec in recommendations[:limit]:
            journey = await self.journeys_collection.find_one({
                "slug": rec.journey_slug,
                "status": "published",
                "deleted": False,
            })
            if journey:
                rec.journey_id = str(journey.get("_id") or journey.get("id"))

        # Filter out completed journeys
        completed = await self.enrollments_collection.find({
            "church_id": church_id,
            "user_id": user_id,
            "status": "completed",
            "deleted": False,
        }).to_list(100)
        completed_slugs = {e["journey_slug"] for e in completed}

        recommendations = [r for r in recommendations if r.journey_slug not in completed_slugs]

        return recommendations[:limit]

    # ==================== ENROLLMENT ====================

    async def enroll_in_journey(
        self,
        church_id: str,
        user_id: str,
        journey_slug: str,
        start_date: Optional[date] = None,
        source: str = "self_selected",
        note: Optional[str] = None,
    ) -> UserJourneyEnrollment:
        """Enroll user in a journey"""
        # Check journey exists
        journey = await self.get_journey_by_slug(journey_slug, church_id)
        if not journey:
            raise ValueError(f"Journey not found: {journey_slug}")

        # Check not already enrolled
        existing = await self.enrollments_collection.find_one({
            "church_id": church_id,
            "user_id": user_id,
            "journey_slug": journey_slug,
            "status": {"$in": ["active", "paused"]},
            "deleted": False,
        })
        if existing:
            raise ValueError("Already enrolled in this journey")

        # Create enrollment
        start = start_date or date.today()
        scheduled_completion = start + timedelta(weeks=journey.duration_weeks)

        # Initialize week progress
        weeks_progress = []
        for week in journey.weeks:
            days_progress = []
            for day in week.days:
                days_progress.append(JourneyDayProgress(day_number=day.day_number))

            weeks_progress.append(JourneyWeekProgress(
                week_number=week.week_number,
                days_progress=days_progress,
            ))

        enrollment = UserJourneyEnrollment(
            id=f"{church_id}_{user_id}_{journey_slug}_{int(datetime.now().timestamp())}",
            church_id=church_id,
            user_id=user_id,
            journey_id=journey.id,
            journey_slug=journey_slug,
            enrollment_source=source,
            enrollment_note=note,
            start_date=start,
            scheduled_completion_date=scheduled_completion,
            weeks_progress=[wp.model_dump() for wp in weeks_progress],
        )

        await self.enrollments_collection.insert_one(enrollment.model_dump())

        # Update journey enrollment count
        await self.journeys_collection.update_one(
            {"slug": journey_slug},
            {"$inc": {"enrollments_count": 1}}
        )

        # Update user profile
        profile_service = get_profile_service(self.db)
        profile = await profile_service.get_or_create_profile(church_id, user_id)
        if journey_slug not in profile.active_journeys:
            await profile_service.update_profile(
                church_id, user_id,
                {"active_journeys": profile.active_journeys + [journey_slug]}
            )

        logger.info(f"User {user_id} enrolled in journey {journey_slug}")
        return enrollment

    async def get_user_enrollments(
        self,
        church_id: str,
        user_id: str,
        status: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """Get user's journey enrollments"""
        query = {
            "church_id": church_id,
            "user_id": user_id,
            "deleted": False,
        }
        if status:
            query["status"] = status

        enrollments = await self.enrollments_collection.find(query).to_list(50)

        # Enrich with journey info
        result = []
        for enrollment in enrollments:
            journey = await self.journeys_collection.find_one({
                "slug": enrollment["journey_slug"],
                "deleted": False,
            })
            if journey:
                result.append({
                    **enrollment,
                    "journey_title": journey.get("title"),
                    "journey_cover_image": journey.get("cover_image_url"),
                    "journey_duration_weeks": journey.get("duration_weeks"),
                    "journey_icon": journey.get("icon"),
                    "journey_color": journey.get("color"),
                })

        return result

    async def get_enrollment(
        self,
        church_id: str,
        user_id: str,
        journey_slug: str,
    ) -> Optional[UserJourneyEnrollment]:
        """Get specific enrollment"""
        enrollment = await self.enrollments_collection.find_one({
            "church_id": church_id,
            "user_id": user_id,
            "journey_slug": journey_slug,
            "deleted": False,
        })
        return UserJourneyEnrollment(**enrollment) if enrollment else None

    # ==================== PROGRESS TRACKING ====================

    async def get_today_content(
        self,
        church_id: str,
        user_id: str,
        journey_slug: str,
    ) -> Optional[Dict[str, Any]]:
        """Get today's journey content for the user"""
        enrollment = await self.get_enrollment(church_id, user_id, journey_slug)
        if not enrollment or enrollment.status != "active":
            return None

        journey = await self.get_journey_by_slug(journey_slug, church_id)
        if not journey:
            return None

        # Get current week and day content
        current_week = enrollment.current_week
        current_day = enrollment.current_day

        if current_week <= len(journey.weeks):
            week = journey.weeks[current_week - 1]
            if current_day <= len(week.days):
                day_content = week.days[current_day - 1]
                return {
                    "journey_slug": journey_slug,
                    "journey_title": journey.title,
                    "week_number": current_week,
                    "week_title": week.title,
                    "day_number": current_day,
                    "content": day_content.model_dump(),
                    "progress": {
                        "total_weeks": journey.duration_weeks,
                        "current_week": current_week,
                        "total_days": journey.total_days,
                        "days_completed": enrollment.total_days_completed,
                    }
                }

        return None

    async def complete_day(
        self,
        church_id: str,
        user_id: str,
        journey_slug: str,
        day_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Mark a day as completed"""
        enrollment = await self.get_enrollment(church_id, user_id, journey_slug)
        if not enrollment or enrollment.status != "active":
            raise ValueError("Not enrolled or journey not active")

        journey = await self.get_journey_by_slug(journey_slug, church_id)
        if not journey:
            raise ValueError("Journey not found")

        now = datetime.now()
        week_idx = enrollment.current_week - 1
        day_idx = enrollment.current_day - 1

        # Update day progress
        if week_idx < len(enrollment.weeks_progress):
            week_progress = enrollment.weeks_progress[week_idx]
            if day_idx < len(week_progress.get("days_progress", [])):
                day_progress = week_progress["days_progress"][day_idx]
                day_progress["completed_at"] = now
                day_progress["time_spent_seconds"] = day_data.get("time_spent_seconds", 0)
                day_progress["scripture_read"] = day_data.get("scripture_read", True)
                day_progress["devotion_read"] = day_data.get("devotion_read", True)
                day_progress["reflection_answered"] = day_data.get("reflection_answered", False)
                day_progress["prayer_completed"] = day_data.get("prayer_completed", False)
                day_progress["user_notes"] = day_data.get("notes")
                day_progress["reflection_responses"] = day_data.get("reflection_responses", [])
                day_progress["day_rating"] = day_data.get("rating")

        # Calculate next day
        current_week_content = journey.weeks[week_idx]
        total_days_in_week = len(current_week_content.days)

        next_day = enrollment.current_day + 1
        next_week = enrollment.current_week
        week_completed = False
        journey_completed = False

        if next_day > total_days_in_week:
            # Week completed
            week_completed = True
            if week_idx < len(enrollment.weeks_progress):
                enrollment.weeks_progress[week_idx]["completed_at"] = now
                enrollment.weeks_progress[week_idx]["milestone_achieved"] = True
                enrollment.weeks_progress[week_idx]["milestone_achieved_at"] = now

            next_week = enrollment.current_week + 1
            next_day = 1

            if next_week > journey.duration_weeks:
                # Journey completed!
                journey_completed = True

        # Update enrollment
        updates = {
            "current_week": next_week if not journey_completed else enrollment.current_week,
            "current_day": next_day if not journey_completed else enrollment.current_day,
            "total_days_completed": enrollment.total_days_completed + 1,
            "total_time_spent_seconds": enrollment.total_time_spent_seconds + day_data.get("time_spent_seconds", 0),
            f"weeks_progress.{week_idx}": enrollment.weeks_progress[week_idx],
            "updated_at": now,
        }

        # Update streak
        if enrollment.last_activity_date:
            last_date = enrollment.last_activity_date if isinstance(enrollment.last_activity_date, date) else enrollment.last_activity_date.date()
            if (date.today() - last_date).days <= 1:
                updates["streak_current"] = enrollment.streak_current + 1
                if enrollment.streak_current + 1 > enrollment.streak_longest:
                    updates["streak_longest"] = enrollment.streak_current + 1
            else:
                updates["streak_current"] = 1

        if journey_completed:
            updates["status"] = "completed"
            updates["completed_at"] = now
            updates["actual_completion_date"] = date.today()

            # Update journey completion count
            await self.journeys_collection.update_one(
                {"slug": journey_slug},
                {"$inc": {"completions_count": 1}}
            )

            # Update user profile
            profile_service = get_profile_service(self.db)
            profile = await profile_service.get_or_create_profile(church_id, user_id)
            active_journeys = [j for j in profile.active_journeys if j != journey_slug]
            completed_journeys = profile.completed_journeys + [journey_slug]
            await profile_service.update_profile(
                church_id, user_id,
                {"active_journeys": active_journeys, "completed_journeys": completed_journeys}
            )

        await self.enrollments_collection.update_one(
            {"id": enrollment.id},
            {"$set": updates}
        )

        return {
            "success": True,
            "week_completed": week_completed,
            "journey_completed": journey_completed,
            "next_week": next_week,
            "next_day": next_day,
            "milestone_badge": current_week_content.milestone_badge if week_completed else None,
        }

    async def pause_journey(
        self,
        church_id: str,
        user_id: str,
        journey_slug: str,
        reason: Optional[str] = None,
    ) -> UserJourneyEnrollment:
        """Pause a journey"""
        enrollment = await self.get_enrollment(church_id, user_id, journey_slug)
        if not enrollment or enrollment.status != "active":
            raise ValueError("Cannot pause: not enrolled or not active")

        await self.enrollments_collection.update_one(
            {"id": enrollment.id},
            {
                "$set": {
                    "status": "paused",
                    "paused_at": datetime.now(),
                    "pause_reason": reason,
                    "updated_at": datetime.now(),
                }
            }
        )

        return await self.get_enrollment(church_id, user_id, journey_slug)

    async def resume_journey(
        self,
        church_id: str,
        user_id: str,
        journey_slug: str,
    ) -> UserJourneyEnrollment:
        """Resume a paused journey"""
        enrollment = await self.get_enrollment(church_id, user_id, journey_slug)
        if not enrollment or enrollment.status != "paused":
            raise ValueError("Cannot resume: not paused")

        # Recalculate scheduled completion
        journey = await self.get_journey_by_slug(journey_slug, church_id)
        remaining_weeks = journey.duration_weeks - enrollment.current_week + 1
        new_scheduled_completion = date.today() + timedelta(weeks=remaining_weeks)

        await self.enrollments_collection.update_one(
            {"id": enrollment.id},
            {
                "$set": {
                    "status": "active",
                    "resumed_at": datetime.now(),
                    "scheduled_completion_date": new_scheduled_completion,
                    "updated_at": datetime.now(),
                }
            }
        )

        return await self.get_enrollment(church_id, user_id, journey_slug)

    async def abandon_journey(
        self,
        church_id: str,
        user_id: str,
        journey_slug: str,
    ) -> None:
        """Abandon a journey (soft delete enrollment)"""
        await self.enrollments_collection.update_one(
            {
                "church_id": church_id,
                "user_id": user_id,
                "journey_slug": journey_slug,
                "deleted": False,
            },
            {
                "$set": {
                    "status": "abandoned",
                    "deleted": True,
                    "deleted_at": datetime.now(),
                    "updated_at": datetime.now(),
                }
            }
        )

        # Update user profile
        profile_service = get_profile_service(self.db)
        profile = await profile_service.get_or_create_profile(church_id, user_id)
        active_journeys = [j for j in profile.active_journeys if j != journey_slug]
        await profile_service.update_profile(church_id, user_id, {"active_journeys": active_journeys})

    async def submit_completion_feedback(
        self,
        church_id: str,
        user_id: str,
        journey_slug: str,
        rating: int,
        testimony: Optional[str] = None,
    ) -> None:
        """Submit feedback after completing a journey"""
        await self.enrollments_collection.update_one(
            {
                "church_id": church_id,
                "user_id": user_id,
                "journey_slug": journey_slug,
                "status": "completed",
                "deleted": False,
            },
            {
                "$set": {
                    "completion_rating": rating,
                    "completion_testimony": testimony,
                    "updated_at": datetime.now(),
                }
            }
        )

        # Update journey average rating
        pipeline = [
            {"$match": {"journey_slug": journey_slug, "completion_rating": {"$ne": None}}},
            {"$group": {"_id": None, "avg": {"$avg": "$completion_rating"}, "count": {"$sum": 1}}},
        ]
        result = await self.enrollments_collection.aggregate(pipeline).to_list(1)
        if result:
            await self.journeys_collection.update_one(
                {"slug": journey_slug},
                {
                    "$set": {
                        "average_rating": result[0]["avg"],
                        "ratings_count": result[0]["count"],
                    }
                }
            )

    # ==================== HELPERS ====================

    def _format_journey_summary(self, journey: Dict[str, Any]) -> Dict[str, Any]:
        """Format journey for list view"""
        return {
            "id": str(journey.get("_id") or journey.get("id")),
            "slug": journey.get("slug"),
            "title": journey.get("title"),
            "subtitle": journey.get("subtitle"),
            "description": journey.get("description"),
            "duration_weeks": journey.get("duration_weeks"),
            "total_days": journey.get("total_days"),
            "category": journey.get("category"),
            "difficulty": journey.get("difficulty"),
            "icon": journey.get("icon"),
            "color": journey.get("color"),
            "cover_image_url": journey.get("cover_image_url"),
            "thumbnail_url": journey.get("thumbnail_url"),
            "enrollments_count": journey.get("enrollments_count", 0),
            "completions_count": journey.get("completions_count", 0),
            "average_rating": journey.get("average_rating", 0),
        }

    def _format_journey_full(self, journey: Dict[str, Any]) -> Dict[str, Any]:
        """Format journey for detail view"""
        summary = self._format_journey_summary(journey)
        return {
            **summary,
            "target_description": journey.get("target_description"),
            "weeks": journey.get("weeks", []),
            "tags": journey.get("tags", []),
            "featured_testimonials": journey.get("featured_testimonials", []),
            "prerequisites": journey.get("prerequisites", []),
        }


# ==================== SINGLETON ACCESS ====================

_journey_service: Optional[JourneyService] = None


def get_journey_service(db: AsyncIOMotorClient) -> JourneyService:
    """Get or create JourneyService instance"""
    global _journey_service
    if _journey_service is None:
        _journey_service = JourneyService(db)
    return _journey_service
