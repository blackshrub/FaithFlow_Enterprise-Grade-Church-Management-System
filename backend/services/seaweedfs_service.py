"""
SeaweedFS Service for FaithFlow Community Media Storage.

SeaweedFS is a distributed file storage system used for storing
community messages media: images, videos, audio, and documents.

Features:
- Upload files with automatic file ID generation
- Download files by file ID
- Delete files
- Generate thumbnails for images
- Get file metadata
- URL generation for file access

Configuration:
- SEAWEEDFS_MASTER_URL: Master server URL (default: http://localhost:9333)
- SEAWEEDFS_VOLUME_URL: Volume server URL (default: http://localhost:8080)
- SEAWEEDFS_FILER_URL: Filer server URL (default: http://localhost:8888)
"""

import httpx
import logging
import os
from typing import Optional, Dict, Any, Tuple, BinaryIO
from io import BytesIO
from PIL import Image
from datetime import datetime
import uuid
import mimetypes

logger = logging.getLogger(__name__)

# Configuration
SEAWEEDFS_MASTER_URL = os.environ.get("SEAWEEDFS_MASTER_URL", "http://localhost:9333")
SEAWEEDFS_VOLUME_URL = os.environ.get("SEAWEEDFS_VOLUME_URL", "http://localhost:8080")
SEAWEEDFS_FILER_URL = os.environ.get("SEAWEEDFS_FILER_URL", "http://localhost:8888")

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
        timeout: float = DEFAULT_TIMEOUT
    ):
        """
        Initialize SeaweedFS service.

        Args:
            master_url: SeaweedFS master server URL
            volume_url: SeaweedFS volume server URL
            filer_url: SeaweedFS filer server URL
            timeout: Request timeout in seconds
        """
        self.master_url = master_url.rstrip("/")
        self.volume_url = volume_url.rstrip("/")
        self.filer_url = filer_url.rstrip("/")
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
            # Build filer URL
            full_path = f"{path.rstrip('/')}/{file_name}"
            url = f"{self.filer_url}{full_path}"

            async with httpx.AsyncClient(timeout=self.timeout) as client:
                files = {
                    "file": (file_name, content, mime_type)
                }
                response = await client.post(url, files=files)
                response.raise_for_status()
                data = response.json()

            logger.info(f"File uploaded via filer: {full_path}")

            return {
                "path": full_path,
                "url": url,
                "size": len(content),
                "fid": data.get("fid")
            }

        except httpx.HTTPError as e:
            logger.error(f"Filer upload failed: {e}")
            raise SeaweedFSError(f"Filer upload failed: {e}")


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
