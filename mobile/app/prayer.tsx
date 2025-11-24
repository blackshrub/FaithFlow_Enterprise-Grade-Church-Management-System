/**
 * Prayer Requests Screen
 *
 * Features:
 * - All prayer requests with filters (Active/Answered)
 * - "I'm Praying" button with animation
 * - Submit new prayer request
 * - My prayers tab
 * - Mark as answered with testimony
 * - Skeleton loading
 * - Pull-to-refresh
 * - Complete bilingual support (EN/ID)
 */

import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import {
  View,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  Button,
  ButtonText,
  Icon,
  Badge,
  BadgeText,
  Pressable,
} from '@gluestack-ui/themed';
import { Skeleton } from '@/components/ui/skeleton';
import { SkeletonText } from '@/components/ui/skeleton';
import {
  Heart,
  Sparkles,
  User,
  Calendar,
  Tag,
  ChevronLeft,
  Plus,
  RefreshCw,
  CheckCircle2,
  Users,
} from 'lucide-react-native';

import {
  usePrayerRequests,
  useMyPrayerRequests,
  usePrayForRequest,
  useMarkAsAnswered,
} from '@/hooks/usePrayer';
import type { PrayerRequestWithStatus, PrayerStatus } from '@/types/prayer';
import { colors, borderRadius, shadows, spacing } from '@/constants/theme';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';

