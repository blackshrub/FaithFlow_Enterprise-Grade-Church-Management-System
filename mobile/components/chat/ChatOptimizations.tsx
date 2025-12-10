/**
 * Chat Performance & UX Optimizations
 *
 * WhatsApp-level micro-interactions and performance:
 * - High refresh rate support (90Hz/120Hz/144Hz)
 * - Animated send button with spring physics
 * - Scroll-to-bottom FAB with new message count
 * - Connection status banner
 * - Message status indicators
 * - Optimistic send with visual feedback
 * - Swipe-to-reply gesture
 * - Double-tap quick reaction
 * - Date headers and unread dividers
 *
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Dimensions,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withSequence,
  withDelay,
  interpolate,
  Extrapolation,
  runOnJS,
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
  SlideInRight,
  ZoomIn,
  ZoomOut,
  useFrameCallback,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
  PanGestureHandler,
  TapGestureHandler,
  State,
} from 'react-native-gesture-handler';
import {
  Send,
  ArrowDown,
  Check,
  CheckCheck,
  Clock,
  Wifi,
  WifiOff,
  AlertCircle,
  Reply,
  Heart,
  Plus,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { colors, borderRadius, shadows, spacing, communityColors } from '@/constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// =============================================================================
// HIGH REFRESH RATE CONFIGURATION
// =============================================================================

/**
 * Spring configs optimized for high refresh rate displays
 * These configs produce smoother animations at 90Hz/120Hz/144Hz
 */
export const SPRING_CONFIGS = {
  // Ultra responsive - for button presses (< 100ms feel)
  snappy: {
    damping: 20,
    stiffness: 600,
    mass: 0.5,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  // Quick but smooth - for UI transitions
  quick: {
    damping: 18,
    stiffness: 400,
    mass: 0.8,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  // Bouncy - for playful micro-interactions
  bouncy: {
    damping: 12,
    stiffness: 350,
    mass: 0.6,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
  // Smooth - for larger UI elements
  smooth: {
    damping: 22,
    stiffness: 300,
    mass: 1,
    overshootClamping: false,
    restDisplacementThreshold: 0.01,
    restSpeedThreshold: 0.01,
  },
} as const;

/**
 * Timing configs for high refresh rate
 * Uses native easing curves that work well at all refresh rates
 */
export const TIMING_CONFIGS = {
  instant: { duration: 100, easing: Easing.out(Easing.quad) },
  fast: { duration: 150, easing: Easing.out(Easing.cubic) },
  normal: { duration: 200, easing: Easing.inOut(Easing.quad) },
  smooth: { duration: 300, easing: Easing.bezier(0.25, 0.1, 0.25, 1) },
} as const;

// =============================================================================
// ANIMATED SEND BUTTON (WhatsApp-exact)
// =============================================================================

interface SendButtonProps {
  onPress: () => void;
  disabled?: boolean;
  isSending?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export const SendButton = React.memo(({ onPress, disabled, isSending }: SendButtonProps) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);
  const translateX = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(0.85, SPRING_CONFIGS.snappy);
  }, [scale]);

  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, SPRING_CONFIGS.snappy);
  }, [scale]);

  const handlePress = useCallback(() => {
    if (disabled || isSending) return;

    // Instant haptic feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // WhatsApp-style send animation: scale down, slight rotation, then bounce back
    scale.value = withSequence(
      withSpring(0.8, SPRING_CONFIGS.snappy),
      withSpring(1.15, SPRING_CONFIGS.bouncy),
      withSpring(1, SPRING_CONFIGS.quick)
    );

    // Slight forward movement like paper airplane
    translateX.value = withSequence(
      withTiming(8, TIMING_CONFIGS.instant),
      withTiming(0, TIMING_CONFIGS.fast)
    );

    // Subtle rotation
    rotation.value = withSequence(
      withTiming(-20, TIMING_CONFIGS.instant),
      withSpring(0, SPRING_CONFIGS.quick)
    );

    onPress();
  }, [disabled, isSending, onPress, scale, rotation, translateX]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
      { translateX: translateX.value },
    ],
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      disabled={disabled || isSending}
      className="w-11 h-11 rounded-[22px] items-center justify-center mb-1"
      style={[{ backgroundColor: communityColors.light }, animatedStyle]}
    >
      {isSending ? (
        <Animated.View style={{ transform: [{ rotate: '360deg' }] }}>
          <Clock size={20} color={colors.white} />
        </Animated.View>
      ) : (
        <Send size={20} color={colors.white} />
      )}
    </AnimatedPressable>
  );
});

