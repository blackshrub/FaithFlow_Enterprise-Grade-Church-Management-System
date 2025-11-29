"""
DEPRECATED: Local file storage service.

This module is DEPRECATED. New code should use SeaweedFS via services.seaweedfs_service.

This file is kept for:
1. Backward compatibility with existing migration scripts
2. Utility functions (optimize_image, generate_thumbnail) used by other code

For file storage, use:
    from services.seaweedfs_service import get_seaweedfs_service, StorageCategory

Features (now in SeaweedFS):
- Church-based folder organization by module
- Automatic image optimization and thumbnail generation
- File type validation and size limits
- Multi-tenant security
- Distributed storage with replication
"""

from fastapi import UploadFile, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from pathlib import Path
from typing import Optional, Dict, Any, Literal, Tuple
from PIL import Image
from io import BytesIO
import uuid
import os
import aiofiles
import logging
from datetime import datetime
import mimetypes

logger = logging.getLogger(__name__)

# Base upload directory
UPLOAD_DIR = Path(os.environ.get('UPLOAD_DIR', '/app/uploads'))

# Module-specific subdirectories
MODULE_PATHS = {
    "members": {
        "photos": "members/photos",
        "documents": "members/documents",
        "qrcodes": "members/qrcodes"
    },
    "groups": {
        "covers": "groups/covers"
    },
    "events": {
        "covers": "events/covers"
    },
    "articles": {
        "images": "articles/images"
    },
    "devotions": {
        "covers": "devotions/covers"
    },
    "gallery": {
        "photos": "gallery/photos"
    },
    "documents": {
        "general": "documents/general"
    }
}

# File size limits (bytes)
SIZE_LIMITS = {
    "photo": 2 * 1024 * 1024,      # 2MB for profile photos
    "cover": 5 * 1024 * 1024,      # 5MB for cover images
    "document": 10 * 1024 * 1024,  # 10MB for documents
    "qrcode": 100 * 1024,          # 100KB for QR codes
}

# Allowed MIME types
ALLOWED_IMAGE_TYPES = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp'
]

ALLOWED_DOCUMENT_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv'
]

# Image optimization settings
IMAGE_QUALITY = 85
MAX_IMAGE_WIDTH = 1920
MAX_IMAGE_HEIGHT = 1080

# Thumbnail sizes
THUMBNAIL_SIZES = {
    "small": (150, 150),
    "medium": (300, 300),
    "large": (800, 800)
}


def get_storage_path(
    church_id: str,
    module: str,
    file_type: str
) -> Path:
    """
    Get storage path for a file based on module and type.

    Args:
        church_id: Church ID
        module: Module name (members, groups, events, etc.)
        file_type: File type (photos, covers, documents, etc.)

    Returns:
        Path object for storage
    """
    if module not in MODULE_PATHS:
        raise ValueError(f"Invalid module: {module}")

    if file_type not in MODULE_PATHS[module]:
        raise ValueError(f"Invalid file type '{file_type}' for module '{module}'")

    subpath = MODULE_PATHS[module][file_type]
    return UPLOAD_DIR / church_id / subpath


def validate_file_type(
    file: UploadFile,
    allowed_types: list[str]
) -> None:
    """
    Validate file MIME type.

    Args:
        file: Uploaded file
        allowed_types: List of allowed MIME types

    Raises:
        HTTPException if invalid type
    """
    content_type = file.content_type

    if content_type not in allowed_types:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "INVALID_FILE_TYPE",
                "message": f"File type {content_type} is not allowed. Allowed types: {', '.join(allowed_types)}"
            }
        )


def validate_file_size(
    content: bytes,
    file_type: str
) -> None:
    """
    Validate file size against limits.

    Args:
        content: File content bytes
        file_type: Type of file (photo, cover, document)

    Raises:
        HTTPException if size exceeded
    """
    file_size = len(content)
    max_size = SIZE_LIMITS.get(file_type, SIZE_LIMITS["document"])

    if file_size > max_size:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "FILE_SIZE_EXCEEDED",
                "message": f"File size {file_size} bytes exceeds maximum of {max_size} bytes"
            }
        )


