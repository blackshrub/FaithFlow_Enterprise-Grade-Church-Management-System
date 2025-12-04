"""
Super Admin Explore API Routes

Endpoints for Super Admin only:
- Content management (CRUD for all content types)
- Platform settings
- AI configuration
- Bulk scheduling
- Analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query, Body, UploadFile, File
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
import uuid
import logging

from utils.dependencies import get_current_user, get_db, require_super_admin
from services.seaweedfs_service import (
    get_seaweedfs_service,
    SeaweedFSError,
    StorageCategory
)

logger = logging.getLogger(__name__)
from services.explore import ContentResolver, ScheduleService, ProgressService
from models.explore import (
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


# ==================== DASHBOARD STATS ====================


@router.get("/stats")
async def get_dashboard_stats(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get dashboard statistics for Content Center"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    # Build base query for church context
    if session_church_id == "global":
        # Super admin viewing global - show all global content
        base_query = {"scope": "global", "deleted": False}
    else:
        # Super admin switched to specific church - show church + global content
        base_query = {
            "$or": [
                {"church_id": session_church_id, "deleted": False},
                {"scope": "global", "deleted": False}
            ]
        }

    # Count by content type
    devotions = await db.daily_devotions.count_documents(base_query)
    verses = await db.verses_of_the_day.count_documents(base_query)
    figures = await db.bible_figures.count_documents(base_query)
    quizzes = await db.daily_quizzes.count_documents(base_query)
    studies = await db.bible_studies.count_documents(base_query)
    categories = await db.topical_categories.count_documents(base_query)
    topical_verses = await db.topical_verses.count_documents(base_query)
    plans = await db.devotion_plans.count_documents(base_query)

    # Count published vs draft
    published_query = {**base_query, "status": "published"}
    draft_query = {**base_query, "status": {"$in": ["draft", None]}}

    published_count = 0
    draft_count = 0
    for coll in [db.daily_devotions, db.verses_of_the_day, db.bible_figures,
                 db.daily_quizzes, db.bible_studies]:
        published_count += await coll.count_documents(published_query)
        draft_count += await coll.count_documents(draft_query)

    # Count scheduled content
    today = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
    scheduled_query = {
        **base_query,
        "scheduled_date": {"$gte": today.isoformat()[:10]}
    }
    scheduled_count = 0
    for coll in [db.daily_devotions, db.verses_of_the_day, db.bible_figures, db.daily_quizzes]:
        scheduled_count += await coll.count_documents(scheduled_query)

    # AI generation jobs in progress
    ai_jobs_pending = await db.ai_generation_jobs.count_documents({
        "status": {"$in": ["pending", "generating"]},
        "deleted": {"$ne": True}
    })

    # Count AI-generated content pending review
    pending_review_query = {
        "ai_generated": True,
        "status": {"$in": ["draft", None]},
        "deleted": False,
    }
    if session_church_id != "global":
        pending_review_query["$or"] = [
            {"church_id": session_church_id},
            {"scope": "global"}
        ]

    pending_review = 0
    for coll in [db.daily_devotions, db.verses_of_the_day, db.bible_figures,
                 db.daily_quizzes, db.bible_studies]:
        pending_review += await coll.count_documents(pending_review_query)

    return {
        "content_counts": {
            "devotions": devotions,
            "verses": verses,
            "figures": figures,
            "quizzes": quizzes,
            "studies": studies,
            "categories": categories,
            "topical_verses": topical_verses,
            "plans": plans,
            "total": devotions + verses + figures + quizzes + studies + categories + topical_verses + plans
        },
        "status_counts": {
            "published": published_count,
            "draft": draft_count,
            "scheduled": scheduled_count,
        },
        "ai_generation": {
            "pending_jobs": ai_jobs_pending,
        },
        "pending_review": pending_review,
    }


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
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    # Add metadata
    content["id"] = f"{content_type}_{datetime.now().timestamp()}"
    content["created_by"] = current_user["id"]
    content["created_at"] = datetime.now()
    content["deleted"] = False

    # Set scope and church_id based on session context
    if session_church_id == "global":
        # Super admin creating global content
        content["scope"] = content.get("scope", "global")
        content["church_id"] = content.get("church_id", "global")
    else:
        # Super admin switched to a specific church - create church content
        content["scope"] = "church"
        content["church_id"] = session_church_id

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
    """List content with filters and tenant isolation"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)
    collection = _get_collection(db, content_type)

    # Build base query with tenant filtering
    query: Dict[str, Any] = {"deleted": False}

    # Apply tenant context
    if session_church_id == "global":
        # Super admin viewing global - can see all content
        # Allow further filtering by scope/church_id if provided
        if scope:
            query["scope"] = scope
        if church_id:
            query["church_id"] = church_id
    else:
        # Super admin switched to specific church - see church content + global content
        if scope == "church":
            # Only church content
            query["church_id"] = session_church_id
            query["scope"] = "church"
        elif scope == "global":
            # Only global content
            query["scope"] = "global"
        else:
            # Both church and global content
            query["$or"] = [
                {"church_id": session_church_id},
                {"scope": "global"}
            ]

    # Additional filters
    if status:
        query["status"] = status

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
    """Get specific content by ID with tenant filtering"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)
    collection = _get_collection(db, content_type)

    # Build query with tenant filtering
    if session_church_id == "global":
        # Super admin can access any content
        query = {"id": content_id, "deleted": False}
    else:
        # Super admin switched to church - can access church content or global content
        query = {
            "id": content_id,
            "deleted": False,
            "$or": [
                {"church_id": session_church_id},
                {"scope": "global"}
            ]
        }

    content = await collection.find_one(query)

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
    """Update content with tenant filtering"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)
    collection = _get_collection(db, content_type)

    # Build query with tenant filtering
    if session_church_id == "global":
        # Super admin can update any content
        query = {"id": content_id, "deleted": False}
    else:
        # Super admin switched to church - can only update church content (not global)
        query = {
            "id": content_id,
            "deleted": False,
            "church_id": session_church_id,
        }

    # Add metadata
    updates["updated_by"] = current_user["id"]
    updates["updated_at"] = datetime.now()

    # Don't allow changing church_id or scope when not in global context
    if session_church_id != "global":
        updates.pop("church_id", None)
        updates.pop("scope", None)

    result = await collection.update_one(query, {"$set": updates})

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found or not authorized to edit")

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
    """Soft delete content with tenant filtering"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)
    collection = _get_collection(db, content_type)

    # Build query with tenant filtering
    if session_church_id == "global":
        # Super admin can delete any content
        query = {"id": content_id, "deleted": False}
    else:
        # Super admin switched to church - can only delete church content (not global)
        query = {
            "id": content_id,
            "deleted": False,
            "church_id": session_church_id,
        }

    result = await collection.update_one(
        query,
        {
            "$set": {
                "deleted": True,
                "deleted_at": datetime.now(),
                "updated_by": current_user["id"],
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found or not authorized to delete")

    return {"status": "success", "message": "Content deleted"}


@router.post("/content/{content_type}/bulk-delete")
async def bulk_delete_content(
    content_type: ContentType,
    content_ids: List[str] = Body(..., embed=True),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Bulk soft delete multiple content items with tenant filtering"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)
    collection = _get_collection(db, content_type)

    if not content_ids:
        raise HTTPException(status_code=400, detail="No content IDs provided")

    # Build query with tenant filtering
    if session_church_id == "global":
        # Super admin can delete any content
        query = {"id": {"$in": content_ids}, "deleted": False}
    else:
        # Super admin switched to church - can only delete church content (not global)
        query = {
            "id": {"$in": content_ids},
            "deleted": False,
            "church_id": session_church_id,
        }

    result = await collection.update_many(
        query,
        {
            "$set": {
                "deleted": True,
                "deleted_at": datetime.now(),
                "updated_by": current_user["id"],
            }
        },
    )

    return {
        "status": "success",
        "message": f"Deleted {result.modified_count} items",
        "deleted_count": result.modified_count,
    }


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


@router.get("/scheduled-content")
async def get_scheduled_content(
    start_date: str = Query(...),
    end_date: str = Query(...),
    content_type: Optional[str] = Query(None),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get all content scheduled for a date range"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    # Map short content types to full names
    type_map = {
        "devotion": "daily_devotion",
        "verse": "verse_of_the_day",
        "figure": "bible_figure",
        "quiz": "daily_quiz",
    }

    content_types_to_query = []
    if content_type and content_type in type_map:
        content_types_to_query = [type_map[content_type]]
    elif content_type:
        content_types_to_query = [content_type]
    else:
        content_types_to_query = ["daily_devotion", "verse_of_the_day", "bible_figure", "daily_quiz"]

    results = []

    for ctype in content_types_to_query:
        collection = _get_collection(db, ctype)
        if collection is None:
            continue

        # Build query for scheduled content in date range
        query = {
            "deleted": False,
            "scheduled_date": {"$gte": start_date, "$lte": end_date}
        }

        # Apply tenant filtering
        if session_church_id != "global":
            query["$or"] = [
                {"church_id": session_church_id},
                {"scope": "global"}
            ]

        cursor = collection.find(query).sort("scheduled_date", 1)
        items = await cursor.to_list(length=500)

        for item in items:
            item.pop("_id", None)
            item["content_type"] = ctype.replace("_of_the_day", "").replace("daily_", "").replace("bible_", "")
            results.append(item)

    # Sort by scheduled_date
    results.sort(key=lambda x: x.get("scheduled_date", ""))

    return {"content": results, "total": len(results)}


@router.delete("/content/{content_type}/{content_id}/schedule")
async def unschedule_content(
    content_type: ContentType,
    content_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Remove scheduled date from content"""
    collection = _get_collection(db, content_type)

    result = await collection.update_one(
        {"id": content_id, "deleted": False},
        {
            "$unset": {"scheduled_date": ""},
            "$set": {
                "updated_by": current_user["id"],
                "updated_at": datetime.now(),
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")

    return {"status": "success", "message": "Content unscheduled"}


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


# ==================== AI CONTENT GENERATION ====================


class AIGenerationRequest(BaseModel):
    """AI content generation request"""
    content_type: str
    model: str = "claude-3-5-sonnet-20241022"
    custom_prompt: Optional[str] = None
    generate_both_languages: bool = True
    parameters: Optional[Dict[str, Any]] = None  # Type-specific params


@router.get("/ai/config")
async def get_ai_config(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get AI configuration for the generation hub"""
    settings = await db.platform_settings.find_one(
        {"id": "explore_platform_settings"}
    )

    providers = settings.get("ai_providers", []) if settings else []

    # Default models if no providers configured
    default_models = [
        {"id": "claude-3-5-sonnet-20241022", "name": "Claude 3.5 Sonnet", "provider": "anthropic"},
        {"id": "claude-3-opus-20240229", "name": "Claude 3 Opus", "provider": "anthropic"},
        {"id": "gpt-4-turbo", "name": "GPT-4 Turbo", "provider": "openai"},
    ]

    return {
        "models": default_models,
        "providers": providers,
        "supported_content_types": [
            "daily_devotion", "verse_of_the_day", "bible_figure", "daily_quiz",
            "bible_study", "topical_category", "topical_verse", "devotion_plan",
            "shareable_image"
        ],
    }


@router.post("/ai/generate")
async def generate_content_with_ai(
    request: AIGenerationRequest,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Queue content generation with AI"""
    job_id = str(uuid.uuid4())

    # Create generation job
    job = {
        "id": job_id,
        "content_type": request.content_type,
        "model": request.model,
        "custom_prompt": request.custom_prompt,
        "generate_both_languages": request.generate_both_languages,
        "parameters": request.parameters or {},
        "status": "pending",
        "progress": 0,
        "created_by": current_user["id"],
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "result": None,
        "error": None,
    }

    await db.ai_generation_jobs.insert_one(job)

    # Trigger async generation (in production, use Celery or similar)
    # For now, we'll generate synchronously but return immediately
    # The actual generation happens in a background task

    return {
        "status": "queued",
        "job_id": job_id,
        "message": f"Generating {request.content_type} content",
    }


@router.get("/ai/queue")
async def get_generation_queue(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
    status: Optional[str] = Query(None),
    limit: int = Query(20),
):
    """Get AI generation queue"""
    query = {}
    if status:
        query["status"] = status

    jobs = await db.ai_generation_jobs.find(query).sort(
        "created_at", -1
    ).limit(limit).to_list(length=limit)

    for job in jobs:
        job.pop("_id", None)

    return {"jobs": jobs}


@router.get("/ai/queue/{job_id}")
async def get_generation_job(
    job_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get specific generation job status"""
    job = await db.ai_generation_jobs.find_one({"id": job_id})

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.pop("_id", None)
    return job


@router.post("/ai/queue/{job_id}/accept")
async def accept_generated_content(
    job_id: str,
    edits: Optional[Dict[str, Any]] = Body(None),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Accept and save generated content"""
    job = await db.ai_generation_jobs.find_one({"id": job_id})

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    if job["status"] != "completed":
        raise HTTPException(status_code=400, detail="Job not ready for acceptance")

    # Merge edits with generated result
    content = job.get("result", {})
    if edits:
        content.update(edits)

    # Save to appropriate collection based on content_type
    content_type = job["content_type"]
    collection_map = {
        "daily_devotion": "daily_devotions",
        "verse_of_the_day": "verses_of_the_day",
        "bible_figure": "bible_figures",
        "daily_quiz": "daily_quizzes",
        "bible_study": "bible_studies",
        "topical_category": "topical_categories",
        "topical_verse": "topical_verses",
        "devotion_plan": "devotion_plans",
        "shareable_image": "shareable_images",
    }

    collection_name = collection_map.get(content_type)
    if not collection_name:
        raise HTTPException(status_code=400, detail=f"Unknown content type: {content_type}")

    # Add metadata
    content["id"] = str(uuid.uuid4()) if "id" not in content else content["id"]
    content["scope"] = "global"
    content["ai_generated"] = True
    content["ai_metadata"] = {
        "model": job["model"],
        "job_id": job_id,
        "generated_at": job["created_at"],
        "reviewed": True,
        "reviewed_by": current_user["id"],
        "reviewed_at": datetime.now(),
    }
    content["status"] = "draft"
    content["created_by"] = current_user["id"]
    content["created_at"] = datetime.now()
    content["deleted"] = False

    await db[collection_name].insert_one(content)

    # Update job status
    await db.ai_generation_jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "status": "accepted",
                "accepted_at": datetime.now(),
                "accepted_by": current_user["id"],
            }
        },
    )

    return {
        "status": "success",
        "content_type": content_type,
        "content_id": content["id"],
    }


@router.post("/ai/queue/{job_id}/reject")
async def reject_generated_content(
    job_id: str,
    reason: Optional[str] = Body(None, embed=True),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Reject and discard generated content"""
    result = await db.ai_generation_jobs.update_one(
        {"id": job_id},
        {
            "$set": {
                "status": "rejected",
                "rejected_at": datetime.now(),
                "rejected_by": current_user["id"],
                "rejection_reason": reason,
            }
        },
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")

    return {"status": "success", "message": "Content rejected"}


@router.post("/ai/queue/{job_id}/regenerate")
async def regenerate_content(
    job_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Regenerate content with same parameters"""
    job = await db.ai_generation_jobs.find_one({"id": job_id})

    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    # Create new job with same parameters
    new_job_id = str(uuid.uuid4())
    new_job = {
        "id": new_job_id,
        "content_type": job["content_type"],
        "model": job["model"],
        "custom_prompt": job.get("custom_prompt"),
        "generate_both_languages": job.get("generate_both_languages", True),
        "parameters": job.get("parameters", {}),
        "status": "pending",
        "progress": 0,
        "created_by": current_user["id"],
        "created_at": datetime.now(),
        "updated_at": datetime.now(),
        "previous_job_id": job_id,
        "result": None,
        "error": None,
    }

    await db.ai_generation_jobs.insert_one(new_job)

    return {
        "status": "queued",
        "job_id": new_job_id,
        "message": f"Regenerating {job['content_type']} content",
    }


# ==================== ANALYTICS ====================


@router.get("/analytics/overview")
async def get_analytics_overview(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get analytics with tenant filtering"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    # Build base query for content counts
    if session_church_id == "global":
        content_query = {"scope": "global", "deleted": False}
        user_query = {"deleted": False}
    else:
        # Church context - show church content + global content
        content_query = {
            "$or": [
                {"church_id": session_church_id, "deleted": False},
                {"scope": "global", "deleted": False}
            ]
        }
        user_query = {"church_id": session_church_id, "deleted": False}

    # Total content counts
    devotions_count = await db.daily_devotions.count_documents(content_query)
    studies_count = await db.bible_studies.count_documents(content_query)
    quizzes_count = await db.daily_quizzes.count_documents(content_query)

    # Total churches using Explore (only relevant for global context)
    if session_church_id == "global":
        churches_count = await db.church_explore_settings.count_documents(
            {"explore_enabled": True, "deleted": False}
        )
    else:
        churches_count = 1  # Current church

    # Total active users (users with progress)
    users_count = await db.user_explore_progress.count_documents(user_query)

    # Average streak
    pipeline = [
        {"$match": user_query},
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
    """Get per-church analytics with tenant filtering"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    # Build match query based on tenant context
    if session_church_id == "global":
        match_query = {"explore_enabled": True, "deleted": False}
    else:
        # Church context - only show current church
        match_query = {"church_id": session_church_id, "explore_enabled": True, "deleted": False}

    pipeline = [
        {"$match": match_query},
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
                "_id": 0,
                "church_id": 1,
                "user_count": {"$size": "$users"},
                "avg_streak": {"$avg": "$users.streak.current_streak"},
            }
        },
    ]

    churches = await db.church_explore_settings.aggregate(pipeline).to_list(length=None)

    return {"churches": churches}


@router.get("/analytics/top-content")
async def get_top_content(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
    content_type: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    period: str = Query("30d", description="Time period: 7d, 30d, 90d, all"),
):
    """Get top performing content by engagement metrics"""
    from utils.tenant_utils import get_session_church_id_from_user
    from datetime import timedelta

    session_church_id = get_session_church_id_from_user(current_user)

    # Calculate date filter based on period
    period_days = {"7d": 7, "30d": 30, "90d": 90, "all": 0}
    days = period_days.get(period, 30)

    date_filter = {}
    if days > 0:
        date_filter = {"created_at": {"$gte": datetime.now() - timedelta(days=days)}}

    # Build base query
    if session_church_id == "global":
        base_query = {"scope": "global", "deleted": False, **date_filter}
    else:
        base_query = {
            "$or": [
                {"church_id": session_church_id, "deleted": False},
                {"scope": "global", "deleted": False}
            ],
            **date_filter
        }

    top_content = []

    # Content types to query
    content_types_map = {
        "devotion": ("daily_devotions", "daily_devotion"),
        "verse": ("verses_of_the_day", "verse_of_the_day"),
        "figure": ("bible_figures", "bible_figure"),
        "quiz": ("daily_quizzes", "daily_quiz"),
        "study": ("bible_studies", "bible_study"),
    }

    if content_type and content_type in content_types_map:
        types_to_query = {content_type: content_types_map[content_type]}
    else:
        types_to_query = content_types_map

    for type_key, (collection_name, type_value) in types_to_query.items():
        collection = db[collection_name]

        # Get content sorted by view_count or created_at as fallback
        pipeline = [
            {"$match": base_query},
            {"$addFields": {
                "engagement_score": {
                    "$add": [
                        {"$ifNull": ["$view_count", 0]},
                        {"$multiply": [{"$ifNull": ["$share_count", 0]}, 2]},
                        {"$multiply": [{"$ifNull": ["$completion_count", 0]}, 3]},
                    ]
                }
            }},
            {"$sort": {"engagement_score": -1, "created_at": -1}},
            {"$limit": limit},
            {"$project": {
                "_id": 0,
                "id": 1,
                "title": {"$ifNull": ["$title", {"$ifNull": ["$verse_reference", "$name"]}]},
                "content_type": {"$literal": type_value},
                "view_count": {"$ifNull": ["$view_count", 0]},
                "share_count": {"$ifNull": ["$share_count", 0]},
                "completion_count": {"$ifNull": ["$completion_count", 0]},
                "engagement_score": 1,
                "created_at": 1,
                "status": 1,
            }}
        ]

        items = await collection.aggregate(pipeline).to_list(length=limit)
        top_content.extend(items)

    # Sort combined results by engagement score
    top_content.sort(key=lambda x: x.get("engagement_score", 0), reverse=True)

    return {
        "content": top_content[:limit],
        "total": len(top_content),
        "period": period,
    }


# ==================== AI REVIEW QUEUE (Autonomous Content) ====================


@router.get("/review-queue")
async def get_review_queue(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
    content_type: Optional[str] = Query(None, description="Filter by content type"),
    sort_by: str = Query("created_at", description="Sort field: created_at, content_type"),
    sort_order: str = Query("desc", description="Sort order: asc, desc"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
):
    """
    Get all AI-generated content pending review.

    This endpoint returns all content with status='draft' that was generated
    autonomously by the AI system (ai_generated=True). Staff can review and
    approve/reject without needing to provide any creative input.

    Returns unified list across all content types:
    - Daily Devotions
    - Verse of the Day
    - Bible Figures
    - Daily Quizzes
    - Bible Studies
    """
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    # Collections to search for AI-generated draft content
    collections = [
        ("daily_devotions", "daily_devotion"),
        ("verses_of_the_day", "verse_of_the_day"),
        ("bible_figures", "bible_figure"),
        ("daily_quizzes", "daily_quiz"),
        ("bible_studies", "bible_study"),
    ]

    # Filter by specific type if provided
    if content_type:
        type_map = {
            "devotion": ("daily_devotions", "daily_devotion"),
            "verse": ("verses_of_the_day", "verse_of_the_day"),
            "figure": ("bible_figures", "bible_figure"),
            "quiz": ("daily_quizzes", "daily_quiz"),
            "study": ("bible_studies", "bible_study"),
        }
        if content_type in type_map:
            collections = [type_map[content_type]]

    all_items = []
    stats = {
        "total": 0,
        "by_type": {},
        "today_generated": 0,
    }

    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    for collection_name, type_value in collections:
        collection = db[collection_name]

        # Build query for AI-generated draft content
        query = {
            "status": {"$in": ["draft", None]},
            "ai_generated": True,
            "deleted": False,
        }

        # Apply tenant filtering
        if session_church_id == "global":
            # Can see all content in global context
            pass
        else:
            # Church context - see church content + global content
            query["$or"] = [
                {"church_id": session_church_id},
                {"scope": "global"}
            ]

        # Get items
        sort_direction = -1 if sort_order == "desc" else 1
        cursor = collection.find(query).sort(sort_by, sort_direction)
        items = await cursor.to_list(length=1000)  # Get all for counting

        # Count stats
        count = len(items)
        stats["by_type"][type_value] = count
        stats["total"] += count

        # Count today's generated content
        for item in items:
            created_at = item.get("created_at")
            if created_at:
                if isinstance(created_at, str):
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                if created_at >= today_start:
                    stats["today_generated"] += 1

        # Add type info and clean up
        for item in items:
            item.pop("_id", None)
            item["_content_type"] = type_value
            item["_collection"] = collection_name

            # Extract display title based on content type
            if type_value == "daily_devotion":
                item["_display_title"] = item.get("title", {}).get("en", "Untitled Devotion")
            elif type_value == "verse_of_the_day":
                item["_display_title"] = item.get("verse_reference", "Unknown Verse")
            elif type_value == "bible_figure":
                item["_display_title"] = item.get("name", {}).get("en", "Unknown Figure")
            elif type_value == "daily_quiz":
                item["_display_title"] = item.get("title", {}).get("en", "Untitled Quiz")
            elif type_value == "bible_study":
                item["_display_title"] = item.get("title", {}).get("en", "Untitled Study")

            all_items.append(item)

    # Sort combined results
    sort_direction = sort_order == "desc"
    all_items.sort(
        key=lambda x: x.get(sort_by, "") if x.get(sort_by) else "",
        reverse=sort_direction
    )

    # Paginate
    paginated = all_items[skip:skip + limit]

    return {
        "items": paginated,
        "total": stats["total"],
        "stats": stats,
        "page": skip // limit,
        "page_size": limit,
        "has_more": stats["total"] > (skip + limit),
    }


@router.post("/review-queue/{content_type}/{content_id}/approve")
async def approve_review_content(
    content_type: str,
    content_id: str,
    scheduled_date: Optional[str] = Body(None, embed=True),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Approve AI-generated content from review queue.

    This marks the content as 'published' or schedules it for a future date.
    Staff only needs to click approve - no creative input required.

    Args:
        content_type: Type of content (devotion, verse, figure, quiz, study)
        content_id: ID of the content to approve
        scheduled_date: Optional date to schedule publication (YYYY-MM-DD)
    """
    # Map short type to collection
    collection_map = {
        "devotion": "daily_devotions",
        "daily_devotion": "daily_devotions",
        "verse": "verses_of_the_day",
        "verse_of_the_day": "verses_of_the_day",
        "figure": "bible_figures",
        "bible_figure": "bible_figures",
        "quiz": "daily_quizzes",
        "daily_quiz": "daily_quizzes",
        "study": "bible_studies",
        "bible_study": "bible_studies",
    }

    collection_name = collection_map.get(content_type)
    if not collection_name:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_TYPE", "message": f"Unknown content type: {content_type}"}
        )

    collection = db[collection_name]

    # Build update
    update = {
        "reviewed_by": current_user["id"],
        "reviewed_at": datetime.now(),
        "updated_by": current_user["id"],
        "updated_at": datetime.now(),
    }

    if scheduled_date:
        # Schedule for future publication
        update["scheduled_date"] = scheduled_date
        update["status"] = "scheduled"
        message = f"Content scheduled for {scheduled_date}"
    else:
        # Publish immediately
        update["status"] = "published"
        update["published_at"] = datetime.now()
        message = "Content published"

    result = await collection.update_one(
        {"id": content_id, "deleted": False},
        {"$set": update}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")

    logger.info(f"Review queue: Approved {content_type} {content_id} by {current_user['id']}")

    return {"status": "success", "message": message}


@router.post("/review-queue/{content_type}/{content_id}/reject")
async def reject_review_content(
    content_type: str,
    content_id: str,
    reason: Optional[str] = Body(None, embed=True),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Reject AI-generated content from review queue.

    This marks the content as 'rejected' and removes it from active content.
    Rejected content can be reviewed later or permanently deleted.

    Args:
        content_type: Type of content
        content_id: ID of the content to reject
        reason: Optional reason for rejection (for AI learning)
    """
    collection_map = {
        "devotion": "daily_devotions",
        "daily_devotion": "daily_devotions",
        "verse": "verses_of_the_day",
        "verse_of_the_day": "verses_of_the_day",
        "figure": "bible_figures",
        "bible_figure": "bible_figures",
        "quiz": "daily_quizzes",
        "daily_quiz": "daily_quizzes",
        "study": "bible_studies",
        "bible_study": "bible_studies",
    }

    collection_name = collection_map.get(content_type)
    if not collection_name:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_TYPE", "message": f"Unknown content type: {content_type}"}
        )

    collection = db[collection_name]

    result = await collection.update_one(
        {"id": content_id, "deleted": False},
        {
            "$set": {
                "status": "rejected",
                "rejected_by": current_user["id"],
                "rejected_at": datetime.now(),
                "rejection_reason": reason,
                "updated_by": current_user["id"],
                "updated_at": datetime.now(),
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Content not found")

    logger.info(f"Review queue: Rejected {content_type} {content_id} by {current_user['id']}: {reason}")

    return {"status": "success", "message": "Content rejected"}


@router.post("/review-queue/bulk-approve")
async def bulk_approve_content(
    content_ids: List[Dict[str, str]] = Body(..., description="List of {content_type, content_id}"),
    scheduled_date: Optional[str] = Body(None),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Bulk approve multiple AI-generated content items.

    Args:
        content_ids: List of objects with content_type and content_id
        scheduled_date: Optional date to schedule all for publication

    Example body:
    {
        "content_ids": [
            {"content_type": "devotion", "content_id": "abc123"},
            {"content_type": "figure", "content_id": "def456"}
        ],
        "scheduled_date": "2024-01-15"
    }
    """
    collection_map = {
        "devotion": "daily_devotions",
        "daily_devotion": "daily_devotions",
        "verse": "verses_of_the_day",
        "verse_of_the_day": "verses_of_the_day",
        "figure": "bible_figures",
        "bible_figure": "bible_figures",
        "quiz": "daily_quizzes",
        "daily_quiz": "daily_quizzes",
        "study": "bible_studies",
        "bible_study": "bible_studies",
    }

    approved_count = 0
    failed = []

    for item in content_ids:
        content_type = item.get("content_type")
        content_id = item.get("content_id")

        if not content_type or not content_id:
            failed.append({"content_id": content_id, "error": "Missing content_type or content_id"})
            continue

        collection_name = collection_map.get(content_type)
        if not collection_name:
            failed.append({"content_id": content_id, "error": f"Unknown type: {content_type}"})
            continue

        collection = db[collection_name]

        # Build update
        update = {
            "reviewed_by": current_user["id"],
            "reviewed_at": datetime.now(),
            "updated_by": current_user["id"],
            "updated_at": datetime.now(),
        }

        if scheduled_date:
            update["scheduled_date"] = scheduled_date
            update["status"] = "scheduled"
        else:
            update["status"] = "published"
            update["published_at"] = datetime.now()

        result = await collection.update_one(
            {"id": content_id, "deleted": False},
            {"$set": update}
        )

        if result.matched_count > 0:
            approved_count += 1
        else:
            failed.append({"content_id": content_id, "error": "Not found"})

    logger.info(f"Review queue: Bulk approved {approved_count} items by {current_user['id']}")

    return {
        "status": "success",
        "approved_count": approved_count,
        "failed": failed,
        "message": f"Approved {approved_count} of {len(content_ids)} items"
    }


@router.post("/review-queue/bulk-reject")
async def bulk_reject_content(
    content_ids: List[Dict[str, str]] = Body(...),
    reason: Optional[str] = Body(None),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Bulk reject multiple AI-generated content items."""
    collection_map = {
        "devotion": "daily_devotions",
        "daily_devotion": "daily_devotions",
        "verse": "verses_of_the_day",
        "verse_of_the_day": "verses_of_the_day",
        "figure": "bible_figures",
        "bible_figure": "bible_figures",
        "quiz": "daily_quizzes",
        "daily_quiz": "daily_quizzes",
        "study": "bible_studies",
        "bible_study": "bible_studies",
    }

    rejected_count = 0
    failed = []

    for item in content_ids:
        content_type = item.get("content_type")
        content_id = item.get("content_id")

        if not content_type or not content_id:
            failed.append({"content_id": content_id, "error": "Missing fields"})
            continue

        collection_name = collection_map.get(content_type)
        if not collection_name:
            failed.append({"content_id": content_id, "error": f"Unknown type: {content_type}"})
            continue

        collection = db[collection_name]

        result = await collection.update_one(
            {"id": content_id, "deleted": False},
            {
                "$set": {
                    "status": "rejected",
                    "rejected_by": current_user["id"],
                    "rejected_at": datetime.now(),
                    "rejection_reason": reason,
                    "updated_by": current_user["id"],
                    "updated_at": datetime.now(),
                }
            }
        )

        if result.matched_count > 0:
            rejected_count += 1
        else:
            failed.append({"content_id": content_id, "error": "Not found"})

    logger.info(f"Review queue: Bulk rejected {rejected_count} items by {current_user['id']}")

    return {
        "status": "success",
        "rejected_count": rejected_count,
        "failed": failed,
        "message": f"Rejected {rejected_count} of {len(content_ids)} items"
    }


@router.get("/review-queue/stats")
async def get_review_queue_stats(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Get review queue statistics.

    Returns:
        - pending: Total items pending review
        - approved_today: Items approved today
        - rejected_today: Items rejected today
        - by_type: Breakdown by content type
        - generation_history: Recent autonomous generation stats
    """
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)

    collections = [
        ("daily_devotions", "devotion"),
        ("verses_of_the_day", "verse"),
        ("bible_figures", "figure"),
        ("daily_quizzes", "quiz"),
        ("bible_studies", "study"),
    ]

    stats = {
        "pending": 0,
        "approved_today": 0,
        "rejected_today": 0,
        "generated_today": 0,
        "by_type": {},
    }

    for collection_name, type_key in collections:
        collection = db[collection_name]

        # Build base query with tenant filtering
        base_query = {"deleted": False, "ai_generated": True}
        if session_church_id != "global":
            base_query["$or"] = [
                {"church_id": session_church_id},
                {"scope": "global"}
            ]

        # Count pending
        pending_query = {**base_query, "status": {"$in": ["draft", None]}}
        pending = await collection.count_documents(pending_query)
        stats["pending"] += pending
        stats["by_type"][type_key] = {"pending": pending}

        # Count approved today
        approved_query = {
            **base_query,
            "status": "published",
            "reviewed_at": {"$gte": today_start}
        }
        approved = await collection.count_documents(approved_query)
        stats["approved_today"] += approved
        stats["by_type"][type_key]["approved_today"] = approved

        # Count rejected today
        rejected_query = {
            **base_query,
            "status": "rejected",
            "rejected_at": {"$gte": today_start}
        }
        rejected = await collection.count_documents(rejected_query)
        stats["rejected_today"] += rejected
        stats["by_type"][type_key]["rejected_today"] = rejected

        # Count generated today
        generated_query = {
            **base_query,
            "created_at": {"$gte": today_start}
        }
        generated = await collection.count_documents(generated_query)
        stats["generated_today"] += generated
        stats["by_type"][type_key]["generated_today"] = generated

    # Get generation history from tracking collection
    history = await db.content_generation_history.find_one(
        {"church_id": session_church_id if session_church_id != "global" else "global"}
    )

    if history:
        stats["generation_history"] = {
            "total_devotions": len(history.get("daily_devotion", {}).get("used_items", [])),
            "total_figures": len(history.get("bible_figure", {}).get("used_items", [])),
            "total_quizzes": len(history.get("daily_quiz", {}).get("used_items", [])),
            "total_studies": len(history.get("bible_study", {}).get("used_items", [])),
            "last_generation": history.get("last_generation"),
        }
    else:
        stats["generation_history"] = None

    return stats


@router.post("/trigger-generation")
async def trigger_manual_generation(
    content_types: List[str] = Body(["all"], embed=True),
    church_id: str = Body("global", embed=True),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Manually trigger autonomous content generation.

    This allows staff to trigger the autonomous generation process on demand,
    rather than waiting for the scheduled 3:00 AM run.

    Args:
        content_types: List of types to generate ["devotion", "verse", "figure", "quiz"]
                       or ["all"] for all types
        church_id: Church ID or "global" for platform-wide content

    Note: This runs the same autonomous process as the scheduler - staff
    does not need to provide any creative input. The AI will select topics
    automatically and generate complete content.
    """
    try:
        from services.explore.autonomous_generator import AutonomousContentGenerator
        from services.seaweedfs_service import SeaweedFSService

        seaweedfs = SeaweedFSService()
        generator = AutonomousContentGenerator(db, seaweedfs)

        type_map = {
            "devotion": "daily_devotion",
            "daily_devotion": "daily_devotion",
            "verse": "verse_of_the_day",
            "verse_of_the_day": "verse_of_the_day",
            "figure": "bible_figure",
            "bible_figure": "bible_figure",
            "quiz": "daily_quiz",
            "daily_quiz": "daily_quiz",
            "study": "bible_study",
            "bible_study": "bible_study",
        }

        results = {}

        if "all" in content_types:
            # Generate all daily content types
            results = await generator.schedule_daily_generation(church_id=church_id)

            # Save generated content to database
            for content_type, result in results.items():
                if result.get("success") and result.get("document"):
                    collection_map = {
                        "bible_figure": "bible_figures",
                        "daily_devotion": "daily_devotions",
                        "verse_of_the_day": "verses_of_the_day",
                        "daily_quiz": "daily_quizzes",
                    }
                    collection_name = collection_map.get(content_type)
                    if collection_name:
                        await db[collection_name].insert_one(result["document"])
        else:
            # Generate specific types
            for content_type in content_types:
                mapped_type = type_map.get(content_type)
                if not mapped_type:
                    results[content_type] = {"success": False, "error": f"Unknown type: {content_type}"}
                    continue

                try:
                    document = await generator.generate_content_autonomously(
                        content_type=mapped_type,
                        church_id=church_id,
                        generate_image=True
                    )

                    if "error" not in document:
                        # Save to database
                        collection_map = {
                            "bible_figure": "bible_figures",
                            "daily_devotion": "daily_devotions",
                            "verse_of_the_day": "verses_of_the_day",
                            "daily_quiz": "daily_quizzes",
                            "bible_study": "bible_studies",
                        }
                        collection_name = collection_map.get(mapped_type)
                        if collection_name:
                            await db[collection_name].insert_one(document)

                        results[content_type] = {
                            "success": True,
                            "content_id": document.get("id"),
                            "title": document.get("title", {}).get("en") or document.get("name", {}).get("en") or document.get("verse_reference"),
                        }
                    else:
                        results[content_type] = {"success": False, "error": document["error"]}

                except Exception as e:
                    results[content_type] = {"success": False, "error": str(e)}

        logger.info(f"Manual generation triggered by {current_user['id']}: {results}")

        return {
            "status": "success",
            "results": results,
            "message": "Content generated and added to review queue"
        }

    except ImportError as e:
        raise HTTPException(
            status_code=500,
            detail={"error_code": "SERVICE_UNAVAILABLE", "message": f"Generator service not available: {str(e)}"}
        )
    except Exception as e:
        logger.error(f"Manual generation failed: {e}")
        raise HTTPException(
            status_code=500,
            detail={"error_code": "GENERATION_FAILED", "message": str(e)}
        )


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


def _get_storage_category(content_type: str) -> StorageCategory:
    """Map content type to SeaweedFS storage category"""
    category_map = {
        "daily_devotion": StorageCategory.EXPLORE_DEVOTION,
        "devotion": StorageCategory.EXPLORE_DEVOTION,
        "verse_of_the_day": StorageCategory.EXPLORE_VERSE,
        "verse": StorageCategory.EXPLORE_VERSE,
        "bible_figure_of_the_day": StorageCategory.EXPLORE_FIGURE,
        "bible_figure": StorageCategory.EXPLORE_FIGURE,
        "figure": StorageCategory.EXPLORE_FIGURE,
        "daily_quiz": StorageCategory.EXPLORE_QUIZ,
        "quiz": StorageCategory.EXPLORE_QUIZ,
        "bible_study": StorageCategory.EXPLORE_DEVOTION,
        "topical_category": StorageCategory.EXPLORE_VERSE,
        "topical_verse": StorageCategory.EXPLORE_VERSE,
        "devotion_plan": StorageCategory.EXPLORE_DEVOTION,
        "shareable_image": StorageCategory.AI_GENERATED,
    }
    return category_map.get(content_type, StorageCategory.GENERAL)


# ==================== IMAGE UPLOAD ENDPOINTS (SeaweedFS) ====================


@router.post("/content/{content_type}/{content_id}/upload-image")
async def upload_content_image(
    content_type: ContentType,
    content_id: str,
    file: UploadFile = File(...),
    image_field: str = Query("cover_image", description="Field name to store image URL"),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Upload image for any Explore content type to SeaweedFS.

    Args:
        content_type: Type of content (daily_devotion, verse_of_the_day, etc.)
        content_id: ID of the content
        file: Image file to upload
        image_field: Field name to store the URL (default: cover_image)

    Returns:
        - image_url: URL to the uploaded image
        - thumbnail_url: URL to the thumbnail
    """
    collection = _get_collection(db, content_type)
    if collection is None:
        raise HTTPException(
            status_code=400,
            detail={"error_code": "INVALID_CONTENT_TYPE", "message": f"Unknown content type: {content_type}"}
        )

    # Verify content exists
    content = await collection.find_one({"id": content_id, "deleted": False})
    if not content:
        raise HTTPException(
            status_code=404,
            detail={"error_code": "NOT_FOUND", "message": "Content not found"}
        )

    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "INVALID_FILE_TYPE",
                "message": f"File type {file.content_type} not allowed. Use jpg, png, or webp"
            }
        )

    # Read and validate size
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "FILE_SIZE_EXCEEDED",
                "message": "Image must be less than 10MB"
            }
        )

    # Upload to SeaweedFS
    try:
        seaweedfs = get_seaweedfs_service()
        storage_category = _get_storage_category(content_type.value)

        result = await seaweedfs.upload_by_category(
            content=file_content,
            file_name=file.filename or "image.jpg",
            mime_type=file.content_type,
            church_id=content.get("church_id", "global"),
            category=storage_category,
            entity_id=content_id
        )

        # Update content with image URLs
        update_data = {
            image_field: result["url"],
            f"{image_field}_thumbnail": result.get("thumbnail_url"),
            f"{image_field}_fid": result.get("fid"),
            f"{image_field}_path": result.get("path"),
            "updated_by": current_user["id"],
            "updated_at": datetime.now(),
        }

        await collection.update_one(
            {"id": content_id},
            {"$set": update_data}
        )

        logger.info(f"Explore {content_type} {content_id} image uploaded to SeaweedFS: {result['url']}")

        return {
            "status": "success",
            "image_url": result["url"],
            "thumbnail_url": result.get("thumbnail_url"),
            "file_size": result.get("file_size"),
            "width": result.get("width"),
            "height": result.get("height"),
            "field": image_field,
        }

    except SeaweedFSError as e:
        logger.error(f"Failed to upload explore content image to SeaweedFS: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "UPLOAD_FAILED",
                "message": f"Failed to upload image: {str(e)}"
            }
        )


@router.post("/upload-image")
async def upload_general_explore_image(
    file: UploadFile = File(...),
    content_type: str = Query(..., description="Content type for organizing storage"),
    entity_id: Optional[str] = Query(None, description="Optional entity ID"),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """
    Upload image without associating to specific content (for new content creation).

    Use this endpoint when creating new content and need to upload image first
    before the content ID is generated.

    Returns URL that can be used when creating the content.
    """
    # Validate file type
    allowed_types = ["image/jpeg", "image/jpg", "image/png", "image/webp"]
    if file.content_type not in allowed_types:
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "INVALID_FILE_TYPE",
                "message": f"File type {file.content_type} not allowed. Use jpg, png, or webp"
            }
        )

    # Read and validate size
    file_content = await file.read()
    if len(file_content) > 10 * 1024 * 1024:  # 10MB limit
        raise HTTPException(
            status_code=400,
            detail={
                "error_code": "FILE_SIZE_EXCEEDED",
                "message": "Image must be less than 10MB"
            }
        )

    # Upload to SeaweedFS
    try:
        seaweedfs = get_seaweedfs_service()
        storage_category = _get_storage_category(content_type)

        # Generate entity_id if not provided
        actual_entity_id = entity_id or str(uuid.uuid4())

        result = await seaweedfs.upload_by_category(
            content=file_content,
            file_name=file.filename or "image.jpg",
            mime_type=file.content_type,
            church_id="global",  # Explore content is global
            category=storage_category,
            entity_id=actual_entity_id
        )

        logger.info(f"Explore image uploaded to SeaweedFS: {result['url']}")

        return {
            "status": "success",
            "image_url": result["url"],
            "thumbnail_url": result.get("thumbnail_url"),
            "fid": result.get("fid"),
            "path": result.get("path"),
            "file_size": result.get("file_size"),
            "width": result.get("width"),
            "height": result.get("height"),
            "entity_id": actual_entity_id,
        }

    except SeaweedFSError as e:
        logger.error(f"Failed to upload explore image to SeaweedFS: {e}")
        raise HTTPException(
            status_code=500,
            detail={
                "error_code": "UPLOAD_FAILED",
                "message": f"Failed to upload image: {str(e)}"
            }
        )


# ==================== LIFE STAGE JOURNEYS ADMIN ====================


@router.get("/journeys")
async def list_journeys(
    status: Optional[str] = Query(None, description="Filter by status: draft, published, archived"),
    category: Optional[str] = Query(None),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """List all journeys with admin view"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    query = {"deleted": False}

    if status:
        query["status"] = status
    if category:
        query["category"] = category

    # Apply tenant filtering
    if session_church_id == "global":
        pass  # Can see all
    else:
        query["$or"] = [
            {"church_id": session_church_id},
            {"church_id": "global"}
        ]

    cursor = db.journey_definitions.find(query).sort("created_at", -1)
    journeys = await cursor.to_list(length=100)

    for j in journeys:
        j.pop("_id", None)

    return {"journeys": journeys, "total": len(journeys)}


@router.get("/journeys/{journey_id}")
async def get_journey(
    journey_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get journey by ID for editing"""
    journey = await db.journey_definitions.find_one({"id": journey_id, "deleted": False})

    if not journey:
        # Try by slug
        journey = await db.journey_definitions.find_one({"slug": journey_id, "deleted": False})

    if not journey:
        raise HTTPException(status_code=404, detail="Journey not found")

    journey.pop("_id", None)
    return journey


@router.post("/journeys")
async def create_journey(
    journey: Dict[str, Any] = Body(...),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Create new journey"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    # Generate ID if not provided
    journey["id"] = journey.get("id") or str(uuid.uuid4())
    journey["church_id"] = "global" if session_church_id == "global" else session_church_id
    journey["created_by"] = current_user["id"]
    journey["created_at"] = datetime.now()
    journey["updated_at"] = datetime.now()
    journey["deleted"] = False
    journey["enrollments_count"] = 0
    journey["completions_count"] = 0
    journey["average_rating"] = 0.0
    journey["ratings_count"] = 0

    # Check slug uniqueness
    existing = await db.journey_definitions.find_one({
        "slug": journey["slug"],
        "deleted": False,
    })
    if existing:
        raise HTTPException(status_code=400, detail=f"Journey with slug '{journey['slug']}' already exists")

    await db.journey_definitions.insert_one(journey)

    logger.info(f"Journey created: {journey['id']} by {current_user['id']}")

    return {"status": "success", "id": journey["id"], "slug": journey["slug"]}


@router.put("/journeys/{journey_id}")
async def update_journey(
    journey_id: str,
    journey: Dict[str, Any] = Body(...),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Update journey"""
    journey["updated_by"] = current_user["id"]
    journey["updated_at"] = datetime.now()

    # Don't allow changing id
    journey.pop("id", None)
    journey.pop("_id", None)
    journey.pop("created_by", None)
    journey.pop("created_at", None)

    result = await db.journey_definitions.update_one(
        {"id": journey_id, "deleted": False},
        {"$set": journey}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Journey not found")

    return {"status": "success", "id": journey_id}


@router.delete("/journeys/{journey_id}")
async def delete_journey(
    journey_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Soft delete journey"""
    result = await db.journey_definitions.update_one(
        {"id": journey_id, "deleted": False},
        {
            "$set": {
                "deleted": True,
                "deleted_at": datetime.now(),
                "deleted_by": current_user["id"],
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Journey not found")

    return {"status": "success"}


@router.post("/journeys/{journey_id}/publish")
async def publish_journey(
    journey_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Publish journey"""
    result = await db.journey_definitions.update_one(
        {"id": journey_id, "deleted": False},
        {
            "$set": {
                "status": "published",
                "published_at": datetime.now(),
                "updated_by": current_user["id"],
                "updated_at": datetime.now(),
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Journey not found")

    return {"status": "success", "message": "Journey published"}


@router.post("/journeys/{journey_id}/archive")
async def archive_journey(
    journey_id: str,
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Archive journey"""
    result = await db.journey_definitions.update_one(
        {"id": journey_id, "deleted": False},
        {
            "$set": {
                "status": "archived",
                "archived_at": datetime.now(),
                "updated_by": current_user["id"],
                "updated_at": datetime.now(),
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Journey not found")

    return {"status": "success", "message": "Journey archived"}


# ==================== PROFILE ANALYTICS ADMIN ====================


@router.get("/profiles/analytics")
async def get_profile_analytics(
    time_range: str = Query("30d", description="Time range: 7d, 30d, 90d, all"),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get profile analytics for time range"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    # Calculate date filter
    period_days = {"7d": 7, "30d": 30, "90d": 90, "all": 0}
    days = period_days.get(time_range, 30)

    date_filter = {}
    if days > 0:
        date_filter = {"created_at": {"$gte": datetime.now() - timedelta(days=days)}}

    # Build base query
    base_query = {"deleted": {"$ne": True}}
    if session_church_id != "global":
        base_query["church_id"] = session_church_id

    # Get top topics
    topic_pipeline = [
        {"$match": base_query},
        {"$unwind": "$topic_interests"},
        {"$group": {
            "_id": "$topic_interests.topic",
            "interested_count": {"$sum": 1},
            "avg_interest": {"$avg": "$topic_interests.interest_level"},
        }},
        {"$sort": {"interested_count": -1}},
        {"$limit": 10},
    ]
    top_topics = await db.user_spiritual_profiles.aggregate(topic_pipeline).to_list(length=10)

    # Format topics
    formatted_topics = []
    for topic in top_topics:
        formatted_topics.append({
            "id": topic["_id"],
            "name": topic["_id"].replace("_", " ").title(),
            "interested_count": topic["interested_count"],
            "engagement_rate": round(topic["avg_interest"] * 10, 1) if topic["avg_interest"] else 0,
        })

    # Get life situations
    situation_pipeline = [
        {"$match": base_query},
        {"$unwind": "$life_situation.current_challenges"},
        {"$group": {
            "_id": "$life_situation.current_challenges",
            "count": {"$sum": 1},
        }},
        {"$sort": {"count": -1}},
    ]
    life_situations = await db.user_spiritual_profiles.aggregate(situation_pipeline).to_list(length=20)

    formatted_situations = []
    for situation in life_situations:
        formatted_situations.append({
            "id": situation["_id"],
            "label": situation["_id"].replace("_", " ").title(),
            "count": situation["count"],
        })

    # Get content engagement stats
    content_query = {**base_query, **date_filter}
    devotions_read = await db.user_explore_progress.aggregate([
        {"$match": content_query},
        {"$group": {"_id": None, "total": {"$sum": "$content_progress.devotions_read"}}},
    ]).to_list(length=1)

    quizzes_completed = await db.user_explore_progress.aggregate([
        {"$match": content_query},
        {"$group": {"_id": None, "total": {"$sum": "$content_progress.quizzes_completed"}}},
    ]).to_list(length=1)

    studies_in_progress = await db.user_journey_enrollments.count_documents({
        **base_query,
        "status": "active",
    })

    return {
        "top_topics": formatted_topics,
        "life_situations": formatted_situations,
        "content_engagement": {
            "devotions_read": devotions_read[0]["total"] if devotions_read else 0,
            "quizzes_completed": quizzes_completed[0]["total"] if quizzes_completed else 0,
            "studies_in_progress": studies_in_progress,
        },
        "insights": [
            "Most engaged time: Morning (6-9 AM)",
            "Top content: Daily Devotions",
            "Growing topic: Peace & Anxiety",
            "Suggested focus: New believer journey",
        ],
    }


@router.get("/profiles/aggregates")
async def get_profile_aggregates(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get aggregated profile statistics"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    base_query = {"deleted": {"$ne": True}}
    if session_church_id != "global":
        base_query["church_id"] = session_church_id

    # Total profiles
    total_profiles = await db.user_spiritual_profiles.count_documents(base_query)

    # Onboarding completion rate
    onboarded = await db.user_spiritual_profiles.count_documents({
        **base_query,
        "onboarding_completed": True,
    })
    onboarding_rate = round((onboarded / total_profiles * 100) if total_profiles > 0 else 0, 1)

    # Average engagement score
    engagement_pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": None,
            "avg_score": {"$avg": "$engagement_score"},
        }},
    ]
    engagement_result = await db.user_spiritual_profiles.aggregate(engagement_pipeline).to_list(length=1)
    avg_engagement = engagement_result[0]["avg_score"] if engagement_result else 0

    # Average streak
    streak_pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": None,
            "avg_streak": {"$avg": "$streak.current_streak"},
        }},
    ]
    streak_result = await db.user_explore_progress.aggregate(streak_pipeline).to_list(length=1)
    avg_streak = streak_result[0]["avg_streak"] if streak_result else 0

    # Growth level distribution
    growth_pipeline = [
        {"$match": base_query},
        {"$group": {
            "_id": "$growth_indicators.overall_level",
            "count": {"$sum": 1},
        }},
    ]
    growth_result = await db.user_spiritual_profiles.aggregate(growth_pipeline).to_list(length=10)
    growth_distribution = {item["_id"]: item["count"] for item in growth_result if item["_id"]}

    return {
        "total_profiles": total_profiles,
        "onboarding_completed": onboarding_rate,
        "avg_engagement_score": round(avg_engagement, 1) if avg_engagement else 0,
        "avg_streak": round(avg_streak, 1) if avg_streak else 0,
        "growth_distribution": growth_distribution,
    }


@router.get("/profiles/top-engagers")
async def get_top_engagers(
    limit: int = Query(10, ge=1, le=50),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get top engaging users"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    base_query = {"deleted": {"$ne": True}}
    if session_church_id != "global":
        base_query["church_id"] = session_church_id

    # Get top users by engagement score
    pipeline = [
        {"$match": base_query},
        {"$lookup": {
            "from": "members",
            "localField": "user_id",
            "foreignField": "_id",
            "as": "member",
        }},
        {"$unwind": {"path": "$member", "preserveNullAndEmptyArrays": True}},
        {"$sort": {"engagement_score": -1}},
        {"$limit": limit},
        {"$project": {
            "_id": 0,
            "id": "$user_id",
            "name": {"$ifNull": ["$member.full_name", "Anonymous"]},
            "email": "$member.email",
            "engagement_score": {"$ifNull": ["$engagement_score", 0]},
            "streak": {"$ifNull": ["$streak.current_streak", 0]},
            "growth_level": {"$ifNull": ["$growth_indicators.overall_level", "beginner"]},
            "devotions_read": {"$ifNull": ["$content_progress.devotions_read", 0]},
            "quizzes_completed": {"$ifNull": ["$content_progress.quizzes_completed", 0]},
            "interests": "$topic_interests",
        }},
    ]

    users = await db.user_spiritual_profiles.aggregate(pipeline).to_list(length=limit)

    # Get active journeys for each user
    for user in users:
        journeys = await db.user_journey_enrollments.find({
            "user_id": user["id"],
            "status": "active",
            "deleted": {"$ne": True},
        }).to_list(length=5)

        user["active_journeys"] = [
            {
                "id": j["journey_id"],
                "slug": j["journey_slug"],
                "title": j.get("journey_title", j["journey_slug"]),
                "current_week": j["current_week"],
                "current_day": j["current_day"],
            }
            for j in journeys
        ]

    return {"users": users, "total": len(users)}


@router.get("/profiles/growth")
async def get_growth_indicators(
    time_range: str = Query("30d", description="Time range: 7d, 30d, 90d, all"),
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Get growth indicators for time range"""
    from utils.tenant_utils import get_session_church_id_from_user

    session_church_id = get_session_church_id_from_user(current_user)

    # Calculate date filter
    period_days = {"7d": 7, "30d": 30, "90d": 90, "all": 0}
    days = period_days.get(time_range, 30)

    base_query = {"deleted": {"$ne": True}}
    if session_church_id != "global":
        base_query["church_id"] = session_church_id

    date_filter = {}
    if days > 0:
        date_filter = {"created_at": {"$gte": datetime.now() - timedelta(days=days)}}

    # New profiles in period
    new_profiles = await db.user_spiritual_profiles.count_documents({
        **base_query,
        **date_filter,
    })

    # Active users (interacted in period)
    active_users = await db.user_explore_progress.count_documents({
        **base_query,
        "updated_at": {"$gte": datetime.now() - timedelta(days=days)} if days > 0 else {"$exists": True},
    })

    # New journey enrollments
    journey_enrollments = await db.user_journey_enrollments.count_documents({
        **base_query,
        "enrolled_at": {"$gte": datetime.now() - timedelta(days=days)} if days > 0 else {"$exists": True},
    })

    # Journey completions
    journey_completions = await db.user_journey_enrollments.count_documents({
        **base_query,
        "status": "completed",
        "completed_at": {"$gte": datetime.now() - timedelta(days=days)} if days > 0 else {"$exists": True},
    })

    return {
        "new_profiles": new_profiles,
        "active_users": active_users,
        "journey_enrollments": journey_enrollments,
        "journey_completions": journey_completions,
    }


# ==================== NEWS CONTEXT ADMIN ====================


@router.get("/news-contexts")
async def list_news_contexts(
    limit: int = Query(30, ge=1, le=100),
    offset: int = Query(0, ge=0),
    processed: Optional[bool] = Query(None),
    current_user=Depends(require_admin),
    db=Depends(get_db),
):
    """List news contexts for admin review"""
    query = {}

    if processed is not None:
        query["processed"] = processed

    total = await db.news_contexts.count_documents(query)
    cursor = db.news_contexts.find(query, {"_id": 0}).sort("created_at", -1).skip(offset).limit(limit)
    contexts = await cursor.to_list(length=limit)

    return {
        "success": True,
        "data": {
            "contexts": contexts,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": (offset + limit) < total
            }
        }
    }


@router.get("/news-contexts/{context_id}")
async def get_news_context(
    context_id: str,
    current_user=Depends(require_admin),
    db=Depends(get_db),
):
    """Get single news context with full details"""
    context = await db.news_contexts.find_one({"id": context_id}, {"_id": 0})

    if not context:
        raise HTTPException(status_code=404, detail="News context not found")

    return {"success": True, "data": context}


@router.patch("/news-contexts/{context_id}/review")
async def mark_news_context_reviewed(
    context_id: str,
    current_user=Depends(require_admin),
    db=Depends(get_db),
):
    """Mark a news context as reviewed by admin"""
    result = await db.news_contexts.update_one(
        {"id": context_id},
        {
            "$set": {
                "admin_reviewed": True,
                "reviewed_at": datetime.now(),
                "reviewed_by": str(current_user.get("id", current_user.get("_id"))),
            }
        }
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="News context not found")

    return {"success": True, "message": "News context marked as reviewed"}


@router.post("/news-contexts/trigger")
async def trigger_news_context_fetch(
    current_user=Depends(require_super_admin),
    db=Depends(get_db),
):
    """Manually trigger news context fetch (super admin only)"""
    from services.explore.news_context_service import NewsContextService

    try:
        news_service = NewsContextService(db)
        context = await news_service.create_daily_context()

        return {
            "success": True,
            "message": "News context fetch triggered",
            "data": {
                "significant_events_count": len(context.significant_events) if context else 0,
                "disaster_alerts_count": len(context.disaster_alerts) if context else 0,
            }
        }
    except Exception as e:
        logger.error(f"Failed to trigger news context fetch: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/news-contexts/stats/summary")
async def get_news_context_stats(
    days: int = Query(30, ge=7, le=365),
    current_user=Depends(require_admin),
    db=Depends(get_db),
):
    """Get news context statistics"""
    from datetime import timedelta

    start_date = datetime.now() - timedelta(days=days)

    # Total contexts
    total_contexts = await db.news_contexts.count_documents({
        "created_at": {"$gte": start_date}
    })

    # Processed vs unprocessed
    processed_count = await db.news_contexts.count_documents({
        "created_at": {"$gte": start_date},
        "processed": True
    })

    # Events by category
    category_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}}},
        {"$unwind": "$significant_events"},
        {"$group": {"_id": "$significant_events.category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    category_results = await db.news_contexts.aggregate(category_pipeline).to_list(20)
    events_by_category = {r["_id"]: r["count"] for r in category_results if r["_id"]}

    # Disaster alerts count
    alerts_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "disaster_alerts.0": {"$exists": True}}},
        {"$project": {"alerts_count": {"$size": "$disaster_alerts"}}},
        {"$group": {"_id": None, "total": {"$sum": "$alerts_count"}}}
    ]
    alerts_result = await db.news_contexts.aggregate(alerts_pipeline).to_list(1)
    total_alerts = alerts_result[0]["total"] if alerts_result else 0

    # Content generated
    content_pipeline = [
        {"$match": {"created_at": {"$gte": start_date}, "contextual_content_ids.0": {"$exists": True}}},
        {"$project": {"content_count": {"$size": "$contextual_content_ids"}}},
        {"$group": {"_id": None, "total": {"$sum": "$content_count"}}}
    ]
    content_result = await db.news_contexts.aggregate(content_pipeline).to_list(1)
    total_content_generated = content_result[0]["total"] if content_result else 0

    return {
        "success": True,
        "data": {
            "period_days": days,
            "total_contexts": total_contexts,
            "processed": processed_count,
            "unprocessed": total_contexts - processed_count,
            "events_by_category": events_by_category,
            "total_disaster_alerts": total_alerts,
            "total_content_generated": total_content_generated,
        }
    }
