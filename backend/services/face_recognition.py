"""
Face Recognition Service using InsightFace (ArcFace)

Provides highly accurate face recognition using ArcFace model:
- 512-dimensional face embeddings
- Cosine similarity matching
- State-of-the-art accuracy (better than FaceNet512)
- Uses ONNX Runtime - no TensorFlow dependency

Usage:
    from services.face_recognition import face_recognition_service

    # Generate embedding from image
    embedding = await face_recognition_service.get_embedding(image_path_or_url)

    # Match face against database
    match = await face_recognition_service.find_match(embedding, member_embeddings)
"""

import asyncio
import base64
import io
import logging
import os
from typing import Optional, List, Dict, Any
import numpy as np
from PIL import Image
import httpx

logger = logging.getLogger(__name__)

# Configuration
MODEL_NAME = "buffalo_l"  # InsightFace ArcFace model (512D embeddings)
DISTANCE_METRIC = "cosine"

# Matching thresholds for cosine distance
# Cosine distance range: 0 (identical) to 2 (opposite)
# Looser thresholds to account for lighting/angle variations in kiosk environment
THRESHOLDS = {
    "high_confidence": 0.35,  # Strong match - auto check-in (was 0.25, now looser)
    "low_confidence": 0.55,   # Possible match - ask for confirmation (was 0.45, now looser)
    # Above low_confidence = no match
}

# Recency weighting for progressive learning
# More recent embeddings are weighted higher (they represent current appearance)
RECENCY_WEIGHT_FACTOR = 0.1  # Each position from newest adds this much distance penalty