SendButton.displayName = 'SendButton';

// =============================================================================
// SCROLL TO BOTTOM FAB (WhatsApp-exact)
// =============================================================================

interface ScrollToBottomFABProps {
  visible: boolean;
  newMessageCount: number;
  onPress: () => void;
}

export const ScrollToBottomFAB = React.memo(({
  visible,
  newMessageCount,
  onPress,
}: ScrollToBottomFABProps) => {
  const scale = useSharedValue(0);
  const badgeScale = useSharedValue(0);

  useEffect(() => {
    scale.value = withSpring(visible ? 1 : 0, SPRING_CONFIGS.bouncy);
  }, [visible, scale]);

  useEffect(() => {
    if (newMessageCount > 0) {
      badgeScale.value = withSequence(
        withSpring(1.3, SPRING_CONFIGS.snappy),
        withSpring(1, SPRING_CONFIGS.quick)
      );
    }
  }, [newMessageCount, badgeScale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Press animation
    scale.value = withSequence(
      withSpring(0.9, SPRING_CONFIGS.snappy),
      withSpring(1, SPRING_CONFIGS.quick)
    );
    onPress();
  }, [onPress, scale]);

  const fabStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: interpolate(scale.value, [0, 0.5, 1], [0, 0.5, 1]),
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
  }));

  if (!visible && newMessageCount === 0) return null;

  return (
    <Animated.View
      className="absolute right-4 bottom-4 z-[100]"
      style={fabStyle}
    >
      <Pressable
        onPress={handlePress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Scroll to bottom${newMessageCount > 0 ? `, ${newMessageCount} new ${newMessageCount === 1 ? 'message' : 'messages'}` : ''}`}
        className="w-12 h-12 rounded-3xl bg-white items-center justify-center"
        style={{
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
        }}
      >
        <ArrowDown size={16} color={communityColors.text.secondary} />
        {newMessageCount > 0 && (
          <Animated.View
            className="absolute -top-1.5 -right-1.5 rounded-xl min-w-[24px] h-6 items-center justify-center px-1.5"
            style={[{ backgroundColor: communityColors.accent }, badgeStyle]}
          >
            <Text className="text-white text-xs font-bold">
              {newMessageCount > 99 ? '99+' : newMessageCount}
            </Text>
          </Animated.View>
        )}
      </Pressable>
    </Animated.View>
  );
});

ScrollToBottomFAB.displayName = 'ScrollToBottomFAB';

// =============================================================================
// MESSAGE STATUS INDICATOR (WhatsApp-exact)
// =============================================================================

type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

interface MessageStatusProps {
  status: MessageStatus;
  isOwnMessage: boolean;
}

export const MessageStatusIndicator = React.memo(({
  status,
  isOwnMessage,
}: MessageStatusProps) => {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withTiming(1, TIMING_CONFIGS.fast);
    scale.value = withSpring(1, SPRING_CONFIGS.snappy);
  }, [status, opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (!isOwnMessage) return null;

  const getStatusIcon = () => {
    // WhatsApp-exact tick colors (gray for sent/delivered, blue for read)
    switch (status) {
      case 'sending':
        return (
          <Animated.View style={{ opacity: 0.7 }}>
            <Clock size={12} color={communityColors.status.sent} />
          </Animated.View>
        );
      case 'sent':
        // WhatsApp gray tick
        return <Check size={12} color={communityColors.status.sent} />;
      case 'delivered':
        // WhatsApp gray double tick
        return <CheckCheck size={12} color={communityColors.status.delivered} />;
      case 'read':
        // WhatsApp blue double tick
        return <CheckCheck size={12} color={communityColors.status.read} />;
      case 'failed':
        return <AlertCircle size={12} color={colors.error[500]} />;
      default:
        return null;
    }
  };

  return (
    <Animated.View className="ml-1" style={animatedStyle}>
      {getStatusIcon()}
    </Animated.View>
  );
});

MessageStatusIndicator.displayName = 'MessageStatusIndicator';

// =============================================================================
// CONNECTION STATUS BANNER (WhatsApp-exact)
// =============================================================================

type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

interface ConnectionBannerProps {
  status: ConnectionStatus;
}

export const ConnectionBanner = React.memo(({ status }: ConnectionBannerProps) => {
  const translateY = useSharedValue(-50);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (status === 'connected') {
      translateY.value = withTiming(-50, TIMING_CONFIGS.normal);
      opacity.value = withTiming(0, TIMING_CONFIGS.normal);
    } else {
      translateY.value = withSpring(0, SPRING_CONFIGS.quick);
      opacity.value = withTiming(1, TIMING_CONFIGS.fast);
    }
  }, [status, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const config = useMemo(() => {
    switch (status) {
      case 'connecting':
        return {
          icon: Wifi,
          text: 'Connecting...',
          bgColor: colors.amber[500], // WhatsApp yellow
        };
      case 'disconnected':
        return {
          icon: WifiOff,
          text: 'Waiting for network...',
          bgColor: colors.gray[500], // Gray
        };
      default:
        return null;
    }
  }, [status]);

  if (!config) return null;

  return (
    <Animated.View
      className="flex-row items-center px-4 py-2"
      style={[{ backgroundColor: config.bgColor }, animatedStyle]}
    >
      <View style={{ opacity: status === 'connecting' ? 0.7 : 1, marginRight: 8 }}>
        {status === 'connecting' ? <Wifi size={16} color={colors.white} /> : <WifiOff size={16} color={colors.white} />}
      </View>
      <Text className="text-white text-sm flex-1">{config.text}</Text>
    </Animated.View>
  );
});

ConnectionBanner.displayName = 'ConnectionBanner';

// =============================================================================
// SWIPE TO REPLY (WhatsApp-exact)
// =============================================================================

interface SwipeToReplyWrapperProps {
  children: React.ReactNode;
  onReply: () => void;
  enabled?: boolean;
}

export const SwipeToReplyWrapper = React.memo(({
  children,
  onReply,
  enabled = true,
}: SwipeToReplyWrapperProps) => {
  const translateX = useSharedValue(0);
  const replyIconOpacity = useSharedValue(0);
  const replyIconScale = useSharedValue(0.5);
  const hasTriggered = useSharedValue(false);

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 100;

  const panGesture = Gesture.Pan()
    .enabled(enabled)
    .activeOffsetX(20) // Start recognizing after 20px horizontal movement
    .failOffsetY([-10, 10]) // Fail if vertical movement > 10px
    .onUpdate((event) => {
      'worklet';
      // Only allow right swipe
      if (event.translationX > 0) {
        translateX.value = Math.min(event.translationX * 0.8, MAX_SWIPE);

        // Show reply icon progressively
        const progress = Math.min(translateX.value / SWIPE_THRESHOLD, 1);
        replyIconOpacity.value = progress;
        replyIconScale.value = 0.5 + progress * 0.5;

        // Trigger haptic when threshold crossed
        if (translateX.value >= SWIPE_THRESHOLD && !hasTriggered.value) {
          hasTriggered.value = true;
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        } else if (translateX.value < SWIPE_THRESHOLD) {
          hasTriggered.value = false;
        }
      }
    })
    .onEnd(() => {
      'worklet';
      if (translateX.value >= SWIPE_THRESHOLD) {
        runOnJS(onReply)();
      }

      translateX.value = withSpring(0, SPRING_CONFIGS.quick);
      replyIconOpacity.value = withTiming(0, TIMING_CONFIGS.fast);
      replyIconScale.value = withTiming(0.5, TIMING_CONFIGS.fast);
      hasTriggered.value = false;
    });

  const messageStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const replyIconStyle = useAnimatedStyle(() => ({
    opacity: replyIconOpacity.value,
    transform: [{ scale: replyIconScale.value }],
  }));

  return (
    <GestureDetector gesture={panGesture}>
      <View className="flex-row items-center">
        {/* Reply icon on the left */}
        <Animated.View
          className="absolute -left-10 justify-center"
          style={replyIconStyle}
        >
          <View
            className="w-8 h-8 rounded-2xl items-center justify-center"
            style={{ backgroundColor: colors.primary[500] }}
          >
            <Reply size={16} color={colors.white} />
          </View>
        </Animated.View>

        {/* Message content */}
        <Animated.View className="flex-1" style={messageStyle}>
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
});

SwipeToReplyWrapper.displayName = 'SwipeToReplyWrapper';

// =============================================================================
// DOUBLE TAP REACTION (WhatsApp-exact)
// =============================================================================

interface DoubleTapReactionProps {
  children: React.ReactNode;
  onDoubleTap: () => void;
  enabled?: boolean;
}

export const DoubleTapReaction = React.memo(({
  children,
  onDoubleTap,
  enabled = true,
}: DoubleTapReactionProps) => {
  const heartScale = useSharedValue(0);
  const heartOpacity = useSharedValue(0);

  const doubleTapGesture = Gesture.Tap()
    .enabled(enabled)
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd(() => {
      'worklet';
      // Animate heart
      heartScale.value = withSequence(
        withSpring(1.5, SPRING_CONFIGS.bouncy),
        withDelay(300, withSpring(0, SPRING_CONFIGS.quick))
      );
      heartOpacity.value = withSequence(
        withTiming(1, TIMING_CONFIGS.instant),
        withDelay(400, withTiming(0, TIMING_CONFIGS.normal))
      );

      runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
      runOnJS(onDoubleTap)();
    });

  const heartStyle = useAnimatedStyle(() => ({
    transform: [{ scale: heartScale.value }],
    opacity: heartOpacity.value,
  }));

  return (
    <GestureDetector gesture={doubleTapGesture}>
      <View>
        {children}
        <Animated.View
          className="absolute top-1/2 left-1/2 -ml-6 -mt-6"
          style={heartStyle}
          pointerEvents="none"
        >
          <Heart size={48} color={colors.error[500]} fill={colors.error[500]} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
});

DoubleTapReaction.displayName = 'DoubleTapReaction';

// =============================================================================
// DATE HEADER (WhatsApp-exact)
// =============================================================================

interface DateHeaderProps {
  date: string;
}

export const DateHeader = React.memo(({ date }: DateHeaderProps) => {
  const formatDate = (dateString: string): string => {
    const messageDate = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      // Format: "Monday, December 25, 2024" or shorter based on year
      const options: Intl.DateTimeFormatOptions = messageDate.getFullYear() === today.getFullYear()
        ? { weekday: 'long', month: 'long', day: 'numeric' }
        : { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' };
      return messageDate.toLocaleDateString('en-US', options);
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      className="items-center my-3"
    >
      <View className="bg-[rgba(225,225,225,0.9)] px-3 py-1.5 rounded-lg">
        <Text className="text-xs text-gray-600 font-medium">{formatDate(date)}</Text>
      </View>
    </Animated.View>
  );
});

DateHeader.displayName = 'DateHeader';

// =============================================================================
// UNREAD MESSAGES DIVIDER (WhatsApp-exact)
// =============================================================================

interface UnreadDividerProps {
  count: number;
}

export const UnreadDivider = React.memo(({ count }: UnreadDividerProps) => {
  return (
    <Animated.View
      entering={SlideInRight.duration(200)}
      className="flex-row items-center my-3 px-4"
    >
      <View className="flex-1 h-px" style={{ backgroundColor: communityColors.accent }} />
      <View className="px-3 py-1 rounded mx-2" style={{ backgroundColor: communityColors.accent }}>
        <Text className="text-[11px] text-white font-semibold tracking-wide">
          {count} UNREAD {count === 1 ? 'MESSAGE' : 'MESSAGES'}
        </Text>
      </View>
      <View className="flex-1 h-px" style={{ backgroundColor: communityColors.accent }} />
    </Animated.View>
  );
});

UnreadDivider.displayName = 'UnreadDivider';

// =============================================================================
// ATTACHMENT BUTTON (WhatsApp-exact)
// =============================================================================

interface AttachmentButtonProps {
  onPress: () => void;
}

export const AttachmentButton = React.memo(({ onPress }: AttachmentButtonProps) => {
  const scale = useSharedValue(1);
  const rotation = useSharedValue(0);

  const handlePressIn = useCallback(() => {
    'worklet';
    scale.value = withSpring(0.9, SPRING_CONFIGS.snappy);
    rotation.value = withSpring(45, SPRING_CONFIGS.quick);
  }, [scale, rotation]);

  const handlePressOut = useCallback(() => {
    'worklet';
    scale.value = withSpring(1, SPRING_CONFIGS.snappy);
    rotation.value = withSpring(0, SPRING_CONFIGS.quick);
  }, [scale, rotation]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      className="p-2"
      style={animatedStyle}
    >
      <Plus size={22} color={communityColors.text.secondary} />
    </AnimatedPressable>
  );
});

AttachmentButton.displayName = 'AttachmentButton';

// =============================================================================
// INPUT CONTAINER WITH ANIMATIONS
// =============================================================================

interface AnimatedInputContainerProps {
  isFocused: boolean;
  children: React.ReactNode;
}

export const AnimatedInputContainer = React.memo(({
  isFocused,
  children,
}: AnimatedInputContainerProps) => {
  const borderWidth = useSharedValue(1);

  useEffect(() => {
    borderWidth.value = withTiming(isFocused ? 1.5 : 1, TIMING_CONFIGS.fast);
  }, [isFocused, borderWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    borderColor: isFocused ? colors.primary[300] : colors.gray[200],
    borderWidth: borderWidth.value,
  }));

  return (
    <Animated.View
      className="flex-1 rounded-3xl px-4 py-2 bg-gray-100 min-h-[44px] max-h-[120px]"
      style={animatedStyle}
    >
      {children}
    </Animated.View>
  );
});

AnimatedInputContainer.displayName = 'AnimatedInputContainer';

// =============================================================================
// OPTIMISTIC MESSAGE WRAPPER
// =============================================================================

interface OptimisticMessageWrapperProps {
  isOptimistic: boolean;
  children: React.ReactNode;
}

export const OptimisticMessageWrapper = React.memo(({
  isOptimistic,
  children,
}: OptimisticMessageWrapperProps) => {
  if (!isOptimistic) return <>{children}</>;

  return (
    <Animated.View
      entering={FadeIn.duration(100).springify()}
      className="opacity-85"
    >
      {children}
    </Animated.View>
  );
});

OptimisticMessageWrapper.displayName = 'OptimisticMessageWrapper';

// =============================================================================
// TYPING INDICATOR BUBBLE (WhatsApp-exact)
// =============================================================================

interface TypingBubbleProps {
  names: string[];
}

export const TypingBubble = React.memo(({ names }: TypingBubbleProps) => {
  const getText = (): string => {
    if (names.length === 0) return '';
    if (names.length === 1) return `${names[0]} is typing...`;
    if (names.length === 2) return `${names[0]} and ${names[1]} are typing...`;
    return `${names[0]} and ${names.length - 1} others are typing...`;
  };

  return (
    <Animated.View
      entering={FadeIn.duration(150).springify()}
      exiting={FadeOut.duration(100)}
      className="flex-row items-center px-4 py-2"
    >
      <View className="flex-row bg-gray-100 px-3 py-2.5 rounded-[18px] mr-2">
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            className="w-2 h-2 rounded-full bg-gray-400 mx-0.5"
            style={{ opacity: 0.7 }}
          />
        ))}
      </View>
      <Text className="text-xs text-gray-500 italic">{getText()}</Text>
    </Animated.View>
  );
});

TypingBubble.displayName = 'TypingBubble';

// =============================================================================
// CUSTOM HOOKS
// =============================================================================

/**
 * Hook for scroll position tracking with high refresh rate support
 */
export function useScrollPosition() {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const scrollOffset = useRef(0);
  const lastUpdateTime = useRef(0);

  // Throttle state updates for performance on high refresh rate
  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const now = Date.now();
    // Throttle to max 60 updates per second
    if (now - lastUpdateTime.current < 16) return;
    lastUpdateTime.current = now;

    const { contentOffset } = event.nativeEvent;

    // For inverted list, check if scroll position is near 0
    const isNearBottom = contentOffset.y < 100;
    scrollOffset.current = contentOffset.y;

    setIsAtBottom(isNearBottom);

    if (isNearBottom) {
      setNewMessageCount(0);
    }
  }, []);

  const incrementNewMessages = useCallback(() => {
    if (!isAtBottom) {
      setNewMessageCount((prev) => prev + 1);
    }
  }, [isAtBottom]);

  const resetNewMessages = useCallback(() => {
    setNewMessageCount(0);
  }, []);

  return {
    isAtBottom,
    newMessageCount,
    handleScroll,
    incrementNewMessages,
    resetNewMessages,
  };
}

/**
 * Hook for message queue with offline support
 */
interface QueuedMessage {
  id: string;
  text: string;
  replyTo?: any;
  timestamp: number;
  retryCount: number;
}

export function useMessageQueue() {
  const [queue, setQueue] = useState<QueuedMessage[]>([]);
  const [isSending, setIsSending] = useState(false);

  const addToQueue = useCallback((message: Omit<QueuedMessage, 'id' | 'timestamp' | 'retryCount'>) => {
    const queuedMessage: QueuedMessage = {
      ...message,
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      retryCount: 0,
    };
    setQueue((prev) => [...prev, queuedMessage]);
    return queuedMessage.id;
  }, []);

  const removeFromQueue = useCallback((id: string) => {
    setQueue((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const retryMessage = useCallback((id: string) => {
    setQueue((prev) =>
      prev.map((m) =>
        m.id === id ? { ...m, retryCount: m.retryCount + 1 } : m
      )
    );
  }, []);

  return {
    queue,
    isSending,
    setIsSending,
    addToQueue,
    removeFromQueue,
    retryMessage,
  };
}

/**
 * Hook for grouping messages by date
 */
export function useMessageGrouping(messages: any[]) {
  return useMemo(() => {
    if (!messages || messages.length === 0) return [];

    const grouped: (any | { type: 'date_header'; date: string })[] = [];
    let lastDate: string | null = null;

    // Messages are in reverse order (newest first)
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];
      const messageDate = new Date(message.created_at).toDateString();

      if (messageDate !== lastDate) {
        grouped.unshift({ type: 'date_header', date: message.created_at });
        lastDate = messageDate;
      }

      grouped.unshift(message);
    }

    return grouped;
  }, [messages]);
}
