"""
File Serving Routes - SeaweedFS + Legacy Support

Provides file serving with:
- SeaweedFS URL redirection for new files
- Legacy local file serving for backward compatibility
- Access control with church_id validation
- Public vs private file access
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse, RedirectResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pathlib import Path
from typing import Optional
import os
import logging

from utils.dependencies import get_db, get_current_user, get_optional_user
from utils.dependencies import get_session_church_id
from services.seaweedfs_service import get_seaweedfs_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["Files"])

# Legacy upload directory for backward compatibility
LEGACY_UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/app/uploads'))

# Public modules (no auth required)
PUBLIC_MODULES = ["articles", "devotions", "explore"]


async def validate_file_access(
    church_id: str,
    module: str,
    current_user: Optional[dict],
    db: AsyncIOMotorDatabase
) -> bool:
    """
    Validate if user can access file from this church/module.

    Args:
        church_id: Church ID from URL path
        module: Module name (members, groups, articles, etc.)
        current_user: Current authenticated user (None for public)
        db: Database instance

    Returns:
        True if access allowed

    Raises:
        HTTPException if access denied
    """
    # Public modules don't require auth
    if module in PUBLIC_MODULES:
        return True

    # "global" church_id is for system-wide content (explore, etc.)
    if church_id == "global":
        return True

    # Private modules require auth
    if not current_user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error_code": "UNAUTHORIZED", "message": "Authentication required"}
        )

    # Validate user belongs to this church
    user_church_id = get_session_church_id(current_user)

    if user_church_id != church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error_code": "FORBIDDEN",
                "message": "Cannot access files from other churches"
            }
        )

    return True


@router.get("/{church_id}/{module}/{file_type}/{filename}")
async def serve_file(
    church_id: str,
    module: str,
    file_type: str,
    filename: str,
    download: bool = Query(False, description="Force download instead of inline"),
    current_user: Optional[dict] = Depends(get_optional_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Serve file - redirects to SeaweedFS or serves legacy local files.

    For new files stored in SeaweedFS:
    - Looks up file metadata in database
    - Redirects to SeaweedFS URL

    For legacy files stored locally:
    - Serves directly from disk if exists

    Args:
        church_id: Church ID
        module: Module name (members, groups, events, articles, etc.)
        file_type: File type (photos, covers, documents, etc.)
        filename: Filename
        download: Force download (Content-Disposition: attachment)
        current_user: Current user (optional for public files)
        db: Database instance

    Returns:
        RedirectResponse to SeaweedFS or FileResponse for legacy files
    """
    # Validate access
    await validate_file_access(church_id, module, current_user, db)

    # First, check if file exists in database (SeaweedFS)
    file_record = await db.file_metadata.find_one({
        "church_id": church_id,
        "module": module,
        "stored_filename": filename
    })

    if file_record and file_record.get("url"):
        # File is in SeaweedFS - redirect to it
        seaweedfs_url = file_record["url"]
        logger.info(f"Redirecting to SeaweedFS: {seaweedfs_url}")
        return RedirectResponse(url=seaweedfs_url, status_code=status.HTTP_302_FOUND)

    # Check legacy local storage
    file_path = LEGACY_UPLOAD_DIR / church_id / module / file_type / filename

    if file_path.exists() and file_path.is_file():
        # Serve legacy file from local disk
        logger.info(f"Serving legacy file: {file_path}")

        # Determine media type
        if filename.lower().endswith(('.jpg', '.jpeg')):
            media_type = 'image/jpeg'
        elif filename.lower().endswith('.png'):
            media_type = 'image/png'
        elif filename.lower().endswith('.gif'):
            media_type = 'image/gif'
        elif filename.lower().endswith('.webp'):
            media_type = 'image/webp'
        elif filename.lower().endswith('.pdf'):
            media_type = 'application/pdf'
        else:
            media_type = 'application/octet-stream'

        # Set headers
        headers = {
            "Cache-Control": "public, max-age=31536000, immutable",
            "ETag": f'"{filename}"'
        }

        if download:
            headers["Content-Disposition"] = f'attachment; filename="{filename}"'
        else:
            headers["Content-Disposition"] = f'inline; filename="{filename}"'

        return FileResponse(
            path=file_path,
            media_type=media_type,
            headers=headers
        )

    # File not found anywhere
    logger.warning(f"File not found: {church_id}/{module}/{file_type}/{filename}")
    raise HTTPException(
        status_code=status.HTTP_404_NOT_FOUND,
        detail={"error_code": "FILE_NOT_FOUND", "message": "File not found"}
    )


