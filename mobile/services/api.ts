/**
 * Axios API Client for FaithFlow Mobile App
 *
 * Configured with:
 * - Base URL from API_BASE_URL constant
 * - JWT token from SecureStore
 * - Request/response interceptors
 * - Error handling
 * - Church ID validation (multi-tenant security)
 * - Proper 401 handling with full logout
 */

import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '@/constants/api';
import { EventEmitter } from 'eventemitter3';

const TOKEN_KEY = 'auth_token';
const MEMBER_KEY = 'auth_member';

/**
 * Auth event emitter for cross-module communication
 * Used to trigger logout from API interceptor without circular dependencies
 */
export const authEvents = new EventEmitter();
export const AUTH_EVENTS = {
  UNAUTHORIZED: 'auth:unauthorized',
  SESSION_EXPIRED: 'auth:session_expired',
} as const;

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Add auth token and validate church_id
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync(TOKEN_KEY);
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;

        // SECURITY: Add X-Church-ID header for multi-tenant validation
        // This allows backend to verify request church_id matches JWT session_church_id
        if (token !== 'demo-jwt-token-for-testing') {
          const memberStr = await SecureStore.getItemAsync(MEMBER_KEY);
          if (memberStr) {
            try {
              const member = JSON.parse(memberStr);
              const memberChurchId = member?.church_id;

              if (memberChurchId) {
                config.headers['X-Church-ID'] = memberChurchId;

                // SEC-C2 FIX: Validate church_id in URL params/body to prevent tampering
                // Check query params
                if (config.params?.church_id && config.params.church_id !== memberChurchId) {
                  // SEC-M5 FIX: Only log in development
                  if (__DEV__) console.warn('[API] Blocked request with mismatched church_id in params');
                  return Promise.reject({
                    status: 403,
                    message: 'Invalid church context',
                    data: null,
                  });
                }

                // Check request body for church_id
                if (config.data && typeof config.data === 'object' && !Array.isArray(config.data)) {
                  if (config.data.church_id && config.data.church_id !== memberChurchId) {
                    // SEC-M5 FIX: Only log in development
                    if (__DEV__) console.warn('[API] Blocked request with mismatched church_id in body');
                    return Promise.reject({
                      status: 403,
                      message: 'Invalid church context',
                      data: null,
                    });
                  }
                  // Ensure church_id is set correctly in body if present
                  if ('church_id' in config.data) {
                    config.data.church_id = memberChurchId;
                  }
                }

                // Check URL path for church_id pattern (e.g., /churches/{church_id}/...)
                const urlChurchIdMatch = config.url?.match(/\/churches\/([^\/]+)/);
                if (urlChurchIdMatch && urlChurchIdMatch[1] !== memberChurchId) {
                  // SEC-M5 FIX: Only log in development
                  if (__DEV__) console.warn('[API] Blocked request with mismatched church_id in URL path');
                  return Promise.reject({
                    status: 403,
                    message: 'Invalid church context',
                    data: null,
                  });
                }
              }
            } catch (parseError) {
              // Ignore parse errors
            }
          }
        }
      }
    } catch (error) {
      // SEC-M5 FIX: Only log in development
      if (__DEV__) console.error('[API] Failed to get auth token:', error);
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

      // Handle 401 Unauthorized - token expired or invalid
      if (status === 401) {
        // SEC-M1 FIX: Full cleanup on 401 - clear all auth data
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(MEMBER_KEY);

        // Emit event to trigger full logout in the app
        // This allows _layout.tsx to listen and redirect to login
        authEvents.emit(AUTH_EVENTS.SESSION_EXPIRED, {
          reason: 'token_expired',
          message: data?.detail || 'Your session has expired. Please log in again.',
        });
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
