/**
 * Rating & Review API Service
 *
 * Handles API calls for event ratings and reviews
 */

import api from './api';

const ratingReviewService = {
  /**
   * Get all ratings with optional filters
   * @param {Object} params - Query parameters (event_id, member_id, skip, limit)
   */
  async getRatings(params = {}) {
    const response = await api.get('/api/ratings', { params });
    return response.data;
  },

  /**
   * Get a specific rating by ID
   * @param {string} ratingId - Rating ID
   */
  async getRating(ratingId) {
    const response = await api.get(`/api/ratings/${ratingId}`);
    return response.data;
  },

  /**
   * Get rating statistics for a specific event
   * @param {string} eventId - Event ID
   */
  async getEventStats(eventId) {
    const response = await api.get(`/api/ratings/stats/${eventId}`);
    return response.data;
  },

  /**
   * Get rating statistics for all events
   * @param {Object} params - Query parameters (skip, limit)
   */
  async getAllEventsStats(params = {}) {
    const response = await api.get('/api/ratings/stats', { params });
    return response.data;
  },

  /**
   * Create a new rating (mobile app only, but included for completeness)
   * @param {Object} data - Rating data
   */
  async createRating(data) {
    const response = await api.post('/api/ratings', data);
    return response.data;
  },

  /**
   * Update an existing rating
   * @param {string} ratingId - Rating ID
   * @param {Object} data - Updated rating data
   */
  async updateRating(ratingId, data) {
    const response = await api.put(`/api/ratings/${ratingId}`, data);
    return response.data;
  },

  /**
   * Delete a rating (soft delete)
   * @param {string} ratingId - Rating ID
   */
  async deleteRating(ratingId) {
    await api.delete(`/api/ratings/${ratingId}`);
  },
};

export default ratingReviewService;
