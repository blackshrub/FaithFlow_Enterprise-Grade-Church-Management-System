"""
Gamification Leaderboard Service

Provides Redis-backed leaderboards for:
- Faith engagement tracking
- Bible reading streaks
- Attendance points
- Giving milestones
- Community participation

Uses Redis sorted sets for efficient ranking operations.
"""

import time
import logging
from typing import Optional, List, Dict, Any, Tuple
from dataclasses import dataclass
from datetime import datetime, timedelta
from enum import Enum

from config.redis import get_redis
from .utils import redis_key, TTL

logger = logging.getLogger(__name__)


class LeaderboardType(str, Enum):
    """Available leaderboard types."""

    FAITH_POINTS = "faith_points"        # Overall engagement
    BIBLE_STREAK = "bible_streak"        # Consecutive days reading
    ATTENDANCE = "attendance"            # Event attendance points
    GIVING = "giving"                    # Generosity milestones
    COMMUNITY = "community"              # Helping others, participation
    DEVOTION = "devotion"                # Daily devotion completion
    QUIZ = "quiz"                        # Bible quiz scores
    PRAYER = "prayer"                    # Prayer partner interactions


class TimeFrame(str, Enum):
    """Leaderboard time frames."""

    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    ALL_TIME = "all_time"


@dataclass
class LeaderboardEntry:
    """Single leaderboard entry."""

    member_id: str
    score: float
    rank: int
    member_name: str = ""
    member_photo: str = ""

    def to_dict(self) -> Dict[str, Any]:
        return {
            "member_id": self.member_id,
            "score": self.score,
            "rank": self.rank,
            "member_name": self.member_name,
            "member_photo": self.member_photo,
        }


@dataclass
class MemberRankInfo:
    """Member's rank information."""

    member_id: str
    score: float
    rank: int
    total_members: int
    percentile: float  # Top X%

    def to_dict(self) -> Dict[str, Any]:
        return {
            "member_id": self.member_id,
            "score": self.score,
            "rank": self.rank,
            "total_members": self.total_members,
            "percentile": round(self.percentile, 1),
        }


