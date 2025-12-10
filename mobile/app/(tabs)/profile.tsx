/**
 * Profile Screen - iOS Settings Style with NativeWind
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Gluestack for AlertDialog, Button components
 * - React Native + PremiumMotion for animations
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import {
  PMotion,
  shouldSkipEnteringAnimation,
} from '@/components/motion/premium-motion';
import {
  User,
  Bell,
  Globe,
  LogOut,
  Heart,
  HandHeart,
  Calendar,
  Shield,
  HelpCircle,
  Smartphone,
  Moon,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

// Gluestack components for dialogs and buttons
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text as GText } from '@/components/ui/text';

import { useAuthStore } from '@/stores/auth';
import { useGivingSummary } from '@/hooks/useGiving';
import { usePrayerRequests } from '@/hooks/usePrayer';
import { useAttendedEvents } from '@/hooks/useEvents';
import { showSuccessToast } from '@/components/ui/Toast';
import { formatCompactCurrency } from '@/utils/currencyFormat';
import { replaceTo } from '@/utils/navigation';

const SCREEN_KEY = 'profile-screen';

interface MenuItem {
  icon: LucideIcon;
  label: string;
  route: string | null;
  subtitle?: string;
  isDestructive?: boolean;
  iconBgColor?: string;
}

interface MenuSection {
  title?: string;
  items: MenuItem[];
}

function ProfileScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member, logout } = useAuthStore();
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const skipAnimations = useMemo(() => shouldSkipEnteringAnimation(SCREEN_KEY), []);

  // Fetch stats
  const { data: givingSummary, refetch: refetchGiving } = useGivingSummary();
  const { data: prayerRequests, refetch: refetchPrayer } = usePrayerRequests();
  const { data: attendedEvents, refetch: refetchAttended } = useAttendedEvents();

  const totalGiven = useMemo(() => givingSummary?.total_given || 0, [givingSummary]);
  const myPrayersCount = useMemo(
    () => prayerRequests?.filter((r) => r.member_id === member?.id).length || 0,
    [prayerRequests, member?.id]
  );
  const attendedEventsCount = useMemo(() => attendedEvents?.length || 0, [attendedEvents]);

  // DATA FIX: Use shared currency formatter utility
  const formatCurrency = formatCompactCurrency;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchGiving(), refetchPrayer(), refetchAttended()]);
    setRefreshing(false);
    // UX FIX: Show feedback when refresh completes
    showSuccessToast(t('common.refreshed', 'Refreshed'), t('common.dataUpdated', 'Data updated'));
  }, [refetchGiving, refetchPrayer, refetchAttended, t]);

  const getInitials = useCallback((name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return name.substring(0, 2).toUpperCase();
  }, []);

  const handleLogoutPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowLogoutDialog(true);
  }, []);

  const handleLogoutConfirm = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setShowLogoutDialog(false);
    logout();
    showSuccessToast(t('profile.logoutSuccess'), t('profile.logoutSuccessDesc'));
    replaceTo('/(auth)/login');
  }, [logout, t]);

  const handleLogoutCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLogoutDialog(false);
  }, []);

  // Menu sections - iOS Settings style with colored icon backgrounds
  const menuSections: MenuSection[] = useMemo(() => [
    {
      items: [
        { icon: User, label: t('profile.personalInfo', 'Personal Information'), route: '/profile/edit', iconBgColor: '#007AFF' },
        { icon: Shield, label: t('profile.privacy', 'Privacy & Security'), route: '/settings/privacy', iconBgColor: '#5856D6' },
      ],
    },
    {
      title: t('profile.preferences', 'PREFERENCES'),
      items: [
        { icon: Bell, label: t('profile.notifications', 'Notifications'), route: '/settings/notifications', iconBgColor: '#FF3B30' },
        { icon: Globe, label: t('profile.language', 'Language'), route: '/settings/language', subtitle: 'English', iconBgColor: '#34C759' },
        { icon: Moon, label: t('profile.appearance', 'Appearance'), route: '/settings/appearance', subtitle: 'Light', iconBgColor: '#5856D6' },
      ],
    },
    {
      title: t('profile.support', 'SUPPORT'),
      items: [
        { icon: HelpCircle, label: t('profile.helpCenter', 'Help Center'), route: null, iconBgColor: '#FF9500' },
        { icon: Smartphone, label: t('profile.about', 'About FaithFlow'), route: null, iconBgColor: '#8E8E93' },
      ],
    },
  ], [t]);

  // Render menu item - iOS Settings style with NativeWind
  const renderMenuItem = (item: MenuItem, _index: number, isFirst: boolean, isLast: boolean) => {
    const IconComponent = item.icon;

    const handlePress = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (item.route) {
        // Note: Not implemented yet - would use navigateTo when routes are available
        console.log('Navigate to:', item.route);
      }
    };

    return (
      <Pressable
        key={item.label}
        onPress={handlePress}
        className="active:bg-background-100 px-4 min-h-[52px] justify-center"
        accessible
        accessibilityRole="button"
        accessibilityLabel={item.label}
      >
        <View className="flex-row items-center py-3">
          {/* Icon container - iOS Settings style with colored background */}
          <View
            className="w-[29px] h-[29px] rounded-[6px] items-center justify-center mr-3"
            style={{ backgroundColor: item.iconBgColor || '#007AFF' }}
          >
            <IconComponent size={17} color="#FFFFFF" strokeWidth={2} />
          </View>
          {/* Label */}
          <Text className="flex-1 text-[17px] text-typography-900" numberOfLines={1}>
            {item.label}
          </Text>
          {/* Right side - subtitle + chevron */}
          <View className="flex-row items-center">
            {item.subtitle && (
              <Text className="text-[17px] text-typography-400 mr-1.5" numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
            <ChevronRight size={20} color="#D4D4D4" strokeWidth={2} />
          </View>
        </View>
        {/* Separator line - indent from left to match iOS Settings */}
        {!isLast && (
          <View className="absolute bottom-0 right-0 left-[58px] h-px bg-outline-200" />
        )}
      </Pressable>
    );
  };

  // Render section
  const renderSection = (section: MenuSection, sectionIndex: number) => (
    <Animated.View
      key={section.title || `section-${sectionIndex}`}
      entering={skipAnimations ? undefined : PMotion.sectionStagger(sectionIndex)}
      className="mb-7"
    >
      {section.title && (
        <Text className="text-[13px] font-medium text-typography-500 mb-2.5 ml-4 tracking-wide">
          {section.title}
        </Text>
      )}
      <View className="bg-white rounded-xl overflow-hidden">
        {section.items.map((item, index) =>
          renderMenuItem(item, index, index === 0, index === section.items.length - 1)
        )}
      </View>
    </Animated.View>
  );

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View
        className="bg-[#F2F2F7] px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center h-11">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="w-11 h-11 rounded-full items-center justify-center mr-2 active:opacity-70"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Go back')}
          >
            <ChevronLeft size={24} color="#171717" />
          </Pressable>
          <Text className="flex-1 text-lg font-semibold text-typography-900 text-center mr-12">
            {t('profile.title', 'Profile')}
          </Text>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Card */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(0)}
          className="mb-5"
        >
          <Pressable
            onPress={() => {
              // Note: Not implemented yet - would use navigateTo('/profile/edit') when route exists
              console.log('Navigate to: /profile/edit');
            }}
            className="flex-row items-center bg-white rounded-xl p-4 active:bg-background-100"
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('profile.editProfile', `Edit profile - ${member?.full_name || 'Guest User'}`)}
          >
            <LinearGradient
              colors={['#4F46E5', '#6366F1']}
              className="w-[60px] h-[60px] rounded-full items-center justify-center"
            >
              <Text className="text-[22px] font-bold text-white">
                {getInitials(member?.full_name || 'User')}
              </Text>
            </LinearGradient>
            <View className="flex-1 ml-3.5">
              <Text className="text-lg font-semibold text-typography-900 mb-0.5">
                {member?.full_name || 'Guest User'}
              </Text>
              <Text className="text-sm text-typography-500">
                {member?.email || member?.phone_whatsapp || 'Add email'}
              </Text>
            </View>
            <ChevronRight size={20} color="#A3A3A3" />
          </Pressable>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(1)}
          className="flex-row bg-white rounded-xl py-4 px-3 mb-7"
        >
          <View className="flex-1 flex-row items-center justify-center">
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-2.5 bg-warning-100">
              <Heart size={20} color="#D97706" />
            </View>
            <View>
              <Text className="text-[15px] font-bold text-typography-900 mb-0.5">
                {formatCurrency(totalGiven)}
              </Text>
              <Text className="text-xs text-typography-500">Given</Text>
            </View>
          </View>
          <View className="w-px bg-outline-200 my-1.5" />
          <View className="flex-1 flex-row items-center justify-center">
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-2.5 bg-info-100">
              <HandHeart size={20} color="#2563EB" />
            </View>
            <View>
              <Text className="text-[15px] font-bold text-typography-900 mb-0.5">
                {myPrayersCount}
              </Text>
              <Text className="text-xs text-typography-500">Prayers</Text>
            </View>
          </View>
          <View className="w-px bg-outline-200 my-1.5" />
          <View className="flex-1 flex-row items-center justify-center">
            <View className="w-10 h-10 rounded-xl items-center justify-center mr-2.5 bg-success-100">
              <Calendar size={20} color="#059669" />
            </View>
            <View>
              <Text className="text-[15px] font-bold text-typography-900 mb-0.5">
                {attendedEventsCount}
              </Text>
              <Text className="text-xs text-typography-500">Events</Text>
            </View>
          </View>
        </Animated.View>

        {/* Menu Sections */}
        {menuSections.map((section, index) => renderSection(section, index + 2))}

        {/* Logout */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(menuSections.length + 2)}
          className="mb-7"
        >
          <View className="bg-white rounded-xl overflow-hidden">
            <Pressable
              onPress={handleLogoutPress}
              className="bg-white active:bg-background-100 px-4 py-4 min-h-[56px] rounded-xl"
              accessible
              accessibilityRole="button"
              accessibilityLabel={t('profile.logout', 'Log Out')}
            >
              <View className="flex-row items-center">
                <View className="w-[30px] h-[30px] rounded-[7px] items-center justify-center mr-3 bg-error-100">
                  <LogOut size={18} color="#EF4444" strokeWidth={2} />
                </View>
                <Text className="flex-1 text-[17px] text-error-500">
                  {t('profile.logout', 'Log Out')}
                </Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Version */}
        <Text className="text-center text-[13px] text-typography-400 mt-2 mb-6">
          FaithFlow v1.0.0
        </Text>
      </ScrollView>

      {/* Logout Dialog - Gluestack AlertDialog */}
      <AlertDialog isOpen={showLogoutDialog} onClose={handleLogoutCancel}>
        <AlertDialogBackdrop />
        <AlertDialogContent className="rounded-2xl max-w-[320px]">
          <AlertDialogHeader>
            <Heading size="lg">{t('profile.logoutConfirm', 'Log Out?')}</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <GText>{t('profile.logoutConfirmDesc', 'Are you sure you want to log out?')}</GText>
          </AlertDialogBody>
          <AlertDialogFooter>
            <View className="flex-row justify-end gap-3 w-full">
              <Button variant="outline" onPress={handleLogoutCancel} className="border-outline-300">
                <ButtonText className="text-typography-700">{t('common.cancel', 'Cancel')}</ButtonText>
              </Button>
              <Button onPress={handleLogoutConfirm} className="bg-error-500">
                <ButtonText>{t('profile.logout', 'Log Out')}</ButtonText>
              </Button>
            </View>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

const MemoizedProfileScreen = memo(ProfileScreen);
MemoizedProfileScreen.displayName = 'ProfileScreen';
export default withPremiumMotionV10(MemoizedProfileScreen);
