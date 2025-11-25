"""
Public Explore API Routes

Endpoints for mobile app users:
- GET /public/explore/home - Today's content
- GET /public/explore/daily/{type} - Specific daily content
- GET /public/explore/{content_type} - Browse self-paced content
- GET /public/explore/{content_type}/{id} - Get specific content
- POST /public/explore/progress/start - Track content start
- POST /public/explore/progress/complete - Track content complete
- POST /public/explore/quiz/submit - Submit quiz attempt
- GET /public/explore/progress - Get user progress
- POST /public/explore/bookmark - Bookmark content
- POST /public/explore/favorite - Favorite content
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel

from utils.dependencies import get_current_user, get_db, get_session_church_id
from services.explore import ContentResolver, ProgressService
from models.explore import ContentType, Language

router = APIRouter()


# ==================== REQUEST/RESPONSE MODELS ====================


class ContentStartRequest(BaseModel):
    content_id: str
    content_type: ContentType


class ContentCompleteRequest(BaseModel):
    content_id: str
    content_type: ContentType


class QuizSubmitRequest(BaseModel):
    quiz_id: str
    quiz_type: str
    answers: List[dict]
    score: int
    time_taken_seconds: Optional[int] = None


class BookmarkRequest(BaseModel):
    content_id: str
    bookmarked: bool


class FavoriteRequest(BaseModel):
    content_id: str
    favorited: bool


# ==================== ROUTES ====================


@router.get("/home")
async def get_explore_home(
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
    language: Language = Query("en", description="Content language preference"),
):
    """
    Get today's Explore content for home screen

    Returns:
        - Today's daily devotion
        - Today's verse of the day
        - Today's Bible figure
        - Today's quiz
        - User progress (streak, stats)
    """
    user_id = current_user["id"]
    today = datetime.now()

    content_resolver = ContentResolver(db)
    progress_service = ProgressService(db)

    # Get all daily content
    devotion = await content_resolver.get_daily_content(
        church_id, today, "daily_devotion", language
    )
    verse = await content_resolver.get_daily_content(
        church_id, today, "verse_of_the_day", language
    )
    figure = await content_resolver.get_daily_content(
        church_id, today, "bible_figure_of_the_day", language
    )
    quiz = await content_resolver.get_daily_content(
        church_id, today, "daily_quiz", language
    )

    # Get user progress
    user_progress = await progress_service.get_user_progress(church_id, user_id)
    stats = await progress_service.get_statistics(church_id, user_id)

    return {
        "daily_devotion": devotion,
        "verse_of_the_day": verse,
        "bible_figure_of_the_day": figure,
        "daily_quiz": quiz,
        "user_progress": user_progress,
        "stats": stats,
    }


@router.get("/daily/{content_type}")
async def get_daily_content(
    content_type: ContentType,
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
    date: Optional[str] = Query(None, description="Date in YYYY-MM-DD format"),
    language: Language = Query("en", description="Content language preference"),
):
    """Get specific daily content for a date"""
    # Parse date
    if date:
        try:
            target_date = datetime.fromisoformat(date)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
    else:
        target_date = datetime.now()

    # Validate content type is daily
    if content_type not in [
        "daily_devotion",
        "verse_of_the_day",
        "bible_figure_of_the_day",
        "daily_quiz",
    ]:
        raise HTTPException(status_code=400, detail="Not a daily content type")

    content_resolver = ContentResolver(db)
    content = await content_resolver.get_daily_content(
        church_id, target_date, content_type, language
    )

    if not content:
        raise HTTPException(status_code=404, detail="Content not found for this date")

    return content


@router.get("/{content_type}")
async def browse_content(
    content_type: ContentType,
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
    skip: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    language: Language = Query("en", description="Content language preference"),
    categories: Optional[str] = Query(None, description="Comma-separated category IDs"),
    difficulty: Optional[str] = Query(None, description="Difficulty level"),
    search: Optional[str] = Query(None, description="Search term"),
):
    """
    Browse self-paced content

    Content types:
    - bible_study
    - bible_figure
    - topical_category
    - topical_verse
    - devotion_plan
    - practice_quiz
    - shareable_image
    """
    # Build filters
    filters = {}
    if categories:
        filters["categories"] = categories.split(",")
    if difficulty:
        filters["difficulty"] = difficulty
    if search:
        filters["search"] = search

    content_resolver = ContentResolver(db)
    result = await content_resolver.get_self_paced_content(
        church_id, content_type, language, skip, limit, filters
    )

    return result


@router.get("/{content_type}/{content_id}")
async def get_content_by_id(
    content_type: ContentType,
    content_id: str,
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
    language: Language = Query("en", description="Content language preference"),
):
    """Get specific content by ID"""
    content_resolver = ContentResolver(db)
    content = await content_resolver.get_content_by_id(
        church_id, content_id, content_type, language
    )

    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    return content


@router.post("/progress/start")
async def track_content_start(
    request: ContentStartRequest,
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Track when user starts consuming content"""
    user_id = current_user["id"]
    progress_service = ProgressService(db)

    progress = await progress_service.track_content_start(
        church_id, user_id, request.content_id, request.content_type
    )

    return {"status": "success", "progress": progress}


