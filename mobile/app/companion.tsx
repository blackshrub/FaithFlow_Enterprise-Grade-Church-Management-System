/**
 * Faith Assistant Chat Screen (Pendamping Iman)
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
  StyleSheet,
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
  withDelay,
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
  HelpCircle,
  Lightbulb,
  Copy,
  Check,
  HandHeart,
  Flame,
  Volume2,
  Pause,
  Settings,
  Mic,
  MicOff,
  Headphones,
  Type,
  Sun,
  Moon,
} from 'lucide-react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { useCompanionStore, type CompanionMessage } from '@/stores/companionStore';
import { VoiceButton } from '@/components/chat/VoiceButton';
import { VoiceChatModal } from '@/components/chat/VoiceChatModal';
import { speakText, speakTextStreaming, stopSpeaking, pauseSpeaking, canResume } from '@/services/voice/speechService';
import { useVoiceSettingsStore, TTSVoice } from '@/stores/voiceSettings';
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

// Claude-inspired color palette
const Colors = {
  // Primary - Warm orange/peach (Claude's signature)
  primary: '#DA7756',
  primaryLight: '#E8956F',
  primaryDark: '#C4634A',

  // Background
  background: '#FFFFFF',
  surface: '#F9FAFB',
  surfaceAlt: '#F3F4F6',

  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Message bubbles
  userBubble: '#111827',
  assistantBubble: '#FFFFFF',

  // Accents
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

/**
 * Format relative timestamp
 */
const formatRelativeTime = (date: Date, language: 'en' | 'id'): string => {
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

/**
 * Typing indicator with animated dots and empathetic message
 */
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

    // Staggered start for more natural feel
    setTimeout(() => animate(dot1), 0);
    setTimeout(() => animate(dot2), 180);
    setTimeout(() => animate(dot3), 360);

    // Rotate thinking messages every 3 seconds
    if (showMessage) {
      const interval = setInterval(() => {
        setMessageIndex((i) => (i + 1) % THINKING_MESSAGES[language].length);
      }, 3000);
      return () => clearInterval(interval);
    }
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
    <View style={styles.typingWrapper}>
      {showMessage && (
        <Animated.Text
          entering={webSafeEntering(FadeIn.duration(300))}
          style={styles.thinkingText}
        >
          {THINKING_MESSAGES[language][messageIndex]}
        </Animated.Text>
      )}
      <View style={styles.typingContainer}>
        <Animated.View style={[styles.typingDot, dotStyle1]} />
        <Animated.View style={[styles.typingDot, dotStyle2]} />
        <Animated.View style={[styles.typingDot, dotStyle3]} />
      </View>
    </View>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

/**
 * Simple markdown renderer for common patterns
 */
const renderMarkdown = (text: string): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');

  lines.forEach((line, lineIndex) => {
    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <Text key={`h3-${lineIndex}`} style={styles.mdH3}>
          {line.slice(4)}
        </Text>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={`h2-${lineIndex}`} style={styles.mdH2}>
          {line.slice(3)}
        </Text>
      );
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <Text key={`h1-${lineIndex}`} style={styles.mdH1}>
          {line.slice(2)}
        </Text>
      );
      return;
    }

    // Bullet points
    if (line.match(/^[\-\*]\s/)) {
      elements.push(
        <View key={`bullet-${lineIndex}`} style={styles.mdBullet}>
          <Text style={styles.mdBulletDot}>•</Text>
          <Text style={styles.mdBulletText}>{parseBoldItalic(line.slice(2))}</Text>
        </View>
      );
      return;
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s/);
    if (numberedMatch) {
      elements.push(
        <View key={`num-${lineIndex}`} style={styles.mdBullet}>
          <Text style={styles.mdBulletNum}>{numberedMatch[1]}.</Text>
          <Text style={styles.mdBulletText}>{parseBoldItalic(line.slice(numberedMatch[0].length))}</Text>
        </View>
      );
      return;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <View key={`quote-${lineIndex}`} style={styles.mdBlockquote}>
          <Text style={styles.mdBlockquoteText}>{parseBoldItalic(line.slice(2))}</Text>
        </View>
      );
      return;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push(
        <Text key={`p-${lineIndex}`} style={styles.mdParagraph}>
          {parseBoldItalic(line)}
        </Text>
      );
    } else if (lineIndex > 0 && lineIndex < lines.length - 1) {
      // Empty line (paragraph break)
      elements.push(<View key={`br-${lineIndex}`} style={styles.mdBreak} />);
    }
  });

  return elements;
};

/**
 * Parse bold and italic inline formatting
 */
