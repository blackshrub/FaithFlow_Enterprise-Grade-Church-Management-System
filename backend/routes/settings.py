from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List
from datetime import datetime

from models.member_status import MemberStatus, MemberStatusCreate, MemberStatusUpdate
from models.demographic_preset import DemographicPreset, DemographicPresetCreate, DemographicPresetUpdate
from models.church_settings import ChurchSettings, ChurchSettingsCreate, ChurchSettingsUpdate
from models.event_category import EventCategory, EventCategoryCreate, EventCategoryUpdate
from utils.dependencies import get_db, require_admin, get_current_user, get_session_church_id
from utils.cache import get_cached_statuses, get_cached_demographics, invalidate_church_cache

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
    # Super admin can access any church, regular users must match session_church_id
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != status_data.church_id:
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
    if status_doc.get('is_default'):
        await db.member_statuses.update_many(
            {"church_id": status_data.church_id},
            {"$set": {"is_default": False}}
        )
    
    await db.member_statuses.insert_one(status_doc)

    # Invalidate cache after mutation
    await invalidate_church_cache(status_data.church_id)

    return member_status


@router.get("/member-statuses", response_model=List[MemberStatus])
async def list_member_statuses(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """List all member statuses for current church (cached for 30 minutes)"""

    church_id = get_session_church_id(current_user)

    # Fetch with caching (30 minute TTL)
    async def fetch_statuses():
        # Always filter by session_church_id for proper multi-tenant isolation
        query = {"church_id": church_id}

        statuses = await db.member_statuses.find(query, {"_id": 0}).sort("display_order", 1).to_list(100)

        # Convert ISO strings to datetime
        for s in statuses:
            if isinstance(s.get('created_at'), str):
                s['created_at'] = datetime.fromisoformat(s['created_at'])
            if isinstance(s.get('updated_at'), str):
                s['updated_at'] = datetime.fromisoformat(s['updated_at'])

        return statuses

    return await get_cached_statuses(church_id, fetch_statuses)


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
    
    # Check access - super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != status.get('church_id'):
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
    
    # Check access - super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != status.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Update only provided fields
    update_data = status_data.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        
        # If setting as default, unset all others first
        if update_data.get('is_default'):
            await db.member_statuses.update_many(
                {"church_id": status.get('church_id')},
                {"$set": {"is_default": False}}
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

    member_status = await db.member_statuses.find_one({"id": status_id})
    if not member_status:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Member status not found"
        )

    # Check access - super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != member_status.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    # Check if system status
    if member_status.get('is_system'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete system status"
        )

    # Check if used in any rules as target
    rules_using_status = await db.member_status_rules.count_documents({
        "church_id": member_status.get('church_id'),
        "action_status_id": status_id
    })

    if rules_using_status > 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot delete status: {rules_using_status} rule(s) are using this status as target"
        )

    await db.member_statuses.delete_one({"id": status_id})
    return None


@router.post("/member-statuses/reorder", status_code=status.HTTP_200_OK)
async def reorder_member_statuses(
    status_ids: List[str],
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Reorder member statuses by providing ordered list of IDs"""
    
    church_id = get_session_church_id(current_user)
    
    # Update display_order for each status
    for index, status_id in enumerate(status_ids):
        await db.member_statuses.update_one(
            {"id": status_id, "church_id": church_id},
            {"$set": {"display_order": index + 1}}
        )
    
    return {"message": "Statuses reordered successfully"}


# ============= Demographic Preset Routes =============

@router.post("/demographics", response_model=DemographicPreset, status_code=status.HTTP_201_CREATED)
async def create_demographic_preset(
    preset_data: DemographicPresetCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new demographic preset (admin only)"""
    
    # Verify user has access to this church - super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != preset_data.church_id:
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
    """List all demographic presets for current church (cached for 30 minutes)"""

    church_id = get_session_church_id(current_user)

    # Fetch with caching (30 minute TTL)
    async def fetch_demographics():
        # Always filter by session_church_id for proper multi-tenant isolation
        query = {"church_id": church_id}

        presets = await db.demographic_presets.find(query, {"_id": 0}).sort("order", 1).to_list(100)

        # Convert ISO strings to datetime
        for p in presets:
            if isinstance(p.get('created_at'), str):
                p['created_at'] = datetime.fromisoformat(p['created_at'])
            if isinstance(p.get('updated_at'), str):
                p['updated_at'] = datetime.fromisoformat(p['updated_at'])

        return presets

    return await get_cached_demographics(church_id, fetch_demographics)


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
    
    # Check access - super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != preset.get('church_id'):
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
    
    # Check access - super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != preset.get('church_id'):
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
    
    # Check access - super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != preset.get('church_id'):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied"
        )

    await db.demographic_presets.delete_one({"id": preset_id})
    return None


# ============= Church Settings Routes =============

# ============= Church Settings Routes with Normalization =============

