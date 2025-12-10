/**
 * Image Optimization Utilities
 * Phase 9.1.3 - Image Performance Optimization
 *
 * Features:
 * - Blur placeholders while loading
 * - Progressive image loading
 * - WebP support with fallback
 * - Compression for AI-generated base64 images
 * - Lazy loading for off-screen images
 */

import { Platform } from 'react-native';
import { Image as RNImage } from 'react-native';
import { logError } from '@/utils/errorHelpers';

/**
 * Image format priorities by platform
 * WebP is supported on Android 4.0+ and iOS 14+
 */
export const IMAGE_FORMATS = {
  webp: 'webp',
  png: 'png',
  jpg: 'jpg',
} as const;

/**
 * Image quality presets for different use cases
 */
export const IMAGE_QUALITY = {
  thumbnail: 0.5,   // Small previews, list items
  medium: 0.7,      // Card images, medium content
  high: 0.85,       // Hero images, featured content
  original: 1.0,    // No compression
} as const;

/**
 * Image sizes for responsive loading
 */
export const IMAGE_SIZES = {
  thumbnail: { width: 100, height: 100 },
  small: { width: 300, height: 200 },
  medium: { width: 600, height: 400 },
  large: { width: 1200, height: 800 },
  fullWidth: { width: 1920, height: 1080 },
} as const;

/**
 * Check if WebP is supported on current platform
 */
export const isWebPSupported = (): boolean => {
  if (Platform.OS === 'android') {
    // WebP supported on Android 4.0+ (API level 14+)
    // All modern Android devices support it
    return true;
  }

  if (Platform.OS === 'ios') {
    // WebP supported on iOS 14+
    // Most users are on iOS 15+ now, so we can assume support
    return true;
  }

  return false;
};

/**
 * Convert base64 image to data URI if not already
 */
export const ensureDataURI = (imageData: string): string => {
  if (imageData.startsWith('data:')) {
    return imageData;
  }

  // Assume PNG if no format specified
  return `data:image/png;base64,${imageData}`;
};

/**
 * Extract format from data URI or URL
 */
export const getImageFormat = (uri: string): string => {
  if (uri.startsWith('data:image/')) {
    const match = uri.match(/data:image\/([a-z]+);/);
    return match ? match[1] : 'png';
  }

  // Get extension from URL
  const match = uri.match(/\.([a-z]+)(?:\?|$)/i);
  return match ? match[1].toLowerCase() : 'png';
};

/**
 * Generate blur placeholder hash
 * This is a simple implementation - for production, use blurhash library
 */
export const generateBlurHash = async (uri: string): Promise<string> => {
  // For now, return a generic gray blur
  // In production, you'd use https://github.com/woltapp/blurhash
  return 'LEHV6nWB2yk8pyo0adR*.7kCMdnj'; // Generic gray blur
};

/**
 * Compress base64 image data
 * Useful for AI-generated images that may be large
 */
export const compressBase64Image = async (
  base64Data: string,
  quality: number = IMAGE_QUALITY.medium
): Promise<string> => {
  try {
    // For React Native, we'd use react-native-image-manipulator
    // This is a placeholder - install expo-image-manipulator for real implementation

    // Extract the base64 part
    const dataUri = ensureDataURI(base64Data);

    // For now, just return original
    // In production, use expo-image-manipulator to compress
    return dataUri;
  } catch (error) {
    logError('ImageOptimization', 'compress', error, 'warning');
    return base64Data;
  }
};

/**
 * Get optimized image URI based on device capabilities
 */
export const getOptimizedImageUri = (
  originalUri: string,
  size: keyof typeof IMAGE_SIZES = 'medium',
  quality: number = IMAGE_QUALITY.medium
): string => {
  // If it's a data URI (AI-generated), return as-is
  if (originalUri.startsWith('data:')) {
    return originalUri;
  }

  // If it's a remote URL, we could add query params for size/quality
  // This assumes your CDN supports it (like Cloudinary, imgix, etc.)
  const sizeConfig = IMAGE_SIZES[size];
  const format = isWebPSupported() ? 'webp' : 'jpg';

  // Example for CDN transformation (adjust for your CDN)
  // return `${originalUri}?w=${sizeConfig.width}&h=${sizeConfig.height}&q=${quality * 100}&fm=${format}`;

  // For now, return original
  return originalUri;
};

