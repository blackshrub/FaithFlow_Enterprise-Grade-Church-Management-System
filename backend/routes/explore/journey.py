"""
Life Stage Journey API Routes

Handles:
- Journey discovery and browsing
- User enrollment (self-selection)
- Progress tracking
- Day completion
- Pause/resume
- Completion feedback
"""

from datetime import date
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from utils.dependencies import get_current_user, get_session_church_id, get_db
from services.explore.journey_service import get_journey_service

router = APIRouter(prefix="/explore/journeys", tags=["Explore Journeys"])


# ==================== REQUEST/RESPONSE MODELS ====================

class EnrollJourneyRequest(BaseModel):
    journey_slug: str
    start_date: Optional[str] = None  # YYYY-MM-DD, defaults to today


class CompleteDayRequest(BaseModel):
    time_spent_seconds: int = Field(ge=0, default=0)
    scripture_read: bool = True
    devotion_read: bool = True
    reflection_answered: bool = False
    prayer_completed: bool = False
    notes: Optional[str] = None
    reflection_responses: List[str] = []
    rating: Optional[int] = Field(None, ge=1, le=5)


class PauseJourneyRequest(BaseModel):
    reason: Optional[str] = None


class CompletionFeedbackRequest(BaseModel):
    rating: int = Field(ge=1, le=5)
    testimony: Optional[str] = None


# ==================== DISCOVERY ENDPOINTS ====================

