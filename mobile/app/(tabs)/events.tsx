/**
 * Events Screen
 *
 * World-class UX features:
 * - Skeleton loading states
 * - Pull-to-refresh
 * - Tabs (Upcoming/Past)
 * - RSVP with optimistic updates
 * - Haptic feedback
 * - Empty states
 * - Error states with retry
 */

import React, { useState } from 'react';
import { View, Pressable, RefreshControl, Share, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  MapPin,
  Users,
  Check,
  X,
  HelpCircle,
  Share2,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollView } from '@/components/ui/scroll-view';
import { Button, ButtonText } from '@/components/ui/button';

import { useUpcomingEvents, usePastEvents, useRSVP } from '@/hooks/useEvents';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import type { EventWithRSVP, RSVPStatus } from '@/types/events';

type Tab = 'upcoming' | 'past';

export default function EventsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');

  const {
    data: upcomingEvents,
    isLoading: loadingUpcoming,
    refetch: refetchUpcoming,
    isError: errorUpcoming,
  } = useUpcomingEvents();

  const {
    data: pastEvents,
    isLoading: loadingPast,
    refetch: refetchPast,
    isError: errorPast,
  } = usePastEvents();

  const rsvpMutation = useRSVP();

  const [refreshing, setRefreshing] = useState(false);

  const events = activeTab === 'upcoming' ? upcomingEvents : pastEvents;
  const isLoading = activeTab === 'upcoming' ? loadingUpcoming : loadingPast;
  const isError = activeTab === 'upcoming' ? errorUpcoming : errorPast;

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeTab === 'upcoming') {
      await refetchUpcoming();
    } else {
      await refetchPast();
    }
    setRefreshing(false);
  };

  const handleRSVP = (eventId: string, status: RSVPStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rsvpMutation.mutate(
      { eventId, status },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('common.error'), t('events.rsvpError'));
        },
      }
    );
  };

  const handleShareEvent = async (event: EventWithRSVP) => {
    try {
      const startDate = new Date(event.start_time).toLocaleDateString();
      await Share.share({
        message: `${event.title}\n${startDate}\n${event.location}\n\n${event.description}`,
        title: event.title,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getRSVPColor = (status: RSVPStatus) => {
    if (status === 'going') return colors.success[500];
    if (status === 'maybe') return colors.warning[500];
    if (status === 'not_going') return colors.error[500];
    return colors.gray[300];
  };

  // Skeleton loading
  if (isLoading && !events) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="px-6 py-4">
          <Skeleton className="h-8 w-32 mb-4" isLoaded={false} />
          <HStack space="sm" className="mb-4">
            <Skeleton className="h-10 flex-1" isLoaded={false} />
            <Skeleton className="h-10 flex-1" isLoaded={false} />
          </HStack>
        </View>

        <ScrollView className="flex-1 px-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 w-full mb-4 rounded-xl" isLoaded={false} />
          ))}
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <Icon as={Calendar} size="4xl" className="text-error-300 mb-4" />
          <Heading size="lg" className="text-gray-900 mb-2 text-center">
            {t('events.loadError')}
          </Heading>
          <Text className="text-gray-500 text-center mb-6">
            {t('events.loadErrorDesc')}
          </Text>
          <Button onPress={handleRefresh}>
            <ButtonText>{t('common.retry')}</ButtonText>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Event card component
  const renderEvent = ({ item: event }: { item: EventWithRSVP }) => {
    return (
      <MotiView
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', delay: 100 }}
        style={{ marginBottom: spacing.md }}
      >
        <Card
          className="overflow-hidden"
          style={{ borderRadius: borderRadius.xl, ...shadows.md }}
        >
          {/* Event Image or Gradient Header */}
          <View
            className="h-32 w-full justify-center items-center relative"
            style={{ backgroundColor: colors.primary[500] }}
          >
            <Icon as={Calendar} size="3xl" className="text-white opacity-30" />

            {/* Date Badge */}
            <View className="absolute top-3 left-3">
              <View
                className="px-3 py-2 rounded-lg"
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  ...shadows.sm,
                }}
              >
                <Text className="text-gray-900 font-bold text-sm">
                  {formatDate(event.start_time)}
                </Text>
              </View>
            </View>

            {/* RSVP Status Badge */}
            {event.rsvp_status && (
              <View className="absolute top-3 right-3">
                <Badge
                  variant="solid"
                  style={{ backgroundColor: getRSVPColor(event.rsvp_status) }}
                >
                  <BadgeText className="text-white text-xs font-semibold">
                    {event.rsvp_status === 'going' && t('events.going')}
                    {event.rsvp_status === 'maybe' && t('events.maybe')}
                    {event.rsvp_status === 'not_going' && t('events.notGoing')}
                  </BadgeText>
                </Badge>
              </View>
            )}
          </View>

          {/* Event Details */}
          <View className="p-4">
            <VStack space="sm">
              <Heading size="lg" className="text-gray-900">
                {event.title}
              </Heading>

              {/* Time and Location */}
              <VStack space="xs">
                <HStack space="sm" className="items-center">
                  <Icon as={Calendar} size="sm" className="text-gray-500" />
                  <Text className="text-gray-600 text-sm">
                    {formatTime(event.start_time)} - {formatTime(event.end_time)}
                  </Text>
                </HStack>

                <HStack space="sm" className="items-center">
                  <Icon as={MapPin} size="sm" className="text-gray-500" />
                  <Text className="text-gray-600 text-sm flex-1" numberOfLines={1}>
                    {event.location}
                  </Text>
                </HStack>

                {event.requires_rsvp && (
                  <HStack space="sm" className="items-center">
                    <Icon as={Users} size="sm" className="text-gray-500" />
                    <Text className="text-gray-600 text-sm">
                      {event.attendee_count}
                      {event.max_attendees && ` / ${event.max_attendees}`}{' '}
                      {t('events.attending')}
                    </Text>
                  </HStack>
                )}
              </VStack>

              {/* Description */}
              <Text className="text-gray-700 text-sm" numberOfLines={2}>
                {event.description}
              </Text>

              {/* RSVP Buttons - Only for upcoming events */}
              {event.requires_rsvp && activeTab === 'upcoming' && (
                <HStack space="xs" className="mt-2">
                  {/* Going Button */}
                  <Pressable
                    onPress={() => handleRSVP(event._id, 'going')}
                    className="flex-1"
                    disabled={rsvpMutation.isPending}
                  >
                    <View
                      className="py-2 px-3 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor:
                          event.rsvp_status === 'going'
                            ? colors.success[500]
                            : colors.success[50],
                        borderWidth: 2,
                        borderColor:
                          event.rsvp_status === 'going'
                            ? colors.success[600]
                            : colors.success[200],
                      }}
                    >
                      <Icon
                        as={Check}
                        size="sm"
                        style={{
                          color:
                            event.rsvp_status === 'going'
                              ? '#ffffff'
                              : colors.success[700],
                        }}
                      />
                      <Text
                        className={`text-xs font-semibold mt-1 ${
                          event.rsvp_status === 'going'
                            ? 'text-white'
                            : 'text-success-700'
                        }`}
                      >
                        {t('events.going')}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Maybe Button */}
                  <Pressable
                    onPress={() => handleRSVP(event._id, 'maybe')}
                    className="flex-1"
                    disabled={rsvpMutation.isPending}
                  >
                    <View
                      className="py-2 px-3 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor:
                          event.rsvp_status === 'maybe'
                            ? colors.warning[500]
                            : colors.warning[50],
                        borderWidth: 2,
                        borderColor:
                          event.rsvp_status === 'maybe'
                            ? colors.warning[600]
                            : colors.warning[200],
                      }}
                    >
                      <Icon
                        as={HelpCircle}
                        size="sm"
                        style={{
                          color:
                            event.rsvp_status === 'maybe'
                              ? '#ffffff'
                              : colors.warning[700],
                        }}
                      />
                      <Text
                        className={`text-xs font-semibold mt-1 ${
                          event.rsvp_status === 'maybe'
                            ? 'text-white'
                            : 'text-warning-700'
                        }`}
                      >
                        {t('events.maybe')}
                      </Text>
                    </View>
                  </Pressable>

                  {/* Not Going Button */}
                  <Pressable
                    onPress={() => handleRSVP(event._id, 'not_going')}
                    className="flex-1"
                    disabled={rsvpMutation.isPending}
                  >
                    <View
                      className="py-2 px-3 rounded-lg items-center justify-center"
                      style={{
                        backgroundColor:
                          event.rsvp_status === 'not_going'
                            ? colors.error[500]
                            : colors.error[50],
                        borderWidth: 2,
                        borderColor:
                          event.rsvp_status === 'not_going'
                            ? colors.error[600]
                            : colors.error[200],
                      }}
                    >
                      <Icon
                        as={X}
                        size="sm"
                        style={{
                          color:
                            event.rsvp_status === 'not_going'
                              ? '#ffffff'
                              : colors.error[700],
                        }}
                      />
                      <Text
                        className={`text-xs font-semibold mt-1 ${
                          event.rsvp_status === 'not_going'
                            ? 'text-white'
                            : 'text-error-700'
                        }`}
                      >
                        {t('events.notGoing')}
                      </Text>
                    </View>
                  </Pressable>
                </HStack>
              )}

              {/* Share Button */}
              <Pressable onPress={() => handleShareEvent(event)} className="mt-2">
                <HStack space="xs" className="items-center justify-center py-2">
                  <Icon as={Share2} size="sm" className="text-primary-500" />
                  <Text className="text-primary-500 font-semibold text-sm">
                    {t('common.share')}
                  </Text>
                </HStack>
              </Pressable>
            </VStack>
          </View>
        </Card>
      </MotiView>
    );
  };

  // Empty state
  const EmptyState = () => (
    <View className="flex-1 items-center justify-center px-8 py-12">
      <Icon as={Calendar} size="4xl" className="text-gray-300 mb-4" />
      <Heading size="lg" className="text-gray-900 mb-2 text-center">
        {activeTab === 'upcoming'
          ? t('events.noUpcomingEvents')
          : t('events.noPastEvents')}
      </Heading>
      <Text className="text-gray-500 text-center mb-6">
        {activeTab === 'upcoming'
          ? t('events.noUpcomingEventsDesc')
          : t('events.noPastEventsDesc')}
      </Text>
      <Button onPress={handleRefresh}>
        <ButtonText>{t('common.refresh')}</ButtonText>
      </Button>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-6 py-4">
        <Heading size="2xl" className="text-gray-900 mb-4">
          {t('events.title')}
        </Heading>

        {/* Tabs */}
        <HStack space="sm">
          <Pressable
            onPress={() => {
              setActiveTab('upcoming');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            className="flex-1"
          >
            <View
              className="py-3 px-4 rounded-lg items-center"
              style={{
                backgroundColor:
                  activeTab === 'upcoming' ? colors.primary[500] : colors.gray[100],
              }}
            >
              <Text
                className={`font-semibold ${
                  activeTab === 'upcoming' ? 'text-white' : 'text-gray-700'
                }`}
              >
                {t('events.upcoming')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => {
              setActiveTab('past');
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }}
            className="flex-1"
          >
            <View
              className="py-3 px-4 rounded-lg items-center"
              style={{
                backgroundColor:
                  activeTab === 'past' ? colors.primary[500] : colors.gray[100],
              }}
            >
              <Text
                className={`font-semibold ${
                  activeTab === 'past' ? 'text-white' : 'text-gray-700'
                }`}
              >
                {t('events.past')}
              </Text>
            </View>
          </Pressable>
        </HStack>
      </View>

      {/* Event List */}
      {events && events.length > 0 ? (
        <FlashList
          data={events}
          renderItem={renderEvent}
          estimatedItemSize={300}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 100,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        >
          <EmptyState />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
