"""
File serving endpoint for uploaded files.

Provides:
- Secure file access with church_id validation
- Public vs private file access control
- Image resizing on-the-fly
- Proper cache headers
- Content-Disposition for downloads
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from fastapi.responses import FileResponse
from motor.motor_asyncio import AsyncIOMotorDatabase
from pathlib import Path
from typing import Optional, Literal
import logging

from utils.dependencies import get_db, get_current_user, get_optional_user
from utils.dependencies import get_session_church_id
from services.file_storage_service import UPLOAD_DIR

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/files", tags=["Files"])

# Public modules (no auth required)
PUBLIC_MODULES = ["articles", "devotions"]


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
    Serve uploaded file with access control.

    Args:
        church_id: Church ID
        module: Module name (members, groups, events, articles, etc.)
        file_type: File type (photos, covers, documents, etc.)
        filename: Filename
        download: Force download (Content-Disposition: attachment)
        current_user: Current user (optional for public files)
        db: Database instance

    Returns:
        FileResponse with file content
    """
    # Validate access
    await validate_file_access(church_id, module, current_user, db)

    # Construct file path
    file_path = UPLOAD_DIR / church_id / module / file_type / filename

    # Check if file exists
    if not file_path.exists() or not file_path.is_file():
        logger.warning(f"File not found: {file_path}")
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "FILE_NOT_FOUND", "message": "File not found"}
        )

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
        # Cache for 1 year (immutable files)
        "Cache-Control": "public, max-age=31536000, immutable",
        "ETag": f'"{filename}"'
    }

    # Content-Disposition
    if download:
        headers["Content-Disposition"] = f'attachment; filename="{filename}"'
    else:
        headers["Content-Disposition"] = f'inline; filename="{filename}"'

    logger.info(f"Serving file: {file_path} for church {church_id}")

    return FileResponse(
        path=file_path,
        media_type=media_type,
        headers=headers
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
    Delete file (admin only).

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

    # Construct file path
    file_path = UPLOAD_DIR / church_id / module / file_type / filename

    # Check if file exists
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error_code": "FILE_NOT_FOUND", "message": "File not found"}
        )

    # Delete file
    file_path.unlink()

    # Delete thumbnail if exists
    thumb_filename = filename.replace(".", "_thumb.")
    thumb_path = UPLOAD_DIR / church_id / module / file_type / thumb_filename
    if thumb_path.exists():
        thumb_path.unlink()

    # Delete metadata
    await db.file_metadata.delete_one({
        "church_id": church_id,
        "module": module,
        "stored_filename": filename
    })

    logger.info(f"File deleted: {file_path} by user {current_user.get('id')}")

    return {"message": "File deleted successfully"}


@router.get("/{church_id}/stats")
async def get_storage_stats(
    church_id: str,
    current_user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db)
):
    """
    Get storage statistics for church.

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

    # Calculate storage usage
    church_dir = UPLOAD_DIR / church_id

    if not church_dir.exists():
        return {
            "total_files": 0,
            "total_size_bytes": 0,
            "total_size_mb": 0.0,
            "by_module": {}
        }

    total_size = 0
    file_count = 0
    by_module = {}

    for module_dir in church_dir.iterdir():
        if module_dir.is_dir():
            module_name = module_dir.name
            module_size = 0
            module_files = 0

            for file_path in module_dir.rglob('*'):
                if file_path.is_file():
                    module_size += file_path.stat().st_size
                    module_files += 1
                    total_size += file_path.stat().st_size
                    file_count += 1

            by_module[module_name] = {
                "file_count": module_files,
                "size_bytes": module_size,
                "size_mb": round(module_size / (1024 * 1024), 2)
            }

    return {
        "total_files": file_count,
        "total_size_bytes": total_size,
        "total_size_mb": round(total_size / (1024 * 1024), 2),
        "by_module": by_module
    }