async def _ensure_settings_for_church(
    db: AsyncIOMotorDatabase,
    church_id: str,
) -> dict:
    """
    Guarantee that there is exactly one ChurchSettings document for this church_id.
    
    - If none: create with defaults.
    - If exists: normalize fields (add defaults for missing keys).
    Returns the normalized document.
    """
    existing = await db.church_settings.find_one({"church_id": church_id})
    
    if not existing:
        from datetime import datetime
        import uuid
        
        doc = {
            "id": str(uuid.uuid4()),
            "church_id": church_id,
            "date_format": "DD-MM-YYYY",
            "time_format": "24h",
            "currency": "IDR",
            "timezone": "Asia/Jakarta",
            "default_language": "id",
            "enable_whatsapp_notifications": False,
            "whatsapp_send_rsvp_confirmation": False,
            "whatsapp_send_group_notifications": False,
            "whatsapp_api_url": "",
            "whatsapp_username": "",
            "whatsapp_password": "",
            "group_categories": {
                "cell_group": "Cell Group / Small Group",
                "ministry_team": "Ministry Team",
                "activity": "Activity Group",
                "support_group": "Support Group",
            },
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        await db.church_settings.insert_one(doc)
        return doc
    
    # Normalize existing doc (ensure all keys exist)
    changed = False
    defaults = {
        "date_format": "DD-MM-YYYY",
        "time_format": "24h",
        "currency": "IDR",
        "timezone": "Asia/Jakarta",
        "default_language": "id",
        "enable_whatsapp_notifications": False,
        "whatsapp_send_rsvp_confirmation": False,
        "whatsapp_send_group_notifications": False,
        "whatsapp_api_url": "",
        "whatsapp_username": "",
        "whatsapp_password": "",
        "group_categories": {
            "cell_group": "Cell Group / Small Group",
            "ministry_team": "Ministry Team",
            "activity": "Activity Group",
            "support_group": "Support Group",
        },
    }
    
    for key, default_value in defaults.items():
        if key not in existing:
            existing[key] = default_value
            changed = True
    
    if "id" not in existing:
        import uuid
        existing["id"] = str(uuid.uuid4())
        changed = True
    
    if "created_at" not in existing:
        from datetime import datetime
        existing["created_at"] = datetime.utcnow()
        changed = True
    
    from datetime import datetime
    existing["updated_at"] = datetime.utcnow()
    changed = True
    
    if changed:
        await db.church_settings.update_one(
            {"_id": existing["_id"]},
            {"$set": existing},
        )
    
    return existing


@router.get("/church-settings")
async def get_church_settings(
    db: AsyncIOMotorDatabase = Depends(get_db),
    session_church_id: str = Depends(get_session_church_id),
    current_user: dict = Depends(require_admin)
):
    """
    Return normalized church settings for the current church context.
    Uses session_church_id from JWT.
    """
    import logging, os
    logger = logging.getLogger("settings-diagnostic")

    logger.warning("═══════════════════════════════════════════════════════")
    logger.warning(" 🔍 DIAGNOSTIC GET /church-settings")
    logger.warning("═══════════════════════════════════════════════════════")

    # Log environment & DB info
    logger.warning(f"ENV MONGO_URL = {os.environ.get('MONGO_URL')}")
    logger.warning(f"ENV DB_NAME = {os.environ.get('DB_NAME')}")

    # Log user & session info
    logger.warning(f"User email = {current_user.get('email')}")
    logger.warning(f"User role = {current_user.get('role')}")
    logger.warning(f"session_church_id = {session_church_id}")

    # Log collection identity
    logger.warning(f"DB object = {db}")
    logger.warning(f"Collection object = {db.church_settings}")

    # Log DB name via Motor internals
    try:
        logger.warning(f"Motor DB name = {db.name}")
    except:
        logger.warning("Motor DB name = <unable to read>")

    # Try reading from DB
    try:
        doc = await db.church_settings.find_one({"church_id": session_church_id})
        logger.warning(f"Mongo returned = {doc}")
    except Exception as e:
        logger.error(f"🔥 ERROR DURING DB READ: {e}")
        raise

    # If no document exists, log explicitly
    if not doc:
        logger.warning("⚠️ No church_settings document found for this church_id")
        logger.warning("⚠️ GET will bootstrap a default record (if implemented).")

    logger.warning("════════════ END GET /church-settings DIAGNOSTICS ═════════════")

    doc = await _ensure_settings_for_church(db, session_church_id)

    logger.warning(f"   Returning settings for church: {session_church_id}")

    # Sanitize response: remove _id and convert datetime fields
    if doc:
        # Remove MongoDB _id field
        doc.pop('_id', None)

        # Convert datetime objects to ISO strings
        for field in ['created_at', 'updated_at']:
            if field in doc and hasattr(doc[field], 'isoformat'):
                doc[field] = doc[field].isoformat()

    return doc


@router.post("/church-settings", response_model=ChurchSettings, status_code=status.HTTP_201_CREATED)
async def create_church_settings(
    settings_data: ChurchSettingsCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create church settings (admin only)"""
    
    # Verify user has access to this church - super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != settings_data.church_id:
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


@router.patch("/church-settings")
async def update_church_settings(
    settings_data: ChurchSettingsUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    session_church_id: str = Depends(get_session_church_id),
    current_user: dict = Depends(require_admin)
):
    """
    Update current church settings (only allowed fields).
    Uses session_church_id as filter.
    """
    import logging, os
    logger = logging.getLogger("settings-diagnostic")

    logger.warning("═══════════════════════════════════════════════════════")
    logger.warning(" 🔍 DIAGNOSTIC PATCH /church-settings")
    logger.warning("═══════════════════════════════════════════════════════")

    # Log environment & DB info
    logger.warning(f"ENV MONGO_URL = {os.environ.get('MONGO_URL')}")
    logger.warning(f"ENV DB_NAME = {os.environ.get('DB_NAME')}")

    # Log user & session info
    logger.warning(f"User email = {current_user.get('email')}")
    logger.warning(f"User role = {current_user.get('role')}")
    logger.warning(f"session_church_id = {session_church_id}")

    # Log collection identity
    logger.warning(f"DB object = {db}")
    logger.warning(f"Collection object = {db.church_settings}")

    # Log DB name via Motor internals
    try:
        logger.warning(f"Motor DB name = {db.name}")
    except:
        logger.warning("Motor DB name = <unable to read>")

    # Get or create base doc
    await _ensure_settings_for_church(db, session_church_id)

    # Get update data (exclude unset to only update provided fields)
    update_data = settings_data.model_dump(exclude_unset=True)

    # Remove identity fields
    for key in ["id", "church_id", "created_at"]:
        update_data.pop(key, None)

    logger.warning(f"update_data = {update_data}")

    if update_data:
        from datetime import datetime
        update_data["updated_at"] = datetime.utcnow()

        logger.warning(f"🔄 Executing update_one with filter: {{'church_id': '{session_church_id}'}}")
        logger.warning(f"🔄 Update payload: {update_data}")

        result = await db.church_settings.update_one(
            {"church_id": session_church_id},
            {"$set": update_data}
        )

        logger.warning(f"✅ MongoDB matched={result.matched_count}, modified={result.modified_count}")

        if result.matched_count == 0:
            logger.error("❌ NO DOCUMENT MATCHED! Update failed - church_id not found!")
        elif result.modified_count == 0:
            logger.warning("⚠️ Document matched but NOT modified (same values?)")

    # Return fresh doc
    logger.warning(f"🔍 Reading back updated document with church_id={session_church_id}")
    updated = await db.church_settings.find_one(
        {"church_id": session_church_id},
        {"_id": 0}
    )

    logger.warning(f"📄 Document after update = {updated}")

    # Sanitize response: convert datetime fields
    if updated:
        for field in ['created_at', 'updated_at']:
            if field in updated and hasattr(updated[field], 'isoformat'):
                updated[field] = updated[field].isoformat()

    logger.warning("════════════ END PATCH /church-settings DIAGNOSTICS ═════════════")

    return updated


# ============= Event Category Routes =============

@router.get("/event-categories", response_model=List[EventCategory])
async def list_event_categories(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """List all event categories"""
    # Always filter by session_church_id for proper multi-tenant isolation
    church_id = get_session_church_id(current_user)
    query = {"church_id": church_id}
    
    categories = await db.event_categories.find(query, {"_id": 0}).sort("order", 1).to_list(100)
    
    for cat in categories:
        if isinstance(cat.get('created_at'), str):
            cat['created_at'] = datetime.fromisoformat(cat['created_at'])
        if isinstance(cat.get('updated_at'), str):
            cat['updated_at'] = datetime.fromisoformat(cat['updated_at'])
    
    return categories


@router.post("/event-categories", response_model=EventCategory, status_code=status.HTTP_201_CREATED)
async def create_event_category(
    category_data: EventCategoryCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create event category"""
    # Super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != category_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    category = EventCategory(**category_data.model_dump())
    cat_doc = category.model_dump()
    cat_doc['created_at'] = cat_doc['created_at'].isoformat()
    cat_doc['updated_at'] = cat_doc['updated_at'].isoformat()
    
    await db.event_categories.insert_one(cat_doc)
    return category


@router.patch("/event-categories/{category_id}", response_model=EventCategory)
async def update_event_category(
    category_id: str,
    category_data: EventCategoryUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update event category"""
    category = await db.event_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    # Super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != category.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    update_data = category_data.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now().isoformat()
        await db.event_categories.update_one({"id": category_id}, {"$set": update_data})
    
    updated = await db.event_categories.find_one({"id": category_id}, {"_id": 0})
    if isinstance(updated.get('created_at'), str):
        updated['created_at'] = datetime.fromisoformat(updated['created_at'])
    if isinstance(updated.get('updated_at'), str):
        updated['updated_at'] = datetime.fromisoformat(updated['updated_at'])
    
    return updated


@router.delete("/event-categories/{category_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_event_category(
    category_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete event category (except system categories)"""
    category = await db.event_categories.find_one({"id": category_id})
    if not category:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Category not found")
    
    if category.get('is_system'):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Cannot delete system category")
    
    # Super admin can access any church
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') != category.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    await db.event_categories.delete_one({"id": category_id})
    return None
