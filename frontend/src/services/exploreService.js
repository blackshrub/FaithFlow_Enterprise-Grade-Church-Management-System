/**
 * Explore Content Management API Service
 * Handles all admin API calls for Explore feature
 */

import api from './api';

export const exploreService = {
  // ==================== DASHBOARD & STATS ====================

  /**
   * Get Explore dashboard statistics
   */
  getDashboardStats: async () => {
    const { data } = await api.get('/explore/admin/stats');
    return data;
  },

  // ==================== CONTENT MANAGEMENT ====================

  /**
   * List content by type with filters
   */
  listContent: async (contentType, params = {}) => {
    const { data } = await api.get(`/explore/admin/content/${contentType}`, { params });
    return data;
  },

  /**
   * Get single content item
   */
  getContent: async (contentType, contentId) => {
    const { data } = await api.get(`/explore/admin/content/${contentType}/${contentId}`);
    return data;
  },

  /**
   * Create new content
   */
  createContent: async (contentType, contentData) => {
    const { data } = await api.post(`/explore/admin/content/${contentType}`, contentData);
    return data;
  },

  /**
   * Update existing content
   */
  updateContent: async (contentType, contentId, contentData) => {
    const { data } = await api.put(`/explore/admin/content/${contentType}/${contentId}`, contentData);
    return data;
  },

  /**
   * Delete content
   */
  deleteContent: async (contentType, contentId) => {
    const { data } = await api.delete(`/explore/admin/content/${contentType}/${contentId}`);
    return data;
  },

  /**
   * Bulk delete content
   */
  bulkDeleteContent: async (contentType, contentIds) => {
    const { data } = await api.post(`/explore/admin/content/${contentType}/bulk-delete`, { content_ids: contentIds });
    return data;
  },

  // ==================== SCHEDULING ====================

  /**
   * Get schedule for a date range
   */
  getSchedule: async (startDate, endDate) => {
    const { data } = await api.get('/explore/admin/schedule', {
      params: { start_date: startDate, end_date: endDate }
    });
    return data;
  },

  /**
   * Get scheduled content with filters
   */
  getScheduledContent: async (params = {}) => {
    const { data } = await api.get('/explore/admin/scheduled-content', { params });
    return data;
  },

  /**
   * Schedule content for a specific date
   */
  scheduleContent: async (contentType, contentId, scheduledDate) => {
    const { data } = await api.post('/explore/admin/schedule', {
      content_type: contentType,
      content_id: contentId,
      scheduled_date: scheduledDate
    });
    return data;
  },

  /**
   * Unschedule content (remove scheduled date)
   */
  unscheduleContent: async (contentType, contentId) => {
    const { data } = await api.delete(`/explore/admin/content/${contentType}/${contentId}/schedule`);
    return data;
  },

  // ==================== ANALYTICS ====================

  /**
   * Get analytics overview (counts, engagement stats)
   */
  getAnalytics: async (params = {}) => {
    const { data } = await api.get('/explore/admin/analytics/overview', { params });
    return data;
  },

  /**
   * Get church-specific analytics
   */
  getChurchAnalytics: async (params = {}) => {
    const { data } = await api.get('/explore/admin/analytics/churches', { params });
    return data;
  },

  /**
   * Get top performing content
   */
  getTopContent: async (params = {}) => {
    const { data } = await api.get('/explore/admin/analytics/top-content', { params });
    return data;
  },

  // ==================== AI GENERATION ====================

  /**
   * Get AI configuration
   */
  getAIConfig: async () => {
    const { data } = await api.get('/explore/admin/ai/config');
    return data;
  },

  /**
   * Generate content using AI
   */
  generateContent: async (params) => {
    const { data } = await api.post('/explore/admin/ai/generate', params);
    return data;
  },

  /**
   * Get AI generation queue
   */
  getGenerationQueue: async () => {
    const { data } = await api.get('/explore/admin/ai/queue');
    return data;
  },

  /**
   * Get AI generation job status
   */
  getGenerationStatus: async (jobId) => {
    const { data } = await api.get(`/explore/admin/ai/queue/${jobId}`);
    return data;
  },

  /**
   * Accept generated content and publish
   */
  acceptGeneratedContent: async (jobId, edits = null) => {
    const { data } = await api.post(`/explore/admin/ai/queue/${jobId}/accept`, { edits });
    return data;
  },

  /**
   * Reject generated content
   */
  rejectGeneratedContent: async (jobId) => {
    const { data } = await api.post(`/explore/admin/ai/queue/${jobId}/reject`);
    return data;
  },

  /**
   * Regenerate content with same parameters
   */
  regenerateContent: async (jobId) => {
    const { data } = await api.post(`/explore/admin/ai/queue/${jobId}/regenerate`);
    return data;
  },

  // ==================== REVIEW QUEUE (Autonomous Content) ====================

  /**
   * Get review queue - all AI-generated content pending review
   */
  getReviewQueue: async (params = {}) => {
    const { data } = await api.get('/explore/admin/review-queue', { params });
    return data;
  },

  /**
   * Get review queue statistics
   */
  getReviewQueueStats: async () => {
    const { data } = await api.get('/explore/admin/review-queue/stats');
    return data;
  },

  /**
   * Approve AI-generated content
   */
  approveContent: async (contentType, contentId, scheduledDate = null) => {
    const { data } = await api.post(`/explore/admin/review-queue/${contentType}/${contentId}/approve`, {
      scheduled_date: scheduledDate
    });
    return data;
  },

  /**
   * Reject AI-generated content
   */
  rejectContent: async (contentType, contentId, reason = null) => {
    const { data } = await api.post(`/explore/admin/review-queue/${contentType}/${contentId}/reject`, {
      reason
    });
    return data;
  },

  /**
   * Bulk approve multiple content items
   */
  bulkApproveContent: async (contentIds, scheduledDate = null) => {
    const { data } = await api.post('/explore/admin/review-queue/bulk-approve', {
      content_ids: contentIds,
      scheduled_date: scheduledDate
    });
    return data;
  },

  /**
   * Bulk reject multiple content items
   */
  bulkRejectContent: async (contentIds, reason = null) => {
    const { data } = await api.post('/explore/admin/review-queue/bulk-reject', {
      content_ids: contentIds,
      reason
    });
    return data;
  },

  /**
   * Trigger manual content generation
   */
  triggerGeneration: async (contentTypes = ['all'], churchId = 'global') => {
    const { data } = await api.post('/explore/admin/trigger-generation', {
      content_types: contentTypes,
      church_id: churchId
    });
    return data;
  },

  // ==================== AI PROMPT CONFIGURATION ====================

  /**
   * Get all prompt configurations for church
   */
  getPromptConfig: async () => {
    const { data } = await api.get('/explore/church/ai/prompt-config');
    return data;
  },

  /**
   * Get prompt configuration for specific content type
   */
  getPromptConfigByType: async (contentType) => {
    const { data } = await api.get(`/explore/church/ai/prompt-config/${contentType}`);
    return data;
  },

  /**
   * Update all prompt configurations
   */
  updatePromptConfig: async (config) => {
    const { data } = await api.put('/explore/church/ai/prompt-config', config);
    return data;
  },

  /**
   * Update prompt configuration for specific content type
   */
  updatePromptConfigByType: async (contentType, config) => {
    const { data } = await api.patch(`/explore/church/ai/prompt-config/${contentType}`, config);
    return data;
  },

  /**
   * Reset prompt configuration to defaults
   */
  resetPromptConfig: async (contentTypes = null) => {
    const { data } = await api.post('/explore/church/ai/prompt-config/reset', {
      content_types: contentTypes
    });
    return data;
  },

  // ==================== SETTINGS ====================

  /**
   * Get platform settings
   */
  getPlatformSettings: async () => {
    const { data } = await api.get('/explore/admin/settings/platform');
    return data;
  },

  /**
   * Update platform settings
   */
  updatePlatformSettings: async (settings) => {
    const { data } = await api.put('/explore/admin/settings/platform', settings);
    return data;
  },

  // ==================== CHURCH ADMIN (Non-Super Admin) ====================

  /**
   * Get church Explore settings
   */
  getChurchSettings: async () => {
    const { data } = await api.get('/explore/church/settings');
    return data;
  },

  /**
   * Update church Explore settings
   */
  updateChurchSettings: async (settings) => {
    const { data } = await api.put('/explore/church/settings', settings);
    return data;
  },

  /**
   * Get church content adoption status
   */
  getAdoptionStatus: async () => {
    const { data } = await api.get('/explore/church/adoption');
    return data;
  },

  /**
   * Adopt or unadopt platform content
   */
  updateContentAdoption: async (contentType, contentId, adopted) => {
    const { data } = await api.post('/explore/church/adoption', {
      content_type: contentType,
      content_id: contentId,
      adopted
    });
    return data;
  },

  // ==================== LIFE STAGE JOURNEYS ====================

  /**
   * List all journeys with optional filters
   */
  listJourneys: async (params = {}) => {
    const { data } = await api.get('/explore/admin/journeys', { params });
    return data;
  },

  /**
   * Get journey by ID
   */
  getJourney: async (journeyId) => {
    const { data } = await api.get(`/explore/admin/journeys/${journeyId}`);
    return data;
  },

  /**
   * Create new journey
   */
  createJourney: async (journeyData) => {
    const { data } = await api.post('/explore/admin/journeys', journeyData);
    return data;
  },

  /**
   * Update existing journey
   */
  updateJourney: async (journeyId, journeyData) => {
    const { data } = await api.put(`/explore/admin/journeys/${journeyId}`, journeyData);
    return data;
  },

  /**
   * Delete journey
   */
  deleteJourney: async (journeyId) => {
    const { data } = await api.delete(`/explore/admin/journeys/${journeyId}`);
    return data;
  },

  /**
   * Publish journey
   */
  publishJourney: async (journeyId) => {
    const { data } = await api.post(`/explore/admin/journeys/${journeyId}/publish`);
    return data;
  },

  /**
   * Archive journey
   */
  archiveJourney: async (journeyId) => {
    const { data } = await api.post(`/explore/admin/journeys/${journeyId}/archive`);
    return data;
  },

  // ==================== SERMON INTEGRATION ====================

  /**
   * List upcoming sermons
   */
  listSermons: async (weeks = 8) => {
    const { data } = await api.get('/explore/sermons/admin/list', { params: { weeks } });
    return data;
  },

  /**
   * Get sermon by ID
   */
  getSermon: async (sermonId) => {
    const { data } = await api.get(`/explore/sermons/admin/${sermonId}`);
    return data;
  },

  /**
   * Get available sermon themes
   */
  getSermonThemes: async () => {
    const { data } = await api.get('/explore/sermons/themes');
    return data;
  },

  /**
   * Get weekly content plan for sermon
   */
  getWeeklyContentPlan: async (sermonId) => {
    const { data } = await api.get(`/explore/sermons/admin/${sermonId}/content-plan`);
    return data;
  },

  /**
   * Create new sermon
   */
  createSermon: async (sermonData) => {
    const { data } = await api.post('/explore/sermons/admin/create', sermonData);
    return data;
  },

  /**
   * Update existing sermon
   */
  updateSermon: async (sermonId, sermonData) => {
    const { data } = await api.patch(`/explore/sermons/admin/${sermonId}`, sermonData);
    return data;
  },

  /**
   * Delete sermon
   */
  deleteSermon: async (sermonId) => {
    const { data } = await api.delete(`/explore/sermons/admin/${sermonId}`);
    return data;
  },

  // ==================== PROFILE ANALYTICS ====================

  /**
   * Get profile analytics for time range
   */
  getProfileAnalytics: async (timeRange = '30d') => {
    const { data } = await api.get('/explore/admin/profiles/analytics', {
      params: { time_range: timeRange }
    });
    return data;
  },

  /**
   * Get aggregated profile statistics
   */
  getProfileAggregates: async () => {
    const { data } = await api.get('/explore/admin/profiles/aggregates');
    return data;
  },

  /**
   * Get top engagers
   */
  getTopEngagers: async (limit = 10) => {
    const { data } = await api.get('/explore/admin/profiles/top-engagers', {
      params: { limit }
    });
    return data;
  },

  /**
   * Get growth indicators for time range
   */
  getGrowthIndicators: async (timeRange = '30d') => {
    const { data } = await api.get('/explore/admin/profiles/growth', {
      params: { time_range: timeRange }
    });
    return data;
  },
};

export default exploreService;
