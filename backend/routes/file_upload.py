from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, status
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import List, Optional

from utils.dependencies import get_db, get_current_user
from utils.tenant_utils import get_current_church_id
from services import file_service
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["Files"])


@router.post("/upload", status_code=status.HTTP_201_CREATED)
async def upload_file(
    file: UploadFile = File(...),
    reference_type: str = None,
    reference_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Upload a file.
    
    - **file**: File to upload (max 10MB)
    - **reference_type**: Entity type (journal, asset, budget, etc.)
    - **reference_id**: Entity ID (optional, can be attached later)
    """
    church_id = get_current_church_id(current_user)
    user_id = current_user.get("id")
    
    if not reference_type:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error_code": "VALIDATION_ERROR", "message": "reference_type is required"}
        )
    
    file_record = await file_service.store_file(
        db=db,
        file=file,
        church_id=church_id,
        reference_type=reference_type,
        reference_id=reference_id,
        uploaded_by=user_id
    )
    
    # Remove storage_path from response (internal use only)
    file_record.pop("_id", None)
    file_record.pop("storage_path", None)
    
    return file_record


@router.get("/{file_id}")
async def get_file_metadata(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get file metadata.
    """
    church_id = get_current_church_id(current_user)
    
    file_record = await db.file_uploads.find_one({
        "id": file_id,
        "church_id": church_id
    }, {"_id": 0, "storage_path": 0})
    
    if not file_record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "File not found"}
        )
    
    return file_record


@router.get("/{file_id}/download")
async def download_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Download a file.
    """
    church_id = get_current_church_id(current_user)
    
    file_path = await file_service.get_file_path(db, file_id, church_id)
    
    if not file_path:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "File not found"}
        )
    
    # Get original filename
    file_record = await db.file_uploads.find_one({"id": file_id})
    original_filename = file_record.get("original_filename", "download")
    
    return FileResponse(
        path=file_path,
        filename=original_filename,
        media_type=file_record.get("mime_type", "application/octet-stream")
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_file(
    file_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete a file.
    """
    church_id = get_current_church_id(current_user)
    
    success = await file_service.delete_file(db, file_id, church_id)
    
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "NOT_FOUND", "message": "File not found"}
        )
    
    return None


@router.get("/by-reference/{reference_type}/{reference_id}")
async def list_files_by_reference(
    reference_type: str,
    reference_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    List all files for a specific entity.
    """
    church_id = get_current_church_id(current_user)
    
    files = await file_service.get_files_by_reference(
        db=db,
        church_id=church_id,
        reference_type=reference_type,
        reference_id=reference_id
    )
    
    # Remove internal fields
    for file_record in files:
        file_record.pop("_id", None)
        file_record.pop("storage_path", None)
    
    return files
