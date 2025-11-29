/**
 * AI Error Handler
 *
 * Comprehensive error handling for AI service with:
 * - Error classification
 * - User-friendly messages
 * - Retry logic with exponential backoff
 * - Timeout handling
 * - Rate limit handling
 */

export type AIErrorType =
  | 'network'        // Network connectivity issues
  | 'timeout'        // Request timed out
  | 'rate_limit'     // Too many requests
  | 'token_limit'    // Context too long
  | 'auth'           // API key issues
  | 'server'         // Anthropic server error
  | 'invalid_request' // Bad request format
  | 'content_filter' // Content blocked
  | 'unknown';       // Unknown error

export interface AIError {
  type: AIErrorType;
  message: string;
  messageId: string; // Indonesian message
  retryable: boolean;
  retryAfter?: number; // Milliseconds to wait before retry
  originalError?: Error;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;  // Initial delay in ms
  maxDelay: number;   // Maximum delay in ms
  backoffFactor: number;
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,    // 1 second
  maxDelay: 10000,    // 10 seconds
  backoffFactor: 2,
};

// Timeout configuration (per model tier)
export const TIMEOUT_CONFIG = {
  simple: 15000,      // 15s for Haiku
  standard: 45000,    // 45s for Sonnet
  complex: 90000,     // 90s for Opus
  default: 60000,     // 60s default
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<AIErrorType, { en: string; id: string }> = {
  network: {
    en: 'Unable to connect. Please check your internet connection and try again.',
    id: 'Tidak dapat terhubung. Periksa koneksi internet Anda dan coba lagi.',
  },
  timeout: {
    en: 'The response is taking too long. Please try again with a shorter message.',
    id: 'Respons terlalu lama. Coba lagi dengan pesan yang lebih pendek.',
  },
  rate_limit: {
    en: 'Too many requests. Please wait a moment and try again.',
    id: 'Terlalu banyak permintaan. Tunggu sebentar dan coba lagi.',
  },
  token_limit: {
    en: 'Your message is too long. Please try with a shorter message or start a new conversation.',
    id: 'Pesan Anda terlalu panjang. Coba dengan pesan lebih pendek atau mulai percakapan baru.',
  },
  auth: {
    en: 'Authentication error. Please restart the app and try again.',
    id: 'Kesalahan autentikasi. Mulai ulang aplikasi dan coba lagi.',
  },
  server: {
    en: 'The service is temporarily unavailable. Please try again later.',
    id: 'Layanan sementara tidak tersedia. Coba lagi nanti.',
  },
  invalid_request: {
    en: 'Something went wrong with your request. Please try again.',
    id: 'Terjadi kesalahan dengan permintaan Anda. Coba lagi.',
  },
  content_filter: {
    en: 'Your message could not be processed. Please rephrase and try again.',
    id: 'Pesan Anda tidak dapat diproses. Ubah kata-kata dan coba lagi.',
  },
  unknown: {
    en: 'An unexpected error occurred. Please try again.',
    id: 'Terjadi kesalahan tak terduga. Coba lagi.',
  },
};

/**
 * Classify error from API response or exception
 */
export function classifyError(error: unknown): AIError {
  // Handle fetch errors
  if (error instanceof TypeError && error.message.includes('Network')) {
    return {
      type: 'network',
      message: ERROR_MESSAGES.network.en,
      messageId: ERROR_MESSAGES.network.id,
      retryable: true,
      retryAfter: 2000,
      originalError: error,
    };
  }

  // Handle timeout errors
  if (error instanceof Error && error.name === 'AbortError') {
    return {
      type: 'timeout',
      message: ERROR_MESSAGES.timeout.en,
      messageId: ERROR_MESSAGES.timeout.id,
      retryable: true,
      retryAfter: 1000,
      originalError: error,
    };
  }

  // Handle API errors (from response body)
  if (error instanceof Error) {
    const errorMessage = error.message.toLowerCase();

    // Rate limit (429)
    if (errorMessage.includes('rate') || errorMessage.includes('429') || errorMessage.includes('too many')) {
      return {
        type: 'rate_limit',
        message: ERROR_MESSAGES.rate_limit.en,
        messageId: ERROR_MESSAGES.rate_limit.id,
        retryable: true,
        retryAfter: 5000,
        originalError: error,
      };
    }

    // Token/context limit
    if (errorMessage.includes('token') || errorMessage.includes('context') || errorMessage.includes('too long')) {
      return {
        type: 'token_limit',
        message: ERROR_MESSAGES.token_limit.en,
        messageId: ERROR_MESSAGES.token_limit.id,
        retryable: false,
        originalError: error,
      };
    }

    // Authentication (401, 403)
    if (errorMessage.includes('401') || errorMessage.includes('403') || errorMessage.includes('auth') || errorMessage.includes('key')) {
      return {
        type: 'auth',
        message: ERROR_MESSAGES.auth.en,
        messageId: ERROR_MESSAGES.auth.id,
        retryable: false,
        originalError: error,
      };
    }

    // Server errors (500, 502, 503, 529)
    if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503') || errorMessage.includes('529') || errorMessage.includes('overloaded')) {
      return {
        type: 'server',
        message: ERROR_MESSAGES.server.en,
        messageId: ERROR_MESSAGES.server.id,
        retryable: true,
        retryAfter: 5000,
        originalError: error,
      };
    }

    // Invalid request (400)
    if (errorMessage.includes('400') || errorMessage.includes('invalid')) {
      return {
        type: 'invalid_request',
        message: ERROR_MESSAGES.invalid_request.en,
        messageId: ERROR_MESSAGES.invalid_request.id,
        retryable: false,
        originalError: error,
      };
    }

    // Content filter
    if (errorMessage.includes('content') || errorMessage.includes('filter') || errorMessage.includes('blocked')) {
      return {
        type: 'content_filter',
        message: ERROR_MESSAGES.content_filter.en,
        messageId: ERROR_MESSAGES.content_filter.id,
        retryable: false,
        originalError: error,
      };
    }
  }

  // Unknown error
  return {
    type: 'unknown',
    message: ERROR_MESSAGES.unknown.en,
    messageId: ERROR_MESSAGES.unknown.id,
    retryable: true,
    retryAfter: 2000,
    originalError: error instanceof Error ? error : new Error(String(error)),
  };
}