class LeaderboardService:
    """
    Redis-backed leaderboard service.

    Provides efficient ranking operations using Redis sorted sets.
    Supports multiple leaderboard types and time frames.
    """

    def __init__(self):
        """Initialize leaderboard service."""
        pass

    def _make_key(
        self,
        church_id: str,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
    ) -> str:
        """Create Redis key for leaderboard."""
        if timeframe == TimeFrame.ALL_TIME:
            return redis_key("leaderboard", church_id, board_type.value)
        else:
            # Include time period suffix for time-based boards
            period = self._get_period_suffix(timeframe)
            return redis_key("leaderboard", church_id, board_type.value, period)

    def _get_period_suffix(self, timeframe: TimeFrame) -> str:
        """Get period suffix for time-based leaderboards."""
        now = datetime.utcnow()

        if timeframe == TimeFrame.DAILY:
            return now.strftime("%Y-%m-%d")
        elif timeframe == TimeFrame.WEEKLY:
            # ISO week number
            return now.strftime("%Y-W%W")
        elif timeframe == TimeFrame.MONTHLY:
            return now.strftime("%Y-%m")
        else:
            return "all"

    def _get_ttl(self, timeframe: TimeFrame) -> int:
        """Get TTL for time-based leaderboards."""
        if timeframe == TimeFrame.DAILY:
            return TTL.DAY_1 + TTL.HOUR_1  # Extra hour buffer
        elif timeframe == TimeFrame.WEEKLY:
            return TTL.DAYS_7 + TTL.DAY_1  # Extra day buffer
        elif timeframe == TimeFrame.MONTHLY:
            return TTL.DAYS_30 + TTL.DAYS_7  # Extra week buffer
        else:
            return 0  # No expiry for all-time

    # ==================== Score Management ====================

    async def add_points(
        self,
        church_id: str,
        member_id: str,
        points: float,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
    ) -> float:
        """
        Add points to member's score.

        Args:
            church_id: Church identifier
            member_id: Member identifier
            points: Points to add (can be negative)
            board_type: Type of leaderboard
            timeframe: Time frame (daily, weekly, monthly, all_time)

        Returns:
            float: New total score
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, board_type, timeframe)

            # Increment score
            new_score = await redis.zincrby(key, points, member_id)

            # Set TTL for time-based boards
            ttl = self._get_ttl(timeframe)
            if ttl > 0:
                await redis.expire(key, ttl)

            logger.debug(
                f"Added {points} {board_type.value} points to member {member_id}, "
                f"new score: {new_score}"
            )
            return new_score

        except Exception as e:
            logger.error(f"Failed to add points: {e}")
            return 0.0

    async def set_score(
        self,
        church_id: str,
        member_id: str,
        score: float,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
    ) -> bool:
        """
        Set member's score (replaces existing).

        Args:
            church_id: Church identifier
            member_id: Member identifier
            score: Score to set
            board_type: Type of leaderboard
            timeframe: Time frame

        Returns:
            bool: True if set successfully
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, board_type, timeframe)

            await redis.zadd(key, {member_id: score})

            # Set TTL for time-based boards
            ttl = self._get_ttl(timeframe)
            if ttl > 0:
                await redis.expire(key, ttl)

            return True

        except Exception as e:
            logger.error(f"Failed to set score: {e}")
            return False

    async def get_score(
        self,
        church_id: str,
        member_id: str,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
    ) -> float:
        """
        Get member's current score.

        Args:
            church_id: Church identifier
            member_id: Member identifier
            board_type: Type of leaderboard
            timeframe: Time frame

        Returns:
            float: Current score (0 if not found)
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, board_type, timeframe)

            score = await redis.zscore(key, member_id)
            return score if score is not None else 0.0

        except Exception as e:
            logger.error(f"Failed to get score: {e}")
            return 0.0

    # ==================== Ranking Operations ====================

    async def get_rank(
        self,
        church_id: str,
        member_id: str,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
    ) -> Optional[MemberRankInfo]:
        """
        Get member's rank information.

        Args:
            church_id: Church identifier
            member_id: Member identifier
            board_type: Type of leaderboard
            timeframe: Time frame

        Returns:
            MemberRankInfo or None if not ranked
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, board_type, timeframe)

            # Get rank (0-indexed, None if not in set)
            rank = await redis.zrevrank(key, member_id)

            if rank is None:
                return None

            # Get score
            score = await redis.zscore(key, member_id)

            # Get total count
            total = await redis.zcard(key)

            # Calculate percentile (top X%)
            percentile = ((rank + 1) / total) * 100 if total > 0 else 100

            return MemberRankInfo(
                member_id=member_id,
                score=score or 0,
                rank=rank + 1,  # Convert to 1-indexed
                total_members=total,
                percentile=percentile,
            )

        except Exception as e:
            logger.error(f"Failed to get rank: {e}")
            return None

    async def get_top(
        self,
        church_id: str,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
        limit: int = 10,
        offset: int = 0,
    ) -> List[LeaderboardEntry]:
        """
        Get top ranked members.

        Args:
            church_id: Church identifier
            board_type: Type of leaderboard
            timeframe: Time frame
            limit: Maximum entries to return
            offset: Starting position (for pagination)

        Returns:
            List of LeaderboardEntry, highest scores first
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, board_type, timeframe)

            # Get top members with scores
            end = offset + limit - 1
            results = await redis.zrevrange(key, offset, end, withscores=True)

            entries = []
            for i, (member_id, score) in enumerate(results):
                entries.append(LeaderboardEntry(
                    member_id=member_id,
                    score=score,
                    rank=offset + i + 1,
                ))

            return entries

        except Exception as e:
            logger.error(f"Failed to get top: {e}")
            return []

    async def get_around(
        self,
        church_id: str,
        member_id: str,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
        range_size: int = 2,
    ) -> List[LeaderboardEntry]:
        """
        Get members around a specific member's rank.

        Args:
            church_id: Church identifier
            member_id: Member identifier
            board_type: Type of leaderboard
            timeframe: Time frame
            range_size: How many above/below to return

        Returns:
            List of LeaderboardEntry around the member
        """
        try:
            redis = await get_redis()
            key = self._make_key(church_id, board_type, timeframe)

            # Get member's rank
            rank = await redis.zrevrank(key, member_id)

            if rank is None:
                return []

            # Calculate range
            start = max(0, rank - range_size)
            end = rank + range_size

            # Get range with scores
            results = await redis.zrevrange(key, start, end, withscores=True)

            entries = []
            for i, (mid, score) in enumerate(results):
                entries.append(LeaderboardEntry(
                    member_id=mid,
                    score=score,
                    rank=start + i + 1,
                ))

            return entries

        except Exception as e:
            logger.error(f"Failed to get around: {e}")
            return []

    # ==================== Streak Tracking ====================

    async def update_streak(
        self,
        church_id: str,
        member_id: str,
        streak_type: str = "bible_reading",
    ) -> int:
        """
        Update member's streak (e.g., consecutive days).

        Args:
            church_id: Church identifier
            member_id: Member identifier
            streak_type: Type of streak to track

        Returns:
            int: Current streak count
        """
        try:
            redis = await get_redis()

            # Keys for tracking
            streak_key = redis_key("streak", church_id, member_id, streak_type)
            last_key = redis_key("streak_last", church_id, member_id, streak_type)

            now = datetime.utcnow()
            today = now.strftime("%Y-%m-%d")

            # Get last activity date
            last_date = await redis.get(last_key)

            if last_date == today:
                # Already updated today, return current streak
                streak = await redis.get(streak_key)
                return int(streak) if streak else 1

            if last_date:
                # Check if consecutive
                last_dt = datetime.strptime(last_date, "%Y-%m-%d")
                diff = (now.date() - last_dt.date()).days

                if diff == 1:
                    # Consecutive! Increment streak
                    streak = await redis.incr(streak_key)
                elif diff > 1:
                    # Streak broken, reset
                    streak = 1
                    await redis.set(streak_key, "1")
                else:
                    # Same day or weird case
                    streak = await redis.get(streak_key)
                    streak = int(streak) if streak else 1
            else:
                # First time, start streak
                streak = 1
                await redis.set(streak_key, "1")

            # Update last activity date
            await redis.set(last_key, today)

            # Set expiry (streaks expire after 7 days of inactivity)
            await redis.expire(streak_key, TTL.DAYS_7)
            await redis.expire(last_key, TTL.DAYS_7)

            # Also update the streak leaderboard
            await self.set_score(
                church_id,
                member_id,
                float(streak),
                LeaderboardType.BIBLE_STREAK,
            )

            logger.debug(f"Updated {streak_type} streak for {member_id}: {streak}")
            return streak

        except Exception as e:
            logger.error(f"Failed to update streak: {e}")
            return 0

    async def get_streak(
        self,
        church_id: str,
        member_id: str,
        streak_type: str = "bible_reading",
    ) -> int:
        """
        Get member's current streak.

        Args:
            church_id: Church identifier
            member_id: Member identifier
            streak_type: Type of streak

        Returns:
            int: Current streak count (0 if none)
        """
        try:
            redis = await get_redis()
            streak_key = redis_key("streak", church_id, member_id, streak_type)

            streak = await redis.get(streak_key)
            return int(streak) if streak else 0

        except Exception as e:
            logger.error(f"Failed to get streak: {e}")
            return 0

    async def reset_streak(
        self,
        church_id: str,
        member_id: str,
        streak_type: str = "bible_reading",
    ) -> bool:
        """Reset member's streak."""
        try:
            redis = await get_redis()
            streak_key = redis_key("streak", church_id, member_id, streak_type)
            last_key = redis_key("streak_last", church_id, member_id, streak_type)

            await redis.delete(streak_key, last_key)
            return True

        except Exception as e:
            logger.error(f"Failed to reset streak: {e}")
            return False

    # ==================== Badge/Achievement Tracking ====================

    async def award_badge(
        self,
        church_id: str,
        member_id: str,
        badge_id: str,
    ) -> bool:
        """
        Award a badge to a member.

        Args:
            church_id: Church identifier
            member_id: Member identifier
            badge_id: Badge identifier to award

        Returns:
            bool: True if awarded (False if already had)
        """
        try:
            redis = await get_redis()
            key = redis_key("badges", church_id, member_id)

            # Check if already has badge
            if await redis.sismember(key, badge_id):
                return False

            # Award badge
            await redis.sadd(key, badge_id)

            # Store award timestamp
            ts_key = redis_key("badge_ts", church_id, member_id, badge_id)
            await redis.set(ts_key, datetime.utcnow().isoformat())

            logger.info(f"Awarded badge {badge_id} to member {member_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to award badge: {e}")
            return False

    async def has_badge(
        self,
        church_id: str,
        member_id: str,
        badge_id: str,
    ) -> bool:
        """Check if member has a badge."""
        try:
            redis = await get_redis()
            key = redis_key("badges", church_id, member_id)

            return await redis.sismember(key, badge_id)

        except Exception as e:
            logger.error(f"Failed to check badge: {e}")
            return False

    async def get_badges(
        self,
        church_id: str,
        member_id: str,
    ) -> List[str]:
        """Get all badges for a member."""
        try:
            redis = await get_redis()
            key = redis_key("badges", church_id, member_id)

            badges = await redis.smembers(key)
            return list(badges)

        except Exception as e:
            logger.error(f"Failed to get badges: {e}")
            return []

    # ==================== Utility Operations ====================

    async def get_count(
        self,
        church_id: str,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
    ) -> int:
        """Get total number of members in a leaderboard."""
        try:
            redis = await get_redis()
            key = self._make_key(church_id, board_type, timeframe)

            return await redis.zcard(key)

        except Exception as e:
            logger.error(f"Failed to get count: {e}")
            return 0

    async def remove_member(
        self,
        church_id: str,
        member_id: str,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
    ) -> bool:
        """Remove member from a leaderboard."""
        try:
            redis = await get_redis()
            key = self._make_key(church_id, board_type, timeframe)

            await redis.zrem(key, member_id)
            return True

        except Exception as e:
            logger.error(f"Failed to remove member: {e}")
            return False

    async def clear_leaderboard(
        self,
        church_id: str,
        board_type: LeaderboardType,
        timeframe: TimeFrame = TimeFrame.ALL_TIME,
    ) -> bool:
        """Clear entire leaderboard."""
        try:
            redis = await get_redis()
            key = self._make_key(church_id, board_type, timeframe)

            await redis.delete(key)
            logger.info(f"Cleared leaderboard {board_type.value} for {church_id}")
            return True

        except Exception as e:
            logger.error(f"Failed to clear leaderboard: {e}")
            return False

    async def aggregate_scores(
        self,
        church_id: str,
        member_id: str,
        board_types: List[LeaderboardType] = None,
    ) -> float:
        """
        Get aggregate score across multiple leaderboards.

        Useful for overall "faith points" calculation.

        Args:
            church_id: Church identifier
            member_id: Member identifier
            board_types: Types to include (default: all)

        Returns:
            float: Total aggregate score
        """
        try:
            if board_types is None:
                board_types = list(LeaderboardType)

            total = 0.0
            for board_type in board_types:
                score = await self.get_score(church_id, member_id, board_type)
                total += score

            return total

        except Exception as e:
            logger.error(f"Failed to aggregate scores: {e}")
            return 0.0