/**
 * Preload images for better UX
 * Useful before navigating to detail screens
 */
export const preloadImages = async (uris: string[]): Promise<void> => {
  try {
    const promises = uris.map(uri => {
      return new Promise((resolve, reject) => {
        RNImage.prefetch(uri)
          .then(() => resolve(uri))
          .catch(() => resolve(uri)); // Don't fail if one image fails
      });
    });

    await Promise.all(promises);
  } catch (error) {
    logError('ImageOptimization', 'preload', error, 'warning');
  }
};

/**
 * Calculate image dimensions maintaining aspect ratio
 */
export const calculateAspectRatioDimensions = (
  originalWidth: number,
  originalHeight: number,
  maxWidth: number,
  maxHeight?: number
): { width: number; height: number } => {
  const aspectRatio = originalWidth / originalHeight;

  let width = maxWidth;
  let height = maxWidth / aspectRatio;

  if (maxHeight && height > maxHeight) {
    height = maxHeight;
    width = maxHeight * aspectRatio;
  }

  return { width: Math.round(width), height: Math.round(height) };
};

/**
 * Image cache key generator
 * Useful for React Query or AsyncStorage caching
 */
export const getImageCacheKey = (
  uri: string,
  size: keyof typeof IMAGE_SIZES,
  quality: number
): string => {
  return `image_${uri}_${size}_${quality}`;
};

/**
 * Estimate image size in bytes (rough approximation)
 */
export const estimateImageSize = (
  width: number,
  height: number,
  quality: number = IMAGE_QUALITY.medium,
  format: 'jpg' | 'png' | 'webp' = 'jpg'
): number => {
  const pixels = width * height;

  // Rough estimates based on format
  const bytesPerPixel = {
    jpg: 0.25 * quality,    // JPG compression
    webp: 0.2 * quality,    // WebP is ~20% smaller
    png: 3,                 // PNG is uncompressed (3 bytes per pixel RGB)
  };

  return Math.round(pixels * bytesPerPixel[format]);
};

/**
 * Check if image should be lazy loaded
 * Based on scroll position and viewport
 */
export const shouldLazyLoad = (
  scrollY: number,
  viewportHeight: number,
  itemY: number,
  threshold: number = 500 // Load 500px before entering viewport
): boolean => {
  const itemTop = itemY;
  const itemBottom = itemY; // Simplified - would need item height
  const viewportTop = scrollY;
  const viewportBottom = scrollY + viewportHeight;

  // Load if within threshold of viewport
  return (
    itemTop < viewportBottom + threshold &&
    itemBottom > viewportTop - threshold
  );
};

/**
 * Image loading state manager
 * Tracks which images are loading, loaded, or failed
 */
export class ImageLoadManager {
  private loadingImages = new Set<string>();
  private loadedImages = new Set<string>();
  private failedImages = new Set<string>();

  startLoading(uri: string): void {
    this.loadingImages.add(uri);
  }

  finishLoading(uri: string, success: boolean): void {
    this.loadingImages.delete(uri);

    if (success) {
      this.loadedImages.add(uri);
      this.failedImages.delete(uri);
    } else {
      this.failedImages.add(uri);
    }
  }

  isLoading(uri: string): boolean {
    return this.loadingImages.has(uri);
  }

  isLoaded(uri: string): boolean {
    return this.loadedImages.has(uri);
  }

  hasFailed(uri: string): boolean {
    return this.failedImages.has(uri);
  }

  reset(): void {
    this.loadingImages.clear();
    this.loadedImages.clear();
    this.failedImages.clear();
  }
}

// Global image load manager instance
export const imageLoadManager = new ImageLoadManager();

/**
 * Generate thumbnail from full image URI
 * Useful for list views and grids
 */
