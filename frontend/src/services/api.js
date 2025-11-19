import axios from 'axios';

// Force HTTPS for API calls to avoid mixed content issues
// Use environment variable if available, otherwise construct from window.location
const getAPIBaseURL = () => {
  // Check if we have explicit backend URL from env
  const envURL = process.env.REACT_APP_BACKEND_URL;
  if (envURL) {
    return `${envURL}/api`;
  }
  
  // Otherwise, force HTTPS (never use HTTP in production)
  const protocol = window.location.protocol === 'https:' ? 'https:' : 'https:';  // Always HTTPS
  const host = window.location.host;
  return `${protocol}//${host}/api`;
};

const API_BASE_URL = getAPIBaseURL();

// Debug logging
console.log('🔍 API Configuration:');
console.log('  window.location.origin:', window.location.origin);
console.log('  window.location.protocol:', window.location.protocol);
console.log('  REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
console.log('  API_BASE_URL:', API_BASE_URL);

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for auth and logging
api.interceptors.request.use(
  (config) => {
    // Log the actual URL being requested
    const fullURL = config.baseURL + (config.url || '');
    console.log('📡 API Request:', config.method?.toUpperCase(), fullURL);
    
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
  login: (email, password) => api.post('/auth/login', { email, password }),
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
  get: (id) => api.get(`/members/${id}`),
  create: (data) => api.post('/members/', data),
  update: (id, data) => api.patch(`/members/${id}`, data),
  delete: (id) => api.delete(`/members/${id}`),
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

// Webhooks API
export const webhooksAPI = {
  list: () => api.get('/webhooks'),
  get: (id) => api.get(`/webhooks/${id}`),
  create: (data) => api.post('/webhooks', data),
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

// Devotions API
export const devotionsAPI = {
  list: (params) => api.get('/devotions/', { params }),
  get: (id) => api.get(`/devotions/${id}`),
  getByDate: (date) => api.get('/devotions/by-date', { params: { date } }),
  create: (data) => api.post('/devotions/', data),
  update: (id, data) => api.patch(`/devotions/${id}`, data),
  delete: (id) => api.delete(`/devotions/${id}`),
  duplicate: (id) => api.post(`/devotions/${id}/duplicate`),
  generateAudio: (id) => api.post(`/devotions/${id}/generate-audio`, null, { timeout: 120000 }),
  generateAudioPreview: (text) => api.post('/devotions/generate-audio-preview', null, { params: { text }, timeout: 120000 }),
  restoreVersion: (id, versionIndex) => api.post(`/devotions/${id}/restore-version`, null, { params: { version_index: versionIndex } }),
  bulkAction: (action, devotionIds) => api.post('/devotions/bulk-action', null, { params: { action, devotion_ids: devotionIds } }),
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
