/**
 * NotificationBell Component
 *
 * Bell icon button with unread badge that navigates to notification center.
 * Polls for unread count and displays badge when > 0.
 */

import React, { useCallback } from 'react';
import { Pressable, View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { Bell } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  useSharedValue,
} from 'react-native-reanimated';

import { useUnreadNotificationCount } from '@/hooks/useNotifications';

interface NotificationBellProps {
  size?: number;
  color?: string;
  backgroundColor?: string;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function NotificationBell({
  size = 44,
  color = '#C9A962',
  backgroundColor = 'rgba(255,255,255,0.08)',
}: NotificationBellProps) {
  const router = useRouter();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  // Animation for bell shake when new notification
  const bellRotation = useSharedValue(0);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Shake animation
    bellRotation.value = withSequence(
      withTiming(-15, { duration: 50 }),
      withTiming(15, { duration: 100 }),
      withTiming(-10, { duration: 100 }),
      withTiming(10, { duration: 100 }),
      withTiming(0, { duration: 50 })
    );

    router.push('/notifications');
  }, [router, bellRotation]);

  const bellAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${bellRotation.value}deg` }],
  }));

  return (
    <AnimatedPressable
      onPress={handlePress}
      className="rounded-full items-center justify-center"
      style={[
        {
          width: size,
          height: size,
          backgroundColor,
        },
        bellAnimatedStyle,
      ]}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
      accessibilityHint="Opens notification center"
    >
      <Bell size={size * 0.45} color={color} />

      {/* Unread badge */}
      {unreadCount > 0 && (
        <View
          className="absolute items-center justify-center bg-red-500 rounded-full"
          style={{
            top: size * 0.1,
            right: size * 0.1,
            minWidth: 18,
            height: 18,
            paddingHorizontal: 4,
          }}
        >
          <Text
            className="text-white font-bold"
            style={{ fontSize: 10 }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Text>
        </View>
      )}
    </AnimatedPressable>
  );
}

export default NotificationBell;