# Global instance
leaderboard_service = LeaderboardService()


# Convenience functions for common operations

async def add_faith_points(
    church_id: str,
    member_id: str,
    points: float,
    source: str = "engagement",
) -> float:
    """
    Add faith points to a member.

    Args:
        church_id: Church identifier
        member_id: Member identifier
        points: Points to add
        source: Source of points (for logging)

    Returns:
        float: New total score
    """
    logger.info(f"Adding {points} faith points to {member_id} from {source}")

    # Add to all-time
    score = await leaderboard_service.add_points(
        church_id,
        member_id,
        points,
        LeaderboardType.FAITH_POINTS,
        TimeFrame.ALL_TIME,
    )

    # Also update daily, weekly, monthly
    for tf in [TimeFrame.DAILY, TimeFrame.WEEKLY, TimeFrame.MONTHLY]:
        await leaderboard_service.add_points(
            church_id,
            member_id,
            points,
            LeaderboardType.FAITH_POINTS,
            tf,
        )

    return score


async def record_bible_reading(
    church_id: str,
    member_id: str,
) -> Tuple[int, float]:
    """
    Record Bible reading activity.

    Updates streak and adds points.

    Returns:
        Tuple of (streak_count, points_earned)
    """
    # Update streak
    streak = await leaderboard_service.update_streak(
        church_id,
        member_id,
        "bible_reading",
    )

    # Award points based on streak
    base_points = 10
    streak_bonus = min(streak * 2, 50)  # Cap bonus at 50
    total_points = base_points + streak_bonus

    await add_faith_points(church_id, member_id, total_points, "bible_reading")

    return streak, total_points


