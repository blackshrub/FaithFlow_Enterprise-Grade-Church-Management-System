/**
 * Home Dashboard Screen - Enhanced
 *
 * Features:
 * - Personalized greeting based on time
 * - Stats cards (giving, prayers, events)
 * - Verse of the Day
 * - Quick actions with badge counts
 * - Skeleton loading
 * - Pull-to-refresh
 * - Smooth animations with Moti
 */

import React from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  Heart,
  BookOpen,
  Calendar,
  Users,
  MessageCircle,
  DollarSign,
  TrendingUp,
} from 'lucide-react-native';
import {
  View as GView,
  Text,
  Heading,
  VStack,
  HStack,
  Card,
  Icon,
  Badge,
  BadgeText,
  Skeleton,
  SkeletonText,
} from '@gluestack-ui/themed';

import { useAuthStore } from '@/stores/auth';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { useGivingSummary } from '@/hooks/useGiving';
import { usePrayerRequests } from '@/hooks/usePrayer';
import { useUpcomingEvents } from '@/hooks/useEvents';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member } = useAuthStore();
  const [refreshing, setRefreshing] = React.useState(false);

  // Fetch data for stats
  const { data: givingSummary, isLoading: givingLoading, refetch: refetchGiving } = useGivingSummary();
  const { data: prayerRequests, isLoading: prayerLoading, refetch: refetchPrayer } = usePrayerRequests();
  const { data: upcomingEvents, isLoading: eventsLoading, refetch: refetchEvents } = useUpcomingEvents();

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting.morning');
    if (hour < 17) return t('home.greeting.afternoon');
    if (hour < 21) return t('home.greeting.evening');
    return t('home.greeting.night');
  };

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchGiving(), refetchPrayer(), refetchEvents()]);
    setRefreshing(false);
  }, [refetchGiving, refetchPrayer, refetchEvents]);

  // Calculate stats
  const activePrayerCount = prayerRequests?.filter((r) => r.status === 'active').length || 0;
  const upcomingEventsCount = upcomingEvents?.length || 0;
  const totalGiven = givingSummary?.total_given || 0;

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // Quick actions with badge counts
  const quickActions = [
    {
      icon: Heart,
      label: t('giving.give'),
      color: colors.secondary[500],
      badge: null,
      onPress: () => router.push('/(tabs)/give'),
    },
    {
      icon: BookOpen,
      label: t('bible.title'),
      color: colors.primary[500],
      badge: null,
      onPress: () => router.push('/(tabs)/bible'),
    },
    {
      icon: Calendar,
      label: t('events.title'),
      color: colors.success[500],
      badge: upcomingEventsCount > 0 ? upcomingEventsCount : null,
      onPress: () => router.push('/(tabs)/events'),
    },
    {
      icon: MessageCircle,
      label: t('prayer.title'),
      color: colors.warning[600],
      badge: activePrayerCount > 0 ? activePrayerCount : null,
      onPress: () => router.push('/prayer'),
    },
    {
      icon: Users,
      label: t('groups.title'),
      color: colors.secondary[300],
      badge: null,
      onPress: () => router.push('/groups'),
    },
  ];

  // Stats cards data
  const statsCards = [
    {
      icon: DollarSign,
      label: t('home.stats.totalGiven'),
      value: formatCurrency(totalGiven),
      color: colors.success[500],
      bgColor: colors.success[50],
      loading: givingLoading,
    },
    {
      icon: MessageCircle,
      label: t('home.stats.activePrayers'),
      value: activePrayerCount.toString(),
      color: colors.primary[500],
      bgColor: colors.primary[50],
      loading: prayerLoading,
    },
    {
      icon: Calendar,
      label: t('home.stats.upcomingEvents'),
      value: upcomingEventsCount.toString(),
      color: colors.secondary[500],
      bgColor: colors.secondary[50],
      loading: eventsLoading,
    },
  ];

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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header with Greeting */}
        <MotiView
          from={{ opacity: 0, translateY: -20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 300 }}
          className="px-6 pt-6 pb-4"
        >
          <Text className="text-gray-600" size="lg">
            {getGreeting()}
          </Text>
          <Heading size="2xl" className="text-gray-900 mt-1">
            {member?.full_name || t('home.welcome', { name: '' })}
          </Heading>
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
                    <Heading size="lg" style={{ color: stat.color }}>
                      {stat.value}
                    </Heading>
                  </VStack>
                </Card>
              </MotiView>
            ))}
          </HStack>
        )}

        {/* Quick Actions */}
        <View className="px-6 pb-6">
          <Heading size="lg" className="text-gray-900 mb-4">
            {t('home.quickActions')}
          </Heading>
          <View className="flex-row flex-wrap gap-3">
            {quickActions.map((action, index) => (
              <MotiView
                key={action.label}
                from={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{
                  type: 'spring',
                  delay: index * 100 + 300,
                }}
                style={{ flex: 1, minWidth: '45%' }}
              >
                <Pressable onPress={action.onPress} className="active:opacity-80">
                  <Card
                    className="p-5"
                    style={{
                      borderRadius: borderRadius.lg,
                      ...shadows.sm,
                    }}
                  >
                    <VStack space="md" className="items-center">
                      <View
                        className="items-center justify-center"
                        style={{
                          width: 56,
                          height: 56,
                          borderRadius: 56 / 2,
                          backgroundColor: `${action.color}15`,
                        }}
                      >
                        <Icon as={action.icon} size="xl" style={{ color: action.color }} />

                        {/* Badge count */}
                        {action.badge && action.badge > 0 && (
                          <View
                            style={{
                              position: 'absolute',
                              top: -4,
                              right: -4,
                              minWidth: 20,
                              height: 20,
                              borderRadius: 999,
                              backgroundColor: colors.error[500],
                              justifyContent: 'center',
                              alignItems: 'center',
                              paddingHorizontal: 6,
                            }}
                          >
                            <Text
                              size="2xs"
                              style={{
                                color: '#ffffff',
                                fontWeight: '700',
                              }}
                            >
                              {action.badge > 99 ? '99+' : action.badge}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text size="md" className="text-gray-900 font-semibold text-center">
                        {action.label}
                      </Text>
                    </VStack>
                  </Card>
                </Pressable>
              </MotiView>
            ))}
          </View>
        </View>

        {/* Verse of the Day */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 400 }}
          className="px-6 pb-6"
        >
          <Card
            className="p-6"
            style={{
              borderRadius: borderRadius.xl,
              backgroundColor: colors.primary[500],
              ...shadows.md,
            }}
          >
            <VStack space="md">
              <HStack space="sm" className="items-center">
                <Icon as={BookOpen} size="md" className="text-white" />
                <Text className="text-white font-semibold" size="lg">
                  {t('home.verseOfDay')}
                </Text>
              </HStack>
              <Text className="text-white opacity-95" size="md">
                "For God so loved the world that he gave his one and only Son, that
                whoever believes in him shall not perish but have eternal life."
              </Text>
              <Text className="text-white opacity-75" size="sm">
                John 3:16
              </Text>
            </VStack>
          </Card>
        </MotiView>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