/**
 * Calculate delay for retry with exponential backoff
 */
export function calculateRetryDelay(
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): number {
  const delay = Math.min(
    config.baseDelay * Math.pow(config.backoffFactor, attempt),
    config.maxDelay
  );

  // Add jitter (±20%) to prevent thundering herd
  const jitter = delay * 0.2 * (Math.random() - 0.5);
  return Math.round(delay + jitter);
}

/**
 * Check if error should be retried
 */
export function shouldRetry(
  error: AIError,
  attempt: number,
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): boolean {
  return error.retryable && attempt < config.maxRetries;
}

/**
 * Get user-friendly error message
 */
export function getErrorMessage(error: AIError, lang: 'en' | 'id' = 'en'): string {
  return lang === 'id' ? error.messageId : error.message;
}

/**
 * Create timeout promise
 */
export function createTimeout(ms: number): { promise: Promise<never>; cancel: () => void } {
  let timeoutId: ReturnType<typeof setTimeout>;

  const promise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Request timed out after ${ms}ms`));
    }, ms);
  });

  return {
    promise,
    cancel: () => clearTimeout(timeoutId),
  };
}

/**
 * Sleep utility for retry delays
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async functions
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (error: AIError, attempt: number, delay: number) => void
): Promise<T> {
  let lastError: AIError | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = classifyError(error);

      if (!shouldRetry(lastError, attempt, config)) {
        throw lastError;
      }

      const delay = calculateRetryDelay(attempt, config);

      if (onRetry) {
        onRetry(lastError, attempt + 1, delay);
      }

      console.log(`[AIErrorHandler] Retry ${attempt + 1}/${config.maxRetries} after ${delay}ms`);
      await sleep(delay);
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

export default classifyError;
