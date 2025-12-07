/**
 * Error Helper Utilities
 *
 * Provides type-safe error message extraction for catch blocks.
 * Handles Axios errors, standard Error objects, and unknown errors.
 */

import { AxiosError } from 'axios';

interface ApiErrorResponse {
  detail?: string;
  message?: string;
  error?: string;
}

/**
 * Safely extracts an error message from an unknown error.
 * Handles Axios errors, standard Error objects, and unknown types.
 *
 * @param error - The caught error (type unknown)
 * @param fallback - Fallback message if error cannot be parsed
 * @returns The extracted error message
 *
 * @example
 * try {
 *   await api.post('/endpoint');
 * } catch (error: unknown) {
 *   setError(getErrorMessage(error, 'Failed to submit'));
 * }
 */
export function getErrorMessage(error: unknown, fallback = 'An error occurred'): string {
  // Handle Axios errors (most common in API calls)
  if (isAxiosError(error)) {
    const data = error.response?.data as ApiErrorResponse | undefined;
    return data?.detail || data?.message || data?.error || error.message || fallback;
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    return error.message || fallback;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Unknown error type
  return fallback;
}

/**
 * Type guard for Axios errors
 */
export function isAxiosError(error: unknown): error is AxiosError<ApiErrorResponse> {
  return (
    error !== null &&
    typeof error === 'object' &&
    'isAxiosError' in error &&
    (error as AxiosError).isAxiosError === true
  );
}

/**
 * Logs error with context and returns message for display
 *
 * @param error - The caught error
 * @param context - Context string for logging (e.g., 'ProfileUpdate', 'LoginOTP')
 * @param fallback - Fallback message
 * @returns The extracted error message
 */
export function handleError(
  error: unknown,
  context: string,
  fallback = 'An error occurred'
): string {
  const message = getErrorMessage(error, fallback);
  console.error(`[${context}] Error:`, error);
  return message;
}
