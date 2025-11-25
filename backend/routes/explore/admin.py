"""
Super Admin Explore API Routes

Endpoints for Super Admin only:
- Content management (CRUD for all content types)
- Platform settings
- AI configuration
- Bulk scheduling
- Analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel

from backend.utils.dependencies import get_current_user, get_db, require_super_admin
from backend.services.explore import ContentResolver, ScheduleService, ProgressService
from backend.models.explore import (
    ContentType,
    ContentStatus,
    Language,
    DailyDevotion,
    VerseOfTheDay,
    BibleFigureOfTheDay,
    DailyQuiz,
    BibleStudy,
    TopicalCategory,
    TopicalVerse,
    DevotionPlan,
    ShareableImage,
    PlatformSettings,
    APIConfiguration,
    PromptConfiguration,
)

router = APIRouter()


# ==================== PLATFORM SETTINGS ====================


@router.get("/settings/platform")
async def get_platform_settings(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get platform-wide Explore settings"""
    settings = await db.platform_settings.find_one(
        {"id": "explore_platform_settings"}
    )

    if not settings:
        # Return defaults
        return {
            "id": "explore_platform_settings",
            "church_id": "global",
            "ai_providers": [],
            "ai_prompts": [],
            "default_content_language": "en",
            "supported_languages": ["en", "id"],
            "auto_generate_daily_content": True,
            "auto_generate_days_ahead": 7,
            "daily_content_release_time": "00:00:00",
        }

    settings.pop("_id", None)
    return settings


