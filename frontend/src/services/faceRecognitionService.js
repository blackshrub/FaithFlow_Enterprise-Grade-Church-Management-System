/**
 * Face Recognition Service using @vladmandic/human
 *
 * Optimized for church kiosk check-in:
 * - Fast face DETECTION only (~30-50ms per frame)
 * - Backend InsightFace handles accurate MATCHING (not browser-based)
 * - Parallel QR + Face detection support
 *
 * Architecture:
 * - Browser: Human library for fast face DETECTION (is a face present?)
 * - Backend: InsightFace/ArcFace for accurate MATCHING (who is this person?)
 * - This separation provides low-latency detection with high-accuracy matching
 *
 * Configuration tuned for:
 * - Maximum speed (detection only, no embeddings)
 * - Face detection only (no emotion, age, mesh, etc.)
 * - WebGL backend for GPU acceleration
 */

import { Human } from '@vladmandic/human';

// Optimized configuration for face DETECTION only (matching done on backend)
// Tuned for FAST startup and kiosk use - minimal model, no rotation
const humanConfig = {
  // Use WebGL for GPU acceleration, fallback to WASM
  backend: 'webgl',

  // Model base path - will be loaded from CDN
  modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',

  // Caching for faster subsequent loads
  cacheModels: true,

  // Debug mode off for production
  debug: false,

  // Skip slow async functions during detection
  async: true,

  // Warmup config - use smallest input for faster warmup
  warmup: 'face',

  // Only enable face detection (NOT embedding generation)
  face: {
    enabled: true,

    // Detector configuration - balanced for accuracy and speed
    detector: {
      enabled: true,
      // Use 'blazeface-back' - optimized for back-facing cameras, more accurate than blazeface
      // Options: blazeface (fastest), blazeface-back (balanced, recommended for kiosk)
      modelPath: 'blazeface-back.json',
      rotation: false,         // Disable rotation - kiosk users face camera directly
      maxDetected: 3,          // Detect up to 3 faces, then pick best one
      minConfidence: 0.5,      // Confidence threshold
      iouThreshold: 0.3,       // Standard threshold for NMS
      return: true,
      skipFrames: 0,           // Don't skip frames
    },

    // Mesh disabled - not needed
    mesh: {
      enabled: false,
    },

    // Iris disabled - not needed
    iris: {
      enabled: false,
    },

    // DISABLED: Embedding generation now handled by backend InsightFace
    // This significantly speeds up detection since we only need to know
    // IF a face is present, not generate embeddings for it
    description: {
      enabled: false,  // Was true - embeddings not needed for detection-only mode
    },

    // Emotion disabled - not needed
    emotion: {
      enabled: false,
    },

    // Anti-spoofing disabled (per user request - not security critical)
    antispoof: {
      enabled: false,
    },

    // Liveness detection disabled
    liveness: {
      enabled: false,
    },
  },

  // Body detection disabled
  body: {
    enabled: false,
  },

  // Hand detection disabled
  hand: {
    enabled: false,
  },

  // Gesture detection disabled
  gesture: {
    enabled: false,
  },

  // Object detection disabled
  object: {
    enabled: false,
  },

  // Segmentation disabled
  segmentation: {
    enabled: false,
  },

  // Filter configuration - disabled to avoid canvas readback warnings
  // The Human library creates internal canvas contexts for filtering
  // which trigger willReadFrequently warnings. Since we're using WebGL
  // backend and don't need image preprocessing, we disable filtering.
  filter: {
    enabled: false,           // Disable to avoid canvas readback warnings
    equalization: false,
    flip: false,
    return: false,
  },
};

