"""
SeaweedFS Service for FaithFlow Media Storage.

SeaweedFS is a distributed file storage system used for storing ALL media:
- Member photos and documents
- Group and community cover images
- Article featured images
- Devotion covers
- Event covers
- AI-generated images
- Community messages media

Features:
- Category-based storage with organized paths
- Upload files with automatic file ID generation
- Download files by file ID
- Delete files
- Generate thumbnails for images
- Get file metadata
- URL generation for file access
- Base64 to file conversion

Configuration:
- SEAWEEDFS_MASTER_URL: Master server URL (default: http://localhost:9333)
- SEAWEEDFS_VOLUME_URL: Volume server URL (default: http://localhost:8080)
- SEAWEEDFS_FILER_URL: Filer server URL (default: http://localhost:8888)

Storage Structure:
/faithflow/{church_id}/
    ├── members/
    │   ├── photos/
    │   ├── documents/
    │   └── qrcodes/
    ├── groups/
    │   └── covers/
    ├── communities/
    │   ├── covers/
    │   └── messages/
    ├── articles/
    │   └── images/
    ├── devotions/
    │   └── covers/
    ├── events/
    │   └── covers/
    ├── explore/
    │   ├── devotions/
    │   ├── figures/
    │   ├── verses/
    │   └── quizzes/
    ├── ai/
    │   └── generated/
    └── general/
        └── uploads/
"""

import httpx
import logging
import os
import base64
import re
from typing import Optional, Dict, Any, Tuple, BinaryIO, Literal
from io import BytesIO
from PIL import Image
from datetime import datetime
from enum import Enum
import uuid
import mimetypes

logger = logging.getLogger(__name__)

# Configuration
SEAWEEDFS_MASTER_URL = os.environ.get("SEAWEEDFS_MASTER_URL", "http://localhost:9333")
SEAWEEDFS_VOLUME_URL = os.environ.get("SEAWEEDFS_VOLUME_URL", "http://localhost:8080")
SEAWEEDFS_FILER_URL = os.environ.get("SEAWEEDFS_FILER_URL", "http://localhost:8888")
# Public URL for file access (via reverse proxy, e.g., files.yourdomain.com)
# If not set, falls back to internal filer URL
SEAWEEDFS_PUBLIC_URL = os.environ.get("SEAWEEDFS_PUBLIC_URL", "")

# Default timeout for HTTP requests (seconds)
DEFAULT_TIMEOUT = 30.0

# File size limits (bytes)
FILE_SIZE_LIMITS = {
    "image": 10 * 1024 * 1024,      # 10MB for images
    "video": 100 * 1024 * 1024,     # 100MB for videos
    "audio": 25 * 1024 * 1024,      # 25MB for audio
    "document": 25 * 1024 * 1024,   # 25MB for documents
}

# Allowed MIME types
ALLOWED_MIME_TYPES = {
    "image": [
        "image/jpeg", "image/jpg", "image/png", "image/gif",
        "image/webp", "image/heic", "image/heif"
    ],
    "video": [
        "video/mp4", "video/quicktime", "video/x-msvideo",
        "video/webm", "video/3gpp"
    ],
    "audio": [
        "audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg",
        "audio/aac", "audio/m4a", "audio/x-m4a"
    ],
    "document": [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain"
    ]
}

# Thumbnail sizes
THUMBNAIL_SIZES = {
    "small": (150, 150),
    "medium": (300, 300),
    "large": (800, 600)
}

# Image compression quality
IMAGE_QUALITY = 85


# =============================================================================
# STORAGE CATEGORIES
# =============================================================================
# Each category defines where files are stored and their specific settings

