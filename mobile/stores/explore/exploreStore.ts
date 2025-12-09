/**
 * Explore Store
 *
 * Global state management for Explore feature using Zustand
 * With MMKV persistence for instant app launch experience
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/shallow';
import { mmkvStorage } from '@/lib/storage';
import type { Language } from '@/types/explore';

interface ExploreStore {
  // User preferences
  contentLanguage: Language;
  setContentLanguage: (language: Language) => void;

  // Active content
  activeContentId: string | null;
  activeContentType: string | null;
  setActiveContent: (contentId: string, contentType: string) => void;
  clearActiveContent: () => void;

  // Reading session
  readingStartTime: Date | null;
  startReading: () => void;
  endReading: () => number; // Returns seconds elapsed

  // Content completion tracking (for mock mode)
  completedContentIds: Set<string>;
  markContentComplete: (contentId: string) => void;
  isContentCompleted: (contentId: string) => boolean;

  // Celebration modal
  showCelebration: boolean;
  celebrationType: 'streak' | 'quiz_perfect' | 'milestone' | 'complete' | null;
  celebrationData: any;
  triggerCelebration: (type: 'streak' | 'quiz_perfect' | 'milestone' | 'complete', data: any) => void;
  closeCelebration: () => void;
}

export const useExploreStore = create<ExploreStore>()(
  persist(
    (set, get) => ({
      // User preferences
      contentLanguage: 'en',
      setContentLanguage: (language) => set({ contentLanguage: language }),

      // Active content
      activeContentId: null,
      activeContentType: null,
      setActiveContent: (contentId, contentType) =>
        set({ activeContentId: contentId, activeContentType: contentType }),
      clearActiveContent: () =>
        set({ activeContentId: null, activeContentType: null }),

      // Reading session
      readingStartTime: null,
      startReading: () => set({ readingStartTime: new Date() }),
      endReading: () => {
        const startTime = get().readingStartTime;
        if (!startTime) return 0;

        const endTime = new Date();
        const seconds = Math.floor((endTime.getTime() - startTime.getTime()) / 1000);
        set({ readingStartTime: null });
        return seconds;
      },

      // Content completion tracking (for mock mode)
      completedContentIds: new Set<string>(),
      markContentComplete: (contentId) =>
        set((state) => ({
          completedContentIds: new Set([...state.completedContentIds, contentId]),
        })),
      isContentCompleted: (contentId) => get().completedContentIds.has(contentId),

      // Celebration modal
      showCelebration: false,
      celebrationType: null,
      celebrationData: null,
      triggerCelebration: (type, data) =>
        set({
          showCelebration: true,
          celebrationType: type,
          celebrationData: data,
        }),
      closeCelebration: () =>
        set({
          showCelebration: false,
          celebrationType: null,
          celebrationData: null,
        }),
    }),
    {
      name: 'faithflow-explore',
      storage: createJSONStorage(() => mmkvStorage),
      // Only persist user preferences and completion tracking
      partialize: (state) => ({
        contentLanguage: state.contentLanguage,
        // Convert Set to Array for JSON serialization
        completedContentIds: Array.from(state.completedContentIds),
      }),
      // Rehydrate: Convert Array back to Set
      onRehydrateStorage: () => (state) => {
        if (state) {
          // Type assertion for the serialized form
          const serialized = state as unknown as { completedContentIds?: string[] };
          if (Array.isArray(serialized.completedContentIds)) {
            state.completedContentIds = new Set(serialized.completedContentIds);
          }
        }
      },
    }
  )
);

// Granular selectors - prevent cascading re-renders
export const useContentLanguage = () => useExploreStore((s) => s.contentLanguage);
export const useActiveContent = () =>
  useExploreStore(
    useShallow((s) => ({
      activeContentId: s.activeContentId,
      activeContentType: s.activeContentType,
    }))
  );
export const useShowCelebration = () => useExploreStore((s) => s.showCelebration);
export const useCelebrationType = () => useExploreStore((s) => s.celebrationType);
export const useCelebrationData = () => useExploreStore((s) => s.celebrationData);

// Actions selector - never causes re-renders since actions are stable
export const useExploreActions = () =>
  useExploreStore(
    useShallow((s) => ({
      setContentLanguage: s.setContentLanguage,
      setActiveContent: s.setActiveContent,
      clearActiveContent: s.clearActiveContent,
      startReading: s.startReading,
      endReading: s.endReading,
      markContentComplete: s.markContentComplete,
      isContentCompleted: s.isContentCompleted,
      triggerCelebration: s.triggerCelebration,
      closeCelebration: s.closeCelebration,
    }))
  );