def optimize_image(
    content: bytes,
    max_width: int = MAX_IMAGE_WIDTH,
    max_height: int = MAX_IMAGE_HEIGHT,
    quality: int = IMAGE_QUALITY
) -> Tuple[bytes, int, int]:
    """
    Optimize image: resize, compress, strip EXIF.

    Args:
        content: Original image bytes
        max_width: Maximum width
        max_height: Maximum height
        quality: JPEG quality (1-100)

    Returns:
        Tuple of (optimized_bytes, width, height)
    """
    try:
        image = Image.open(BytesIO(content))

        # Convert RGBA to RGB (for PNG with transparency)
        if image.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background

        # Get original dimensions
        orig_width, orig_height = image.size

        # Resize if needed
        if orig_width > max_width or orig_height > max_height:
            image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

        # Save optimized
        output = BytesIO()
        image.save(
            output,
            format='JPEG',
            quality=quality,
            optimize=True,
            progressive=True
        )

        optimized_bytes = output.getvalue()
        width, height = image.size

        logger.info(f"Image optimized: {orig_width}x{orig_height} → {width}x{height}, "
                   f"{len(content)} → {len(optimized_bytes)} bytes "
                   f"({(1 - len(optimized_bytes)/len(content))*100:.1f}% reduction)")

        return optimized_bytes, width, height

    except Exception as e:
        logger.error(f"Image optimization failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error_code": "IMAGE_PROCESSING_ERROR",
                "message": "Failed to process image. Ensure it's a valid image file."
            }
        )


def generate_thumbnail(
    content: bytes,
    size: Tuple[int, int] = THUMBNAIL_SIZES["medium"]
) -> bytes:
    """
    Generate square thumbnail.

    Args:
        content: Original image bytes
        size: Thumbnail size (width, height)

    Returns:
        Thumbnail bytes
    """
    try:
        image = Image.open(BytesIO(content))

        # Convert to RGB
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Create square thumbnail (crop to center)
        width, height = image.size
        min_dimension = min(width, height)

        left = (width - min_dimension) / 2
        top = (height - min_dimension) / 2
        right = (width + min_dimension) / 2
        bottom = (height + min_dimension) / 2

        image = image.crop((left, top, right, bottom))
        image.thumbnail(size, Image.Resampling.LANCZOS)

        # Save thumbnail
        output = BytesIO()
        image.save(output, format='JPEG', quality=IMAGE_QUALITY, optimize=True)

        return output.getvalue()

    except Exception as e:
        logger.error(f"Thumbnail generation failed: {e}")
        return None


async def store_image(
    db: AsyncIOMotorDatabase,
    file: UploadFile,
    church_id: str,
    module: str,
    file_type: str,
    reference_id: str,
    uploaded_by: str,
    generate_thumbnails: bool = True
) -> Dict[str, Any]:
    """
    Store image with optimization and thumbnail generation.

    Args:
        db: Database instance
        file: Uploaded file
        church_id: Church ID
        module: Module name (members, groups, events, articles)
        file_type: File type (photos, covers, images)
        reference_id: ID of related entity
        uploaded_by: User ID
        generate_thumbnails: Whether to generate thumbnails

    Returns:
        File metadata record
    """
    # Validate file type
    validate_file_type(file, ALLOWED_IMAGE_TYPES)

    # Read file content
    content = await file.read()

    # Determine size limit based on file type
    size_type = "photo" if "photo" in file_type else "cover"
    validate_file_size(content, size_type)

    # Optimize image
    optimized_content, width, height = optimize_image(content)

    # Generate filename
    file_ext = Path(file.filename).suffix or '.jpg'
    stored_filename = f"{reference_id}_{file_type}{file_ext}"

    # Get storage path
    storage_dir = get_storage_path(church_id, module, file_type)
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Save optimized image
    file_path = storage_dir / stored_filename
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(optimized_content)

    # Generate URL
    url = f"/api/files/{church_id}/{MODULE_PATHS[module][file_type]}/{stored_filename}"

    # Generate thumbnail
    thumbnail_path = None
    thumbnail_url = None

    if generate_thumbnails:
        thumbnail_content = generate_thumbnail(optimized_content)
        if thumbnail_content:
            thumb_filename = f"{reference_id}_{file_type}_thumb{file_ext}"
            thumbnail_path = storage_dir / thumb_filename

            async with aiofiles.open(thumbnail_path, 'wb') as f:
                await f.write(thumbnail_content)

            thumbnail_url = f"/api/files/{church_id}/{MODULE_PATHS[module][file_type]}/{thumb_filename}"

    # Create metadata record
    file_record = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "module": module,
        "type": file_type,
        "reference_id": reference_id,
        "original_filename": file.filename,
        "stored_filename": stored_filename,
        "storage_path": str(file_path),
        "url": url,
        "thumbnail_path": str(thumbnail_path) if thumbnail_path else None,
        "thumbnail_url": thumbnail_url,
        "mime_type": "image/jpeg",  # Always JPEG after optimization
        "file_size": len(optimized_content),
        "width": width,
        "height": height,
        "uploaded_by": uploaded_by,
        "uploaded_at": datetime.utcnow(),
        "metadata": {
            "optimized": True,
            "original_size": len(content),
            "compression_ratio": round(len(optimized_content) / len(content), 2)
        }
    }

    # Save to database
    await db.file_metadata.insert_one(file_record)

    logger.info(f"Image stored: {stored_filename} for {module}/{reference_id} in church {church_id}")

    # Remove MongoDB _id
    file_record.pop("_id", None)
    return file_record