async def record_attendance(
    church_id: str,
    member_id: str,
    event_type: str = "service",
) -> float:
    """
    Record event attendance.

    Args:
        church_id: Church identifier
        member_id: Member identifier
        event_type: Type of event attended

    Returns:
        float: Points earned
    """
    # Point values by event type
    points_map = {
        "service": 25,
        "small_group": 15,
        "prayer_meeting": 20,
        "volunteer": 30,
        "special_event": 20,
    }

    points = points_map.get(event_type, 10)

    # Add to attendance board
    await leaderboard_service.add_points(
        church_id,
        member_id,
        points,
        LeaderboardType.ATTENDANCE,
    )

    # Also add to faith points
    await add_faith_points(church_id, member_id, points, f"attendance:{event_type}")

    return points


async def get_member_dashboard_stats(
    church_id: str,
    member_id: str,
) -> Dict[str, Any]:
    """
    Get comprehensive stats for member dashboard.

    Returns:
        Dict with faith points, streaks, ranks, badges
    """
    # Get faith points rank
    faith_rank = await leaderboard_service.get_rank(
        church_id,
        member_id,
        LeaderboardType.FAITH_POINTS,
    )

    # Get Bible streak
    bible_streak = await leaderboard_service.get_streak(
        church_id,
        member_id,
        "bible_reading",
    )

    # Get badges
    badges = await leaderboard_service.get_badges(church_id, member_id)

    # Get aggregate score
    total_points = await leaderboard_service.aggregate_scores(
        church_id,
        member_id,
    )

    return {
        "total_faith_points": total_points,
        "faith_rank": faith_rank.to_dict() if faith_rank else None,
        "bible_streak": bible_streak,
        "badges": badges,
        "badge_count": len(badges),
    }