// Thresholds for face matching (tuned for L2-normalized 512D embeddings from InsightFace)
// After normalization, Euclidean distance range is 0-2:
// - 0 = identical vectors
// - ~0.6-0.9 = same person, different image
// - ~1.0-1.2 = uncertain
// - >1.2 = different person
//
// These thresholds are set LOOSER to account for:
// - Lighting variations in kiosk environment
// - Angle differences between profile photo and live capture
// - Aging and appearance changes
const THRESHOLDS = {
  // Distance below this = high confidence match (auto check-in)
  // LOOSER: 0.85 corresponds to ~0.35 cosine distance
  HIGH_CONFIDENCE: 0.85,
  // Distance between HIGH and LOW = uncertain (ask confirmation)
  // LOOSER: 1.05 corresponds to ~0.55 cosine distance
  LOW_CONFIDENCE: 1.05,
  // Above LOW_CONFIDENCE = no match
};

// Recency weight factor for progressive learning
// Newer embeddings (higher index in array) get a small distance bonus
// This prioritizes recently captured faces over older ones
const RECENCY_BONUS = 0.02; // Each position from oldest reduces distance by this amount

// Face filtering thresholds for kiosk mode
// IMPORTANT: Visual capture zone is a SQUARE (70% of frame HEIGHT), not a rectangle!
// For 16:9 video, this square is centered horizontally
const KIOSK_THRESHOLDS = {
  // Square capture zone: 70% of frame HEIGHT (same as visual in EventCheckin.js)
  // The square is centered both horizontally and vertically
  CAPTURE_ZONE_SIZE: 0.7,  // Square side = 70% of frame height

  // Minimum face size as percentage of CAPTURE ZONE (not frame)
  // Face should fill at least 15% of the capture zone
  MIN_FACE_SIZE_RATIO: 0.15,

  // Minimum face area in pixels (absolute threshold)
  MIN_FACE_AREA: 5000,  // ~70x70 pixels minimum

  // Maximum number of faces before showing warning
  MAX_FACES_WARNING: 2,
};

/**
 * L2 normalize a descriptor (convert to unit vector)
 * This ensures consistent distance calculations regardless of original scale
 */
function normalizeDescriptor(descriptor) {
  if (!descriptor || descriptor.length === 0) return null;

  // Calculate L2 norm (magnitude)
  let sumSquares = 0;
  for (let i = 0; i < descriptor.length; i++) {
    sumSquares += descriptor[i] * descriptor[i];
  }
  const norm = Math.sqrt(sumSquares);

  // Avoid division by zero
  if (norm === 0) return descriptor;

  // Normalize to unit vector
  const normalized = new Float32Array(descriptor.length);
  for (let i = 0; i < descriptor.length; i++) {
    normalized[i] = descriptor[i] / norm;
  }
  return normalized;
}

class FaceRecognitionService {
  constructor() {
    this.human = null;
    this.isReady = false;
    this.isInitializing = false;
    this.memberDescriptors = []; // Array of { memberId, memberName, descriptors: [...], photoUrl }
    this.lastDetectionTime = 0;
    this.detectionInterval = 200; // ms between detections (5 FPS)
    this.onFaceDetected = null;
    this.onNoFaceDetected = null;
    this.onError = null;
    this.isRunning = false;
    this.animationFrameId = null;
    this.noFaceTimer = null;
    this.NO_FACE_TIMEOUT = 3000; // 3 seconds
  }

  /**
   * Initialize the Human library
   * Call this once when the kiosk loads
   */
  async initialize() {
    if (this.isReady) return true;
    if (this.isInitializing) {
      // Wait for initialization to complete
      while (this.isInitializing) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return this.isReady;
    }

    this.isInitializing = true;

    try {
      console.log('[FaceRecognition] Initializing Human library...');
      this.human = new Human(humanConfig);

      // Pre-load models
      await this.human.load();

      // Warm up the model with a dummy detection
      await this.human.warmup();

      this.isReady = true;
      console.log('[FaceRecognition] Ready! Backend:', this.human.tf.getBackend());
      return true;
    } catch (error) {
      console.error('[FaceRecognition] Initialization failed:', error);
      this.onError?.(error);
      return false;
    } finally {
      this.isInitializing = false;
    }
  }

