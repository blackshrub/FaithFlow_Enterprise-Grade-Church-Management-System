"""
Face Recognition API Routes

Provides endpoints for:
- Generating face embeddings from member photos
- Matching faces against the member database
- Regenerating all face descriptors (migration)
- Kiosk check-in with face verification
"""

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import logging
import asyncio

from utils.dependencies import get_db, get_current_user, require_admin
from utils.tenant_utils import get_session_church_id_from_user
from services.face_recognition import face_recognition_service, FACE_MATCH_THRESHOLDS

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/face-recognition", tags=["Face Recognition"])
public_router = APIRouter(prefix="/public/face-recognition", tags=["Face Recognition (Public)"])


# ============================================================================
# Request/Response Models
# ============================================================================

class GenerateEmbeddingRequest(BaseModel):
    """Request to generate face embedding from an image."""
    image_source: str = Field(..., description="Image URL, file path, or base64 string")
    member_id: Optional[str] = Field(None, description="If provided, save embedding to member")


class GenerateEmbeddingResponse(BaseModel):
    """Response from embedding generation."""
    success: bool
    embedding: Optional[List[float]] = None
    face_confidence: Optional[float] = None
    facial_area: Optional[Dict[str, int]] = None
    model: Optional[str] = None
    error: Optional[str] = None


class MatchFaceRequest(BaseModel):
    """Request to match a face against the database."""
    image_source: str = Field(..., description="Image URL or base64 string from camera")
    church_id: Optional[str] = Field(None, description="Church ID (for public endpoint)")


class MatchFaceResponse(BaseModel):
    """Response from face matching."""
    found: bool
    member_id: Optional[str] = None
    member_name: Optional[str] = None
    distance: Optional[float] = None
    confidence: Optional[str] = None  # "high" | "low"
    photo_url: Optional[str] = None
    thresholds: Dict[str, float] = Field(default_factory=dict)


class RegenerateRequest(BaseModel):
    """Request to regenerate face descriptors."""
    member_ids: Optional[List[str]] = Field(None, description="Specific members, or all if not provided")
    clear_existing: bool = Field(True, description="Clear existing descriptors before regenerating")


class RegenerateResponse(BaseModel):
    """Response from regeneration."""
    total: int
    processed: int
    succeeded: int
    failed: int
    errors: List[Dict[str, str]] = Field(default_factory=list)


class BulkUpdateRequest(BaseModel):
    """Request to bulk update face descriptors."""
    updates: List[Dict[str, Any]] = Field(..., description="List of {member_id, embedding}")


# ============================================================================
# Admin Endpoints (Authenticated)
# ============================================================================

@router.post("/generate-embedding", response_model=GenerateEmbeddingResponse)
async def generate_embedding(
    request: GenerateEmbeddingRequest,
    db=Depends(get_db),
    current_user=Depends(require_admin)
):
    """
    Generate face embedding from an image.

    If member_id is provided, saves the embedding to the member's record.
    Uses DeepFace with FaceNet512 model for high accuracy.
    """
    try:
        result = await face_recognition_service.get_embedding(
            request.image_source,
            enforce_detection=True
        )

        if not result:
            return GenerateEmbeddingResponse(
                success=False,
                error="No face detected in image"
            )

        # Save to member if requested
        if request.member_id:
            church_id = get_session_church_id_from_user(current_user)
            await db.members.update_one(
                {"_id": request.member_id, "church_id": church_id},
                {
                    "$set": {
                        "face_descriptors": [{
                            "descriptor": result['embedding'],
                            "model": result['model'],
                            "confidence": result['face_confidence']
                        }]
                    }
                }
            )

        return GenerateEmbeddingResponse(
            success=True,
            embedding=result['embedding'],
            face_confidence=result['face_confidence'],
            facial_area=result['facial_area'],
            model=result['model']
        )

    except Exception as e:
        logger.error(f"[FaceRecognition] Generate embedding error: {e}")
        return GenerateEmbeddingResponse(
            success=False,
            error=str(e)
        )


