/**
 * Contextual Companion Hook
 *
 * Provides utilities for launching the companion with specific content context.
 * The companion will stay bounded to the content being discussed.
 *
 * Usage:
 * ```tsx
 * const { launchWithContext, isLoading } = useContextualCompanion();
 *
 * // From a devotion screen:
 * launchWithContext('devotion_reflection', devotion.id);
 *
 * // From a journey day:
 * launchWithContext('journey_day', journeySlug, {
 *   week_number: 1,
 *   day_number: 3,
 * });
 * ```
 */

import { useCallback, useState } from 'react';
import { useRouter } from 'expo-router';
import { useMutation } from '@tanstack/react-query';
import { contextualCompanionApi, type ContextType, type ContextualPromptRequest } from '@/services/api/explore';
import { useCompanionStore, type CompanionContext, type CompanionContextData } from '@/stores/companionStore';
import Toast from 'react-native-toast-message';

/**
 * Map API context types to companion store context types
 */
const mapContextType = (type: ContextType): CompanionContext => {
  const mapping: Record<ContextType, CompanionContext> = {
    devotion_reflection: 'devotion_reflection',
    bible_study_lesson: 'bible_study_lesson',
    journey_day: 'journey_day',
    verse_meditation: 'verse_meditation',
    quiz_explanation: 'quiz_explanation',
  };
  return mapping[type] || 'default';
};

interface LaunchOptions {
  // For journey context
  week_number?: number;
  day_number?: number;
  // For bible study context
  lesson_number?: number;
  // Additional context data
  title?: string;
}

export function useContextualCompanion() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const setEntryContext = useCompanionStore((s) => s.setEntryContext);
  const clearChat = useCompanionStore((s) => s.clearChat);

  /**
   * Fetch contextual system prompt from backend
   */
  const fetchContextMutation = useMutation({
    mutationFn: (request: ContextualPromptRequest) => contextualCompanionApi.getContext(request),
  });

  /**
   * Launch companion with specific content context
   *
   * @param contextType - Type of content context
   * @param contentId - ID of the content (devotion_id, study_id, journey_slug, verse_id, quiz_id)
   * @param options - Additional options like week/day numbers
   */
  const launchWithContext = useCallback(
    async (
      contextType: ContextType,
      contentId: string,
      options?: LaunchOptions
    ) => {
      setIsLoading(true);

      try {
        // Build the request
        const request: ContextualPromptRequest = {
          context_type: contextType,
          content_id: contentId,
          ...(options?.week_number && { week_number: options.week_number }),
          ...(options?.day_number && { day_number: options.day_number }),
          ...(options?.lesson_number && { lesson_number: options.lesson_number }),
        };

        // Fetch contextual prompt from backend
        const response = await fetchContextMutation.mutateAsync(request);

        // Build context data for the store
        const contextData: CompanionContextData = {
          systemPrompt: response.system_prompt,
        };

        // Add type-specific context data
        switch (contextType) {
          case 'devotion_reflection':
            contextData.devotionId = contentId;
            contextData.devotionTitle = response.context_data?.title || options?.title;
            break;
          case 'bible_study_lesson':
            contextData.studyId = contentId;
            contextData.lessonNumber = options?.lesson_number;
            contextData.studyTitle = response.context_data?.study_title || options?.title;
            contextData.lessonTitle = response.context_data?.lesson_title;
            break;
          case 'journey_day':
            contextData.journeySlug = contentId;
            contextData.weekNumber = options?.week_number;
            contextData.dayNumber = options?.day_number;
            contextData.journeyTitle = response.context_data?.journey_title || options?.title;
            break;
          case 'verse_meditation':
            contextData.verseReference = response.context_data?.verse_reference;
            contextData.verseText = response.context_data?.verse_text;
            break;
          case 'quiz_explanation':
            contextData.quizId = contentId;
            contextData.quizTitle = response.context_data?.quiz_title || options?.title;
            break;
        }

        // Clear previous chat and set new context
        clearChat();
        setEntryContext(mapContextType(contextType), contextData);

        // Navigate to companion screen
        router.push('/companion');
      } catch (error: any) {
        console.error('Failed to launch contextual companion:', error);
        Toast.show({
          type: 'error',
          text1: 'Error',
          text2: error.message || 'Failed to start companion',
        });

        // Fallback: open companion without context
        clearChat();
        setEntryContext('default', { systemPrompt: undefined });
        router.push('/companion');
      } finally {
        setIsLoading(false);
      }
    },
    [router, setEntryContext, clearChat, fetchContextMutation]
  );

  /**
   * Launch companion with quick context (no backend call)
   * Useful when you already have the context data
   */
  const launchQuick = useCallback(
    (context: CompanionContext, data?: CompanionContextData) => {
      clearChat();
      setEntryContext(context, data);
      router.push('/companion');
    },
    [router, setEntryContext, clearChat]
  );

  /**
   * Get conversation starters for a context type
   */
  const getStarters = useCallback(
    async (contextType: ContextType, language: string = 'en') => {
      try {
        const starters = await contextualCompanionApi.getStarters(contextType, language);
        return starters;
      } catch (error) {
        console.error('Failed to fetch starters:', error);
        return [];
      }
    },
    []
  );

  return {
    launchWithContext,
    launchQuick,
    getStarters,
    isLoading: isLoading || fetchContextMutation.isPending,
    error: fetchContextMutation.error,
  };
}

/**
 * Pre-built context launchers for common use cases
 */
export const contextLaunchers = {
  /**
   * Launch companion for devotion reflection
   */
  forDevotion: (
    launch: ReturnType<typeof useContextualCompanion>['launchWithContext'],
    devotionId: string,
    title?: string
  ) => {
    return launch('devotion_reflection', devotionId, { title });
  },

  /**
   * Launch companion for bible study lesson
   */
  forBibleStudy: (
    launch: ReturnType<typeof useContextualCompanion>['launchWithContext'],
    studyId: string,
    lessonNumber: number,
    title?: string
  ) => {
    return launch('bible_study_lesson', studyId, { lesson_number: lessonNumber, title });
  },

  /**
   * Launch companion for journey day
   */
  forJourney: (
    launch: ReturnType<typeof useContextualCompanion>['launchWithContext'],
    journeySlug: string,
    weekNumber: number,
    dayNumber: number,
    title?: string
  ) => {
    return launch('journey_day', journeySlug, {
      week_number: weekNumber,
      day_number: dayNumber,
      title,
    });
  },

  /**
   * Launch companion for verse meditation
   */
  forVerse: (
    launch: ReturnType<typeof useContextualCompanion>['launchWithContext'],
    verseId: string
  ) => {
    return launch('verse_meditation', verseId);
  },

  /**
   * Launch companion for quiz explanation
   */
  forQuiz: (
    launch: ReturnType<typeof useContextualCompanion>['launchWithContext'],
    quizId: string,
    title?: string
  ) => {
    return launch('quiz_explanation', quizId, { title });
  },
};
