/**
 * Kiosk API Service Layer
 * 
 * Wraps existing backend APIs for kiosk-specific flows
 */

import api from './api';

// ==================== IDENTITY & AUTH ====================

export const kioskApi = {
  // Phone lookup
  lookupMemberByPhone: async (phone) => {
    // Remove + and other formatting for search
    const cleanPhone = phone.replace(/[\+\-\s\(\)]/g, '');
    
    console.log('🔍 Looking up phone:', phone, '→ Clean:', cleanPhone);
    
    // Search by phone using 'search' parameter (backend uses regex)
    const response = await api.get('/members/', {
      params: { 
        search: cleanPhone,
        limit: 5
      }
    });
    
    const members = response.data?.data || [];
    console.log('🔍 Search results:', members.length, 'members found');
    
    if (members.length > 0) {
      // Find exact match
      const exactMatch = members.find(m => {
        const memberPhone = (m.phone_whatsapp || '').replace(/[\+\-\s\(\)]/g, '');
        return memberPhone === cleanPhone || memberPhone.endsWith(cleanPhone.replace(/^0/, ''));
      });
      
      console.log('🔍 Exact match:', exactMatch ? exactMatch.full_name : 'None');
      return exactMatch || members[0]; // Return exact match or first result
    }
    
    return null;
  },

  // Send OTP (using existing WhatsApp gateway)
  sendOTP: async (phone) => {
    const response = await api.post('/kiosk/send-otp', { phone });
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
        is_active: true,
        limit: 20
      }
    });
    return response.data?.data || [];
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
