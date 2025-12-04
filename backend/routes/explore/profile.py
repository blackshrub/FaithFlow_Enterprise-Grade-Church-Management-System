"""
User Spiritual Profile API Routes

Handles:
- Onboarding questions and submission
- Profile retrieval and updates
- Implicit signal tracking
- Growth indicators
"""

from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Body
from pydantic import BaseModel, Field

from utils.dependencies import get_current_user, get_session_church_id
from utils.database import get_database
from services.explore.profile_service import get_profile_service

router = APIRouter(prefix="/explore/profile", tags=["Explore Profile"])


# ==================== REQUEST/RESPONSE MODELS ====================

class OnboardingResponseInput(BaseModel):
    question_id: str
    value: any  # String, int, or list depending on question type


class SubmitOnboardingRequest(BaseModel):
    responses: List[OnboardingResponseInput]
    skipped: bool = False


class TrackContentViewRequest(BaseModel):
    content_id: str
    content_type: str
    topics: Optional[List[str]] = None
    bible_reference: Optional[dict] = None


class TrackContentCompletionRequest(BaseModel):
    content_id: str
    completion_percentage: int = Field(ge=0, le=100)
    time_spent_seconds: int = Field(ge=0)


class TrackContentActionRequest(BaseModel):
    content_id: str
    action: str  # "bookmark", "favorite", "share", "companion"
    value: bool = True


class TrackQuizResultRequest(BaseModel):
    quiz_id: str
    score: int = Field(ge=0, le=100)
    categories: List[str]


class UpdateLifeSituationRequest(BaseModel):
    age_range: Optional[str] = None
    life_stage: Optional[str] = None
    current_challenges: Optional[List[str]] = None
    faith_journey: Optional[str] = None


class UpdatePreferencesRequest(BaseModel):
    preferred_translation: Optional[str] = None
    preferred_devotion_time: Optional[str] = None  # "HH:MM" format
    notification_enabled: Optional[bool] = None
    explicit_interests: Optional[List[str]] = None


# ==================== ONBOARDING ENDPOINTS ====================

@router.get("/onboarding/questions")
async def get_onboarding_questions(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_database),
):
    """Get onboarding questions for the user"""
    service = get_profile_service(db)
    questions = await service.get_onboarding_questions()

    return {
        "success": True,
        "data": {
            "questions": questions,
            "total_questions": len(questions),
        }
    }


