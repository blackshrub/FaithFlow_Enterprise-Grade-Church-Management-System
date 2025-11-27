/**
 * Media Upload Service for Community Messages
 *
 * Handles:
 * - Image/video/document upload to SeaweedFS via backend
 * - Upload progress tracking
 * - Image compression before upload
 * - Thumbnail generation
 */

import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { api } from '@/services/api';
import { API_BASE_URL } from '@/constants/api';
import type { MediaAttachment } from '@/components/chat/AttachmentPicker';
import type { MessageMedia } from '@/types/communities';

// =============================================================================
// TYPES
// =============================================================================

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

export interface UploadResult {
  success: boolean;
  media?: MessageMedia;
  error?: string;
  // Direct access to media properties for convenience
  fid?: string;
  url?: string;
}

export type UploadProgressCallback = (progress: UploadProgress) => void;

// =============================================================================
// CONFIG
// =============================================================================

const MAX_IMAGE_DIMENSION = 1920;
const IMAGE_QUALITY = 0.8;
const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024,    // 10MB
  video: 100 * 1024 * 1024,   // 100MB
  document: 25 * 1024 * 1024, // 25MB
  audio: 16 * 1024 * 1024,    // 16MB (voice messages)
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Compress image before upload
 */
async function compressImage(uri: string): Promise<{ uri: string; width: number; height: number }> {
  try {
    // Get image info first
    const result = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: MAX_IMAGE_DIMENSION } }],
      {
        compress: IMAGE_QUALITY,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );

    return {
      uri: result.uri,
      width: result.width,
      height: result.height,
    };
  } catch (error) {
    console.error('[MediaUpload] Image compression failed:', error);
    // Return original if compression fails
    return { uri, width: 0, height: 0 };
  }
}

/**
 * Get file info from URI
 */
async function getFileInfo(uri: string): Promise<{ size: number; exists: boolean }> {
  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists && 'size' in info) {
      return { size: info.size || 0, exists: true };
    }
    return { size: 0, exists: info.exists };
  } catch {
    return { size: 0, exists: false };
  }
}

/**
 * Validate file size
 */
function validateFileSize(size: number, type: 'image' | 'video' | 'document' | 'audio'): string | null {
  const maxSize = MAX_FILE_SIZE[type];
  if (size > maxSize) {
    const maxMB = Math.round(maxSize / (1024 * 1024));
    return `File too large. Maximum size is ${maxMB}MB for ${type}s.`;
  }
  return null;
}

// =============================================================================
// UPLOAD FUNCTIONS
// =============================================================================

/**
 * Upload media to backend (which then uploads to SeaweedFS)
 */
export async function uploadMedia(
  communityId: string,
  attachment: MediaAttachment,
  onProgress?: UploadProgressCallback
): Promise<UploadResult> {
  try {
    let uploadUri = attachment.uri;
    let width = attachment.width;
    let height = attachment.height;

    // Compress images before upload
    if (attachment.type === 'image') {
      const compressed = await compressImage(attachment.uri);
      uploadUri = compressed.uri;
      width = compressed.width || width;
      height = compressed.height || height;
    }

    // Get file info
    const fileInfo = await getFileInfo(uploadUri);
    if (!fileInfo.exists) {
      return { success: false, error: 'File not found' };
    }

    // Validate file size
    const sizeError = validateFileSize(fileInfo.size, attachment.type);
    if (sizeError) {
      return { success: false, error: sizeError };
    }

    // Report initial progress
    onProgress?.({ loaded: 0, total: fileInfo.size, percentage: 0 });

    // Create form data
    const formData = new FormData();

    // Append file
    formData.append('file', {
      uri: uploadUri,
      type: attachment.mimeType,
      name: attachment.fileName,
    } as any);

    // Append metadata
    formData.append('community_id', communityId);
    formData.append('media_type', attachment.type);
    if (width) formData.append('width', String(width));
    if (height) formData.append('height', String(height));
    if (attachment.duration) formData.append('duration', String(attachment.duration));

    // Upload using XMLHttpRequest for progress tracking
    const result = await uploadWithProgress(
      `/api/mobile/communities/${communityId}/upload-media`,
      formData,
      onProgress
    );

    if (!result.success) {
      return { success: false, error: result.error || 'Upload failed' };
    }

    // Return the media object
    return {
      success: true,
      media: result.data?.media,
    };

  } catch (error) {
    console.error('[MediaUpload] Upload failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Upload failed',
    };
  }
}