  /**
   * Load member face descriptors for matching
   * @param {Array} members - Array of { memberId, memberName, descriptors: Array<Float32Array>, photoUrl }
   */
  loadMemberDescriptors(members) {
    this.memberDescriptors = members.map(m => ({
      memberId: m.memberId || m.member_id || m.id,
      memberName: m.memberName || m.member_name || m.full_name,
      descriptors: (m.descriptors || m.face_descriptors || []).map(d => {
        // Convert descriptor to Float32Array if needed
        let rawDescriptor;
        if (d.descriptor) {
          rawDescriptor = new Float32Array(d.descriptor);
        } else {
          rawDescriptor = new Float32Array(d);
        }
        // L2 normalize for consistent distance calculations
        return normalizeDescriptor(rawDescriptor);
      }).filter(d => d !== null),
      photoUrl: m.photoUrl || m.photo_url || m.photo_thumbnail_url,
    })).filter(m => m.descriptors.length > 0);

    // Log sample descriptor info for debugging
    if (this.memberDescriptors.length > 0) {
      const sample = this.memberDescriptors[0];
      const sampleDesc = sample.descriptors[0];
      console.log(`[FaceRecognition] Loaded ${this.memberDescriptors.length} members with face descriptors`);
      console.log(`[FaceRecognition] Sample: ${sample.memberName}, descriptor length: ${sampleDesc?.length || 0}, descriptors count: ${sample.descriptors.length}`);
    } else {
      console.log(`[FaceRecognition] No members with valid face descriptors loaded`);
    }
  }

  /**
   * Calculate Euclidean distance between two face descriptors
   */
  calculateDistance(descriptor1, descriptor2) {
    if (!descriptor1 || !descriptor2) return Infinity;
    if (descriptor1.length !== descriptor2.length) return Infinity;

    let sum = 0;
    for (let i = 0; i < descriptor1.length; i++) {
      const diff = descriptor1[i] - descriptor2[i];
      sum += diff * diff;
    }
    return Math.sqrt(sum);
  }

  /**
   * Find best matching member for a face descriptor
   * @param {Float32Array} descriptor - Face descriptor to match
   * @returns {{ member, distance, confidence } | null}
   */
  findBestMatch(descriptor) {
    if (!descriptor || this.memberDescriptors.length === 0) {
      console.log(`[FaceRecognition] findBestMatch: No descriptor or empty database (${this.memberDescriptors.length} members)`);
      return null;
    }

    let bestMatch = null;
    let bestDistance = Infinity;
    let bestDescriptorIndex = -1;

    for (const member of this.memberDescriptors) {
      // Compare against all stored descriptors for this member
      // Descriptors are ordered oldest-first, newest-last (from backend $slice: -5)
      const totalDescriptors = member.descriptors.length;

      for (let i = 0; i < totalDescriptors; i++) {
        const storedDescriptor = member.descriptors[i];
        const rawDistance = this.calculateDistance(descriptor, storedDescriptor);

        // Apply recency bonus: newer descriptors (higher index) get distance reduction
        // Index 0 = oldest (no bonus), Index 4 = newest (full bonus of 0.08)
        const recencyBonus = i * RECENCY_BONUS;
        const adjustedDistance = rawDistance - recencyBonus;

        if (adjustedDistance < bestDistance) {
          bestDistance = adjustedDistance;
          bestMatch = member;
          bestDescriptorIndex = i;
        }
      }
    }

    // Log the best match for debugging
    if (bestMatch) {
      const totalDesc = bestMatch.descriptors.length;
      const isRecent = bestDescriptorIndex >= totalDesc - 2;
      console.log(`[FaceRecognition] Best match: ${bestMatch.memberName}, distance: ${bestDistance.toFixed(4)}, descriptor #${bestDescriptorIndex + 1}/${totalDesc}${isRecent ? ' (recent)' : ''}, threshold: ${THRESHOLDS.LOW_CONFIDENCE}`);
    }

    if (!bestMatch || bestDistance > THRESHOLDS.LOW_CONFIDENCE) {
      if (bestMatch) {
        console.log(`[FaceRecognition] Match rejected - distance ${bestDistance.toFixed(4)} > threshold ${THRESHOLDS.LOW_CONFIDENCE}`);
      }
      return null;
    }

    // Calculate confidence level
    let confidence = 'low';
    if (bestDistance < THRESHOLDS.HIGH_CONFIDENCE) {
      confidence = 'high';
    }

    console.log(`[FaceRecognition] Match accepted: ${bestMatch.memberName}, confidence: ${confidence}`);

    return {
      member: bestMatch,
      distance: bestDistance,
      confidence,
    };
  }

