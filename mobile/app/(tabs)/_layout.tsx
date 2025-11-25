/**
 * Tabs Layout with Instant Directional Transitions
 *
 * Features:
 * - Zero-latency tab switching
 * - Directional slide animations (left/right based on tab order)
 * - Optimized screen mounting (detachInactiveScreens: false for instant switching)
 * - Custom animated tab bar at bottom
 *
 * Screens:
 * - index.tsx (Home)
 * - bible.tsx
 * - explore.tsx
 * - events.tsx
 * - profile.tsx
 *
 * IMPORTANT: BottomSheetModalProvider is in app/_layout.tsx (root level)
 */

import { View } from 'react-native';
import { Stack, useSegments } from 'expo-router';
import { AnimatedTabBar } from '@/components/navigation/AnimatedTabBar';
import { useNavigationStore } from '@/stores/navigation';
import { TransitionPresets } from '@react-navigation/stack';

export default function TabsLayout() {
  const segments = useSegments();
  const slideDirection = useNavigationStore((state) => state.slideDirection);

  // Determine slide direction
  const isForward = slideDirection > 0;

  return (
    <View className="flex-1 bg-gray-50">
      {/* Content area with Stack for smooth transitions */}
      <View className="flex-1">
        <Stack
          screenOptions={{
            headerShown: false,
            // Instant transitions with directional slide
            animation: 'slide_from_right',
            gestureEnabled: true,
            gestureDirection: isForward ? 'horizontal' : 'horizontal-inverted',
            // Critical: Keep screens mounted for instant switching
            detachPreviousScreen: false,
            // Fast, native-feeling transition
            transitionSpec: {
              open: {
                animation: 'timing',
                config: {
                  duration: 200, // Fast transition
                  useNativeDriver: true,
                },
              },
              close: {
                animation: 'timing',
                config: {
                  duration: 200,
                  useNativeDriver: true,
                },
              },
            },
            cardStyleInterpolator: ({ current, layouts }) => {
              // Dynamic direction based on navigation
              const translateX = current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [isForward ? layouts.screen.width : -layouts.screen.width, 0],
              });

              return {
                cardStyle: {
                  transform: [{ translateX }],
                },
              };
            },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="bible" />
          <Stack.Screen name="explore" />
          <Stack.Screen name="events" />
          <Stack.Screen name="profile" />
        </Stack>
      </View>

      {/* Custom animated tab bar */}
      <AnimatedTabBar />
    </View>
  );
}
