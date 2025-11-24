/**
 * Page Transition Wrapper
 *
 * Wraps tab screens with directional slide animation
 * Uses navigation store to determine slide direction
 */

import React from 'react';
import { MotiView } from 'moti';
import { useNavigationStore } from '@/stores/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export function PageTransition({ children }: PageTransitionProps) {
  const { slideDirection } = useNavigationStore();

  return (
    <MotiView
      key={slideDirection} // Force re-mount on direction change
      from={{ translateX: slideDirection }}
      animate={{ translateX: 0 }}
      transition={{ type: 'timing', duration: 300 }}
      style={{ flex: 1 }}
    >
      {children}
    </MotiView>
  );
}
