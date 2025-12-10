/**
 * Contextual Chat Button
 *
 * A floating action button (FAB) or inline button that opens the Faith Assistant
 * with context from the current content (devotion, bible study, journey, etc.)
 *
 * Usage:
 * <ContextualChatButton
 *   context="devotion_reflection"
 *   contextData={{ devotionId: 'xxx', devotionTitle: 'Finding Peace' }}
 *   position="bottom-right"  // or "inline"
 * />
 *
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React, { memo } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withRepeat,
  withSequence,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { MessageCircle, Sparkles, ChevronRight } from 'lucide-react-native';

import {
  useCompanionStore,
  type CompanionContext,
  type CompanionContextData,
} from '@/stores/companionStore';
import { Text } from '@/components/ui/text';
import { colors } from '@/constants/theme';

// Premium colors (from centralized theme)
const Colors = {
  gradient: {
    primary: colors.premium.ai.gradient,
    warm: colors.premium.ai.gradientWarm,
  },
  white: colors.white,
  shadow: colors.premium.ai.shadow,
};

interface ContextualChatButtonProps {
  /**
   * The context type for the conversation
   */
  context: CompanionContext;
  /**
   * Context data to pass to the companion
   */
  contextData: CompanionContextData;
  /**
   * Button variant
   * - "fab": Floating action button (fixed position)
   * - "inline": Inline button within content flow
   * - "minimal": Small icon-only button
   */
  variant?: 'fab' | 'inline' | 'minimal';
  /**
   * Position for FAB variant
   */
  position?: 'bottom-right' | 'bottom-center';
  /**
   * Custom label (default: "Ask about this")
   */
  label?: string;
  /**
   * Whether to show the sparkle animation
   */
  animated?: boolean;
  /**
   * Custom bottom offset for FAB (to avoid overlapping with other buttons)
   */
  bottomOffset?: number;
}

function ContextualChatButtonComponent({
  context,
  contextData,
  variant = 'fab',
  position = 'bottom-right',
  label,
  animated = true,
  bottomOffset = 100,
}: ContextualChatButtonProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const setEntryContext = useCompanionStore((s) => s.setEntryContext);
  const clearChat = useCompanionStore((s) => s.clearChat);

  // Pulse animation for FAB
  const pulse = useSharedValue(0);

  React.useEffect(() => {
    if (animated && variant === 'fab') {
      pulse.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 1500 }),
          withTiming(0, { duration: 1500 })
        ),
        -1,
        false
      );
    }
  }, [animated, variant]);

  const pulseStyle = useAnimatedStyle(() => {
    const scale = interpolate(pulse.value, [0, 1], [1, 1.05]);
    return {
      transform: [{ scale }],
    };
  });

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Clear previous chat and set new context
    clearChat();
    setEntryContext(context, contextData);

    // Navigate to companion
    router.push('/companion');
  };

  const defaultLabel = t('companion.askAbout', 'Ask about this');
  const buttonLabel = label || defaultLabel;

  // Minimal variant - small icon button
  if (variant === 'minimal') {
    return (
      <Pressable
        onPress={handlePress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        className="w-10 h-10 rounded-full items-center justify-center active:scale-95"
        style={[styles.minimalButton, styles.shadow]}
      >
        <LinearGradient
          colors={[...Colors.gradient.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          className="rounded-full"
        />
        <MessageCircle size={18} color={Colors.white} strokeWidth={2} />
      </Pressable>
    );
  }

  // Inline variant - button within content flow
  if (variant === 'inline') {
    return (
      <Pressable
        onPress={handlePress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        className="rounded-2xl overflow-hidden active:opacity-90 active:scale-[0.98]"
      >
        <LinearGradient
          colors={[...Colors.gradient.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          className="flex-row items-center justify-center gap-2 px-5 py-3.5"
        >
          <View className="w-8 h-8 rounded-full bg-white/25 items-center justify-center">
            <MessageCircle size={16} color={Colors.white} strokeWidth={2} />
          </View>
          <View className="flex-1">
            <Text className="text-[15px] font-semibold text-white">
              {buttonLabel}
            </Text>
            <Text className="text-[12px] text-white/80">
              {t('companion.chatWithAssistant', 'Chat with Faith Assistant')}
            </Text>
          </View>
          <Sparkles size={16} color={Colors.white} strokeWidth={2} />
        </LinearGradient>
      </Pressable>
    );
  }

  // FAB variant - floating action button
  return (
    <Animated.View
      style={[
        styles.fabContainer,
        position === 'bottom-center' ? styles.fabCenter : styles.fabRight,
        { bottom: bottomOffset },
        animated && pulseStyle,
      ]}
    >
      <Pressable
        onPress={handlePress}
        accessible
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        className="rounded-full overflow-hidden active:scale-95"
        style={styles.fabShadow}
      >
        <LinearGradient
          colors={[...Colors.gradient.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          className="flex-row items-center gap-2 px-4 py-3"
        >
          <View className="w-9 h-9 rounded-full bg-white/25 items-center justify-center">
            <MessageCircle size={18} color={Colors.white} strokeWidth={2} />
          </View>
          <Text className="text-[14px] font-semibold text-white pr-1">
            {buttonLabel}
          </Text>
          <ChevronRight size={16} color={Colors.white} strokeWidth={2.5} />
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fabContainer: {
    position: 'absolute',
    zIndex: 100,
  },
  fabRight: {
    right: 16,
  },
  fabCenter: {
    alignSelf: 'center',
    left: '50%',
    transform: [{ translateX: -75 }], // Approximate half width
  },
  fabShadow: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  minimalButton: {
    overflow: 'hidden',
  },
  shadow: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
});

export const ContextualChatButton = memo(ContextualChatButtonComponent);
export default ContextualChatButton;
