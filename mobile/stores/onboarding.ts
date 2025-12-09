/**
 * Onboarding Store - Manages spiritual profile onboarding state
 *
 * Features:
 * - Multi-step question flow with progress tracking
 * - Persisted completion state via MMKV
 * - Support for single_choice, multiple_choice, slider, text question types
 * - Skip functionality with graceful degradation
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/shallow';
import { persist, createJSONStorage } from 'zustand/middleware';
import { mmkvStorage } from '@/lib/storage';
import type { OnboardingQuestion, OnboardingResponse, UserProfile } from '@/services/api/explore';

interface OnboardingState {
  // Status
  isLoading: boolean;
  hasCompletedOnboarding: boolean;
  hasSkippedOnboarding: boolean;

  // Questions flow
  questions: OnboardingQuestion[];
  currentIndex: number;
  responses: Record<string, string | string[] | number>; // question_id -> value

  // User profile (after completion)
  profile: UserProfile | null;

  // Actions
  setQuestions: (questions: OnboardingQuestion[]) => void;
  setResponse: (questionId: string, value: string | string[] | number) => void;
  nextQuestion: () => void;
  previousQuestion: () => void;
  goToQuestion: (index: number) => void;

  // Completion
  markCompleted: (profile: UserProfile) => void;
  markSkipped: () => void;

  // Reset (for testing/re-onboarding)
  reset: () => void;

  // Loading
  setLoading: (loading: boolean) => void;
}

const initialState = {
  isLoading: false,
  hasCompletedOnboarding: false,
  hasSkippedOnboarding: false,
  questions: [],
  currentIndex: 0,
  responses: {},
  profile: null,
};

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setQuestions: (questions) => set({ questions, currentIndex: 0 }),

      setResponse: (questionId, value) => set((state) => ({
        responses: { ...state.responses, [questionId]: value },
      })),

      nextQuestion: () => set((state) => ({
        currentIndex: Math.min(state.currentIndex + 1, state.questions.length - 1),
      })),

      previousQuestion: () => set((state) => ({
        currentIndex: Math.max(state.currentIndex - 1, 0),
      })),

      goToQuestion: (index) => set((state) => ({
        currentIndex: Math.max(0, Math.min(index, state.questions.length - 1)),
      })),

      markCompleted: (profile) => set({
        hasCompletedOnboarding: true,
        hasSkippedOnboarding: false,
        profile,
      }),

      markSkipped: () => set({
        hasCompletedOnboarding: false,
        hasSkippedOnboarding: true,
      }),

      reset: () => set(initialState),

      setLoading: (isLoading) => set({ isLoading }),
    }),
    {
      name: 'onboarding-storage',
      storage: createJSONStorage(() => mmkvStorage),
      partialize: (state) => ({
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        hasSkippedOnboarding: state.hasSkippedOnboarding,
        responses: state.responses,
        profile: state.profile,
      }),
    }
  )
);

// =============================================================================
// SHALLOW SELECTORS - Prevent unnecessary re-renders
// =============================================================================

/**
 * Use when checking onboarding completion status
 */
export const useOnboardingStatus = () =>
  useOnboardingStore(
    useShallow((state) => ({
      hasCompletedOnboarding: state.hasCompletedOnboarding,
      hasSkippedOnboarding: state.hasSkippedOnboarding,
      isLoading: state.isLoading,
    }))
  );

/**
 * Use for the current question in the flow
 */
export const useCurrentQuestion = () =>
  useOnboardingStore(
    useShallow((state) => ({
      question: state.questions[state.currentIndex],
      index: state.currentIndex,
      total: state.questions.length,
      response: state.responses[state.questions[state.currentIndex]?.id],
      isFirst: state.currentIndex === 0,
      isLast: state.currentIndex === state.questions.length - 1,
    }))
  );

/**
 * Use for navigation actions
 */
export const useOnboardingActions = () =>
  useOnboardingStore(
    useShallow((state) => ({
      setQuestions: state.setQuestions,
      setResponse: state.setResponse,
      nextQuestion: state.nextQuestion,
      previousQuestion: state.previousQuestion,
      goToQuestion: state.goToQuestion,
      markCompleted: state.markCompleted,
      markSkipped: state.markSkipped,
      reset: state.reset,
      setLoading: state.setLoading,
    }))
  );

/**
 * Get all responses for submission
 */
export const useOnboardingResponses = () =>
  useOnboardingStore((state) => state.responses);

/**
 * Get user profile
 */
export const useUserProfile = () =>
  useOnboardingStore((state) => state.profile);
