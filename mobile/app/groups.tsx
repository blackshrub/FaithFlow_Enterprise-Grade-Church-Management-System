/**
 * Groups Screen
 *
 * Features:
 * - All groups with categories
 * - My groups tab
 * - Join/Leave buttons with optimistic updates
 * - Member count badges
 * - Group capacity indicator
 * - Meeting schedule display
 * - Skeleton loading
 * - Pull-to-refresh
 * - Complete bilingual support (EN/ID)
 */

import React, { useState, useCallback, useEffect } from 'react';
import { ScrollView, RefreshControl, View } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInUp,
  ZoomIn,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Card } from '@/components/ui/card';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Pressable } from '@/components/ui/pressable';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Skeleton, SkeletonText } from '@/components/ui/skeleton';
import {
  Users,
  User,
  Calendar,
  MapPin,
  Clock,
  ChevronLeft,
  Plus,
  RefreshCw,
  UserPlus,
  UserMinus,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react-native';

import { useGroups, useMyGroups, useJoinGroup, useLeaveGroup } from '@/hooks/useGroups';
import type { GroupWithStatus } from '@/types/groups';
import { colors, borderRadius, shadows, spacing } from '@/constants/theme';
import { showSuccessToast, showErrorToast, showWarningToast } from '@/components/ui/Toast';

export default function GroupsScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');

  // Queries
  const {
    data: allGroups,
    isLoading: allLoading,
    error: allError,
    refetch: refetchAll,
  } = useGroups();

  const {
    data: myGroups,
    isLoading: myLoading,
    error: myError,
    refetch: refetchMy,
  } = useMyGroups();

  const { mutate: joinGroup, isPending: isJoining } = useJoinGroup();
  const { mutate: leaveGroup, isPending: isLeaving } = useLeaveGroup();

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

  // Handle join group
  const handleJoin = useCallback(
    (groupId: string, groupName: string, isOpen: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      joinGroup(
        { groupId },
        {
          onSuccess: (data) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (data.requires_approval) {
              showSuccessToast(
                t('groups.joinRequestSent'),
                t('groups.joinRequestSentDesc', { name: groupName })
              );
            } else {
              showSuccessToast(
                t('groups.joinSuccess'),
                t('groups.joinSuccessDesc', { name: groupName })
              );
            }
          },
          onError: (error: any) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showErrorToast(
              t('common.error'),
              error.response?.data?.detail || t('groups.joinError')
            );
          },
        }
      );
    },
    [joinGroup, t]
  );

  // Handle leave group
  const handleLeave = useCallback(
    (groupId: string, groupName: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Show confirmation
      showWarningToast(
        t('groups.leaveConfirm'),
        t('groups.leaveConfirmDesc', { name: groupName })
      );

      // For demo, proceed with leave after 2 seconds
      setTimeout(() => {
        leaveGroup(groupId, {
          onSuccess: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            showSuccessToast(t('groups.leaveSuccess'), groupName);
          },
          onError: (error: any) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            showErrorToast(
              t('common.error'),
              error.response?.data?.detail || t('groups.leaveError')
            );
          },
        });
      }, 2000);
    },
    [leaveGroup, t]
  );

  // Get category color
  const getCategoryColor = useCallback((category: string) => {
    switch (category) {
      case 'small_group':
        return colors.primary[500];
      case 'ministry':
        return colors.secondary[500];
      case 'bible_study':
        return colors.success[500];
      case 'prayer_group':
        return colors.primary[300];
      case 'youth':
        return colors.warning[500];
      case 'mens':
        return colors.primary[700];
      case 'womens':
        return colors.error[300];
      case 'couples':
        return colors.secondary[300];
      case 'seniors':
        return colors.gray[500];
      default:
        return colors.gray[500];
    }
  }, []);

  // Render skeleton
  const renderSkeleton = () => (
    <VStack space="md" className="p-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <HStack space="md">
            <Skeleton height={64} width={64} style={{ borderRadius: 999 }} />
            <VStack space="xs" style={{ flex: 1 }}>
              <Skeleton height={20} width="70%" />
              <SkeletonText lines={2} />
              <Skeleton height={24} width={60} style={{ borderRadius: 999 }} />
            </VStack>
          </HStack>
        </Card>
      ))}
    </VStack>
  );

  // Render empty state
  const renderEmpty = (message: string) => (
    <Animated.View
      entering={ZoomIn.springify().damping(20)}
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
        <Icon as={Users} size="3xl" style={{ color: colors.primary[500] }} />
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
    </Animated.View>
  );

  // Render error state
  const renderError = (error: any) => (
    <Animated.View
      entering={ZoomIn.springify().damping(20)}
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
    </Animated.View>
  );

  // Render group card
  const renderGroupCard = (group: GroupWithStatus) => {
    const categoryColor = getCategoryColor(group.category);
    const capacityPercentage = group.max_members
      ? (group.member_count / group.max_members) * 100
      : 0;
    const isNearCapacity = capacityPercentage >= 80;

    return (
      <Animated.View
        key={group._id}
        entering={FadeInUp.springify().damping(15)}
      >
        <Card
          style={{
            borderRadius: borderRadius.xl,
            ...shadows.md,
          }}
        >
          <VStack space="sm" className="p-4">
            {/* Header with Avatar and Basic Info */}
            <HStack space="md" className="items-start">
              <Avatar size="lg" style={{ backgroundColor: categoryColor }}>
                <AvatarFallbackText>{group.name}</AvatarFallbackText>
                {group.image_url && <AvatarImage source={{ uri: group.image_url }} />}
              </Avatar>

              <VStack space="xs" style={{ flex: 1 }}>
                <HStack className="justify-between items-start">
                  <Heading size="md" style={{ flex: 1 }}>
                    {group.name}
                  </Heading>
                  <Badge size="sm" style={{ backgroundColor: categoryColor }}>
                    <BadgeText style={{ color: '#ffffff' }}>
                      {t(`groups.categories.${group.category}`)}
                    </BadgeText>
                  </Badge>
                </HStack>

                <Text size="sm" className="text-muted-700" numberOfLines={2}>
                  {group.description}
                </Text>

                {/* Leader Info */}
                <HStack className="items-center" space="xs">
                  <Icon as={User} size="xs" style={{ color: colors.gray[500] }} />
                  <Text size="xs" className="text-muted-600">
                    {t('groups.leader')}: {group.leader_name}
                  </Text>
                </HStack>
              </VStack>
            </HStack>

            {/* Meeting Schedule */}
            {group.meeting_schedule && (
              <Card style={{ backgroundColor: colors.gray[50] }}>
                <HStack space="xs" className="items-center p-3">
                  <Icon as={Calendar} size="sm" style={{ color: colors.primary[600] }} />
                  <Text size="sm" className="font-semibold">
                    {group.meeting_schedule.day}s at {group.meeting_schedule.time}
                  </Text>
                  <Text size="sm" className="text-muted-600">
                    ({group.meeting_schedule.frequency})
                  </Text>
                </HStack>
              </Card>
            )}

            {/* Location */}
            {group.location && (
              <HStack className="items-center" space="xs">
                <Icon as={MapPin} size="xs" style={{ color: colors.gray[500] }} />
                <Text size="xs" className="text-muted-600">
                  {group.location}
                </Text>
              </HStack>
            )}

            {/* Member Count with Progress Bar */}
            <VStack space="xs">
              <HStack className="justify-between items-center">
                <HStack className="items-center" space="xs">
                  <Icon as={Users} size="sm" style={{ color: colors.primary[500] }} />
                  <Text size="sm" className="font-semibold">
                    {group.member_count}
                    {group.max_members && ` / ${group.max_members}`} {t('groups.members')}
                  </Text>
                </HStack>

                {group.is_full && (
                  <Badge size="sm" variant="outline" style={{ borderColor: colors.error[500] }}>
                    <BadgeText style={{ color: colors.error[700] }}>
                      {t('groups.full')}
                    </BadgeText>
                  </Badge>
                )}

                {isNearCapacity && !group.is_full && (
                  <Badge
                    size="sm"
                    variant="outline"
                    style={{ borderColor: colors.warning[500] }}
                  >
                    <BadgeText style={{ color: colors.warning[700] }}>
                      {t('groups.almostFull')}
                    </BadgeText>
                  </Badge>
                )}
              </HStack>

              {/* Progress bar */}
              {group.max_members && (
                <View
                  style={{
                    height: 6,
                    backgroundColor: colors.gray[200],
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <View
                    style={{
                      height: '100%',
                      width: `${capacityPercentage}%`,
                      backgroundColor: isNearCapacity
                        ? colors.warning[500]
                        : colors.primary[500],
                    }}
                  />
                </View>
              )}
            </VStack>

            {/* Action Buttons */}
            <HStack space="xs" className="mt-2">
              {!group.is_member && !group.join_request_status && (
                <Button
                  size="sm"
                  onPress={() => handleJoin(group._id, group.name, group.is_open)}
                  isDisabled={group.is_full || isJoining}
                  style={{
                    flex: 1,
                    backgroundColor: group.is_full ? colors.gray[300] : colors.primary[500],
                    borderRadius: borderRadius.lg,
                  }}
                >
                  <Icon as={UserPlus} size="sm" className="mr-1" />
                  <ButtonText>
                    {group.is_full ? t('groups.full') : t('groups.join')}
                  </ButtonText>
                </Button>
              )}

              {group.join_request_status === 'pending' && (
                <Badge
                  size="md"
                  style={{
                    flex: 1,
                    backgroundColor: colors.warning[50],
                    paddingVertical: spacing.sm,
                    justifyContent: 'center',
                  }}
                >
                  <Icon
                    as={Clock}
                    size="sm"
                    style={{ color: colors.warning[600], marginRight: 6 }}
                  />
                  <BadgeText style={{ color: colors.warning[900] }}>
                    {t('groups.pendingApproval')}
                  </BadgeText>
                </Badge>
              )}

              {group.is_member && (
                <>
                  <Badge
                    size="md"
                    style={{
                      flex: 1,
                      backgroundColor: colors.success[50],
                      paddingVertical: spacing.sm,
                      justifyContent: 'center',
                    }}
                  >
                    <Icon
                      as={CheckCircle2}
                      size="sm"
                      style={{ color: colors.success[600], marginRight: 6 }}
                    />
                    <BadgeText style={{ color: colors.success[900] }}>
                      {t('groups.joined')}
                      {group.member_role && ` (${t(`groups.roles.${group.member_role}`)})`}
                    </BadgeText>
                  </Badge>

                  <Button
                    size="sm"
                    variant="outline"
                    onPress={() => handleLeave(group._id, group.name)}
                    isDisabled={isLeaving}
                    style={{
                      borderColor: colors.error[300],
                    }}
                  >
                    <Icon as={UserMinus} size="sm" style={{ color: colors.error[600] }} />
                  </Button>
                </>
              )}
            </HStack>
          </VStack>
        </Card>
      </Animated.View>
    );
  };

  // Get current data and loading state
  const isLoading = activeTab === 'all' ? allLoading : myLoading;
  const error = activeTab === 'all' ? allError : myError;
  const groups = activeTab === 'all' ? allGroups : myGroups;

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header */}
      <VStack
        space="md"
        className="pt-16 pb-4 px-4"
        style={{ backgroundColor: colors.secondary[500] }}
      >
        <HStack className="items-center justify-between">
          <HStack className="items-center" space="md">
            <Pressable
              onPress={() => router.back()}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t('common.back', 'Go back')}
            >
              <Icon as={ChevronLeft} size="xl" style={{ color: '#ffffff' }} />
            </Pressable>
            <VStack>
              <Heading size="2xl" style={{ color: '#ffffff' }}>
                {t('groups.title')}
              </Heading>
              <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                {t('groups.subtitle')}
              </Text>
            </VStack>
          </HStack>

          <Pressable
            onPress={() => router.push('/groups/new')}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('groups.createNew', 'Create new group')}
          >
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
          <Pressable
            onPress={() => handleTabChange('all')}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('groups.allGroups', 'All groups')}
            accessibilityState={{ selected: activeTab === 'all' }}
            style={{ flex: 1 }}
          >
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
              <Text className="font-semibold text-center" style={{ color: '#ffffff' }}>
                {t('groups.allGroups')}
              </Text>
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleTabChange('my')}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('groups.myGroups', 'My groups')}
            accessibilityState={{ selected: activeTab === 'my' }}
            style={{ flex: 1 }}
          >
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
              <Text className="font-semibold text-center" style={{ color: '#ffffff' }}>
                {t('groups.myGroups')}
              </Text>
            </View>
          </Pressable>
        </HStack>
      </VStack>

      {/* Content */}
      {isLoading ? (
        renderSkeleton()
      ) : error ? (
        renderError(error)
      ) : !groups || groups.length === 0 ? (
        renderEmpty(t('groups.noGroups'))
      ) : (
        <ScrollView
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          <VStack space="md" className="p-4">
            {groups.map(renderGroupCard)}
          </VStack>
        </ScrollView>
      )}
    </View>
  );
}
