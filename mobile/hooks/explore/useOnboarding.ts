/**
 * Onboarding Hooks - Fetch and submit spiritual profile onboarding
 *
 * Provides:
 * - useOnboardingQuestions: Fetch available questions
 * - useSubmitOnboarding: Submit responses
 * - useSkipOnboarding: Skip onboarding
 * - useOnboardingFlow: Combined hook for the full flow
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { profileApi, type OnboardingResponse, type UserProfile } from '@/services/api/explore';
import { useOnboardingStore, useOnboardingActions, useOnboardingStatus } from '@/stores/onboarding';
import { useEffect } from 'react';
import Toast from 'react-native-toast-message';

/**
 * Query keys for onboarding
 */
export const onboardingKeys = {
  all: ['onboarding'] as const,
  questions: () => [...onboardingKeys.all, 'questions'] as const,
  profile: () => [...onboardingKeys.all, 'profile'] as const,
};

/**
 * Fetch onboarding questions
 */
export function useOnboardingQuestions() {
  const { setQuestions, setLoading } = useOnboardingActions();

  const query = useQuery({
    queryKey: onboardingKeys.questions(),
    queryFn: async () => {
      setLoading(true);
      try {
        const questions = await profileApi.getOnboardingQuestions();
        setQuestions(questions);
        return questions;
      } finally {
        setLoading(false);
      }
    },
    staleTime: 1000 * 60 * 60, // 1 hour - questions rarely change
  });

  return query;
}

/**
 * Fetch user profile
 */
export function useUserProfileQuery() {
  return useQuery({
    queryKey: onboardingKeys.profile(),
    queryFn: profileApi.getMyProfile,
    staleTime: 1000 * 60 * 5, // 5 minutes
    retry: false, // Don't retry if user has no profile yet
  });
}

/**
 * Submit onboarding responses
 */
export function useSubmitOnboarding() {
  const queryClient = useQueryClient();
  const { markCompleted, setLoading } = useOnboardingActions();

  return useMutation({
    mutationFn: async (responses: OnboardingResponse[]) => {
      setLoading(true);
      try {
        const result = await profileApi.submitOnboarding(responses, false);
        // Fetch updated profile
        const profile = await profileApi.getMyProfile();
        return { result, profile };
      } finally {
        setLoading(false);
      }
    },
    onSuccess: ({ profile }) => {
      markCompleted(profile);
      queryClient.invalidateQueries({ queryKey: onboardingKeys.profile() });
      Toast.show({
        type: 'success',
        text1: 'Profile Created',
        text2: 'Your spiritual journey has begun!',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to save your profile',
      });
    },
  });
}

/**
 * Skip onboarding
 */
export function useSkipOnboarding() {
  const queryClient = useQueryClient();
  const { markSkipped, setLoading } = useOnboardingActions();

  return useMutation({
    mutationFn: async () => {
      setLoading(true);
      try {
        const result = await profileApi.skipOnboarding();
        return result;
      } finally {
        setLoading(false);
      }
    },
    onSuccess: () => {
      markSkipped();
      queryClient.invalidateQueries({ queryKey: onboardingKeys.profile() });
    },
    onError: (error: any) => {
      // Even if API fails, mark as skipped locally
      markSkipped();
      console.warn('Skip onboarding API failed, skipped locally:', error);
    },
  });
}

/**
 * Combined hook for the onboarding flow
 * Initializes questions and provides all necessary state/actions
 */
export function useOnboardingFlow() {
  const { hasCompletedOnboarding, hasSkippedOnboarding, isLoading } = useOnboardingStatus();
  const questionsQuery = useOnboardingQuestions();
  const submitMutation = useSubmitOnboarding();
  const skipMutation = useSkipOnboarding();
  const responses = useOnboardingStore((state) => state.responses);
  const questions = useOnboardingStore((state) => state.questions);
  const currentIndex = useOnboardingStore((state) => state.currentIndex);

  /**
   * Check if onboarding should be shown
   */
  const shouldShowOnboarding = !hasCompletedOnboarding && !hasSkippedOnboarding;

  /**
   * Submit all responses
   */
  const submit = async () => {
    const formattedResponses: OnboardingResponse[] = Object.entries(responses).map(
      ([question_id, value]) => ({
        question_id,
        value,
      })
    );
    await submitMutation.mutateAsync(formattedResponses);
  };

  /**
   * Skip onboarding
   */
  const skip = async () => {
    await skipMutation.mutateAsync();
  };

  /**
   * Get progress percentage
   */
  const progress = questions.length > 0
    ? Math.round(((currentIndex + 1) / questions.length) * 100)
    : 0;

  return {
    // State
    shouldShowOnboarding,
    isLoading: isLoading || questionsQuery.isLoading,
    isSubmitting: submitMutation.isPending,
    isSkipping: skipMutation.isPending,
    questions,
    currentIndex,
    progress,
    hasCompletedOnboarding,
    hasSkippedOnboarding,

    // Error state
    error: questionsQuery.error,

    // Actions
    submit,
    skip,
    refetch: questionsQuery.refetch,
  };
}
