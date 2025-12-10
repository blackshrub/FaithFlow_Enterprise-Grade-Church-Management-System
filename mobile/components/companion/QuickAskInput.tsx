/**
 * Quick Ask Input
 *
 * An always-visible chat input field at the bottom of content screens.
 * When user types a question and submits, it opens Faith Assistant with:
 * - The question pre-sent
 * - Context from the current content (devotion, study, etc.)
 *
 * Also shows suggested questions based on content type.
 *
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React, { memo, useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  Pressable,
  ScrollView,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';
import { Send, Sparkles, MessageCircle, ChevronRight } from 'lucide-react-native';

import {
  useCompanionStore,
  type CompanionContext,
  type CompanionContextData,
} from '@/stores/companionStore';
import { Text } from '@/components/ui/text';
import { contextualCompanionApi, type ContextType } from '@/services/api/explore';

// Colors
const Colors = {
  primary: '#6366F1',
  primaryLight: '#818CF8',
  primaryBg: '#EEF2FF',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  border: '#E5E7EB',
  surface: '#F9FAFB',
  white: '#FFFFFF',
};

interface SuggestedQuestion {
  label: string;
  prompt: string;
}

interface QuickAskInputProps {
  /**
   * The context type for the conversation
   */
  context: CompanionContext;
  /**
   * Context data to pass to the companion
   */
  contextData: CompanionContextData;
  /**
   * Content ID for backend context fetching
   */
  contentId?: string;
  /**
   * Lesson number (for bible_study_lesson context)
   */
  lessonNumber?: number;
  /**
   * Week number (for journey_day context)
   */
  weekNumber?: number;
  /**
   * Day number (for journey_day context)
   */
  dayNumber?: number;
  /**
   * Placeholder text for the input
   */
  placeholder?: string;
  /**
   * Suggested questions to show as chips
   */
  suggestions?: SuggestedQuestion[];
  /**
   * Custom title above the input
   */
  title?: string;
  /**
   * Whether to show the header with icon
   */
  showHeader?: boolean;
  /**
   * Language for default suggestions
   */
  language?: 'en' | 'id';
}

// Fallback suggestions (used only when API fails)
const FALLBACK_SUGGESTIONS: Record<string, { en: SuggestedQuestion[]; id: SuggestedQuestion[] }> = {
  devotion_reflection: {
    en: [
      { label: 'Explain', prompt: 'Can you explain this further?' },
      { label: 'Apply', prompt: 'How can I apply this?' },
    ],
    id: [
      { label: 'Jelaskan', prompt: 'Bisakah kamu menjelaskan lebih lanjut?' },
      { label: 'Terapkan', prompt: 'Bagaimana saya menerapkan ini?' },
    ],
  },
  default: {
    en: [
      { label: 'Ask', prompt: 'I have a question' },
    ],
    id: [
      { label: 'Tanya', prompt: 'Saya punya pertanyaan' },
    ],
  },
};

// Supported context types for backend starters
const SUPPORTED_CONTEXT_TYPES: ContextType[] = [
  'devotion_reflection',
  'bible_study_lesson',
  'journey_day',
  'verse_meditation',
  'quiz_explanation',
];

