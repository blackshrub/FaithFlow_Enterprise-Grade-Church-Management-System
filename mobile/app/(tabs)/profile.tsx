/**
 * Profile Screen
 *
 * Features:
 * - Personal information
 * - Settings
 * - Language switcher
 * - Notifications preferences
 * - Logout
 */

import React from 'react';
import { View, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  User,
  Settings,
  Bell,
  Globe,
  LogOut,
  ChevronRight,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText } from '@/components/ui/avatar';

import { useAuthStore } from '@/stores/authStore';
import { colors } from '@/constants/theme';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member, logout } = useAuthStore();

  const menuItems = [
    {
      icon: User,
      label: t('profile.personalInfo'),
      onPress: () => {},
    },
    {
      icon: Settings,
      label: t('profile.settings'),
      onPress: () => {},
    },
    {
      icon: Bell,
      label: t('profile.notifications'),
      onPress: () => {},
    },
    {
      icon: Globe,
      label: t('profile.language'),
      onPress: () => {},
    },
  ];

  const handleLogout = () => {
    logout();
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="px-6 pt-6 pb-4">
          <Heading size="2xl" className="text-gray-900">
            {t('profile.title')}
          </Heading>
          <Text className="text-gray-600 mt-1" size="md">
            {t('profile.subtitle')}
          </Text>
        </View>

        {/* Profile Card */}
        <View className="px-6 pb-6">
          <Card className="p-6">
            <HStack space="lg" className="items-center">
              <Avatar size="xl">
                <AvatarFallbackText>
                  {member?.full_name || 'User'}
                </AvatarFallbackText>
              </Avatar>
              <VStack space="xs" className="flex-1">
                <Heading size="lg" className="text-gray-900">
                  {member?.full_name || 'Guest User'}
                </Heading>
                <Text className="text-gray-600" size="sm">
                  {member?.email || member?.phone_whatsapp}
                </Text>
              </VStack>
            </HStack>
          </Card>
        </View>

        {/* Menu Items */}
        <View className="px-6 pb-6">
          <VStack space="sm">
            {menuItems.map((item, index) => (
              <Pressable
                key={index}
                onPress={item.onPress}
                className="active:opacity-60"
              >
                <Card className="p-4">
                  <HStack space="md" className="items-center">
                    <View
                      className="items-center justify-center"
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        backgroundColor: `${colors.primary[500]}15`,
                      }}
                    >
                      <Icon
                        as={item.icon}
                        size="md"
                        className="text-primary-500"
                      />
                    </View>
                    <Text className="text-gray-900 font-medium flex-1">
                      {item.label}
                    </Text>
                    <Icon
                      as={ChevronRight}
                      size="md"
                      className="text-gray-400"
                    />
                  </HStack>
                </Card>
              </Pressable>
            ))}
          </VStack>
        </View>

        {/* Logout Button */}
        <View className="px-6 pb-6">
          <Pressable
            onPress={handleLogout}
            className="active:opacity-60"
          >
            <Card
              className="p-4"
              style={{ backgroundColor: colors.error[50] }}
            >
              <HStack space="md" className="items-center justify-center">
                <Icon as={LogOut} size="md" className="text-error-600" />
                <Text className="text-error-600 font-semibold">
                  {t('profile.logout')}
                </Text>
              </HStack>
            </Card>
          </Pressable>
        </View>

        {/* App Version */}
        <View className="px-6 pb-12">
          <Text className="text-gray-400 text-center" size="sm">
            {t('profile.version')} 1.0.0
          </Text>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
