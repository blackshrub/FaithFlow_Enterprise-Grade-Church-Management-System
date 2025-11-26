"""
Church Admin Explore API Routes

Endpoints for Church Admins:
- Church Explore settings
- Content takeover management
- Church-specific content creation
- Church analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body
from datetime import datetime
from typing import Optional, Dict, Any

from utils.dependencies import (
    get_current_user,
    get_db,
    get_session_church_id,
    require_admin,
)
from services.explore import ScheduleService, ProgressService
from models.explore import ContentType

router = APIRouter()


# ==================== CHURCH SETTINGS ====================


@router.get("/settings")
async def get_church_settings(
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get church's Explore settings"""
    settings = await db.church_explore_settings.find_one(
        {"church_id": church_id, "deleted": False}
    )

    if not settings:
        # Return default settings (Explore enabled by default)
        return {
            "church_id": church_id,
            "explore_enabled": True,
            "features": {
                "daily_devotion": {"enabled": True, "order": 1},
                "verse_of_the_day": {"enabled": True, "order": 2},
                "bible_figure_of_the_day": {"enabled": True, "order": 3},
                "daily_quiz": {"enabled": True, "order": 4},
                "bible_study": {"enabled": True, "order": 5},
                "topical_exploration": {"enabled": True, "order": 6},
                "shareable_images": {"enabled": True, "order": 7},
            },
            "preferred_bible_translation": "NIV",
            "content_language": "en",
            "allow_church_content": False,
            "prioritize_church_content": False,
            "takeover_enabled": False,
            "takeover_content_types": [],
            "timezone": "UTC",
            "show_church_branding": False,
        }

    settings.pop("_id", None)
    return settings