  /**
   * Calculate the square capture zone bounds
   * The capture zone is a SQUARE with side = 70% of frame height, centered on frame
   * @param {number} frameWidth - Video frame width
   * @param {number} frameHeight - Video frame height
   * @returns {{ minX, maxX, minY, maxY, size }}
   */
  getCaptureZoneBounds(frameWidth, frameHeight) {
    // Square side = 70% of frame height
    const squareSize = frameHeight * KIOSK_THRESHOLDS.CAPTURE_ZONE_SIZE;

    // Center the square horizontally and vertically
    const centerX = frameWidth / 2;
    const centerY = frameHeight / 2;

    return {
      minX: centerX - squareSize / 2,
      maxX: centerX + squareSize / 2,
      minY: centerY - squareSize / 2,
      maxY: centerY + squareSize / 2,
      size: squareSize,
    };
  }

  /**
   * Check if a face is within the square capture zone
   * @param {Array} box - [x, y, width, height]
   * @param {number} frameWidth - Video frame width
   * @param {number} frameHeight - Video frame height
   * @returns {boolean}
   */
  isFaceCentered(box, frameWidth, frameHeight) {
    if (!box || box.length < 4) return false;

    const [x, y, width, height] = box;
    const faceCenterX = x + width / 2;
    const faceCenterY = y + height / 2;

    // Get the SQUARE capture zone (not rectangle!)
    const zone = this.getCaptureZoneBounds(frameWidth, frameHeight);

    const isInZone = faceCenterX >= zone.minX && faceCenterX <= zone.maxX &&
                     faceCenterY >= zone.minY && faceCenterY <= zone.maxY;

    if (!isInZone) {
      console.log(`[FaceRecognition] Face center (${Math.round(faceCenterX)}, ${Math.round(faceCenterY)}) outside capture zone: X[${Math.round(zone.minX)}-${Math.round(zone.maxX)}], Y[${Math.round(zone.minY)}-${Math.round(zone.maxY)}]`);
    }

    return isInZone;
  }

  /**
   * Check if a face is large enough relative to the capture zone
   * @param {Array} box - [x, y, width, height]
   * @param {number} frameWidth - Video frame width
   * @param {number} frameHeight - Video frame height
   * @returns {boolean}
   */
  isFaceLargeEnough(box, frameWidth, frameHeight) {
    if (!box || box.length < 4) return false;

    const [, , width, height] = box;
    const faceArea = width * height;

    // Get capture zone size
    const zone = this.getCaptureZoneBounds(frameWidth, frameHeight);

    // Check face size relative to capture zone (not frame)
    const relativeSize = width / zone.size;
    return relativeSize >= KIOSK_THRESHOLDS.MIN_FACE_SIZE_RATIO &&
           faceArea >= KIOSK_THRESHOLDS.MIN_FACE_AREA;
  }