class StorageCategory(str, Enum):
    """Categories for organized file storage."""
    # Member-related
    MEMBER_PHOTO = "member_photo"
    MEMBER_DOCUMENT = "member_document"
    MEMBER_QRCODE = "member_qrcode"

    # Cover images
    GROUP_COVER = "group_cover"
    GROUP_GALLERY = "group_gallery"
    COMMUNITY_COVER = "community_cover"
    COMMUNITY_SUBGROUP_COVER = "community_subgroup_cover"
    EVENT_COVER = "event_cover"
    EVENT_GALLERY = "event_gallery"
    ARTICLE_FEATURED = "article_featured"
    ARTICLE_CONTENT = "article_content"
    DEVOTION_COVER = "devotion_cover"

    # Explore content
    EXPLORE_DEVOTION = "explore_devotion"
    EXPLORE_FIGURE = "explore_figure"
    EXPLORE_VERSE = "explore_verse"
    EXPLORE_QUIZ = "explore_quiz"
    EXPLORE_STUDY = "explore_study"

    # Sermons
    SERMON_AUDIO = "sermon_audio"
    SERMON_VIDEO = "sermon_video"
    SERMON_SLIDES = "sermon_slides"
    SERMON_THUMBNAIL = "sermon_thumbnail"

    # AI-generated
    AI_GENERATED = "ai_generated"

    # Community messages
    MESSAGE_MEDIA = "message_media"

    # Import/Export (temporary)
    IMPORT_TEMP = "import_temp"

    # General
    GENERAL = "general"