@router.put("/settings")
async def update_church_settings(
    settings: Dict[str, Any] = Body(...),
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Update church's Explore settings"""
    # Verify church_id matches
    if settings.get("church_id") and settings["church_id"] != church_id:
        raise HTTPException(
            status_code=403, detail="Cannot modify settings for other churches"
        )

    settings["church_id"] = church_id
    settings["updated_by"] = current_user["id"]
    settings["updated_at"] = datetime.now()

    # Check if exists
    existing = await db.church_explore_settings.find_one(
        {"church_id": church_id, "deleted": False}
    )

    if existing:
        # Update
        await db.church_explore_settings.update_one(
            {"church_id": church_id, "deleted": False}, {"$set": settings}
        )
    else:
        # Create
        settings["created_by"] = current_user["id"]
        settings["created_at"] = datetime.now()
        settings["deleted"] = False
        await db.church_explore_settings.insert_one(settings)

    settings.pop("_id", None)
    return {"status": "success", "settings": settings}


# ==================== TAKEOVER MANAGEMENT ====================


@router.post("/takeover")
async def create_takeover(
    date: str = Body(..., embed=True),
    content_type: ContentType = Body(..., embed=True),
    content_id: str = Body(..., embed=True),
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Create content takeover (override global content with church-specific)"""
    try:
        target_date = datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    schedule_service = ScheduleService(db)

    try:
        entry = await schedule_service.create_takeover(
            church_id, target_date, content_type, content_id, current_user["id"]
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    return {"status": "success", "takeover": entry}


@router.delete("/takeover")
async def remove_takeover(
    date: str = Query(...),
    content_type: ContentType = Query(...),
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Remove content takeover (revert to global content)"""
    try:
        target_date = datetime.fromisoformat(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    schedule_service = ScheduleService(db)
    success = await schedule_service.remove_takeover(
        church_id, target_date, content_type
    )

    if not success:
        raise HTTPException(status_code=404, detail="Takeover not found")

    return {"status": "success", "message": "Takeover removed"}


@router.get("/takeovers")
async def list_takeovers(
    start_date: str = Query(...),
    end_date: str = Query(...),
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """List all takeovers for church in date range"""
    try:
        start = datetime.fromisoformat(start_date)
        end = datetime.fromisoformat(end_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format")

    cursor = db.content_schedule.find(
        {
            "church_id": church_id,
            "is_takeover": True,
            "date": {"$gte": start, "$lt": end},
            "deleted": False,
        }
    ).sort("date", 1)

    takeovers = await cursor.to_list(length=None)

    # Remove _id
    for t in takeovers:
        t.pop("_id", None)

    return {"takeovers": takeovers}


# ==================== CHURCH CONTENT ====================


@router.post("/content/{content_type}")
async def create_church_content(
    content_type: ContentType,
    content: Dict[str, Any] = Body(...),
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Create church-specific content"""
    # Verify church has permission
    settings = await db.church_explore_settings.find_one(
        {"church_id": church_id, "deleted": False}
    )

    if not settings or not settings.get("allow_church_content"):
        raise HTTPException(
            status_code=403,
            detail="Church content creation not enabled for this church",
        )

    # Set scope and church_id
    content["scope"] = "church"
    content["church_id"] = church_id
    content["id"] = f"{content_type}_{church_id}_{datetime.now().timestamp()}"
    content["created_by"] = current_user["id"]
    content["created_at"] = datetime.now()
    content["deleted"] = False

    # Get collection
    collection = _get_collection(db, content_type)
    await collection.insert_one(content)

    content.pop("_id", None)
    return {"status": "success", "content": content}


@router.get("/content/{content_type}")
async def list_church_content(
    content_type: ContentType,
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """List church-specific content"""
    collection = _get_collection(db, content_type)

    query = {"scope": "church", "church_id": church_id, "deleted": False}

    cursor = collection.find(query).skip(skip).limit(limit).sort("created_at", -1)
    items = await cursor.to_list(length=limit)

    # Remove _id
    for item in items:
        item.pop("_id", None)

    total = await collection.count_documents(query)

    return {
        "items": items,
        "total": total,
        "page": skip // limit,
        "page_size": limit,
        "has_more": total > (skip + limit),
    }


@router.put("/content/{content_type}/{content_id}")
async def update_church_content(
    content_type: ContentType,
    content_id: str,
    updates: Dict[str, Any] = Body(...),
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Update church-specific content"""
    collection = _get_collection(db, content_type)

    # Verify ownership
    existing = await collection.find_one(
        {"id": content_id, "scope": "church", "church_id": church_id, "deleted": False}
    )

    if not existing:
        raise HTTPException(
            status_code=404, detail="Content not found or not owned by this church"
        )

    # Update
    updates["updated_by"] = current_user["id"]
    updates["updated_at"] = datetime.now()

    await collection.update_one({"id": content_id}, {"$set": updates})

    # Return updated
    content = await collection.find_one({"id": content_id})
    content.pop("_id", None)
    return {"status": "success", "content": content}


@router.delete("/content/{content_type}/{content_id}")
async def delete_church_content(
    content_type: ContentType,
    content_id: str,
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Delete church-specific content"""
    collection = _get_collection(db, content_type)

    # Verify ownership
    existing = await collection.find_one(
        {"id": content_id, "scope": "church", "church_id": church_id, "deleted": False}
    )

    if not existing:
        raise HTTPException(
            status_code=404, detail="Content not found or not owned by this church"
        )

    # Soft delete
    await collection.update_one(
        {"id": content_id},
        {
            "$set": {
                "deleted": True,
                "deleted_at": datetime.now(),
                "updated_by": current_user["id"],
            }
        },
    )

    return {"status": "success", "message": "Content deleted"}


# ==================== ANALYTICS ====================


@router.get("/analytics/overview")
async def get_church_analytics(
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get church-specific analytics"""
    # Total users in church with Explore progress
    users_count = await db.user_explore_progress.count_documents(
        {"church_id": church_id, "deleted": False}
    )

    # Average streak
    pipeline = [
        {"$match": {"church_id": church_id, "deleted": False}},
        {"$group": {"_id": None, "avg_streak": {"$avg": "$streak.current_streak"}}},
    ]
    result = await db.user_explore_progress.aggregate(pipeline).to_list(length=1)
    avg_streak = result[0]["avg_streak"] if result else 0

    # Total completions
    pipeline = [
        {"$match": {"church_id": church_id, "deleted": False}},
        {
            "$group": {
                "_id": None,
                "total_devotions": {"$sum": "$total_devotions_read"},
                "total_studies": {"$sum": "$total_studies_completed"},
                "total_quizzes": {"$sum": "$total_quizzes_completed"},
            }
        },
    ]
    result = await db.user_explore_progress.aggregate(pipeline).to_list(length=1)
    totals = result[0] if result else {}

    # Top users (by streak)
    top_users = (
        await db.user_explore_progress.find(
            {"church_id": church_id, "deleted": False}
        )
        .sort("streak.current_streak", -1)
        .limit(10)
        .to_list(length=10)
    )

    return {
        "users_count": users_count,
        "avg_streak": round(avg_streak, 1),
        "total_devotions": totals.get("total_devotions", 0),
        "total_studies": totals.get("total_studies", 0),
        "total_quizzes": totals.get("total_quizzes", 0),
        "top_users": [
            {
                "user_id": u["user_id"],
                "current_streak": u["streak"]["current_streak"],
                "total_days_active": u["streak"]["total_days_active"],
            }
            for u in top_users
        ],
    }


@router.get("/analytics/engagement")
async def get_engagement_analytics(
    current_user=Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
    days: int = Query(30, ge=1, le=365),
):
    """Get engagement analytics over time"""
    from datetime import timedelta

    start_date = datetime.now() - timedelta(days=days)

    # Daily active users
    pipeline = [
        {"$match": {"church_id": church_id, "deleted": False}},
        {"$unwind": "$content_progress"},
        {
            "$match": {
                "content_progress.started_at": {"$gte": start_date},
            }
        },
        {
            "$group": {
                "_id": {
                    "$dateToString": {
                        "format": "%Y-%m-%d",
                        "date": "$content_progress.started_at",
                    }
                },
                "users": {"$addToSet": "$user_id"},
            }
        },
        {"$project": {"date": "$_id", "active_users": {"$size": "$users"}}},
        {"$sort": {"date": 1}},
    ]

    daily_data = await db.user_explore_progress.aggregate(pipeline).to_list(length=None)

    return {"daily_engagement": daily_data}


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
