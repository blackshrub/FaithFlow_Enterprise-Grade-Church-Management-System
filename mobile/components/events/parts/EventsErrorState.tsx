/**
 * EventsErrorState - Error State for Events
 *
 * Memoized error state component with retry functionality.
 */

import React, { memo, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
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
// COLORS
// =============================================================================

const Colors = {
  neutral: {
    500: '#737373',
    800: '#262626',
  },
  gradient: {
    end: '#0f3460',
  },
  error: '#ef4444',
  white: '#ffffff',
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
    <View style={styles.container}>
      <MemoIcon icon={XCircle} size={48} color={Colors.error} />
      <Text style={styles.title}>{t('events.loadError')}</Text>
      <Text style={styles.desc}>{t('events.loadErrorDesc')}</Text>
      <Pressable onPress={handleRetry} style={styles.button}>
        <Text style={styles.buttonText}>{t('common.retry')}</Text>
      </Pressable>
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[800],
    marginTop: spacing.m,
    marginBottom: spacing.s,
  },
  desc: {
    fontSize: 15,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginBottom: spacing.l,
  },
  button: {
    backgroundColor: Colors.gradient.end,
    paddingHorizontal: spacing.l,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
});

export default EventsErrorState;
