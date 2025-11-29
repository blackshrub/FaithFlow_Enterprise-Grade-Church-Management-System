/**
 * Profile Screen - Modern Settings Style Design
 *
 * Design: Clean list-based settings layout (like iOS Settings)
 * - Compact header with avatar
 * - Grouped menu items in cards
 * - Full-width list items with chevrons
 */

import React, { useState, useMemo, useCallback, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
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
import { HStack } from '@/components/ui/hstack';

import { useAuthStore } from '@/stores/auth';
import { useGivingSummary } from '@/hooks/useGiving';
import { usePrayerRequests } from '@/hooks/usePrayer';
import { useAttendedEvents } from '@/hooks/useEvents';
import { showSuccessToast } from '@/components/ui/Toast';

const SCREEN_KEY = 'profile-screen';

// Colors
const Colors = {
  primary: '#4F46E5',
  primaryLight: '#6366F1',
  accent: '#C9A962',
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  success: '#10B981',
  error: '#EF4444',
  white: '#FFFFFF',
  background: '#F2F2F7', // iOS-style background
};

interface MenuItem {
  icon: LucideIcon;
  label: string;
  route: string | null;
  subtitle?: string;
  isDestructive?: boolean;
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

  const formatCurrency = useCallback((amount: number) => {
    if (amount >= 1000000) return `Rp ${(amount / 1000000).toFixed(1)}M`;
    if (amount >= 1000) return `Rp ${(amount / 1000).toFixed(0)}K`;
    return `Rp ${amount}`;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchGiving(), refetchPrayer(), refetchAttended()]);
    setRefreshing(false);
  }, [refetchGiving, refetchPrayer, refetchAttended]);

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
    router.replace('/(auth)/login');
  }, [logout, t, router]);

  const handleLogoutCancel = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowLogoutDialog(false);
  }, []);

  // Menu sections
  const menuSections: MenuSection[] = useMemo(() => [
    {
      items: [
        { icon: User, label: t('profile.personalInfo', 'Personal Information'), route: '/profile/edit' },
        { icon: Shield, label: t('profile.privacy', 'Privacy & Security'), route: null },
      ],
    },
    {
      title: t('profile.preferences', 'PREFERENCES'),
      items: [
        { icon: Bell, label: t('profile.notifications', 'Notifications'), route: null },
        { icon: Globe, label: t('profile.language', 'Language'), route: null, subtitle: 'English' },
        { icon: Moon, label: t('profile.appearance', 'Appearance'), route: null, subtitle: 'Light' },
      ],
    },
    {
      title: t('profile.support', 'SUPPORT'),
      items: [
        { icon: HelpCircle, label: t('profile.helpCenter', 'Help Center'), route: null },
        { icon: Smartphone, label: t('profile.about', 'About FaithFlow'), route: null },
      ],
    },
  ], [t]);

  // Render menu item - iOS Settings style
  const renderMenuItem = (item: MenuItem, _index: number, isFirst: boolean, isLast: boolean) => {
    const IconComponent = item.icon;
    return (
      <Pressable
        key={item.label}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          if (item.route) router.push(item.route as any);
        }}
        style={({ pressed }) => ({
          backgroundColor: pressed ? Colors.neutral[100] : Colors.white,
          paddingHorizontal: 16,
          paddingVertical: 16,
          minHeight: 56,
          borderTopLeftRadius: isFirst ? 12 : 0,
          borderTopRightRadius: isFirst ? 12 : 0,
          borderBottomLeftRadius: isLast ? 12 : 0,
          borderBottomRightRadius: isLast ? 12 : 0,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          borderBottomColor: Colors.neutral[200],
        })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Icon container - iOS Settings style */}
          <View style={{
            width: 30,
            height: 30,
            borderRadius: 7,
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
            backgroundColor: Colors.primary,
          }}>
            <IconComponent
              size={18}
              color={Colors.white}
              strokeWidth={2}
            />
          </View>
          {/* Label */}
          <Text
            style={{
              flex: 1,
              fontSize: 17,
              color: Colors.neutral[900],
            }}
            numberOfLines={1}
          >
            {item.label}
          </Text>
          {/* Right side - subtitle + chevron */}
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {item.subtitle && (
              <Text style={{ fontSize: 17, color: Colors.neutral[400], marginRight: 6 }} numberOfLines={1}>
                {item.subtitle}
              </Text>
            )}
            <ChevronRight size={20} color={Colors.neutral[300]} strokeWidth={2} />
          </View>
        </View>
      </Pressable>
    );
  };

  // Render section
  const renderSection = (section: MenuSection, sectionIndex: number) => (
    <Animated.View
      key={section.title || `section-${sectionIndex}`}
      entering={skipAnimations ? undefined : PMotion.sectionStagger(sectionIndex)}
      style={styles.section}
    >
      {section.title && <Text style={styles.sectionTitle}>{section.title}</Text>}
      <View style={styles.sectionCard}>
        {section.items.map((item, index) =>
          renderMenuItem(item, index, index === 0, index === section.items.length - 1)
        )}
      </View>
    </Animated.View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={({ pressed }) => [styles.backBtn, pressed && styles.btnPressed]}
          >
            <ChevronLeft size={24} color={Colors.neutral[900]} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('profile.title', 'Profile')}</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Profile Card */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(0)}
          style={styles.profileCard}
        >
          <Pressable
            onPress={() => router.push('/profile/edit')}
            style={({ pressed }) => [styles.profileCardInner, pressed && styles.profileCardPressed]}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryLight]}
              style={styles.avatar}
            >
              <Text style={styles.avatarText}>{getInitials(member?.full_name || 'User')}</Text>
            </LinearGradient>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{member?.full_name || 'Guest User'}</Text>
              <Text style={styles.profileEmail}>
                {member?.email || member?.phone_whatsapp || 'Add email'}
              </Text>
            </View>
            <ChevronRight size={20} color={Colors.neutral[400]} />
          </Pressable>
        </Animated.View>

        {/* Stats Row */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(1)}
          style={styles.statsCard}
        >
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
              <Heart size={20} color="#D97706" />
            </View>
            <View style={styles.statTextWrap}>
              <Text style={styles.statValue}>{formatCurrency(totalGiven)}</Text>
              <Text style={styles.statLabel}>Given</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#DBEAFE' }]}>
              <HandHeart size={20} color="#2563EB" />
            </View>
            <View style={styles.statTextWrap}>
              <Text style={styles.statValue}>{myPrayersCount}</Text>
              <Text style={styles.statLabel}>Prayers</Text>
            </View>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={[styles.statIcon, { backgroundColor: '#D1FAE5' }]}>
              <Calendar size={20} color="#059669" />
            </View>
            <View style={styles.statTextWrap}>
              <Text style={styles.statValue}>{attendedEventsCount}</Text>
              <Text style={styles.statLabel}>Events</Text>
            </View>
          </View>
        </Animated.View>

        {/* Menu Sections */}
        {menuSections.map((section, index) => renderSection(section, index + 2))}

        {/* Logout */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(menuSections.length + 2)}
          style={styles.section}
        >
          <View style={styles.sectionCard}>
            <Pressable
              onPress={handleLogoutPress}
              style={({ pressed }) => ({
                backgroundColor: pressed ? Colors.neutral[100] : Colors.white,
                paddingHorizontal: 16,
                paddingVertical: 16,
                minHeight: 56,
                borderRadius: 12,
              })}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 30,
                  height: 30,
                  borderRadius: 7,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                  backgroundColor: '#FEE2E2',
                }}>
                  <LogOut size={18} color={Colors.error} strokeWidth={2} />
                </View>
                <Text style={{ flex: 1, fontSize: 17, color: Colors.error }}>
                  {t('profile.logout', 'Log Out')}
                </Text>
              </View>
            </Pressable>
          </View>
        </Animated.View>

        {/* Version */}
        <Text style={styles.versionText}>FaithFlow v1.0.0</Text>
      </ScrollView>

      {/* Logout Dialog */}
      <AlertDialog isOpen={showLogoutDialog} onClose={handleLogoutCancel}>
        <AlertDialogBackdrop />
        <AlertDialogContent style={styles.dialogContent}>
          <AlertDialogHeader>
            <Heading size="lg">{t('profile.logoutConfirm', 'Log Out?')}</Heading>
          </AlertDialogHeader>
          <AlertDialogBody>
            <GText>{t('profile.logoutConfirmDesc', 'Are you sure you want to log out?')}</GText>
          </AlertDialogBody>
          <AlertDialogFooter>
            <HStack space="md" className="w-full justify-end">
              <Button variant="outline" onPress={handleLogoutCancel} style={styles.cancelBtn}>
                <ButtonText style={styles.cancelBtnText}>{t('common.cancel', 'Cancel')}</ButtonText>
              </Button>
              <Button onPress={handleLogoutConfirm} style={styles.logoutBtn}>
                <ButtonText>{t('profile.logout', 'Log Out')}</ButtonText>
              </Button>
            </HStack>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  // Header
  header: {
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 44,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  btnPressed: {
    opacity: 0.7,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    textAlign: 'center',
    marginRight: 48, // Offset for back button to center title
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  // Profile Card
  profileCard: {
    marginBottom: 20,
  },
  profileCardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 16,
  },
  profileCardPressed: {
    backgroundColor: Colors.neutral[100],
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.white,
  },
  profileInfo: {
    flex: 1,
    marginLeft: 14,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: 2,
  },
  profileEmail: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  // Stats
  statsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    marginBottom: 28,
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'nowrap',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  statTextWrap: {
    alignItems: 'flex-start',
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.neutral[500],
  },
  statDivider: {
    width: 1,
    backgroundColor: Colors.neutral[200],
    marginVertical: 6,
  },
  // Sections
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[500],
    marginBottom: 10,
    marginLeft: 16,
    letterSpacing: 0.5,
  },
  sectionCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
  },
  // Version
  versionText: {
    textAlign: 'center',
    fontSize: 13,
    color: Colors.neutral[400],
    marginTop: 8,
    marginBottom: 24,
  },
  // Dialog
  dialogContent: {
    borderRadius: 16,
    maxWidth: 320,
  },
  cancelBtn: {
    borderColor: Colors.neutral[300],
  },
  cancelBtnText: {
    color: Colors.neutral[700],
  },
  logoutBtn: {
    backgroundColor: Colors.error,
  },
});

const MemoizedProfileScreen = memo(ProfileScreen);
MemoizedProfileScreen.displayName = 'ProfileScreen';
export default withPremiumMotionV10(MemoizedProfileScreen);
