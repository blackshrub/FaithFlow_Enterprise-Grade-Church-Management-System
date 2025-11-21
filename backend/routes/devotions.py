from fastapi import APIRouter, Depends, HTTPException, status, Query
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional
from datetime import datetime, timezone
import logging

from models.devotion import Devotion, DevotionCreate, DevotionUpdate, DevotionHistoryEntry
from utils.dependencies import get_db, require_admin, get_current_user
from services.tts_service import generate_tts_audio

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/devotions", tags=["Devotions"])


@router.get("/", response_model=List[Devotion])
async def list_devotions(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user),
    status_filter: Optional[str] = Query(None),
    date_from: Optional[str] = Query(None),
    date_to: Optional[str] = Query(None)
):
    """List all devotions for current church"""
    
    query = {}
    if current_user.get('role') != 'super_admin':
        query['church_id'] = current_user.get('session_church_id') or current_user.get('church_id')
    
    if status_filter:
        query['status'] = status_filter
    
    if date_from:
        query['date'] = {'$gte': date_from}
    if date_to:
        if 'date' not in query:
            query['date'] = {}
        query['date']['$lte'] = date_to
    
    devotions = await db.devotions.find(query, {"_id": 0}).sort("date", -1).to_list(1000)
    
    # Convert datetime fields
    for devotion in devotions:
        if isinstance(devotion.get('created_at'), str):
            devotion['created_at'] = datetime.fromisoformat(devotion['created_at'])
        if isinstance(devotion.get('updated_at'), str):
            devotion['updated_at'] = datetime.fromisoformat(devotion['updated_at'])
        if isinstance(devotion.get('date'), str):
            devotion['date'] = datetime.fromisoformat(devotion['date'])
        if devotion.get('publish_at') and isinstance(devotion['publish_at'], str):
            devotion['publish_at'] = datetime.fromisoformat(devotion['publish_at'])
    
    return devotions


@router.get("/by-date")
async def get_devotion_by_date(
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get devotion by specific date (for mobile app)"""
    
    devotion = await db.devotions.find_one(
        {
            'church_id': current_user.get('session_church_id') or current_user.get('church_id'),
            'date': {'$gte': f"{date}T00:00:00", '$lt': f"{date}T23:59:59"},
            'status': 'published'
        },
        {"_id": 0}
    )
    
    if not devotion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"No devotion found for {date}")
    
    return devotion


@router.get("/today")
async def get_today_devotion(
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get today's published devotion (for mobile app)"""
    
    today = datetime.now(timezone.utc).date()
    query = {
        'church_id': current_user.get('session_church_id') or current_user.get('church_id'),
        'status': 'published'
    }
    
    devotion = await db.devotions.find_one(query, {"_id": 0}, sort=[("date", -1)])
    
    if not devotion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="No devotion found for today")
    
    return devotion


