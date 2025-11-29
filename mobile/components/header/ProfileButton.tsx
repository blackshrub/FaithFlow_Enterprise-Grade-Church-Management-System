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
import { Pressable, StyleSheet, View, Image } from 'react-native';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Text } from '@/components/ui/text';
import { useAuthStore } from '@/stores/auth';
import { colors, shadows, borderRadius } from '@/constants/theme';

interface ProfileButtonProps {
  size?: number;
  showBorder?: boolean;
}

export function ProfileButton({ size = 36, showBorder = true }: ProfileButtonProps) {
  const router = useRouter();
  const { member } = useAuthStore();

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
      style={({ pressed }) => [
        styles.button,
        pressed && styles.pressed,
        showBorder && styles.withBorder,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      {avatarUrl ? (
        <Image
          source={{ uri: avatarUrl }}
          style={[
            styles.avatar,
            { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.initialsContainer,
            { width: size - 4, height: size - 4, borderRadius: (size - 4) / 2 },
          ]}
        >
          <Text style={[styles.initials, { fontSize: size * 0.4 }]}>
            {getInitials()}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.white,
    ...shadows.sm,
  },
  withBorder: {
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.95 }],
  },
  avatar: {
    backgroundColor: colors.gray[200],
  },
  initialsContainer: {
    backgroundColor: colors.primary[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  initials: {
    color: colors.primary[700],
    fontWeight: '700',
  },
});
