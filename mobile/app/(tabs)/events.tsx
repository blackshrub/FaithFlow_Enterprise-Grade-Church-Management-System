/**
 * Events Screen - World-Class UI/UX
 *
 * Premium features:
 * - Segmented tab control with smooth animations
 * - Sophisticated event cards with proper hierarchy
 * - Category filtering with beautiful bottom sheet
 * - Micro-interactions and haptic feedback
 * - Professional skeleton loading
 * - Engaging empty states
 * - Pull-to-refresh with custom indicator
 */

import React, { useState } from 'react';
import { View, Pressable, RefreshControl, Share, Alert, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  Calendar,
  MapPin,
  Users,
  Check,
  X,
  Share2,
  Clock,
  Tag,
  Filter,
  ChevronRight,
  Sparkles,
  Info,
  Star,
  CheckCircle2,
  Edit3,
} from 'lucide-react-native';
import { MotiView } from 'moti';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';

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

import {
  useUpcomingEvents,
  useMyRSVPs,
  useAttendedEvents,
  useRSVP,
  useCancelRSVP,
  useEventCategories,
} from '@/hooks/useEvents';
import { useAuthStore } from '@/stores/auth';
import { useCategoryFilterStore } from '@/stores/categoryFilter';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import type { EventWithMemberStatus } from '@/types/events';
import { RatingReviewModal } from '@/components/modals/RatingReviewModal';
import { ratingService } from '@/services/ratingService';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type Tab = 'upcoming' | 'my_rsvps' | 'attended';

