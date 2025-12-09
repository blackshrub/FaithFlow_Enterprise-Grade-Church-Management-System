/**
 * StepIndicator - Progress dots for multi-step flows
 *
 * Design:
 * - Horizontal dots showing current step
 * - Animated transitions between steps
 * - Completed, current, and pending states
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';

interface StepIndicatorProps {
  totalSteps: number;
  currentStep: number;
  labels?: string[];
  accentColor?: string;
}

export function StepIndicator({
  totalSteps,
  currentStep,
  labels,
  accentColor = '#3B82F6',
}: StepIndicatorProps) {
  return (
    <View style={styles.container}>
      {/* Dots */}
      <View style={styles.dotsContainer}>
        {Array.from({ length: totalSteps }).map((_, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <React.Fragment key={index}>
              <AnimatedDot
                isCompleted={isCompleted}
                isCurrent={isCurrent}
                accentColor={accentColor}
              />
              {index < totalSteps - 1 && (
                <View
                  style={[
                    styles.connector,
                    isCompleted && { backgroundColor: accentColor },
                  ]}
                />
              )}
            </React.Fragment>
          );
        })}
      </View>

      {/* Labels */}
      {labels && labels.length > 0 && (
        <View style={styles.labelsContainer}>
          {labels.map((label, index) => (
            <Text
              key={index}
              style={[
                styles.label,
                index === currentStep && { color: accentColor, fontWeight: '600' },
              ]}
              numberOfLines={1}
            >
              {label}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}

interface AnimatedDotProps {
  isCompleted: boolean;
  isCurrent: boolean;
  accentColor: string;
}

function AnimatedDot({ isCompleted, isCurrent, accentColor }: AnimatedDotProps) {
  const animatedStyle = useAnimatedStyle(() => {
    const scale = isCurrent ? 1.2 : 1;
    return {
      transform: [{ scale: withSpring(scale, { damping: 15 }) }],
      backgroundColor: isCompleted || isCurrent ? accentColor : '#E5E7EB',
    };
  });

  return (
    <Animated.View style={[styles.dot, animatedStyle]}>
      {isCompleted && (
        <View style={styles.checkmark}>
          <Text style={styles.checkmarkText}>✓</Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connector: {
    width: 32,
    height: 2,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 4,
  },
  checkmark: {
    position: 'absolute',
  },
  checkmarkText: {
    fontSize: 8,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
    paddingHorizontal: 8,
  },
  label: {
    flex: 1,
    fontSize: 11,
    color: '#9CA3AF',
    textAlign: 'center',
  },
});

export default StepIndicator;
