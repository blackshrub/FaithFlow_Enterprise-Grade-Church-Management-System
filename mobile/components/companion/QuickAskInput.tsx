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

import React, { memo, useState, useRef } from 'react';
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

// Default suggestions based on context type
const getDefaultSuggestions = (
  context: CompanionContext,
  language: 'en' | 'id'
): SuggestedQuestion[] => {
  const suggestions: Record<CompanionContext, { en: SuggestedQuestion[]; id: SuggestedQuestion[] }> = {
    devotion_reflection: {
      en: [
        { label: 'Explain the verse', prompt: 'Can you explain what this verse means in depth?' },
        { label: 'Apply to my life', prompt: 'How can I apply this teaching to my daily life?' },
        { label: 'Related passages', prompt: 'What other Bible passages relate to this theme?' },
      ],
      id: [
        { label: 'Jelaskan ayat ini', prompt: 'Bisakah kamu menjelaskan makna ayat ini secara mendalam?' },
        { label: 'Terapkan dalam hidup', prompt: 'Bagaimana saya bisa menerapkan ajaran ini dalam kehidupan sehari-hari?' },
        { label: 'Ayat terkait', prompt: 'Ayat Alkitab apa saja yang berkaitan dengan tema ini?' },
      ],
    },
    bible_study_lesson: {
      en: [
        { label: 'Clarify a concept', prompt: 'Can you help me understand this concept better?' },
        { label: 'Discussion question', prompt: 'What are some good discussion questions for this lesson?' },
        { label: 'Practical application', prompt: 'How can I practically apply what I learned today?' },
      ],
      id: [
        { label: 'Jelaskan konsep', prompt: 'Bisakah kamu membantu saya memahami konsep ini lebih baik?' },
        { label: 'Pertanyaan diskusi', prompt: 'Apa saja pertanyaan diskusi yang bagus untuk pelajaran ini?' },
        { label: 'Aplikasi praktis', prompt: 'Bagaimana cara praktis menerapkan apa yang saya pelajari hari ini?' },
      ],
    },
    journey_day: {
      en: [
        { label: 'Understand better', prompt: 'Help me understand today\'s lesson better' },
        { label: 'Share my struggle', prompt: 'I\'m struggling with this - can we talk?' },
        { label: 'Prayer guidance', prompt: 'Can you guide me in prayer about this?' },
      ],
      id: [
        { label: 'Pahami lebih baik', prompt: 'Bantu saya memahami pelajaran hari ini lebih baik' },
        { label: 'Bagikan pergumulan', prompt: 'Saya bergumul dengan ini - bisakah kita berbicara?' },
        { label: 'Panduan doa', prompt: 'Bisakah kamu memandu saya berdoa tentang ini?' },
      ],
    },
    verse_meditation: {
      en: [
        { label: 'Deeper meaning', prompt: 'What is the deeper meaning of this verse?' },
        { label: 'Historical context', prompt: 'What was the historical context when this was written?' },
        { label: 'Personal reflection', prompt: 'Help me reflect on how this verse speaks to me personally' },
      ],
      id: [
        { label: 'Makna lebih dalam', prompt: 'Apa makna lebih dalam dari ayat ini?' },
        { label: 'Konteks sejarah', prompt: 'Bagaimana konteks sejarah ketika ayat ini ditulis?' },
        { label: 'Refleksi pribadi', prompt: 'Bantu saya merenungkan bagaimana ayat ini berbicara kepada saya secara pribadi' },
      ],
    },
    quiz_explanation: {
      en: [
        { label: 'Explain answer', prompt: 'Can you explain why this is the correct answer?' },
        { label: 'Learn more', prompt: 'I want to learn more about this topic' },
        { label: 'Related stories', prompt: 'What other Bible stories relate to this?' },
      ],
      id: [
        { label: 'Jelaskan jawaban', prompt: 'Bisakah kamu menjelaskan mengapa ini jawaban yang benar?' },
        { label: 'Pelajari lebih', prompt: 'Saya ingin belajar lebih banyak tentang topik ini' },
        { label: 'Cerita terkait', prompt: 'Cerita Alkitab apa saja yang berkaitan dengan ini?' },
      ],
    },
    // Default fallbacks
    default: {
      en: [
        { label: 'Ask a question', prompt: 'I have a question about this' },
        { label: 'Explain more', prompt: 'Can you explain this more?' },
      ],
      id: [
        { label: 'Ajukan pertanyaan', prompt: 'Saya punya pertanyaan tentang ini' },
        { label: 'Jelaskan lebih', prompt: 'Bisakah kamu menjelaskan ini lebih lanjut?' },
      ],
    },
    fromVerse: { en: [], id: [] },
    fromDevotion: { en: [], id: [] },
    morning: { en: [], id: [] },
    evening: { en: [], id: [] },
  };

  return suggestions[context]?.[language] || suggestions.default[language];
};

function QuickAskInputComponent({
  context,
  contextData,
  contentId,
  lessonNumber,
  weekNumber,
  dayNumber,
  placeholder,
  suggestions,
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
  const defaultSuggestions = getDefaultSuggestions(context, currentLang);
  const displaySuggestions = suggestions || defaultSuggestions;

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
