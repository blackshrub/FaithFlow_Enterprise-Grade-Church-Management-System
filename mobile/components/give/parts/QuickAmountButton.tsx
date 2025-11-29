/**
 * QuickAmountButton - Memoized Quick Amount Selection Button
 *
 * Used in the amount step for quick amount selection.
 */

import React, { memo, useCallback } from 'react';
import { Text, StyleSheet } from 'react-native';
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
// COLORS
// =============================================================================

const Colors = {
  neutral: {
    700: '#404040',
  },
  gradient: {
    end: '#0f3460',
  },
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
      innerStyle={styles.innerStyle}
    >
      <Text style={[styles.text, isSelected && styles.textSelected]}>
        {label}
      </Text>
    </PremiumCard3>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  innerStyle: {
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.neutral[700],
    textAlign: 'center',
  },
  textSelected: {
    color: Colors.gradient.end,
  },
});

export default QuickAmountButton;
