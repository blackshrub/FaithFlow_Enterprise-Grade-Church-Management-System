// components/overlay/SharedAxisModal.tsx
/**
 * SharedAxisModal - Wrapper with Material 3 shared axis Y animation
 *
 * Styling: NativeWind-first with inline style for z-index
 */
import React from 'react';
import { View } from 'react-native';
import Animated, {
  SlideInUp,
  SlideOutUp,
} from 'react-native-reanimated';

interface Props {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export const SharedAxisModal = ({ visible, children }: Props) => {
  if (!visible) return null;

  return (
    <View
      className="absolute inset-0 justify-center items-center"
      style={{ zIndex: 99999 }}
    >
      <Animated.View
        entering={SlideInUp.duration(200)}
        exiting={SlideOutUp.duration(180)}
      >
        {/* No container styling - let the child component handle its own styling */}
        {children}
      </Animated.View>
    </View>
  );
};

export default SharedAxisModal;