  /**
   * Calculate face priority score (higher = better candidate)
   * Prioritizes: larger, more centered, higher confidence
   */
  calculateFaceScore(face, frameWidth, frameHeight) {
    const box = face.box || [0, 0, 0, 0];
    const [x, y, width, height] = box;

    // Size score: larger faces get higher score
    const sizeScore = (width * height) / (frameWidth * frameHeight);

    // Center score: faces closer to center get higher score
    const faceCenterX = x + width / 2;
    const faceCenterY = y + height / 2;
    const frameCenterX = frameWidth / 2;
    const frameCenterY = frameHeight / 2;
    const distanceFromCenter = Math.sqrt(
      Math.pow(faceCenterX - frameCenterX, 2) +
      Math.pow(faceCenterY - frameCenterY, 2)
    );
    const maxDistance = Math.sqrt(Math.pow(frameCenterX, 2) + Math.pow(frameCenterY, 2));
    const centerScore = 1 - (distanceFromCenter / maxDistance);

    // Confidence score
    const confidenceScore = face.score || 0;

    // Weighted combination: size (40%), center (40%), confidence (20%)
    return (sizeScore * 0.4) + (centerScore * 0.4) + (confidenceScore * 0.2);
  }

  /**
   * Detect face in video element (detection only, no embedding)
   * Embeddings are generated by backend InsightFace for matching
   * @param {HTMLVideoElement} videoElement
   * @returns {{ face, box, confidence, faceCount, hasMultipleFaces, isOffCenter } | null}
   */
  async detectFace(videoElement) {
    if (!this.isReady || !videoElement) return null;

    try {
      const result = await this.human.detect(videoElement);

      if (!result.face || result.face.length === 0) {
        return null;
      }

      const frameWidth = videoElement.videoWidth || 640;
      const frameHeight = videoElement.videoHeight || 480;
      const allFaces = result.face;
      const faceCount = allFaces.length;

      // Filter faces: must be within square capture zone and large enough
      const validFaces = allFaces.filter(face => {
        const box = face.box || [0, 0, 0, 0];
        const isCentered = this.isFaceCentered(box, frameWidth, frameHeight);
        const isLarge = this.isFaceLargeEnough(box, frameWidth, frameHeight);

        if (!isCentered || !isLarge) {
          console.log(`[FaceRecognition] Filtered out: centered=${isCentered}, large=${isLarge}, box=[${box.map(v => Math.round(v)).join(',')}]`);
        }

        return isCentered && isLarge;
      });

      if (validFaces.length === 0) {
        // Faces detected but none in valid region
        console.log(`[FaceRecognition] ${faceCount} faces detected, but none in center region or large enough`);
        return {
          face: null,
          box: null,
          confidence: 0,
          faceCount,
          hasMultipleFaces: faceCount >= KIOSK_THRESHOLDS.MAX_FACES_WARNING,
          isOffCenter: faceCount > 0,  // Faces exist but not centered
          filteredOut: true,
        };
      }

      // Sort valid faces by score and pick the best one
      const scoredFaces = validFaces.map(face => ({
        face,
        score: this.calculateFaceScore(face, frameWidth, frameHeight),
      })).sort((a, b) => b.score - a.score);

      const bestFace = scoredFaces[0].face;

      // Note: Embeddings are NOT generated anymore (description.enabled=false)
      // Backend InsightFace handles embedding generation for matching
      // We only return detection info (face present, bounding box, confidence)

      return {
        face: bestFace,
        box: bestFace.box, // [x, y, width, height]
        confidence: bestFace.score,
        faceCount,
        hasMultipleFaces: validFaces.length >= KIOSK_THRESHOLDS.MAX_FACES_WARNING,
        isOffCenter: false,
        filteredOut: false,
        // descriptor is intentionally not included - backend handles matching
      };
    } catch (error) {
      console.error('[FaceRecognition] Detection error:', error);
      return null;
    }
  }