async def store_document(
    db: AsyncIOMotorDatabase,
    file: UploadFile,
    church_id: str,
    module: str,
    file_type: str,
    reference_id: str,
    uploaded_by: str
) -> Dict[str, Any]:
    """
    Store document file (PDF, DOCX, etc.).

    Args:
        db: Database instance
        file: Uploaded file
        church_id: Church ID
        module: Module name
        file_type: File type (documents)
        reference_id: ID of related entity
        uploaded_by: User ID

    Returns:
        File metadata record
    """
    # Validate file type
    validate_file_type(file, ALLOWED_DOCUMENT_TYPES)

    # Read file content
    content = await file.read()
    validate_file_size(content, "document")

    # Generate unique filename
    file_ext = Path(file.filename).suffix
    stored_filename = f"{reference_id}_{uuid.uuid4().hex[:8]}{file_ext}"

    # Get storage path
    storage_dir = get_storage_path(church_id, module, file_type)
    storage_dir.mkdir(parents=True, exist_ok=True)

    # Save file
    file_path = storage_dir / stored_filename
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(content)

    # Generate URL
    url = f"/api/files/{church_id}/{MODULE_PATHS[module][file_type]}/{stored_filename}"

    # Create metadata record
    file_record = {
        "id": str(uuid.uuid4()),
        "church_id": church_id,
        "module": module,
        "type": file_type,
        "reference_id": reference_id,
        "original_filename": file.filename,
        "stored_filename": stored_filename,
        "storage_path": str(file_path),
        "url": url,
        "thumbnail_path": None,
        "thumbnail_url": None,
        "mime_type": file.content_type,
        "file_size": len(content),
        "width": None,
        "height": None,
        "uploaded_by": uploaded_by,
        "uploaded_at": datetime.utcnow(),
        "metadata": {}
    }

    # Save to database
    await db.file_metadata.insert_one(file_record)

    logger.info(f"Document stored: {stored_filename} for {module}/{reference_id} in church {church_id}")

    file_record.pop("_id", None)
    return file_record


async def get_file_metadata(
    db: AsyncIOMotorDatabase,
    file_id: str,
    church_id: str
) -> Optional[Dict[str, Any]]:
    """
    Get file metadata with church validation.

    Args:
        db: Database instance
        file_id: File ID
        church_id: Church ID for validation

    Returns:
        File metadata or None
    """
    file_record = await db.file_metadata.find_one(
        {"id": file_id, "church_id": church_id},
        {"_id": 0}
    )

    return file_record


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
        True if deleted successfully
    """
    file_record = await db.file_metadata.find_one({
        "id": file_id,
        "church_id": church_id
    })

    if not file_record:
        return False

    # Delete main file
    file_path = Path(file_record["storage_path"])
    if file_path.exists():
        file_path.unlink()
        logger.info(f"File deleted: {file_path}")

    # Delete thumbnail if exists
    if file_record.get("thumbnail_path"):
        thumb_path = Path(file_record["thumbnail_path"])
        if thumb_path.exists():
            thumb_path.unlink()
            logger.info(f"Thumbnail deleted: {thumb_path}")

    # Delete metadata
    await db.file_metadata.delete_one({"id": file_id})

    return True


async def get_files_by_reference(
    db: AsyncIOMotorDatabase,
    church_id: str,
    module: str,
    reference_id: str
) -> list[Dict[str, Any]]:
    """
    Get all files for a specific entity.

    Args:
        db: Database instance
        church_id: Church ID
        module: Module name
        reference_id: Entity ID

    Returns:
        List of file metadata
    """
    cursor = db.file_metadata.find(
        {
            "church_id": church_id,
            "module": module,
            "reference_id": reference_id
        },
        {"_id": 0}
    ).sort("uploaded_at", -1)

    return await cursor.to_list(length=None)
