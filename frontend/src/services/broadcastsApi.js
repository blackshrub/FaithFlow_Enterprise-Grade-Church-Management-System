/**
 * Broadcast Campaigns API Service
 *
 * Handles all API calls for push notification broadcast management.
 */

import api from './api';

const BASE_URL = '/api/broadcasts';

// =============================================================================
// CAMPAIGN CRUD
// =============================================================================

/**
 * List broadcast campaigns with pagination and filtering
 * @param {Object} params - Query parameters
 * @param {string} [params.status] - Filter by status (draft, scheduled, sending, sent, cancelled, failed)
 * @param {string} [params.search] - Search in title/body
 * @param {number} [params.limit=50] - Page size
 * @param {number} [params.offset=0] - Offset for pagination
 */
export const getCampaigns = (params = {}) =>
  api.get(`${BASE_URL}/`, { params });

/**
 * Get a single campaign by ID
 * @param {string} id - Campaign ID
 */
export const getCampaign = (id) =>
  api.get(`${BASE_URL}/${id}`);

/**
 * Create a new broadcast campaign (draft)
 * @param {Object} data - Campaign data
 * @param {string} data.title - Notification title (max 100 chars)
 * @param {string} data.body - Notification body (max 500 chars)
 * @param {Object} [data.audience] - Audience targeting configuration
 * @param {string} [data.send_type='immediate'] - 'immediate' or 'scheduled'
 * @param {string} [data.scheduled_at] - ISO datetime for scheduled send
 * @param {string} [data.action_type='none'] - Deep link action type
 * @param {Object} [data.action_data] - Deep link configuration
 */
export const createCampaign = (data) =>
  api.post(`${BASE_URL}/`, data);

/**
 * Update an existing campaign
 * @param {string} id - Campaign ID
 * @param {Object} data - Fields to update
 */
export const updateCampaign = (id, data) =>
  api.put(`${BASE_URL}/${id}`, data);

/**
 * Delete a draft campaign
 * @param {string} id - Campaign ID
 */
export const deleteCampaign = (id) =>
  api.delete(`${BASE_URL}/${id}`);

// =============================================================================
// CAMPAIGN ACTIONS
// =============================================================================

/**
 * Send or schedule a campaign
 * @param {string} id - Campaign ID
 */
export const sendCampaign = (id) =>
  api.post(`${BASE_URL}/${id}/send`);

/**
 * Cancel a scheduled campaign
 * @param {string} id - Campaign ID
 */
export const cancelCampaign = (id) =>
  api.post(`${BASE_URL}/${id}/cancel`);

/**
 * Duplicate a campaign as a new draft
 * @param {string} id - Campaign ID
 */
export const duplicateCampaign = (id) =>
  api.post(`${BASE_URL}/${id}/duplicate`);

/**
 * Send test notification to admin's device
 * @param {string} id - Campaign ID
 */
export const testSendCampaign = (id) =>
  api.post(`${BASE_URL}/${id}/test`);

// =============================================================================
// IMAGE UPLOAD
// =============================================================================

/**
 * Upload an image for the campaign
 * @param {string} id - Campaign ID
 * @param {File} file - Image file
 */
export const uploadCampaignImage = (id, file) => {
  const formData = new FormData();
  formData.append('file', file);
  return api.post(`${BASE_URL}/${id}/upload-image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
};

/**
 * Remove image from campaign
 * @param {string} id - Campaign ID
 */
export const deleteCampaignImage = (id) =>
  api.delete(`${BASE_URL}/${id}/image`);

// =============================================================================
// AUDIENCE ESTIMATION
// =============================================================================

/**
 * Estimate audience size for targeting criteria
 * @param {Object} audience - Audience configuration
 * @param {string} audience.target_type - 'all', 'groups', 'status', 'demographics', 'custom'
 * @param {string[]} [audience.group_ids] - Cell group IDs
 * @param {string[]} [audience.member_status_ids] - Member status IDs
 * @param {string} [audience.gender] - 'Male' or 'Female'
 * @param {number} [audience.age_min] - Minimum age
 * @param {number} [audience.age_max] - Maximum age
 * @param {string[]} [audience.member_ids] - Specific member IDs (custom)
 * @param {string[]} [audience.exclude_member_ids] - Members to exclude
 */
export const estimateAudience = (audience) =>
  api.post(`${BASE_URL}/estimate-audience`, { audience });

// =============================================================================
// ANALYTICS
// =============================================================================

/**
 * Get analytics summary for all campaigns
 * @param {number} [days=30] - Number of days to analyze
 */
export const getAnalyticsSummary = (days = 30) =>
  api.get(`${BASE_URL}/analytics/summary`, { params: { days } });

/**
 * Get detailed analytics for a specific campaign
 * @param {string} id - Campaign ID
 */
export const getCampaignAnalytics = (id) =>
  api.get(`${BASE_URL}/${id}/analytics`);

/**
 * Get list of timezones for scheduling
 */
export const getTimezones = () =>
  api.get(`${BASE_URL}/timezones`);

/**
 * Retry sending to failed recipients
 * @param {string} id - Campaign ID
 */
export const retryCampaign = (id) =>
  api.post(`${BASE_URL}/${id}/retry`);

// =============================================================================
// BULK ACTIONS
// =============================================================================

/**
 * Bulk delete draft campaigns
 * @param {string[]} campaignIds - Array of campaign IDs to delete
 */
export const bulkDeleteCampaigns = (campaignIds) =>
  api.post(`${BASE_URL}/bulk/delete`, campaignIds);

/**
 * Bulk archive sent/cancelled campaigns
 * @param {string[]} campaignIds - Array of campaign IDs to archive
 */
export const bulkArchiveCampaigns = (campaignIds) =>
  api.post(`${BASE_URL}/bulk/archive`, campaignIds);

// =============================================================================
// DEFAULT EXPORT
// =============================================================================

const broadcastsApi = {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  sendCampaign,
  cancelCampaign,
  duplicateCampaign,
  testSendCampaign,
  uploadCampaignImage,
  deleteCampaignImage,
  estimateAudience,
  getAnalyticsSummary,
  getCampaignAnalytics,
  getTimezones,
  retryCampaign,
  bulkDeleteCampaigns,
  bulkArchiveCampaigns,
};

export default broadcastsApi;