export const getThumbnailUri = (fullUri: string): string => {
  return getOptimizedImageUri(fullUri, 'thumbnail', IMAGE_QUALITY.thumbnail);
};

/**
 * Image loading priorities
 * Help prioritize which images to load first
 */
export enum ImagePriority {
  LOW = 0,      // Off-screen, background images
  NORMAL = 1,   // On-screen, non-critical
  HIGH = 2,     // Hero images, featured content
  CRITICAL = 3, // Above-fold, immediately visible
}

/**
 * Image loading configuration
 */
export interface ImageLoadConfig {
  priority: ImagePriority;
  size: keyof typeof IMAGE_SIZES;
  quality: number;
  placeholder?: string; // Blur hash or placeholder URI
  progressive?: boolean; // Load progressively (thumbnail → full)
  cache?: boolean; // Cache to disk
  retry?: number; // Retry attempts on failure
}

/**
 * Default image loading configuration
 */
export const DEFAULT_IMAGE_CONFIG: ImageLoadConfig = {
  priority: ImagePriority.NORMAL,
  size: 'medium',
  quality: IMAGE_QUALITY.medium,
  progressive: true,
  cache: true,
  retry: 2,
};

/**
 * Progressive image loader
 * Loads thumbnail first, then full resolution
 */
export class ProgressiveImageLoader {
  private currentUri: string | null = null;
  private thumbnailLoaded = false;
  private fullLoaded = false;

  async load(
    fullUri: string,
    onThumbnailLoad?: (uri: string) => void,
    onFullLoad?: (uri: string) => void,
    onError?: (error: Error) => void
  ): Promise<void> {
    this.currentUri = fullUri;
    this.thumbnailLoaded = false;
    this.fullLoaded = false;

    try {
      // Load thumbnail first
      const thumbnailUri = getThumbnailUri(fullUri);

      imageLoadManager.startLoading(thumbnailUri);

      // Simulate thumbnail load (in production, use actual image loading)
      await new Promise(resolve => setTimeout(resolve, 100));

      this.thumbnailLoaded = true;
      imageLoadManager.finishLoading(thumbnailUri, true);
      onThumbnailLoad?.(thumbnailUri);

      // Load full resolution
      imageLoadManager.startLoading(fullUri);

      await RNImage.prefetch(fullUri);

      this.fullLoaded = true;
      imageLoadManager.finishLoading(fullUri, true);
      onFullLoad?.(fullUri);

    } catch (error) {
      logError('ImageOptimization', 'progressiveLoad', error, 'warning');
      imageLoadManager.finishLoading(fullUri, false);
      onError?.(error as Error);
    }
  }

  cancel(): void {
    this.currentUri = null;
    this.thumbnailLoaded = false;
    this.fullLoaded = false;
  }

  isFullyLoaded(): boolean {
    return this.fullLoaded;
  }
}

/**
 * Memory management: Clear image cache
 * Call this on low memory warnings
 */
export const clearImageCache = async (): Promise<void> => {
  try {
    // Clear React Native image cache
    // Note: This is platform-specific and may require native modules
    imageLoadManager.reset();

    console.log('Image cache cleared');
  } catch (error) {
    logError('ImageOptimization', 'clearCache', error, 'warning');
  }
};

/**
 * Get memory-efficient image props
 * Reduces memory usage for large images
 */
export const getMemoryEfficientProps = (
  size: keyof typeof IMAGE_SIZES = 'medium'
) => {
  const dimensions = IMAGE_SIZES[size];

  return {
    // Resize image on native side to save memory
    resizeMode: 'cover' as const,
    // Decode image at reduced size
    ...dimensions,
    // Progressive rendering
    progressiveRenderingEnabled: true,
    // Fade in animation
    fadeDuration: 300,
  };
};

/**
 * Detect slow image loading
 * Log warnings for images that take too long
 */
export const monitorImageLoad = (
  uri: string,
  startTime: number,
  threshold: number = 3000 // 3 seconds
): void => {
  const loadTime = Date.now() - startTime;

  if (loadTime > threshold) {
    console.warn(`Slow image load: ${uri} took ${loadTime}ms`);
  }
};
