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

  getUpcomingEvents: async (churchId, forRegistration = false) => {
    // Use public kiosk endpoint (no auth required)
    // forRegistration=true filters to only show events that require RSVP (for member registration)
    // forRegistration=false shows all events (for staff check-in)
    const response = await api.get('/kiosk/events', {
      params: {
        church_id: churchId || localStorage.getItem('kiosk_church_id'),
        limit: 50,
        for_registration: forRegistration
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

  /**
   * Register a group (primary member + companions) for an event
   * @param {Object} data - Group registration data
   * @param {string} data.event_id - Event ID
   * @param {string} data.church_id - Church ID
   * @param {string} data.primary_member_id - Verified member's ID
   * @param {boolean} data.include_self - Whether to include primary member
   * @param {Array} data.companions - List of companions to register
   * @returns {Object} Registration result with tickets
   */
  registerGroup: async (data) => {
    const response = await api.post('/kiosk/register-group', {
      event_id: data.event_id,
      church_id: data.church_id || localStorage.getItem('kiosk_church_id'),
      primary_member_id: data.primary_member_id,
      include_self: data.include_self ?? true,
      companions: data.companions || []
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

  getAvailableSlots: async (counselor_id, date_from, date_to, churchId) => {
    const response = await api.get('/public/counseling/availability', {
      params: {
        church_id: churchId || localStorage.getItem('kiosk_church_id'),
        counselor_id,
        date_from,
        date_to
      }
    });
    return response.data?.data || [];
  },

  // Get all available dates in a range (for calendar highlighting)
  getAvailableDates: async (date_from, date_to, churchId) => {
    try {
      const response = await api.get('/public/counseling/availability', {
        params: {
          church_id: churchId || localStorage.getItem('kiosk_church_id'),
          date_from,
          date_to
        }
      });
      // Return array of dates that have available slots
      return (response.data?.data || []).map(item => item.date);
    } catch (error) {
      console.error('Failed to fetch available dates:', error);
      return [];
    }
  },

  createCounselingRequest: async (data) => {
    const response = await api.post('/public/counseling/appointments', data);
    return response.data;
  },

  // ==================== MEMBER CARE (Request Forms) ====================

  /**
   * Get guided prayer text for Accept Jesus form
   */
  getGuidedPrayer: async (churchId) => {
    try {
      const response = await api.get('/kiosk/member-care/guided-prayer', {
        params: { church_id: churchId || localStorage.getItem('kiosk_church_id') }
      });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch guided prayer:', error);
      return {
        prayer_en: 'Lord Jesus, I believe You are the Son of God who died for my sins...',
        prayer_id: 'Tuhan Yesus, saya percaya Engkau adalah Anak Allah yang mati untuk dosa-dosa saya...'
      };
    }
  },

  /**
   * Submit Accept Jesus / Recommitment request
   */
  submitAcceptJesus: async (data) => {
    const churchId = data.church_id || localStorage.getItem('kiosk_church_id');
    const response = await api.post(`/kiosk/member-care/accept-jesus?church_id=${churchId}`, {
      member_id: data.member_id,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      commitment_type: data.commitment_type,
      prayer_read: data.prayer_read,
      guided_prayer_text: data.guided_prayer_text,
      notes: data.notes
    });
    return response.data;
  },

  /**
   * Submit Baptism request
   */
  submitBaptism: async (data) => {
    const churchId = data.church_id || localStorage.getItem('kiosk_church_id');
    const response = await api.post(`/kiosk/member-care/baptism?church_id=${churchId}`, {
      member_id: data.member_id,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      preferred_date: data.preferred_date,
      testimony: data.testimony,
      notes: data.notes
    });
    return response.data;
  },

  /**
   * Submit Child Dedication request
   */
  submitChildDedication: async (data) => {
    const churchId = data.church_id || localStorage.getItem('kiosk_church_id');
    const response = await api.post(`/kiosk/member-care/child-dedication?church_id=${churchId}`, {
      member_id: data.member_id,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      father: data.father,
      mother: data.mother,
      child: data.child,
      notes: data.notes
    });
    return response.data;
  },

  /**
   * Submit Holy Matrimony request
   */
  submitHolyMatrimony: async (data) => {
    const churchId = data.church_id || localStorage.getItem('kiosk_church_id');
    const response = await api.post(`/kiosk/member-care/holy-matrimony?church_id=${churchId}`, {
      member_id: data.member_id,
      full_name: data.full_name,
      phone: data.phone,
      email: data.email,
      person_a: data.person_a,
      person_b: data.person_b,
      planned_wedding_date: data.planned_wedding_date,
      notes: data.notes
    });
    return response.data;
  },

  /**
   * Search members for spouse/partner selection
   */
  searchMembersForSelection: async (query, churchId) => {
    try {
      const response = await api.get('/kiosk/members/search', {
        params: {
          q: query,
          church_id: churchId || localStorage.getItem('kiosk_church_id')
        }
      });
      return response.data?.members || [];
    } catch (error) {
      console.error('Member search error:', error);
      return [];
    }
  },

  /**
   * Upload child photo for child dedication
   */
  uploadChildPhoto: async (photoBase64, churchId) => {
    const response = await api.post('/kiosk/member-care/upload-child-photo', {
      photo_base64: photoBase64,
      church_id: churchId || localStorage.getItem('kiosk_church_id')
    });
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
   * Get face descriptors scoped to a specific event
   * Returns only faces of RSVP'd members + recent attendees (80% smaller payload)
   */
  getEventFaceDescriptors: async (eventId, churchId) => {
    try {
      const response = await api.get(`/kiosk/face-descriptors/event/${eventId}`, {
        params: { church_id: churchId }
      });
      return response.data || { members: [], total_members: 0, event_rsvps: 0 };
    } catch (error) {
      console.error('Failed to fetch event face descriptors:', error);
      return { members: [], total_members: 0, event_rsvps: 0 };
    }
  },

  /**
   * Get attendance count for an event
   */
  getEventAttendanceCount: async (eventId, churchId) => {
    try {
      const response = await api.get(`/kiosk/event-attendance-count/${eventId}`, {
        params: { church_id: churchId }
      });
      return response.data?.count || 0;
    } catch (error) {
      console.error('Failed to fetch attendance count:', error);
      return 0;
    }
  },

  /**
   * Check-in a member using face recognition
   * Called after client-side face match
   */
  faceCheckin: async (data) => {
    // church_id must be sent as query param (FastAPI requirement)
    const { church_id, ...bodyData } = data;
    const response = await api.post(`/kiosk/face-checkin?church_id=${church_id}`, bodyData);
    return response.data;
  },

  /**
   * Save captured face photo for progressive learning
   * Silent capture - builds face database over time
   */
  saveFacePhoto: async (memberId, photoBase64, descriptor, churchId) => {
    try {
      // church_id is a query param, other fields in body
      const response = await api.post(`/kiosk/save-face-photo?church_id=${churchId}`, {
        member_id: memberId,
        photo_base64: photoBase64,
        descriptor: descriptor || null  // Optional - backend can regenerate
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
