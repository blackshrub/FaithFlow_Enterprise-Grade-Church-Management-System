/**
 * Prayer API Service
 *
 * Provides prayer request submission with Prayer Intelligence integration.
 * Returns analyzed themes, suggested scriptures, and guided prayers.
 */

import { api } from '@/services/api';
import { useAuthStore } from '@/stores/auth';

// ==================== TYPES ====================

export interface PrayerSubmission {
  request_text: string;
  category?: string;
  is_anonymous?: boolean;
}

export interface PrayerResource {
  themes: string[];
  suggested_scriptures: Array<{
    book: string;
    chapter: number;
    verses: string;
    topic: string;
  }>;
  content_themes: string[];
  urgency: 'low' | 'normal' | 'high' | 'crisis';
  guided_prayer_available: boolean;
}

export interface PrayerSubmissionResponse {
  success: boolean;
  message: string;
  id: string;
  resources: PrayerResource | null;
}

export interface GuidedPrayerResponse {
  guided_prayer: string;
}

export interface FollowUpResponse {
  success: boolean;
  message: string;
}

// ==================== API FUNCTIONS ====================

export const prayerApi = {
  /**
   * Submit a prayer request with Prayer Intelligence analysis
   *
   * Returns immediate resources (scriptures, themes) based on AI analysis.
   */
  submitPrayer: async (data: PrayerSubmission): Promise<PrayerSubmissionResponse> => {
    const { member, churchId } = useAuthStore.getState();

    if (!member?.id || !churchId) {
      throw new Error('Not authenticated');
    }

    const response = await api.post('/public/kiosk/prayer-request', {
      member_id: member.id,
      church_id: churchId,
      request_text: data.request_text,
      category: data.category || 'other',
      is_anonymous: data.is_anonymous || false,
    });

    return response.data;
  },

  /**
   * Get resources for a previously submitted prayer
   */
  getResources: async (prayerId: string): Promise<{ resources: PrayerResource | null }> => {
    const response = await api.get(`/public/kiosk/prayer-request/${prayerId}/resources`);
    return response.data;
  },

  /**
   * Generate a guided prayer based on themes
   */
  getGuidedPrayer: async (
    themes: string[],
    language: 'en' | 'id' = 'en'
  ): Promise<GuidedPrayerResponse> => {
    const response = await api.post('/public/kiosk/prayer-request/guided-prayer', {
      themes,
      language,
    });
    return response.data;
  },

  /**
   * Respond to a 14-day follow-up prompt
   */
  respondToFollowUp: async (
    followupId: string,
    sentiment: 'improved' | 'same' | 'worse' | 'resolved',
    notes?: string
  ): Promise<FollowUpResponse> => {
    const response = await api.post('/public/kiosk/prayer-request/followup-response', {
      followup_id: followupId,
      sentiment,
      notes,
    });
    return response.data;
  },
};

export default prayerApi;