@router.get("/{devotion_id}", response_model=Devotion)
async def get_devotion(
    devotion_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get devotion by ID"""
    
    devotion = await db.devotions.find_one({"id": devotion_id}, {"_id": 0})
    if not devotion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Devotion not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') or current_user.get('church_id') != devotion.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Convert datetime fields
    if isinstance(devotion.get('created_at'), str):
        devotion['created_at'] = datetime.fromisoformat(devotion['created_at'])
    if isinstance(devotion.get('updated_at'), str):
        devotion['updated_at'] = datetime.fromisoformat(devotion['updated_at'])
    if isinstance(devotion.get('date'), str):
        devotion['date'] = datetime.fromisoformat(devotion['date'])
    if devotion.get('publish_at') and isinstance(devotion['publish_at'], str):
        devotion['publish_at'] = datetime.fromisoformat(devotion['publish_at'])
    
    return devotion


@router.post("/", response_model=Devotion, status_code=status.HTTP_201_CREATED)
async def create_devotion(
    devotion_data: DevotionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Create a new devotion"""
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') or current_user.get('church_id') != devotion_data.church_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    devotion = Devotion(**devotion_data.model_dump(), created_by=current_user.get('id'))
    devotion_doc = devotion.model_dump()
    
    # Convert datetime fields
    devotion_doc['created_at'] = devotion_doc['created_at'].isoformat()
    devotion_doc['updated_at'] = devotion_doc['updated_at'].isoformat()
    devotion_doc['date'] = devotion_doc['date'].isoformat()
    if devotion_doc.get('publish_at'):
        devotion_doc['publish_at'] = devotion_doc['publish_at'].isoformat()
    
    await db.devotions.insert_one(devotion_doc)
    logger.info(f"Devotion created: {devotion.title} (ID: {devotion.id})")
    
    return devotion


@router.patch("/{devotion_id}", response_model=Devotion)
async def update_devotion(
    devotion_id: str,
    devotion_data: DevotionUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Update devotion and save version history"""
    
    devotion = await db.devotions.find_one({"id": devotion_id})
    if not devotion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Devotion not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') or current_user.get('church_id') != devotion.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Save current version to history
    history_entry = DevotionHistoryEntry(
        timestamp=datetime.now(timezone.utc),
        edited_by=current_user.get('id'),
        title=devotion.get('title'),
        content=devotion.get('content'),
        verses=devotion.get('verses', []),
        cover_image_url=devotion.get('cover_image_url')
    )
    
    update_data = devotion_data.model_dump(exclude_unset=True)
    if update_data:
        update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
        
        # Convert datetime fields
        if update_data.get('date'):
            update_data['date'] = update_data['date'].isoformat() if hasattr(update_data['date'], 'isoformat') else update_data['date']
        if update_data.get('publish_at'):
            update_data['publish_at'] = update_data['publish_at'].isoformat() if hasattr(update_data['publish_at'], 'isoformat') else update_data['publish_at']
        
        # Add history entry
        await db.devotions.update_one(
            {"id": devotion_id},
            {
                "$set": update_data,
                "$push": {"version_history": history_entry.model_dump()}
            }
        )
    
    updated_devotion = await db.devotions.find_one({"id": devotion_id}, {"_id": 0})
    
    # Convert datetime fields back
    if isinstance(updated_devotion.get('created_at'), str):
        updated_devotion['created_at'] = datetime.fromisoformat(updated_devotion['created_at'])
    if isinstance(updated_devotion.get('updated_at'), str):
        updated_devotion['updated_at'] = datetime.fromisoformat(updated_devotion['updated_at'])
    if isinstance(updated_devotion.get('date'), str):
        updated_devotion['date'] = datetime.fromisoformat(updated_devotion['date'])
    if updated_devotion.get('publish_at') and isinstance(updated_devotion['publish_at'], str):
        updated_devotion['publish_at'] = datetime.fromisoformat(updated_devotion['publish_at'])
    
    return updated_devotion


@router.delete("/{devotion_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_devotion(
    devotion_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Delete devotion"""
    
    devotion = await db.devotions.find_one({"id": devotion_id})
    if not devotion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Devotion not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') or current_user.get('church_id') != devotion.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    await db.devotions.delete_one({"id": devotion_id})
    logger.info(f"Devotion deleted: {devotion_id}")
    
    return None


@router.post("/{devotion_id}/duplicate", response_model=Devotion)
async def duplicate_devotion(
    devotion_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Duplicate an existing devotion"""
    
    original = await db.devotions.find_one({"id": devotion_id})
    if not original:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Devotion not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') or current_user.get('church_id') != original.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    # Create new devotion from original
    import uuid
    new_devotion = {
        **original,
        'id': str(uuid.uuid4()),
        'title': f"{original['title']} (Copy)",
        'status': 'draft',
        'tts_audio_url': None,  # Don't copy audio
        'version_history': [],
        'created_by': current_user.get('id'),
        'created_at': datetime.now(timezone.utc).isoformat(),
        'updated_at': datetime.now(timezone.utc).isoformat()
    }
    
    # Remove _id if exists
    new_devotion.pop('_id', None)
    
    await db.devotions.insert_one(new_devotion)
    logger.info(f"Devotion duplicated: {devotion_id} -> {new_devotion['id']}")
    
    # Convert back for response
    if isinstance(new_devotion.get('created_at'), str):
        new_devotion['created_at'] = datetime.fromisoformat(new_devotion['created_at'])
    if isinstance(new_devotion.get('updated_at'), str):
        new_devotion['updated_at'] = datetime.fromisoformat(new_devotion['updated_at'])
    if isinstance(new_devotion.get('date'), str):
        new_devotion['date'] = datetime.fromisoformat(new_devotion['date'])
    
    return new_devotion


@router.post("/bulk-action")
async def bulk_devotion_action(
    action: str = Query(..., description="publish, unpublish, delete"),
    devotion_ids: List[str] = Query(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Perform bulk action on multiple devotions"""
    
    if action == "delete":
        result = await db.devotions.delete_many({
            "id": {"$in": devotion_ids},
            "church_id": current_user.get('session_church_id') or current_user.get('church_id')
        })
        return {"success": True, "deleted": result.deleted_count}
    
    elif action == "publish":
        result = await db.devotions.update_many(
            {"id": {"$in": devotion_ids}, "church_id": current_user.get('session_church_id') or current_user.get('church_id')},
            {"$set": {"status": "published", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "updated": result.modified_count}
    
    elif action == "unpublish":
        result = await db.devotions.update_many(
            {"id": {"$in": devotion_ids}, "church_id": current_user.get('session_church_id') or current_user.get('church_id')},
            {"$set": {"status": "draft", "updated_at": datetime.now(timezone.utc).isoformat()}}
        )
        return {"success": True, "updated": result.modified_count}
    
    else:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid action")


@router.post("/generate-audio-preview")
async def generate_audio_preview(
    text: str = Query(..., description="Text content to convert to speech"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Generate TTS audio preview from raw text (no devotion ID needed)"""
    
    try:
        # Strip HTML tags
        import re
        clean_text = re.sub(r'<[^>]+>', '', text)
        clean_text = clean_text.strip()
        
        if not clean_text:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No text to convert")
        
        # Generate audio (Indonesian with Wibowo voice)
        audio_base64 = generate_tts_audio(clean_text, lang='id')
        
        logger.info("TTS audio preview generated")
        return {"success": True, "audio_url": audio_base64}
    
    except Exception as e:
        logger.error(f"TTS preview generation failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{devotion_id}/generate-audio")
async def generate_audio(
    devotion_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Generate TTS audio for devotion"""
    
    devotion = await db.devotions.find_one({"id": devotion_id})
    if not devotion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Devotion not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') or current_user.get('church_id') != devotion.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    try:
        # Combine title and content for TTS
        full_text = f"{devotion.get('title')}. {devotion.get('content')}"
        
        # Strip HTML tags if content is HTML
        import re
        full_text = re.sub(r'<[^>]+>', '', full_text)
        
        # Generate audio (Indonesian)
        audio_base64 = generate_tts_audio(full_text, lang='id')
        
        # Update devotion
        await db.devotions.update_one(
            {"id": devotion_id},
            {"$set": {"tts_audio_url": audio_base64}}
        )
        
        logger.info(f"TTS audio generated for devotion: {devotion_id}")
        return {"success": True, "audio_url": audio_base64}
    
    except Exception as e:
        logger.error(f"TTS generation failed: {str(e)}")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/{devotion_id}/restore-version")
async def restore_version(
    devotion_id: str,
    version_index: int = Query(..., description="Index in version_history array"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    current_user: dict = Depends(require_admin)
):
    """Restore a previous version"""
    
    devotion = await db.devotions.find_one({"id": devotion_id})
    if not devotion:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Devotion not found")
    
    if current_user.get('role') != 'super_admin' and current_user.get('session_church_id') or current_user.get('church_id') != devotion.get('church_id'):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
    
    version_history = devotion.get('version_history', [])
    if version_index >= len(version_history):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Version not found")
    
    # Get version to restore
    version_to_restore = version_history[version_index]
    
    # Save current state as new history entry
    current_history = DevotionHistoryEntry(
        timestamp=datetime.now(timezone.utc),
        edited_by=current_user.get('id'),
        title=devotion.get('title'),
        content=devotion.get('content'),
        verses=devotion.get('verses', []),
        cover_image_url=devotion.get('cover_image_url')
    )
    
    # Restore from history
    await db.devotions.update_one(
        {"id": devotion_id},
        {
            "$set": {
                "title": version_to_restore['title'],
                "content": version_to_restore['content'],
                "verses": version_to_restore['verses'],
                "cover_image_url": version_to_restore.get('cover_image_url'),
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {"version_history": current_history.model_dump()}
        }
    )
    
    logger.info(f"Version restored for devotion: {devotion_id}")
    return {"success": True, "message": "Version restored successfully"}
