"""
Sermon Integration API Routes

Admin endpoints for:
- Sermon input management
- Theme selection
- Content integration settings
"""

from datetime import date, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from utils.dependencies import get_current_user, get_session_church_id, require_admin, get_db
from services.explore.sermon_integration_service import get_sermon_integration_service

router = APIRouter(prefix="/explore/sermons", tags=["Explore Sermons"])


# ==================== REQUEST/RESPONSE MODELS ====================

class ScriptureReference(BaseModel):
    book: str
    chapter: int
    verses: str  # e.g., "1-8" or "5"


class CreateSermonRequest(BaseModel):
    title: dict  # {"en": "...", "id": "..."}
    date: str  # YYYY-MM-DD (Sunday)
    preacher: Optional[str] = None
    series_name: Optional[dict] = None

    main_scripture: ScriptureReference
    supporting_scriptures: List[ScriptureReference] = []

    primary_theme: str
    secondary_themes: List[str] = []
    custom_themes: List[str] = []
    keywords: List[str] = []

    key_points: Optional[dict] = None  # {"en": [...], "id": [...]}

    integration_mode: str = "full"  # "full", "partial", "disabled"
    include_sunday_recap: bool = False


class UpdateSermonRequest(BaseModel):
    title: Optional[dict] = None
    preacher: Optional[str] = None
    series_name: Optional[dict] = None

    main_scripture: Optional[ScriptureReference] = None
    supporting_scriptures: Optional[List[ScriptureReference]] = None

    primary_theme: Optional[str] = None
    secondary_themes: Optional[List[str]] = None
    custom_themes: Optional[List[str]] = None
    keywords: Optional[List[str]] = None

    key_points: Optional[dict] = None

    integration_mode: Optional[str] = None
    include_sunday_recap: Optional[bool] = None


# ==================== PUBLIC ENDPOINTS ====================

@router.get("/themes")
async def get_available_themes(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Get available sermon themes for selection"""
    service = get_sermon_integration_service(db)
    themes = service.get_available_themes()

    return {
        "success": True,
        "data": {"themes": themes},
    }


@router.get("/themes/{theme}/scriptures")
async def get_theme_scriptures(
    theme: str,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """Get suggested scriptures for a theme"""
    service = get_sermon_integration_service(db)
    scriptures = service.get_theme_scriptures(theme)

    return {
        "success": True,
        "data": {"scriptures": scriptures},
    }


# ==================== ADMIN ENDPOINTS ====================

@router.post("/admin/create")
async def create_sermon(
    request: CreateSermonRequest,
    current_user: dict = Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Create a new sermon input (admin only)"""
    service = get_sermon_integration_service(db)

    try:
        sermon_date = date.fromisoformat(request.date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    # Validate it's a Sunday
    if sermon_date.weekday() != 6:  # 6 = Sunday
        raise HTTPException(status_code=400, detail="Sermon date must be a Sunday")

    sermon_data = request.model_dump()
    sermon_data["date"] = sermon_date

    sermon = await service.create_sermon_input(
        church_id=church_id,
        created_by=str(current_user.get("_id") or current_user.get("id")),
        sermon_data=sermon_data,
    )

    return {
        "success": True,
        "message": "Sermon created successfully",
        "data": {
            "id": sermon.id,
            "title": sermon.title,
            "date": sermon.date.isoformat(),
            "primary_theme": sermon.primary_theme,
            "integration_mode": sermon.integration_mode,
        }
    }


@router.get("/admin/list")
async def list_sermons(
    weeks: int = Query(8, ge=1, le=52, description="Number of weeks to fetch"),
    current_user: dict = Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """List upcoming sermons (admin only)"""
    service = get_sermon_integration_service(db)
    sermons = await service.get_upcoming_sermons(church_id, weeks)

    return {
        "success": True,
        "data": {
            "sermons": [s.model_dump() for s in sermons],
            "total": len(sermons),
        }
    }


@router.get("/admin/{sermon_id}")
async def get_sermon(
    sermon_id: str,
    current_user: dict = Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get sermon details (admin only)"""
    service = get_sermon_integration_service(db)
    sermon = await service.get_sermon_input(church_id, sermon_id)

    if not sermon:
        raise HTTPException(status_code=404, detail="Sermon not found")

    return {
        "success": True,
        "data": sermon.model_dump(),
    }


@router.patch("/admin/{sermon_id}")
async def update_sermon(
    sermon_id: str,
    request: UpdateSermonRequest,
    current_user: dict = Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Update sermon (admin only)"""
    service = get_sermon_integration_service(db)

    updates = {k: v for k, v in request.model_dump().items() if v is not None}

    sermon = await service.update_sermon_input(
        church_id=church_id,
        sermon_id=sermon_id,
        updated_by=str(current_user.get("_id") or current_user.get("id")),
        updates=updates,
    )

    if not sermon:
        raise HTTPException(status_code=404, detail="Sermon not found")

    return {
        "success": True,
        "message": "Sermon updated successfully",
        "data": sermon.model_dump(),
    }


@router.delete("/admin/{sermon_id}")
async def delete_sermon(
    sermon_id: str,
    current_user: dict = Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Delete sermon (admin only)"""
    service = get_sermon_integration_service(db)
    await service.delete_sermon_input(church_id, sermon_id)

    return {
        "success": True,
        "message": "Sermon deleted",
    }


@router.get("/admin/{sermon_id}/content-plan")
async def get_weekly_content_plan(
    sermon_id: str,
    current_user: dict = Depends(require_admin),
    church_id: str = Depends(get_session_church_id),
    db=Depends(get_db),
):
    """Get the weekly content plan based on sermon (admin only)"""
    service = get_sermon_integration_service(db)
    sermon = await service.get_sermon_input(church_id, sermon_id)

    if not sermon:
        raise HTTPException(status_code=404, detail="Sermon not found")

    plan = await service.get_weekly_content_plan(church_id, sermon.date)

    return {
        "success": True,
        "data": {
            "sermon_title": sermon.title,
            "sermon_date": sermon.date.isoformat(),
            "primary_theme": sermon.primary_theme,
            "integration_mode": sermon.integration_mode,
            "daily_plan": plan,
        }
    }
