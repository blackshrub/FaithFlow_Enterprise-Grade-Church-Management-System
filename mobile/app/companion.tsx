/**
 * Faith Assistant Chat Screen (Pendamping Iman)
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Inline style for Colors object and shadows
 * - React Native Reanimated for animations
 *
 * Claude-inspired design with:
 * - Clean, minimal interface
 * - Streaming responses (text appears progressively)
 * - Markdown rendering
 * - Smooth animations
 * - Conversation starters
 * - Empathetic UX with thoughtful micro-interactions
 * - Copy message functionality
 * - Relative timestamps
 */

import React, { useState, useCallback, useRef, useEffect, memo, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Keyboard,
  Dimensions,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  interpolate,
} from 'react-native-reanimated';

import {
  ArrowLeft,
  Send,
  Sparkles,
  RotateCcw,
  BookOpen,
  Heart,
  Copy,
  Check,
  HandHeart,
  Flame,
  Volume2,
  Pause,
  Settings,
  Headphones,
  Type,
  Sun,
  Moon,
} from 'lucide-react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { useCompanionStore, type CompanionMessage } from '@/stores/companionStore';
import { VoiceButton } from '@/components/chat/VoiceButton';
import { VoiceChatModal } from '@/components/chat/VoiceChatModal';
import { speakText, stopSpeaking, pauseSpeaking, canResume, clearSessionCache } from '@/services/voice/speechService';
import { useVoiceSettingsStore } from '@/stores/voiceSettings';
import {
  useReadingPreferencesStore,
  useReadingStyles,
  type FontSize,
  type ReadingTheme,
} from '@/stores/readingPreferences';
import {
  COMPANION_GREETINGS,
  CONVERSATION_STARTERS,
} from '@/constants/companionPrompt';
import { sendCompanionMessageStream } from '@/services/api/companion';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Disable entering animations on web to avoid Reanimated snapshot bug
const isWeb = Platform.OS === 'web';
const webSafeEntering = <T,>(animation: T): T | undefined => (isWeb ? undefined : animation);

// Claude-inspired color palette (kept as inline styles)
const Colors = {
  primary: '#DA7756',
  primaryLight: '#E8956F',
  primaryDark: '#C4634A',
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceAlt: '#F3F4F6',
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  userBubble: '#111827',
  assistantBubble: '#FFFFFF',
  accent: '#7C3AED',
  success: '#10B981',
  error: '#EF4444',
};

// Empathetic thinking messages that rotate
const THINKING_MESSAGES = {
  en: [
    'Reflecting on your words...',
    'Taking a moment to consider...',
    'Thinking thoughtfully...',
    'Preparing a caring response...',
  ],
  id: [
    'Merenungkan kata-katamu...',
    'Memikirkan dengan hati-hati...',
    'Sedang merenung...',
    'Menyiapkan jawaban yang penuh perhatian...',
  ],
};

