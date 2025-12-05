/**
 * Kiosk API Service Layer
 * 
 * Wraps existing backend APIs for kiosk-specific flows
 */

import api from './api';

// ==================== IDENTITY & AUTH ====================

export const kioskApi = {
  // Phone lookup - PUBLIC endpoint for kiosk (backward compatible)
  lookupMemberByPhone: async (phone, church_id) => {
    try {
      const response = await api.get('/kiosk/lookup-member', {
        params: {
          phone: phone,
          church_id: church_id
        }
      });


      if (response.data?.success && response.data?.member) {
        return response.data.member;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Member lookup error:', error);
      return null;
    }
  },

  // Search members by name or phone - returns multiple results
  searchMembers: async (query, church_id) => {
    try {
      const response = await api.get('/kiosk/lookup-member', {
        params: {
          search: query,
          church_id: church_id
        }
      });

      if (response.data?.success && response.data?.members) {
        return response.data.members;
      } else {
        return [];
      }
    } catch (error) {
      console.error('❌ Member search error:', error);
      return [];
    }
  },

  // Send OTP (using existing WhatsApp gateway)
  sendOTP: async (phone, church_id) => {
    const response = await api.post('/kiosk/send-otp', 
      { phone },
      { params: { church_id } }
    );
    return response.data;
  },

  // Verify OTP
  verifyOTP: async (phone, code) => {
    const response = await api.post('/kiosk/verify-otp', { phone, code });
    return response.data;
  },

  // Verify staff PIN
  verifyPIN: async (church_id, pin) => {
    const response = await api.post('/kiosk/verify-pin', { pin }, {
      params: { church_id }
    });
    return response.data;
  },

  // Create new member (Pre-Visitor) - PUBLIC kiosk endpoint
  createPreVisitor: async (data) => {
    const response = await api.post('/kiosk/create-member', data);
    return response.data;
  },

  // ==================== KIOSK SETTINGS ====================

  // Public endpoint for kiosk home - doesn't require auth
  getPublicKioskSettings: async (churchId) => {
    try {
      const response = await api.get('/kiosk/settings', {
        params: { church_id: churchId }
      });
      return response.data || {};
    } catch (error) {
      console.error('Failed to fetch public kiosk settings:', error);
      // Return defaults so kiosk continues working
      return {
        enable_kiosk: true,
        enable_event_registration: true,
        enable_prayer: true,
        enable_counseling: true,
        enable_groups: true,
        enable_profile_update: true,
        timeout_minutes: 2
      };
    }
  },

  // Admin endpoint - requires auth (used by KioskSettings admin page)
  getKioskSettings: async () => {
    const response = await api.get('/settings/church-settings');
    return response.data?.kiosk_settings || {};
  },

  updateKioskSettings: async (settings) => {
    const response = await api.patch('/settings/church-settings', {
      kiosk_settings: settings
    });
    return response.data;
  },

  // ==================== EVENT REGISTRATION ====================

  getUpcomingEvents: async (churchId) => {
    // Use public kiosk endpoint (no auth required)
    const response = await api.get('/kiosk/events', {
      params: {
        church_id: churchId || localStorage.getItem('kiosk_church_id'),
        limit: 50
      }
    });


    const events = response.data?.data || [];

    return events;
  },

  registerForEvent: async (event_id, member_id) => {
    const response = await api.post('/kiosk/register-event', {
      event_id,
      member_id
    });
    return response.data;
  },

  // ==================== PRAYER REQUESTS ====================

  submitPrayerRequest: async (data) => {
    // Use public kiosk endpoint (no auth required)
    const response = await api.post('/kiosk/prayer-request', {
      member_id: data.member_id,
      church_id: data.church_id || localStorage.getItem('kiosk_church_id'),
      request_text: data.request_text,
      is_anonymous: data.is_anonymous || false,
      category: data.category
    });
    return response.data;
  },

  // ==================== COUNSELING ====================

  getAvailableCounselors: async () => {
    const response = await api.get('/public/counseling/counselors');
    return response.data?.data || [];
  },

  getAvailableSlots: async (counselor_id, date_from, date_to) => {
    const response = await api.get('/public/counseling/availability', {
      params: { counselor_id, date_from, date_to }
    });
    return response.data?.data || [];
  },

  createCounselingRequest: async (data) => {
    const response = await api.post('/public/counseling/appointments', data);
    return response.data;
  },

  // ==================== GROUPS ====================

  getPublicGroups: async (category = null, churchId = null) => {
    // Use public groups endpoint (no auth required)
    const response = await api.get('/public/groups/', {
      params: {
        church_id: churchId || localStorage.getItem('kiosk_church_id'),
        is_open_for_join: true,
        category: category || undefined,
        limit: 50
      }
    });
    return response.data?.data || [];
  },

  createGroupJoinRequest: async (group_id, member_id, message) => {
    const response = await api.post('/kiosk/join-group', {
      group_id,
      member_id,
      message
    });
    return response.data;
  },

  // ==================== PROFILE UPDATE ====================

  updateMemberProfile: async (member_id, data) => {
    // Use public kiosk endpoint (no auth required)
    const response = await api.patch(`/kiosk/update-profile/${member_id}`, data);
    return response.data;
  },

  // ==================== FACE RECOGNITION ====================

  /**
   * Get all members with face descriptors for a church
   * Used to load face database for client-side matching
   */
  getFaceDescriptors: async (churchId) => {
    try {
      const response = await api.get('/kiosk/face-descriptors', {
        params: { church_id: churchId }
      });
      return response.data?.members || [];
    } catch (error) {
      console.error('Failed to fetch face descriptors:', error);
      return [];
    }
  },

  /**
   * Check-in a member using face recognition
   * Called after client-side face match
   */
  faceCheckin: async (data) => {
    const response = await api.post('/kiosk/face-checkin', data);
    return response.data;
  },

  /**
   * Save captured face photo for progressive learning
   * Silent capture - builds face database over time
   */
  saveFacePhoto: async (memberId, photoBase64, descriptor, churchId) => {
    try {
      const response = await api.post('/kiosk/save-face-photo', {
        member_id: memberId,
        photo_base64: photoBase64,
        descriptor: descriptor,
        church_id: churchId
      });
      return response.data;
    } catch (error) {
      // Silent failure - don't interrupt check-in flow
      console.error('Failed to save face photo:', error);
      return null;
    }
  },

  /**
   * RSVP and check-in in one step (for face recognition)
   * Used when member has no RSVP but we detect their face
   */
  rsvpAndCheckin: async (data) => {
    const response = await api.post('/kiosk/rsvp-and-checkin', data);
    return response.data;
  },
};

export default kioskApi;
