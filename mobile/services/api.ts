/**
 * Axios API Client for FaithFlow Mobile App
 *
 * Configured with:
 * - Base URL from API_BASE_URL constant
 * - JWT token from SecureStore
 * - Request/response interceptors
 * - Error handling
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants/api';

const TOKEN_KEY = 'auth_token';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;

      // Handle 401 Unauthorized - token expired
      if (status === 401) {
        // Clear token and redirect to login
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        // You can emit an event here to trigger logout in the app
      }

      // Return structured error
      return Promise.reject({
        status,
        message: data?.detail || data?.message || 'An error occurred',
        data,
      });
    } else if (error.request) {
      // Request made but no response
      return Promise.reject({
        status: 0,
        message: 'Network error. Please check your internet connection.',
        data: null,
      });
    } else {
      // Error setting up request
      return Promise.reject({
        status: -1,
        message: error.message || 'An unexpected error occurred',
        data: null,
      });
    }
  }
);

export default api;