  /**
   * Start continuous face detection on video stream
   * @param {HTMLVideoElement} videoElement
   * @param {Object} callbacks - { onMatch, onUncertain, onNoMatch, onError }
   */
  startDetection(videoElement, callbacks = {}) {
    if (this.isRunning) return;
    if (!this.isReady) {
      console.error('[FaceRecognition] Not initialized. Call initialize() first.');
      return;
    }

    this.isRunning = true;
    this.onFaceDetected = callbacks.onMatch;
    this.onNoFaceDetected = callbacks.onNoMatch;
    this.onError = callbacks.onError;

    let consecutiveNoFace = 0;
    const NO_FACE_THRESHOLD = 15; // ~3 seconds at 5 FPS

    const detectLoop = async () => {
      if (!this.isRunning) return;

      const now = Date.now();
      if (now - this.lastDetectionTime >= this.detectionInterval) {
        this.lastDetectionTime = now;

        try {
          const detection = await this.detectFace(videoElement);

          if (detection) {
            consecutiveNoFace = 0;

            // Clear no-face timer
            if (this.noFaceTimer) {
              clearTimeout(this.noFaceTimer);
              this.noFaceTimer = null;
            }

            // Try to match with database
            const match = this.findBestMatch(detection.descriptor);

            if (match) {
              if (match.confidence === 'high') {
                // High confidence - auto check-in
                callbacks.onMatch?.({
                  member: match.member,
                  distance: match.distance,
                  confidence: match.confidence,
                  faceBox: detection.box,
                  descriptor: detection.descriptor,
                });
              } else {
                // Uncertain - ask for confirmation
                callbacks.onUncertain?.({
                  member: match.member,
                  distance: match.distance,
                  confidence: match.confidence,
                  faceBox: detection.box,
                  descriptor: detection.descriptor,
                });
              }
            } else {
              // Face detected but no match in database
              callbacks.onUnknownFace?.({
                faceBox: detection.box,
                descriptor: detection.descriptor,
              });
            }
          } else {
            consecutiveNoFace++;

            // Start no-face timer after threshold
            if (consecutiveNoFace >= NO_FACE_THRESHOLD && !this.noFaceTimer) {
              this.noFaceTimer = setTimeout(() => {
                callbacks.onNoFace?.();
              }, 0);
            }
          }
        } catch (error) {
          console.error('[FaceRecognition] Detection loop error:', error);
          callbacks.onError?.(error);
        }
      }

      this.animationFrameId = requestAnimationFrame(detectLoop);
    };

    detectLoop();
    console.log('[FaceRecognition] Detection started');
  }

