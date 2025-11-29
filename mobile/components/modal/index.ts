/**
 * Modal System Exports
 *
 * Centralized modal management with Material Design 3 animations.
 *
 * V4 Update: ModalHost is now deprecated. Use UnifiedOverlayHost instead.
 * The ModalHost export is kept for backwards compatibility.
 */

// Core components
export { ModalHost } from './ModalHost';
export { SharedAxisModal, SHARED_AXIS_Y_CONFIG } from './SharedAxisModal';
export type { SharedAxisModalProps } from './SharedAxisModal';

// V4: Re-export UnifiedOverlayHost for new code
export { UnifiedOverlayHost } from '@/components/overlay';

// Store
export {
  useModalHost,
  useRatingModal,
  useCalendarModal,
  useCategoryFilterModal,
  useNoteEditorModal,
  useStreakDetailsModal,
} from '@/stores/modalHost';
export type { ModalType, ModalPayload, ModalPayloads } from '@/stores/modalHost';
