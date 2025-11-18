from fastapi import UploadFile, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pathlib import Path
from typing import Optional, List, Dict, Any
import uuid
import os
import aiofiles
import logging

logger = logging.getLogger(__name__)

UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/app/uploads'))
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
]


async def store_file(
    db: AsyncIOMotorDatabase,
    file: UploadFile,
    church_id: str,
    reference_type: str,
    reference_id: Optional[str],
    uploaded_by: str
) -> Dict[str, Any]:
    """
    Store uploaded file and create database record.
    
    Args:
        db: Database instance
        file: Uploaded file
        church_id: Church ID
        reference_type: Type of entity
        reference_id: Entity ID
        uploaded_by: User ID
    
    Returns:
        File upload record
    """
    # Validate file type
    content_type = file.content_type
    if content_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_FILE_TYPE",
                "message": f"File type {content_type} is not allowed"
            }
        )
    
    # Read file content
    content = await file.read()
    file_size = len(content)
    
    # Validate file size
    if file_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "FILE_SIZE_EXCEEDED",
                "message": f"File size exceeds maximum of {MAX_FILE_SIZE} bytes"
            }
        )
    
    # Generate unique filename
    file_ext = Path(file.filename).suffix
    stored_filename = f"{church_id}_{uuid.uuid4().hex}{file_ext}"
    
    # Create church directory if not exists
    church_dir = UPLOAD_DIR / church_id
    church_dir.mkdir(parents=True, exist_ok=True)
    
    # Save file
    file_path = church_dir / stored_filename
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)
    
    # Create database record
    from datetime import datetime
    file_record = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "original_filename": file.filename,
        "stored_filename": stored_filename,
        "mime_type": content_type,
        "storage_path": str(file_path),
        "file_size": file_size,
        "reference_type": reference_type,
        "reference_id": reference_id,
        "uploaded_by": uploaded_by,
        "uploaded_at": datetime.utcnow()
    }
    
    await db.file_uploads.insert_one(file_record)
    logger.info(f"File stored: {stored_filename} for church {church_id}")
    
    return file_record


async def get_file_path(
    db: AsyncIOMotorDatabase,
    file_id: str,
    church_id: str
) -> Optional[Path]:
    """
    Get file path with church_id validation.
    
    Args:
        db: Database instance
        file_id: File ID
        church_id: Church ID for validation
    
    Returns:
        File path if exists and authorized
    """
    file_record = await db.file_uploads.find_one({
        "id": file_id,
        "church_id": church_id
    })
    
    if not file_record:
        return None
    
    file_path = Path(file_record["storage_path"])
    
    if not file_path.exists():
        logger.error(f"File not found: {file_path}")
        return None
    
    return file_path


async def delete_file(
    db: AsyncIOMotorDatabase,
    file_id: str,
    church_id: str
) -> bool:
    """
    Delete file from disk and database.
    
    Args:
        db: Database instance
        file_id: File ID
        church_id: Church ID for validation
    
    Returns:
        True if deleted, False otherwise
    """
    file_record = await db.file_uploads.find_one({
        "id": file_id,
        "church_id": church_id
    })
    
    if not file_record:
        return False
    
    # Delete from disk
    file_path = Path(file_record["storage_path"])
    if file_path.exists():
        file_path.unlink()
        logger.info(f"File deleted from disk: {file_path}")
    
    # Delete from database
    await db.file_uploads.delete_one({"id": file_id})
    logger.info(f"File record deleted: {file_id}")
    
    return True


async def get_files_by_reference(
    db: AsyncIOMotorDatabase,
    church_id: str,
    reference_type: str,
    reference_id: str
) -> List[Dict[str, Any]]:
    """
    Get all files for a specific entity.
    
    Args:
        db: Database instance
        church_id: Church ID
        reference_type: Type of entity
        reference_id: Entity ID
    
    Returns:
        List of file records
    """
    cursor = db.file_uploads.find({
        "church_id": church_id,
        "reference_type": reference_type,
        "reference_id": reference_id
    }).sort("uploaded_at", -1)
    
    return await cursor.to_list(length=None)
