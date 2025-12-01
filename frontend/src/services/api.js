import axios from 'axios';

/**
 * FaithFlow API Configuration
 *
 * Supports two deployment modes:
 * 1. Subdomain-based (recommended): api.yourdomain.com
 * 2. Path-based (legacy): yourdomain.com/api
 *
 * Priority order for API URL:
 * 1. Runtime config (window.__RUNTIME_CONFIG__.API_URL) - For Docker deployments
 * 2. Environment variable (REACT_APP_API_URL) - For build-time config
 * 3. Auto-detect from window.location - Fallback for legacy deployments
 */
const getAPIBaseURL = () => {
  // 1. Check runtime config (injected by Docker entrypoint)
  // Use explicit check for non-empty string to avoid falsy issues
  const runtimeURL = window.__RUNTIME_CONFIG__?.API_URL;
  if (runtimeURL && runtimeURL.trim() !== '') {
    console.log('✅ Using runtime config API URL:', runtimeURL);
    return runtimeURL;
  }

  // 2. Check environment variable (baked in at build time)
  if (process.env.REACT_APP_API_URL && process.env.REACT_APP_API_URL.trim() !== '') {
    console.log('✅ Using env var API URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }

  // 3. Fallback: Auto-detect subdomain mode (api.domain.com)
  // This is the preferred deployment mode for FaithFlow
  const origin = window.location.origin;
  const secureOrigin = origin.replace('http://', 'https://');

  // Try subdomain mode first: api.flow.gkbj.org
  const hostname = window.location.hostname;
  const subdomainURL = `https://api.${hostname}`;

  // For localhost development, use path-based
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    const fallbackURL = `${secureOrigin}/api`;
    console.log('⚠️ Using localhost fallback API URL:', fallbackURL);
    return fallbackURL;
  }

  console.log('⚠️ Using auto-detected subdomain API URL:', subdomainURL);
  return subdomainURL;
};

const API_BASE_URL = getAPIBaseURL();

// Debug logging (only in development)
if (process.env.NODE_ENV === 'development') {
  console.log('🔍 API Configuration:');
  console.log('  Runtime Config:', window.__RUNTIME_CONFIG__?.API_URL || '(not set)');
  console.log('  Env Var:', process.env.REACT_APP_API_URL || '(not set)');
  console.log('  Final API_BASE_URL:', API_BASE_URL);
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  // Prevent axios from following redirects that might change protocol
  maxRedirects: 0,
  // Validate status to treat 307 as error (shouldn't redirect)
  validateStatus: (status) => status >= 200 && status < 300,
});

// Add request interceptor for auth and logging
api.interceptors.request.use(
  (config) => {
    // AGGRESSIVE HTTPS ENFORCEMENT - Replace any http:// with https://
    if (config.baseURL && config.baseURL.includes('http://')) {
      const originalURL = config.baseURL;
      config.baseURL = config.baseURL.replace('http://', 'https://');
      console.warn('⚠️ FORCED HTTP → HTTPS in baseURL:', originalURL, '→', config.baseURL);
    }
    
    // Also check the full URL
    if (config.url && config.url.includes('http://')) {
      const originalURL = config.url;
      config.url = config.url.replace('http://', 'https://');
      console.warn('⚠️ FORCED HTTP → HTTPS in URL:', originalURL, '→', config.url);
    }
    
    // Log the actual URL being requested
    const fullURL = config.baseURL + (config.url || '');
    console.log('📡 API Request:', config.method?.toUpperCase(), fullURL);
    
    // Verify it's HTTPS
    if (fullURL.startsWith('http://') && !fullURL.includes('localhost')) {
      console.error('🚨 CRITICAL: Still using HTTP after forcing HTTPS!', fullURL);
      // Last resort: force HTTPS
      config.baseURL = config.baseURL.replace('http://', 'https://');
    }
    
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => {
    const responseURL = response.request?.responseURL;
    if (responseURL) {
      console.log('📥 Response URL:', responseURL);
      // Warn if response came from HTTP instead of HTTPS
      if (responseURL.startsWith('http://')) {
        console.error('⚠️ WARNING: Response served over HTTP:', responseURL);
      }
    }
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error.message);
    if (error.config) {
      console.error('   Request URL:', error.config.baseURL + (error.config.url || ''));
    }
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      localStorage.removeItem('church');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email, password, church_id = null) => {
    const payload = { email, password };
    if (church_id) {
      payload.church_id = church_id;  // Include church_id for super admin
    }
    return api.post('/auth/login', payload);
  },
  switchChurch: (church_id) => api.post('/auth/switch-church', { church_id }),
  register: (userData) => api.post('/auth/register', userData),
  getCurrentUser: () => api.get('/auth/me'),
  listUsers: () => api.get('/auth/users'),
};

