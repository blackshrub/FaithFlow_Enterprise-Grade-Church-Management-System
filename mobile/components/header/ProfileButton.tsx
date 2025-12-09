/**
 * Profile Button Component
 *
 * Displays user avatar in the header, navigates to profile screen.
 * Shows first letter of name if no avatar image.
 *
 * Features:
 * - Cached avatar image
 * - Fallback to initials
 * - Notification badge (future)
 * - Haptic feedback
 */

import React from 'react';
import { Pressable, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/stores/auth';
import { colors, shadows } from '@/constants/theme';

interface ProfileButtonProps {
  size?: number;
  showBorder?: boolean;
}

export function ProfileButton({ size = 36, showBorder = true }: ProfileButtonProps) {
  const router = useRouter();
  // Selective subscription - only re-render when member changes
  const member = useAuthStore((state) => state.member);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(tabs)/profile');
  };

  // Get initials from member name
  const getInitials = (): string => {
    if (!member) return '?';

    const name = member.full_name || member.name || member.first_name || '';
    const parts = name.trim().split(' ');

    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.charAt(0).toUpperCase() || '?';
  };

  // Get avatar URL
  const avatarUrl = member?.profile_photo_url || member?.avatar_url;

  return (
    <Pressable
      onPress={handlePress}
      className="items-center justify-center"
      style={({ pressed }) => [
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.white,
          ...shadows.sm,
          ...(showBorder && {
            borderWidth: 2,
            borderColor: colors.primary[500],
          }),
          ...(pressed && {
            opacity: 0.8,
            transform: [{ scale: 0.95 }],
          }),
        },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={{
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
            backgroundColor: colors.gray[200],
          }}
          resizeMode="cover"
        />
      ) : (
        <View
          className="items-center justify-center"
          style={{
            width: size - 4,
            height: size - 4,
            borderRadius: (size - 4) / 2,
            backgroundColor: colors.primary[100],
          }}
        >
          <Text
            className="font-bold"
            style={{ fontSize: size * 0.4, color: colors.primary[700] }}
          >
            {getInitials()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
