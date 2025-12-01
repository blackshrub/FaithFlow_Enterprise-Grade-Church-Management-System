// components/overlay/UnifiedOverlayHost.tsx
/**
 * Unified Overlay Host
 *
 * Central host for all overlays (modals and bottom sheets).
 * Uses the overlay store to manage visibility and content.
 *
 * Styling: NativeWind-first with inline style for z-index
 */
import React from 'react';
import { Pressable, View } from 'react-native';
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
    <View className="absolute inset-0 justify-end" style={{ zIndex: 9999 }}>
      {/* Backdrop with its own fade animation */}
      <Animated.View
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(150)}
        className="absolute inset-0"
      >
        <Pressable
          className="absolute inset-0"
          style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
          onPress={close}
        />
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
          className="w-full"
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

export default UnifiedOverlayHost;
