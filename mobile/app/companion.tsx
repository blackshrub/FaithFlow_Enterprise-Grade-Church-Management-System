/**
 * Faith Assistant Chat Screen (Pendamping Iman)
 *
 * A beautiful, spiritually-focused chat interface for the AI companion.
 * Features:
 * - Context-aware greeting based on entry point and time
 * - Conversation starters for easy engagement
 * - Premium design with smooth animations
 * - Full i18n support (EN/ID)
 */

import React, { useState, useCallback, useRef, useEffect, memo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  FlatList,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StatusBar } from 'expo-status-bar';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  SlideInRight,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  Send,
  MessageCircle,
  Sparkles,
  RefreshCw,
  Heart,
} from 'lucide-react-native';

import { useCompanionStore, type CompanionMessage } from '@/stores/companionStore';
import {
  COMPANION_GREETINGS,
  CONVERSATION_STARTERS,
} from '@/constants/companionPrompt';
import { useExploreStore } from '@/stores/explore/exploreStore';
import { sendCompanionMessage } from '@/services/api/companion';

// Colors
const Colors = {
  primary: '#4F46E5',
  primaryLight: '#6366F1',
  primaryDark: '#4338CA',
  accent: '#7C3AED',
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  error: '#EF4444',
};

/**
 * Message Bubble Component
 */
interface MessageBubbleProps {
  message: CompanionMessage;
  isLast: boolean;
}

const MessageBubble = memo(({ message, isLast }: MessageBubbleProps) => {
  const isUser = message.role === 'user';

  return (
    <Animated.View
      entering={isLast ? (isUser ? SlideInRight.duration(300) : FadeInDown.duration(400)) : undefined}
      style={[
        styles.messageBubble,
        isUser ? styles.userBubble : styles.assistantBubble,
      ]}
    >
      {!isUser && (
        <View style={styles.assistantIcon}>
          <MessageCircle size={14} color={Colors.primary} />
        </View>
      )}
      <View style={[styles.bubbleContent, isUser ? styles.userContent : styles.assistantContent]}>
        <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
          {message.content}
        </Text>
      </View>
    </Animated.View>
  );
});

MessageBubble.displayName = 'MessageBubble';

/**
 * Conversation Starter Chip
 */
interface StarterChipProps {
  label: string;
  onPress: () => void;
  index: number;
}

const StarterChip = memo(({ label, onPress, index }: StarterChipProps) => (
  <Animated.View entering={FadeInUp.delay(index * 80).duration(400)}>
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.starterChip,
        pressed && styles.starterChipPressed,
      ]}
    >
      <Text style={styles.starterText}>{label}</Text>
    </Pressable>
  </Animated.View>
));

StarterChip.displayName = 'StarterChip';

/**
 * Main Chat Screen
 */
function CompanionScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const flatListRef = useRef<FlatList>(null);
  const inputRef = useRef<TextInput>(null);

  const [inputText, setInputText] = useState('');
  const language = (i18n.language || 'en') as 'en' | 'id';

  // Store state
  const messages = useCompanionStore((s) => s.messages);
  const isLoading = useCompanionStore((s) => s.isLoading);
  const error = useCompanionStore((s) => s.error);
  const entryContext = useCompanionStore((s) => s.entryContext);
  const contextData = useCompanionStore((s) => s.contextData);
  const addMessage = useCompanionStore((s) => s.addMessage);
  const setLoading = useCompanionStore((s) => s.setLoading);
  const setError = useCompanionStore((s) => s.setError);
  const clearChat = useCompanionStore((s) => s.clearChat);

  // Get appropriate greeting
  const greeting = COMPANION_GREETINGS[language]?.[entryContext] || COMPANION_GREETINGS[language]?.default || COMPANION_GREETINGS.en.default;
  const starters = CONVERSATION_STARTERS[language] || CONVERSATION_STARTERS.en;

  // Show greeting as first message when chat is empty
  const displayMessages = messages.length === 0
    ? [{ id: 'greeting', role: 'assistant' as const, content: greeting, timestamp: new Date() }]
    : messages;

  const handleSend = useCallback(async () => {
    const trimmedText = inputText.trim();
    if (!trimmedText || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Keyboard.dismiss();

    // Add user message
    addMessage({ role: 'user', content: trimmedText });
    setInputText('');
    setLoading(true);

    try {
      // Build messages array for API (include greeting as first assistant message if empty)
      const apiMessages = messages.length === 0
        ? [
            { role: 'assistant' as const, content: greeting },
            { role: 'user' as const, content: trimmedText },
          ]
        : [
            ...messages.map((m) => ({ role: m.role, content: m.content })),
            { role: 'user' as const, content: trimmedText },
          ];

      // Call the real API
      const response = await sendCompanionMessage({
        messages: apiMessages,
        context: entryContext,
        context_data: contextData,
      });

      // Add assistant response
      addMessage({ role: 'assistant', content: response.message });
    } catch (error: any) {
      console.error('Companion chat error:', error);
      // Fallback to error message
      const errorMessage = language === 'id'
        ? 'Maaf, terjadi kesalahan. Silakan coba lagi.'
        : 'Sorry, an error occurred. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [inputText, isLoading, addMessage, setLoading, messages, greeting, entryContext, contextData, language, setError]);

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
    if (displayMessages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [displayMessages.length]);

  const renderMessage = useCallback(({ item, index }: { item: CompanionMessage; index: number }) => (
    <MessageBubble
      message={item}
      isLast={index === displayMessages.length - 1}
    />
  ), [displayMessages.length]);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <LinearGradient
        colors={[Colors.primary, Colors.primaryLight]}
        style={[styles.header, { paddingTop: insets.top + 8 }]}
      >
        <View style={styles.headerContent}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          >
            <ChevronLeft size={24} color={Colors.white} />
          </Pressable>

          <View style={styles.headerCenter}>
            <View style={styles.headerIconWrap}>
              <MessageCircle size={18} color={Colors.white} />
              <View style={styles.headerSparkle}>
                <Sparkles size={10} color="#F59E0B" fill="#F59E0B" />
              </View>
            </View>
            <View>
              <Text style={styles.headerTitle}>
                {t('companion.title', 'Faith Assistant')}
              </Text>
              <Text style={styles.headerSubtitle}>
                {t('companion.subtitle', 'Your spiritual companion')}
              </Text>
            </View>
          </View>

          <Pressable
            onPress={handleNewChat}
            style={({ pressed }) => [styles.newChatBtn, pressed && styles.btnPressed]}
          >
            <RefreshCw size={20} color={Colors.white} />
          </Pressable>
        </View>
      </LinearGradient>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <>
              {/* Loading indicator */}
              {isLoading && (
                <Animated.View entering={FadeIn} style={styles.loadingWrap}>
                  <View style={styles.loadingBubble}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.loadingText}>
                      {t('companion.thinking', 'Thinking...')}
                    </Text>
                  </View>
                </Animated.View>
              )}

              {/* Conversation starters (show when chat is empty or just greeting) */}
              {messages.length === 0 && !isLoading && (
                <Animated.View entering={FadeIn.delay(400)} style={styles.startersSection}>
                  <Text style={styles.startersTitle}>
                    {t('companion.suggestionsTitle', 'Try asking about:')}
                  </Text>
                  <View style={styles.startersGrid}>
                    {starters.map((starter, index) => (
                      <StarterChip
                        key={starter.label}
                        label={starter.label}
                        onPress={() => handleStarterPress(starter.prompt)}
                        index={index}
                      />
                    ))}
                  </View>
                </Animated.View>
              )}
            </>
          }
        />

        {/* Input Area */}
        <View style={[styles.inputArea, { paddingBottom: insets.bottom + 8 }]}>
          <View style={styles.inputContainer}>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={t('companion.inputPlaceholder', 'Type your message...')}
              placeholderTextColor={Colors.neutral[400]}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={2000}
              returnKeyType="default"
            />
            <Pressable
              onPress={handleSend}
              disabled={!inputText.trim() || isLoading}
              style={({ pressed }) => [
                styles.sendBtn,
                (!inputText.trim() || isLoading) && styles.sendBtnDisabled,
                pressed && inputText.trim() && !isLoading && styles.sendBtnPressed,
              ]}
            >
              <Send
                size={20}
                color={inputText.trim() && !isLoading ? Colors.white : Colors.neutral[400]}
              />
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  // Header
  header: {
    paddingBottom: 16,
    paddingHorizontal: 16,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  btnPressed: {
    opacity: 0.7,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerSparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: Colors.white,
    borderRadius: 8,
    padding: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.white,
  },
  headerSubtitle: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  newChatBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  // Keyboard view
  keyboardView: {
    flex: 1,
  },
  // Messages list
  messagesList: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  // Message bubble
  messageBubble: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userBubble: {
    justifyContent: 'flex-end',
  },
  assistantBubble: {
    justifyContent: 'flex-start',
  },
  assistantIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  bubbleContent: {
    maxWidth: '80%',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  userContent: {
    backgroundColor: Colors.primary,
    borderBottomRightRadius: 6,
    marginLeft: 'auto',
  },
  assistantContent: {
    backgroundColor: Colors.white,
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  messageText: {
    fontSize: 15,
    lineHeight: 22,
  },
  userText: {
    color: Colors.white,
  },
  assistantText: {
    color: Colors.neutral[800],
  },
  // Loading
  loadingWrap: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginLeft: 36,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  // Starters
  startersSection: {
    marginTop: 24,
    paddingHorizontal: 8,
  },
  startersTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[500],
    marginBottom: 12,
  },
  startersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  starterChip: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  starterChipPressed: {
    backgroundColor: Colors.neutral[100],
    borderColor: Colors.primary,
  },
  starterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.neutral[700],
  },
  // Input area
  inputArea: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    backgroundColor: Colors.neutral[100],
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 6,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.neutral[900],
    maxHeight: 100,
    paddingVertical: 8,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: Colors.neutral[200],
  },
  sendBtnPressed: {
    opacity: 0.8,
  },
});

export default memo(CompanionScreen);
