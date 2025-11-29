/**
 * Overlay Types Helper
 *
 * Type definitions for overlay components.
 * Provides cleaner imports for modal development.
 */

import type { OverlayComponentProps } from '@/stores/overlayStore';

// Re-export the main props type for convenience
export type { OverlayComponentProps };

/**
 * Base props that every overlay receives
 */
export interface BaseOverlayProps {
  /** Close/dismiss this overlay */
  onClose: () => void;
}

/**
 * Shorthand alias for overlay component props with typed payload
 * New API uses onClose instead of dismiss
 */
export type OverlayProps<P = any> = BaseOverlayProps & {
  payload?: P;
  // Also spread payload props directly for convenience
} & Partial<P>;

/**
 * Overlay with typed payload (required)
 */
export type TypedOverlayProps<P> = BaseOverlayProps & {
  payload: P;
};

/**
 * Overlay with optional payload
 */
export type OptionalPayloadOverlayProps<P> = BaseOverlayProps & {
  payload?: P;
};