const formatRelativeTime = (timestamp: Date | string, language: 'en' | 'id'): string => {
  // Handle both Date and ISO string formats (for MMKV persistence compatibility)
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return language === 'id' ? 'baru saja' : 'just now';
  if (diffMins < 60) return language === 'id' ? `${diffMins} menit lalu` : `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return language === 'id' ? `${diffHours} jam lalu` : `${diffHours}h ago`;

  return date.toLocaleTimeString(language === 'id' ? 'id-ID' : 'en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

interface TypingIndicatorProps {
  showMessage?: boolean;
  language?: 'en' | 'id';
}

const TypingIndicator = memo(({ showMessage = false, language = 'en' }: TypingIndicatorProps) => {
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const animate = (sv: typeof dot1) => {
      sv.value = withRepeat(
        withSequence(
          withTiming(0, { duration: 0 }),
          withTiming(1, { duration: 350, easing: Easing.bezier(0.4, 0, 0.2, 1) }),
          withTiming(0, { duration: 350, easing: Easing.bezier(0.4, 0, 0.2, 1) })
        ),
        -1,
        false
      );
    };

    setTimeout(() => animate(dot1), 0);
    setTimeout(() => animate(dot2), 180);
    setTimeout(() => animate(dot3), 360);

    if (showMessage) {
      const interval = setInterval(() => {
        setMessageIndex((i) => (i + 1) % THINKING_MESSAGES[language].length);
      }, 3000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [showMessage, language]);

  const dotStyle1 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot1.value * 0.7,
    transform: [
      { scale: 0.85 + dot1.value * 0.15 },
      { translateY: interpolate(dot1.value, [0, 1], [0, -3]) },
    ],
  }));

  const dotStyle2 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot2.value * 0.7,
    transform: [
      { scale: 0.85 + dot2.value * 0.15 },
      { translateY: interpolate(dot2.value, [0, 1], [0, -3]) },
    ],
  }));

  const dotStyle3 = useAnimatedStyle(() => ({
    opacity: 0.3 + dot3.value * 0.7,
    transform: [
      { scale: 0.85 + dot3.value * 0.15 },
      { translateY: interpolate(dot3.value, [0, 1], [0, -3]) },
    ],
  }));

  return (
    <View className="gap-2">
      {showMessage && (
        <Animated.Text
          entering={webSafeEntering(FadeIn.duration(300))}
          className="text-[13px] italic mb-1"
          style={{ color: Colors.textSecondary }}
        >
          {THINKING_MESSAGES[language][messageIndex]}
        </Animated.Text>
      )}
      <View className="flex-row items-center gap-1.5 py-1">
        <Animated.View
          className="w-2 h-2 rounded-full"
          style={[{ backgroundColor: Colors.primary }, dotStyle1]}
        />
        <Animated.View
          className="w-2 h-2 rounded-full"
          style={[{ backgroundColor: Colors.primary }, dotStyle2]}
        />
        <Animated.View
          className="w-2 h-2 rounded-full"
          style={[{ backgroundColor: Colors.primary }, dotStyle3]}
        />
      </View>
    </View>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

interface ReadingStylesType {
  fontSizeValue: number;
  lineHeight: number;
  colors: {
    text: string;
    textSecondary: string;
    border: string;
    background: string;
    card: string;
  };
}

const parseBoldItalic = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*|__(.+?)__/);
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/);
    const codeMatch = remaining.match(/`(.+?)`/);

    const matches = [
      boldMatch ? { type: 'bold', match: boldMatch, index: boldMatch.index! } : null,
      italicMatch ? { type: 'italic', match: italicMatch, index: italicMatch.index! } : null,
      codeMatch ? { type: 'code', match: codeMatch, index: codeMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    const content = first.match![1] || first.match![2];
    if (first.type === 'bold') {
      parts.push(<Text key={`b-${keyIndex++}`} className="font-bold">{content}</Text>);
    } else if (first.type === 'italic') {
      parts.push(<Text key={`i-${keyIndex++}`} className="italic">{content}</Text>);
    } else if (first.type === 'code') {
      parts.push(
        <Text
          key={`c-${keyIndex++}`}
          className="text-[13px] px-1.5 py-0.5 rounded"
          style={{ fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', backgroundColor: Colors.surfaceAlt }}
        >
          {content}
        </Text>
      );
    }

    remaining = remaining.slice(first.index + first.match![0].length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
};

const renderMarkdownWithStyles = (text: string, readingStyles: ReadingStylesType): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');
  const { fontSizeValue, lineHeight, colors } = readingStyles;
  const lineHeightPx = fontSizeValue * lineHeight;

  lines.forEach((line, lineIndex) => {
    if (line.startsWith('### ')) {
      elements.push(
        <Text
          key={`h3-${lineIndex}`}
          className="font-semibold mb-1 mt-0.5"
          style={{ color: colors.text, fontSize: fontSizeValue + 1 }}
        >
          {line.slice(4)}
        </Text>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <Text
          key={`h2-${lineIndex}`}
          className="font-bold mb-1.5 mt-1"
          style={{ color: colors.text, fontSize: fontSizeValue + 2 }}
        >
          {line.slice(3)}
        </Text>
      );
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <Text
          key={`h1-${lineIndex}`}
          className="font-bold mb-2 mt-1"
          style={{ color: colors.text, fontSize: fontSizeValue + 4 }}
        >
          {line.slice(2)}
        </Text>
      );
      return;
    }

    if (line.match(/^[\-\*]\s/)) {
      elements.push(
        <View key={`bullet-${lineIndex}`} className="flex-row mb-1">
          <Text className="w-5" style={{ color: colors.textSecondary, fontSize: fontSizeValue }}>•</Text>
          <Text className="flex-1" style={{ color: colors.text, fontSize: fontSizeValue, lineHeight: lineHeightPx }}>
            {parseBoldItalic(line.slice(2))}
          </Text>
        </View>
      );
      return;
    }

    const numberedMatch = line.match(/^(\d+)\.\s/);
    if (numberedMatch) {
      elements.push(
        <View key={`num-${lineIndex}`} className="flex-row mb-1">
          <Text className="w-6 font-medium" style={{ color: colors.textSecondary, fontSize: fontSizeValue }}>
            {numberedMatch[1]}.
          </Text>
          <Text className="flex-1" style={{ color: colors.text, fontSize: fontSizeValue, lineHeight: lineHeightPx }}>
            {parseBoldItalic(line.slice(numberedMatch[0].length))}
          </Text>
        </View>
      );
      return;
    }

    if (line.startsWith('> ')) {
      elements.push(
        <View key={`quote-${lineIndex}`} className="border-l-[3px] pl-3 my-2" style={{ borderLeftColor: Colors.primary }}>
          <Text className="italic" style={{ color: colors.textSecondary, fontSize: fontSizeValue, lineHeight: lineHeightPx }}>
            {parseBoldItalic(line.slice(2))}
          </Text>
        </View>
      );
      return;
    }

    if (line.trim()) {
      elements.push(
        <Text key={`p-${lineIndex}`} style={{ color: colors.text, fontSize: fontSizeValue, lineHeight: lineHeightPx }}>
          {parseBoldItalic(line)}
        </Text>
      );
    } else if (lineIndex > 0 && lineIndex < lines.length - 1) {
      elements.push(<View key={`br-${lineIndex}`} className="h-2" />);
    }
  });

  return elements;
};

interface MessageBubbleProps {
  message: CompanionMessage;
  isStreaming?: boolean;
  isLast: boolean;
  language: 'en' | 'id';
}

const MessageBubble = memo(({ message, isStreaming, isLast, language }: MessageBubbleProps) => {
  const isUser = message.role === 'user';
  const [showActions, setShowActions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [ttsState, setTtsState] = useState<'idle' | 'loading' | 'playing' | 'paused'>('idle');
  const isMountedRef = useRef(true);

  const { getEffectiveApiKey, getEffectiveVoice, getEffectiveSpeed, isEnabled: voiceEnabled } = useVoiceSettingsStore();
  const apiKey = getEffectiveApiKey();
  const canSpeakMessage = voiceEnabled && !!apiKey && !!message.content && !isStreaming;
  const readingStyles = useReadingStyles();

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (ttsState === 'playing' || ttsState === 'paused') {
        stopSpeaking();
      }
    };
  }, []);

  const handleSpeak = useCallback(async () => {
    if (!canSpeakMessage || !message.content) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (ttsState === 'playing') {
      await pauseSpeaking();
      if (isMountedRef.current) setTtsState('paused');
      return;
    }

    if (ttsState === 'loading') {
      await stopSpeaking();
      if (isMountedRef.current) setTtsState('idle');
      return;
    }

    try {
      const willResume = canResume(message.content);
      if (!willResume) setTtsState('loading');

      await speakText(message.content, apiKey!, {
        voice: getEffectiveVoice(),
        speakingRate: getEffectiveSpeed(),
        onPlaybackStart: () => {
          if (isMountedRef.current) setTtsState('playing');
        },
      });
      if (isMountedRef.current) setTtsState('idle');
    } catch (error) {
      console.error('[MessageBubble] TTS error:', error);
      if (isMountedRef.current) setTtsState('idle');
    }
  }, [canSpeakMessage, message.content, apiKey, getEffectiveVoice, getEffectiveSpeed, ttsState]);

  const handleLongPress = useCallback(() => {
    if (!isStreaming && message.content) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setShowActions(true);
    }
  }, [isStreaming, message.content]);

  const handleCopy = useCallback(async () => {
    if (message.content) {
      await Clipboard.setStringAsync(message.content);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setShowActions(false);
      }, 1500);
    }
  }, [message.content]);

  const handleDismissActions = useCallback(() => {
    setShowActions(false);
  }, []);

  return (
    <Animated.View
      entering={webSafeEntering(isLast ? (isUser ? SlideInRight.duration(250) : FadeInDown.duration(300)) : undefined)}
      className={`flex-row mb-4 items-start ${isUser ? 'justify-end' : ''}`}
    >
      <View style={{ maxWidth: SCREEN_WIDTH - 48, alignItems: isUser ? 'flex-end' : 'flex-start' }}>
        <Pressable
          onLongPress={handleLongPress}
          onPress={showActions ? handleDismissActions : undefined}
          delayLongPress={400}
          className={`rounded-[20px] px-4 py-3 ${isUser ? 'rounded-br-[6px]' : 'rounded-bl-[6px] border'}`}
          style={{
            backgroundColor: isUser ? Colors.userBubble : readingStyles.colors.background,
            borderColor: isUser ? undefined : readingStyles.colors.border,
            maxWidth: SCREEN_WIDTH - 48,
          }}
        >
          {isUser ? (
            <Text
              className="text-white"
              style={{
                fontSize: readingStyles.fontSizeValue,
                lineHeight: readingStyles.fontSizeValue * readingStyles.lineHeight,
              }}
            >
              {message.content}
            </Text>
          ) : (
            <View>
              {message.content ? (
                renderMarkdownWithStyles(message.content, readingStyles)
              ) : (
                <TypingIndicator language={language} />
              )}
              {isStreaming && message.content && (
                <View className="absolute right-0 bottom-0">
                  <Animated.View className="w-0.5 h-4" style={{ backgroundColor: Colors.primary }} />
                </View>
              )}
            </View>
          )}
        </Pressable>

        {!isUser && (
          <View className="flex-row items-center mt-1.5 gap-1.5">
            <View
              className="w-6 h-6 rounded-full items-center justify-center border"
              style={{ backgroundColor: Colors.surfaceAlt, borderColor: Colors.border }}
            >
              <Sparkles size={14} color={Colors.primary} />
            </View>
            <Text className="text-[11px] font-medium" style={{ color: Colors.textTertiary }}>
              Faith Assistant
            </Text>
          </View>
        )}

        {(showActions || (!isUser && canSpeakMessage && message.content)) && (
          <Animated.View
            entering={webSafeEntering(FadeIn.duration(200))}
            className={`flex-row mt-1.5 gap-2 ${isUser ? 'justify-end' : ''}`}
          >
            {!isUser && canSpeakMessage && (
              <Pressable
                onPress={handleSpeak}
                className="flex-row items-center gap-1 py-1 px-2 rounded-lg"
                style={{
                  backgroundColor: ttsState === 'playing' || ttsState === 'loading' ? `${Colors.primary}15` : Colors.surface,
                  borderWidth: ttsState !== 'idle' ? 1 : 0,
                  borderColor: `${Colors.primary}30`,
                }}
              >
                {ttsState === 'loading' ? (
                  <>
                    <View className="w-3.5 h-3.5 rounded-full opacity-60" style={{ backgroundColor: Colors.primary }} />
                    <Text className="text-xs font-medium" style={{ color: Colors.textSecondary }}>
                      {language === 'id' ? 'Memuat...' : 'Loading...'}
                    </Text>
                  </>
                ) : ttsState === 'playing' ? (
                  <>
                    <Pause size={14} color={Colors.primary} />
                    <Text className="text-xs font-medium" style={{ color: Colors.primary }}>
                      {language === 'id' ? 'Jeda' : 'Pause'}
                    </Text>
                  </>
                ) : ttsState === 'paused' ? (
                  <>
                    <Volume2 size={14} color={Colors.primary} />
                    <Text className="text-xs font-medium" style={{ color: Colors.primary }}>
                      {language === 'id' ? 'Lanjut' : 'Resume'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Volume2 size={14} color={Colors.textSecondary} />
                    <Text className="text-xs font-medium" style={{ color: Colors.textSecondary }}>
                      {language === 'id' ? 'Dengar' : 'Listen'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            {showActions && (
              <Pressable
                onPress={handleCopy}
                className="flex-row items-center gap-1 py-1 px-2 rounded-lg"
                style={{ backgroundColor: Colors.surface }}
              >
                {copied ? (
                  <>
                    <Check size={14} color={Colors.success} />
                    <Text className="text-xs font-medium" style={{ color: Colors.success }}>
                      {language === 'id' ? 'Tersalin!' : 'Copied!'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Copy size={14} color={Colors.textSecondary} />
                    <Text className="text-xs font-medium" style={{ color: Colors.textSecondary }}>
                      {language === 'id' ? 'Salin' : 'Copy'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </Animated.View>
        )}

        {(isLast || showActions) && !isStreaming && message.content && (
          <Animated.Text
            entering={webSafeEntering(FadeIn.duration(200))}
            className={`text-[11px] mt-1 ${isUser ? 'text-right mr-1' : 'ml-1'}`}
            style={{ color: Colors.textTertiary }}
          >
            {formatRelativeTime(message.timestamp, language)}
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
});

MessageBubble.displayName = 'MessageBubble';

interface StarterCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  onPress: () => void;
  index: number;
}

const StarterCard = memo(({ icon, title, description, onPress, index }: StarterCardProps) => (
  <Animated.View entering={webSafeEntering(FadeInUp.delay(index * 100).duration(400))}>
    <Pressable
      onPress={onPress}
      className="flex-col items-center justify-center rounded-2xl p-4 border w-full active:opacity-80"
      style={{ backgroundColor: Colors.surface, borderColor: Colors.border }}
    >
      <View
        className="w-11 h-11 rounded-xl items-center justify-center border"
        style={{ backgroundColor: Colors.background, borderColor: Colors.border }}
      >
        {icon}
      </View>
      <View className="items-center w-full mt-1">
        <Text className="text-[15px] font-semibold mb-1 text-center" style={{ color: Colors.text }}>
          {title}
        </Text>
        <Text className="text-[13px] leading-[18px] text-center" numberOfLines={2} style={{ color: Colors.textSecondary }}>
          {description}
        </Text>
      </View>
    </Pressable>
  </Animated.View>
));

StarterCard.displayName = 'StarterCard';

function CompanionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);
  const hasAutoRespondedRef = useRef(false);

  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(36);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const settingsSnapPoints = useMemo(() => ['70%'], []);
  const language = (i18n.language || 'en') as 'en' | 'id';

  const readingStyles = useReadingStyles();
  const { fontSize, theme: readingTheme, lineHeight, setFontSize, setTheme, setLineHeight } = useReadingPreferencesStore();
  const { isEnabled: voiceEnabled } = useVoiceSettingsStore();

  const messages = useCompanionStore((s) => s.messages);
  const isLoading = useCompanionStore((s) => s.isLoading);
  const isStreaming = useCompanionStore((s) => s.isStreaming);
  const streamingMessageId = useCompanionStore((s) => s.streamingMessageId);
  const entryContext = useCompanionStore((s) => s.entryContext);
  const contextData = useCompanionStore((s) => s.contextData);
  const addMessage = useCompanionStore((s) => s.addMessage);
  const updateMessage = useCompanionStore((s) => s.updateMessage);
  const startStreaming = useCompanionStore((s) => s.startStreaming);
  const stopStreaming = useCompanionStore((s) => s.stopStreaming);
  const setLoading = useCompanionStore((s) => s.setLoading);
  const clearChat = useCompanionStore((s) => s.clearChat);

  useEffect(() => {
    return () => {
      stopSpeaking();
    };
  }, []);

  const greeting = COMPANION_GREETINGS[language]?.[entryContext] || COMPANION_GREETINGS[language]?.default || COMPANION_GREETINGS.en.default;
  const starters = CONVERSATION_STARTERS[language] || CONVERSATION_STARTERS.en;

  // Auto-respond to pending user message (from QuickAskInput navigation)
  useEffect(() => {
    // Check if there's a pending user message that needs an AI response
    if (
      messages.length > 0 &&
      messages[messages.length - 1].role === 'user' &&
      !isLoading &&
      !isStreaming &&
      !hasAutoRespondedRef.current
    ) {
      // Mark as auto-responded to prevent infinite loops
      hasAutoRespondedRef.current = true;

      const lastUserMessage = messages[messages.length - 1].content;

      // Build API messages with greeting context
      const apiMessages = messages.length === 1
        ? [{ role: 'assistant' as const, content: greeting }, { role: 'user' as const, content: lastUserMessage }]
        : messages.map((m) => ({ role: m.role, content: m.content }));

      // Trigger AI response
      setLoading(true);
      const assistantMessageId = addMessage({ role: 'assistant', content: '' });
      startStreaming(assistantMessageId);

      sendCompanionMessageStream(
        { messages: apiMessages, context: entryContext, context_data: contextData },
        {
          onToken: (_token, fullText) => updateMessage(assistantMessageId, fullText),
          onComplete: () => stopStreaming(),
          onError: (error) => {
            console.error('Stream error:', error);
            const errorMessage = language === 'id' ? 'Maaf, terjadi kesalahan. Silakan coba lagi.' : 'Sorry, an error occurred. Please try again.';
            updateMessage(assistantMessageId, errorMessage);
            stopStreaming();
          },
        }
      );
    }
  }, [messages, isLoading, isStreaming, greeting, entryContext, contextData, language, addMessage, updateMessage, startStreaming, stopStreaming, setLoading]);

  // Reset auto-respond flag when chat is cleared
  useEffect(() => {
    if (messages.length === 0) {
      hasAutoRespondedRef.current = false;
    }
  }, [messages.length]);

  const starterCards = useMemo(() => [
    {
      icon: <BookOpen size={20} color={Colors.primary} strokeWidth={1.8} />,
      title: starters[0]?.label || 'Explain a verse',
      description: language === 'id' ? 'Bantu saya memahami makna ayat Alkitab' : 'Help me understand the meaning of Scripture',
      prompt: starters[0]?.prompt || '',
    },
    {
      icon: <HandHeart size={20} color={Colors.primary} strokeWidth={1.8} />,
      title: starters[1]?.label || 'Life guidance',
      description: language === 'id' ? 'Saya butuh hikmat untuk keputusan yang sulit' : 'I need wisdom for a difficult decision',
      prompt: starters[1]?.prompt || '',
    },
    {
      icon: <Heart size={20} color={Colors.primary} strokeWidth={1.8} />,
      title: starters[4]?.label || 'Dealing with doubt',
      description: language === 'id' ? 'Saya bergumul dan butuh seseorang untuk mendengarkan' : "I'm struggling and need someone to listen",
      prompt: starters[4]?.prompt || '',
    },
    {
      icon: <Flame size={20} color={Colors.primary} strokeWidth={1.8} />,
      title: starters[2]?.label || 'Prayer request',
      description: language === 'id' ? 'Bantu saya berdoa tentang sesuatu di hati saya' : 'Help me pray about something on my heart',
      prompt: starters[2]?.prompt || '',
    },
  ], [starters, language]);

  const sendMessage = useCallback((text: string) => {
    const trimmedText = text.trim();
    if (!trimmedText || isLoading || isStreaming) return;

    stopSpeaking();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    addMessage({ role: 'user', content: trimmedText });
    setLoading(true);

    const apiMessages = messages.length === 0
      ? [{ role: 'assistant' as const, content: greeting }, { role: 'user' as const, content: trimmedText }]
      : [...messages.map((m) => ({ role: m.role, content: m.content })), { role: 'user' as const, content: trimmedText }];

    const assistantMessageId = addMessage({ role: 'assistant', content: '' });
    startStreaming(assistantMessageId);

    sendCompanionMessageStream(
      { messages: apiMessages, context: entryContext, context_data: contextData },
      {
        onToken: (_token, fullText) => updateMessage(assistantMessageId, fullText),
        onComplete: () => stopStreaming(),
        onError: (error) => {
          console.error('Stream error:', error);
          const errorMessage = language === 'id' ? 'Maaf, terjadi kesalahan. Silakan coba lagi.' : 'Sorry, an error occurred. Please try again.';
          updateMessage(assistantMessageId, errorMessage);
          stopStreaming();
        },
      }
    );
  }, [isLoading, isStreaming, messages, greeting, entryContext, contextData, language, addMessage, updateMessage, startStreaming, stopStreaming, setLoading]);

  const handleSend = useCallback(() => {
    if (!inputText.trim()) return;
    sendMessage(inputText);
    setInputText('');
    setInputHeight(36);
  }, [inputText, sendMessage]);

  const handleStarterPress = useCallback((prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setInputText(prompt);
    inputRef.current?.focus();
  }, []);

  const handleNewChat = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopSpeaking();
    clearSessionCache();
    clearChat();
  }, [clearChat]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length, messages[messages.length - 1]?.content]);

  const showWelcome = messages.length === 0;

  return (
    <View className="flex-1" style={{ backgroundColor: Colors.background, paddingTop: insets.top }}>
      <StatusBar style="dark" />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b" style={{ borderBottomColor: Colors.border }}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          className="w-12 h-12 rounded-full items-center justify-center active:opacity-70"
          style={{ backgroundColor: 'transparent' }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>

        <View className="flex-row items-center gap-2.5">
          <View className="w-8 h-8 rounded-full items-center justify-center" style={{ backgroundColor: Colors.primary }}>
            <Sparkles size={16} color={Colors.textOnPrimary} />
          </View>
          <Text className="text-[17px] font-semibold" style={{ color: Colors.text }}>
            {t('companion.title', 'Faith Assistant')}
          </Text>
        </View>

        <View className="flex-row items-center gap-1">
          <Pressable
            onPress={handleNewChat}
            className="w-12 h-12 rounded-full items-center justify-center active:opacity-70"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RotateCcw size={28} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettings(true);
            }}
            className="w-12 h-12 rounded-full items-center justify-center active:opacity-70"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Settings size={28} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView className="flex-1" behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={0}>
        <ScrollView
          ref={scrollViewRef}
          className="flex-1"
          contentContainerClassName="p-4 pb-2"
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {showWelcome && (
            <Animated.View entering={webSafeEntering(FadeIn.duration(500))} className="items-center pt-10 px-4">
              <View className="w-16 h-16 rounded-full items-center justify-center mb-5" style={{ backgroundColor: Colors.surfaceAlt }}>
                <Sparkles size={32} color={Colors.primary} />
              </View>
              <Text className="text-2xl font-bold mb-3" style={{ color: Colors.text }}>
                {t('companion.title', 'Faith Assistant')}
              </Text>
              <Text className="text-base text-center leading-6 px-6 mb-6" style={{ color: Colors.textSecondary }}>
                {greeting}
              </Text>
              <View className="w-full gap-3">
                {starterCards.map((card, index) => (
                  <StarterCard
                    key={card.title}
                    icon={card.icon}
                    title={card.title}
                    description={card.description}
                    onPress={() => handleStarterPress(card.prompt)}
                    index={index}
                  />
                ))}
              </View>
            </Animated.View>
          )}

          {!showWelcome && messages.map((msg, index) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={msg.id === streamingMessageId}
              isLast={index === messages.length - 1}
              language={language}
            />
          ))}

          {isLoading && !isStreaming && (
            <Animated.View entering={webSafeEntering(FadeIn.duration(400))} className="flex-row mb-4 items-start">
              <View>
                <View
                  className="rounded-[20px] rounded-bl-[6px] px-4 py-3 border min-w-[180px]"
                  style={{ backgroundColor: Colors.assistantBubble, borderColor: Colors.border }}
                >
                  <TypingIndicator showMessage language={language} />
                </View>
                <View className="flex-row items-center mt-1.5 gap-1.5">
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center border"
                    style={{ backgroundColor: Colors.surfaceAlt, borderColor: Colors.border }}
                  >
                    <Sparkles size={14} color={Colors.primary} />
                  </View>
                  <Text className="text-[11px] font-medium" style={{ color: Colors.textTertiary }}>
                    Faith Assistant
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View
          className="border-t pt-3 px-4"
          style={{ borderTopColor: Colors.border, backgroundColor: Colors.background, paddingBottom: Math.max(insets.bottom, 12) }}
        >
          <View
            className="flex-row items-center gap-2.5 rounded-[28px] pl-[18px] pr-[18px] py-2 border min-h-[52px]"
            style={{ backgroundColor: Colors.surface, borderColor: Colors.border }}
          >
            <TextInput
              ref={inputRef}
              className="flex-1 text-base py-2 leading-5"
              style={{ color: Colors.text, height: Math.max(36, Math.min(inputHeight, 100)), maxHeight: 100 }}
              placeholder={t('companion.inputPlaceholder', 'Message Faith Assistant...')}
              placeholderTextColor={Colors.textTertiary}
              value={inputText}
              onChangeText={setInputText}
              onContentSizeChange={(e) => setInputHeight(e.nativeEvent.contentSize.height)}
              multiline
              maxLength={2000}
              returnKeyType="default"
              editable={!isLoading && !isStreaming}
            />
            {voiceEnabled && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowVoiceChat(true);
                }}
                className="w-11 h-11 rounded-full items-center justify-center border-[1.5px]"
                style={{ backgroundColor: `${Colors.primary}15`, borderColor: Colors.primary }}
                disabled={isLoading || isStreaming}
              >
                <Headphones size={20} color={Colors.primary} />
              </Pressable>
            )}
            <VoiceButton
              onTranscription={(text) => sendMessage(text)}
              onError={(error) => console.error('[Companion] Voice error:', error)}
              defaultLanguage={language}
              size={44}
              disabled={isLoading || isStreaming}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading || isStreaming}
              className="w-11 h-11 rounded-full items-center justify-center border"
              style={{
                backgroundColor: inputText.trim() && !isLoading && !isStreaming ? Colors.surfaceAlt : Colors.surfaceAlt,
                borderColor: inputText.trim() && !isLoading && !isStreaming ? Colors.border : Colors.borderLight,
              }}
            >
              <Send size={20} color={inputText.trim() && !isLoading && !isStreaming ? Colors.text : Colors.textTertiary} />
            </Pressable>
          </View>

          <Text className="text-[11px] text-center mt-2.5" style={{ color: Colors.textTertiary }}>
            {language === 'id' ? 'Bukan pengganti nasihat pendeta.' : 'Not a substitute for pastoral guidance.'}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Settings Bottom Sheet - Only render when visible */}
      {showSettings && (
        <BottomSheet
          ref={settingsSheetRef}
          index={0}
          snapPoints={settingsSnapPoints}
          enablePanDownToClose
          onClose={() => setShowSettings(false)}
          backdropComponent={(props) => (
            <BottomSheetBackdrop {...props} disappearsOnIndex={-1} appearsOnIndex={0} opacity={0.5} pressBehavior="close" />
          )}
          backgroundStyle={{ backgroundColor: Colors.background }}
          handleIndicatorStyle={{ backgroundColor: Colors.border }}
        >
        <BottomSheetScrollView className="flex-1 px-5">
          <Text className="text-xl font-bold mb-5 text-center" style={{ color: Colors.text }}>
            {language === 'id' ? 'Pengaturan' : 'Settings'}
          </Text>

          <View className="mb-6">
            <Text className="text-[15px] font-semibold mb-4 flex-row items-center" style={{ color: Colors.text }}>
              <Type size={16} color={Colors.primary} />
              {'  '}
              {language === 'id' ? 'Tampilan Teks' : 'Text Display'}
            </Text>

            {/* Font Size */}
            <View className="mb-4">
              <Text className="text-sm mb-2.5" style={{ color: Colors.textSecondary }}>
                {language === 'id' ? 'Ukuran Font' : 'Font Size'}
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {([
                  { key: 'small', label: language === 'id' ? 'Kecil' : 'Small' },
                  { key: 'medium', label: language === 'id' ? 'Standar' : 'Standard' },
                  { key: 'large', label: language === 'id' ? 'Besar' : 'Large' },
                  { key: 'xlarge', label: language === 'id' ? 'Ekstra Besar' : 'Extra Large' },
                ] as { key: FontSize; label: string }[]).map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setFontSize(item.key)}
                    className="py-2.5 px-3 rounded-[10px] items-center justify-center min-w-[80px] border"
                    style={{
                      backgroundColor: fontSize === item.key ? `${Colors.primary}15` : Colors.surfaceAlt,
                      borderColor: fontSize === item.key ? Colors.primary : Colors.border,
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: fontSize === item.key ? Colors.primary : Colors.textSecondary }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Theme */}
            <View className="mb-4">
              <Text className="text-sm mb-2.5" style={{ color: Colors.textSecondary }}>
                {language === 'id' ? 'Tema Baca' : 'Reading Theme'}
              </Text>
              <View className="flex-row gap-2.5">
                {(['light', 'sepia', 'dark'] as ReadingTheme[]).map((themeOpt) => (
                  <Pressable
                    key={themeOpt}
                    onPress={() => setTheme(themeOpt)}
                    className="py-2.5 px-4 rounded-[10px] items-center justify-center min-w-[48px] border"
                    style={{
                      backgroundColor: themeOpt === 'light' ? '#FFFFFF' : themeOpt === 'sepia' ? '#F5F0E6' : '#1A1A1A',
                      borderColor: readingTheme === themeOpt ? Colors.primary : themeOpt === 'dark' ? '#374151' : '#E5E7EB',
                    }}
                  >
                    {themeOpt === 'light' ? (
                      <Sun size={16} color={readingTheme === 'light' ? Colors.primary : '#6B7280'} />
                    ) : themeOpt === 'dark' ? (
                      <Moon size={16} color={readingTheme === 'dark' ? Colors.primary : '#9CA3AF'} />
                    ) : (
                      <Text style={{ color: readingTheme === 'sepia' ? Colors.primary : '#6B6353', fontSize: 12 }}>Se</Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Line Height */}
            <View className="mb-4">
              <Text className="text-sm mb-2.5" style={{ color: Colors.textSecondary }}>
                {language === 'id' ? 'Jarak Baris' : 'Line Spacing'}
              </Text>
              <View className="flex-row flex-wrap gap-2.5">
                {([
                  { value: 1.4, label: language === 'id' ? 'Rapat' : 'Tight' },
                  { value: 1.6, label: language === 'id' ? 'Standar' : 'Standard' },
                  { value: 1.8, label: language === 'id' ? 'Longgar' : 'Loose' },
                  { value: 2.0, label: language === 'id' ? 'Sangat Longgar' : 'Very Loose' },
                ]).map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => setLineHeight(item.value)}
                    className="py-2.5 px-3 rounded-[10px] items-center justify-center min-w-[80px] border"
                    style={{
                      backgroundColor: lineHeight === item.value ? `${Colors.primary}15` : Colors.surfaceAlt,
                      borderColor: lineHeight === item.value ? Colors.primary : Colors.border,
                    }}
                  >
                    <Text
                      className="text-sm font-medium"
                      style={{ color: lineHeight === item.value ? Colors.primary : Colors.textSecondary }}
                    >
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View
              className="p-4 rounded-xl border mt-2"
              style={{ backgroundColor: readingStyles.colors.background, borderColor: readingStyles.colors.border }}
            >
              <Text
                style={{
                  fontSize: readingStyles.fontSizeValue,
                  lineHeight: readingStyles.fontSizeValue * lineHeight,
                  color: readingStyles.colors.text,
                }}
              >
                {language === 'id'
                  ? 'Contoh teks dengan pengaturan saat ini. Ini adalah pratinjau bagaimana respons AI akan ditampilkan.'
                  : 'Sample text with current settings. This is a preview of how AI responses will be displayed.'}
              </Text>
            </View>
          </View>

          <View style={{ height: insets.bottom + 20 }} />
        </BottomSheetScrollView>
        </BottomSheet>
      )}

      <VoiceChatModal
        visible={showVoiceChat}
        onClose={() => setShowVoiceChat(false)}
        language={language}
        onConversationEnd={(realtimeMessages) => {
          realtimeMessages.forEach((msg) => addMessage({ role: msg.role, content: msg.content }));
        }}
      />
    </View>
  );
}

export default memo(CompanionScreen);
