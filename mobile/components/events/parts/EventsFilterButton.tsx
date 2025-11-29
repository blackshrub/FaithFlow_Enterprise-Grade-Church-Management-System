/**
 * EventsFilterButton - Category Filter Button
 *
 * Memoized filter button for category selection.
 */

import React, { memo, useCallback } from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { Filter, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { MemoIcon } from '@/components/ui/MemoIcon';
import { spacing, radius } from '@/constants/spacing';

// =============================================================================
// TYPES
// =============================================================================

export interface EventsFilterButtonProps {
  selectedCategory: string | null;
  categoryName: string | null;
  onPress: () => void;
  t: (key: string) => string;
}

// =============================================================================
// COLORS
// =============================================================================

const Colors = {
  neutral: {
    400: '#a3a3a3',
    800: '#262626',
  },
  gradient: {
    end: '#0f3460',
  },
  white: '#ffffff',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const EventsFilterButton = memo(function EventsFilterButton({
  selectedCategory,
  categoryName,
  onPress,
  t,
}: EventsFilterButtonProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable onPress={handlePress} style={styles.container}>
      <MemoIcon icon={Filter} size={18} color={Colors.gradient.end} />
      <Text style={styles.text}>
        {selectedCategory && categoryName ? categoryName : t('events.allCategories')}
      </Text>
      <MemoIcon icon={ChevronRight} size={18} color={Colors.neutral[400]} />
    </Pressable>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: radius.card,
    padding: spacing.sm,
    marginBottom: spacing.ml,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: spacing.s,
  },
  text: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
});

export default EventsFilterButton;
