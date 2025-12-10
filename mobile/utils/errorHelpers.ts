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

/**
 * Error severity levels for proper handling
 */
export type ErrorSeverity = 'critical' | 'warning' | 'info';

/**
 * Structured error logging for non-critical operations
 * Use this instead of bare console.error in catch blocks
 *
 * @param context - Module/function context (e.g., 'VoiceSettings', 'PushNotifications')
 * @param operation - What was being attempted (e.g., 'load', 'refresh', 'clear')
 * @param error - The caught error
 * @param severity - How critical is this error
 *
 * @example
 * try {
 *   await loadSettings();
 * } catch (error) {
 *   logError('VoiceSettings', 'load', error, 'warning');
 *   // Continue with defaults
 * }
 */
export function logError(
  context: string,
  operation: string,
  error: unknown,
  severity: ErrorSeverity = 'warning'
): void {
  const message = getErrorMessage(error, 'Unknown error');
  const logFn = severity === 'critical' ? console.error :
                severity === 'warning' ? console.warn : console.log;

  logFn(`[${context}] ${operation} failed:`, message);

  // In production, you could send to error tracking service here
  // e.g., Sentry.captureException(error, { tags: { context, operation, severity } });
}

/**
 * Wraps an async function with error handling
 * Returns [result, error] tuple - never throws
 *
 * @example
 * const [data, error] = await safeAsync(fetchData());
 * if (error) {
 *   // Handle error
 * }
 */
export async function safeAsync<T>(
  promise: Promise<T>,
  context?: string
): Promise<[T | null, Error | null]> {
  try {
    const result = await promise;
    return [result, null];
  } catch (error) {
    if (context) {
      logError(context, 'operation', error, 'warning');
    }
    return [null, error instanceof Error ? error : new Error(getErrorMessage(error))];
  }
}

/**
 * Type guard to check if error is a network error
 */
export function isNetworkError(error: unknown): boolean {
  if (isAxiosError(error)) {
    return !error.response; // No response means network error
  }
  const message = getErrorMessage(error).toLowerCase();
  return message.includes('network') || message.includes('timeout') || message.includes('connection');
}
