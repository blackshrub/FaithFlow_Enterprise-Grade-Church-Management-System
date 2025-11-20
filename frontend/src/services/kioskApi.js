/**
 * Kiosk API Service Layer
 * 
 * Wraps existing backend APIs for kiosk-specific flows
 */

import api from './api';

// ==================== IDENTITY & AUTH ====================

export const kioskApi = {
  // Phone lookup - PUBLIC endpoint for kiosk
  lookupMemberByPhone: async (phone, church_id) => {
    try {
      const response = await api.get('/kiosk/lookup-member', {
        params: { 
          phone: phone,
          church_id: church_id
        }
      });
      
      console.log('🔍 Kiosk member lookup response:', response.data);
      
      if (response.data?.success && response.data?.member) {
        console.log('✅ Member found:', response.data.member.full_name);
        return response.data.member;
      } else {
        console.log('⚠️ Member not found');
        return null;
      }
    } catch (error) {
      console.error('❌ Member lookup error:', error);
      return null;
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

  // Create new member (Pre-Visitor)
  createPreVisitor: async (data) => {
    const response = await api.post('/members/', data);
    return response.data;
  },

  // ==================== KIOSK SETTINGS ====================

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

  getUpcomingEvents: async () => {
    const response = await api.get('/events/', {
      params: {
        limit: 50
      }
    });
    
    console.log('🎯 Raw events response:', response.data);
    
    const events = response.data?.data || [];
    console.log('🎯 Events array:', events);
    console.log('🎯 Events count:', events.length);
    
    // Filter for future events only
    const now = new Date();
    const futureEvents = events.filter(event => {
      if (!event.event_date) return false;
      const eventDate = new Date(event.event_date);
      return eventDate >= now;
    });
    
    console.log('🎯 Future events count:', futureEvents.length);
    
    return futureEvents;
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
    const response = await api.post('/v1/prayer-requests/', {
      ...data,
      source: 'kiosk'
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

  getPublicGroups: async (category = null) => {
    const response = await api.get('/v1/groups/', {
      params: {
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
    const response = await api.put(`/members/${member_id}`, data);
    return response.data;
  },
};

export default kioskApi;
