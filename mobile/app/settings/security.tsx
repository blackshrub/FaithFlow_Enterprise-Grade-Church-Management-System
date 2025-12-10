/**
 * Security Settings Screen
 *
 * Biometric authentication settings for quick login.
 */

import React, { useCallback, useEffect } from 'react';
import { View, Pressable, Alert, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { ChevronLeft, Fingerprint, Scan, Shield, ShieldCheck, Info } from 'lucide-react-native';
import {
  useBiometricAuthStore,
  useBiometricName,
  useBiometricAvailable,
} from '@/stores/biometricAuth';
import { useAuthStore } from '@/stores/auth';
import { useRequireAuth } from '@/hooks/useRequireAuth';

// Primary color for icons (NativeWind classes used for backgrounds/text)
const PRIMARY_COLOR = '#3B82F6';

export default function SecuritySettingsScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // SEC-M7: Route protection
  useRequireAuth();

  const biometricName = useBiometricName();
  const biometricAvailable = useBiometricAvailable();

  const {
    isEnabled,
    isHardwareSupported,
    isEnrolled,
    biometricTypes,
    isChecking,
    isAuthenticating,
    lastAuthTime,
    error,
    checkHardwareSupport,
    enableBiometric,
    disableBiometric,
    clearError,
  } = useBiometricAuthStore();

  const { member, isAuthenticated } = useAuthStore();

  // Check hardware support on mount
  useEffect(() => {
    checkHardwareSupport();
  }, [checkHardwareSupport]);

  // Get appropriate icon
  const BiometricIcon = biometricTypes.includes('facial') ? Scan : Fingerprint;

  /**
   * Handle biometric toggle
   */
  const handleToggleBiometric = useCallback(async () => {
    if (!member?.id) {
      Alert.alert(
        t('common.error'),
        t('settings.security.loginRequired')
      );
      return;
    }

    if (isEnabled) {
      // Confirm disable
      Alert.alert(
        t('settings.security.disableTitle'),
        t('settings.security.disableMessage', { biometric: biometricName }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.disable'),
            style: 'destructive',
            onPress: async () => {
              await disableBiometric();
            },
          },
        ]
      );
    } else {
      // Enable biometric
      const success = await enableBiometric(member.id);
      if (success) {
        Alert.alert(
          t('settings.security.enabledTitle'),
          t('settings.security.enabledMessage', { biometric: biometricName })
        );
      }
    }
  }, [member?.id, isEnabled, enableBiometric, disableBiometric, biometricName, t]);

  // Show error if any
  useEffect(() => {
    if (error) {
      Alert.alert(t('common.error'), error, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [error, clearError, t]);

  return (
    <View className="flex-1 bg-white dark:bg-gray-900">
      {/* Header */}
      <View
        className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800"
        style={{ paddingTop: insets.top }}
      >
        <View className="flex-row items-center px-4 py-3">
          <Pressable
            onPress={() => router.back()}
            className="mr-3 p-2 -ml-2 rounded-full active:bg-gray-100 dark:active:bg-gray-800"
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Back')}
          >
            <ChevronLeft size={24} color="#111827" />
          </Pressable>
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('settings.security.title')}
          </Text>
        </View>
      </View>

      {/* Content */}
      <Animated.ScrollView
        entering={FadeIn.duration(300)}
        className="flex-1"
        contentContainerStyle={{ padding: 16 }}
      >
        {/* Biometric Section */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(100)}
          className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4 mb-4"
        >
          <View className="flex-row items-center mb-4">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: PRIMARY_COLOR + '20' }}
            >
              <Shield size={20} color={PRIMARY_COLOR} />
            </View>
            <View className="flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {t('settings.security.biometricLogin')}
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('settings.security.biometricDescription')}
              </Text>
            </View>
          </View>

          {/* Hardware Check Loading */}
          {isChecking ? (
            <View className="items-center py-4">
              <Spinner size="small" />
              <Text className="text-sm text-gray-500 mt-2">
                {t('settings.security.checkingHardware')}
              </Text>
            </View>
          ) : !isHardwareSupported ? (
            /* Hardware Not Supported */
            <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
              <View className="flex-row items-center">
                <Info size={20} color="#F59E0B" />
                <Text className="text-sm text-amber-700 dark:text-amber-400 ml-2 flex-1">
                  {t('settings.security.notSupported')}
                </Text>
              </View>
            </View>
          ) : !isEnrolled ? (
            /* No Biometric Enrolled */
            <View className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4">
              <View className="flex-row items-center">
                <Info size={20} color="#F59E0B" />
                <Text className="text-sm text-amber-700 dark:text-amber-400 ml-2 flex-1">
                  {t('settings.security.notEnrolled', { biometric: biometricName })}
                </Text>
              </View>
            </View>
          ) : (
            /* Biometric Toggle */
            <View className="bg-white dark:bg-gray-700 rounded-xl p-4">
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center flex-1 mr-4">
                  <BiometricIcon size={24} color={PRIMARY_COLOR} />
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-medium text-gray-900 dark:text-white">
                      {biometricName}
                    </Text>
                    <Text className="text-sm text-gray-500 dark:text-gray-400">
                      {isEnabled
                        ? t('settings.security.enabled')
                        : t('settings.security.disabled')}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={isEnabled}
                  onValueChange={handleToggleBiometric}
                  disabled={isAuthenticating}
                  trackColor={{ false: '#D1D5DB', true: PRIMARY_COLOR }}
                />
              </View>

              {/* Last Auth Time */}
              {isEnabled && lastAuthTime && (
                <View className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {t('settings.security.lastUsed')}:{' '}
                    {new Date(lastAuthTime).toLocaleString()}
                  </Text>
                </View>
              )}
            </View>
          )}
        </Animated.View>

        {/* Info Card */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(200)}
          className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4"
        >
          <View className="flex-row items-start">
            <ShieldCheck size={20} color={PRIMARY_COLOR} />
            <View className="ml-3 flex-1">
              <Text className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                {t('settings.security.howItWorks')}
              </Text>
              <Text className="text-sm text-blue-700 dark:text-blue-300">
                {t('settings.security.howItWorksDescription')}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* Privacy Note */}
        <Animated.View
          entering={FadeInDown.duration(300).delay(300)}
          className="mt-4 px-2"
        >
          <Text className="text-xs text-gray-600 dark:text-gray-400 text-center">
            {t('settings.security.privacyNote')}
          </Text>
        </Animated.View>
      </Animated.ScrollView>
    </View>
  );
}
