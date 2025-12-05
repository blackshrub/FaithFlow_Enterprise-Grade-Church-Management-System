/**
 * Face Recognition Service using @vladmandic/human
 *
 * Optimized for church kiosk check-in:
 * - Fast detection (~50ms per frame)
 * - Accurate face recognition (1024D embeddings from faceres.json model)
 * - Parallel QR + Face detection support
 * - Progressive photo collection for improved accuracy
 *
 * Configuration tuned for:
 * - Speed over full feature set
 * - Face detection + recognition only (no emotion, age, etc.)
 * - WebGL backend for GPU acceleration
 */

import { Human } from '@vladmandic/human';

// Optimized configuration for face recognition kiosk
const humanConfig = {
  // Use WebGL for GPU acceleration, fallback to WASM
  backend: 'webgl',

  // Model base path - will be loaded from CDN or local
  modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',

  // Caching for faster subsequent loads
  cacheModels: true,

  // Debug mode off for production
  debug: false,

  // Only enable face detection and recognition
  face: {
    enabled: true,

    // Detector configuration - optimized for speed
    detector: {
      enabled: true,
      // Use 'blazeface' for fastest, 'ssd' for better accuracy
      modelPath: 'blazeface-back.json',
      rotation: true,          // Handle rotated faces
      maxDetected: 1,          // Only detect 1 face (kiosk use case)
      minConfidence: 0.5,      // Minimum confidence to detect
      iouThreshold: 0.3,       // Non-max suppression threshold
      return: true,
    },

    // Mesh disabled - not needed for recognition
    mesh: {
      enabled: false,
    },

    // Iris disabled - not needed
    iris: {
      enabled: false,
    },

    // Face description/embedding - CRITICAL for recognition
    description: {
      enabled: true,
      modelPath: 'faceres.json',  // FaceRes model for 512D embeddings
      minConfidence: 0.5,
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

  // Filter configuration for smoother detection
  filter: {
    enabled: true,
    equalization: false,      // Don't equalize histogram
    flip: false,              // Don't flip image
    return: true,
  },
};

// Thresholds for face matching (tuned for L2-normalized 1024D embeddings)
// After normalization, Euclidean distance range is 0-2:
// - 0 = identical vectors
// - ~0.6-0.9 = same person, different image
// - ~1.0-1.2 = uncertain
// - >1.2 = different person
const THRESHOLDS = {
  // Distance below this = high confidence match (auto check-in)
  HIGH_CONFIDENCE: 0.8,
  // Distance between HIGH and LOW = uncertain (ask confirmation)
  LOW_CONFIDENCE: 1.1,
  // Above LOW_CONFIDENCE = no match
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

    for (const member of this.memberDescriptors) {
      // Compare against all stored descriptors for this member
      for (const storedDescriptor of member.descriptors) {
        const distance = this.calculateDistance(descriptor, storedDescriptor);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestMatch = member;
        }
      }
    }

    // Log the best match for debugging
    if (bestMatch) {
      console.log(`[FaceRecognition] Best match: ${bestMatch.memberName}, distance: ${bestDistance.toFixed(4)}, threshold: ${THRESHOLDS.LOW_CONFIDENCE}`);
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
   * Detect face and get descriptor from video element
   * @param {HTMLVideoElement} videoElement
   * @returns {{ face, descriptor, box } | null}
   */
  async detectFace(videoElement) {
    if (!this.isReady || !videoElement) return null;

    try {
      const result = await this.human.detect(videoElement);

      if (!result.face || result.face.length === 0) {
        return null;
      }

      const face = result.face[0];

      // Check if we got a valid face with embedding
      if (!face.embedding || face.embedding.length === 0) {
        return null;
      }

      // L2 normalize the descriptor for consistent distance calculations
      const rawDescriptor = new Float32Array(face.embedding);
      const normalizedDescriptor = normalizeDescriptor(rawDescriptor);

      return {
        face,
        descriptor: normalizedDescriptor,
        box: face.box, // [x, y, width, height]
        confidence: face.score,
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
   * @returns {Float32Array | null}
   */
  async generateDescriptorFromUrl(imageUrl) {
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

    // Detect face in image
    try {
      const result = await this.human.detect(img);

      if (!result.face || result.face.length === 0) {
        console.warn(`[FaceRecognition] No face detected in image (${img.width}x${img.height}):`, imageUrl.substring(0, 80));
        return null;
      }

      const face = result.face[0];
      console.log(`[FaceRecognition] Face detected: confidence=${face.score?.toFixed(2)}, box=${JSON.stringify(face.box?.map(v => Math.round(v)))}`);

      if (!face.embedding || face.embedding.length === 0) {
        console.warn('[FaceRecognition] Face found but no embedding generated:', imageUrl.substring(0, 80));
        return null;
      }

      return Array.from(face.embedding); // Convert to regular array for JSON serialization
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

      const ctx = canvas.getContext('2d');
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
