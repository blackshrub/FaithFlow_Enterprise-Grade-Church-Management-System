/**
 * PaymentMethodCard - Memoized Payment Method Selection Card
 *
 * Used in the payment step for method selection.
 *
 * Styling: NativeWind-first with inline style for dynamic colors
 */

import React, { memo, useCallback } from 'react';
import { View } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { MemoIcon } from '@/components/ui/MemoIcon';
import { PremiumCard3 } from '@/components/ui/premium-card';
import type { PaymentMethodType } from '@/stores/ui/giveUI';

// =============================================================================
// TYPES
// =============================================================================

export interface PaymentMethodCardProps {
  method: PaymentMethodType;
  icon: LucideIcon;
  name: string;
  description: string;
  isSelected: boolean;
  onSelect: (method: PaymentMethodType) => void;
}

// =============================================================================
// COLORS
// =============================================================================

const Colors = {
  neutral: {
    100: '#f5f5f5',
    500: '#737373',
    900: '#171717',
  },
  gradient: {
    end: '#0f3460',
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

export const PaymentMethodCard = memo(function PaymentMethodCard({
  method,
  icon,
  name,
  description,
  isSelected,
  onSelect,
}: PaymentMethodCardProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSelect(method);
  }, [method, onSelect]);

  return (
    <PremiumCard3 selected={isSelected} onPress={handlePress}>
      <View className="flex-row items-center gap-3.5">
        <View
          className="w-[46px] h-[46px] rounded-xl items-center justify-center"
          style={{ backgroundColor: Colors.neutral[100] }}
        >
          <MemoIcon icon={icon} size={24} color={Colors.gradient.end} />
        </View>
        <View className="flex-1">
          <Text
            className="text-base font-bold"
            style={{ color: Colors.neutral[900] }}
          >
            {name}
          </Text>
          <Text
            className="text-[13px] mt-0.5"
            style={{ color: Colors.neutral[500] }}
          >
            {description}
          </Text>
        </View>
      </View>
    </PremiumCard3>
  );
});

export default PaymentMethodCard;
