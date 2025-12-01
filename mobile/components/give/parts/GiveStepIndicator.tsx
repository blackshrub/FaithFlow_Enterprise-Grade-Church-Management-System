/**
 * GiveStepIndicator - Step Progress Indicator
 *
 * Memoized step indicator showing progress through the giving flow.
 *
 * Styling: NativeWind-first with inline style for dynamic colors
 */

import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { Check } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { MemoIcon } from '@/components/ui/MemoIcon';
import { spacing } from '@/constants/spacing';
import type { GiveStep } from '@/stores/ui/giveUI';

// =============================================================================
// TYPES
// =============================================================================

export interface GiveStepIndicatorProps {
  step: GiveStep;
  t: (key: string) => string;
}

// =============================================================================
// COLORS
// =============================================================================

const Colors = {
  neutral: {
    200: '#e5e5e5',
    400: '#a3a3a3',
    500: '#737373',
    700: '#404040',
  },
  gradient: {
    end: '#0f3460',
  },
  success: '#10B981',
  white: '#ffffff',
};

// =============================================================================
// CONSTANTS
// =============================================================================

const STEPS: GiveStep[] = ['choose', 'amount', 'payment', 'review'];

// =============================================================================
// COMPONENT
// =============================================================================

export const GiveStepIndicator = memo(function GiveStepIndicator({
  step,
  t,
}: GiveStepIndicatorProps) {
  const currentIndex = useMemo(() => STEPS.indexOf(step), [step]);

  const stepLabels = useMemo(
    () => [
      t('give.stepType'),
      t('give.stepAmount'),
      t('give.stepPayment'),
      t('give.stepReview'),
    ],
    [t]
  );

  return (
    <View
      className="flex-row items-center justify-center bg-white border-b"
      style={{
        paddingVertical: spacing.m,
        paddingHorizontal: spacing.ml,
        borderBottomColor: Colors.neutral[200],
      }}
    >
      {STEPS.map((s, index) => (
        <React.Fragment key={s}>
          <View className="items-center">
            <View
              className="w-7 h-7 rounded-full items-center justify-center mb-1"
              style={{
                backgroundColor:
                  index < currentIndex
                    ? Colors.success
                    : index <= currentIndex
                      ? Colors.gradient.end
                      : Colors.neutral[200],
              }}
            >
              {index < currentIndex ? (
                <MemoIcon icon={Check} size={12} color={Colors.white} strokeWidth={3} />
              ) : (
                <Text
                  className="text-xs font-bold"
                  style={{
                    color: index <= currentIndex ? Colors.white : Colors.neutral[500],
                  }}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              className="text-[11px] font-medium"
              style={{
                color: index <= currentIndex ? Colors.neutral[700] : Colors.neutral[400],
              }}
            >
              {stepLabels[index]}
            </Text>
          </View>
          {index < STEPS.length - 1 && (
            <View
              className="w-10 h-0.5 mx-2 mb-[18px]"
              style={{
                backgroundColor: index < currentIndex ? Colors.success : Colors.neutral[200],
              }}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
});

export default GiveStepIndicator;