const parseBoldItalic = (text: string): React.ReactNode => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let keyIndex = 0;

  while (remaining.length > 0) {
    // Bold: **text** or __text__
    const boldMatch = remaining.match(/\*\*(.+?)\*\*|__(.+?)__/);
    // Italic: *text* or _text_
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/);
    // Inline code: `code`
    const codeMatch = remaining.match(/`(.+?)`/);

    // Find earliest match
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
      parts.push(<Text key={`b-${keyIndex++}`} style={styles.mdBold}>{content}</Text>);
    } else if (first.type === 'italic') {
      parts.push(<Text key={`i-${keyIndex++}`} style={styles.mdItalic}>{content}</Text>);
    } else if (first.type === 'code') {
      parts.push(<Text key={`c-${keyIndex++}`} style={styles.mdInlineCode}>{content}</Text>);
    }

    remaining = remaining.slice(first.index + first.match![0].length);
  }

  return parts.length === 1 ? parts[0] : <>{parts}</>;
};

/**
 * Markdown renderer with reading preferences applied
 */
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

const renderMarkdownWithStyles = (text: string, readingStyles: ReadingStylesType): React.ReactNode[] => {
  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');
  const { fontSizeValue, lineHeight, colors } = readingStyles;
  const lineHeightPx = fontSizeValue * lineHeight;

  lines.forEach((line, lineIndex) => {
    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <Text key={`h3-${lineIndex}`} style={[styles.mdH3, { color: colors.text, fontSize: fontSizeValue + 1 }]}>
          {line.slice(4)}
        </Text>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <Text key={`h2-${lineIndex}`} style={[styles.mdH2, { color: colors.text, fontSize: fontSizeValue + 2 }]}>
          {line.slice(3)}
        </Text>
      );
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <Text key={`h1-${lineIndex}`} style={[styles.mdH1, { color: colors.text, fontSize: fontSizeValue + 4 }]}>
          {line.slice(2)}
        </Text>
      );
      return;
    }

    // Bullet points
    if (line.match(/^[\-\*]\s/)) {
      elements.push(
        <View key={`bullet-${lineIndex}`} style={styles.mdBullet}>
          <Text style={[styles.mdBulletDot, { color: colors.textSecondary, fontSize: fontSizeValue }]}>•</Text>
          <Text style={[styles.mdBulletText, { color: colors.text, fontSize: fontSizeValue, lineHeight: lineHeightPx }]}>
            {parseBoldItalic(line.slice(2))}
          </Text>
        </View>
      );
      return;
    }

    // Numbered lists
    const numberedMatch = line.match(/^(\d+)\.\s/);
    if (numberedMatch) {
      elements.push(
        <View key={`num-${lineIndex}`} style={styles.mdBullet}>
          <Text style={[styles.mdBulletNum, { color: colors.textSecondary, fontSize: fontSizeValue }]}>
            {numberedMatch[1]}.
          </Text>
          <Text style={[styles.mdBulletText, { color: colors.text, fontSize: fontSizeValue, lineHeight: lineHeightPx }]}>
            {parseBoldItalic(line.slice(numberedMatch[0].length))}
          </Text>
        </View>
      );
      return;
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      elements.push(
        <View key={`quote-${lineIndex}`} style={styles.mdBlockquote}>
          <Text style={[styles.mdBlockquoteText, { color: colors.textSecondary, fontSize: fontSizeValue, lineHeight: lineHeightPx }]}>
            {parseBoldItalic(line.slice(2))}
          </Text>
        </View>
      );
      return;
    }

    // Regular paragraph
    if (line.trim()) {
      elements.push(
        <Text key={`p-${lineIndex}`} style={[styles.mdParagraph, { color: colors.text, fontSize: fontSizeValue, lineHeight: lineHeightPx }]}>
          {parseBoldItalic(line)}
        </Text>
      );
    } else if (lineIndex > 0 && lineIndex < lines.length - 1) {
      // Empty line (paragraph break)
      elements.push(<View key={`br-${lineIndex}`} style={styles.mdBreak} />);
    }
  });

  return elements;
};

