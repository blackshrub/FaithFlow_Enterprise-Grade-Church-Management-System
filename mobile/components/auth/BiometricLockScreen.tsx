/**
 * Biometric Lock Screen
 *
 * Full-screen overlay that appears when app is locked.
 * Requires biometric authentication to dismiss.
 */

import React, { useCallback, useEffect } from 'react';
import { View, Pressable, Platform, Dimensions } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  SlideInUp,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Fingerprint, Scan, Lock, LogOut } from 'lucide-react-native';
import {
  useBiometricAuthStore,
  useBiometricName,
} from '@/stores/biometricAuth';
import { useAuthStore } from '@/stores/auth';
import { useTranslation } from 'react-i18next';

// Primary color for icons (NativeWind classes used for backgrounds/text)
const PRIMARY_COLOR = '#3B82F6';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface BiometricLockScreenProps {
  onAuthenticated?: () => void;
}

export function BiometricLockScreen({ onAuthenticated }: BiometricLockScreenProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const biometricName = useBiometricName();

  const {
    isLocked,
    isAuthenticating,
    biometricTypes,
    error,
    authenticate,
    unlock,
    clearError,
  } = useBiometricAuthStore();

  const { logout, member } = useAuthStore();

  // Animation for the lock icon
  const iconScale = useSharedValue(1);

  useEffect(() => {
    if (isLocked) {
      iconScale.value = withRepeat(
        withSequence(
          withDelay(500, withTiming(1.1, { duration: 300 })),
          withTiming(1, { duration: 300 })
        ),
        3, // Repeat 3 times
        false
      );
    }
  }, [isLocked]);

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  // Get appropriate icon
  const BiometricIcon = biometricTypes.includes('facial') ? Scan : Fingerprint;

  /**
   * Handle authenticate button press
   */
  const handleAuthenticate = useCallback(async () => {
    clearError();
    const success = await authenticate();
    if (success) {
      onAuthenticated?.();
    }
  }, [authenticate, clearError, onAuthenticated]);

  /**
   * Handle logout
   */
  const handleLogout = useCallback(async () => {
    unlock();
    await logout();
  }, [logout, unlock]);

  // Auto-prompt on mount
  useEffect(() => {
    if (isLocked && !isAuthenticating) {
      const timer = setTimeout(() => {
        handleAuthenticate();
      }, 500);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [isLocked]);

  if (!isLocked) {
    return null;
  }

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      className="absolute inset-0 z-50"
      style={{ height: SCREEN_HEIGHT }}
    >
      {/* Blur Background */}
      <BlurView
        intensity={Platform.OS === 'ios' ? 80 : 100}
        tint="dark"
        className="absolute inset-0"
      />

      {/* Content */}
      <Animated.View
        entering={SlideInUp.duration(300).delay(100)}
        className="flex-1 items-center justify-center px-8"
        style={{ paddingTop: insets.top, paddingBottom: insets.bottom }}
      >
        {/* Lock Icon */}
        <Animated.View
          style={[iconAnimatedStyle, { backgroundColor: PRIMARY_COLOR + '30' }]}
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
        >
          <Lock size={48} color={PRIMARY_COLOR} />
        </Animated.View>

        {/* Title */}
        <Text className="text-2xl font-bold text-white text-center mb-2">
          {t('auth.lockScreen.title')}
        </Text>

        {/* Subtitle */}
        <Text className="text-base text-gray-300 text-center mb-8">
          {t('auth.lockScreen.subtitle', { biometric: biometricName })}
        </Text>

        {/* User Info */}
        {member && (
          <View className="bg-white/10 rounded-xl px-4 py-3 mb-8">
            <Text className="text-sm text-gray-300 text-center">
              {t('auth.lockScreen.loggedInAs')}
            </Text>
            <Text className="text-base font-medium text-white text-center">
              {member.full_name || member.name || member.phone_whatsapp}
            </Text>
          </View>
        )}

        {/* Error Message */}
        {error && (
          <View className="bg-red-500/20 rounded-xl px-4 py-3 mb-4 w-full">
            <Text className="text-sm text-red-200 text-center">{error}</Text>
          </View>
        )}

        {/* Authenticate Button */}
        <Button
          onPress={handleAuthenticate}
          disabled={isAuthenticating}
          className="w-full mb-4"
          size="lg"
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          {isAuthenticating ? (
            <ButtonSpinner color="white" />
          ) : (
            <>
              <BiometricIcon size={20} color="white" />
              <ButtonText className="text-white ml-2">
                {t('auth.lockScreen.unlock', { biometric: biometricName })}
              </ButtonText>
            </>
          )}
        </Button>

        {/* Use Different Account */}
        <Pressable
          onPress={handleLogout}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Log out and use different account"
          className="flex-row items-center py-3"
        >
          <LogOut size={16} color="#9CA3AF" />
          <Text className="text-sm text-gray-400 ml-2">
            {t('auth.lockScreen.useDifferentAccount')}
          </Text>
        </Pressable>
      </Animated.View>
    </Animated.View>
  );
}

export default BiometricLockScreen;
