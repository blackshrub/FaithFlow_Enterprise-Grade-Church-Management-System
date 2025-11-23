import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE_URL, STORAGE_KEYS } from "./constants";

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
      console.error("Error in request interceptor:", error);
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
      if (status === 401) {
        // Clear auth data
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_TOKEN);
        await SecureStore.deleteItemAsync(STORAGE_KEYS.AUTH_MEMBER);

        // TODO: Navigate to login screen
        // This will be handled by the auth store or navigation logic
      }

      // Handle 403 Forbidden
      if (status === 403) {
        console.error("Access forbidden - insufficient permissions");
      }

      // Handle 404 Not Found
      if (status === 404) {
        console.error("Resource not found:", url);
      }

      // Handle 500 Server Error
      if (status >= 500) {
        console.error("Server error - please try again later");
      }
    } else if (error.request) {
      // Network error - no response received
      console.error("Network error - no response from server");
    } else {
      // Something else happened
      console.error("Request error:", error.message);
    }

    return Promise.reject(error);
  }
);

export default api;
