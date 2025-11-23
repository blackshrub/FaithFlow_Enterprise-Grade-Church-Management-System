/**
 * Event Detail Screen
 *
 * Features:
 * - Full event details
 * - RSVP actions
 * - Share event
 * - Attendee count
 * - Location and time details
 * - Skeleton loading
 * - Complete bilingual support
 */

import React from 'react';
import { ScrollView, Pressable, Share, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import { MotiView } from 'moti';
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  MapPin,
  Users,
  Clock,
  Share2,
  Check,
  X,
  HelpCircle,
  ExternalLink,
} from 'lucide-react-native';
import {
  View,
  Text,
  Heading,
  VStack,
  HStack,
  Card,
  Icon,
  Button,
  ButtonText,
  Badge,
  BadgeText,
  Skeleton,
  SkeletonText,
} from '@gluestack-ui/themed';

import { colors, borderRadius, spacing, shadows } from '@/constants/theme';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import { QUERY_KEYS } from '@/constants/api';
import { useRSVP } from '@/hooks/useEvents';
import type { EventWithRSVP, RSVPStatus } from '@/types/events';

export default function EventDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const eventId = typeof id === 'string' ? id : id?.[0];

  // Fetch event detail
  const {
    data: event,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: [...QUERY_KEYS.EVENT_DETAIL, eventId],
    queryFn: async () => {
      const response = await api.get<EventWithRSVP>(`/api/events/${eventId}`);
      return response.data;
    },
    enabled: !!eventId,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });

  const rsvpMutation = useRSVP();

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Format time
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('id-ID', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false,
    });
  };

  // Check if event is upcoming
  const isUpcoming = event ? new Date(event.start_time) > new Date() : false;

  // Handle RSVP
  const handleRSVP = (status: RSVPStatus) => {
    if (!eventId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rsvpMutation.mutate(
      { eventId, status },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccessToast(t('events.rsvpSuccess'), t('events.rsvpSuccessDesc'));
          refetch();
        },
        onError: (error: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showErrorToast(
            t('events.rsvpError'),
            error.response?.data?.detail || t('events.rsvpErrorDesc')
          );
        },
      }
    );
  };

  // Handle share
  const handleShare = async () => {
    if (!event) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      const startDate = formatDate(event.start_time);
      const startTime = formatTime(event.start_time);
      await Share.share({
        message: `${event.title}\n\n${startDate} | ${startTime}\n${event.location}\n\n${event.description}`,
        title: event.title,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  // Handle open location
  const handleOpenLocation = () => {
    if (!event?.location) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const query = encodeURIComponent(event.location);
    const url = `https://www.google.com/maps/search/?api=1&query=${query}`;
    Linking.openURL(url);
  };

  // Get RSVP status color
  const getRSVPColor = (status: RSVPStatus) => {
    if (status === 'going') return colors.success[500];
    if (status === 'maybe') return colors.warning[600];
    if (status === 'not_going') return colors.error[500];
    return colors.gray[300];
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        {/* Header */}
        <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-200">
          <HStack space="md" className="items-center">
            <Pressable onPress={() => router.back()} className="active:opacity-60">
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  backgroundColor: colors.gray[100],
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Icon as={ChevronLeft} size="lg" className="text-gray-700" />
              </View>
            </Pressable>
            <Skeleton height={24} width={120} />
          </HStack>
        </View>

        <ScrollView className="flex-1 px-6 py-6">
          <VStack space="lg">
            <Skeleton height={200} style={{ borderRadius: borderRadius.xl }} />
            <VStack space="md">
              <Skeleton height={32} width="80%" />
              <SkeletonText lines={4} />
            </VStack>
          </VStack>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Error state
  if (isError || !event) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <Icon as={CalendarIcon} size="4xl" className="text-error-300 mb-4" />
          <Heading size="lg" className="text-gray-900 mb-2 text-center">
            {t('events.loadError')}
          </Heading>
          <Text className="text-gray-600 text-center mb-6">{t('events.loadErrorDesc')}</Text>
          <Button onPress={() => refetch()} style={{ backgroundColor: colors.primary[500] }}>
            <ButtonText>{t('common.retry')}</ButtonText>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-200">
        <HStack space="md" className="items-center justify-between">
          <HStack space="md" className="items-center flex-1">
            <Pressable onPress={() => router.back()} className="active:opacity-60">
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  backgroundColor: colors.gray[100],
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Icon as={ChevronLeft} size="lg" className="text-gray-700" />
              </View>
            </Pressable>
            <Heading size="md" className="text-gray-900 flex-1" numberOfLines={1}>
              {t('events.eventDetail')}
            </Heading>
          </HStack>
          <Pressable onPress={handleShare} className="active:opacity-60">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                backgroundColor: colors.gray[100],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon as={Share2} size="md" className="text-gray-700" />
            </View>
          </Pressable>
        </HStack>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <VStack space="lg" className="px-6 py-6">
          {/* Event Image/Header */}
          <MotiView
            from={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', duration: 400 }}
          >
            <Card
              className="overflow-hidden"
              style={{ borderRadius: borderRadius.xl, ...shadows.lg }}
            >
              <View
                className="h-48 w-full justify-center items-center relative"
                style={{ backgroundColor: colors.primary[500] }}
              >
                <Icon as={CalendarIcon} size="4xl" className="text-white opacity-30" />

                {/* RSVP Status Badge */}
                {event.rsvp_status && (
                  <View className="absolute top-4 right-4">
                    <Badge
                      variant="solid"
                      style={{
                        backgroundColor: getRSVPColor(event.rsvp_status),
                        ...shadows.md,
                      }}
                    >
                      <BadgeText className="text-white font-semibold">
                        {event.rsvp_status === 'going' && t('events.going')}
                        {event.rsvp_status === 'maybe' && t('events.maybe')}
                        {event.rsvp_status === 'not_going' && t('events.notGoing')}
                      </BadgeText>
                    </Badge>
                  </View>
                )}

                {/* Category Badge */}
                <View className="absolute bottom-4 left-4">
                  <Badge
                    variant="solid"
                    style={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', ...shadows.sm }}
                  >
                    <BadgeText className="text-gray-900 font-semibold">{event.category}</BadgeText>
                  </Badge>
                </View>
              </View>
            </Card>
          </MotiView>

          {/* Event Title */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 100 }}
          >
            <Heading size="2xl" className="text-gray-900">
              {event.title}
            </Heading>
          </MotiView>

          {/* Event Details */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 200 }}
          >
            <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
              <VStack space="md" className="p-5">
                {/* Date */}
                <HStack space="md" className="items-start">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      backgroundColor: colors.primary[50],
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Icon as={CalendarIcon} size="md" style={{ color: colors.primary[600] }} />
                  </View>
                  <VStack className="flex-1">
                    <Text className="text-gray-600" size="sm">
                      {t('events.date')}
                    </Text>
                    <Text className="text-gray-900 font-semibold" size="md">
                      {formatDate(event.start_time)}
                    </Text>
                  </VStack>
                </HStack>

                {/* Time */}
                <HStack space="md" className="items-start">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      backgroundColor: colors.secondary[50],
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Icon as={Clock} size="md" style={{ color: colors.secondary[600] }} />
                  </View>
                  <VStack className="flex-1">
                    <Text className="text-gray-600" size="sm">
                      {t('events.time')}
                    </Text>
                    <Text className="text-gray-900 font-semibold" size="md">
                      {formatTime(event.start_time)} - {formatTime(event.end_time)}
                    </Text>
                  </VStack>
                </HStack>

                {/* Location */}
                <HStack space="md" className="items-start">
                  <View
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 999,
                      backgroundColor: colors.success[50],
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                  >
                    <Icon as={MapPin} size="md" style={{ color: colors.success[600] }} />
                  </View>
                  <VStack className="flex-1">
                    <Text className="text-gray-600" size="sm">
                      {t('events.location')}
                    </Text>
                    <Pressable onPress={handleOpenLocation} className="active:opacity-60">
                      <HStack space="xs" className="items-center">
                        <Text className="text-gray-900 font-semibold flex-1" size="md">
                          {event.location}
                        </Text>
                        <Icon
                          as={ExternalLink}
                          size="sm"
                          style={{ color: colors.primary[500] }}
                        />
                      </HStack>
                    </Pressable>
                  </VStack>
                </HStack>

                {/* Attendees */}
                {event.requires_rsvp && (
                  <HStack space="md" className="items-start">
                    <View
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 999,
                        backgroundColor: colors.warning[50],
                        justifyContent: 'center',
                        alignItems: 'center',
                      }}
                    >
                      <Icon as={Users} size="md" style={{ color: colors.warning[600] }} />
                    </View>
                    <VStack className="flex-1">
                      <Text className="text-gray-600" size="sm">
                        {t('events.attendees')}
                      </Text>
                      <Text className="text-gray-900 font-semibold" size="md">
                        {event.attendee_count}
                        {event.max_attendees && ` / ${event.max_attendees}`} {t('events.people')}
                      </Text>
                      {event.is_full && (
                        <Badge
                          variant="solid"
                          className="self-start mt-1"
                          style={{ backgroundColor: colors.error[500] }}
                        >
                          <BadgeText className="text-white text-xs">{t('events.full')}</BadgeText>
                        </Badge>
                      )}
                    </VStack>
                  </HStack>
                )}
              </VStack>
            </Card>
          </MotiView>

          {/* Description */}
          <MotiView
            from={{ opacity: 0, translateY: 20 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: 'timing', duration: 300, delay: 300 }}
          >
            <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
              <VStack space="sm" className="p-5">
                <Heading size="md" className="text-gray-900">
                  {t('events.description')}
                </Heading>
                <Text className="text-gray-700 leading-relaxed">{event.description}</Text>
              </VStack>
            </Card>
          </MotiView>

          {/* RSVP Buttons - Only for upcoming events */}
          {event.requires_rsvp && isUpcoming && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: 'timing', duration: 300, delay: 400 }}
            >
              <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
                <VStack space="md" className="p-5">
                  <Heading size="md" className="text-gray-900">
                    {t('events.yourResponse')}
                  </Heading>

                  <VStack space="sm">
                    {/* Going Button */}
                    <Pressable
                      onPress={() => handleRSVP('going')}
                      disabled={rsvpMutation.isPending || event.is_full}
                      className="active:opacity-80"
                    >
                      <Card
                        style={{
                          borderRadius: borderRadius.md,
                          backgroundColor:
                            event.rsvp_status === 'going' ? colors.success[50] : '#ffffff',
                          borderWidth: 2,
                          borderColor:
                            event.rsvp_status === 'going' ? colors.success[500] : colors.gray[200],
                        }}
                      >
                        <HStack space="md" className="items-center p-4">
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 999,
                              backgroundColor:
                                event.rsvp_status === 'going'
                                  ? colors.success[500]
                                  : colors.success[50],
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Icon
                              as={Check}
                              size="md"
                              style={{
                                color:
                                  event.rsvp_status === 'going' ? '#ffffff' : colors.success[600],
                              }}
                            />
                          </View>
                          <VStack className="flex-1">
                            <Text
                              className="font-semibold"
                              size="md"
                              style={{
                                color:
                                  event.rsvp_status === 'going'
                                    ? colors.success[700]
                                    : colors.gray[900],
                              }}
                            >
                              {t('events.going')}
                            </Text>
                            <Text className="text-gray-600" size="sm">
                              {t('events.goingDesc')}
                            </Text>
                          </VStack>
                        </HStack>
                      </Card>
                    </Pressable>

                    {/* Maybe Button */}
                    <Pressable
                      onPress={() => handleRSVP('maybe')}
                      disabled={rsvpMutation.isPending}
                      className="active:opacity-80"
                    >
                      <Card
                        style={{
                          borderRadius: borderRadius.md,
                          backgroundColor:
                            event.rsvp_status === 'maybe' ? colors.warning[50] : '#ffffff',
                          borderWidth: 2,
                          borderColor:
                            event.rsvp_status === 'maybe' ? colors.warning[600] : colors.gray[200],
                        }}
                      >
                        <HStack space="md" className="items-center p-4">
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 999,
                              backgroundColor:
                                event.rsvp_status === 'maybe'
                                  ? colors.warning[600]
                                  : colors.warning[50],
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Icon
                              as={HelpCircle}
                              size="md"
                              style={{
                                color:
                                  event.rsvp_status === 'maybe' ? '#ffffff' : colors.warning[700],
                              }}
                            />
                          </View>
                          <VStack className="flex-1">
                            <Text
                              className="font-semibold"
                              size="md"
                              style={{
                                color:
                                  event.rsvp_status === 'maybe'
                                    ? colors.warning[700]
                                    : colors.gray[900],
                              }}
                            >
                              {t('events.maybe')}
                            </Text>
                            <Text className="text-gray-600" size="sm">
                              {t('events.maybeDesc')}
                            </Text>
                          </VStack>
                        </HStack>
                      </Card>
                    </Pressable>

                    {/* Not Going Button */}
                    <Pressable
                      onPress={() => handleRSVP('not_going')}
                      disabled={rsvpMutation.isPending}
                      className="active:opacity-80"
                    >
                      <Card
                        style={{
                          borderRadius: borderRadius.md,
                          backgroundColor:
                            event.rsvp_status === 'not_going' ? colors.error[50] : '#ffffff',
                          borderWidth: 2,
                          borderColor:
                            event.rsvp_status === 'not_going' ? colors.error[500] : colors.gray[200],
                        }}
                      >
                        <HStack space="md" className="items-center p-4">
                          <View
                            style={{
                              width: 40,
                              height: 40,
                              borderRadius: 999,
                              backgroundColor:
                                event.rsvp_status === 'not_going'
                                  ? colors.error[500]
                                  : colors.error[50],
                              justifyContent: 'center',
                              alignItems: 'center',
                            }}
                          >
                            <Icon
                              as={X}
                              size="md"
                              style={{
                                color:
                                  event.rsvp_status === 'not_going' ? '#ffffff' : colors.error[600],
                              }}
                            />
                          </View>
                          <VStack className="flex-1">
                            <Text
                              className="font-semibold"
                              size="md"
                              style={{
                                color:
                                  event.rsvp_status === 'not_going'
                                    ? colors.error[700]
                                    : colors.gray[900],
                              }}
                            >
                              {t('events.notGoing')}
                            </Text>
                            <Text className="text-gray-600" size="sm">
                              {t('events.notGoingDesc')}
                            </Text>
                          </VStack>
                        </HStack>
                      </Card>
                    </Pressable>
                  </VStack>
                </VStack>
              </Card>
            </MotiView>
          )}
        </VStack>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}
