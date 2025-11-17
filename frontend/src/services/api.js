import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

// Debug logging
console.log('🔍 API Configuration Debug:');
console.log('  REACT_APP_BACKEND_URL:', process.env.REACT_APP_BACKEND_URL);
console.log('  API_BASE_URL:', API_BASE_URL);
console.log('  Full baseURL:', `${API_BASE_URL}/api`);

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to ensure HTTPS and prevent HTTP redirects
api.interceptors.request.use(
  (config) => {
    // Add trailing slash to prevent server redirects that change HTTPS to HTTP
    // This is needed for Kubernetes ingress that redirects /api/events to /api/events/
    if (config.url && config.url !== '' && config.url !== '/') {
      // Only add trailing slash if:
      // 1. URL doesn't have query params
      // 2. URL doesn't already end with /
      // 3. URL doesn't have a file extension
      if (!config.url.includes('?') && !config.url.endsWith('/')) {
        const hasPathParam = config.url.match(/\/[^\/]+$/); // matches /{id} style params
        const hasExtension = /\.\w+$/.test(config.url);
        if (!hasExtension && !hasPathParam) {
          config.url = config.url + '/';
          console.log('✓ Added trailing slash to prevent redirect');
        }
      }
    }
    
    // Log the actual URL being requested
    const fullURL = config.baseURL + (config.url || '');
    console.log('📡 API Request:', config.method?.toUpperCase(), fullURL);
    
    // Ensure HTTPS is used - force replace any HTTP
    if (config.url && config.url.startsWith('http://')) {
      console.warn('⚠️ Converting URL from HTTP to HTTPS:', config.url);
      config.url = config.url.replace('http://', 'https://');
    }
    if (config.baseURL && config.baseURL.startsWith('http://')) {
      console.warn('⚠️ Converting baseURL from HTTP to HTTPS:', config.baseURL);
      config.baseURL = config.baseURL.replace('http://', 'https://');
    }
    
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log final URL after transformation
    const finalURL = config.baseURL + (config.url || '');
    console.log('📤 Final URL:', finalURL);
    
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
    // If response URL was redirected to HTTP, log warning
    if (response.request && response.request.responseURL) {
      const responseURL = response.request.responseURL;
      console.log('📥 Response URL:', responseURL);
      if (responseURL.startsWith('http://')) {
        console.error('⚠️ Response was served over HTTP instead of HTTPS:', responseURL);
      }
    }
    return response;
  },
  (error) => {
    console.error('❌ Response error:', error.message);
    if (error.config) {
      console.error('   URL:', error.config.baseURL + (error.config.url || ''));
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
  login: (email, password) => api.post('/auth/login/', { email, password }),
  register: (userData) => api.post('/auth/register/', userData),
  getCurrentUser: () => api.get('/auth/me/'),
  listUsers: () => api.get('/auth/users/'),
};

// Churches API
export const churchesAPI = {
  listPublic: () => api.get('/churches/public/list/'),
  list: () => api.get('/churches/'),
  get: (id) => api.get(`/churches/${id}/`),
  create: (data) => api.post('/churches/', data),
  update: (id, data) => api.patch(`/churches/${id}/`, data),
  delete: (id) => api.delete(`/churches/${id}/`),
};

// Members API
export const membersAPI = {
  list: (params) => api.get('/members/', { params }),
  get: (id) => api.get(`/members/${id}/`),
  create: (data) => api.post('/members/', data),
  update: (id, data) => api.patch(`/members/${id}/`, data),
  delete: (id) => api.delete(`/members/${id}/`),
  getStats: () => api.get('/members/stats/summary/'),
};

// Settings API
export const settingsAPI = {
  // Member Statuses
  listMemberStatuses: () => api.get('/settings/member-statuses/'),
  getMemberStatus: (id) => api.get(`/settings/member-statuses/${id}/`),
  createMemberStatus: (data) => api.post('/settings/member-statuses/', data),
  updateMemberStatus: (id, data) => api.patch(`/settings/member-statuses/${id}/`, data),
  deleteMemberStatus: (id) => api.delete(`/settings/member-statuses/${id}/`),
  
  // Demographics
  listDemographics: () => api.get('/settings/demographics/'),
  getDemographic: (id) => api.get(`/settings/demographics/${id}/`),
  createDemographic: (data) => api.post('/settings/demographics/', data),
  updateDemographic: (id, data) => api.patch(`/settings/demographics/${id}/`, data),
  deleteDemographic: (id) => api.delete(`/settings/demographics/${id}/`),
  
  // Church Settings
  getChurchSettings: () => api.get('/settings/church-settings/'),
  updateChurchSettings: (data) => api.patch('/settings/church-settings/', data),
};

// Import/Export API
export const importExportAPI = {
  // Templates
  listTemplates: () => api.get('/import-export/templates/'),
  createTemplate: (data) => api.post('/import-export/templates/', data),
  
  // Import
  parseFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/import-export/parse-file/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  simulateImport: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    return api.post('/import-export/simulate/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  importMembers: (data) => {
    const formData = new FormData();
    Object.keys(data).forEach(key => {
      formData.append(key, data[key]);
    });
    return api.post('/import-export/import-members/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Export
  exportMembers: (params) => api.get('/import-export/export-members/', { 
    params,
    responseType: 'blob' 
  }),
  
  // Logs
  listLogs: () => api.get('/import-export/logs/'),
  
  // Bulk Photo Upload
  uploadPhotos: (file) => {
    const formData = new FormData();
    formData.append('archive', file);
    return api.post('/import-export/upload-photos/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Simulate photo matching (against CSV, not database)
  simulatePhotoMatching: (file, csvData, photoField) => {
    const formData = new FormData();
    formData.append('photo_archive', file);
    formData.append('csv_data', csvData);
    formData.append('photo_filename_field', photoField);
    return api.post('/photo-document-sim/simulate-photo-matching/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Bulk Document Upload
  uploadDocuments: (file) => {
    const formData = new FormData();
    formData.append('archive', file);
    return api.post('/import-export/upload-documents/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Simulate document matching (against CSV, not database)
  simulateDocumentMatching: (file, csvData, documentField) => {
    const formData = new FormData();
    formData.append('document_archive', file);
    formData.append('csv_data', csvData);
    formData.append('document_filename_field', documentField);
    return api.post('/photo-document-sim/simulate-document-matching/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Cleanup temporary uploads
  cleanupTempUploads: (memberIds) => api.post('/import-export/cleanup-temp-uploads/', memberIds),
};

// Seat Layouts API
export const seatLayoutsAPI = {
  list: () => api.get('/seat-layouts/'),
  get: (id) => api.get(`/seat-layouts/${id}/`),
  create: (data) => api.post('/seat-layouts/', data),
  update: (id, data) => api.patch(`/seat-layouts/${id}/`, data),
  delete: (id) => api.delete(`/seat-layouts/${id}/`),
};

// Events API
export const eventsAPI = {
  list: (params) => api.get('/events/', { params }),
  get: (id) => api.get(`/events/${id}/`),
  create: (data) => api.post('/events/', data),
  update: (id, data) => api.patch(`/events/${id}/`, data),
  delete: (id) => api.delete(`/events/${id}/`),
  
  // RSVP
  registerRSVP: (eventId, params) => api.post(`/events/${eventId}/rsvp/`, null, { params }),
  cancelRSVP: (eventId, memberId, params = {}) => api.delete(`/events/${eventId}/rsvp/${memberId}/`, { params }),
  getRSVPs: (eventId, params = {}) => api.get(`/events/${eventId}/rsvps/`, { params }),
  getAvailableSeats: (eventId, params = {}) => api.get(`/events/${eventId}/available-seats/`, { params }),
  
  // Check-in
  checkIn: (eventId, params) => api.post(`/events/${eventId}/check-in/`, null, { params }),
  getAttendance: (eventId, params = {}) => api.get(`/events/${eventId}/attendance/`, { params }),
};

export default api;