@router.delete("/{church_id}/{module}/{file_type}/{filename}")
async def delete_file(
    church_id: str,
    module: str,
    file_type: str,
    filename: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Delete file from SeaweedFS or legacy storage.

    Args:
        church_id: Church ID
        module: Module name
        file_type: File type
        filename: Filename
        current_user: Current user
        db: Database instance

    Returns:
        Success message
    """
    # Validate access
    await validate_file_access(church_id, module, current_user, db)

    # Check SeaweedFS first
    file_record = await db.file_metadata.find_one({
        "church_id": church_id,
        "module": module,
        "stored_filename": filename
    })

    deleted = False

    if file_record:
        # Delete from SeaweedFS
        fid = file_record.get("fid")
        if fid:
            try:
                seaweedfs = get_seaweedfs_service()
                await seaweedfs.delete_file(fid)
                logger.info(f"File deleted from SeaweedFS: {fid}")
            except Exception as e:
                logger.warning(f"Failed to delete from SeaweedFS: {e}")

        # Delete metadata
        await db.file_metadata.delete_one({"_id": file_record["_id"]})
        deleted = True

    # Also check and delete legacy file
    file_path = LEGACY_UPLOAD_DIR / church_id / module / file_type / filename
    if file_path.exists():
        file_path.unlink()
        logger.info(f"Legacy file deleted: {file_path}")
        deleted = True

        # Delete thumbnail if exists
        thumb_filename = filename.replace(".", "_thumb.")
        thumb_path = LEGACY_UPLOAD_DIR / church_id / module / file_type / thumb_filename
        if thumb_path.exists():
            thumb_path.unlink()

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "FILE_NOT_FOUND", "message": "File not found"}
        )

    logger.info(f"File deleted: {filename} by user {current_user.get('id')}")
    return {"message": "File deleted successfully"}


@router.get("/{church_id}/stats")
async def get_storage_stats(
    church_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get storage statistics for church.

    Includes both SeaweedFS and legacy local storage stats.

    Args:
        church_id: Church ID
        current_user: Current user
        db: Database instance

    Returns:
        Storage statistics
    """
    # Validate access
    user_church_id = get_session_church_id(current_user)
    if user_church_id != church_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error_code": "FORBIDDEN", "message": "Cannot access other church data"}
        )

    # Get SeaweedFS stats from database
    pipeline = [
        {"$match": {"church_id": church_id}},
        {"$group": {
            "_id": "$module",
            "count": {"$sum": 1},
            "total_size": {"$sum": "$file_size"}
        }}
    ]
    seaweedfs_stats = await db.file_metadata.aggregate(pipeline).to_list(None)

    # Also count file_uploads collection
    uploads_pipeline = [
        {"$match": {"church_id": church_id}},
        {"$group": {
            "_id": "$reference_type",
            "count": {"$sum": 1},
            "total_size": {"$sum": "$file_size"}
        }}
    ]
    uploads_stats = await db.file_uploads.aggregate(uploads_pipeline).to_list(None)

    # Calculate legacy local storage stats
    legacy_stats = {}
    church_dir = LEGACY_UPLOAD_DIR / church_id

    if church_dir.exists():
        for module_dir in church_dir.iterdir():
            if module_dir.is_dir():
                module_name = module_dir.name
                module_size = 0
                module_files = 0

                for file_path in module_dir.rglob('*'):
                    if file_path.is_file():
                        module_size += file_path.stat().st_size
                        module_files += 1

                legacy_stats[module_name] = {
                    "file_count": module_files,
                    "size_bytes": module_size,
                    "size_mb": round(module_size / (1024 * 1024), 2)
                }

    # Combine stats
    by_module = {}

    # Add SeaweedFS stats
    for stat in seaweedfs_stats + uploads_stats:
        module = stat["_id"] or "unknown"
        if module not in by_module:
            by_module[module] = {"file_count": 0, "size_bytes": 0, "storage": "seaweedfs"}
        by_module[module]["file_count"] += stat["count"]
        by_module[module]["size_bytes"] += stat.get("total_size", 0)

    # Add legacy stats
    for module, stats in legacy_stats.items():
        if module not in by_module:
            by_module[module] = {"file_count": 0, "size_bytes": 0, "storage": "legacy"}
        by_module[module]["file_count"] += stats["file_count"]
        by_module[module]["size_bytes"] += stats["size_bytes"]
        by_module[module]["storage"] = "mixed" if by_module[module]["storage"] == "seaweedfs" else "legacy"

    # Calculate totals
    total_files = sum(m.get("file_count", 0) for m in by_module.values())
    total_size = sum(m.get("size_bytes", 0) for m in by_module.values())

    # Add MB for each module
    for module in by_module:
        by_module[module]["size_mb"] = round(by_module[module]["size_bytes"] / (1024 * 1024), 2)

    return {
        "total_files": total_files,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "by_module": by_module,
        "primary_storage": "seaweedfs"
    }
