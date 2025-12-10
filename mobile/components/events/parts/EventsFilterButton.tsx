/**
 * EventsFilterButton - Category Filter Button
 *
 * Memoized filter button for category selection.
 * Styling: NativeWind-first with inline style for shadows/dynamic values
 */

import React, { memo, useCallback } from 'react';
import { Pressable, Text, View } from 'react-native';
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
// COLORS (for icon colors only)
// =============================================================================

const Colors = {
  neutral400: '#a3a3a3',
  gradientEnd: '#0f3460',
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
    <Pressable
      onPress={handlePress}
      className="flex-row items-center bg-white"
      style={{
        borderRadius: radius.card,
        padding: spacing.sm,
        marginBottom: spacing.ml,
        gap: spacing.s,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
      }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={
        selectedCategory && categoryName
          ? `${t('events.filter')}: ${categoryName}`
          : t('events.filterByCategory')
      }
    >
      <MemoIcon icon={Filter} size={18} color={Colors.gradientEnd} />
      <Text className="flex-1 text-[15px] font-semibold text-neutral-800">
        {selectedCategory && categoryName ? categoryName : t('events.allCategories')}
      </Text>
      <MemoIcon icon={ChevronRight} size={18} color={Colors.neutral400} />
    </Pressable>
  );
});

export default EventsFilterButton;