/**
 * Message Bubble Component with copy functionality, TTS, and timestamps
 */
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

  // Voice settings
  const {
    getEffectiveApiKey,
    getEffectiveVoice,
    getEffectiveSpeed,
    getEffectiveModel,
    isEnabled: voiceEnabled,
  } = useVoiceSettingsStore();
  const apiKey = getEffectiveApiKey();
  const canSpeakMessage = voiceEnabled && !!apiKey && !!message.content && !isStreaming;

  // Reading preferences for assistant messages
  const readingStyles = useReadingStyles();

  // Cleanup on unmount
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

    // If playing → pause (keep audio cached for instant resume)
    if (ttsState === 'playing') {
      await pauseSpeaking();
      if (isMountedRef.current) {
        setTtsState('paused');
      }
      return;
    }

    // If loading → cancel
    if (ttsState === 'loading') {
      await stopSpeaking();
      if (isMountedRef.current) {
        setTtsState('idle');
      }
      return;
    }

    // Start or resume playing
    try {
      // Check if we can resume (same text is cached)
      const willResume = canResume(message.content);

      if (!willResume) {
        // Need to load fresh - show loading state
        setTtsState('loading');
      }

      // speakText will automatically resume if same text is cached
      await speakText(message.content, apiKey!, {
        voice: getEffectiveVoice(),
        model: getEffectiveModel(),
        speed: getEffectiveSpeed(),
        onPlaybackStart: () => {
          if (isMountedRef.current) {
            setTtsState('playing');
          }
        },
      });

      // Audio finished playing naturally
      if (isMountedRef.current) {
        setTtsState('idle');
      }
    } catch (error) {
      console.error('[MessageBubble] TTS error:', error);
      if (isMountedRef.current) {
        setTtsState('idle');
      }
    }
  }, [canSpeakMessage, message.content, apiKey, getEffectiveVoice, getEffectiveModel, getEffectiveSpeed, ttsState]);

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
      style={[styles.messageRow, isUser && styles.messageRowUser]}
    >
      <View style={[styles.messageColumn, isUser && styles.messageColumnUser]}>
        {/* Message content */}
        <Pressable
          onLongPress={handleLongPress}
          onPress={showActions ? handleDismissActions : undefined}
          delayLongPress={400}
          style={[
            styles.bubble,
            isUser ? styles.userBubble : [
              styles.assistantBubble,
              {
                backgroundColor: readingStyles.colors.background,
                borderColor: readingStyles.colors.border,
              }
            ],
          ]}
        >
          {isUser ? (
            <Text style={[
              styles.userText,
              {
                fontSize: readingStyles.fontSizeValue,
                lineHeight: readingStyles.fontSizeValue * readingStyles.lineHeight,
              }
            ]}>
              {message.content}
            </Text>
          ) : (
            <View style={styles.assistantContent}>
              {message.content ? (
                renderMarkdownWithStyles(message.content, readingStyles)
              ) : (
                <TypingIndicator language={language} />
              )}
              {isStreaming && message.content && (
                <View style={styles.cursorContainer}>
                  <Animated.View style={styles.cursor} />
                </View>
              )}
            </View>
          )}
        </Pressable>

        {/* Assistant avatar - below the bubble */}
        {!isUser && (
          <View style={styles.avatarRow}>
            <View style={styles.avatar}>
              <Sparkles size={14} color={Colors.primary} />
            </View>
            <Text style={styles.assistantLabel}>Faith Assistant</Text>
          </View>
        )}

        {/* Actions (copy, speak) - shown on long press or always for TTS */}
        {(showActions || (!isUser && canSpeakMessage && message.content)) && (
          <Animated.View entering={webSafeEntering(FadeIn.duration(200))} style={[styles.messageActions, isUser && styles.messageActionsUser]}>
            {/* TTS Button - only for assistant messages */}
            {!isUser && canSpeakMessage && (
              <Pressable
                onPress={handleSpeak}
                style={({ pressed }) => [
                  styles.actionBtn,
                  (ttsState === 'playing' || ttsState === 'loading') && styles.actionBtnActive,
                  ttsState === 'paused' && styles.actionBtnPaused,
                  pressed && styles.actionBtnPressed,
                ]}
              >
                {ttsState === 'loading' ? (
                  <>
                    <View style={styles.loadingDot} />
                    <Text style={styles.actionText}>
                      {language === 'id' ? 'Memuat...' : 'Loading...'}
                    </Text>
                  </>
                ) : ttsState === 'playing' ? (
                  <>
                    <Pause size={14} color={Colors.primary} />
                    <Text style={[styles.actionText, { color: Colors.primary }]}>
                      {language === 'id' ? 'Jeda' : 'Pause'}
                    </Text>
                  </>
                ) : ttsState === 'paused' ? (
                  <>
                    <Volume2 size={14} color={Colors.primary} />
                    <Text style={[styles.actionText, { color: Colors.primary }]}>
                      {language === 'id' ? 'Lanjut' : 'Resume'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Volume2 size={14} color={Colors.textSecondary} />
                    <Text style={styles.actionText}>
                      {language === 'id' ? 'Dengar' : 'Listen'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}

            {/* Copy Button - shown on long press */}
            {showActions && (
              <Pressable
                onPress={handleCopy}
                style={({ pressed }) => [
                  styles.actionBtn,
                  pressed && styles.actionBtnPressed,
                ]}
              >
                {copied ? (
                  <>
                    <Check size={14} color={Colors.success} />
                    <Text style={[styles.actionText, { color: Colors.success }]}>
                      {language === 'id' ? 'Tersalin!' : 'Copied!'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Copy size={14} color={Colors.textSecondary} />
                    <Text style={styles.actionText}>
                      {language === 'id' ? 'Salin' : 'Copy'}
                    </Text>
                  </>
                )}
              </Pressable>
            )}
          </Animated.View>
        )}

        {/* Timestamp - shown for last message or on action view */}
        {(isLast || showActions) && !isStreaming && message.content && (
          <Animated.Text
            entering={webSafeEntering(FadeIn.duration(200))}
            style={[styles.timestamp, isUser && styles.timestampUser]}
          >
            {formatRelativeTime(message.timestamp, language)}
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
});

MessageBubble.displayName = 'MessageBubble';

/**
 * Conversation Starter Card
 */
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
      style={({ pressed }) => [
        styles.starterCard,
        pressed && styles.starterCardPressed,
      ]}
    >
      <View style={styles.starterIcon}>{icon}</View>
      <View style={styles.starterTextContainer}>
        <Text style={styles.starterTitle}>{title}</Text>
        <Text style={styles.starterDescription} numberOfLines={2}>{description}</Text>
      </View>
    </Pressable>
  </Animated.View>
));

StarterCard.displayName = 'StarterCard';

/**
 * Main Chat Screen
 */
function CompanionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [inputText, setInputText] = useState('');
  const [inputHeight, setInputHeight] = useState(36);
  const [showSettings, setShowSettings] = useState(false);
  const [showVoiceChat, setShowVoiceChat] = useState(false);
  const settingsSheetRef = useRef<BottomSheet>(null);
  const settingsSnapPoints = useMemo(() => ['70%'], []);
  const language = (i18n.language || 'en') as 'en' | 'id';

  // Reading preferences (for AI response text display)
  const readingStyles = useReadingStyles();
  const {
    fontSize,
    theme: readingTheme,
    lineHeight,
    setFontSize,
    setTheme,
    setLineHeight,
  } = useReadingPreferencesStore();

  // Voice settings (for TTS)
  const {
    isEnabled: voiceEnabled,
    userPreferences: voicePrefs,
    getEffectiveVoice,
    getEffectiveSpeed,
    updateUserPreferences: updateVoicePrefs,
  } = useVoiceSettingsStore();

  // Store state
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
  const setError = useCompanionStore((s) => s.setError);
  const clearChat = useCompanionStore((s) => s.clearChat);

  // Get appropriate greeting
  const greeting = COMPANION_GREETINGS[language]?.[entryContext] || COMPANION_GREETINGS[language]?.default || COMPANION_GREETINGS.en.default;
  const starters = CONVERSATION_STARTERS[language] || CONVERSATION_STARTERS.en;

  // Starter cards with icons - designed to feel warm and inviting
  const starterCards = useMemo(() => [
    {
      icon: <BookOpen size={20} color={Colors.primary} strokeWidth={1.8} />,
      title: starters[0]?.label || 'Explain a verse',
      description: language === 'id'
        ? 'Bantu saya memahami makna ayat Alkitab'
        : 'Help me understand the meaning of Scripture',
      prompt: starters[0]?.prompt || '',
    },
    {
      icon: <HandHeart size={20} color={Colors.primary} strokeWidth={1.8} />,
      title: starters[1]?.label || 'Life guidance',
      description: language === 'id'
        ? 'Saya butuh hikmat untuk keputusan yang sulit'
        : 'I need wisdom for a difficult decision',
      prompt: starters[1]?.prompt || '',
    },
    {
      icon: <Heart size={20} color={Colors.primary} strokeWidth={1.8} />,
      title: starters[4]?.label || 'Dealing with doubt',
      description: language === 'id'
        ? 'Saya bergumul dan butuh seseorang untuk mendengarkan'
        : "I'm struggling and need someone to listen",
      prompt: starters[4]?.prompt || '',
    },
    {
      icon: <Flame size={20} color={Colors.primary} strokeWidth={1.8} />,
      title: starters[2]?.label || 'Prayer request',
      description: language === 'id'
        ? 'Bantu saya berdoa tentang sesuatu di hati saya'
        : 'Help me pray about something on my heart',
      prompt: starters[2]?.prompt || '',
    },
  ], [starters, language]);

  /**
   * Send a message directly (used by both text input and voice input)
   */
  const sendMessage = useCallback((text: string, autoPlayResponse = false) => {
    const trimmedText = text.trim();
    if (!trimmedText || isLoading || isStreaming) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    // Add user message
    addMessage({ role: 'user', content: trimmedText });
    setLoading(true);

    // Build messages array for API
    const apiMessages = messages.length === 0
      ? [
          { role: 'assistant' as const, content: greeting },
          { role: 'user' as const, content: trimmedText },
        ]
      : [
          ...messages.map((m) => ({ role: m.role, content: m.content })),
          { role: 'user' as const, content: trimmedText },
        ];

    // Create placeholder message for streaming
    const assistantMessageId = addMessage({ role: 'assistant', content: '' });
    startStreaming(assistantMessageId);

    // SSE streaming - returns cleanup function (not a Promise)
    sendCompanionMessageStream(
      {
        messages: apiMessages,
        context: entryContext,
        context_data: contextData,
      },
      {
        onToken: (_token, fullText) => {
          updateMessage(assistantMessageId, fullText);
        },
        onComplete: (fullText) => {
          stopStreaming();
          // Auto-play response if enabled in settings OR if requested (voice input)
          const shouldAutoPlay = autoPlayResponse || (voicePrefs.autoPlayResponses && voiceEnabled);
          if (shouldAutoPlay && fullText) {
            const apiKey = useVoiceSettingsStore.getState().getEffectiveApiKey();
            if (apiKey) {
              // Use streaming TTS for faster first-audio on long responses
              // Short text automatically falls back to regular speakText
              speakTextStreaming(fullText, apiKey, {
                voice: getEffectiveVoice(),
                speed: getEffectiveSpeed(),
              }, 200).catch((err) => console.error('[VoiceChat] TTS error:', err));
            }
          }
        },
        onError: (error) => {
          console.error('Stream error:', error);
          const errorMessage = language === 'id'
            ? 'Maaf, terjadi kesalahan. Silakan coba lagi.'
            : 'Sorry, an error occurred. Please try again.';
          updateMessage(assistantMessageId, errorMessage);
          stopStreaming();
        },
      }
    );
  }, [isLoading, isStreaming, messages, greeting, entryContext, contextData, language, addMessage, updateMessage, startStreaming, stopStreaming, setLoading, voicePrefs.autoPlayResponses, voiceEnabled, getEffectiveVoice, getEffectiveSpeed]);

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
    clearChat();
  }, [clearChat]);

  // Scroll to bottom when messages change
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages.length, messages[messages.length - 1]?.content]);

  const showWelcome = messages.length === 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </Pressable>

        <View style={styles.headerCenter}>
          <View style={styles.headerAvatar}>
            <Sparkles size={16} color={Colors.textOnPrimary} />
          </View>
          <Text style={styles.headerTitle}>{t('companion.title', 'Faith Assistant')}</Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Pressable
            onPress={handleNewChat}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <RotateCcw size={28} color={Colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowSettings(true);
            }}
            style={({ pressed }) => [styles.headerBtn, pressed && styles.headerBtnPressed]}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Settings size={28} color={Colors.textSecondary} />
          </Pressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Welcome screen */}
          {showWelcome && (
            <Animated.View entering={webSafeEntering(FadeIn.duration(500))} style={styles.welcomeContainer}>
              {/* Logo/Icon */}
              <View style={styles.welcomeIconWrap}>
                <Sparkles size={32} color={Colors.primary} />
              </View>

              {/* Greeting */}
              <Text style={styles.welcomeTitle}>
                {t('companion.title', 'Faith Assistant')}
              </Text>
              <Text style={styles.welcomeSubtitle}>
                {greeting}
              </Text>

              {/* Starter Cards */}
              <View style={styles.startersContainer}>
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

          {/* Messages */}
          {!showWelcome && messages.map((msg, index) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isStreaming={msg.id === streamingMessageId}
              isLast={index === messages.length - 1}
              language={language}
            />
          ))}

          {/* Loading indicator with empathetic message (before streaming starts) */}
          {isLoading && !isStreaming && (
            <Animated.View entering={webSafeEntering(FadeIn.duration(400))} style={[styles.messageRow]}>
              <View style={styles.messageColumn}>
                <View style={[styles.bubble, styles.assistantBubble, styles.loadingBubble]}>
                  <TypingIndicator showMessage language={language} />
                </View>
                <View style={styles.avatarRow}>
                  <View style={styles.avatar}>
                    <Sparkles size={14} color={Colors.primary} />
                  </View>
                  <Text style={styles.assistantLabel}>Faith Assistant</Text>
                </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputArea, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={[styles.input, { height: Math.max(36, Math.min(inputHeight, 100)) }]}
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
            {/* Voice Chat Button - Full voice conversation */}
            {voiceEnabled && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setShowVoiceChat(true);
                }}
                style={({ pressed }) => [
                  styles.voiceChatBtn,
                  pressed && styles.sendBtnPressed,
                ]}
                disabled={isLoading || isStreaming}
              >
                <Headphones size={20} color={Colors.primary} />
              </Pressable>
            )}
            {/* STT Button - Speech to text, sends immediately */}
            <VoiceButton
              onTranscription={(text) => {
                // Immediately send transcribed text and auto-play response
                sendMessage(text, true);
              }}
              onError={(error) => {
                console.error('[Companion] Voice error:', error);
              }}
              defaultLanguage={language}
              size={44}
              disabled={isLoading || isStreaming}
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading || isStreaming}
              style={({ pressed }) => [
                styles.sendBtn,
                (!inputText.trim() || isLoading || isStreaming) && styles.sendBtnDisabled,
                pressed && inputText.trim() && !isLoading && !isStreaming && styles.sendBtnPressed,
              ]}
            >
              <Send
                size={22}
                color={inputText.trim() && !isLoading && !isStreaming ? Colors.text : Colors.textTertiary}
              />
            </Pressable>
          </View>

          <Text style={styles.disclaimer}>
            {language === 'id'
              ? 'Bukan pengganti nasihat pendeta.'
              : 'Not a substitute for pastoral guidance.'}
          </Text>
        </View>
      </KeyboardAvoidingView>

      {/* Settings Bottom Sheet */}
      <BottomSheet
        ref={settingsSheetRef}
        index={showSettings ? 0 : -1}
        snapPoints={settingsSnapPoints}
        enablePanDownToClose
        onClose={() => setShowSettings(false)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
            pressBehavior="close"
          />
        )}
        backgroundStyle={{ backgroundColor: Colors.background }}
        handleIndicatorStyle={{ backgroundColor: Colors.border }}
      >
        <BottomSheetScrollView style={styles.settingsContainer}>
          <Text style={styles.settingsTitle}>
            {language === 'id' ? 'Pengaturan' : 'Settings'}
          </Text>

          {/* Reading Preferences Section */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsSectionTitle}>
              <Type size={16} color={Colors.primary} style={{ marginRight: 8 }} />
              {language === 'id' ? 'Tampilan Teks' : 'Text Display'}
            </Text>

            {/* Font Size */}
            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>
                {language === 'id' ? 'Ukuran Font' : 'Font Size'}
              </Text>
              <View style={[styles.settingsOptions, { flexWrap: 'wrap' }]}>
                {([
                  { key: 'small', label: language === 'id' ? 'Kecil' : 'Small' },
                  { key: 'medium', label: language === 'id' ? 'Standar' : 'Standard' },
                  { key: 'large', label: language === 'id' ? 'Besar' : 'Large' },
                  { key: 'xlarge', label: language === 'id' ? 'Ekstra Besar' : 'Extra Large' },
                ] as { key: FontSize; label: string }[]).map((item) => (
                  <Pressable
                    key={item.key}
                    onPress={() => setFontSize(item.key)}
                    style={[
                      styles.settingsOption,
                      { minWidth: 80, paddingHorizontal: 12 },
                      fontSize === item.key && styles.settingsOptionActive,
                    ]}
                  >
                    <Text style={[
                      styles.settingsOptionText,
                      fontSize === item.key && styles.settingsOptionTextActive,
                    ]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Theme */}
            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>
                {language === 'id' ? 'Tema Baca' : 'Reading Theme'}
              </Text>
              <View style={styles.settingsOptions}>
                {(['light', 'sepia', 'dark'] as ReadingTheme[]).map((themeOpt) => (
                  <Pressable
                    key={themeOpt}
                    onPress={() => setTheme(themeOpt)}
                    style={[
                      styles.settingsOption,
                      readingTheme === themeOpt && styles.settingsOptionActive,
                      {
                        backgroundColor: themeOpt === 'light' ? '#FFFFFF' : themeOpt === 'sepia' ? '#F5F0E6' : '#1A1A1A',
                        borderColor: themeOpt === 'dark' ? '#374151' : '#E5E7EB',
                      }
                    ]}
                  >
                    {themeOpt === 'light' ? (
                      <Sun size={16} color={readingTheme === 'light' ? Colors.primary : '#6B7280'} />
                    ) : themeOpt === 'dark' ? (
                      <Moon size={16} color={readingTheme === 'dark' ? Colors.primary : '#9CA3AF'} />
                    ) : (
                      <Text style={{ color: readingTheme === 'sepia' ? Colors.primary : '#6B6353', fontSize: 12 }}>
                        Se
                      </Text>
                    )}
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Line Height */}
            <View style={styles.settingsRow}>
              <Text style={styles.settingsLabel}>
                {language === 'id' ? 'Jarak Baris' : 'Line Spacing'}
              </Text>
              <View style={[styles.settingsOptions, { flexWrap: 'wrap' }]}>
                {([
                  { value: 1.4, label: language === 'id' ? 'Rapat' : 'Tight' },
                  { value: 1.6, label: language === 'id' ? 'Standar' : 'Standard' },
                  { value: 1.8, label: language === 'id' ? 'Longgar' : 'Loose' },
                  { value: 2.0, label: language === 'id' ? 'Sangat Longgar' : 'Very Loose' },
                ]).map((item) => (
                  <Pressable
                    key={item.value}
                    onPress={() => setLineHeight(item.value)}
                    style={[
                      styles.settingsOption,
                      { minWidth: 80, paddingHorizontal: 12 },
                      lineHeight === item.value && styles.settingsOptionActive,
                    ]}
                  >
                    <Text style={[
                      styles.settingsOptionText,
                      lineHeight === item.value && styles.settingsOptionTextActive,
                    ]}>
                      {item.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {/* Preview */}
            <View style={[
              styles.settingsPreview,
              {
                backgroundColor: readingStyles.colors.background,
                borderColor: readingStyles.colors.border,
              }
            ]}>
              <Text style={[
                {
                  fontSize: readingStyles.fontSizeValue,
                  lineHeight: readingStyles.fontSizeValue * lineHeight,
                  color: readingStyles.colors.text,
                }
              ]}>
                {language === 'id'
                  ? 'Contoh teks dengan pengaturan saat ini. Ini adalah pratinjau bagaimana respons AI akan ditampilkan.'
                  : 'Sample text with current settings. This is a preview of how AI responses will be displayed.'}
              </Text>
            </View>
          </View>

          {/* Voice Settings Section */}
          {voiceEnabled && (
            <View style={styles.settingsSection}>
              <Text style={styles.settingsSectionTitle}>
                <Volume2 size={16} color={Colors.primary} style={{ marginRight: 8 }} />
                {language === 'id' ? 'Suara (TTS)' : 'Voice (TTS)'}
              </Text>

              {/* Voice Selection */}
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>
                  {language === 'id' ? 'Pilih Suara' : 'Voice'}
                </Text>
                <View style={[styles.settingsOptions, { flexWrap: 'wrap', gap: 8 }]}>
                  {(['nova', 'alloy', 'echo', 'shimmer'] as TTSVoice[]).map((voice) => (
                    <Pressable
                      key={voice}
                      onPress={() => updateVoicePrefs({ voice })}
                      style={[
                        styles.settingsOption,
                        { minWidth: 70 },
                        getEffectiveVoice() === voice && styles.settingsOptionActive,
                      ]}
                    >
                      <Text style={[
                        styles.settingsOptionText,
                        getEffectiveVoice() === voice && styles.settingsOptionTextActive,
                      ]}>
                        {voice.charAt(0).toUpperCase() + voice.slice(1)}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Speed */}
              <View style={styles.settingsRow}>
                <Text style={styles.settingsLabel}>
                  {language === 'id' ? 'Kecepatan' : 'Speed'}
                </Text>
                <View style={styles.settingsOptions}>
                  {[0.75, 1.0, 1.25, 1.5].map((speed) => (
                    <Pressable
                      key={speed}
                      onPress={() => updateVoicePrefs({ speed })}
                      style={[
                        styles.settingsOption,
                        getEffectiveSpeed() === speed && styles.settingsOptionActive,
                      ]}
                    >
                      <Text style={[
                        styles.settingsOptionText,
                        getEffectiveSpeed() === speed && styles.settingsOptionTextActive,
                      ]}>
                        {speed}x
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>

              {/* Auto-play Toggle */}
              <Pressable
                style={styles.settingsToggleRow}
                onPress={() => updateVoicePrefs({ autoPlayResponses: !voicePrefs.autoPlayResponses })}
              >
                <View style={{ flex: 1 }}>
                  <Text style={styles.settingsLabel}>
                    {language === 'id' ? 'Auto-Play Respons' : 'Auto-Play Responses'}
                  </Text>
                  <Text style={styles.settingsHint}>
                    {language === 'id'
                      ? 'Otomatis membacakan respons AI'
                      : 'Automatically read AI responses aloud'}
                  </Text>
                </View>
                <View style={[
                  styles.settingsToggle,
                  voicePrefs.autoPlayResponses && styles.settingsToggleActive,
                ]}>
                  <View style={[
                    styles.settingsToggleThumb,
                    voicePrefs.autoPlayResponses && styles.settingsToggleThumbActive,
                  ]} />
                </View>
              </Pressable>
            </View>
          )}

          <View style={{ height: insets.bottom + 20 }} />
        </BottomSheetScrollView>
      </BottomSheet>

      {/* Voice Chat Modal - Full voice conversation mode using OpenAI Realtime API */}
      <VoiceChatModal
        visible={showVoiceChat}
        onClose={() => setShowVoiceChat(false)}
        language={language}
        onConversationEnd={(realtimeMessages) => {
          // Optionally add Realtime conversation to the chat history
          realtimeMessages.forEach((msg) => {
            addMessage({ role: msg.role, content: msg.content });
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
  },

  // Keyboard view
  keyboardView: {
    flex: 1,
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: 16,
    paddingBottom: 8,
  },

  // Welcome
  welcomeContainer: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 16,
  },
  welcomeIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  welcomeTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  welcomeSubtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 24,
    marginBottom: 24,
  },

  // Starters
  startersContainer: {
    width: '100%',
    gap: 12,
  },
  starterCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    width: '100%',
  },
  starterCardPressed: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.primary,
  },
  starterIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    alignSelf: 'center',
  },
  starterTextContainer: {
    alignItems: 'center',
    alignSelf: 'center',
    width: '100%',
    marginTop: 4,
  },
  starterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  starterDescription: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },

  // Message row
  messageRow: {
    flexDirection: 'row',
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageColumn: {
    maxWidth: SCREEN_WIDTH - 48,
  },
  messageColumnUser: {
    alignItems: 'flex-end',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 6,
  },
  avatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  assistantLabel: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontWeight: '500',
  },
  // Message actions (copy)
  messageActions: {
    flexDirection: 'row',
    marginTop: 6,
    gap: 8,
  },
  messageActionsUser: {
    justifyContent: 'flex-end',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: Colors.surface,
  },
  actionBtnPressed: {
    backgroundColor: Colors.surfaceAlt,
  },
  actionBtnActive: {
    backgroundColor: `${Colors.primary}15`,
    borderWidth: 1,
    borderColor: `${Colors.primary}30`,
  },
  actionBtnPaused: {
    backgroundColor: `${Colors.primary}10`,
    borderWidth: 1,
    borderColor: `${Colors.primary}20`,
  },
  actionText: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  loadingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: Colors.primary,
    opacity: 0.6,
  },
  // Timestamps
  timestamp: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 4,
    marginLeft: 4,
  },
  timestampUser: {
    textAlign: 'right',
    marginRight: 4,
    marginLeft: 0,
  },

  // Bubble
  bubble: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userBubble: {
    backgroundColor: Colors.userBubble,
    borderBottomRightRadius: 6,
    maxWidth: SCREEN_WIDTH - 48,
  },
  assistantBubble: {
    backgroundColor: Colors.assistantBubble,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: SCREEN_WIDTH - 48,
  },
  userText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textOnPrimary,
  },
  assistantContent: {
    flex: 1,
  },

  // Typing indicator
  typingWrapper: {
    gap: 8,
  },
  thinkingText: {
    fontSize: 13,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginBottom: 4,
  },
  typingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  loadingBubble: {
    minWidth: 180,
  },

  // Cursor
  cursorContainer: {
    position: 'absolute',
    right: 0,
    bottom: 0,
  },
  cursor: {
    width: 2,
    height: 16,
    backgroundColor: Colors.primary,
  },

  // Markdown styles
  mdH1: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  mdH2: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 6,
    marginTop: 4,
  },
  mdH3: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    marginTop: 2,
  },
  mdParagraph: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  mdBold: {
    fontWeight: '700',
  },
  mdItalic: {
    fontStyle: 'italic',
  },
  mdInlineCode: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 13,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    overflow: 'hidden',
  },
  mdBullet: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  mdBulletDot: {
    width: 20,
    fontSize: 15,
    color: Colors.textSecondary,
  },
  mdBulletNum: {
    width: 24,
    fontSize: 15,
    color: Colors.textSecondary,
    fontWeight: '500',
  },
  mdBulletText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: Colors.text,
  },
  mdBlockquote: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
    paddingLeft: 12,
    marginVertical: 8,
    opacity: 0.9,
  },
  mdBlockquoteText: {
    fontSize: 15,
    lineHeight: 22,
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  mdBreak: {
    height: 8,
  },

  // Input area
  inputArea: {
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    paddingTop: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: 28,
    paddingLeft: 18,
    paddingRight: 18,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    minHeight: 52,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 8,
    lineHeight: 20,
    maxHeight: 100,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-end',
    marginBottom: 0,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surfaceAlt,
    borderColor: Colors.borderLight,
  },
  sendBtnPressed: {
    opacity: 0.8,
  },
  disclaimer: {
    fontSize: 11,
    color: Colors.textTertiary,
    textAlign: 'center',
    marginTop: 10,
  },

  // Settings styles
  settingsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  settingsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  settingsSection: {
    marginBottom: 24,
  },
  settingsSectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingsRow: {
    marginBottom: 16,
  },
  settingsLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 10,
  },
  settingsOptions: {
    flexDirection: 'row',
    gap: 10,
  },
  settingsOption: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 48,
  },
  settingsOptionActive: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  settingsOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  settingsOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  settingsPreview: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  settingsToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  settingsHint: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  settingsToggle: {
    width: 50,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 2,
    justifyContent: 'center',
  },
  settingsToggleActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  settingsToggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  settingsToggleThumbActive: {
    alignSelf: 'flex-end',
  },

  // Voice chat button - opens full voice conversation modal
  voiceChatBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primary + '15',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(CompanionScreen);