function QuickAskInputComponent({
  context,
  contextData,
  contentId,
  lessonNumber,
  weekNumber,
  dayNumber,
  placeholder,
  suggestions: propSuggestions,
  title,
  showHeader = true,
  language = 'en',
}: QuickAskInputProps) {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const inputRef = useRef<TextInput>(null);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const setEntryContext = useCompanionStore((s) => s.setEntryContext);
  const clearChat = useCompanionStore((s) => s.clearChat);
  const addMessage = useCompanionStore((s) => s.addMessage);

  const currentLang = (i18n.language || language) as 'en' | 'id';

  // Check if context type supports backend starters
  const supportsBackendStarters = SUPPORTED_CONTEXT_TYPES.includes(context as ContextType);

  // Fetch conversation starters from backend
  const { data: backendStarters } = useQuery({
    queryKey: ['companion-starters', context, currentLang],
    queryFn: async () => {
      if (!supportsBackendStarters) return null;
      return contextualCompanionApi.getStarters(context as ContextType, currentLang);
    },
    enabled: supportsBackendStarters && !propSuggestions,
    staleTime: 1000 * 60 * 30, // Cache for 30 minutes
    gcTime: 1000 * 60 * 60, // Keep in cache for 1 hour
    retry: 1,
  });

  // Transform backend starters to SuggestedQuestion format
  const displaySuggestions = (() => {
    // If explicit suggestions provided, use them
    if (propSuggestions) return propSuggestions;

    // If backend starters available, convert to SuggestedQuestion format
    if (backendStarters && backendStarters.length > 0) {
      return backendStarters.map((starter) => {
        // Create short label from first few words of starter
        const words = starter.split(' ').slice(0, 3);
        const label = words.join(' ') + (words.length < starter.split(' ').length ? '...' : '');
        return {
          label: label.length > 20 ? label.substring(0, 17) + '...' : label,
          prompt: starter,
        };
      });
    }

    // Fallback to hardcoded suggestions
    const fallback = FALLBACK_SUGGESTIONS[context] || FALLBACK_SUGGESTIONS.default;
    return fallback[currentLang] || fallback.en;
  })();

  const defaultPlaceholder = currentLang === 'en'
    ? 'Ask Faith Assistant about this...'
    : 'Tanyakan kepada Pendamping Iman...';

  /**
   * Fetch system prompt from backend for context-bounded conversations
   */
  const fetchContextualPrompt = async (): Promise<string | undefined> => {
    // Only fetch for supported context types with contentId
    if (!contentId) return undefined;

    const supportedContexts: ContextType[] = [
      'devotion_reflection',
      'bible_study_lesson',
      'journey_day',
      'verse_meditation',
      'quiz_explanation',
    ];

    if (!supportedContexts.includes(context as ContextType)) return undefined;

    try {
      const response = await contextualCompanionApi.getContext({
        context_type: context as ContextType,
        content_id: contentId,
        language: currentLang,
        lesson_number: lessonNumber,
        week_number: weekNumber,
        day_number: dayNumber,
      });
      return response.system_prompt;
    } catch (error) {
      console.warn('[QuickAskInput] Failed to fetch contextual prompt:', error);
      return undefined;
    }
  };

  const handleSend = async (text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Keyboard.dismiss();
    setIsLoading(true);

    try {
      // Fetch backend system prompt for context-bounded conversation
      const systemPrompt = await fetchContextualPrompt();

      // Clear previous chat, set context with backend prompt
      clearChat();
      setEntryContext(context, {
        ...contextData,
        systemPrompt, // Backend-provided context-bounded prompt
      });
      addMessage({ role: 'user', content: trimmedText });

      // Navigate to companion
      router.push('/companion');
    } catch (error) {
      console.error('[QuickAskInput] Error:', error);
      // Still navigate even if prompt fetch fails (fallback to local prompt)
      clearChat();
      setEntryContext(context, contextData);
      addMessage({ role: 'user', content: trimmedText });
      router.push('/companion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionPress = (prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    handleSend(prompt);
  };

  const handleSubmit = () => {
    if (inputText.trim()) {
      handleSend(inputText);
      setInputText('');
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(400)}
      className="rounded-2xl overflow-hidden border"
      style={{ borderColor: Colors.border, backgroundColor: Colors.white }}
    >
      {/* Header */}
      {showHeader && (
        <View className="flex-row items-center gap-2 px-4 pt-4 pb-2">
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: Colors.primaryBg }}
          >
            <Sparkles size={16} color={Colors.primary} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-semibold" style={{ color: Colors.text }}>
              {title || (currentLang === 'en' ? 'Ask Faith Assistant' : 'Tanyakan Pendamping Iman')}
            </Text>
            <Text className="text-[12px]" style={{ color: Colors.textTertiary }}>
              {currentLang === 'en' ? 'Get spiritual guidance' : 'Dapatkan panduan rohani'}
            </Text>
          </View>
        </View>
      )}

      {/* Suggestions */}
      {displaySuggestions.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="px-4 py-2"
          contentContainerStyle={{ gap: 8 }}
        >
          {displaySuggestions.map((suggestion, index) => (
            <Animated.View key={index} entering={FadeInUp.delay(index * 50).duration(300)}>
              <Pressable
                onPress={() => handleSuggestionPress(suggestion.prompt)}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Ask ${suggestion.label}`}
                className="flex-row items-center gap-1.5 px-3 py-2 rounded-full border active:scale-95"
                style={{ borderColor: Colors.primaryLight, backgroundColor: Colors.primaryBg }}
              >
                <MessageCircle size={14} color={Colors.primary} />
                <Text className="text-[13px] font-medium" style={{ color: Colors.primary }}>
                  {suggestion.label}
                </Text>
              </Pressable>
            </Animated.View>
          ))}
        </ScrollView>
      )}

      {/* Input Field */}
      <View className="px-3 pb-3 pt-1">
        <View
          className="flex-row items-center gap-2 rounded-xl px-3 py-2 border"
          style={{ borderColor: Colors.border, backgroundColor: Colors.surface }}
        >
          <TextInput
            ref={inputRef}
            className="flex-1 text-[15px] py-1.5"
            style={{ color: Colors.text }}
            placeholder={placeholder || defaultPlaceholder}
            placeholderTextColor={Colors.textTertiary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSubmit}
            returnKeyType="send"
            blurOnSubmit={false}
          />
          <Pressable
            onPress={handleSubmit}
            disabled={!inputText.trim() || isLoading}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Send message to Faith Assistant"
            className="w-9 h-9 rounded-full items-center justify-center active:scale-95"
            style={{
              backgroundColor: inputText.trim() && !isLoading ? Colors.primary : Colors.surface,
            }}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.primary} />
            ) : (
              <Send
                size={18}
                color={inputText.trim() ? Colors.white : Colors.textTertiary}
              />
            )}
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export const QuickAskInput = memo(QuickAskInputComponent);
export default QuickAskInput;