@router.post("/match", response_model=MatchFaceResponse)
async def match_face(
    request: MatchFaceRequest,
    db=Depends(get_db),
    current_user=Depends(get_current_user)
):
    """
    Match a face against members in the database.

    Returns the best matching member if found within threshold.
    """
    church_id = get_session_church_id_from_user(current_user)

    try:
        # Get query embedding
        result = await face_recognition_service.get_embedding(
            request.image_source,
            enforce_detection=False
        )

        if not result:
            return MatchFaceResponse(
                found=False,
                thresholds=FACE_MATCH_THRESHOLDS
            )

        # Get all members with face descriptors
        members_cursor = db.members.find(
            {
                "church_id": church_id,
                "face_descriptors.0": {"$exists": True}
            },
            {
                "_id": 1,
                "id": 1,  # Custom UUID field used by kiosk endpoints
                "full_name": 1,
                "face_descriptors": 1,
                "photo_url": 1,
                "photo_thumbnail_url": 1
            }
        )

        member_embeddings = []
        async for member in members_cursor:
            if member.get('face_descriptors'):
                # Use the first (primary) descriptor
                desc = member['face_descriptors'][0]
                embedding = desc.get('descriptor', [])

                if embedding:
                    # Use custom 'id' field if available, fallback to _id for legacy data
                    member_id = member.get('id') or str(member['_id'])
                    member_embeddings.append({
                        "member_id": member_id,
                        "member_name": member.get('full_name', 'Unknown'),
                        "embedding": embedding,
                        "photo_url": member.get('photo_thumbnail_url') or member.get('photo_url')
                    })

        # Find best match
        match = await face_recognition_service.find_match(
            result['embedding'],
            member_embeddings
        )

        if match:
            return MatchFaceResponse(
                found=True,
                member_id=match['member_id'],
                member_name=match['member_name'],
                distance=match['distance'],
                confidence=match['confidence'],
                photo_url=match['photo_url'],
                thresholds=FACE_MATCH_THRESHOLDS
            )
        else:
            return MatchFaceResponse(
                found=False,
                thresholds=FACE_MATCH_THRESHOLDS
            )

    except Exception as e:
        logger.error(f"[FaceRecognition] Match error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/regenerate", response_model=RegenerateResponse)
async def regenerate_descriptors(
    request: RegenerateRequest,
    background_tasks: BackgroundTasks,
    db=Depends(get_db),
    current_user=Depends(require_admin)
):
    """
    Regenerate face descriptors for members using DeepFace.

    This is a long-running operation that processes in the background.
    Returns immediately with the count of members to process.
    """
    church_id = get_session_church_id_from_user(current_user)

    # Build query
    query = {"church_id": church_id}
    if request.member_ids:
        query["_id"] = {"$in": request.member_ids}

    # Only process members with photos
    query["$or"] = [
        {"photo_url": {"$exists": True, "$ne": "", "$ne": None}},
        {"photo_base64": {"$exists": True, "$ne": "", "$ne": None}}
    ]

    # Get members
    members = await db.members.find(
        query,
        {"_id": 1, "full_name": 1, "photo_url": 1, "photo_base64": 1}
    ).to_list(length=None)

    total = len(members)

    if total == 0:
        return RegenerateResponse(total=0, processed=0, succeeded=0, failed=0)

    # Clear existing if requested
    if request.clear_existing:
        if request.member_ids:
            await db.members.update_many(
                {"_id": {"$in": request.member_ids}, "church_id": church_id},
                {"$set": {"face_descriptors": []}}
            )
        else:
            await db.members.update_many(
                {"church_id": church_id},
                {"$set": {"face_descriptors": []}}
            )

    # Process in background
    async def process_members():
        succeeded = 0
        failed = 0
        errors = []

        for member in members:
            member_id = str(member['_id'])
            photo_url = member.get('photo_url') or member.get('photo_base64')

            if not photo_url:
                continue

            try:
                result = await face_recognition_service.get_embedding(
                    photo_url,
                    enforce_detection=False
                )

                if result:
                    await db.members.update_one(
                        {"_id": member['_id']},
                        {
                            "$set": {
                                "face_descriptors": [{
                                    "descriptor": result['embedding'],
                                    "model": result['model'],
                                    "confidence": result['face_confidence']
                                }]
                            }
                        }
                    )
                    succeeded += 1
                else:
                    failed += 1
                    errors.append({
                        "member_id": member_id,
                        "name": member.get('full_name', 'Unknown'),
                        "error": "No face detected"
                    })

            except Exception as e:
                failed += 1
                errors.append({
                    "member_id": member_id,
                    "name": member.get('full_name', 'Unknown'),
                    "error": str(e)
                })

        logger.info(
            f"[FaceRecognition] Regeneration complete: "
            f"{succeeded} succeeded, {failed} failed out of {total}"
        )

    background_tasks.add_task(process_members)

    return RegenerateResponse(
        total=total,
        processed=total,
        succeeded=0,  # Will be updated by background task
        failed=0
    )


