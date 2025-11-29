// stores/overlayStore.ts
import { create } from 'zustand';
import React from 'react';

export type OverlayType =
  | 'center-modal'
  | 'bottom-sheet'
  | null;

export interface OverlayConfig {
  component: React.ComponentType<any> | null;
  props?: Record<string, any>;
}

interface OverlayState {
  type: OverlayType;
  config: OverlayConfig;

  showCenterModal: (component: React.ComponentType<any>, props?: any) => void;
  showBottomSheet: (component: React.ComponentType<any>, props?: any) => void;

  close: () => void;
  reset: () => void;
}

export const useOverlayStore = create<OverlayState>((set) => ({
  type: null,
  config: { component: null, props: {} },

  showCenterModal: (component, props = {}) =>
    set(() => ({
      type: 'center-modal',
      config: { component, props },
    })),

  showBottomSheet: (component, props = {}) =>
    set(() => ({
      type: 'bottom-sheet',
      config: { component, props },
    })),

  close: () =>
    set(() => ({
      type: null,
      config: { component: null, props: {} },
    })),

  reset: () =>
    set(() => ({
      type: null,
      config: { component: null, props: {} },
    })),
}));

/** Convenience hook */
export const useOverlay = () => useOverlayStore();

// =============================================================================
// TYPED PAYLOAD INTERFACES (for specific modals) - kept for backwards compatibility
// =============================================================================

/** Rating modal payload */
export interface RatingPayload {
  eventId: string;
  eventName: string;
  existingRating?: number;
  existingReview?: string;
  onSubmit: (rating: number, review: string) => Promise<void> | void;
}

/** Calendar modal payload */
export interface CalendarPayload {
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  onConfirm?: (date: Date) => void;
}

/** Category filter payload */
export interface CategoryFilterPayload {
  categories: Array<{ id: string; name: string; icon?: string; color?: string }>;
  selectedCategory: string | null;
  onSelect: (categoryId: string | null) => void;
}

/** Note editor payload */
export interface NoteEditorPayload {
  book: string;
  chapter: number;
  verse: number;
  existingNote?: string;
  onSave?: (note: string) => void;
}

/** Streak details payload */
export interface StreakDetailsPayload {
  streakCount: number;
  longestStreak: number;
  currentWeekDays: boolean[];
}

/** Props passed to every overlay component */
export interface OverlayComponentProps<P = any> {
  payload?: P;
  onClose: () => void;
}

export default useOverlayStore;
