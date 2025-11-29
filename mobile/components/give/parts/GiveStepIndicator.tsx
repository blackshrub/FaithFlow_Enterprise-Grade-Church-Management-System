/**
 * GiveStepIndicator - Step Progress Indicator
 *
 * Memoized step indicator showing progress through the giving flow.
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Check } from 'lucide-react-native';

import { MemoIcon } from '@/components/ui/MemoIcon';
import { spacing, radius } from '@/constants/spacing';
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
    <View style={styles.container}>
      {STEPS.map((s, index) => (
        <React.Fragment key={s}>
          <View style={styles.stepItem}>
            <View
              style={[
                styles.stepDot,
                index <= currentIndex && styles.stepDotActive,
                index < currentIndex && styles.stepDotComplete,
              ]}
            >
              {index < currentIndex ? (
                <MemoIcon icon={Check} size={12} color={Colors.white} strokeWidth={3} />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    index <= currentIndex && styles.stepNumberActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                index <= currentIndex && styles.stepLabelActive,
              ]}
            >
              {stepLabels[index]}
            </Text>
          </View>
          {index < STEPS.length - 1 && (
            <View
              style={[
                styles.stepLine,
                index < currentIndex && styles.stepLineActive,
              ]}
            />
          )}
        </React.Fragment>
      ))}
    </View>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.ml,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: Colors.gradient.end,
  },
  stepDotComplete: {
    backgroundColor: Colors.success,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.neutral[500],
  },
  stepNumberActive: {
    color: Colors.white,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.neutral[400],
  },
  stepLabelActive: {
    color: Colors.neutral[700],
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.neutral[200],
    marginHorizontal: 8,
    marginBottom: 18,
  },
  stepLineActive: {
    backgroundColor: Colors.success,
  },
});

export default GiveStepIndicator;
