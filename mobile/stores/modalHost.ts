/**
 * Modal Host Store (Zustand)
 *
 * Centralized state management for all modals.
 * Single source of truth - replaces scattered modal control patterns.
 *
 * Supports:
 * - rating: RatingReviewModal
 * - calendar: CalendarModal
 * - categoryFilter: CategoryFilterModal
 * - noteEditor: NoteEditorModal
 * - streakDetails: StreakDetailsSheet
 * - prayerNew: Prayer request modal (navigation-based)
 */

import { create } from 'zustand';

// ============================================================================
// TYPES
// ============================================================================

export type ModalType =
  | 'rating'
  | 'calendar'
  | 'categoryFilter'
  | 'noteEditor'
  | 'streakDetails'
  | 'prayerNew';

/**
 * Type-safe payload definitions for each modal type
 */
export interface ModalPayloads {
  rating: {
    eventId: string;
    eventName: string;
    existingRating?: number;
    existingReview?: string;
    onSubmit: (rating: number, review: string) => void;
  };
  calendar: {
    selectedDate?: Date;
    onDateSelect?: (date: Date) => void;
  };
  categoryFilter: {
    categories: Array<{ id: string; name: string }>;
    selectedCategory: string | null;
    onSelect: (categoryId: string | null) => void;
  };
  noteEditor: {
    book: string;
    chapter: number;
    verse: number;
    existingNote?: string;
    onSave?: (note: string) => void;
  };
  streakDetails: {
    streakCount: number;
    longestStreak: number;
    currentWeekDays: boolean[];
  };
  prayerNew: {
    communityId?: string;
    onSuccess?: () => void;
  };
}

export interface ModalPayload<T extends ModalType = ModalType> {
  type: T;
  props?: ModalPayloads[T];
}

// ============================================================================
// STORE
// ============================================================================

interface ModalHostState {
  /** Currently open modal (null = none) */
  current: ModalPayload | null;

  /** Queue for stacked modals (future feature) */
  queue: ModalPayload[];

  /** Open a modal with type-safe props */
  open: <T extends ModalType>(type: T, props?: ModalPayloads[T]) => void;

  /** Close the current modal */
  close: () => void;

  /** Reset all modal state */
  reset: () => void;

  /** Check if a specific modal type is open */
  isOpen: (type: ModalType) => boolean;
}

export const useModalHost = create<ModalHostState>((set, get) => ({
  current: null,
  queue: [],

  open: <T extends ModalType>(type: T, props?: ModalPayloads[T]) => {
    set({
      current: {
        type,
        props,
      },
    });
  },

  close: () => {
    set({ current: null });
  },

  reset: () => {
    set({
      current: null,
      queue: [],
    });
  },

  isOpen: (type) => {
    const { current } = get();
    return current?.type === type;
  },
}));

// ============================================================================
// HELPER HOOKS
// ============================================================================

/**
 * Convenience hook for rating modal
 */
export function useRatingModal() {
  const { open, close, isOpen } = useModalHost();

  return {
    open: (props: ModalPayloads['rating']) => open('rating', props),
    close,
    isOpen: isOpen('rating'),
  };
}

/**
 * Convenience hook for calendar modal
 */
export function useCalendarModal() {
  const { open, close, isOpen } = useModalHost();

  return {
    open: (props?: ModalPayloads['calendar']) => open('calendar', props),
    close,
    isOpen: isOpen('calendar'),
  };
}

/**
 * Convenience hook for category filter modal
 */
export function useCategoryFilterModal() {
  const { open, close, isOpen } = useModalHost();

  return {
    open: (props: ModalPayloads['categoryFilter']) => open('categoryFilter', props),
    close,
    isOpen: isOpen('categoryFilter'),
  };
}

/**
 * Convenience hook for note editor modal
 */
export function useNoteEditorModal() {
  const { open, close, isOpen } = useModalHost();

  return {
    open: (props: ModalPayloads['noteEditor']) => open('noteEditor', props),
    close,
    isOpen: isOpen('noteEditor'),
  };
}

/**
 * Convenience hook for streak details modal
 */
export function useStreakDetailsModal() {
  const { open, close, isOpen } = useModalHost();

  return {
    open: (props: ModalPayloads['streakDetails']) => open('streakDetails', props),
    close,
    isOpen: isOpen('streakDetails'),
  };
}