export default function EventsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member } = useAuthStore();
  const [activeTab, setActiveTab] = useState<Tab>('upcoming');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [slideDirection, setSlideDirection] = useState<number>(30); // positive = from right, negative = from left

  // Category filter store
  const categoryFilterStore = useCategoryFilterStore();

  // Fetch data for all tabs
  const upcomingQuery = useUpcomingEvents(
    selectedCategory ? { event_category_id: selectedCategory } : undefined
  );
  const rsvpsQuery = useMyRSVPs(
    selectedCategory ? { event_category_id: selectedCategory } : undefined
  );
  const attendedQuery = useAttendedEvents(
    selectedCategory ? { event_category_id: selectedCategory } : undefined
  );

  const { data: categories = [] } = useEventCategories();

  const rsvpMutation = useRSVP();
  const cancelRSVPMutation = useCancelRSVP();

  const [refreshing, setRefreshing] = useState(false);

  // Rating & Review Modal State
  const queryClient = useQueryClient();
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [selectedEventForRating, setSelectedEventForRating] = useState<EventWithMemberStatus | null>(null);
  const [existingRating, setExistingRating] = useState<number | undefined>(undefined);
  const [existingReview, setExistingReview] = useState<string | undefined>(undefined);

  // Handle category filter open
  const handleOpenCategoryFilter = () => {
    console.log('[EventsScreen] open() called');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    categoryFilterStore.open(categories, selectedCategory, (categoryId) => {
      console.log('[EventsScreen] Callback triggered');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedCategory(categoryId);
    });
  };

  // Handle tab change with directional animation
  const handleTabChange = (newTab: Tab) => {
    const tabs: Tab[] = ['upcoming', 'my_rsvps', 'attended'];
    const currentIndex = tabs.indexOf(activeTab);
    const newIndex = tabs.indexOf(newTab);

    // Forward (left): positive translateX (slide from right)
    // Backward (right): negative translateX (slide from left)
    setSlideDirection(newIndex > currentIndex ? 30 : -30);
    setActiveTab(newTab);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  // Get current tab data
  const getCurrentTabData = () => {
    if (activeTab === 'upcoming') return upcomingQuery;
    if (activeTab === 'my_rsvps') return rsvpsQuery;
    return attendedQuery;
  };

  const { data: events = [], isLoading, isError, refetch } = getCurrentTabData();

  const handleRefresh = async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  };

  const handleRSVP = (eventId: string) => {
    if (!member?.id) {
      Alert.alert(t('common.error'), 'Member ID not available');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    rsvpMutation.mutate(
      { eventId, member_id: member.id },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert(
            t('common.success'),
            t('events.rsvpSuccess'),
            [{ text: t('common.ok'), style: 'default' }]
          );
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('common.error'), t('events.rsvpError'));
        },
      }
    );
  };

  const handleCancelRSVP = (eventId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('events.cancelRSVPTitle'),
      t('events.cancelRSVPMessage'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            cancelRSVPMutation.mutate(
              { eventId },
              {
                onSuccess: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                },
                onError: () => {
                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                  Alert.alert(t('common.error'), t('events.cancelError'));
                },
              }
            );
          },
        },
      ]
    );
  };

  const handleShareEvent = async (event: EventWithMemberStatus) => {
    try {
      const eventDate = event.event_date
        ? new Date(event.event_date).toLocaleDateString()
        : '';
      await Share.share({
        message: `${event.name}\n${eventDate}\n${event.location || ''}\n\n${event.description || ''}`,
        title: event.name,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Error sharing event:', error);
    }
  };

  // Rating & Review Mutation
  const submitRatingMutation = useMutation({
    mutationFn: ({ eventId, rating, review }: { eventId: string; rating: number; review: string }) =>
      ratingService.createRating({
        event_id: eventId,
        member_id: member?.id || '',
        rating,
        review: review || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attended-events'] });
      setRatingModalVisible(false);
      setSelectedEventForRating(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(t('common.success'), 'Thank you for your feedback!');
    },
    onError: (error: any) => {
      console.error('Error submitting rating:', error);
      Alert.alert(t('common.error'), error.response?.data?.detail || 'Failed to submit rating. Please try again.');
    },
  });

  const handleOpenRatingModal = (event: EventWithMemberStatus, rating?: number, review?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedEventForRating(event);
    setExistingRating(rating);
    setExistingReview(review);
    setRatingModalVisible(true);
  };

  // DUMMY: Check if event has been rated (for demo purposes)
  // In production, this would check against actual API data
  const getEventRating = (eventId: string): { rated: boolean; rating?: number; review?: string } => {
    // Simulate some events having ratings based on event ID hash
    const hash = eventId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hasRating = hash % 3 === 0; // ~33% of events have ratings

    if (hasRating) {
      // Simulate different rating values
      const ratings = [7, 8, 9, 6, 10];
      const rating = ratings[hash % ratings.length];
      return {
        rated: true,
        rating,
        review: 'Great event! Really enjoyed it.',
      };
    }

    return { rated: false };
  };

  const handleCloseRatingModal = () => {
    setRatingModalVisible(false);
    setSelectedEventForRating(null);
    setExistingRating(undefined);
    setExistingReview(undefined);
  };

  const handleSubmitRating = (rating: number, review: string) => {
    if (!selectedEventForRating || !member) return;

    submitRatingMutation.mutate({
      eventId: selectedEventForRating.id,
      rating,
      review,
    });
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getEventTypeGradient = (eventType: 'single' | 'series'): [string, string] => {
    return eventType === 'series'
      ? ['#8B5CF6', '#6366F1'] // Purple to indigo
      : ['#3B82F6', '#2563EB']; // Blue gradient
  };

  const getCategoryColor = (categoryId?: string) => {
    const category = categories.find((c) => c.id === categoryId);
    return category?.color || colors.primary[500];
  };

  // Skeleton loading with premium design
  if (isLoading && events.length === 0) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        {/* Header Skeleton */}
        <View className="px-6 py-6">
          <Skeleton className="h-9 w-40 mb-6" isLoaded={false} />

          {/* Segmented Control Skeleton */}
          <View className="bg-gray-100 p-1 rounded-2xl mb-4">
            <HStack space="xs">
              <Skeleton className="h-10 flex-1 rounded-xl" isLoaded={false} />
              <Skeleton className="h-10 flex-1 rounded-xl" isLoaded={false} />
              <Skeleton className="h-10 flex-1 rounded-xl" isLoaded={false} />
            </HStack>
          </View>

          {/* Filter Skeleton */}
          <Skeleton className="h-11 w-32 rounded-xl" isLoaded={false} />
        </View>

        {/* Event Cards Skeleton */}
        <ScrollView className="flex-1 px-6">
          <VStack space="lg">
            {[1, 2, 3].map((i) => (
              <View key={i}>
                <Skeleton className="h-40 w-full rounded-2xl mb-3" isLoaded={false} />
                <Skeleton className="h-6 w-3/4 mb-2" isLoaded={false} />
                <Skeleton className="h-4 w-1/2" isLoaded={false} />
              </View>
            ))}
          </VStack>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Premium error state
  if (isError) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="flex-1 items-center justify-center px-8">
          <MotiView
            from={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring' }}
          >
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-6"
              style={{ backgroundColor: colors.error[50] }}
            >
              <Icon as={Calendar} size="2xl" className="text-error-500" />
            </View>
          </MotiView>

          <Heading size="xl" className="text-gray-900 mb-3 text-center font-bold">
            {t('events.loadError')}
          </Heading>
          <Text className="text-gray-500 text-center mb-8 text-base leading-6">
            {t('events.loadErrorDesc')}
          </Text>

          <Button onPress={handleRefresh} size="lg" className="px-8">
            <ButtonText className="font-semibold">{t('common.retry')}</ButtonText>
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  // Premium event card
  const renderEvent = ({ item: event, index }: { item: EventWithMemberStatus; index: number }) => {
    const showRSVPButton = activeTab === 'upcoming' && event.requires_rsvp && event.can_rsvp;
    const showNoRSVPButton = activeTab === 'upcoming' && !event.requires_rsvp;
    const showCancelButton = activeTab === 'my_rsvps' && event.my_rsvp;
    const showAttendedBadge = activeTab === 'attended' && event.my_attendance;
    const [gradientStart, gradientEnd] = getEventTypeGradient(event.event_type);

    return (
      <MotiView
        from={{ translateX: slideDirection }}
        animate={{ translateX: 0 }}
        transition={{ type: 'timing', duration: 300 }}
        style={{ marginBottom: spacing.lg }}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/events/${event.id}` as any);
          }}
          className="active:opacity-95 active:scale-[0.99]"
        >
          <Card
            className="overflow-hidden"
            style={{
              borderRadius: borderRadius['2xl'],
              ...shadows.lg,
              backgroundColor: '#FFFFFF',
            }}
          >
            {/* Premium Image Header - 2:1 Aspect Ratio */}
            <View className="w-full" style={{ aspectRatio: 2 }}>
              {event.event_photo ? (
                <>
                  {/* Photo with clean overlay - no gradient */}
                  <Image
                    source={{ uri: event.event_photo }}
                    style={{ width: '100%', height: '100%', position: 'absolute' }}
                    contentFit="cover"
                  />
                  <View className="h-full w-full justify-between p-4">
                    {/* Top Row: Date & Type Badge (only for series) */}
                    <HStack className="justify-between items-start">
                      <View
                        className="px-4 py-2.5 rounded-xl"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          ...shadows.sm,
                        }}
                      >
                        <Text className="text-gray-900 font-bold text-sm">
                          {formatDate(event.event_date)}
                        </Text>
                      </View>

                      {/* Only show badge for series events */}
                      {event.event_type === 'series' && (
                        <View
                          className="px-3 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            ...shadows.sm,
                          }}
                        >
                          <Text className="text-gray-700 text-xs font-bold uppercase tracking-wider">
                            {t('events.series')}
                          </Text>
                        </View>
                      )}
                    </HStack>

                    {/* Bottom Row: Attended Badge */}
                    {showAttendedBadge && (
                      <HStack className="items-center">
                        <View
                          className="px-4 py-2 rounded-lg flex-row items-center"
                          style={{ backgroundColor: colors.success[500] }}
                        >
                          <Icon as={Check} size="sm" className="text-white mr-2" />
                          <Text className="text-white text-sm font-bold">
                            {t('events.attended')}
                          </Text>
                        </View>
                      </HStack>
                    )}
                  </View>
                </>
              ) : (
                <>
                  {/* No photo - use gradient background */}
                  <LinearGradient
                    colors={[gradientStart, gradientEnd]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0, y: 1 }}
                    className="h-full w-full justify-between p-4"
                  >
                    {/* Top Row: Date & Type Badge (only for series) */}
                    <HStack className="justify-between items-start">
                      <View
                        className="px-4 py-2.5 rounded-xl"
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.95)',
                          ...shadows.sm,
                        }}
                      >
                        <Text className="text-gray-900 font-bold text-sm">
                          {formatDate(event.event_date)}
                        </Text>
                      </View>

                      {/* Only show badge for series events */}
                      {event.event_type === 'series' && (
                        <View
                          className="px-3 py-1.5 rounded-lg"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            ...shadows.sm,
                          }}
                        >
                          <Text className="text-gray-700 text-xs font-bold uppercase tracking-wider">
                            {t('events.series')}
                          </Text>
                        </View>
                      )}
                    </HStack>

                    {/* Bottom Row: Attended Badge */}
                    {showAttendedBadge && (
                      <HStack className="items-center">
                        <View
                          className="px-4 py-2 rounded-lg flex-row items-center"
                          style={{ backgroundColor: colors.success[500] }}
                        >
                          <Icon as={Check} size="sm" className="text-white mr-2" />
                          <Text className="text-white text-sm font-bold">
                            {t('events.attended')}
                          </Text>
                        </View>
                      </HStack>
                    )}
                  </LinearGradient>
                </>
              )}
            </View>

            {/* Event Content */}
            <View className="p-5">
              <VStack space="md">
                {/* Title Section */}
                <View>
                  <Heading size="xl" className="text-gray-900 font-bold leading-7 mb-1">
                    {event.name}
                  </Heading>
                  {event.event_category_id && (
                    <View className="flex-row items-center mt-1">
                      <View
                        className="w-2 h-2 rounded-full mr-2"
                        style={{ backgroundColor: getCategoryColor(event.event_category_id) }}
                      />
                      <Text className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                        {categories.find((c) => c.id === event.event_category_id)?.name || ''}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Meta Information */}
                <VStack space="sm">
                  {event.event_date && (
                    <HStack space="sm" className="items-center">
                      <View
                        className="w-9 h-9 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.primary[50] }}
                      >
                        <Icon as={Clock} size="sm" className="text-primary-600" />
                      </View>
                      <Text className="text-gray-700 text-sm font-medium flex-1">
                        {formatTime(event.event_date)}
                        {event.event_end_date && ` - ${formatTime(event.event_end_date)}`}
                      </Text>
                    </HStack>
                  )}

                  {event.location && (
                    <HStack space="sm" className="items-center">
                      <View
                        className="w-9 h-9 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.primary[50] }}
                      >
                        <Icon as={MapPin} size="sm" className="text-primary-600" />
                      </View>
                      <Text className="text-gray-700 text-sm font-medium flex-1" numberOfLines={1}>
                        {event.location}
                      </Text>
                    </HStack>
                  )}

                  {event.requires_rsvp && (
                    <HStack space="sm" className="items-center">
                      <View
                        className="w-9 h-9 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.primary[50] }}
                      >
                        <Icon as={Users} size="sm" className="text-primary-600" />
                      </View>
                      <HStack className="items-center flex-1" space="sm">
                        <Text className="text-gray-700 text-sm font-medium">
                          {event.total_rsvps}
                          {event.seat_capacity && ` / ${event.seat_capacity}`} {t('events.registered')}
                        </Text>
                        {event.available_seats !== undefined && event.available_seats > 0 && (
                          <Badge
                            variant="solid"
                            size="sm"
                            style={{ backgroundColor: colors.success[100] }}
                          >
                            <BadgeText className="text-success-700 text-xs font-bold">
                              {event.available_seats} {t('events.seatsLeft')}
                            </BadgeText>
                          </Badge>
                        )}
                      </HStack>
                    </HStack>
                  )}

                  {/* Series Sessions */}
                  {event.event_type === 'series' && event.sessions.length > 0 && (
                    <HStack space="sm" className="items-center">
                      <View
                        className="w-9 h-9 rounded-lg items-center justify-center"
                        style={{ backgroundColor: colors.secondary[50] }}
                      >
                        <Icon as={Tag} size="sm" className="text-secondary-600" />
                      </View>
                      <Text className="text-gray-700 text-sm font-medium">
                        {event.sessions.length} {t('events.sessions')}
                      </Text>
                    </HStack>
                  )}
                </VStack>

                {/* Description */}
                {event.description && (
                  <Text className="text-gray-600 text-sm leading-5" numberOfLines={2}>
                    {event.description}
                  </Text>
                )}

                {/* Action Buttons - Horizontal Layout */}
                <HStack space="sm" className="mt-2">
                  {showRSVPButton && (
                    <View className="flex-1">
                      <Button
                        onPress={() => handleRSVP(event.id)}
                        disabled={rsvpMutation.isPending}
                        size="lg"
                        variant="solid"
                      >
                        <Icon as={Check} size="sm" className="text-white mr-2" />
                        <ButtonText className="font-bold">{t('events.rsvpNow')}</ButtonText>
                        <Icon as={ChevronRight} size="sm" className="text-white ml-1" />
                      </Button>
                    </View>
                  )}

                  {showNoRSVPButton && (
                    <View className="flex-1">
                      <Button size="lg" variant="outline" disabled={true}>
                        <Icon as={Info} size="sm" className="text-gray-400 mr-2" />
                        <ButtonText className="font-bold text-gray-400">
                          {t('events.noRSVPRequired')}
                        </ButtonText>
                      </Button>
                    </View>
                  )}

                  {showCancelButton && (
                    <View className="flex-1">
                      <Button
                        onPress={() => handleCancelRSVP(event.id)}
                        disabled={cancelRSVPMutation.isPending}
                        size="lg"
                        variant="outline"
                        action="negative"
                      >
                        <Icon as={X} size="sm" className="text-error-600 mr-2" />
                        <ButtonText className="font-bold">{t('events.cancelRSVP')}</ButtonText>
                      </Button>
                    </View>
                  )}

                  {/* Rate & Review Button (Attended tab) or Share Button (Other tabs) */}
                  {activeTab === 'attended' ? (
                    (() => {
                      const ratingData = getEventRating(event.id);
                      const getRatingColor = (rating: number) => {
                        if (rating >= 8) return colors.success[500];
                        if (rating >= 6) return colors.primary[500];
                        if (rating >= 4) return colors.warning[500];
                        return colors.error[500];
                      };

                      return ratingData.rated ? (
                        // Already Rated - Show summary + Edit button
                        <View className="flex-1">
                          <View
                            className="rounded-xl p-3"
                            style={{
                              backgroundColor: colors.gray[50],
                              borderWidth: 1,
                              borderColor: colors.gray[200],
                            }}
                          >
                            <HStack className="items-center justify-between mb-2">
                              <HStack className="items-center" space="xs">
                                <Icon as={CheckCircle2} size="sm" style={{ color: colors.success[600] }} />
                                <Text className="text-gray-700 text-sm font-semibold">
                                  {t('rating.title')}
                                </Text>
                              </HStack>
                              <View
                                className="px-3 py-1 rounded-full"
                                style={{ backgroundColor: getRatingColor(ratingData.rating!) }}
                              >
                                <Text className="text-white text-xs font-bold">
                                  {ratingData.rating}/10
                                </Text>
                              </View>
                            </HStack>
                            <Button
                              onPress={() => handleOpenRatingModal(event, ratingData.rating, ratingData.review)}
                              size="sm"
                              variant="outline"
                              style={{ borderColor: colors.gray[300] }}
                            >
                              <Icon as={Edit3} size="xs" className="text-gray-600 mr-1.5" />
                              <ButtonText className="font-semibold text-gray-700 text-xs">
                                {t('rating.editButton')}
                              </ButtonText>
                            </Button>
                          </View>
                        </View>
                      ) : (
                        // Not Rated - Show Rate & Review button
                        <View className="flex-1">
                          <Button
                            onPress={() => handleOpenRatingModal(event)}
                            size="lg"
                            variant="solid"
                            style={{ backgroundColor: colors.secondary[500] }}
                          >
                            <Icon as={Star} size="sm" className="text-white mr-2" />
                            <ButtonText className="font-bold">{t('rating.title')}</ButtonText>
                          </Button>
                        </View>
                      );
                    })()
                  ) : (
                    <Pressable
                      onPress={() => handleShareEvent(event)}
                      className="active:opacity-70"
                    >
                      <View
                        className="rounded-xl items-center justify-center"
                        style={{
                          backgroundColor: colors.primary[50],
                          width: 48,
                          height: 48,
                        }}
                      >
                        <Icon as={Share2} size="md" className="text-primary-600" />
                      </View>
                    </Pressable>
                  )}
                </HStack>
              </VStack>
            </View>
          </Card>
        </Pressable>
      </MotiView>
    );
  };

  // Premium empty state
  const EmptyState = () => {
    let title = '';
    let description = '';
    let icon = Calendar;

    if (activeTab === 'upcoming') {
      title = t('events.noUpcomingEvents');
      description = t('events.noUpcomingEventsDesc');
      icon = Calendar;
    } else if (activeTab === 'my_rsvps') {
      title = t('events.noRSVPs');
      description = t('events.noRSVPsDesc');
      icon = Calendar;
    } else {
      title = t('events.noAttended');
      description = t('events.noAttendedDesc');
      icon = Sparkles;
    }

    return (
      <View className="flex-1 items-center justify-center px-8 py-16">
        <MotiView
          from={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', delay: 200 }}
        >
          <View
            className="w-24 h-24 rounded-full items-center justify-center mb-6"
            style={{ backgroundColor: colors.gray[100] }}
          >
            <Icon as={icon} size="3xl" className="text-gray-400" />
          </View>
        </MotiView>

        <Heading size="xl" className="text-gray-900 mb-3 text-center font-bold">
          {title}
        </Heading>
        <Text className="text-gray-500 text-center mb-8 text-base leading-6 max-w-sm">
          {description}
        </Text>

        <Button onPress={handleRefresh} size="lg" className="px-8">
          <ButtonText className="font-semibold">{t('common.refresh')}</ButtonText>
        </Button>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Premium Header */}
      <View className="px-6 pt-6 pb-4">
        <Heading size="3xl" className="text-gray-900 mb-6 font-bold">
          {t('events.title')}
        </Heading>

        {/* Segmented Control - iOS Style */}
        <View
          className="p-1 mb-4"
          style={{
            backgroundColor: colors.gray[100],
            borderRadius: borderRadius['2xl'],
          }}
        >
          <HStack space="xs">
            {(['upcoming', 'my_rsvps', 'attended'] as Tab[]).map((tab) => {
              const isActive = activeTab === tab;
              return (
                <Pressable
                  key={tab}
                  onPress={() => handleTabChange(tab)}
                  className="flex-1"
                >
                  <View
                    style={{
                      paddingVertical: spacing.md,
                      paddingHorizontal: spacing.sm,
                      borderRadius: borderRadius.xl,
                      alignItems: 'center',
                      backgroundColor: isActive ? colors.white : 'transparent',
                      ...(isActive ? shadows.sm : {}),
                    }}
                  >
                    <Text
                      className={`font-bold text-sm ${
                        isActive ? 'text-primary-600' : 'text-gray-600'
                      }`}
                      numberOfLines={1}
                    >
                      {tab === 'upcoming' && t('events.upcoming')}
                      {tab === 'my_rsvps' && t('events.myRSVPs')}
                      {tab === 'attended' && t('events.attended')}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </HStack>
        </View>

        {/* Category Filter Button */}
        {categories.length > 0 && (
          <Pressable onPress={handleOpenCategoryFilter} className="active:opacity-70">
            <HStack
              space="sm"
              className="items-center px-4 py-3 rounded-xl"
              style={{ backgroundColor: colors.white, ...shadows.sm }}
            >
              <Icon as={Filter} size="sm" className="text-primary-600" />
              <Text className="text-primary-600 font-bold text-sm flex-1">
                {selectedCategory
                  ? categories.find((c) => c.id === selectedCategory)?.name
                  : t('events.allCategories')}
              </Text>
              <Icon as={ChevronRight} size="sm" className="text-primary-400" />
            </HStack>
          </Pressable>
        )}
      </View>

      {/* Event List */}
      {events && events.length > 0 ? (
        <FlashList
          key={activeTab}
          data={events}
          renderItem={renderEvent}
          estimatedItemSize={380}
          contentContainerStyle={{
            paddingHorizontal: spacing.lg,
            paddingBottom: 120,
            paddingTop: spacing.sm,
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary[500]}
            />
          }
        />
      ) : (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.primary[500]}
            />
          }
        >
          <EmptyState />
        </ScrollView>
      )}

      {/* Rating & Review Modal */}
      {selectedEventForRating && (
        <RatingReviewModal
          visible={ratingModalVisible}
          onClose={handleCloseRatingModal}
          onSubmit={handleSubmitRating}
          eventName={selectedEventForRating.name}
          isSubmitting={submitRatingMutation.isPending}
          existingRating={existingRating}
          existingReview={existingReview}
        />
      )}
    </SafeAreaView>
  );
}