@router.post("/onboarding/submit")
async def submit_onboarding(
    request: SubmitOnboardingRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Submit onboarding responses"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    responses = [{"question_id": r.question_id, "value": r.value} for r in request.responses]

    profile = await service.submit_onboarding(
        church_id=church_id,
        user_id=user_id,
        responses=responses,
        skipped=request.skipped,
    )

    return {
        "success": True,
        "message": "Onboarding completed" if not request.skipped else "Onboarding skipped",
        "data": {
            "profile_id": profile.id,
            "onboarding_completed": profile.onboarding_completed,
            "priority_topics": profile.priority_topics,
            "recommended_difficulty": profile.recommended_difficulty,
        }
    }


@router.post("/onboarding/skip")
async def skip_onboarding(
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Skip onboarding (user can complete later)"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    profile = await service.skip_onboarding(church_id, user_id)

    return {
        "success": True,
        "message": "Onboarding skipped. You can complete it later in settings.",
        "data": {"profile_id": profile.id}
    }


# ==================== PROFILE ENDPOINTS ====================

@router.get("/me")
async def get_my_profile(
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Get current user's spiritual profile"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    profile = await service.get_or_create_profile(church_id, user_id)

    return {
        "success": True,
        "data": {
            "id": profile.id,
            "onboarding_completed": profile.onboarding_completed,
            "onboarding_skipped": profile.onboarding_skipped,
            "life_situation": profile.life_situation.model_dump(),
            "explicit_interests": profile.explicit_interests,
            "preferred_content_types": profile.preferred_content_types,
            "preferred_translation": profile.preferred_translation,
            "notification_enabled": profile.notification_enabled,
            "priority_topics": profile.priority_topics,
            "recommended_difficulty": profile.recommended_difficulty,
            "growth_indicators": profile.growth_indicators.model_dump(),
            "content_affinity": profile.content_affinity,
            "active_journeys": profile.active_journeys,
            "last_activity": profile.last_activity.isoformat() if profile.last_activity else None,
            "created_at": profile.created_at.isoformat(),
        }
    }


@router.get("/me/insights")
async def get_my_insights(
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Get computed profile insights (for content personalization)"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    insights = await service.compute_profile_insights(church_id, user_id)

    return {
        "success": True,
        "data": insights.model_dump(),
    }


@router.get("/me/growth")
async def get_my_growth_indicators(
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Get and update growth indicators"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    indicators = await service.compute_and_update_growth_indicators(church_id, user_id)

    return {
        "success": True,
        "data": indicators.model_dump(),
    }


@router.patch("/me/life-situation")
async def update_life_situation(
    request: UpdateLifeSituationRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Update user's life situation"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    profile = await service.get_or_create_profile(church_id, user_id)

    # Update life situation fields
    life_situation = profile.life_situation.model_dump()
    if request.age_range is not None:
        life_situation["age_range"] = request.age_range
    if request.life_stage is not None:
        life_situation["life_stage"] = request.life_stage
    if request.current_challenges is not None:
        life_situation["current_challenges"] = request.current_challenges
    if request.faith_journey is not None:
        life_situation["faith_journey"] = request.faith_journey
    life_situation["last_updated"] = datetime.now()

    updated_profile = await service.update_profile(
        church_id, user_id,
        {"life_situation": life_situation}
    )

    return {
        "success": True,
        "message": "Life situation updated",
        "data": {"life_situation": updated_profile.life_situation.model_dump()}
    }


@router.patch("/me/preferences")
async def update_preferences(
    request: UpdatePreferencesRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Update user preferences"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    updates = {}
    if request.preferred_translation is not None:
        updates["preferred_translation"] = request.preferred_translation
    if request.notification_enabled is not None:
        updates["notification_enabled"] = request.notification_enabled
    if request.explicit_interests is not None:
        updates["explicit_interests"] = request.explicit_interests[:5]  # Max 5
    if request.preferred_devotion_time is not None:
        # Parse HH:MM to time object
        try:
            from datetime import time
            parts = request.preferred_devotion_time.split(":")
            updates["preferred_devotion_time"] = time(int(parts[0]), int(parts[1]))
        except (ValueError, IndexError):
            pass

    if updates:
        await service.update_profile(church_id, user_id, updates)

    profile = await service.get_or_create_profile(church_id, user_id)

    return {
        "success": True,
        "message": "Preferences updated",
        "data": {
            "preferred_translation": profile.preferred_translation,
            "notification_enabled": profile.notification_enabled,
            "explicit_interests": profile.explicit_interests,
        }
    }


# ==================== TRACKING ENDPOINTS ====================

@router.post("/track/view")
async def track_content_view(
    request: TrackContentViewRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Track content view (called when user opens content)"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    await service.track_content_view(
        church_id=church_id,
        user_id=user_id,
        content_id=request.content_id,
        content_type=request.content_type,
        content_topics=request.topics,
        bible_reference=request.bible_reference,
    )

    return {"success": True}


@router.post("/track/completion")
async def track_content_completion(
    request: TrackContentCompletionRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Track content completion"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    await service.track_content_completion(
        church_id=church_id,
        user_id=user_id,
        content_id=request.content_id,
        completion_percentage=request.completion_percentage,
        time_spent_seconds=request.time_spent_seconds,
    )

    return {"success": True}


@router.post("/track/action")
async def track_content_action(
    request: TrackContentActionRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Track content action (bookmark, favorite, share, companion)"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    if request.action not in ["bookmark", "favorite", "share", "companion"]:
        raise HTTPException(status_code=400, detail="Invalid action type")

    await service.track_content_action(
        church_id=church_id,
        user_id=user_id,
        content_id=request.content_id,
        action=request.action,
        value=request.value,
    )

    return {"success": True}


@router.post("/track/quiz")
async def track_quiz_result(
    request: TrackQuizResultRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Track quiz result"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_profile_service(db)

    await service.track_quiz_result(
        church_id=church_id,
        user_id=user_id,
        quiz_id=request.quiz_id,
        score=request.score,
        categories=request.categories,
    )

    return {"success": True}


# ==================== ADMIN ENDPOINTS ====================

@router.get("/admin/analytics")
async def get_profile_analytics(
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_database),
):
    """Get aggregated profile analytics for church admin"""
    # Check admin permission
    role = current_user.get("role", "")
    if role not in ["super_admin", "admin"]:
        raise HTTPException(status_code=403, detail="Admin access required")

    # Aggregate profile statistics
    pipeline = [
        {"$match": {"church_id": church_id, "deleted": False}},
        {
            "$group": {
                "_id": None,
                "total_profiles": {"$sum": 1},
                "onboarding_completed": {
                    "$sum": {"$cond": ["$onboarding_completed", 1, 0]}
                },
                "onboarding_skipped": {
                    "$sum": {"$cond": ["$onboarding_skipped", 1, 0]}
                },
                "active_last_7_days": {
                    "$sum": {
                        "$cond": [
                            {
                                "$gte": [
                                    "$last_activity",
                                    datetime.now() - timedelta(days=7)
                                ]
                            },
                            1,
                            0,
                        ]
                    }
                },
            }
        },
    ]

    from datetime import timedelta

    result = await db.user_spiritual_profiles.aggregate(pipeline).to_list(1)

    if result:
        stats = result[0]
        stats.pop("_id", None)
    else:
        stats = {
            "total_profiles": 0,
            "onboarding_completed": 0,
            "onboarding_skipped": 0,
            "active_last_7_days": 0,
        }

    # Get faith journey distribution
    faith_journey_pipeline = [
        {"$match": {"church_id": church_id, "deleted": False}},
        {
            "$group": {
                "_id": "$life_situation.faith_journey",
                "count": {"$sum": 1},
            }
        },
    ]

    faith_dist = await db.user_spiritual_profiles.aggregate(faith_journey_pipeline).to_list(10)
    stats["faith_journey_distribution"] = {
        item["_id"]: item["count"] for item in faith_dist if item["_id"]
    }

    # Get top topics
    topic_pipeline = [
        {"$match": {"church_id": church_id, "deleted": False}},
        {"$unwind": "$priority_topics"},
        {"$group": {"_id": "$priority_topics", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 10},
    ]

    topic_dist = await db.user_spiritual_profiles.aggregate(topic_pipeline).to_list(10)
    stats["top_topics"] = [{"topic": item["_id"], "count": item["count"]} for item in topic_dist]

    return {
        "success": True,
        "data": stats,
    }