/**
 * Upload with XMLHttpRequest for progress tracking
 */
async function uploadWithProgress(
  endpoint: string,
  formData: FormData,
  onProgress?: UploadProgressCallback
): Promise<{ success: boolean; data?: any; error?: string }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const url = `${API_BASE_URL}${endpoint}`;

    // Track upload progress
    xhr.upload.addEventListener('progress', (event) => {
      if (event.lengthComputable && onProgress) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        });
      }
    });

    // Handle completion
    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve({ success: true, data });
        } catch {
          resolve({ success: true, data: xhr.responseText });
        }
      } else {
        let errorMessage = 'Upload failed';
        try {
          const error = JSON.parse(xhr.responseText);
          errorMessage = error.detail || error.message || errorMessage;
        } catch {
          // Use default error message
        }
        resolve({ success: false, error: errorMessage });
      }
    });

    // Handle errors
    xhr.addEventListener('error', () => {
      resolve({ success: false, error: 'Network error during upload' });
    });

    xhr.addEventListener('abort', () => {
      resolve({ success: false, error: 'Upload cancelled' });
    });

    // Open and send
    xhr.open('POST', url);

    // Add auth header (get token from storage)
    const token = getAuthToken();
    if (token) {
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    }

    xhr.send(formData);
  });
}

/**
 * Get auth token from secure storage
 * This should be synchronized with your auth store
 */
function getAuthToken(): string | null {
  // This will be populated by the auth store
  // We use a global variable set by the auth initialization
  return (global as any).__FAITHFLOW_AUTH_TOKEN__ || null;
}

/**
 * Set auth token for media uploads
 * Called from auth store when token changes
 */
export function setMediaUploadAuthToken(token: string | null): void {
  (global as any).__FAITHFLOW_AUTH_TOKEN__ = token;
}

// =============================================================================
// DOWNLOAD FUNCTIONS
// =============================================================================

/**
 * Get media URL from SeaweedFS file ID
 */
export function getMediaUrl(seaweedFsFid: string): string {
  // The backend proxies SeaweedFS requests
  return `${API_BASE_URL}/api/media/${seaweedFsFid}`;
}

/**
 * Download media to local cache
 */
export async function downloadMedia(
  fid: string,
  fileName: string,
  onProgress?: UploadProgressCallback
): Promise<{ success: boolean; localUri?: string; error?: string }> {
  try {
    const url = getMediaUrl(fid);
    const localUri = `${FileSystem.cacheDirectory}${fileName}`;

    // Check if already cached
    const cachedInfo = await FileSystem.getInfoAsync(localUri);
    if (cachedInfo.exists) {
      return { success: true, localUri };
    }

    // Download with progress
    const downloadResumable = FileSystem.createDownloadResumable(
      url,
      localUri,
      {},
      (downloadProgress) => {
        if (onProgress) {
          const percentage = Math.round(
            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
          );
          onProgress({
            loaded: downloadProgress.totalBytesWritten,
            total: downloadProgress.totalBytesExpectedToWrite,
            percentage,
          });
        }
      }
    );

    const result = await downloadResumable.downloadAsync();

    if (result?.uri) {
      return { success: true, localUri: result.uri };
    }

    return { success: false, error: 'Download failed' };

  } catch (error) {
    console.error('[MediaUpload] Download failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Download failed',
    };
  }
}

export default {
  uploadMedia,
  downloadMedia,
  getMediaUrl,
  setMediaUploadAuthToken,
};