export default function PrayerRequestsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [statusFilter, setStatusFilter] = useState<PrayerStatus | 'all'>('all');

  // Queries
  const {
    data: allRequests,
    isLoading: allLoading,
    error: allError,
    refetch: refetchAll,
  } = usePrayerRequests(statusFilter === 'all' ? undefined : statusFilter);

  const {
    data: myRequests,
    isLoading: myLoading,
    error: myError,
    refetch: refetchMy,
  } = useMyPrayerRequests();

  const { mutate: prayForRequest, isPending: isPraying } = usePrayForRequest();
  const { mutate: markAsAnswered, isPending: isMarkingAnswered } = useMarkAsAnswered();

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchAll(), refetchMy()]);
    setRefreshing(false);
  }, [refetchAll, refetchMy]);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'all' | 'my') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  // Handle filter change
  const handleFilterChange = useCallback((filter: PrayerStatus | 'all') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStatusFilter(filter);
  }, []);

  // Handle pray
  const handlePray = useCallback(
    (requestId: string, title: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      prayForRequest(requestId, {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccessToast(
            t('prayer.iPrayedForThis'),
            t('prayer.prayedSuccess', { title })
          );
        },
        onError: (error: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          showErrorToast(
            t('common.error'),
            error.response?.data?.detail || t('prayer.prayError')
          );
        },
      });
    },
    [prayForRequest, t]
  );

  // Handle mark as answered
  const handleMarkAnswered = useCallback(
    (requestId: string, title: string) => {
      Alert.alert(
        t('prayer.markAnswered'),
        t('prayer.markAnsweredConfirm'),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
          },
          {
            text: t('common.yes'),
            onPress: () => {
              markAsAnswered(
                { requestId },
                {
                  onSuccess: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    showSuccessToast(
                      t('common.success'),
                      t('prayer.markedAnsweredSuccess', { title })
                    );
                  },
                  onError: (error: any) => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    showErrorToast(
                      t('common.error'),
                      error.response?.data?.detail || t('common.somethingWentWrong')
                    );
                  },
                }
              );
            },
          },
        ]
      );
    },
    [markAsAnswered, t]
  );

  // Format date
  const formatDate = useCallback((date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }, []);

  // Get category color
  const getCategoryColor = useCallback((category: string) => {
    switch (category) {
      case 'health':
        return colors.error[500];
      case 'family':
        return colors.secondary[500];
      case 'financial':
        return colors.success[500];
      case 'spiritual':
        return colors.primary[500];
      case 'work':
        return colors.warning[500];
      case 'relationships':
        return colors.error[300];
      case 'guidance':
        return colors.primary[300];
      case 'thanksgiving':
        return colors.success[300];
      default:
        return colors.muted[500];
    }
  }, []);

  // Render skeleton
  const renderSkeleton = () => (
    <VStack space="md" className="p-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <VStack space="sm">
            <Skeleton height={24} width="80%" />
            <SkeletonText lines={3} />
            <HStack space="xs">
              <Skeleton height={28} width={80} style={{ borderRadius: 999 }} />
              <Skeleton height={28} width={80} style={{ borderRadius: 999 }} />
            </HStack>
          </VStack>
        </Card>
      ))}
    </VStack>
  );

  // Render empty state
  const renderEmpty = (message: string) => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
      }}
    >
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 999,
          backgroundColor: colors.primary[100],
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <Icon as={Heart} size="3xl" style={{ color: colors.primary[500] }} />
      </View>
      <Heading size="lg" className="text-center mb-2">
        {message}
      </Heading>
      <Button
        size="sm"
        variant="outline"
        onPress={onRefresh}
        style={{ marginTop: spacing.md }}
      >
        <Icon as={RefreshCw} size="sm" className="mr-2" />
        <ButtonText>{t('common.refresh')}</ButtonText>
      </Button>
    </MotiView>
  );

  // Render error state
  const renderError = (error: any) => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        paddingHorizontal: spacing.lg,
      }}
    >
      <Heading size="lg" className="text-center mb-2">
        {t('common.error')}
      </Heading>
      <Text className="text-center text-muted-600 mb-4">
        {error?.message || t('common.somethingWentWrong')}
      </Text>
      <Button size="md" onPress={onRefresh}>
        <Icon as={RefreshCw} size="sm" className="mr-2" />
        <ButtonText>{t('common.retry')}</ButtonText>
      </Button>
    </MotiView>
  );

  // Render prayer request card
  const renderPrayerCard = (request: PrayerRequestWithStatus, isMyRequest: boolean = false) => {
    const categoryColor = getCategoryColor(request.category);

    return (
      <MotiView
        key={request._id}
        from={{ opacity: 0, translateY: 20 }}
        animate={{ opacity: 1, translateY: 0 }}
        transition={{ type: 'spring', damping: 15 }}
      >
        <Card
          style={{
            borderRadius: borderRadius.xl,
            ...shadows.md,
            borderLeftWidth: 4,
            borderLeftColor: categoryColor,
          }}
        >
          <VStack space="sm" className="p-4">
            {/* Header */}
            <HStack className="justify-between items-start">
              <VStack space="xs" style={{ flex: 1 }}>
                <Heading size="md">{request.title}</Heading>
                <HStack className="items-center" space="xs">
                  <Icon as={User} size="xs" style={{ color: colors.muted[500] }} />
                  <Text size="sm" className="text-muted-600">
                    {request.is_anonymous ? t('prayer.anonymous') : request.member_name}
                  </Text>
                </HStack>
              </VStack>

              {request.is_answered && (
                <Badge
                  size="sm"
                  style={{
                    backgroundColor: colors.success[500],
                  }}
                >
                  <Icon
                    as={CheckCircle2}
                    size="2xs"
                    style={{ color: '#ffffff', marginRight: 4 }}
                  />
                  <BadgeText style={{ color: '#ffffff' }}>
                    {t('prayer.answered')}
                  </BadgeText>
                </Badge>
              )}
            </HStack>

            {/* Description */}
            <Text size="sm" className="text-muted-700" numberOfLines={3}>
              {request.description}
            </Text>

            {/* Metadata */}
            <HStack space="md" className="flex-wrap">
              <HStack className="items-center" space="xs">
                <Icon as={Tag} size="xs" style={{ color: categoryColor }} />
                <Text size="xs" className="text-muted-600">
                  {t(`prayer.categories.${request.category}`)}
                </Text>
              </HStack>
              <HStack className="items-center" space="xs">
                <Icon as={Calendar} size="xs" style={{ color: colors.muted[500] }} />
                <Text size="xs" className="text-muted-600">
                  {formatDate(request.created_at)}
                </Text>
              </HStack>
              <HStack className="items-center" space="xs">
                <Icon as={Users} size="xs" style={{ color: colors.muted[500] }} />
                <Text size="xs" className="text-muted-600">
                  {t('prayer.prayedCount', { count: request.prayer_count })}
                </Text>
              </HStack>
            </HStack>

            {/* Actions */}
            {!request.is_answered && (
              <HStack space="xs" className="mt-2">
                {!request.has_prayed && !isMyRequest && (
                  <Button
                    size="sm"
                    onPress={() => handlePray(request._id, request.title)}
                    isDisabled={isPraying}
                    style={{
                      flex: 1,
                      backgroundColor: colors.primary[500],
                      borderRadius: borderRadius.lg,
                    }}
                  >
                    <Icon as={Heart} size="sm" className="mr-1" />
                    <ButtonText>{t('prayer.iPrayedForThis')}</ButtonText>
                  </Button>
                )}

                {request.has_prayed && !isMyRequest && (
                  <Badge
                    size="md"
                    style={{
                      flex: 1,
                      backgroundColor: colors.primary[50],
                      paddingVertical: spacing.xs,
                    }}
                  >
                    <Icon
                      as={CheckCircle2}
                      size="sm"
                      style={{ color: colors.primary[600], marginRight: 4 }}
                    />
                    <BadgeText style={{ color: colors.primary[900] }}>
                      {t('prayer.youPrayed')}
                    </BadgeText>
                  </Badge>
                )}

                {isMyRequest && (
                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => handleMarkAnswered(request._id, request.title)}
                    isDisabled={isMarkingAnswered}
                    style={{ flex: 1 }}
                  >
                    <Icon as={Sparkles} size="sm" className="mr-1" />
                    <ButtonText>{t('prayer.markAnswered')}</ButtonText>
                  </Button>
                )}
              </HStack>
            )}

            {/* Answered testimony */}
            {request.is_answered && request.answered_testimony && (
              <Card style={{ backgroundColor: colors.success[50], marginTop: spacing.xs }}>
                <VStack space="xs" className="p-3">
                  <Text
                    size="xs"
                    className="font-semibold"
                    style={{ color: colors.success[900] }}
                  >
                    {t('prayer.testimony')}:
                  </Text>
                  <Text size="sm" style={{ color: colors.success[900] }}>
                    {request.answered_testimony}
                  </Text>
                </VStack>
              </Card>
            )}
          </VStack>
        </Card>
      </MotiView>
    );
  };

  // Get current data and loading state
  const isLoading = activeTab === 'all' ? allLoading : myLoading;
  const error = activeTab === 'all' ? allError : myError;
  const requests = activeTab === 'all' ? allRequests : myRequests;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header */}
      <VStack
        space="md"
        className="pt-16 pb-4 px-4"
        style={{ backgroundColor: colors.primary[500] }}
      >
        <HStack className="items-center justify-between">
          <HStack className="items-center" space="md">
            <Pressable onPress={() => router.back()}>
              <Icon as={ChevronLeft} size="xl" style={{ color: '#ffffff' }} />
            </Pressable>
            <VStack>
              <Heading size="2xl" style={{ color: '#ffffff' }}>
                {t('prayer.title')}
              </Heading>
              <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {t('prayer.subtitle')}
              </Text>
            </VStack>
          </HStack>

          <Pressable onPress={() => router.push('/prayer/new')}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon as={Plus} size="lg" style={{ color: '#ffffff' }} />
            </View>
          </Pressable>
        </HStack>

        {/* Tabs */}
        <HStack space="xs">
          <Pressable onPress={() => handleTabChange('all')} style={{ flex: 1 }}>
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.lg,
                backgroundColor:
                  activeTab === 'all' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <Text
                className="font-semibold text-center"
                style={{ color: '#ffffff' }}
              >
                {t('prayer.allRequests')}
              </Text>
            </View>
          </Pressable>

          <Pressable onPress={() => handleTabChange('my')} style={{ flex: 1 }}>
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.lg,
                backgroundColor:
                  activeTab === 'my' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <Text
                className="font-semibold text-center"
                style={{ color: '#ffffff' }}
              >
                {t('prayer.myRequests')}
              </Text>
            </View>
          </Pressable>
        </HStack>

        {/* Filter (only for All tab) */}
        {activeTab === 'all' && (
          <HStack space="xs">
            {(['all', 'active', 'answered'] as const).map((filter) => (
              <Button
                key={filter}
                size="xs"
                variant={statusFilter === filter ? 'solid' : 'outline'}
                onPress={() => handleFilterChange(filter)}
                style={{
                  backgroundColor:
                    statusFilter === filter
                      ? 'rgba(255, 255, 255, 0.9)'
                      : 'transparent',
                  borderColor: 'rgba(255, 255, 255, 0.5)',
                }}
              >
                <ButtonText
                  style={{
                    color:
                      statusFilter === filter
                        ? colors.primary[600]
                        : '#ffffff',
                    fontSize: 12,
                  }}
                >
                  {t(`prayer.filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`)}
                </ButtonText>
              </Button>
            ))}
          </HStack>
        )}
      </VStack>

      {/* Content */}
      {isLoading ? (
        renderSkeleton()
      ) : error ? (
        renderError(error)
      ) : !requests || requests.length === 0 ? (
        renderEmpty(t('prayer.noRequests'))
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <VStack space="md" className="p-4">
            {requests.map((request) => renderPrayerCard(request, activeTab === 'my'))}
          </VStack>
        </ScrollView>
      )}
    </View>
  );
}
