/**
 * EventsErrorState - Error State for Events
 *
 * Memoized error state component with retry functionality.
 * Styling: NativeWind-first with inline style for spacing constants
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable } from 'react-native';
import { XCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { MemoIcon } from '@/components/ui/MemoIcon';
import { spacing, radius } from '@/constants/spacing';

// =============================================================================
// TYPES
// =============================================================================

export interface EventsErrorStateProps {
  onRetry: () => void;
  t: (key: string) => string;
}

// =============================================================================
// COLORS (for icon colors only)
// =============================================================================

const Colors = {
  error: '#ef4444',
  gradientEnd: '#0f3460',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const EventsErrorState = memo(function EventsErrorState({
  onRetry,
  t,
}: EventsErrorStateProps) {
  const handleRetry = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRetry();
  }, [onRetry]);

  return (
    <View
      className="flex-1 items-center justify-center"
      style={{ paddingHorizontal: spacing.xxl }}
    >
      <MemoIcon icon={XCircle} size={48} color={Colors.error} />
      <Text
        className="text-xl font-bold text-neutral-800"
        style={{ marginTop: spacing.m, marginBottom: spacing.s }}
      >
        {t('events.loadError')}
      </Text>
      <Text
        className="text-[15px] text-neutral-500 text-center"
        style={{ marginBottom: spacing.l }}
      >
        {t('events.loadErrorDesc')}
      </Text>
      <Pressable
        onPress={handleRetry}
        style={{
          backgroundColor: Colors.gradientEnd,
          paddingHorizontal: spacing.l,
          paddingVertical: spacing.sm,
          borderRadius: radius.xl,
        }}
        accessible
        accessibilityRole="button"
        accessibilityLabel={t('common.retry')}
      >
        <Text className="text-[15px] font-semibold text-white">
          {t('common.retry')}
        </Text>
      </Pressable>
    </View>
  );
});

export default EventsErrorState;