@router.post("/progress/complete")
async def track_content_complete(
    request: ContentCompleteRequest,
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Track when user completes content"""
    user_id = current_user["id"]
    progress_service = ProgressService(db)

    progress = await progress_service.track_content_complete(
        church_id, user_id, request.content_id, request.content_type
    )

    return {"status": "success", "progress": progress}


@router.post("/quiz/submit")
async def submit_quiz(
    request: QuizSubmitRequest,
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Submit quiz attempt"""
    user_id = current_user["id"]
    progress_service = ProgressService(db)

    progress = await progress_service.save_quiz_attempt(
        church_id,
        user_id,
        request.quiz_id,
        request.quiz_type,
        request.answers,
        request.score,
        request.time_taken_seconds,
    )

    return {"status": "success", "progress": progress}


@router.get("/progress")
async def get_user_progress(
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get user's progress and statistics"""
    user_id = current_user["id"]
    progress_service = ProgressService(db)

    progress = await progress_service.get_user_progress(church_id, user_id)
    stats = await progress_service.get_statistics(church_id, user_id)

    return {"progress": progress, "stats": stats}


@router.post("/bookmark")
async def bookmark_content(
    request: BookmarkRequest,
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Bookmark or unbookmark content"""
    user_id = current_user["id"]
    progress_service = ProgressService(db)

    progress = await progress_service.bookmark_content(
        church_id, user_id, request.content_id, request.bookmarked
    )

    return {"status": "success", "progress": progress}


@router.post("/favorite")
async def favorite_content(
    request: FavoriteRequest,
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Favorite or unfavorite content"""
    user_id = current_user["id"]
    progress_service = ProgressService(db)

    progress = await progress_service.favorite_content(
        church_id, user_id, request.content_id, request.favorited
    )

    return {"status": "success", "progress": progress}


@router.get("/topical/categories")
async def get_topical_categories(
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
    language: Language = Query("en", description="Content language preference"),
):
    """Get all topical categories (hierarchical)"""
    content_resolver = ContentResolver(db)

    result = await content_resolver.get_self_paced_content(
        church_id, "topical_category", language, 0, 1000
    )

    # Build hierarchy
    categories = result["items"]
    root_categories = [c for c in categories if not c.get("parent_category_id")]

    def build_tree(parent_id=None):
        return [
            {
                **cat,
                "children": build_tree(cat["id"])
            }
            for cat in categories
            if cat.get("parent_category_id") == parent_id
        ]

    tree = build_tree(None)
    return {"categories": tree}


@router.get("/topical/verses/{category_id}")
async def get_verses_by_category(
    category_id: str,
    current_user=Depends(get_current_user),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    language: Language = Query("en"),
):
    """Get verses for a specific topical category"""
    content_resolver = ContentResolver(db)

    filters = {"categories": [category_id]}
    result = await content_resolver.get_self_paced_content(
        church_id, "topical_verse", language, skip, limit, filters
    )

    return result