// Churches API
export const churchesAPI = {
  listPublic: () => api.get('/churches/public/list'),
  list: () => api.get('/churches/'),
  get: (id) => api.get(`/churches/${id}`),
  create: (data) => api.post('/churches/', data),
  update: (id, data) => api.patch(`/churches/${id}`, data),
  delete: (id) => api.delete(`/churches/${id}`),
};

// Members API
export const membersAPI = {
  list: (params) => api.get('/members/', { params }),
  listTrash: () => api.get('/members/trash'),
  get: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members/', data),
  update: (id, data) => api.patch(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
  restore: (id) => api.post(`/members/${id}/restore`),
  permanentDelete: (id) => api.delete(`/members/${id}/permanent`),
  getStats: () => api.get('/members/stats/summary'),
  quickAdd: (data) => api.post('/members/quick-add', data),
};

// Settings API
export const settingsAPI = {
  // Member Statuses
  listMemberStatuses: () => api.get('/settings/member-statuses'),
  getMemberStatus: (id) => api.get(`/settings/member-statuses/${id}`),
  createMemberStatus: (data) => api.post('/settings/member-statuses', data),
  updateMemberStatus: (id, data) => api.patch(`/settings/member-statuses/${id}`, data),
  deleteMemberStatus: (id) => api.delete(`/settings/member-statuses/${id}`),
  reorderMemberStatuses: (statusIds) => api.post('/settings/member-statuses/reorder', statusIds),
  
  // Demographics
  listDemographics: () => api.get('/settings/demographics'),
  getDemographic: (id) => api.get(`/settings/demographics/${id}`),
  createDemographic: (data) => api.post('/settings/demographics', data),
  updateDemographic: (id, data) => api.patch(`/settings/demographics/${id}`, data),
  deleteDemographic: (id) => api.delete(`/settings/demographics/${id}`),
  
  // Church Settings
  getChurchSettings: () => api.get('/settings/church-settings'),
  updateChurchSettings: (data) => api.patch('/settings/church-settings', data),
  
  // Event Categories
  listEventCategories: () => api.get('/settings/event-categories'),
  createEventCategory: (data) => api.post('/settings/event-categories', data),
  updateEventCategory: (id, data) => api.patch(`/settings/event-categories/${id}`, data),
  deleteEventCategory: (id) => api.delete(`/settings/event-categories/${id}`),
};

// Status Rules API (v1 paths)
export const statusRulesAPI = {
  list: () => api.get('/v1/member-status/rules'),
  get: (id) => api.get(`/v1/member-status/rules/${id}`),
  create: (data) => api.post('/v1/member-status/rules', data),
  update: (id, data) => api.put(`/v1/member-status/rules/${id}`, data),
  delete: (id) => api.delete(`/v1/member-status/rules/${id}`),
  simulate: (ruleData) => api.post('/v1/member-status/simulate', ruleData),
  evaluateAll: () => api.post('/v1/member-status/run-once'),
};

// Status Conflicts API (v1 paths)
export const statusConflictsAPI = {
  list: (statusFilter = 'open', memberId = null) => {
    const params = { status: statusFilter };
    if (memberId) params.member_id = memberId;
    return api.get('/v1/member-status/conflicts', { params });
  },
  get: (id) => api.get(`/v1/member-status/conflicts/${id}`),
  resolve: (id, statusId, comment = null) => api.post(`/v1/member-status/conflicts/${id}/resolve`, { 
    resolution_status_id: statusId,
    resolution_comment: comment 
  }),
};

// Status History API (v1 paths)
export const statusHistoryAPI = {
  getMemberHistory: (memberId) => api.get(`/v1/member-status/members/${memberId}/history`),
};

// Automation Settings API (v1 paths)
export const automationSettingsAPI = {
  getSettings: () => api.get('/v1/member-status/settings'),
  updateSettings: (data) => api.put('/v1/member-status/settings', data),
};

// Webhooks API
export const webhooksAPI = {
  list: () => api.get('/webhooks/'),
  get: (id) => api.get(`/webhooks/${id}`),
  create: (data) => api.post('/webhooks/', data),
  update: (id, data) => api.patch(`/webhooks/${id}`, data),
  delete: (id) => api.delete(`/webhooks/${id}`),
  test: (id) => api.post(`/webhooks/${id}/test`),
  getLogs: (id, params) => api.get(`/webhooks/${id}/logs`, { params }),
  getQueueStatus: () => api.get('/webhooks/queue/status'),
};

// API Keys API
export const apiKeysAPI = {
  list: () => api.get('/api-keys/'),
  create: (data) => api.post('/api-keys/', data),
  update: (id, data) => api.patch(`/api-keys/${id}`, data),
  delete: (id) => api.delete(`/api-keys/${id}`),
  regenerate: (id) => api.post(`/api-keys/${id}/regenerate`),
};

// Import/Export API
export const importExportAPI = {
  // Templates
  listTemplates: () => api.get('/import-export/templates'),
  createTemplate: (data) => api.post('/import-export/templates', data),
  
  // Import
  parseFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import-export/parse-file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  simulateImport: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    return api.post('/import-export/simulate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importMembers: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    return api.post('/import-export/import-members', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Export
  exportMembers: (params) => api.get('/import-export/export-members', { 
    params,
    responseType: 'blob' 
  }),
  
  // Logs
  listLogs: () => api.get('/import-export/logs'),
  
  // Bulk Photo Upload
  uploadPhotos: (file) => {
    const formData = new FormData();
    formData.append('archive', file);
    return api.post('/import-export/upload-photos', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Simulate photo matching (against CSV, not database)
  simulatePhotoMatching: (file, csvData, photoField) => {
    const formData = new FormData();
    formData.append('photo_archive', file);
    formData.append('csv_data', csvData);
    formData.append('photo_filename_field', photoField);
    return api.post('/photo-document-sim/simulate-photo-matching', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Bulk Document Upload
  uploadDocuments: (file) => {
    const formData = new FormData();
    formData.append('archive', file);
    return api.post('/import-export/upload-documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Simulate document matching (against CSV, not database)
  simulateDocumentMatching: (file, csvData, documentField) => {
    const formData = new FormData();
    formData.append('document_archive', file);
    formData.append('csv_data', csvData);
    formData.append('document_filename_field', documentField);
    return api.post('/photo-document-sim/simulate-document-matching', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Cleanup temporary uploads
  cleanupTempUploads: (memberIds) => api.post('/import-export/cleanup-temp-uploads', memberIds),

  // Cancel import and cleanup temp files
  cancelImport: (photoSessionId, documentSessionId) => {
    const formData = new FormData();
    if (photoSessionId) formData.append('photo_session_id', photoSessionId);
    if (documentSessionId) formData.append('document_session_id', documentSessionId);
    return api.post('/import-export/cancel-import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  // Cleanup expired temp sessions
  cleanupExpiredSessions: () => api.post('/import-export/cleanup-expired-sessions'),
};

// Seat Layouts API
export const seatLayoutsAPI = {
  list: () => api.get('/seat-layouts/'),
  get: (id) => api.get(`/seat-layouts/${id}`),
  create: (data) => api.post('/seat-layouts/', data),
  update: (id, data) => api.patch(`/seat-layouts/${id}`, data),
  delete: (id) => api.delete(`/seat-layouts/${id}`),
};

// Events API
export const eventsAPI = {
  list: (params) => api.get('/events/', { params }),
  get: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events/', data),
  update: (id, data) => api.patch(`/events/${id}`, data),
  delete: (id) => api.delete(`/events/${id}`),
  
  // RSVP
  registerRSVP: (eventId, params) => api.post(`/events/${eventId}/rsvp`, null, { params }),
  cancelRSVP: (eventId, memberId, params = {}) => api.delete(`/events/${eventId}/rsvp/${memberId}`, { params }),
  getRSVPs: (eventId, params = {}) => api.get(`/events/${eventId}/rsvps`, { params }),
  getAvailableSeats: (eventId, params = {}) => api.get(`/events/${eventId}/available-seats`, { params }),
  retryWhatsApp: (eventId, memberId, params = {}) => api.post(`/events/${eventId}/rsvp/${memberId}/retry-whatsapp`, null, { params }),
  
  // Check-in
  checkIn: (eventId, params) => api.post(`/events/${eventId}/check-in`, null, { params }),
  getAttendance: (eventId, params = {}) => api.get(`/events/${eventId}/attendance`, { params }),
};

// Bible API
export const bibleAPI = {
  getVersions: () => api.get('/bible/versions'),
  getBooks: () => api.get('/bible/books'),
  getChapter: (version, book, chapter) => api.get(`/bible/${version}/${book}/${chapter}`),
  getVerse: (version, book, chapter, startVerse, endVerse = null) => {
    const url = endVerse 
      ? `/bible/${version}/${book}/${chapter}/${startVerse}`
      : `/bible/${version}/${book}/${chapter}/${startVerse}`;
    return api.get(url, endVerse ? { params: { end_verse: endVerse } } : {});
  },
};

export default api;
