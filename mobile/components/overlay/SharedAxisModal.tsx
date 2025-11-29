// components/overlay/SharedAxisModal.tsx
import React from 'react';
import { View, StyleSheet } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
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
    <View style={styles.center}>
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

const styles = StyleSheet.create({
  center: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 99999,
  },
});

export default SharedAxisModal;
