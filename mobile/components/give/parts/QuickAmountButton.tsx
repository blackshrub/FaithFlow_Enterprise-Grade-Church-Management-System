/**
 * QuickAmountButton - Memoized Quick Amount Selection Button
 *
 * Used in the amount step for quick amount selection.
 * Styling: NativeWind-first with inline style for dynamic values
 */

import React, { memo, useCallback } from 'react';
import { Text } from 'react-native';
import * as Haptics from 'expo-haptics';

import { PremiumCard3 } from '@/components/ui/premium-card';

// =============================================================================
// TYPES
// =============================================================================

export interface QuickAmountButtonProps {
  amount: number;
  label: string;
  isSelected: boolean;
  onSelect: (amount: number) => void;
}

// =============================================================================
// COLORS (for dynamic text color)
// =============================================================================

const Colors = {
  neutral700: '#404040',
  gradientEnd: '#0f3460',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const QuickAmountButton = memo(function QuickAmountButton({
  amount,
  label,
  isSelected,
  onSelect,
}: QuickAmountButtonProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(amount);
  }, [amount, onSelect]);

  return (
    <PremiumCard3
      selected={isSelected}
      onPress={handlePress}
      innerStyle={{ paddingVertical: 14, paddingHorizontal: 8 }}
    >
      <Text
        className="text-sm font-bold text-center"
        style={{ color: isSelected ? Colors.gradientEnd : Colors.neutral700 }}
      >
        {label}
      </Text>
    </PremiumCard3>
  );
});

export default QuickAmountButton;
