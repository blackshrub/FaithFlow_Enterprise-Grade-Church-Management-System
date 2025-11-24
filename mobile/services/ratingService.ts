/**
 * Rating & Review API Service (Mobile)
 *
 * Handles API calls for event ratings and reviews from mobile app
 */

import api from './api';

export interface RatingReviewCreate {
  event_id: string;
  member_id: string;
  rating: number;
  review?: string;
}

export interface RatingReviewUpdate {
  rating?: number;
  review?: string;
}

export interface RatingReview {
  id: string;
  event_id: string;
  event_name: string;
  member_id: string;
  member_name: string;
  rating: number;
  review?: string;
  church_id: string;
  created_at: string;
  updated_at: string;
}

export const ratingService = {
  /**
   * Create a new rating for an event
   */
  async createRating(data: RatingReviewCreate): Promise<RatingReview> {
    const response = await api.post('/ratings', data);
    return response.data;
  },

  /**
   * Update an existing rating
   */
  async updateRating(ratingId: string, data: RatingReviewUpdate): Promise<RatingReview> {
    const response = await api.put(`/ratings/${ratingId}`, data);
    return response.data;
  },

  /**
   * Get member's rating for a specific event
   */
  async getMemberRatingForEvent(eventId: string, memberId: string): Promise<RatingReview | null> {
    try {
      const response = await api.get('/ratings', {
        params: { event_id: eventId, member_id: memberId },
      });
      // Return first rating if exists
      return response.data.length > 0 ? response.data[0] : null;
    } catch (error) {
      console.error('Error fetching member rating:', error);
      return null;
    }
  },

  /**
   * Delete a rating
   */
  async deleteRating(ratingId: string): Promise<void> {
    await api.delete(`/ratings/${ratingId}`);
  },
};
