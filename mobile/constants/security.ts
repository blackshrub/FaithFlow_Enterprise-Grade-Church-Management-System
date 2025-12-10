/**
 * Security Configuration for FaithFlow Mobile App
 *
 * This file contains security-related constants including
 * SSL certificate pins for production API domains.
 *
 * IMPORTANT: Certificate pinning is only active in production builds.
 * Update these hashes when certificates are renewed (typically annually).
 *
 * To generate SHA-256 pins from your server certificate:
 *
 * 1. Using openssl (from server certificate):
 *    openssl s_client -connect api.yourdomain.com:443 | openssl x509 -pubkey -noout | openssl pkey -pubin -outform DER | openssl dgst -sha256 -binary | openssl enc -base64
 *
 * 2. Using curl (from live domain):
 *    curl --verbose https://api.yourdomain.com 2>&1 | grep "public key pin-sha256"
 *
 * 3. Using SSL Labs:
 *    Visit https://www.ssllabs.com/ssltest/analyze.html?d=api.yourdomain.com
 *    Look for "Pin SHA256" in the certificate chain
 *
 * Always include at least 2 pins:
 * - Primary: Current certificate's public key hash
 * - Backup: Next certificate's public key hash OR CA intermediate certificate
 */

// =============================================================================
// SSL CERTIFICATE PINS
// =============================================================================

/**
 * Production API domain SSL pins
 *
 * Replace these placeholder hashes with actual certificate pins
 * from your production server before deploying to production.
 */
export const SSL_PINS = {
  /**
   * Primary API domain (api.flow.gkbj.org or your production domain)
   */
  'api.flow.gkbj.org': {
    // Primary certificate pin - REPLACE with actual hash
    primary: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    // Backup certificate pin - REPLACE with CA intermediate or backup cert
    backup: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  },

  /**
   * MQTT broker domain for real-time messaging
   */
  'mqtt.flow.gkbj.org': {
    primary: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    backup: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  },

  /**
   * File storage domain (SeaweedFS/CDN)
   */
  'files.flow.gkbj.org': {
    primary: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
    backup: 'BBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB=',
  },
} as const;

/**
 * Get all pins for a domain as an array (for native configuration)
 */
export function getPinsForDomain(domain: keyof typeof SSL_PINS): string[] {
  const pins = SSL_PINS[domain];
  if (!pins) return [];
  return [pins.primary, pins.backup];
}

/**
 * Get all configured domains
 */
export function getPinnedDomains(): string[] {
  return Object.keys(SSL_PINS);
}

// =============================================================================
// NETWORK SECURITY CONFIGURATION
// =============================================================================

/**
 * Network security settings for the app
 */
export const NETWORK_SECURITY = {
  /**
   * Enable certificate pinning (only in production)
   * Set to false to disable pinning for debugging
   */
  enablePinning: !__DEV__,

  /**
   * Allow cleartext (HTTP) traffic
   * Should be false in production
   */
  allowCleartext: __DEV__,

  /**
   * Certificate pin validation mode
   * - 'enforce': Block requests on pin mismatch
   * - 'report': Log but allow requests (for testing)
   */
  pinningMode: __DEV__ ? 'report' : 'enforce' as 'enforce' | 'report',

  /**
   * Connection timeout for pinning validation (ms)
   */
  validationTimeout: 10000,
} as const;

// =============================================================================
// APP TRANSPORT SECURITY (iOS)
// =============================================================================

/**
 * iOS App Transport Security exception domains
 * These are only used in development
 */
export const ATS_EXCEPTION_DOMAINS = __DEV__
  ? [
      'localhost',
      '192.168.0.60',
      '10.0.2.2', // Android emulator
    ]
  : [];

// =============================================================================
// SECURITY HEADERS
// =============================================================================

/**
 * Security headers to include in API requests
 */
export const SECURITY_HEADERS = {
  /**
   * Strict Transport Security header value
   * Tells browser to only use HTTPS
   */
  HSTS: 'max-age=31536000; includeSubDomains; preload',

  /**
   * Content Security Policy directives
   * (Applied server-side, included here for reference)
   */
  CSP: "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'",
} as const;