  /**
   * Stop continuous face detection
   */
  stopDetection() {
    this.isRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.noFaceTimer) {
      clearTimeout(this.noFaceTimer);
      this.noFaceTimer = null;
    }
    console.log('[FaceRecognition] Detection stopped');
  }

  /**
   * Generate face descriptor from an image URL
   * Used for processing member profile photos
   * @param {string} imageUrl - URL of the image
   * @param {Object} options - { minWidth, minHeight, minConfidence, returnQuality }
   * @returns {Object | Array | null} - If returnQuality: {descriptor, quality}, else Array
   */
  async generateDescriptorFromUrl(imageUrl, options = {}) {
    const {
      minWidth = 150,         // Minimum image width
      minHeight = 150,        // Minimum image height
      minConfidence = 0.6,    // Minimum face detection confidence
      minFaceSize = 80,       // Minimum face bounding box size (pixels)
      returnQuality = false,  // Whether to return quality metadata
    } = options;

    if (!this.isReady) {
      const initResult = await this.initialize();
      if (!initResult) {
        throw new Error('Face recognition service failed to initialize');
      }
    }

    // Create an image element
    const img = new Image();
    img.crossOrigin = 'anonymous';

    // Load image with better error handling
    try {
      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log(`[FaceRecognition] Image loaded: ${img.width}x${img.height}`);
          resolve();
        };
        img.onerror = (e) => {
          reject(new Error(`Failed to load image (CORS or network error): ${imageUrl.substring(0, 80)}...`));
        };
        img.src = imageUrl;
      });
    } catch (loadError) {
      console.error('[FaceRecognition] Image load error:', loadError.message);
      throw loadError;
    }

    // Check minimum image dimensions
    if (img.width < minWidth || img.height < minHeight) {
      const reason = `Image too small: ${img.width}x${img.height} (min: ${minWidth}x${minHeight})`;
      console.warn(`[FaceRecognition] ${reason}`);
      if (returnQuality) {
        return { descriptor: null, quality: { success: false, reason, imageSize: { width: img.width, height: img.height } } };
      }
      return null;
    }

    // Detect face in image
    try {
      const result = await this.human.detect(img);

      if (!result.face || result.face.length === 0) {
        const reason = `No face detected in image (${img.width}x${img.height})`;
        console.warn(`[FaceRecognition] ${reason}`);
        if (returnQuality) {
          return { descriptor: null, quality: { success: false, reason, imageSize: { width: img.width, height: img.height } } };
        }
        return null;
      }

      const face = result.face[0];
      const faceBox = face.box || [0, 0, 0, 0];
      const faceWidth = faceBox[2];
      const faceHeight = faceBox[3];
      const confidence = face.score || 0;

      console.log(`[FaceRecognition] Face detected: confidence=${confidence.toFixed(2)}, size=${Math.round(faceWidth)}x${Math.round(faceHeight)}, box=${JSON.stringify(faceBox.map(v => Math.round(v)))}`);

      // Check minimum confidence
      if (confidence < minConfidence) {
        const reason = `Low confidence: ${confidence.toFixed(2)} (min: ${minConfidence})`;
        console.warn(`[FaceRecognition] ${reason}`);
        if (returnQuality) {
          return { descriptor: null, quality: { success: false, reason, confidence, faceSize: { width: faceWidth, height: faceHeight } } };
        }
        return null;
      }

      // Check minimum face size
      if (faceWidth < minFaceSize || faceHeight < minFaceSize) {
        const reason = `Face too small: ${Math.round(faceWidth)}x${Math.round(faceHeight)} (min: ${minFaceSize}x${minFaceSize})`;
        console.warn(`[FaceRecognition] ${reason}`);
        if (returnQuality) {
          return { descriptor: null, quality: { success: false, reason, confidence, faceSize: { width: faceWidth, height: faceHeight } } };
        }
        return null;
      }

      if (!face.embedding || face.embedding.length === 0) {
        const reason = 'Face found but no embedding generated';
        console.warn(`[FaceRecognition] ${reason}`);
        if (returnQuality) {
          return { descriptor: null, quality: { success: false, reason, confidence, faceSize: { width: faceWidth, height: faceHeight } } };
        }
        return null;
      }

      const descriptor = Array.from(face.embedding);

      if (returnQuality) {
        return {
          descriptor,
          quality: {
            success: true,
            confidence,
            imageSize: { width: img.width, height: img.height },
            faceSize: { width: faceWidth, height: faceHeight },
            faceRatio: (faceWidth * faceHeight) / (img.width * img.height), // Face area ratio
          }
        };
      }

      return descriptor;
    } catch (detectError) {
      console.error('[FaceRecognition] Face detection error:', detectError);
      throw new Error(`Face detection failed: ${detectError.message}`);
    }
  }

  /**
   * Capture current frame from video as base64 (for saving check-in photos)
   * @param {HTMLVideoElement} videoElement
   * @returns {string} Base64 encoded JPEG image
   */
  captureFrame(videoElement) {
    if (!videoElement) return null;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = videoElement.videoWidth;
      canvas.height = videoElement.videoHeight;

      // Use willReadFrequently: true for better performance when doing
      // multiple readback operations (getImageData/toDataURL)
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(videoElement, 0, 0);

      // Return as base64 JPEG (smaller file size)
      return canvas.toDataURL('image/jpeg', 0.8);
    } catch (error) {
      console.error('[FaceRecognition] Error capturing frame:', error);
      return null;
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    this.stopDetection();
    this.memberDescriptors = [];
    this.isReady = false;
    // Note: Human library doesn't have explicit dispose method
    this.human = null;
  }
}

// Export singleton instance
export const faceRecognitionService = new FaceRecognitionService();

// Export thresholds for use in UI
export const FACE_MATCH_THRESHOLDS = THRESHOLDS;

export default faceRecognitionService;
