// components/overlay/UnifiedOverlayHost.tsx
import React from 'react';
import { StyleSheet, Pressable, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInDown,
  SlideOutDown,
} from 'react-native-reanimated';
import { useOverlayStore } from '@/stores/overlayStore';
import { BaseBottomSheet } from './BaseBottomSheet';
import { SharedAxisModal } from './SharedAxisModal';

export const UnifiedOverlayHost = () => {
  const { type, config, close } = useOverlayStore();
  const Component = config.component;

  if (!type || !Component) return null;

  return (
    <View style={styles.container}>
      {/* Backdrop with its own fade animation */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        style={StyleSheet.absoluteFill}
      >
        <Pressable style={styles.backdrop} onPress={close} />
      </Animated.View>

      {type === 'center-modal' && (
        <SharedAxisModal
          visible
          onClose={close}
          {...config.props}
        >
          <Component payload={config.props} onClose={close} />
        </SharedAxisModal>
      )}

      {type === 'bottom-sheet' && (
        <Animated.View
          entering={SlideInDown.duration(250)}
          exiting={SlideOutDown.duration(200)}
          style={styles.bottomSheetWrapper}
        >
          <BaseBottomSheet
            visible
            onClose={close}
            {...config.props}
          >
            <Component payload={config.props} onClose={close} />
          </BaseBottomSheet>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  bottomSheetWrapper: {
    width: '100%',
  },
});

export default UnifiedOverlayHost;
