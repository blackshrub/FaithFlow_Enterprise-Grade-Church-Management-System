/**
 * TypingIndicator Component
 *
 * WhatsApp-style typing indicators with MQTT real-time support.
 * Features:
 * - Animated typing dots
 * - Shows who is typing
 * - Auto-dismiss after inactivity
 * - MQTT pub/sub integration
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  interpolate,
  FadeInUp,
  FadeOutDown,
  ZoomIn,
  ZoomOut,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { colors, spacing, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface TypingUser {
  id: string;
  name: string;
  avatar_url?: string;
}

interface TypingIndicatorProps {
  typingUsers: TypingUser[];
  maxDisplay?: number;
}

interface TypingDotsProps {
  color?: string;
  size?: 'sm' | 'md';
}

interface UseTypingIndicatorOptions {
  communityId: string;
  currentUserId: string;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

interface TypingState {
  [userId: string]: {
    user: TypingUser;
    timestamp: number;
  };
}

// =============================================================================
// CONSTANTS
// =============================================================================

const TYPING_TIMEOUT = 5000; // 5 seconds of inactivity = stopped typing
const TYPING_DEBOUNCE = 1000; // Debounce typing notifications

// =============================================================================
// ANIMATED TYPING DOTS
// =============================================================================

export function TypingDots({ color = colors.gray[500], size = 'md' }: TypingDotsProps) {
  const dotSize = size === 'sm' ? 6 : 8;
  const dotSpacing = size === 'sm' ? 3 : 4;

  // Animated values for each dot
  const dot1 = useSharedValue(0);
  const dot2 = useSharedValue(0);
  const dot3 = useSharedValue(0);

  useEffect(() => {
    // Start the animation
    dot1.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 300 }),
        withTiming(0, { duration: 300 })
      ),
      -1,
      false
    );

    dot2.value = withDelay(
      150,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );

    dot3.value = withDelay(
      300,
      withRepeat(
        withSequence(
          withTiming(1, { duration: 300 }),
          withTiming(0, { duration: 300 })
        ),
        -1,
        false
      )
    );
  }, []);

  const animatedStyle1 = useAnimatedStyle(() => ({
    opacity: interpolate(dot1.value, [0, 1], [0.4, 1]),
    transform: [{ translateY: interpolate(dot1.value, [0, 1], [0, -4]) }],
  }));

  const animatedStyle2 = useAnimatedStyle(() => ({
    opacity: interpolate(dot2.value, [0, 1], [0.4, 1]),
    transform: [{ translateY: interpolate(dot2.value, [0, 1], [0, -4]) }],
  }));

  const animatedStyle3 = useAnimatedStyle(() => ({
    opacity: interpolate(dot3.value, [0, 1], [0.4, 1]),
    transform: [{ translateY: interpolate(dot3.value, [0, 1], [0, -4]) }],
  }));

  return (
    <HStack space="xs" style={styles.dotsContainer}>
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: color },
          animatedStyle1,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: color, marginLeft: dotSpacing },
          animatedStyle2,
        ]}
      />
      <Animated.View
        style={[
          styles.dot,
          { width: dotSize, height: dotSize, backgroundColor: color, marginLeft: dotSpacing },
          animatedStyle3,
        ]}
      />
    </HStack>
  );
}

// =============================================================================
// TYPING INDICATOR (Main Component)
// =============================================================================

export function TypingIndicator({
  typingUsers,
  maxDisplay = 3,
}: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null;

  const displayUsers = typingUsers.slice(0, maxDisplay);
  const remainingCount = typingUsers.length - maxDisplay;

  const getTypingText = useCallback(() => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name} is typing`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name} and ${typingUsers[1].name} are typing`;
    } else if (typingUsers.length <= maxDisplay) {
      const names = displayUsers.map((u) => u.name);
      const last = names.pop();
      return `${names.join(', ')} and ${last} are typing`;
    } else {
      const names = displayUsers.map((u) => u.name);
      return `${names.join(', ')} and ${remainingCount} others are typing`;
    }
  }, [typingUsers, displayUsers, remainingCount, maxDisplay]);

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOutDown.duration(200)}
    >
      <View style={styles.indicatorContainer}>
        <HStack space="sm" style={{ alignItems: 'center' }}>
          <View style={styles.typingBubble}>
            <TypingDots color={colors.gray[600]} size="sm" />
          </View>
          <Text style={styles.typingText}>{getTypingText()}</Text>
        </HStack>
      </View>
    </Animated.View>
  );
}

// =============================================================================
// TYPING INDICATOR BUBBLE (Inline in chat)
// =============================================================================

export function TypingBubble({ typingUsers }: { typingUsers: TypingUser[] }) {
  if (typingUsers.length === 0) return null;

  const firstName = typingUsers[0].name.split(' ')[0];

  return (
    <Animated.View
      entering={ZoomIn.springify().damping(15)}
      exiting={ZoomOut.springify().damping(15)}
      style={styles.bubbleWrapper}
    >
      <View style={styles.bubble}>
        <HStack space="sm" style={{ alignItems: 'center' }}>
          <TypingDots color={colors.gray[600]} size="md" />
        </HStack>
      </View>
      {typingUsers.length === 1 ? (
        <Text style={styles.bubbleLabel}>{firstName}</Text>
      ) : (
        <Text style={styles.bubbleLabel}>
          {firstName} +{typingUsers.length - 1}
        </Text>
      )}
    </Animated.View>
  );
}

// =============================================================================
// USE TYPING INDICATOR HOOK (MQTT Integration)
// =============================================================================

export function useTypingIndicator({
  communityId,
  currentUserId,
  onTypingStart,
  onTypingStop,
}: UseTypingIndicatorOptions) {
  const [typingState, setTypingState] = useState<TypingState>({});
  const lastTypingTime = useRef<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cleanupIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Get list of currently typing users
  const typingUsers = useMemo(() => {
    const now = Date.now();
    return Object.values(typingState)
      .filter((entry) => now - entry.timestamp < TYPING_TIMEOUT)
      .map((entry) => entry.user);
  }, [typingState]);

  // Handle incoming typing event (from MQTT)
  const handleTypingEvent = useCallback(
    (userId: string, user: TypingUser, isTyping: boolean) => {
      if (userId === currentUserId) return; // Ignore own typing events

      setTypingState((prev) => {
        if (isTyping) {
          return {
            ...prev,
            [userId]: { user, timestamp: Date.now() },
          };
        } else {
          const { [userId]: removed, ...rest } = prev;
          return rest;
        }
      });
    },
    [currentUserId]
  );

  // Send typing notification (debounced)
  const sendTypingNotification = useCallback(
    (isTyping: boolean) => {
      const now = Date.now();

      // Debounce typing start events
      if (isTyping && now - lastTypingTime.current < TYPING_DEBOUNCE) {
        return;
      }

      lastTypingTime.current = now;

      // TODO: Publish to MQTT
      // mqttClient.publish(`community/${communityId}/typing`, {
      //   user_id: currentUserId,
      //   is_typing: isTyping,
      // });

      if (isTyping) {
        onTypingStart?.();
      } else {
        onTypingStop?.();
      }
    },
    [communityId, currentUserId, onTypingStart, onTypingStop]
  );

  // Start typing indicator
  const startTyping = useCallback(() => {
    sendTypingNotification(true);

    // Auto-stop typing after timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      sendTypingNotification(false);
    }, TYPING_TIMEOUT);
  }, [sendTypingNotification]);

  // Stop typing indicator
  const stopTyping = useCallback(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }

    sendTypingNotification(false);
  }, [sendTypingNotification]);

  // Cleanup stale typing states
  useEffect(() => {
    cleanupIntervalRef.current = setInterval(() => {
      const now = Date.now();
      setTypingState((prev) => {
        const cleaned: TypingState = {};
        Object.entries(prev).forEach(([userId, entry]) => {
          if (now - entry.timestamp < TYPING_TIMEOUT) {
            cleaned[userId] = entry;
          }
        });
        return cleaned;
      });
    }, 1000);

    return () => {
      if (cleanupIntervalRef.current) {
        clearInterval(cleanupIntervalRef.current);
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, []);

  return {
    typingUsers,
    startTyping,
    stopTyping,
    handleTypingEvent,
  };
}

// =============================================================================
// COMPACT TYPING STATUS (For chat header)
// =============================================================================

export function TypingStatus({ typingUsers }: { typingUsers: TypingUser[] }) {
  if (typingUsers.length === 0) return null;

  const getText = () => {
    if (typingUsers.length === 1) {
      return `${typingUsers[0].name.split(' ')[0]} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].name.split(' ')[0]} and ${typingUsers[1].name.split(' ')[0]} are typing...`;
    } else {
      return `${typingUsers.length} people are typing...`;
    }
  };

  return (
    <Animated.View
      entering={FadeIn.duration(150)}
      exiting={FadeOut.duration(150)}
    >
      <HStack space="xs" style={{ alignItems: 'center' }}>
        <TypingDots color={colors.primary[500]} size="sm" />
        <Text style={styles.headerTypingText}>{getText()}</Text>
      </HStack>
    </Animated.View>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  dotsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 20,
  },
  dot: {
    borderRadius: 999,
  },
  indicatorContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typingBubble: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
  },
  typingText: {
    fontSize: 13,
    color: colors.gray[600],
    fontStyle: 'italic',
  },
  bubbleWrapper: {
    alignItems: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  bubble: {
    backgroundColor: colors.gray[100],
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.xl,
    borderBottomLeftRadius: 4,
  },
  bubbleLabel: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 2,
    marginLeft: spacing.xs,
  },
  headerTypingText: {
    fontSize: 12,
    color: colors.primary[500],
    fontStyle: 'italic',
  },
});

export default TypingIndicator;
