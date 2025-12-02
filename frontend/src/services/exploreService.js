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
};

export default exploreService;