@router.put("/settings/platform")
async def update_platform_settings(
    settings: Dict[str, Any] = Body(...),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Update platform settings"""
    settings["updated_by"] = current_user["id"]
    settings["updated_at"] = datetime.now()

    await db.platform_settings.update_one(
        {"id": "explore_platform_settings"},
        {"$set": settings},
        upsert=True,
    )

    return {"status": "success", "settings": settings}


# ==================== CONTENT MANAGEMENT ====================


@router.post("/content/{content_type}")
async def create_content(
    content_type: ContentType,
    content: Dict[str, Any] = Body(...),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Create new content"""
    # Add metadata
    content["id"] = f"{content_type}_{datetime.now().timestamp()}"
    content["created_by"] = current_user["id"]
    content["created_at"] = datetime.now()
    content["deleted"] = False

    # Get collection
    collection = _get_collection(db, content_type)
    await collection.insert_one(content)

    content.pop("_id", None)
    return {"status": "success", "content": content}


@router.get("/content/{content_type}")
async def list_content(
    content_type: ContentType,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[ContentStatus] = Query(None),
    scope: Optional[str] = Query(None),
    church_id: Optional[str] = Query(None),
):
    """List content with filters"""
    collection = _get_collection(db, content_type)

    # Build query
    query: Dict[str, Any] = {"deleted": False}
    if status:
        query["status"] = status
    if scope:
        query["scope"] = scope
    if church_id:
        query["church_id"] = church_id

    # Get items
    cursor = collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
    items = await cursor.to_list(length=limit)

    # Remove _id
    for item in items:
        item.pop("_id", None)

    # Get total
    total = await collection.count_documents(query)

    return {
        "items": items,
        "total": total,
        "page": skip // limit,
        "page_size": limit,
        "has_more": total > (skip + limit),
    }


@router.get("/content/{content_type}/{content_id}")
async def get_content(
    content_type: ContentType,
    content_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get specific content by ID"""
    collection = _get_collection(db, content_type)
    content = await collection.find_one({"id": content_id, "deleted": False})

    if not content:
        raise HTTPException(status_code=404, detail="Content not found")

    content.pop("_id", None)
    return content


@router.put("/content/{content_type}/{content_id}")
async def update_content(
    content_type: ContentType,
    content_id: str,
    updates: Dict[str, Any] = Body(...),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Update content"""
    collection = _get_collection(db, content_type)

    # Add metadata
    updates["updated_by"] = current_user["id"]
    updates["updated_at"] = datetime.now()

    result = await collection.update_one(
        {"id": content_id, "deleted": False},
        {"$set": updates},
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")

    # Return updated content
    content = await collection.find_one({"id": content_id})
    content.pop("_id", None)
    return {"status": "success", "content": content}


@router.delete("/content/{content_type}/{content_id}")
async def delete_content(
    content_type: ContentType,
    content_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Soft delete content"""
    collection = _get_collection(db, content_type)

    result = await collection.update_one(
        {"id": content_id, "deleted": False},
        {
            "$set": {
                "deleted": True,
                "deleted_at": datetime.now(),
                "updated_by": current_user["id"],
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")

    return {"status": "success", "message": "Content deleted"}


@router.post("/content/{content_type}/{content_id}/publish")
async def publish_content(
    content_type: ContentType,
    content_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Publish content"""
    collection = _get_collection(db, content_type)

    result = await collection.update_one(
        {"id": content_id, "deleted": False},
        {
            "$set": {
                "status": "published",
                "published_at": datetime.now(),
                "updated_by": current_user["id"],
                "updated_at": datetime.now(),
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")

    return {"status": "success", "message": "Content published"}


# ==================== SCHEDULING ====================


@router.post("/schedule/generate")
async def generate_schedule(
    start_date: str = Body(..., embed=True),
    days: int = Body(30, embed=True),
    church_id: str = Body("global", embed=True),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Generate daily content schedule"""
    try:
        start = datetime.fromisoformat(start_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    schedule_service = ScheduleService(db)
    entries = await schedule_service.generate_daily_schedule(start, days, church_id)

    return {
        "status": "success",
        "message": f"Generated {len(entries)} schedule entries",
        "entries": entries,
    }


@router.get("/schedule")
async def get_schedule(
    start_date: str = Query(...),
    end_date: str = Query(...),
    church_id: str = Query("global"),
    content_type: Optional[ContentType] = Query(None),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get schedule for date range"""
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    schedule_service = ScheduleService(db)
    schedule = await schedule_service.get_schedule(church_id, start, end, content_type)

    return {"schedule": schedule}


@router.post("/schedule/publish/{schedule_id}")
async def publish_scheduled_content(
    schedule_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Manually publish scheduled content"""
    schedule_service = ScheduleService(db)
    success = await schedule_service.publish_scheduled_content(
        schedule_id, current_user["id"]
    )

    if not success:
        raise HTTPException(status_code=404, detail="Schedule entry not found")

    return {"status": "success", "message": "Content published"}


# ==================== AI CONFIGURATION ====================


@router.get("/ai/providers")
async def get_ai_providers(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get AI provider configurations"""
    settings = await db.platform_settings.find_one(
        {"id": "explore_platform_settings"}
    )

    if not settings or "ai_providers" not in settings:
        return {"providers": []}

    return {"providers": settings["ai_providers"]}


@router.post("/ai/providers")
async def add_ai_provider(
    provider: Dict[str, Any] = Body(...),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Add AI provider configuration"""
    # Note: API key should be encrypted before storing
    # This is handled by APIConfigManager in utils/explore/api_config.py

    await db.platform_settings.update_one(
        {"id": "explore_platform_settings"},
        {
            "$push": {"ai_providers": provider},
            "$set": {
                "updated_by": current_user["id"],
                "updated_at": datetime.now(),
            },
        },
        upsert=True,
    )

    return {"status": "success", "provider": provider}


@router.get("/ai/prompts")
async def get_ai_prompts(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
    content_type: Optional[str] = Query(None),
    language: Optional[Language] = Query(None),
):
    """Get AI prompt templates"""
    settings = await db.platform_settings.find_one(
        {"id": "explore_platform_settings"}
    )

    if not settings or "ai_prompts" not in settings:
        return {"prompts": []}

    prompts = settings["ai_prompts"]

    # Filter
    if content_type:
        prompts = [p for p in prompts if p.get("content_type") == content_type]
    if language:
        prompts = [p for p in prompts if p.get("language") == language]

    return {"prompts": prompts}


@router.post("/ai/prompts")
async def add_ai_prompt(
    prompt: Dict[str, Any] = Body(...),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Add AI prompt template"""
    prompt["created_at"] = datetime.now()

    await db.platform_settings.update_one(
        {"id": "explore_platform_settings"},
        {
            "$push": {"ai_prompts": prompt},
            "$set": {
                "updated_by": current_user["id"],
                "updated_at": datetime.now(),
            },
        },
        upsert=True,
    )

    return {"status": "success", "prompt": prompt}


# ==================== ANALYTICS ====================


@router.get("/analytics/overview")
async def get_analytics_overview(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get platform-wide analytics"""
    # Total content counts
    devotions_count = await db.daily_devotions.count_documents(
        {"scope": "global", "deleted": False}
    )
    studies_count = await db.bible_studies.count_documents(
        {"scope": "global", "deleted": False}
    )
    quizzes_count = await db.daily_quizzes.count_documents(
        {"scope": "global", "deleted": False}
    )

    # Total churches using Explore
    churches_count = await db.church_explore_settings.count_documents(
        {"explore_enabled": True, "deleted": False}
    )

    # Total active users (users with progress)
    users_count = await db.user_explore_progress.count_documents({"deleted": False})

    # Average streak
    pipeline = [
        {"$match": {"deleted": False}},
        {"$group": {"_id": None, "avg_streak": {"$avg": "$streak.current_streak"}}},
    ]
    result = await db.user_explore_progress.aggregate(pipeline).to_list(length=1)
    avg_streak = result[0]["avg_streak"] if result else 0

    return {
        "content": {
            "devotions": devotions_count,
            "studies": studies_count,
            "quizzes": quizzes_count,
        },
        "churches": churches_count,
        "users": users_count,
        "avg_streak": round(avg_streak, 1),
    }


@router.get("/analytics/churches")
async def get_church_analytics(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get per-church analytics"""
    pipeline = [
        {"$match": {"explore_enabled": True, "deleted": False}},
        {
            "$lookup": {
                "from": "user_explore_progress",
                "localField": "church_id",
                "foreignField": "church_id",
                "as": "users",
            }
        },
        {
            "$project": {
                "church_id": 1,
                "user_count": {"$size": "$users"},
                "avg_streak": {"$avg": "$users.streak.current_streak"},
            }
        },
    ]

    churches = await db.church_explore_settings.aggregate(pipeline).to_list(length=None)

    return {"churches": churches}


# ==================== HELPERS ====================


def _get_collection(db, content_type: ContentType):
    """Get MongoDB collection for content type"""
    collection_map = {
        "daily_devotion": db.daily_devotions,
        "verse_of_the_day": db.verses_of_the_day,
        "bible_figure_of_the_day": db.bible_figures_of_the_day,
        "daily_quiz": db.daily_quizzes,
        "bible_study": db.bible_studies,
        "bible_figure": db.bible_figures,
        "topical_category": db.topical_categories,
        "topical_verse": db.topical_verses,
        "devotion_plan": db.devotion_plans,
        "practice_quiz": db.practice_quizzes,
        "shareable_image": db.shareable_images,
    }
    return collection_map.get(content_type)