class FaceRecognitionService:
    """
    Face recognition service using InsightFace with ArcFace model.

    Features:
    - Uses ArcFace model (state-of-the-art accuracy)
    - 512-dimensional embeddings
    - Uses ONNX Runtime (no TensorFlow dependency)
    - Async-friendly (runs in thread pool)
    - Supports both file paths and URLs
    """

    def __init__(self):
        self._initialized = False
        self._lock = asyncio.Lock()
        self._http_client = None
        self._app = None

    async def _ensure_initialized(self):
        """Lazy initialization of InsightFace model."""
        if self._initialized:
            return

        async with self._lock:
            if self._initialized:
                return

            logger.info("[FaceRecognition] Initializing InsightFace with ArcFace model...")

            try:
                import insightface
                from insightface.app import FaceAnalysis

                # Initialize InsightFace app
                # Run in thread pool to not block
                loop = asyncio.get_event_loop()

                def _init():
                    app = FaceAnalysis(
                        name=MODEL_NAME,
                        providers=['CPUExecutionProvider']
                    )
                    # Use smaller detection size for faster processing (320x320 instead of 640x640)
                    # This is 4x faster while still accurate for kiosk face detection
                    # (faces are typically close to camera in kiosk setting)
                    app.prepare(ctx_id=-1, det_size=(320, 320))
                    return app

                self._app = await loop.run_in_executor(None, _init)

                self._initialized = True
                logger.info("[FaceRecognition] InsightFace initialized successfully")

            except Exception as e:
                logger.error(f"[FaceRecognition] Failed to initialize InsightFace: {e}")
                raise

    async def _get_http_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client for downloading images."""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=30.0)
        return self._http_client

    async def _load_image(self, source: str) -> np.ndarray:
        """
        Load image from file path, URL, or base64 string.

        Args:
            source: File path, URL, or base64-encoded image

        Returns:
            numpy array of the image (BGR format for InsightFace)
        """
        img_data = None

        if source.startswith(('http://', 'https://')):
            # Download from URL
            client = await self._get_http_client()
            response = await client.get(source)
            response.raise_for_status()
            img_data = response.content

        elif source.startswith('data:image'):
            # Base64 data URI
            header, encoded = source.split(',', 1)
            img_data = base64.b64decode(encoded)

        elif os.path.isfile(source):
            # Local file
            with open(source, 'rb') as f:
                img_data = f.read()
        else:
            # Assume raw base64
            try:
                img_data = base64.b64decode(source)
            except Exception:
                raise ValueError(f"Invalid image source: {source[:50]}...")

        # Convert to PIL Image then to numpy array (BGR for InsightFace)
        img = Image.open(io.BytesIO(img_data))
        if img.mode != 'RGB':
            img = img.convert('RGB')

        # Convert RGB to BGR for InsightFace
        img_array = np.array(img)
        img_bgr = img_array[:, :, ::-1]

        return img_bgr

    async def get_embedding(
        self,
        image_source: str,
        enforce_detection: bool = True
    ) -> Optional[Dict[str, Any]]:
        """
        Generate face embedding from an image.

        Args:
            image_source: File path, URL, or base64 string
            enforce_detection: If True, return None if no face detected

        Returns:
            Dict with:
            - embedding: List[float] - 512D face embedding (L2 normalized)
            - face_confidence: float - Detection confidence
            - facial_area: Dict - Bounding box of detected face
            Or None if no face detected and enforce_detection=True
        """
        await self._ensure_initialized()

        try:
            # Load image
            img_array = await self._load_image(image_source)

            # Run InsightFace in thread pool
            loop = asyncio.get_event_loop()

            def _get_faces():
                return self._app.get(img_array)

            faces = await loop.run_in_executor(None, _get_faces)

            if not faces:
                if enforce_detection:
                    logger.warning("[FaceRecognition] No face detected in image")
                return None

            # Get the first (largest) face
            face = faces[0]
            embedding = face.normed_embedding  # Already L2 normalized

            # Get bounding box
            bbox = face.bbox.astype(int)
            facial_area = {
                "x": int(bbox[0]),
                "y": int(bbox[1]),
                "w": int(bbox[2] - bbox[0]),
                "h": int(bbox[3] - bbox[1])
            }

            return {
                'embedding': embedding.tolist(),
                'face_confidence': float(face.det_score),
                'facial_area': facial_area,
                'model': MODEL_NAME,
                'embedding_size': len(embedding)
            }

        except Exception as e:
            logger.error(f"[FaceRecognition] Error generating embedding: {e}")
            if enforce_detection:
                raise
            return None

    def calculate_distance(
        self,
        embedding1: List[float],
        embedding2: List[float],
        metric: str = "cosine"
    ) -> float:
        """
        Calculate distance between two embeddings.

        Args:
            embedding1: First embedding (512D)
            embedding2: Second embedding (512D)
            metric: Distance metric ("cosine" or "euclidean")

        Returns:
            Distance value (lower = more similar)
        """
        e1 = np.array(embedding1, dtype=np.float32)
        e2 = np.array(embedding2, dtype=np.float32)

        if metric == "cosine":
            # Cosine distance = 1 - cosine_similarity
            # For normalized vectors: cosine_similarity = dot product
            similarity = np.dot(e1, e2)
            return 1 - similarity
        else:
            # Euclidean distance
            return float(np.linalg.norm(e1 - e2))

    async def find_match(
        self,
        query_embedding: List[float],
        member_embeddings: List[Dict[str, Any]],
        threshold: Optional[float] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Find best matching member for a face embedding.

        Args:
            query_embedding: 512D face embedding to match
            member_embeddings: List of {member_id, member_name, embedding, photo_url}
            threshold: Custom threshold (default: THRESHOLDS["low_confidence"])

        Returns:
            Dict with:
            - member_id: str
            - member_name: str
            - distance: float
            - confidence: "high" | "low"
            - photo_url: Optional[str]
            Or None if no match found
        """
        if not member_embeddings:
            return None

        threshold = threshold or THRESHOLDS["low_confidence"]

        best_match = None
        best_distance = float('inf')

        for member in member_embeddings:
            member_embedding = member.get('embedding')
            if not member_embedding:
                continue

            distance = self.calculate_distance(query_embedding, member_embedding)

            if distance < best_distance:
                best_distance = distance
                best_match = member

        if best_match is None or best_distance > threshold:
            logger.info(f"[FaceRecognition] No match found. Best distance: {best_distance:.4f}, threshold: {threshold}")
            return None

        # Determine confidence level
        confidence = "high" if best_distance < THRESHOLDS["high_confidence"] else "low"

        logger.info(
            f"[FaceRecognition] Match found: {best_match.get('member_name')} "
            f"(distance: {best_distance:.4f}, confidence: {confidence})"
        )

        return {
            "member_id": best_match.get('member_id'),
            "member_name": best_match.get('member_name'),
            "distance": best_distance,
            "confidence": confidence,
            "photo_url": best_match.get('photo_url')
        }

    async def verify_faces(
        self,
        image1_source: str,
        image2_source: str
    ) -> Dict[str, Any]:
        """
        Verify if two images contain the same person.

        Args:
            image1_source: First image (path, URL, or base64)
            image2_source: Second image (path, URL, or base64)

        Returns:
            Dict with:
            - verified: bool
            - distance: float
            - threshold: float
            - model: str
        """
        # Get embeddings for both images
        emb1_result = await self.get_embedding(image1_source, enforce_detection=False)
        emb2_result = await self.get_embedding(image2_source, enforce_detection=False)

        if not emb1_result or not emb2_result:
            return {
                "verified": False,
                "error": "Could not detect face in one or both images"
            }

        distance = self.calculate_distance(
            emb1_result['embedding'],
            emb2_result['embedding']
        )

        verified = distance < THRESHOLDS["low_confidence"]

        return {
            "verified": verified,
            "distance": distance,
            "threshold": THRESHOLDS["low_confidence"],
            "model": MODEL_NAME,
            "confidence": "high" if distance < THRESHOLDS["high_confidence"] else "low" if verified else "none"
        }

    async def close(self):
        """Clean up resources."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None


# Singleton instance
face_recognition_service = FaceRecognitionService()


# Export thresholds for use in other modules
FACE_MATCH_THRESHOLDS = THRESHOLDS
