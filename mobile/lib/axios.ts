import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { router } from "expo-router";
import { API_BASE_URL, STORAGE_KEYS } from "./constants";
import { useAuthStore } from "@/stores/auth";

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor - Attach JWT token
api.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await SecureStore.getItemAsync(STORAGE_KEYS.AUTH_TOKEN);

      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }

      // Log request in development
      if (__DEV__) {
        console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
      }

      return config;
    } catch (error) {
      // SEC-M5 FIX: Only log in development
      if (__DEV__) console.error("[API] Error in request interceptor:", error);
      return config;
    }
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors
api.interceptors.response.use(
  (response) => {
    if (__DEV__) {
      console.log(`[API] Response from ${response.config.url}:`, response.status);
    }
    return response;
  },
  async (error: AxiosError) => {
    if (error.response) {
      const status = error.response.status;
      const url = error.config?.url || "unknown";

      // Log error in development
      if (__DEV__) {
        console.error(`[API] Error ${status} from ${url}:`, error.response.data);
      }

      // Handle 401 Unauthorized - Token expired or invalid
      // SEC FIX: Use auth store logout for complete state cleanup
      if (status === 401) {
        // Clear auth data using store for complete state reset
        const authStore = useAuthStore.getState();
        await authStore.logout();

        // Navigate to login screen
        // Use setTimeout to allow the error to propagate first
        setTimeout(() => {
          try {
            router.replace("/(auth)/login");
          } catch {
            // Navigation might fail if router not ready, ignore
          }
        }, 100);
      }

      // SEC-M5 FIX: Only log error details in development
      // Handle 403 Forbidden
      if (status === 403 && __DEV__) {
        console.error("[API] Access forbidden - insufficient permissions");
      }

      // Handle 404 Not Found
      if (status === 404 && __DEV__) {
        console.error("[API] Resource not found:", url);
      }

      // Handle 500 Server Error
      if (status >= 500 && __DEV__) {
        console.error("[API] Server error - please try again later");
      }
    } else if (error.request) {
      // Network error - no response received
      if (__DEV__) console.error("[API] Network error - no response from server");
    } else {
      // Something else happened
      if (__DEV__) console.error("[API] Request error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
