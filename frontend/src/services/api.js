import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
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
  list: () => api.get('/churches'),
  get: (id) => api.get(`/churches/${id}`),
  create: (data) => api.post('/churches', data),
  update: (id, data) => api.patch(`/churches/${id}`, data),
  delete: (id) => api.delete(`/churches/${id}`),
};

export default api;
