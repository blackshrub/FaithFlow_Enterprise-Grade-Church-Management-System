/**
 * Home Dashboard Screen
 *
 * Features:
 * - Personalized greeting based on time
 * - Verse of the Day
 * - Quick actions (animated cards)
 * - Upcoming events preview
 * - Prayer requests preview
 * - Smooth animations with Moti
 */

import React from 'react';
import { ScrollView, View, Pressable, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import { Heart, BookOpen, Calendar, Users, MessageCircle } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';

import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member } = useAuthStore();
  const [refreshing, setRefreshing] = React.useState(false);

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greeting.morning');
    if (hour < 17) return t('home.greeting.afternoon');
    if (hour < 21) return t('home.greeting.evening');
    return t('home.greeting.night');
  };

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // TODO: Refresh data
    setTimeout(() => setRefreshing(false), 1000);
  }, []);

  const quickActions = [
    {
      icon: Heart,
      label: t('giving.give'),
      color: colors.secondary[500],
      onPress: () => router.push('/give'),
    },
    {
      icon: BookOpen,
      label: t('bible.title'),
      color: colors.primary[500],
      onPress: () => router.push('/(tabs)/bible'),
    },
    {
      icon: Calendar,
      label: t('events.title'),
      color: colors.success[500],
      onPress: () => router.push('/(tabs)/events'),
    },
    {
      icon: MessageCircle,
      label: t('prayer.title'),
      color: colors.warning[600],
      onPress: () => {}, // TODO: Navigate to prayer
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
                  delay: index * 100,
                }}
                style={{ flex: 1, minWidth: '45%' }}
              >
                <Pressable
                  onPress={action.onPress}
                  className="active:opacity-80"
                >
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
                        <Icon
                          as={action.icon}
                          size="xl"
                          style={{ color: action.color }}
                        />
                      </View>
                      <Text
                        size="md"
                        className="text-gray-900 font-semibold text-center"
                      >
                        {action.label}
                      </Text>
                    </VStack>
                  </Card>
                </Pressable>
              </MotiView>
            ))}
          </View>
        </View>

        {/* Verse of the Day - Placeholder */}
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'timing', duration: 400, delay: 200 }}
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
                <Icon
                  as={BookOpen}
                  size="md"
                  className="text-white"
                />
                <Text className="text-white font-semibold" size="lg">
                  Verse of the Day
                </Text>
              </HStack>
              <Text className="text-white opacity-95" size="md">
                "For God so loved the world that he gave his one and only Son,
                that whoever believes in him shall not perish but have eternal
                life."
              </Text>
              <Text className="text-white opacity-75" size="sm">
                John 3:16
              </Text>
            </VStack>
          </Card>
        </MotiView>

        {/* Upcoming Events - Placeholder */}
        <View className="px-6 pb-6">
          <HStack className="items-center justify-between mb-4">
            <Heading size="lg" className="text-gray-900">
              {t('home.upcomingEvents')}
            </Heading>
            <Pressable onPress={() => router.push('/(tabs)/events')}>
              <Text className="text-primary-500 font-semibold">
                {t('common.viewAll')}
              </Text>
            </Pressable>
          </HStack>
          <Text className="text-gray-500 text-center py-8">
            {t('home.noEvents')}
          </Text>
        </View>

        {/* Bottom padding for tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
