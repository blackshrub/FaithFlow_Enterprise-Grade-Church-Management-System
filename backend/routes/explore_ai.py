"""
Explore AI Generation Routes
API endpoints for AI-powered content generation
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime

from utils.dependencies import get_current_user, get_db, get_session_church_id
from services.ai_service import AIService
from motor.motor_asyncio import AsyncIOMotorDatabase

router = APIRouter(prefix="/api/explore/admin/ai", tags=["Explore AI"])


# ==================== REQUEST MODELS ====================

class GenerateContentRequest(BaseModel):
    content_type: str = Field(..., description="Type of content to generate")
    model: str = Field(default="claude-3-5-sonnet-20241022", description="AI model to use")
    custom_prompt: Optional[str] = Field(None, description="Custom generation prompt")
    generate_both_languages: bool = Field(True, description="Generate English and Indonesian")


class AcceptContentRequest(BaseModel):
    edits: Optional[Dict[str, Any]] = Field(None, description="Optional edits to apply")


# ==================== ENDPOINTS ====================

@router.get("/config")
async def get_ai_config(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get AI configuration for current church
    Returns AI provider settings and credits
    """
    church_id = get_session_church_id(current_user)

    ai_service = AIService(db)
    config = await ai_service.get_ai_config(church_id)

    return config


@router.post("/generate")
async def generate_content(
    request: GenerateContentRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Queue content generation job
    Returns job ID for tracking
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user["email"]

    # Validate content type
    valid_types = ["devotion", "verse", "figure", "quiz"]
    if request.content_type not in valid_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type. Must be one of: {', '.join(valid_types)}"
        )

    # Validate model
    valid_models = [
        "claude-3-5-sonnet-20241022",
        "claude-3-opus-20240229",
        "claude-3-haiku-20240307"
    ]
    if request.model not in valid_models:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid model. Must be one of: {', '.join(valid_models)}"
        )

    try:
        ai_service = AIService(db)
        result = await ai_service.generate_content(
            content_type=request.content_type,
            model=request.model,
            church_id=church_id,
            user_id=user_id,
            custom_prompt=request.custom_prompt,
            generate_both_languages=request.generate_both_languages
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start generation: {str(e)}"
        )


@router.get("/queue")
async def get_generation_queue(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get all generation jobs for current user
    Returns list of jobs with status
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user["email"]

    ai_service = AIService(db)
    jobs = await ai_service.get_generation_queue(church_id, user_id)

    return {"jobs": jobs}


@router.get("/status/{job_id}")
async def get_generation_status(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get status of a specific generation job
    """
    from bson import ObjectId
    from bson.errors import InvalidId

    church_id = get_session_church_id(current_user)
    user_id = current_user["email"]

    try:
        ai_service = AIService(db)
        job = await ai_service.queue_collection.find_one({
            "_id": ObjectId(job_id),
            "church_id": church_id,
            "user_id": user_id
        })

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Job not found"
            )

        job["id"] = str(job.pop("_id"))
        return job

    except InvalidId:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid job ID"
        )


@router.post("/accept/{job_id}")
async def accept_generated_content(
    job_id: str,
    request: AcceptContentRequest,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Accept generated content and save as actual content
    Optionally apply edits before saving
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user["email"]

    try:
        ai_service = AIService(db)
        result = await ai_service.accept_generated_content(
            job_id=job_id,
            church_id=church_id,
            user_id=user_id,
            edits=request.edits
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to accept content: {str(e)}"
        )


@router.post("/reject/{job_id}")
async def reject_generated_content(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Reject generated content
    Marks job as rejected without saving content
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user["email"]

    try:
        ai_service = AIService(db)
        result = await ai_service.reject_generated_content(
            job_id=job_id,
            church_id=church_id,
            user_id=user_id
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/regenerate/{job_id}")
async def regenerate_content(
    job_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Regenerate content with same parameters
    Creates a new job with same settings as original
    """
    church_id = get_session_church_id(current_user)
    user_id = current_user["email"]

    try:
        ai_service = AIService(db)
        result = await ai_service.regenerate_content(
            job_id=job_id,
            church_id=church_id,
            user_id=user_id
        )

        return result

    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to regenerate content: {str(e)}"
        )


# ==================== ADMIN ROUTES (Super Admin Only) ====================

@router.get("/admin/stats")
async def get_ai_generation_stats(
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get platform-wide AI generation statistics
    Super Admin only
    """
    if current_user.get("role") != "super_admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Super Admin access required"
        )

    # Get aggregated stats
    pipeline = [
        {
            "$group": {
                "_id": "$status",
                "count": {"$sum": 1}
            }
        }
    ]

    stats_cursor = db.ai_generation_queue.aggregate(pipeline)
    stats_by_status = {doc["_id"]: doc["count"] async for doc in stats_cursor}

    # Get stats by content type
    pipeline_type = [
        {
            "$group": {
                "_id": "$content_type",
                "count": {"$sum": 1},
                "completed": {
                    "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                }
            }
        }
    ]

    type_cursor = db.ai_generation_queue.aggregate(pipeline_type)
    stats_by_type = []
    async for doc in type_cursor:
        stats_by_type.append({
            "content_type": doc["_id"],
            "total": doc["count"],
            "completed": doc["completed"]
        })

    return {
        "total_jobs": sum(stats_by_status.values()),
        "by_status": stats_by_status,
        "by_content_type": stats_by_type
    }