# Storage paths and settings for each category
STORAGE_CATEGORIES = {
    StorageCategory.MEMBER_PHOTO: {
        "path": "members/photos",
        "max_size": 2 * 1024 * 1024,  # 2MB
        "optimize": True,
        "max_dimensions": (800, 800),
        "thumbnail": True,
        "thumbnail_size": (150, 150),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.MEMBER_DOCUMENT: {
        "path": "members/documents",
        "max_size": 10 * 1024 * 1024,  # 10MB
        "optimize": False,
        "allowed_types": [
            "application/pdf",
            "image/jpeg", "image/png",
            "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ],
    },
    StorageCategory.MEMBER_QRCODE: {
        "path": "members/qrcodes",
        "max_size": 100 * 1024,  # 100KB
        "optimize": False,
        "allowed_types": ["image/png", "image/svg+xml"],
    },
    StorageCategory.GROUP_COVER: {
        "path": "groups/covers",
        "max_size": 5 * 1024 * 1024,  # 5MB
        "optimize": True,
        "max_dimensions": (1200, 600),
        "thumbnail": True,
        "thumbnail_size": (400, 200),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.COMMUNITY_COVER: {
        "path": "communities/covers",
        "max_size": 5 * 1024 * 1024,  # 5MB
        "optimize": True,
        "max_dimensions": (1200, 600),
        "thumbnail": True,
        "thumbnail_size": (400, 200),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.EVENT_COVER: {
        "path": "events/covers",
        "max_size": 5 * 1024 * 1024,  # 5MB
        "optimize": True,
        "max_dimensions": (1200, 600),
        "thumbnail": True,
        "thumbnail_size": (400, 200),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.DEVOTION_COVER: {
        "path": "devotions/covers",
        "max_size": 5 * 1024 * 1024,  # 5MB
        "optimize": True,
        "max_dimensions": (1200, 800),
        "thumbnail": True,
        "thumbnail_size": (400, 267),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.EXPLORE_DEVOTION: {
        "path": "explore/devotions",
        "max_size": 5 * 1024 * 1024,
        "optimize": True,
        "max_dimensions": (1200, 800),
        "thumbnail": True,
        "thumbnail_size": (400, 267),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.EXPLORE_FIGURE: {
        "path": "explore/figures",
        "max_size": 5 * 1024 * 1024,
        "optimize": True,
        "max_dimensions": (1200, 800),
        "thumbnail": True,
        "thumbnail_size": (400, 267),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.EXPLORE_VERSE: {
        "path": "explore/verses",
        "max_size": 5 * 1024 * 1024,
        "optimize": True,
        "max_dimensions": (1200, 800),
        "thumbnail": True,
        "thumbnail_size": (400, 267),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.EXPLORE_QUIZ: {
        "path": "explore/quizzes",
        "max_size": 5 * 1024 * 1024,
        "optimize": True,
        "max_dimensions": (1200, 800),
        "thumbnail": True,
        "thumbnail_size": (400, 267),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.AI_GENERATED: {
        "path": "ai/generated",
        "max_size": 10 * 1024 * 1024,  # 10MB
        "optimize": False,  # Already optimized by AI
        "thumbnail": True,
        "thumbnail_size": (400, 400),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.MESSAGE_MEDIA: {
        "path": "communities/messages",
        "max_size": 100 * 1024 * 1024,  # 100MB for videos
        "optimize": True,
        "thumbnail": True,
        "thumbnail_size": (300, 300),
        "allowed_types": ALLOWED_MIME_TYPES["image"] + ALLOWED_MIME_TYPES["video"] +
                        ALLOWED_MIME_TYPES["audio"] + ALLOWED_MIME_TYPES["document"],
    },
    StorageCategory.GENERAL: {
        "path": "general/uploads",
        "max_size": 10 * 1024 * 1024,  # 10MB
        "optimize": False,
        "allowed_types": ALLOWED_MIME_TYPES["image"] + ALLOWED_MIME_TYPES["document"],
    },
    # New categories for enterprise-grade structure
    StorageCategory.GROUP_GALLERY: {
        "path": "groups/gallery",
        "max_size": 10 * 1024 * 1024,  # 10MB
        "optimize": True,
        "max_dimensions": (1920, 1080),
        "thumbnail": True,
        "thumbnail_size": (300, 300),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.COMMUNITY_SUBGROUP_COVER: {
        "path": "communities/subgroups/covers",
        "max_size": 5 * 1024 * 1024,  # 5MB
        "optimize": True,
        "max_dimensions": (1200, 600),
        "thumbnail": True,
        "thumbnail_size": (400, 200),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.EVENT_GALLERY: {
        "path": "events/gallery",
        "max_size": 10 * 1024 * 1024,  # 10MB
        "optimize": True,
        "max_dimensions": (1920, 1080),
        "thumbnail": True,
        "thumbnail_size": (300, 300),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.ARTICLE_FEATURED: {
        "path": "articles/featured",
        "max_size": 5 * 1024 * 1024,  # 5MB
        "optimize": True,
        "max_dimensions": (1920, 1080),
        "thumbnail": True,
        "thumbnail_size": (400, 225),
        "allowed_types": ["image/jpeg", "image/png", "image/webp", "image/gif"],
    },
    StorageCategory.ARTICLE_CONTENT: {
        "path": "articles/content",
        "max_size": 5 * 1024 * 1024,  # 5MB
        "optimize": True,
        "max_dimensions": (1920, 1080),
        "thumbnail": False,
        "allowed_types": ["image/jpeg", "image/png", "image/webp", "image/gif"],
    },
    StorageCategory.EXPLORE_STUDY: {
        "path": "explore/bible-studies",
        "max_size": 5 * 1024 * 1024,
        "optimize": True,
        "max_dimensions": (1200, 800),
        "thumbnail": True,
        "thumbnail_size": (400, 267),
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.SERMON_AUDIO: {
        "path": "sermons/audio",
        "max_size": 200 * 1024 * 1024,  # 200MB
        "optimize": False,
        "thumbnail": False,
        "allowed_types": ALLOWED_MIME_TYPES["audio"],
    },
    StorageCategory.SERMON_VIDEO: {
        "path": "sermons/video",
        "max_size": 2 * 1024 * 1024 * 1024,  # 2GB
        "optimize": False,
        "thumbnail": True,
        "thumbnail_size": (400, 225),
        "allowed_types": ALLOWED_MIME_TYPES["video"],
    },
    StorageCategory.SERMON_SLIDES: {
        "path": "sermons/slides",
        "max_size": 50 * 1024 * 1024,  # 50MB
        "optimize": False,
        "thumbnail": False,
        "allowed_types": [
            "application/pdf",
            "application/vnd.ms-powerpoint",
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        ],
    },
    StorageCategory.SERMON_THUMBNAIL: {
        "path": "sermons/thumbnails",
        "max_size": 2 * 1024 * 1024,  # 2MB
        "optimize": True,
        "max_dimensions": (800, 450),
        "thumbnail": False,
        "allowed_types": ["image/jpeg", "image/png", "image/webp"],
    },
    StorageCategory.IMPORT_TEMP: {
        "path": "imports/temp",
        "max_size": 100 * 1024 * 1024,  # 100MB
        "optimize": False,
        "thumbnail": False,
        "allowed_types": ALLOWED_MIME_TYPES["image"] + ALLOWED_MIME_TYPES["document"],
        "ttl": 7200,  # 2 hours TTL for temp files
    },
}


class SeaweedFSError(Exception):
    """Base exception for SeaweedFS operations."""
    pass


class SeaweedFSService:
    """Service for interacting with SeaweedFS storage."""

    def __init__(
        self,
        master_url: str = SEAWEEDFS_MASTER_URL,
        volume_url: str = SEAWEEDFS_VOLUME_URL,
        filer_url: str = SEAWEEDFS_FILER_URL,
        public_url: str = SEAWEEDFS_PUBLIC_URL,
        timeout: float = DEFAULT_TIMEOUT
    ):
        """
        Initialize SeaweedFS service.

        Args:
            master_url: SeaweedFS master server URL
            volume_url: SeaweedFS volume server URL
            filer_url: SeaweedFS filer server URL
            public_url: Public URL for file access (via reverse proxy)
            timeout: Request timeout in seconds
        """
        self.master_url = master_url.rstrip("/")
        self.volume_url = volume_url.rstrip("/")
        self.filer_url = filer_url.rstrip("/")
        # Public URL for generating file URLs accessible from outside
        # Falls back to filer URL if not set
        self.public_url = public_url.rstrip("/") if public_url else self.filer_url
        self.timeout = timeout

    async def health_check(self) -> Dict[str, Any]:
        """
        Check if SeaweedFS cluster is healthy.

        Returns:
            Cluster status information
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.master_url}/cluster/status")
                response.raise_for_status()
                return response.json()
        except Exception as e:
            logger.error(f"SeaweedFS health check failed: {e}")
            raise SeaweedFSError(f"Health check failed: {e}")

    async def _get_file_id(self) -> Tuple[str, str]:
        """
        Get a new file ID from SeaweedFS master.

        Returns:
            Tuple of (fid, volume_url)
        """
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(f"{self.master_url}/dir/assign")
                response.raise_for_status()
                data = response.json()

                fid = data.get("fid")
                url = data.get("url") or data.get("publicUrl")

                if not fid:
                    raise SeaweedFSError("Failed to get file ID from master")

                return fid, url

        except httpx.HTTPError as e:
            logger.error(f"Failed to get file ID: {e}")
            raise SeaweedFSError(f"Failed to get file ID: {e}")

    def _get_media_type(self, mime_type: str) -> Optional[str]:
        """
        Determine media type category from MIME type.

        Args:
            mime_type: MIME type string

        Returns:
            Media type category or None
        """
        for media_type, mime_types in ALLOWED_MIME_TYPES.items():
            if mime_type.lower() in mime_types:
                return media_type
        return None

    def _validate_file(
        self,
        content: bytes,
        mime_type: str,
        file_name: str
    ) -> str:
        """
        Validate file before upload.

        Args:
            content: File content bytes
            mime_type: MIME type
            file_name: Original file name

        Returns:
            Media type category

        Raises:
            SeaweedFSError if validation fails
        """
        # Determine media type
        media_type = self._get_media_type(mime_type)
        if not media_type:
            raise SeaweedFSError(f"Unsupported file type: {mime_type}")

        # Check file size
        max_size = FILE_SIZE_LIMITS.get(media_type, FILE_SIZE_LIMITS["document"])
        if len(content) > max_size:
            raise SeaweedFSError(
                f"File size {len(content)} bytes exceeds maximum "
                f"of {max_size} bytes for {media_type}"
            )

        return media_type

    def _optimize_image(
        self,
        content: bytes,
        max_width: int = 1920,
        max_height: int = 1080,
        quality: int = IMAGE_QUALITY
    ) -> Tuple[bytes, int, int]:
        """
        Optimize image: resize and compress.

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

            # Get original format
            original_format = image.format or "JPEG"

            # Convert RGBA to RGB if needed
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                if image.mode == 'RGBA':
                    background.paste(image, mask=image.split()[-1])
                else:
                    background.paste(image)
                image = background

            # Get original dimensions
            orig_width, orig_height = image.size

            # Resize if needed
            if orig_width > max_width or orig_height > max_height:
                image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)

            # Save optimized
            output = BytesIO()

            # Preserve format if possible, otherwise use JPEG
            if original_format.upper() in ['PNG', 'WEBP']:
                image.save(output, format=original_format, optimize=True)
            else:
                image.save(
                    output,
                    format='JPEG',
                    quality=quality,
                    optimize=True,
                    progressive=True
                )

            optimized_bytes = output.getvalue()
            width, height = image.size

            logger.debug(
                f"Image optimized: {orig_width}x{orig_height} → {width}x{height}, "
                f"{len(content)} → {len(optimized_bytes)} bytes"
            )

            return optimized_bytes, width, height

        except Exception as e:
            logger.error(f"Image optimization failed: {e}")
            # Return original on failure
            return content, 0, 0

    def _generate_thumbnail(
        self,
        content: bytes,
        size: Tuple[int, int] = THUMBNAIL_SIZES["medium"]
    ) -> Optional[bytes]:
        """
        Generate thumbnail for image.

        Args:
            content: Original image bytes
            size: Thumbnail size (width, height)

        Returns:
            Thumbnail bytes or None on failure
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

    async def upload_file(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        community_id: Optional[str] = None,
        optimize_images: bool = True,
        generate_thumbnail: bool = True
    ) -> Dict[str, Any]:
        """
        Upload a file to SeaweedFS.

        Args:
            content: File content bytes
            file_name: Original file name
            mime_type: MIME type
            church_id: Church ID for organization
            community_id: Optional community ID
            optimize_images: Whether to optimize images
            generate_thumbnail: Whether to generate thumbnail for images

        Returns:
            File metadata including fid, url, etc.
        """
        # Validate file
        media_type = self._validate_file(content, mime_type, file_name)

        # Get dimensions for images
        width = None
        height = None
        thumbnail_fid = None
        thumbnail_url = None

        # Optimize and generate thumbnail for images
        if media_type == "image":
            if optimize_images:
                content, width, height = self._optimize_image(content)

            if generate_thumbnail:
                thumbnail_content = self._generate_thumbnail(content)
                if thumbnail_content:
                    # Upload thumbnail
                    thumb_result = await self._upload_to_seaweedfs(
                        thumbnail_content,
                        f"thumb_{file_name}",
                        "image/jpeg",
                        church_id,
                        community_id
                    )
                    thumbnail_fid = thumb_result.get("fid")
                    thumbnail_url = thumb_result.get("url")

        # Upload main file
        result = await self._upload_to_seaweedfs(
            content,
            file_name,
            mime_type,
            church_id,
            community_id
        )

        # Build response
        return {
            "fid": result["fid"],
            "url": result["url"],
            "file_name": file_name,
            "mime_type": mime_type,
            "media_type": media_type,
            "file_size": len(content),
            "width": width,
            "height": height,
            "thumbnail_fid": thumbnail_fid,
            "thumbnail_url": thumbnail_url,
            "church_id": church_id,
            "community_id": community_id,
            "uploaded_at": datetime.utcnow().isoformat()
        }

    async def _upload_to_seaweedfs(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        community_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Internal method to upload file to SeaweedFS.

        Args:
            content: File content
            file_name: File name
            mime_type: MIME type
            church_id: Church ID
            community_id: Optional community ID

        Returns:
            Upload result with fid and url
        """
        try:
            # Get file ID from master
            fid, volume_url = await self._get_file_id()

            # Build upload URL
            upload_url = f"http://{volume_url}/{fid}"

            # Upload file
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                files = {
                    "file": (file_name, content, mime_type)
                }
                response = await client.post(upload_url, files=files)
                response.raise_for_status()

            # Build public URL
            public_url = f"{self.volume_url}/{fid}"

            logger.info(f"File uploaded to SeaweedFS: {fid} ({file_name})")

            return {
                "fid": fid,
                "url": public_url,
                "size": len(content)
            }

        except httpx.HTTPError as e:
            logger.error(f"Upload to SeaweedFS failed: {e}")
            raise SeaweedFSError(f"Upload failed: {e}")

    async def download_file(self, fid: str) -> Tuple[bytes, str]:
        """
        Download a file from SeaweedFS.

        Args:
            fid: SeaweedFS file ID

        Returns:
            Tuple of (file_content, mime_type)
        """
        try:
            url = f"{self.volume_url}/{fid}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()

                content = response.content
                mime_type = response.headers.get(
                    "content-type",
                    "application/octet-stream"
                )

                return content, mime_type

        except httpx.HTTPError as e:
            logger.error(f"Download from SeaweedFS failed: {e}")
            raise SeaweedFSError(f"Download failed: {e}")

    async def delete_file(self, fid: str) -> bool:
        """
        Delete a file from SeaweedFS.

        Args:
            fid: SeaweedFS file ID

        Returns:
            True if deleted successfully
        """
        try:
            url = f"{self.volume_url}/{fid}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.delete(url)
                response.raise_for_status()

            logger.info(f"File deleted from SeaweedFS: {fid}")
            return True

        except httpx.HTTPError as e:
            logger.error(f"Delete from SeaweedFS failed: {e}")
            raise SeaweedFSError(f"Delete failed: {e}")

    async def get_file_info(self, fid: str) -> Dict[str, Any]:
        """
        Get file information from SeaweedFS.

        Args:
            fid: SeaweedFS file ID

        Returns:
            File metadata
        """
        try:
            # Query master for file location
            url = f"{self.master_url}/dir/lookup?fileId={fid}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                response.raise_for_status()
                data = response.json()

                if "error" in data:
                    raise SeaweedFSError(data["error"])

                return data

        except httpx.HTTPError as e:
            logger.error(f"Get file info failed: {e}")
            raise SeaweedFSError(f"Get file info failed: {e}")

    def get_public_url(self, fid: str) -> str:
        """
        Get public URL for a file.

        Args:
            fid: SeaweedFS file ID

        Returns:
            Public URL
        """
        return f"{self.volume_url}/{fid}"

    async def upload_via_filer(
        self,
        content: bytes,
        path: str,
        file_name: str,
        mime_type: str
    ) -> Dict[str, Any]:
        """
        Upload file via Filer (with path-based organization).

        This method uses the filer API for hierarchical storage:
        /communities/{church_id}/{community_id}/messages/{message_id}/{filename}

        Args:
            content: File content
            path: Storage path (e.g., /communities/church123/comm456/messages/)
            file_name: File name
            mime_type: MIME type

        Returns:
            Upload result
        """
        try:
            # Build filer URL for internal upload
            full_path = f"{path.rstrip('/')}/{file_name}"
            upload_url = f"{self.filer_url}{full_path}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                files = {
                    "file": (file_name, content, mime_type)
                }
                response = await client.post(upload_url, files=files)
                response.raise_for_status()
                data = response.json()

            # Build public URL for file access
            public_url = f"{self.public_url}{full_path}"

            logger.info(f"File uploaded via filer: {full_path}")

            return {
                "path": full_path,
                "url": public_url,  # Return public URL for client access
                "internal_url": upload_url,  # Keep internal URL for debugging
                "size": len(content),
                "fid": data.get("fid")
            }

        except httpx.HTTPError as e:
            logger.error(f"Filer upload failed: {e}")
            raise SeaweedFSError(f"Filer upload failed: {e}")

    # =========================================================================
    # CATEGORY-BASED UPLOAD METHODS
    # =========================================================================

    async def upload_by_category(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        category: StorageCategory,
        entity_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload file to SeaweedFS using category-based organization.

        This is the RECOMMENDED method for all new uploads. It automatically
        handles optimization, thumbnails, and path organization based on category.

        Args:
            content: File content bytes
            file_name: Original file name
            mime_type: MIME type (e.g., "image/jpeg")
            church_id: Church ID for multi-tenant isolation
            category: Storage category (e.g., StorageCategory.MEMBER_PHOTO)
            entity_id: Optional entity ID (member_id, group_id, etc.)

        Returns:
            Dict with fid, url, thumbnail_url, etc.

        Example:
            result = await seaweedfs.upload_by_category(
                content=image_bytes,
                file_name="photo.jpg",
                mime_type="image/jpeg",
                church_id="church_123",
                category=StorageCategory.MEMBER_PHOTO,
                entity_id="member_456"
            )
            # result = {
            #     "fid": "3,abc123",
            #     "url": "https://files.domain.com/faithflow/church_123/members/photos/member_456/photo.jpg",
            #     "thumbnail_url": "https://files.domain.com/faithflow/church_123/members/photos/member_456/thumb_photo.jpg",
            #     ...
            # }
        """
        cat_settings = STORAGE_CATEGORIES.get(category)
        if not cat_settings:
            raise SeaweedFSError(f"Unknown storage category: {category}")

        # Validate file type
        allowed_types = cat_settings.get("allowed_types", [])
        if allowed_types and mime_type.lower() not in allowed_types:
            raise SeaweedFSError(
                f"File type {mime_type} not allowed for {category.value}. "
                f"Allowed: {', '.join(allowed_types)}"
            )

        # Validate file size
        max_size = cat_settings.get("max_size", FILE_SIZE_LIMITS["document"])
        if len(content) > max_size:
            raise SeaweedFSError(
                f"File size {len(content)} bytes exceeds maximum "
                f"of {max_size} bytes for {category.value}"
            )

        # Optimize image if needed
        width = None
        height = None
        is_image = mime_type.lower().startswith("image/")

        if is_image and cat_settings.get("optimize"):
            max_dims = cat_settings.get("max_dimensions", (1920, 1080))
            content, width, height = self._optimize_image(
                content,
                max_width=max_dims[0],
                max_height=max_dims[1]
            )

        # Build storage path
        base_path = cat_settings["path"]
        if entity_id:
            storage_path = f"/faithflow/{church_id}/{base_path}/{entity_id}"
        else:
            storage_path = f"/faithflow/{church_id}/{base_path}"

        # Generate unique filename
        ext = os.path.splitext(file_name)[1] or ".bin"
        unique_name = f"{uuid.uuid4().hex[:12]}{ext}"

        # Upload main file via filer
        result = await self.upload_via_filer(
            content=content,
            path=storage_path,
            file_name=unique_name,
            mime_type=mime_type
        )

        # Generate thumbnail if needed
        thumbnail_fid = None
        thumbnail_url = None
        if is_image and cat_settings.get("thumbnail"):
            thumb_size = cat_settings.get("thumbnail_size", (300, 300))
            thumb_content = self._generate_thumbnail(content, thumb_size)
            if thumb_content:
                thumb_result = await self.upload_via_filer(
                    content=thumb_content,
                    path=storage_path,
                    file_name=f"thumb_{unique_name}",
                    mime_type="image/jpeg"
                )
                thumbnail_fid = thumb_result.get("fid")
                thumbnail_url = thumb_result.get("url")

        return {
            "fid": result.get("fid"),
            "path": result.get("path"),
            "url": result.get("url"),
            "file_name": unique_name,
            "original_name": file_name,
            "mime_type": mime_type,
            "file_size": len(content),
            "width": width,
            "height": height,
            "thumbnail_fid": thumbnail_fid,
            "thumbnail_url": thumbnail_url,
            "category": category.value,
            "church_id": church_id,
            "entity_id": entity_id,
            "uploaded_at": datetime.utcnow().isoformat()
        }

    async def upload_from_base64(
        self,
        base64_data: str,
        file_name: str,
        church_id: str,
        category: StorageCategory,
        entity_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Upload file from base64-encoded data.

        Handles both plain base64 and data URI format:
        - "data:image/jpeg;base64,/9j/4AAQ..."
        - "/9j/4AAQ..."

        Args:
            base64_data: Base64-encoded file content (with or without data URI prefix)
            file_name: File name to use
            church_id: Church ID
            category: Storage category
            entity_id: Optional entity ID

        Returns:
            Upload result dict
        """
        # Parse data URI if present
        mime_type = "application/octet-stream"
        data = base64_data

        # Check for data URI format
        data_uri_match = re.match(
            r'^data:([^;]+);base64,(.+)$',
            base64_data,
            re.DOTALL
        )
        if data_uri_match:
            mime_type = data_uri_match.group(1)
            data = data_uri_match.group(2)
        else:
            # Try to guess MIME type from file extension
            ext = os.path.splitext(file_name)[1].lower()
            mime_type = mimetypes.guess_type(file_name)[0] or "application/octet-stream"

        # Decode base64
        try:
            content = base64.b64decode(data)
        except Exception as e:
            raise SeaweedFSError(f"Invalid base64 data: {e}")

        return await self.upload_by_category(
            content=content,
            file_name=file_name,
            mime_type=mime_type,
            church_id=church_id,
            category=category,
            entity_id=entity_id
        )

    async def delete_by_path(self, path: str) -> bool:
        """
        Delete a file by its filer path.

        Args:
            path: Full filer path (e.g., /faithflow/church_123/members/photos/file.jpg)

        Returns:
            True if deleted successfully
        """
        try:
            url = f"{self.filer_url}{path}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.delete(url)
                if response.status_code in [200, 204, 404]:
                    logger.info(f"File deleted from filer: {path}")
                    return True
                response.raise_for_status()
                return True

        except httpx.HTTPError as e:
            logger.error(f"Delete from filer failed: {e}")
            raise SeaweedFSError(f"Delete failed: {e}")

    def get_filer_url(self, path: str) -> str:
        """
        Get the full URL for a filer path.

        Args:
            path: Filer path

        Returns:
            Full URL
        """
        return f"{self.filer_url}{path}"

    async def list_files(
        self,
        church_id: str,
        category: StorageCategory,
        entity_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        List files in a category/entity path.

        Args:
            church_id: Church ID
            category: Storage category
            entity_id: Optional entity ID

        Returns:
            Directory listing from filer
        """
        cat_settings = STORAGE_CATEGORIES.get(category)
        if not cat_settings:
            raise SeaweedFSError(f"Unknown storage category: {category}")

        base_path = cat_settings["path"]
        if entity_id:
            path = f"/faithflow/{church_id}/{base_path}/{entity_id}/"
        else:
            path = f"/faithflow/{church_id}/{base_path}/"

        try:
            url = f"{self.filer_url}{path}?pretty=y"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                response = await client.get(url)
                if response.status_code == 404:
                    return {"Path": path, "Entries": []}
                response.raise_for_status()
                return response.json()

        except httpx.HTTPError as e:
            logger.error(f"List files failed: {e}")
            raise SeaweedFSError(f"List files failed: {e}")

    # =========================================================================
    # CONVENIENCE METHODS FOR SPECIFIC CATEGORIES
    # =========================================================================

    async def upload_member_photo(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        member_id: str
    ) -> Dict[str, Any]:
        """Upload member profile photo."""
        return await self.upload_by_category(
            content=content,
            file_name=file_name,
            mime_type=mime_type,
            church_id=church_id,
            category=StorageCategory.MEMBER_PHOTO,
            entity_id=member_id
        )

    async def upload_member_document(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        member_id: str
    ) -> Dict[str, Any]:
        """Upload member document (ID, certificate, etc.)."""
        return await self.upload_by_category(
            content=content,
            file_name=file_name,
            mime_type=mime_type,
            church_id=church_id,
            category=StorageCategory.MEMBER_DOCUMENT,
            entity_id=member_id
        )

    async def upload_group_cover(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        group_id: str
    ) -> Dict[str, Any]:
        """Upload group cover image."""
        return await self.upload_by_category(
            content=content,
            file_name=file_name,
            mime_type=mime_type,
            church_id=church_id,
            category=StorageCategory.GROUP_COVER,
            entity_id=group_id
        )

    async def upload_community_cover(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        community_id: str
    ) -> Dict[str, Any]:
        """Upload community cover image."""
        return await self.upload_by_category(
            content=content,
            file_name=file_name,
            mime_type=mime_type,
            church_id=church_id,
            category=StorageCategory.COMMUNITY_COVER,
            entity_id=community_id
        )

    async def upload_event_cover(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        event_id: str
    ) -> Dict[str, Any]:
        """Upload event cover image."""
        return await self.upload_by_category(
            content=content,
            file_name=file_name,
            mime_type=mime_type,
            church_id=church_id,
            category=StorageCategory.EVENT_COVER,
            entity_id=event_id
        )

    async def upload_article_image(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        article_id: str
    ) -> Dict[str, Any]:
        """Upload article featured image."""
        return await self.upload_by_category(
            content=content,
            file_name=file_name,
            mime_type=mime_type,
            church_id=church_id,
            category=StorageCategory.ARTICLE_FEATURED,
            entity_id=article_id
        )

    async def upload_devotion_cover(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        devotion_id: str
    ) -> Dict[str, Any]:
        """Upload devotion cover image."""
        return await self.upload_by_category(
            content=content,
            file_name=file_name,
            mime_type=mime_type,
            church_id=church_id,
            category=StorageCategory.DEVOTION_COVER,
            entity_id=devotion_id
        )

    async def upload_ai_generated(
        self,
        content: bytes,
        file_name: str,
        mime_type: str,
        church_id: str,
        generation_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Upload AI-generated image."""
        return await self.upload_by_category(
            content=content,
            file_name=file_name,
            mime_type=mime_type,
            church_id=church_id,
            category=StorageCategory.AI_GENERATED,
            entity_id=generation_id
        )


# Singleton instance
_seaweedfs_service: Optional[SeaweedFSService] = None


def get_seaweedfs_service() -> SeaweedFSService:
    """
    Get SeaweedFS service singleton.

    Returns:
        SeaweedFSService instance
    """
    global _seaweedfs_service
    if _seaweedfs_service is None:
        _seaweedfs_service = SeaweedFSService()
    return _seaweedfs_service


# FastAPI dependency
async def get_seaweedfs() -> SeaweedFSService:
    """
    FastAPI dependency for SeaweedFS service.

    Usage:
        @router.post("/upload")
        async def upload(
            file: UploadFile,
            seaweedfs: SeaweedFSService = Depends(get_seaweedfs)
        ):
            ...
    """
    return get_seaweedfs_service()