@router.get("/available")
async def get_available_journeys(
    category: Optional[str] = Query(None, description="Filter by category"),
    difficulty: Optional[str] = Query(None, description="Filter by difficulty"),
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get all available journeys"""
    service = get_journey_service(db)
    journeys = await service.list_available_journeys(
        church_id=church_id,
        category=category,
        difficulty=difficulty,
    )

    return {
        "success": True,
        "data": {
            "journeys": journeys,
            "total": len(journeys),
        }
    }


@router.get("/recommended")
async def get_recommended_journeys(
    limit: int = Query(3, ge=1, le=10),
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get AI-recommended journeys based on user profile"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    recommendations = await service.get_recommended_journeys(
        church_id=church_id,
        user_id=user_id,
        limit=limit,
    )

    return {
        "success": True,
        "data": {
            "recommendations": [r.model_dump() for r in recommendations],
        }
    }


@router.get("/categories")
async def get_journey_categories(
    current_user: dict = Depends(get_current_user),
):
    """Get available journey categories"""
    categories = [
        {"id": "life_transition", "name": {"en": "Life Transitions", "id": "Transisi Kehidupan"}, "icon": "compass"},
        {"id": "spiritual_growth", "name": {"en": "Spiritual Growth", "id": "Pertumbuhan Rohani"}, "icon": "flame"},
        {"id": "relationships", "name": {"en": "Relationships", "id": "Hubungan"}, "icon": "heart"},
        {"id": "emotional_health", "name": {"en": "Emotional Health", "id": "Kesehatan Emosional"}, "icon": "cloud-sun"},
        {"id": "leadership", "name": {"en": "Leadership", "id": "Kepemimpinan"}, "icon": "crown"},
        {"id": "foundation", "name": {"en": "Faith Foundation", "id": "Fondasi Iman"}, "icon": "sprout"},
    ]

    return {"success": True, "data": {"categories": categories}}


@router.get("/{slug}")
async def get_journey_details(
    slug: str,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get full journey details"""
    service = get_journey_service(db)
    journey = await service.get_journey_details(slug, church_id)

    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    return {
        "success": True,
        "data": journey,
    }


# ==================== ENROLLMENT ENDPOINTS ====================

@router.post("/enroll")
async def enroll_in_journey(
    request: EnrollJourneyRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Enroll in a journey (self-selection)"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    start_date = None
    if request.start_date:
        try:
            start_date = date.fromisoformat(request.start_date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    try:
        enrollment = await service.enroll_in_journey(
            church_id=church_id,
            user_id=user_id,
            journey_slug=request.journey_slug,
            start_date=start_date,
            source="self_selected",
        )

        return {
            "success": True,
            "message": "Successfully enrolled in journey",
            "data": {
                "enrollment_id": enrollment.id,
                "journey_slug": enrollment.journey_slug,
                "start_date": enrollment.start_date.isoformat(),
                "scheduled_completion": enrollment.scheduled_completion_date.isoformat() if enrollment.scheduled_completion_date else None,
            }
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/my/enrollments")
async def get_my_enrollments(
    status: Optional[str] = Query(None, description="Filter by status: active, paused, completed"),
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get user's journey enrollments"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    enrollments = await service.get_user_enrollments(
        church_id=church_id,
        user_id=user_id,
        status=status,
    )

    return {
        "success": True,
        "data": {
            "enrollments": enrollments,
            "total": len(enrollments),
        }
    }


@router.get("/my/{slug}")
async def get_my_journey_enrollment(
    slug: str,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get specific journey enrollment with progress"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    enrollment = await service.get_enrollment(church_id, user_id, slug)
    if not enrollment:
        raise HTTPException(status_code=404, detail="Enrollment not found")

    journey = await service.get_journey_details(slug, church_id)

    return {
        "success": True,
        "data": {
            "enrollment": enrollment.model_dump(),
            "journey": journey,
        }
    }


# ==================== PROGRESS ENDPOINTS ====================

@router.get("/my/{slug}/today")
async def get_today_content(
    slug: str,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get today's journey content"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    content = await service.get_today_content(church_id, user_id, slug)
    if not content:
        raise HTTPException(status_code=404, detail="No content available. Check if journey is active.")

    return {
        "success": True,
        "data": content,
    }


@router.post("/my/{slug}/complete-day")
async def complete_journey_day(
    slug: str,
    request: CompleteDayRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Mark today's journey day as completed"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    try:
        result = await service.complete_day(
            church_id=church_id,
            user_id=user_id,
            journey_slug=slug,
            day_data=request.model_dump(),
        )

        return {
            "success": True,
            "message": "Day completed!",
            "data": result,
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/my/{slug}/pause")
async def pause_journey(
    slug: str,
    request: PauseJourneyRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Pause a journey"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    try:
        enrollment = await service.pause_journey(
            church_id=church_id,
            user_id=user_id,
            journey_slug=slug,
            reason=request.reason,
        )

        return {
            "success": True,
            "message": "Journey paused. You can resume anytime.",
            "data": {"status": enrollment.status, "paused_at": enrollment.paused_at.isoformat()},
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/my/{slug}/resume")
async def resume_journey(
    slug: str,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Resume a paused journey"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    try:
        enrollment = await service.resume_journey(
            church_id=church_id,
            user_id=user_id,
            journey_slug=slug,
        )

        return {
            "success": True,
            "message": "Journey resumed!",
            "data": {
                "status": enrollment.status,
                "current_week": enrollment.current_week,
                "current_day": enrollment.current_day,
            },
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/my/{slug}/abandon")
async def abandon_journey(
    slug: str,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Abandon a journey"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    await service.abandon_journey(church_id, user_id, slug)

    return {
        "success": True,
        "message": "Journey removed from your list.",
    }


@router.post("/my/{slug}/feedback")
async def submit_completion_feedback(
    slug: str,
    request: CompletionFeedbackRequest,
    current_user: dict = Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Submit feedback after completing a journey"""
    user_id = str(current_user.get("_id") or current_user.get("id"))
    service = get_journey_service(db)

    await service.submit_completion_feedback(
        church_id=church_id,
        user_id=user_id,
        journey_slug=slug,
        rating=request.rating,
        testimony=request.testimony,
    )

    return {
        "success": True,
        "message": "Thank you for your feedback!",
    }
