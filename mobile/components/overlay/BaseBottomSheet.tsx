// components/overlay/BaseBottomSheet.tsx
/**
 * BaseBottomSheet - Minimal wrapper for bottom sheet content
 *
 * This is a simple container that:
 * - Renders children directly without extra chrome
 * - Does NOT intercept scroll gestures (content handles its own scrolling)
 *
 * Content components (CalendarSheet, CategoryFilterSheet, etc.) are responsible
 * for their own styling (handle, close button, padding, etc.)
 *
 * Swipe-to-dismiss is handled by the drag handle in each sheet component,
 * NOT by this wrapper - this allows ScrollViews inside to work properly.
 */
import React from 'react';
import { StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const BaseBottomSheet = ({ visible, children }: Props) => {
  if (!visible) return null;

  // Simply render children - no gesture handling here
  // Gesture handling should be done by individual sheet components
  // on their drag handle only, not on the entire sheet
  return (
    <Animated.View style={styles.sheet}>
      {children}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  sheet: {
    width: '100%',
    flexShrink: 0,
  },
});

export default BaseBottomSheet;
