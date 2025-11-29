/**
 * Overlay Components - Simplified Unified System
 *
 * Central exports for the overlay system.
 *
 * API:
 * - useOverlay() - Main hook for showing/dismissing overlays
 * - UnifiedOverlayHost - Root-level component that renders all overlays
 *
 * Usage:
 * const { showCenterModal, showBottomSheet, close } = useOverlay();
 * showCenterModal(MyComponent, { prop1: 'value' });
 * showBottomSheet(MySheet, { data: someData });
 * close(); // dismiss current overlay
 */

// =============================================================================
// UNIFIED OVERLAY SYSTEM
// =============================================================================

export { UnifiedOverlayHost } from './UnifiedOverlayHost';
export { BaseBottomSheet } from './BaseBottomSheet';
export { SharedAxisModal } from './SharedAxisModal';

// Re-export store and hooks
export {
  useOverlay,
  useOverlayStore,
} from '@/stores/overlayStore';

export type {
  OverlayType,
  OverlayConfig,
  OverlayComponentProps,
  // Payload types (for backwards compatibility)
  RatingPayload,
  CalendarPayload,
  CategoryFilterPayload,
  NoteEditorPayload,
  StreakDetailsPayload,
} from '@/stores/overlayStore';

// Re-export modal components
export {
  RatingModal,
  CategoryFilterSheet,
  CalendarSheet,
  StreakDetailsModal,
  NoteEditorSheet,
  CelebrationModal,
  CompletedTodayModal,
  StudiesModal,
} from './modals';
export type { CelebrationPayload, CelebrationType, CompletedTodayPayload, StudiesPayload } from './modals';

// Re-export theme
export { overlayTheme, getModalStyles, getSheetStyles, getTypographyColor } from '@/theme/overlayTheme';
