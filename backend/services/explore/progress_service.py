"""
User Progress Tracking Service

Tracks user engagement with Explore content:
- Content progress (started, completed, bookmarked)
- Quiz attempts and scores
- Streak tracking
- Achievements
- Statistics
"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from motor.motor_asyncio import AsyncIOMotorClient
import logging

from models.explore import (
    UserExploreProgress,
    ContentProgress,
    QuizAttempt,
    StreakData,
    ContentType,
)

logger = logging.getLogger(__name__)


class ProgressService:
    """Manages user progress tracking"""

    def __init__(self, db: AsyncIOMotorClient):
        self.db = db

    async def get_user_progress(
        self, church_id: str, user_id: str
    ) -> Dict[str, Any]:
        """Get or create user's progress record"""
        progress = await self.db.user_explore_progress.find_one(
            {"church_id": church_id, "user_id": user_id, "deleted": False}
        )

        if not progress:
            # Create new progress record
            progress = {
                "id": f"{church_id}_{user_id}",
                "church_id": church_id,
                "user_id": user_id,
                "content_progress": [],
                "quiz_attempts": [],
                "streak": {
                    "current_streak": 0,
                    "longest_streak": 0,
                    "last_activity_date": None,
                    "total_days_active": 0,
                    "streak_milestones": [],
                },
                "total_devotions_read": 0,
                "total_studies_completed": 0,
                "total_quizzes_completed": 0,
                "total_verses_read": 0,
                "total_figures_learned": 0,
                "achievements": [],
                "notification_enabled": True,
                "daily_reminder_time": None,
                "created_at": datetime.now(),
                "deleted": False,
            }
            await self.db.user_explore_progress.insert_one(progress)
            logger.info(f"Created progress record for user {user_id} in church {church_id}")

        return progress

    async def track_content_start(
        self, church_id: str, user_id: str, content_id: str, content_type: ContentType
    ) -> Dict[str, Any]:
        """Mark content as started"""
        progress = await self.get_user_progress(church_id, user_id)

        # Check if already tracked
        existing = next(
            (cp for cp in progress["content_progress"] if cp["content_id"] == content_id),
            None,
        )

        if existing:
            return progress

        # Add new content progress
        content_progress = {
            "content_id": content_id,
            "content_type": content_type,
            "started_at": datetime.now(),
            "completed_at": None,
            "progress_percentage": 0,
            "bookmarked": False,
            "favorited": False,
            "notes": None,
        }

        await self.db.user_explore_progress.update_one(
            {"id": progress["id"]},
            {"$push": {"content_progress": content_progress}},
        )

        logger.info(f"User {user_id} started {content_type}: {content_id}")
        return await self.get_user_progress(church_id, user_id)

    async def track_content_complete(
        self, church_id: str, user_id: str, content_id: str, content_type: ContentType
    ) -> Dict[str, Any]:
        """Mark content as completed"""
        progress = await self.get_user_progress(church_id, user_id)

        # Find existing progress
        content_idx = next(
            (
                idx
                for idx, cp in enumerate(progress["content_progress"])
                if cp["content_id"] == content_id
            ),
            None,
        )

        now = datetime.now()

        if content_idx is not None:
            # Update existing
            await self.db.user_explore_progress.update_one(
                {"id": progress["id"]},
                {
                    "$set": {
                        f"content_progress.{content_idx}.completed_at": now,
                        f"content_progress.{content_idx}.progress_percentage": 100,
                    }
                },
            )
        else:
            # Create new with completed status
            content_progress = {
                "content_id": content_id,
                "content_type": content_type,
                "started_at": now,
                "completed_at": now,
                "progress_percentage": 100,
                "bookmarked": False,
                "favorited": False,
                "notes": None,
            }
            await self.db.user_explore_progress.update_one(
                {"id": progress["id"]},
                {"$push": {"content_progress": content_progress}},
            )

        # Update totals
        update_fields = {}
        if content_type == "daily_devotion":
            update_fields["$inc"] = {"total_devotions_read": 1}
        elif content_type in ["bible_study"]:
            update_fields["$inc"] = {"total_studies_completed": 1}
        elif content_type in ["verse_of_the_day", "topical_verse"]:
            update_fields["$inc"] = {"total_verses_read": 1}
        elif content_type in ["bible_figure", "bible_figure_of_the_day"]:
            update_fields["$inc"] = {"total_figures_learned": 1}

        if update_fields:
            await self.db.user_explore_progress.update_one(
                {"id": progress["id"]}, update_fields
            )

        # Update streak
        await self._update_streak(church_id, user_id)

        # Check achievements
        await self._check_achievements(church_id, user_id)

        logger.info(f"User {user_id} completed {content_type}: {content_id}")
        return await self.get_user_progress(church_id, user_id)

    async def update_content_progress(
        self,
        church_id: str,
        user_id: str,
        content_id: str,
        progress_percentage: int,
    ) -> Dict[str, Any]:
        """Update progress percentage"""
        progress = await self.get_user_progress(church_id, user_id)

        content_idx = next(
            (
                idx
                for idx, cp in enumerate(progress["content_progress"])
                if cp["content_id"] == content_id
            ),
            None,
        )

        if content_idx is not None:
            await self.db.user_explore_progress.update_one(
                {"id": progress["id"]},
                {
                    "$set": {
                        f"content_progress.{content_idx}.progress_percentage": progress_percentage
                    }
                },
            )

        return await self.get_user_progress(church_id, user_id)

    async def bookmark_content(
        self, church_id: str, user_id: str, content_id: str, bookmarked: bool
    ) -> Dict[str, Any]:
        """Bookmark/unbookmark content"""
        progress = await self.get_user_progress(church_id, user_id)

        content_idx = next(
            (
                idx
                for idx, cp in enumerate(progress["content_progress"])
                if cp["content_id"] == content_id
            ),
            None,
        )

        if content_idx is not None:
            await self.db.user_explore_progress.update_one(
                {"id": progress["id"]},
                {"$set": {f"content_progress.{content_idx}.bookmarked": bookmarked}},
            )

        return await self.get_user_progress(church_id, user_id)

    async def favorite_content(
        self, church_id: str, user_id: str, content_id: str, favorited: bool
    ) -> Dict[str, Any]:
        """Favorite/unfavorite content"""
        progress = await self.get_user_progress(church_id, user_id)

        content_idx = next(
            (
                idx
                for idx, cp in enumerate(progress["content_progress"])
                if cp["content_id"] == content_id
            ),
            None,
        )

        if content_idx is not None:
            await self.db.user_explore_progress.update_one(
                {"id": progress["id"]},
                {"$set": {f"content_progress.{content_idx}.favorited": favorited}},
            )

        return await self.get_user_progress(church_id, user_id)

    async def save_quiz_attempt(
        self,
        church_id: str,
        user_id: str,
        quiz_id: str,
        quiz_type: str,
        answers: List[Dict[str, Any]],
        score: int,
        time_taken_seconds: Optional[int] = None,
    ) -> Dict[str, Any]:
        """Save quiz attempt"""
        progress = await self.get_user_progress(church_id, user_id)

        now = datetime.now()
        quiz_attempt = {
            "quiz_id": quiz_id,
            "quiz_type": quiz_type,
            "attempted_at": now,
            "completed_at": now,
            "score": score,
            "answers": answers,
            "time_taken_seconds": time_taken_seconds,
        }

        await self.db.user_explore_progress.update_one(
            {"id": progress["id"]},
            {
                "$push": {"quiz_attempts": quiz_attempt},
                "$inc": {"total_quizzes_completed": 1},
            },
        )

        # Update streak
        await self._update_streak(church_id, user_id)

        # Check achievements
        await self._check_achievements(church_id, user_id)

        logger.info(f"User {user_id} completed quiz {quiz_id} with score {score}")
        return await self.get_user_progress(church_id, user_id)

    async def get_statistics(
        self, church_id: str, user_id: str
    ) -> Dict[str, Any]:
        """Get user statistics"""
        progress = await self.get_user_progress(church_id, user_id)

        return {
            "total_devotions_read": progress.get("total_devotions_read", 0),
            "total_studies_completed": progress.get("total_studies_completed", 0),
            "total_quizzes_completed": progress.get("total_quizzes_completed", 0),
            "total_verses_read": progress.get("total_verses_read", 0),
            "total_figures_learned": progress.get("total_figures_learned", 0),
            "current_streak": progress.get("streak", {}).get("current_streak", 0),
            "longest_streak": progress.get("streak", {}).get("longest_streak", 0),
            "total_days_active": progress.get("streak", {}).get("total_days_active", 0),
            "achievements_count": len(progress.get("achievements", [])),
            "bookmarks_count": len(
                [cp for cp in progress.get("content_progress", []) if cp.get("bookmarked")]
            ),
            "favorites_count": len(
                [cp for cp in progress.get("content_progress", []) if cp.get("favorited")]
            ),
        }

    # ==================== PRIVATE HELPERS ====================

    async def _update_streak(self, church_id: str, user_id: str):
        """Update user's streak"""
        progress = await self.get_user_progress(church_id, user_id)
        streak = progress.get("streak", {})

        today = datetime.now().date()
        last_activity = streak.get("last_activity_date")

        if last_activity:
            last_activity_date = (
                datetime.fromisoformat(last_activity).date()
                if isinstance(last_activity, str)
                else last_activity.date()
            )
        else:
            last_activity_date = None

        # Check if already active today
        if last_activity_date == today:
            return

        current_streak = streak.get("current_streak", 0)
        longest_streak = streak.get("longest_streak", 0)
        total_days_active = streak.get("total_days_active", 0)
        streak_milestones = streak.get("streak_milestones", [])

        # Check if continuing streak
        if last_activity_date == today - timedelta(days=1):
            # Continue streak
            current_streak += 1
        elif last_activity_date is None or last_activity_date < today - timedelta(days=1):
            # Streak broken, restart
            current_streak = 1
        else:
            # Future date? Shouldn't happen
            current_streak = 1

        # Update longest streak
        if current_streak > longest_streak:
            longest_streak = current_streak

        # Update total days active
        total_days_active += 1

        # Check for milestones
        milestone_thresholds = [3, 7, 14, 30, 50, 100, 365]
        for threshold in milestone_thresholds:
            if (
                current_streak == threshold
                and threshold not in streak_milestones
            ):
                streak_milestones.append(threshold)
                logger.info(f"User {user_id} reached {threshold}-day streak milestone!")

        # Update database
        await self.db.user_explore_progress.update_one(
            {"id": progress["id"]},
            {
                "$set": {
                    "streak.current_streak": current_streak,
                    "streak.longest_streak": longest_streak,
                    "streak.last_activity_date": datetime.now(),
                    "streak.total_days_active": total_days_active,
                    "streak.streak_milestones": streak_milestones,
                }
            },
        )

    async def _check_achievements(self, church_id: str, user_id: str):
        """Check and award achievements"""
        progress = await self.get_user_progress(church_id, user_id)
        achievements = progress.get("achievements", [])

        # Define achievement criteria
        new_achievements = []

        # Devotion achievements
        devotions = progress.get("total_devotions_read", 0)
        if devotions >= 1 and "first_devotion" not in achievements:
            new_achievements.append("first_devotion")
        if devotions >= 10 and "devotion_reader" not in achievements:
            new_achievements.append("devotion_reader")
        if devotions >= 50 and "devoted_reader" not in achievements:
            new_achievements.append("devoted_reader")
        if devotions >= 100 and "devotion_master" not in achievements:
            new_achievements.append("devotion_master")

        # Quiz achievements
        quizzes = progress.get("total_quizzes_completed", 0)
        if quizzes >= 1 and "quiz_starter" not in achievements:
            new_achievements.append("quiz_starter")
        if quizzes >= 10 and "quiz_enthusiast" not in achievements:
            new_achievements.append("quiz_enthusiast")

        # Streak achievements
        current_streak = progress.get("streak", {}).get("current_streak", 0)
        if current_streak >= 7 and "week_warrior" not in achievements:
            new_achievements.append("week_warrior")
        if current_streak >= 30 and "month_champion" not in achievements:
            new_achievements.append("month_champion")

        # Add new achievements
        if new_achievements:
            await self.db.user_explore_progress.update_one(
                {"id": progress["id"]},
                {"$addToSet": {"achievements": {"$each": new_achievements}}},
            )
            logger.info(f"User {user_id} earned achievements: {new_achievements}")
