/**
 * Profile Screen - Enhanced
 *
 * Features:
 * - Personal information with avatar
 * - Stats cards (giving, prayers, events)
 * - Settings menu
 * - AlertDialog for logout confirmation
 * - Profile edit functionality
 * - Skeleton loading
 * - Complete bilingual support
 */

import React, { useState } from 'react';
import { ScrollView, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import {
  User,
  Settings,
  Bell,
  Globe,
  LogOut,
  ChevronRight,
  Heart,
  MessageCircle,
  Calendar,
  Edit3,
} from 'lucide-react-native';
import {
  View,
  Text,
  Heading,
  VStack,
  HStack,
  Card,
  Icon,
  Avatar,
  AvatarFallbackText,
  Button,
  ButtonText,
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@gluestack-ui/themed';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonText } from '@/components/ui/skeleton';

import { useAuthStore } from '@/stores/auth';
import { colors, borderRadius, shadows, spacing } from '@/constants/theme';
import { useGivingSummary } from '@/hooks/useGiving';
import { usePrayerRequests } from '@/hooks/usePrayer';
import { useUpcomingEvents } from '@/hooks/useEvents';
import { showSuccessToast } from '@/components/ui/Toast';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member, logout } = useAuthStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Fetch stats data
  const { data: givingSummary, isLoading: givingLoading, refetch: refetchGiving } = useGivingSummary();
  const { data: prayerRequests, isLoading: prayerLoading, refetch: refetchPrayer } = usePrayerRequests();
  const { data: upcomingEvents, isLoading: eventsLoading, refetch: refetchEvents } = useUpcomingEvents();

  // Calculate stats
  const totalGiven = givingSummary?.total_given || 0;
  const myPrayersCount = prayerRequests?.filter((r) => r.member_id === member?.id).length || 0;
  const attendedEventsCount = 0; // TODO: Get from RSVP history

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Refresh
  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchGiving(), refetchPrayer(), refetchEvents()]);
    setRefreshing(false);
  }, [refetchGiving, refetchPrayer, refetchEvents]);

  // Stats cards
  const statsCards = [
    {
      icon: Heart,
      label: t('profile.stats.totalGiven'),
      value: formatCurrency(totalGiven),
      color: colors.success[500],
      bgColor: colors.success[50],
      loading: givingLoading,
    },
    {
      icon: MessageCircle,
      label: t('profile.stats.myPrayers'),
      value: myPrayersCount.toString(),
      color: colors.primary[500],
      bgColor: colors.primary[50],
      loading: prayerLoading,
    },
    {
      icon: Calendar,
      label: t('profile.stats.eventsAttended'),
      value: attendedEventsCount.toString(),
      color: colors.secondary[500],
      bgColor: colors.secondary[50],
      loading: eventsLoading,
    },
  ];

  const menuItems = [
    {
      icon: User,
      label: t('profile.personalInfo'),
      onPress: () => router.push('/profile/edit'),
    },
    {
      icon: Settings,
      label: t('profile.settings'),
      onPress: () => {
        // TODO: Navigate to settings
      },
    },
    {
      icon: Bell,
      label: t('profile.notifications'),
      onPress: () => {
        // TODO: Navigate to notifications
      },
    },
    {
      icon: Globe,
      label: t('profile.language'),
      onPress: () => {
        // TODO: Navigate to language settings
      },
    },
  ];

  const handleLogoutPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogoutDialog(true);
  };

  const handleLogoutConfirm = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowLogoutDialog(false);
    logout();
    showSuccessToast(t('profile.logoutSuccess'), t('profile.logoutSuccessDesc'));
    router.replace('/(auth)/login');
  };

  const handleLogoutCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLogoutDialog(false);
  };

  // Render skeleton for stats
  const renderStatsSkeleton = () => (
    <HStack space="md" className="px-6 pb-6">
      {[1, 2, 3].map((i) => (
        <Card key={i} style={{ flex: 1, borderRadius: borderRadius.lg }}>
          <VStack space="xs" className="p-4">
            <Skeleton height={40} width={40} style={{ borderRadius: 999 }} />
            <SkeletonText lines={1} />
            <Skeleton height={24} width="60%" />
          </VStack>
        </Card>
      ))}
    </HStack>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
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
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          className="px-6 pb-6"
        >
          <Card style={{ borderRadius: borderRadius.xl, ...shadows.md }}>
            <VStack space="md" className="p-6">
              <HStack space="lg" className="items-center">
                <Avatar size="xl" style={{ backgroundColor: colors.primary[500] }}>
                  <AvatarFallbackText>{member?.full_name || 'User'}</AvatarFallbackText>
                </Avatar>
                <VStack space="xs" className="flex-1">
                  <Heading size="lg" className="text-gray-900">
                    {member?.full_name || 'Guest User'}
                  </Heading>
                  <Text className="text-gray-600" size="sm">
                    {member?.email || member?.phone_whatsapp}
                  </Text>
                </VStack>
                <Pressable onPress={() => router.push('/profile/edit')}>
                  <View
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 999,
                      backgroundColor: colors.primary[50],
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Icon as={Edit3} size="md" style={{ color: colors.primary[600] }} />
                  </View>
                </Pressable>
              </HStack>
            </VStack>
          </Card>
        </MotiView>

        {/* Stats Cards */}
        {givingLoading || prayerLoading || eventsLoading ? (
          renderStatsSkeleton()
        ) : (
          <HStack space="md" className="px-6 pb-6">
            {statsCards.map((stat, index) => (
              <MotiView
                key={stat.label}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  delay: index * 100,
                }}
                style={{ flex: 1 }}
              >
                <Card
                  style={{
                    borderRadius: borderRadius.lg,
                    ...shadows.sm,
                    backgroundColor: stat.bgColor,
                  }}
                >
                  <VStack space="xs" className="p-4">
                    <View
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 999,
                        backgroundColor: '#ffffff',
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Icon as={stat.icon} size="lg" style={{ color: stat.color }} />
                    </View>
                    <Text size="xs" className="opacity-75">
                      {stat.label}
                    </Text>
                    <Heading size="md" style={{ color: stat.color }}>
                      {stat.value}
                    </Heading>
                  </VStack>
                </Card>
              </MotiView>
            ))}
          </HStack>
        )}

        {/* Menu Items */}
        <View className="px-6 pb-6">
          <VStack space="sm">
            {menuItems.map((item, index) => (
              <MotiView
                key={item.label}
                from={{ opacity: 0, translateX: -20 }}
                animate={{ opacity: 1, translateX: 0 }}
                transition={{
                  type: 'spring',
                  delay: index * 50 + 300,
                }}
              >
                <Pressable onPress={item.onPress} className="active:opacity-60">
                  <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
                    <HStack space="md" className="items-center p-4">
                      <View
                        className="items-center justify-center"
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 20,
                          backgroundColor: `${colors.primary[500]}15`,
                        }}
                      >
                        <Icon as={item.icon} size="md" className="text-primary-500" />
                      </View>
                      <Text className="text-gray-900 font-medium flex-1">{item.label}</Text>
                      <Icon as={ChevronRight} size="md" className="text-gray-400" />
                    </HStack>
                  </Card>
                </Pressable>
              </MotiView>
            ))}
          </VStack>
        </View>

        {/* Logout Button */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 500 }}
          className="px-6 pb-6"
        >
          <Pressable onPress={handleLogoutPress} className="active:opacity-60">
            <Card
              style={{
                borderRadius: borderRadius.lg,
                backgroundColor: colors.error[50],
                ...shadows.sm,
              }}
            >
              <HStack space="md" className="items-center justify-center p-4">
                <Icon as={LogOut} size="md" className="text-error-600" />
                <Text className="text-error-600 font-semibold">{t('profile.logout')}</Text>
              </HStack>
            </Card>
          </Pressable>
        </MotiView>

        {/* App Version */}
        <View className="px-6 pb-12">
          <Text className="text-gray-400 text-center" size="sm">
            {t('profile.version')} 1.0.0
          </Text>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Logout AlertDialog */}
      <AlertDialog isOpen={showLogoutDialog} onClose={handleLogoutCancel}>
        <AlertDialogBackdrop />
        <AlertDialogContent
          style={{
            borderRadius: borderRadius.xl,
            maxWidth: 400,
          }}
        >
          <AlertDialogHeader>
            <Heading size="lg">{t('profile.logoutConfirm')}</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <Text>{t('profile.logoutConfirmDesc')}</Text>
          </AlertDialogBody>
          <AlertDialogFooter>
            <HStack space="md" className="w-full justify-end">
              <Button
                variant="outline"
                onPress={handleLogoutCancel}
                style={{ borderColor: colors.gray[300] }}
              >
                <ButtonText style={{ color: colors.gray[700] }}>
                  {t('common.cancel')}
                </ButtonText>
              </Button>
              <Button
                onPress={handleLogoutConfirm}
                style={{ backgroundColor: colors.error[500] }}
              >
                <ButtonText>{t('profile.logout')}</ButtonText>
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SafeAreaView>
  );
}
