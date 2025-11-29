/**
 * Page Transition Wrapper
 *
 * Wraps tab screens with directional slide animation
 * Uses navigation store to determine slide direction
 */

import React from 'react';
import Animated, { SlideInLeft, SlideInRight } from 'react-native-reanimated';
import { useNavigationStore } from '@/stores/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const { slideDirection } = useNavigationStore();

  // Choose animation based on direction
  const enteringAnimation = slideDirection > 0
    ? SlideInRight.duration(200)
    : SlideInLeft.duration(200);

  return (
    <Animated.View
      key={slideDirection}
      entering={enteringAnimation}
      style={{ flex: 1 }}
    >
      {children}
    </Animated.View>
  );
}
