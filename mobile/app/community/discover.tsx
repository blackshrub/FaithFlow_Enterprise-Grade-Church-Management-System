/**
 * Community Discovery Screen - Browse & Join Public Communities
 * Premium Motion V10 Ultra Edition
 *
 * Features:
 * - Browse public communities
 * - Search communities
 * - Filter by category
 * - Join request functionality
 * - Pull-to-refresh
 * - V10 Ultra Motion System
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import {
  ArrowLeft,
  Search,
  Users,
  X,
  ChevronRight,
  Check,
  Clock,
  Lock,
  Globe,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { PremiumCard3 } from '@/components/ui/premium-card';
import { Icon } from '@/components/ui/icon';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, ButtonText } from '@/components/ui/button';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';

import { usePublicCommunities, useJoinCommunity } from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing } from '@/constants/theme';
import type { CommunityWithStatus } from '@/types/communities';

type CategoryFilter = 'all' | 'cell_group' | 'ministry_team' | 'activity' | 'support_group';

function CommunityDiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch public communities
  const {
    data: communities = [],
    isLoading,
    refetch,
  } = usePublicCommunities(member?.church_id || '');

  // Join mutation
  const joinMutation = useJoinCommunity();

  // Filter communities
  const filteredCommunities = useMemo(() => {
    return communities.filter((c) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesName = c.name.toLowerCase().includes(query);
        const matchesDesc = c.description?.toLowerCase().includes(query);
        if (!matchesName && !matchesDesc) return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && c.category !== categoryFilter) {
        return false;
      }

      return true;
    });
  }, [communities, searchQuery, categoryFilter]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleJoin = useCallback(
    (community: CommunityWithStatus) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      joinMutation.mutate(
        { communityId: community.id },
        {
          onSuccess: (data) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            if (data.requires_approval) {
              Alert.alert(
                t('groups.joinRequestSent', 'Join Request Sent'),
                t('groups.joinRequestSentDesc', {
                  name: community.name,
                  defaultValue: `Your request to join ${community.name} has been sent.`,
                })
              );
            } else {
              Alert.alert(
                t('groups.joinSuccess', 'Joined Successfully'),
                t('groups.joinSuccessDesc', {
                  name: community.name,
                  defaultValue: `You have joined ${community.name}.`,
                })
              );
            }
          },
          onError: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(
              t('common.error', 'Error'),
              t('groups.joinError', 'Failed to join community. Please try again.')
            );
          },
        }
      );
    },
    [joinMutation, t]
  );

  const getCategoryColor = (category: string) => {
    const categoryColors: Record<string, string> = {
      cell_group: colors.primary[500],
      ministry_team: colors.secondary[500],
      activity: colors.success[500],
      support_group: colors.warning[500],
    };
    return categoryColors[category] || colors.gray[500];
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      cell_group: t('communities.category.cellGroup', 'Cell Group'),
      ministry_team: t('communities.category.ministryTeam', 'Ministry Team'),
      activity: t('communities.category.activity', 'Activity'),
      support_group: t('communities.category.supportGroup', 'Support Group'),
    };
    return labels[category] || category;
  };

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: t('common.all', 'All') },
    { key: 'cell_group', label: t('communities.category.cellGroup', 'Cell Group') },
    { key: 'ministry_team', label: t('communities.category.ministryTeam', 'Ministry Team') },
    { key: 'activity', label: t('communities.category.activity', 'Activity') },
    { key: 'support_group', label: t('communities.category.supportGroup', 'Support Group') },
  ];

  // Render community card with V10 card-level stagger animation
  const renderCommunity = useCallback(
    ({ item: community, index }: { item: CommunityWithStatus; index: number }) => {
      const isMember = community.my_role !== undefined;
      const isPending = community.membership_status === 'pending';
      const isFull =
        community.max_members && community.member_count >= community.max_members;

      return (
        <Animated.View
          entering={PMotionV10.cardStagger(index, 400)}
          exiting={PMotionV10.screenFadeOut}
          style={{ width: '100%' }}
        >
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              if (isMember && !isPending) {
                router.push(`/community/${community.id}/chat` as any);
              }
            }}
            className="active:scale-95 active:opacity-90"
          >
            <PremiumCard3
              style={{
                marginHorizontal: spacing.lg,
                marginBottom: spacing.md,
              }}
            >
              <View style={{ padding: spacing.md }}>
                <HStack space="md">
                  {/* Avatar */}
                  <Avatar size="lg" className="bg-primary-100">
                    {community.cover_image ? (
                      <AvatarImage source={{ uri: community.cover_image }} />
                    ) : (
                      <AvatarFallbackText className="text-primary-600">
                        {community.name.substring(0, 2).toUpperCase()}
                      </AvatarFallbackText>
                    )}
                  </Avatar>

                  {/* Content */}
                  <VStack className="flex-1" space="xs">
                    <HStack className="justify-between items-start">
                      <VStack className="flex-1" style={{ marginRight: spacing.sm }}>
                        <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
                          {community.name}
                        </Text>

                        <HStack space="md" className="items-center" style={{ marginTop: 2 }}>
                          <HStack space="xs" className="items-center">
                            <View
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getCategoryColor(community.category) }}
                            />
                            <Text className="text-xs text-gray-500">
                              {getCategoryLabel(community.category)}
                            </Text>
                          </HStack>

                          <HStack space="xs" className="items-center">
                            <Icon as={Users} size="xs" className="text-gray-400" />
                            <Text className="text-xs text-gray-500">
                              {community.member_count}
                              {community.max_members && ` / ${community.max_members}`}
                            </Text>
                          </HStack>
                        </HStack>
                      </VStack>

                      {/* Privacy badge */}
                      {community.is_private ? (
                        <Badge variant="outline" size="sm">
                          <Icon as={Lock} size="xs" className="text-gray-500 mr-1" />
                          <BadgeText className="text-gray-500">
                            {t('communities.privacy.private', 'Private')}
                          </BadgeText>
                        </Badge>
                      ) : (
                        <Badge variant="outline" size="sm" action="success">
                          <Icon as={Globe} size="xs" className="text-success-600 mr-1" />
                          <BadgeText className="text-success-600">
                            {t('communities.privacy.public', 'Public')}
                          </BadgeText>
                        </Badge>
                      )}
                    </HStack>

                    {/* Description */}
                    {community.description && (
                      <Text className="text-gray-600 text-sm" numberOfLines={2}>
                        {community.description}
                      </Text>
                    )}

                    {/* Action button */}
                    <View style={{ marginTop: spacing.sm }}>
                      {isMember && !isPending ? (
                        <Button
                          size="sm"
                          variant="outline"
                          action="secondary"
                          onPress={() => router.push(`/community/${community.id}/chat` as any)}
                          className="active:scale-95 active:opacity-90"
                        >
                          <Icon as={ChevronRight} size="sm" className="text-primary-600 mr-1" />
                          <ButtonText className="text-primary-600">
                            {t('groups.openChat', 'Open Chat')}
                          </ButtonText>
                        </Button>
                      ) : isPending ? (
                        <Button size="sm" variant="outline" disabled>
                          <Icon as={Clock} size="sm" className="text-gray-400 mr-1" />
                          <ButtonText className="text-gray-500">
                            {t('groups.pendingApproval', 'Pending Approval')}
                          </ButtonText>
                        </Button>
                      ) : isFull ? (
                        <Button size="sm" variant="outline" disabled>
                          <ButtonText className="text-gray-500">
                            {t('groups.full', 'Full')}
                          </ButtonText>
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onPress={() => handleJoin(community)}
                          disabled={joinMutation.isPending}
                          className="active:scale-95 active:opacity-90"
                        >
                          <Icon as={Check} size="sm" className="text-white mr-1" />
                          <ButtonText>{t('groups.join', 'Join')}</ButtonText>
                        </Button>
                      )}
                    </View>
                  </VStack>
                </HStack>
              </View>
            </PremiumCard3>
          </Pressable>
        </Animated.View>
      );
    },
    [handleJoin, joinMutation.isPending, router, t]
  );

  // Loading skeleton with V10 stagger
  const CommunityListSkeleton = () => (
    <VStack space="md" style={{ paddingHorizontal: spacing.lg }}>
      {[1, 2, 3, 4].map((i) => (
        <Animated.View
          key={i}
          entering={PMotionV10.cardStagger(i - 1, 100)}
        >
          <PremiumCard3>
            <View style={{ padding: spacing.md }}>
              <HStack space="md">
                <Skeleton className="w-14 h-14 rounded-full" isLoaded={false} />
                <VStack className="flex-1" space="sm">
                  <Skeleton className="h-5 w-3/4" isLoaded={false} />
                  <Skeleton className="h-3 w-1/2" isLoaded={false} />
                  <Skeleton className="h-12 w-full" isLoaded={false} />
                </VStack>
              </HStack>
            </View>
          </PremiumCard3>
        </Animated.View>
      ))}
    </VStack>
  );

  // Empty state with V10 premium motion
  const EmptyState = () => (
    <Animated.View
      entering={PMotionV10.screenFadeIn}
      exiting={PMotionV10.screenFadeOut}
      className="flex-1 items-center justify-center"
      style={{ paddingHorizontal: spacing.xl, paddingVertical: spacing.xl * 2 }}
    >
      <Animated.View
        entering={PMotionV10.sharedAxisYEnter}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.primary[50], marginBottom: spacing.lg }}
        >
          <Icon as={Search} size="3xl" className="text-primary-400" />
        </View>
      </Animated.View>

      <Animated.View entering={PMotionV10.sectionStagger(1)}>
        <Heading size="xl" className="text-gray-900 text-center font-bold" style={{ marginBottom: spacing.sm }}>
          {searchQuery
            ? t('communities.discover.empty.noResults', 'No Results')
            : t('communities.discover.empty.noCommunities', 'No Communities')}
        </Heading>
      </Animated.View>

      <Animated.View entering={PMotionV10.sectionStagger(2)}>
        <Text className="text-gray-500 text-center text-base leading-6 max-w-sm">
          {searchQuery
            ? t(
                'communities.discover.empty.noResultsDesc',
                `No communities found matching "${searchQuery}"`
              )
            : t(
                'communities.discover.empty.noCommunitiesDesc',
                'No public communities available at the moment.'
              )}
        </Text>
      </Animated.View>

      {searchQuery && (
        <Animated.View entering={PMotionV10.sectionStagger(3)}>
          <Button
            onPress={() => setSearchQuery('')}
            size="md"
            variant="outline"
            style={{ marginTop: spacing.lg }}
            className="active:scale-95 active:opacity-90"
          >
            <ButtonText>
              {t('communities.discover.empty.clearSearch', 'Clear Search')}
            </ButtonText>
          </Button>
        </Animated.View>
      )}
    </Animated.View>
  );

  return (
    <Animated.View
      style={{ flex: 1, backgroundColor: '#fff' }}
      exiting={PMotionV10.screenFadeOut}
    >
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {/* Header with V10 subtleSlide */}
        <Animated.View
          entering={PMotionV10.subtleSlide('right')}
          exiting={PMotionV10.screenFadeOut}
          style={{
            paddingHorizontal: spacing.lg,
            paddingTop: spacing.md,
            paddingBottom: spacing.sm,
            borderBottomWidth: 1,
            borderBottomColor: colors.gray[100],
          }}
        >
          <HStack className="items-center" space="md" style={{ marginBottom: spacing.md }}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              className="active:scale-95 active:opacity-90"
            >
              <Icon as={ArrowLeft} size="lg" className="text-gray-800" />
            </Pressable>

            <Heading size="2xl" className="text-gray-900 font-bold flex-1">
              {t('communities.discover', 'Discover Communities')}
            </Heading>
          </HStack>

          {/* Search bar with sharedAxisY */}
          <Animated.View entering={PMotionV10.sharedAxisYEnter}>
            <HStack
              space="sm"
              className="items-center rounded-xl"
              style={{
                backgroundColor: colors.gray[100],
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2,
              }}
            >
              <Icon as={Search} size="md" className="text-gray-400" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t(
                  'communities.discover.searchPlaceholder',
                  'Search communities...'
                )}
                placeholderTextColor={colors.gray[400]}
                className="flex-1 text-base text-gray-900"
              />
              {searchQuery.length > 0 && (
                <Pressable
                  onPress={() => setSearchQuery('')}
                  className="active:scale-95 active:opacity-90"
                >
                  <Icon as={X} size="md" className="text-gray-400" />
                </Pressable>
              )}
            </HStack>
          </Animated.View>

          {/* Category filters with sharedAxisY stagger */}
          <Animated.View entering={PMotionV10.sectionStagger(1)}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.sm }}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {categories.map((cat, index) => {
                const isActive = categoryFilter === cat.key;
                return (
                  <Animated.View
                    key={cat.key}
                    entering={PMotionV10.horizontalStagger(index, 50)}
                  >
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setCategoryFilter(cat.key);
                      }}
                      className="active:scale-95 active:opacity-90"
                    >
                      <View
                        className="rounded-full"
                        style={{
                          backgroundColor: isActive ? colors.primary[500] : colors.gray[100],
                          paddingHorizontal: spacing.md,
                          paddingVertical: spacing.sm,
                        }}
                      >
                        <Text
                          className={`text-sm font-medium ${
                            isActive ? 'text-white' : 'text-gray-600'
                          }`}
                        >
                          {cat.label}
                        </Text>
                      </View>
                    </Pressable>
                  </Animated.View>
                );
              })}
            </ScrollView>
          </Animated.View>
        </Animated.View>

        {/* Content with SharedAxisX */}
        {isLoading ? (
          <Animated.View
            entering={PMotionV10.sharedAxisX.enter}
            style={{ paddingTop: spacing.md }}
          >
            <CommunityListSkeleton />
          </Animated.View>
        ) : filteredCommunities.length > 0 ? (
          <Animated.View
            entering={PMotionV10.sharedAxisX.enter}
            exiting={PMotionV10.sharedAxisX.exit}
            style={{ flex: 1 }}
          >
            <FlashList
              data={filteredCommunities}
              renderItem={renderCommunity}
              keyExtractor={(item: CommunityWithStatus) => item.id}
              estimatedItemSize={160}
              contentContainerStyle={{
                paddingTop: spacing.md,
                paddingBottom: 120,
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
          </Animated.View>
        ) : (
          <EmptyState />
        )}
      </SafeAreaView>
    </Animated.View>
  );
}

// Apply Premium Motion V10 Ultra HOC for production-grade transitions
export default withPremiumMotionV10(CommunityDiscoverScreen);
