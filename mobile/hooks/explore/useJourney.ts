/**
 * Journey Hooks - Life Stage Journey management
 *
 * Provides:
 * - useAvailableJourneys: Browse all journeys
 * - useRecommendedJourneys: AI-suggested journeys
 * - useMyEnrollments: User's active/paused journeys
 * - useJourneyDetails: Single journey info
 * - useEnrollJourney: Start a journey
 * - useTodayContent: Get today's journey content
 * - useCompleteDay: Mark day as complete
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { journeyApi, type Journey, type JourneyEnrollment, type JourneyRecommendation, type TodayContent } from '@/services/api/explore';
import Toast from 'react-native-toast-message';

/**
 * Query keys for journeys
 */
export const journeyKeys = {
  all: ['journeys'] as const,
  available: (category?: string, difficulty?: string) =>
    [...journeyKeys.all, 'available', { category, difficulty }] as const,
  recommended: (limit?: number) => [...journeyKeys.all, 'recommended', limit] as const,
  categories: () => [...journeyKeys.all, 'categories'] as const,
  details: (slug: string) => [...journeyKeys.all, 'details', slug] as const,
  enrollments: (status?: string) => [...journeyKeys.all, 'enrollments', status] as const,
  enrollment: (slug: string) => [...journeyKeys.all, 'enrollment', slug] as const,
  today: (slug: string) => [...journeyKeys.all, 'today', slug] as const,
};

// =============================================================================
// DISCOVERY HOOKS
// =============================================================================

/**
 * Get available journeys for browsing
 */
export function useAvailableJourneys(category?: string, difficulty?: string) {
  return useQuery({
    queryKey: journeyKeys.available(category, difficulty),
    queryFn: () => journeyApi.getAvailableJourneys(category, difficulty),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

/**
 * Get AI-recommended journeys based on user profile
 */
export function useRecommendedJourneys(limit: number = 3) {
  return useQuery({
    queryKey: journeyKeys.recommended(limit),
    queryFn: () => journeyApi.getRecommendedJourneys(limit),
    staleTime: 1000 * 60 * 30, // 30 minutes (recommendations don't change often)
  });
}

/**
 * Get journey categories
 */
export function useJourneyCategories() {
  return useQuery({
    queryKey: journeyKeys.categories(),
    queryFn: journeyApi.getCategories,
    staleTime: 1000 * 60 * 60, // 1 hour (categories rarely change)
  });
}

/**
 * Get journey details by slug
 */
export function useJourneyDetails(slug: string) {
  return useQuery({
    queryKey: journeyKeys.details(slug),
    queryFn: () => journeyApi.getJourneyDetails(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 15, // 15 minutes
  });
}

// =============================================================================
// ENROLLMENT HOOKS
// =============================================================================

/**
 * Get user's enrollments
 */
export function useMyEnrollments(status?: 'active' | 'paused' | 'completed' | 'abandoned') {
  return useQuery({
    queryKey: journeyKeys.enrollments(status),
    queryFn: () => journeyApi.getMyEnrollments(status),
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get specific enrollment
 */
export function useEnrollment(slug: string) {
  return useQuery({
    queryKey: journeyKeys.enrollment(slug),
    queryFn: () => journeyApi.getEnrollment(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Enroll in a journey
 */
export function useEnrollJourney() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ slug, startDate }: { slug: string; startDate?: string }) =>
      journeyApi.enroll(slug, startDate),
    onSuccess: (data, { slug }) => {
      // Invalidate enrollments and journey details
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollment(slug) });
      queryClient.invalidateQueries({ queryKey: journeyKeys.available() });

      Toast.show({
        type: 'success',
        text1: 'Journey Started!',
        text2: 'Your spiritual journey has begun',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to start journey',
      });
    },
  });
}

// =============================================================================
// PROGRESS HOOKS
// =============================================================================

/**
 * Get today's content for a journey
 */
export function useTodayContent(slug: string) {
  return useQuery({
    queryKey: journeyKeys.today(slug),
    queryFn: () => journeyApi.getTodayContent(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Complete today's journey day
 */
export function useCompleteDay(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: {
      time_spent_seconds: number;
      scripture_read: boolean;
      devotion_read: boolean;
      reflection_answered: boolean;
      prayer_completed: boolean;
      notes?: string;
      reflection_responses?: string[];
      rating?: number;
    }) => journeyApi.completeDay(slug, data),
    onSuccess: (result) => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: journeyKeys.today(slug) });
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollment(slug) });
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollments() });

      // Show appropriate toast based on completion
      if (result.journey_completed) {
        Toast.show({
          type: 'success',
          text1: 'Journey Completed! 🎉',
          text2: 'Congratulations on completing your journey!',
        });
      } else if (result.week_completed) {
        Toast.show({
          type: 'success',
          text1: 'Week Completed! 🌟',
          text2: `Moving to Week ${result.next_week}`,
        });
      } else {
        Toast.show({
          type: 'success',
          text1: 'Day Completed! ✓',
          text2: 'Great progress!',
        });
      }
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to save progress',
      });
    },
  });
}

// =============================================================================
// JOURNEY STATE HOOKS
// =============================================================================

/**
 * Pause a journey
 */
export function usePauseJourney(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (reason?: string) => journeyApi.pause(slug, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollment(slug) });
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollments() });

      Toast.show({
        type: 'info',
        text1: 'Journey Paused',
        text2: 'You can resume anytime',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to pause journey',
      });
    },
  });
}

/**
 * Resume a paused journey
 */
export function useResumeJourney(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => journeyApi.resume(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollment(slug) });
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollments() });

      Toast.show({
        type: 'success',
        text1: 'Journey Resumed',
        text2: 'Welcome back!',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to resume journey',
      });
    },
  });
}

/**
 * Abandon a journey
 */
export function useAbandonJourney(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => journeyApi.abandon(slug),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollment(slug) });
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollments() });
      queryClient.invalidateQueries({ queryKey: journeyKeys.available() });

      Toast.show({
        type: 'info',
        text1: 'Journey Left',
        text2: 'You can start again anytime',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to leave journey',
      });
    },
  });
}

/**
 * Submit journey completion feedback
 */
export function useSubmitFeedback(slug: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ rating, testimony }: { rating: number; testimony?: string }) =>
      journeyApi.submitFeedback(slug, rating, testimony),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: journeyKeys.enrollment(slug) });

      Toast.show({
        type: 'success',
        text1: 'Thank You!',
        text2: 'Your feedback helps others',
      });
    },
    onError: (error: any) => {
      Toast.show({
        type: 'error',
        text1: 'Error',
        text2: error.message || 'Failed to submit feedback',
      });
    },
  });
}
