/**
 * Member utility functions
 *
 * Provides helper functions for working with member data,
 * including photo URL resolution with SeaweedFS support.
 */

/**
 * Get the best available photo URL from a member object.
 * Prefers SeaweedFS URL over legacy base64.
 *
 * Priority order:
 * 1. photo_url (SeaweedFS URL)
 * 2. photo (if URL)
 * 3. photo_base64 (legacy, converted to data URI)
 *
 * @param {Object} member - Member object
 * @param {string} member.photo_url - SeaweedFS URL (preferred)
 * @param {string} member.photo - Photo URL or base64
 * @param {string} member.photo_base64 - Legacy base64 photo
 * @returns {string|null} Photo URL or data URI, or null if no photo
 */
export function getMemberPhotoUrl(member) {
  if (!member) return null;

  // Check for SeaweedFS URL first (preferred)
  if (member.photo_url && member.photo_url.startsWith('http')) {
    return member.photo_url;
  }

  // Check for photo field (might be URL or base64)
  if (member.photo) {
    if (member.photo.startsWith('http')) {
      return member.photo;
    }
    if (member.photo.startsWith('data:')) {
      return member.photo;
    }
    // Assume raw base64
    return `data:image/jpeg;base64,${member.photo}`;
  }

  // Fall back to legacy photo_base64
  if (member.photo_base64) {
    if (member.photo_base64.startsWith('http')) {
      return member.photo_base64;
    }
    if (member.photo_base64.startsWith('data:')) {
      return member.photo_base64;
    }
    return `data:image/jpeg;base64,${member.photo_base64}`;
  }

  return null;
}

/**
 * Get member thumbnail URL.
 *
 * @param {Object} member - Member object
 * @returns {string|null} Thumbnail URL or null
 */
export function getMemberThumbnailUrl(member) {
  if (!member) return null;
  return member.photo_thumbnail_url || member.photo_thumbnail || null;
}

/**
 * Check if member has a photo.
 *
 * @param {Object} member - Member object
 * @returns {boolean} True if member has any photo
 */
export function hasMemberPhoto(member) {
  if (!member) return false;
  return !!(member.photo_url || member.photo || member.photo_base64);
}

/**
 * Normalize photo source for display.
 * Handles both SeaweedFS URLs and base64 strings.
 *
 * @param {string} photo - Photo URL or base64 string
 * @returns {string|null} Normalized photo source for img src
 */
export function normalizePhotoSrc(photo) {
  if (!photo) return null;

  // Already a URL
  if (photo.startsWith('http')) {
    return photo;
  }

  // Already has data URI prefix
  if (photo.startsWith('data:')) {
    return photo;
  }

  // Raw base64 string
  return `data:image/jpeg;base64,${photo}`;
}

/**
 * Get initials from member name.
 *
 * @param {Object} member - Member object
 * @returns {string} Initials (e.g., "JD" for John Doe)
 */
export function getMemberInitials(member) {
  if (!member) return '?';

  const name = member.full_name || `${member.first_name || ''} ${member.last_name || ''}`.trim();

  if (!name) return '?';

  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export default {
  getMemberPhotoUrl,
  getMemberThumbnailUrl,
  hasMemberPhoto,
  normalizePhotoSrc,
  getMemberInitials,
};