@router.post("/bulk-update")
async def bulk_update_descriptors(
    request: BulkUpdateRequest,
    db=Depends(get_db),
    current_user=Depends(require_admin)
):
    """
    Bulk update face descriptors for multiple members.

    Used by frontend after generating embeddings client-side.
    """
    church_id = get_session_church_id_from_user(current_user)
    updated = 0
    errors = []

    for update in request.updates:
        member_id = update.get('member_id')
        embedding = update.get('embedding')

        if not member_id or not embedding:
            continue

        try:
            result = await db.members.update_one(
                {"_id": member_id, "church_id": church_id},
                {
                    "$set": {
                        "face_descriptors": [{
                            "descriptor": embedding,
                            "model": "FaceNet512",
                            "source": "backend"
                        }]
                    }
                }
            )
            if result.modified_count > 0:
                updated += 1
        except Exception as e:
            errors.append({"member_id": member_id, "error": str(e)})

    return {"updated": updated, "errors": errors}


# ============================================================================
# Public Endpoints (For Kiosk)
# ============================================================================

@public_router.post("/match", response_model=MatchFaceResponse)
async def public_match_face(
    request: MatchFaceRequest,
    db=Depends(get_db)
):
    """
    Match a face against members - public endpoint for kiosk.

    Requires church_id in the request.
    """
    if not request.church_id:
        raise HTTPException(status_code=400, detail="church_id is required")

    try:
        # Get query embedding
        result = await face_recognition_service.get_embedding(
            request.image_source,
            enforce_detection=False
        )

        if not result:
            return MatchFaceResponse(
                found=False,
                thresholds=FACE_MATCH_THRESHOLDS
            )

        # Get all members with face descriptors for this church
        members_cursor = db.members.find(
            {
                "church_id": request.church_id,
                "face_descriptors.0": {"$exists": True}
            },
            {
                "_id": 1,
                "id": 1,  # Custom UUID field used by kiosk endpoints
                "full_name": 1,
                "face_descriptors": 1,
                "photo_url": 1,
                "photo_thumbnail_url": 1
            }
        )

        member_embeddings = []
        async for member in members_cursor:
            if member.get('face_descriptors'):
                desc = member['face_descriptors'][0]
                embedding = desc.get('descriptor', [])

                if embedding:
                    # Use custom 'id' field if available, fallback to _id for legacy data
                    member_id = member.get('id') or str(member['_id'])
                    member_embeddings.append({
                        "member_id": member_id,
                        "member_name": member.get('full_name', 'Unknown'),
                        "embedding": embedding,
                        "photo_url": member.get('photo_thumbnail_url') or member.get('photo_url')
                    })

        # Find best match
        match = await face_recognition_service.find_match(
            result['embedding'],
            member_embeddings
        )

        if match:
            return MatchFaceResponse(
                found=True,
                member_id=match['member_id'],
                member_name=match['member_name'],
                distance=match['distance'],
                confidence=match['confidence'],
                photo_url=match['photo_url'],
                thresholds=FACE_MATCH_THRESHOLDS
            )
        else:
            return MatchFaceResponse(
                found=False,
                thresholds=FACE_MATCH_THRESHOLDS
            )

    except Exception as e:
        logger.error(f"[FaceRecognition] Public match error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@public_router.get("/thresholds")
async def get_thresholds():
    """Get face matching thresholds for client-side display."""
    return FACE_MATCH_THRESHOLDS
