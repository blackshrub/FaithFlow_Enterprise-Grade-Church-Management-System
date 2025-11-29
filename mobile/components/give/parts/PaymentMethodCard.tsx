/**
 * PaymentMethodCard - Memoized Payment Method Selection Card
 *
 * Used in the payment step for method selection.
 */

import React, { memo, useCallback } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import type { LucideIcon } from 'lucide-react-native';

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
      <View style={styles.content}>
        <View style={styles.iconWrap}>
          <MemoIcon icon={icon} size={24} color={Colors.gradient.end} />
        </View>
        <View style={styles.textWrap}>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
      </View>
    </PremiumCard3>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  textWrap: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  description: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
});

export default PaymentMethodCard;
