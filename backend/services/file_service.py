"""
File Service - SeaweedFS Storage

Handles file uploads, storage, and retrieval using SeaweedFS distributed storage.
Migrated from local disk storage to SeaweedFS for scalability and reliability.
"""

from fastapi import UploadFile, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional, List, Dict, Any
import uuid
import logging
from datetime import datetime

from services.seaweedfs_service import (
    get_seaweedfs_service,
    SeaweedFSError,
    StorageCategory
)

logger = logging.getLogger(__name__)

MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB

ALLOWED_MIME_TYPES = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
]

# Map reference_type to StorageCategory
REFERENCE_TYPE_TO_CATEGORY = {
    "journal": StorageCategory.GENERAL,
    "asset": StorageCategory.GENERAL,
    "budget": StorageCategory.GENERAL,
    "member": StorageCategory.MEMBER_DOCUMENT,
    "article": StorageCategory.ARTICLE_IMAGE,
    "event": StorageCategory.EVENT_COVER,
    "group": StorageCategory.GROUP_COVER,
    "community": StorageCategory.COMMUNITY_COVER,
    "devotion": StorageCategory.DEVOTION_COVER,
}


def _get_storage_category(reference_type: str, mime_type: str) -> StorageCategory:
    """Get storage category based on reference type and mime type."""
    # Check if we have a specific mapping
    if reference_type in REFERENCE_TYPE_TO_CATEGORY:
        return REFERENCE_TYPE_TO_CATEGORY[reference_type]

    # Default to GENERAL
    return StorageCategory.GENERAL


async def store_file(
    db: AsyncIOMotorDatabase,
    file: UploadFile,
    church_id: str,
    reference_type: str,
    reference_id: Optional[str],
    uploaded_by: str
) -> Dict[str, Any]:
    """
    Store uploaded file to SeaweedFS and create database record.

    Args:
        db: Database instance
        file: Uploaded file
        church_id: Church ID
        reference_type: Type of entity (journal, asset, budget, etc.)
        reference_id: Entity ID
        uploaded_by: User ID

    Returns:
        File upload record with SeaweedFS URL
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

    # Generate file ID
    file_id = str(uuid.uuid4())
    entity_id = reference_id or file_id

    # Determine storage category
    category = _get_storage_category(reference_type, content_type)

    try:
        # Upload to SeaweedFS
        seaweedfs = get_seaweedfs_service()
        result = await seaweedfs.upload_by_category(
            content=content,
            file_name=file.filename or f"file_{file_id}",
            mime_type=content_type,
            church_id=church_id,
            category=category,
            entity_id=entity_id
        )

        # Create database record
        file_record = {
            "id": file_id,
            "church_id": church_id,
            "original_filename": file.filename,
            "mime_type": content_type,
            "file_size": file_size,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "uploaded_by": uploaded_by,
            "uploaded_at": datetime.utcnow(),
            # SeaweedFS specific fields
            "storage_type": "seaweedfs",
            "url": result["url"],
            "thumbnail_url": result.get("thumbnail_url"),
            "fid": result.get("fid"),
            "path": result.get("path"),
        }

        await db.file_uploads.insert_one(file_record)
        logger.info(f"File stored in SeaweedFS: {result['url']} for church {church_id}")

        return file_record

    except SeaweedFSError as e:
        logger.error(f"SeaweedFS upload failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={
                "error_code": "UPLOAD_FAILED",
                "message": f"Failed to upload file: {str(e)}"
            }
        )


async def get_file_url(
    db: AsyncIOMotorDatabase,
    file_id: str,
    church_id: str
) -> Optional[str]:
    """
    Get file URL with church_id validation.

    Args:
        db: Database instance
        file_id: File ID
        church_id: Church ID for validation

    Returns:
        File URL if exists and authorized
    """
    file_record = await db.file_uploads.find_one({
        "id": file_id,
        "church_id": church_id
    })

    if not file_record:
        return None

    return file_record.get("url")


async def get_file_path(
    db: AsyncIOMotorDatabase,
    file_id: str,
    church_id: str
) -> Optional[str]:
    """
    Get file URL (for backward compatibility with old API).
    Now returns URL instead of local path.

    Args:
        db: Database instance
        file_id: File ID
        church_id: Church ID for validation

    Returns:
        File URL if exists and authorized
    """
    return await get_file_url(db, file_id, church_id)


async def delete_file(
    db: AsyncIOMotorDatabase,
    file_id: str,
    church_id: str
) -> bool:
    """
    Delete file from SeaweedFS and database.

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

    # Delete from SeaweedFS if it has fid
    fid = file_record.get("fid")
    if fid:
        try:
            seaweedfs = get_seaweedfs_service()
            await seaweedfs.delete_file(fid)
            logger.info(f"File deleted from SeaweedFS: {fid}")
        except SeaweedFSError as e:
            logger.warning(f"Failed to delete from SeaweedFS (continuing anyway): {e}")

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
        List of file records with URLs
    """
    cursor = db.file_uploads.find({
        "church_id": church_id,
        "reference_type": reference_type,
        "reference_id": reference_id
    }).sort("uploaded_at", -1)

    return await cursor.to_list(length=None)
