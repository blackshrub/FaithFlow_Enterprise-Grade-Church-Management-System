/**
 * Network Status Banner
 *
 * Displays an offline indicator when the device loses connectivity.
 * UX FIX: UX-C2 - Global network status indicator
 *
 * Features:
 * - Shows red banner when offline
 * - Auto-hides when back online
 * - Animated slide in/out
 * - Accessibility support
 */

import React, { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { WifiOff, Wifi } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useIsOffline } from '@/stores/networkStatus';

export function NetworkStatusBanner() {
  const isOffline = useIsOffline();
  const insets = useSafeAreaInsets();
  const [showReconnected, setShowReconnected] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Animation values
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  // Track offline state changes
  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
      translateY.value = withTiming(0, { duration: 300 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      if (wasOffline) {
        // Show "Back online" briefly
        setShowReconnected(true);
        setTimeout(() => {
          setShowReconnected(false);
          setWasOffline(false);
          translateY.value = withDelay(1000, withTiming(-100, { duration: 300 }));
          opacity.value = withDelay(1000, withTiming(0, { duration: 300 }));
        }, 2000);
      } else {
        translateY.value = withTiming(-100, { duration: 300 });
        opacity.value = withTiming(0, { duration: 300 });
      }
    }
  }, [isOffline, wasOffline, translateY, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  // Don't render if we've never been offline
  if (!wasOffline && !isOffline) {
    return null;
  }

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          paddingTop: insets.top,
        },
        animatedStyle,
      ]}
    >
      <View
        className={`flex-row items-center justify-center py-2 px-4 ${
          isOffline || !showReconnected ? 'bg-red-500' : 'bg-green-500'
        }`}
        accessible
        accessibilityRole="alert"
        accessibilityLabel={isOffline ? 'No internet connection' : 'Back online'}
      >
        {isOffline || !showReconnected ? (
          <>
            <WifiOff size={16} color="#FFFFFF" />
            <Text className="text-white text-sm font-medium ml-2">
              No Internet Connection
            </Text>
          </>
        ) : (
          <>
            <Wifi size={16} color="#FFFFFF" />
            <Text className="text-white text-sm font-medium ml-2">
              Back Online
            </Text>
          </>
        )}
      </View>
    </Animated.View>
  );
}
