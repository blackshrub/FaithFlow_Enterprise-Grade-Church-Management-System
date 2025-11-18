from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime

from models.member_status import MemberStatus, MemberStatusCreate, MemberStatusUpdate
from models.demographic_preset import DemographicPreset, DemographicPresetCreate, DemographicPresetUpdate
from models.church_settings import ChurchSettings, ChurchSettingsCreate, ChurchSettingsUpdate
from models.event_category import EventCategory, EventCategoryCreate, EventCategoryUpdate
from utils.dependencies import get_db, require_admin, get_current_user

router = APIRouter(prefix="/settings", tags=["Settings"])


# ============= Member Status Routes =============

@router.post("/member-statuses", response_model=MemberStatus, status_code=status.HTTP_201_CREATED)
async def create_member_status(
    status_data: MemberStatusCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new member status (admin only)"""
    
    # Verify user has access to this church
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != status_data.church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if status with same name already exists
    existing = await db.member_statuses.find_one({
        "church_id": status_data.church_id,
        "name": status_data.name
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Member status with this name already exists"
        )
    
    member_status = MemberStatus(**status_data.model_dump())
    status_doc = member_status.model_dump()
    status_doc['created_at'] = status_doc['created_at'].isoformat()
    status_doc['updated_at'] = status_doc['updated_at'].isoformat()
    
    # If this is being set as default, unset all others
    if status_doc.get('is_default_for_new'):
        await db.member_statuses.update_many(
            {"church_id": status_data.church_id},
            {"$set": {"is_default_for_new": False}}
        )
    
    await db.member_statuses.insert_one(status_doc)
    return member_status


@router.get("/member-statuses", response_model=List[MemberStatus])
async def list_member_statuses(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """List all member statuses for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    statuses = await db.member_statuses.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Convert ISO strings to datetime
    for s in statuses:
        if isinstance(s.get('created_at'), str):
            s['created_at'] = datetime.fromisoformat(s['created_at'])
        if isinstance(s.get('updated_at'), str):
            s['updated_at'] = datetime.fromisoformat(s['updated_at'])
    
    return statuses


@router.get("/member-statuses/{status_id}", response_model=MemberStatus)
async def get_member_status(
    status_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Get member status by ID"""
    
    status = await db.member_statuses.find_one({"id": status_id}, {"_id": 0})
    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member status not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != status.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Convert ISO strings
    if isinstance(status.get('created_at'), str):
        status['created_at'] = datetime.fromisoformat(status['created_at'])
    if isinstance(status.get('updated_at'), str):
        status['updated_at'] = datetime.fromisoformat(status['updated_at'])
    
    return status


@router.patch("/member-statuses/{status_id}", response_model=MemberStatus)
async def update_member_status(
    status_id: str,
    status_data: MemberStatusUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update member status"""
    
    status = await db.member_statuses.find_one({"id": status_id})
    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member status not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != status.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update only provided fields
    update_data = status_data.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
        # If setting as default, unset all others first
        if update_data.get('is_default_for_new'):
            await db.member_statuses.update_many(
                {"church_id": status.get('church_id')},
                {"$set": {"is_default_for_new": False}}
            )
        
        await db.member_statuses.update_one(
            {"id": status_id},
            {"$set": update_data}
        )
    
    # Get updated status
    updated_status = await db.member_statuses.find_one({"id": status_id}, {"_id": 0})
    
    # Convert ISO strings
    if isinstance(updated_status.get('created_at'), str):
        updated_status['created_at'] = datetime.fromisoformat(updated_status['created_at'])
    if isinstance(updated_status.get('updated_at'), str):
        updated_status['updated_at'] = datetime.fromisoformat(updated_status['updated_at'])
    
    return updated_status


@router.delete("/member-statuses/{status_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_member_status(
    status_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete member status"""
    
    status = await db.member_statuses.find_one({"id": status_id})
    if not status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member status not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != status.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.member_statuses.delete_one({"id": status_id})
    return None


# ============= Demographic Preset Routes =============

@router.post("/demographics", response_model=DemographicPreset, status_code=status.HTTP_201_CREATED)
async def create_demographic_preset(
    preset_data: DemographicPresetCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new demographic preset (admin only)"""
    
    # Verify user has access to this church
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != preset_data.church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Validate age range
    if preset_data.min_age > preset_data.max_age:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Minimum age cannot be greater than maximum age"
        )
    
    # Check if preset with same name already exists
    existing = await db.demographic_presets.find_one({
        "church_id": preset_data.church_id,
        "name": preset_data.name
    })
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Demographic preset with this name already exists"
        )
    
    demographic = DemographicPreset(**preset_data.model_dump())
    preset_doc = demographic.model_dump()
    preset_doc['created_at'] = preset_doc['created_at'].isoformat()
    preset_doc['updated_at'] = preset_doc['updated_at'].isoformat()
    
    await db.demographic_presets.insert_one(preset_doc)
    return demographic


@router.get("/demographics", response_model=List[DemographicPreset])
async def list_demographic_presets(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """List all demographic presets for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('church_id')
    
    presets = await db.demographic_presets.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    
    # Convert ISO strings to datetime
    for p in presets:
        if isinstance(p.get('created_at'), str):
            p['created_at'] = datetime.fromisoformat(p['created_at'])
        if isinstance(p.get('updated_at'), str):
            p['updated_at'] = datetime.fromisoformat(p['updated_at'])
    
    return presets


@router.get("/demographics/{preset_id}", response_model=DemographicPreset)
async def get_demographic_preset(
    preset_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Get demographic preset by ID"""
    
    preset = await db.demographic_presets.find_one({"id": preset_id}, {"_id": 0})
    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demographic preset not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != preset.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Convert ISO strings
    if isinstance(preset.get('created_at'), str):
        preset['created_at'] = datetime.fromisoformat(preset['created_at'])
    if isinstance(preset.get('updated_at'), str):
        preset['updated_at'] = datetime.fromisoformat(preset['updated_at'])
    
    return preset


@router.patch("/demographics/{preset_id}", response_model=DemographicPreset)
async def update_demographic_preset(
    preset_id: str,
    preset_data: DemographicPresetUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update demographic preset"""
    
    preset = await db.demographic_presets.find_one({"id": preset_id})
    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demographic preset not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != preset.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Update only provided fields
    update_data = preset_data.model_dump(exclude_unset=True)
    
    # Validate age range if both are provided
    if 'min_age' in update_data or 'max_age' in update_data:
        min_age = update_data.get('min_age', preset.get('min_age'))
        max_age = update_data.get('max_age', preset.get('max_age'))
        if min_age > max_age:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Minimum age cannot be greater than maximum age"
            )
    
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        await db.demographic_presets.update_one(
            {"id": preset_id},
            {"$set": update_data}
        )
    
    # Get updated preset
    updated_preset = await db.demographic_presets.find_one({"id": preset_id}, {"_id": 0})
    
    # Convert ISO strings
    if isinstance(updated_preset.get('created_at'), str):
        updated_preset['created_at'] = datetime.fromisoformat(updated_preset['created_at'])
    if isinstance(updated_preset.get('updated_at'), str):
        updated_preset['updated_at'] = datetime.fromisoformat(updated_preset['updated_at'])
    
    return updated_preset


@router.delete("/demographics/{preset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_demographic_preset(
    preset_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete demographic preset"""
    
    preset = await db.demographic_presets.find_one({"id": preset_id})
    if not preset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Demographic preset not found"
        )
    
    # Check access
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != preset.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    await db.demographic_presets.delete_one({"id": preset_id})
    return None


# ============= Church Settings Routes =============

@router.get("/church-settings", response_model=ChurchSettings)
async def get_church_settings(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get church settings for current user's church"""
    
    church_id = current_user.get('church_id')
    settings = await db.church_settings.find_one({"church_id": church_id}, {"_id": 0})
    
    if not settings:
        # Return default settings if not found
        default_settings = ChurchSettings(church_id=church_id)
        return default_settings
    
    # Convert ISO strings
    if isinstance(settings.get('created_at'), str):
        settings['created_at'] = datetime.fromisoformat(settings['created_at'])
    if isinstance(settings.get('updated_at'), str):
        settings['updated_at'] = datetime.fromisoformat(settings['updated_at'])
    
    return settings


@router.post("/church-settings", response_model=ChurchSettings, status_code=status.HTTP_201_CREATED)
async def create_church_settings(
    settings_data: ChurchSettingsCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create church settings (admin only)"""
    
    # Verify user has access to this church
    if current_user.get('role') != 'super_admin' and current_user.get('church_id') != settings_data.church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )
    
    # Check if settings already exist
    existing = await db.church_settings.find_one({"church_id": settings_data.church_id})
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Church settings already exist. Use update endpoint instead."
        )
    
    church_settings = ChurchSettings(**settings_data.model_dump())
    settings_doc = church_settings.model_dump()
    settings_doc['created_at'] = settings_doc['created_at'].isoformat()
    settings_doc['updated_at'] = settings_doc['updated_at'].isoformat()
    
    await db.church_settings.insert_one(settings_doc)
    return church_settings


@router.patch("/church-settings", response_model=ChurchSettings)
async def update_church_settings(
    settings_data: ChurchSettingsUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update church settings for current user's church"""
    
    church_id = current_user.get('church_id')
    settings = await db.church_settings.find_one({"church_id": church_id})
    
    # Create settings if they don't exist
    if not settings:
        default_settings = ChurchSettings(church_id=church_id)
        settings_doc = default_settings.model_dump()
        settings_doc['created_at'] = settings_doc['created_at'].isoformat()
        settings_doc['updated_at'] = settings_doc['updated_at'].isoformat()
        await db.church_settings.insert_one(settings_doc)
        settings = settings_doc
    
    # Update only provided fields
    update_data = settings_data.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        await db.church_settings.update_one(
            {"church_id": church_id},
            {"$set": update_data}
        )
    
    # Get updated settings
    updated_settings = await db.church_settings.find_one({"church_id": church_id}, {"_id": 0})
    
    # Convert ISO strings
    if isinstance(updated_settings.get('created_at'), str):
        updated_settings['created_at'] = datetime.fromisoformat(updated_settings['created_at'])
    if isinstance(updated_settings.get('updated_at'), str):
        updated_settings['updated_at'] = datetime.fromisoformat(updated_settings['updated_at'])
    
    return updated_settings
