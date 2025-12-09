/**
 * Request Forms API Service
 *
 * Handles CRUD operations for member care requests:
 * - Accept Jesus / Recommitment
 * - Baptism
 * - Child Dedication
 * - Holy Matrimony
 */

import api from './api';

// IMPORTANT: Include trailing slash to avoid redirect from /member-care to /member-care/
// The redirect was causing Mixed Content errors (HTTPS -> HTTP)
const BASE_URL = '/member-care/';

export const requestFormsApi = {
  // =============================================
  // DASHBOARD & COUNTS
  // =============================================

  /**
   * Get unread counts for all request types
   * Returns: { accept_jesus: 3, baptism: 1, child_dedication: 0, holy_matrimony: 2, total: 6 }
   */
  getUnreadCounts: async () => {
    const response = await api.get(`${BASE_URL}unread-counts`);
    return response.data;
  },

  /**
   * Get dashboard statistics
   * Returns stats cards data, recent requests, etc.
   */
  getDashboardStats: async () => {
    const response = await api.get(`${BASE_URL}dashboard`);
    return response.data;
  },

  // =============================================
  // LIST & GET
  // =============================================

  /**
   * List requests with filters
   * @param {Object} params - Filter parameters
   * @param {string} params.request_type - Filter by type (accept_jesus, baptism, etc.)
   * @param {string} params.status - Filter by status (new, contacted, scheduled, completed)
   * @param {string} params.assigned_to - Filter by assigned staff ID
   * @param {string} params.search - Search by name or phone
   * @param {string} params.start_date - Filter by start date
   * @param {string} params.end_date - Filter by end date
   * @param {number} params.limit - Page size (default 50)
   * @param {number} params.offset - Offset for pagination
   */
  getRequests: async (params = {}) => {
    const response = await api.get(BASE_URL, { params });
    return response.data;
  },

  /**
   * Get requests filtered by type
   * Convenience method for type-specific list pages
   */
  getRequestsByType: async (type, params = {}) => {
    return requestFormsApi.getRequests({ ...params, request_type: type });
  },

  /**
   * Get a single request by ID
   */
  getRequest: async (id) => {
    const response = await api.get(`${BASE_URL}${id}`);
    return response.data;
  },

  // =============================================
  // UPDATE OPERATIONS
  // =============================================

  /**
   * Update a request
   * @param {string} id - Request ID
   * @param {Object} data - Update data (status, notes, assigned_to_user_id, etc.)
   */
  updateRequest: async (id, data) => {
    const response = await api.patch(`${BASE_URL}${id}`, data);
    return response.data;
  },

  /**
   * Assign staff to a request
   */
  assignStaff: async (id, staffId) => {
    const response = await api.post(`${BASE_URL}${id}/assign`, null, {
      params: { staff_id: staffId }
    });
    return response.data;
  },

  /**
   * Mark request as contacted
   */
  markContacted: async (id, notes = null) => {
    const response = await api.post(`${BASE_URL}${id}/mark-contacted`, null, {
      params: notes ? { notes } : {}
    });
    return response.data;
  },

  /**
   * Mark request as scheduled
   */
  markScheduled: async (id, scheduledDate, location = null, notes = null) => {
    const params = { scheduled_date: scheduledDate };
    if (location) params.location = location;
    if (notes) params.notes = notes;

    const response = await api.post(`${BASE_URL}${id}/mark-scheduled`, null, { params });
    return response.data;
  },

  /**
   * Mark request as completed
   */
  markCompleted: async (id, notes = null) => {
    const response = await api.post(`${BASE_URL}${id}/mark-completed`, null, {
      params: notes ? { notes } : {}
    });
    return response.data;
  },

  /**
   * Delete a request (soft delete by default)
   */
  deleteRequest: async (id, hardDelete = false) => {
    const response = await api.delete(`${BASE_URL}${id}`, {
      params: { hard_delete: hardDelete }
    });
    return response.data;
  },

  // =============================================
  // SETTINGS
  // =============================================

  /**
   * Get guided prayer settings
   */
  getGuidedPrayerSettings: async () => {
    const response = await api.get(`${BASE_URL}settings/guided-prayer`);
    return response.data;
  },

  /**
   * Update guided prayer settings
   */
  updateGuidedPrayerSettings: async (prayerEn, prayerId) => {
    const response = await api.put(`${BASE_URL}settings/guided-prayer`, null, {
      params: {
        guided_prayer_en: prayerEn,
        guided_prayer_id: prayerId
      }
    });
    return response.data;
  },
};

export default requestFormsApi;
