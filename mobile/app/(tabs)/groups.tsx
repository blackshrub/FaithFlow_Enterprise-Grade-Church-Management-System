/**
 * Community Tab - My Communities List
 *
 * Features:
 * - View joined communities
 * - Quick access to chat
 * - Unread message indicators
 * - Discover new communities
 * - Pull-to-refresh
 */

import React, { useState, useCallback, useMemo, useRef, memo } from 'react';
import {
  View,
  Pressable,
  RefreshControl,
  TextInput,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import {
  useTodayHeaderMotion,
  todayListItemMotion,
} from '@/components/motion/today-motion';
import {
  Search,
  Users,
  Plus,
  MessageCircle,
  ChevronRight,
  Bell,
  BellOff,
  Compass,
  X,
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
import { Divider } from '@/components/ui/divider';

import { useMyCommunities, usePrefetchCommunity } from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing } from '@/constants/theme';
import type { CommunityWithStatus } from '@/types/communities';

function CommunityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member } = useAuthStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Focus key for animations - kept static to avoid replaying on tab switch
  const focusKey = 0;

  // Fetch my communities
  const {
    data: communities = [],
    isLoading,
    refetch,
  } = useMyCommunities();

  // Prefetch hook for instant navigation
  const prefetchCommunity = usePrefetchCommunity();

  // Shared header enter animation from today-motion
  const { headerEnterStyle } = useTodayHeaderMotion();

  // Filter communities by search
  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) return communities;

    const query = searchQuery.toLowerCase();
    return communities.filter((c) => {
      const matchesName = c.name.toLowerCase().includes(query);
      const matchesDesc = c.description?.toLowerCase().includes(query);
      return matchesName || matchesDesc;
    });
  }, [communities, searchQuery]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleOpenChat = useCallback(
    (community: CommunityWithStatus) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push(`/community/${community.id}/chat` as any);
    },
    [router]
  );

  const handlePrefetch = useCallback(
    (community: CommunityWithStatus) => {
      prefetchCommunity(community.id, member?.church_id);
    },
    [prefetchCommunity, member?.church_id]
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

  const getRoleLabel = (role?: string) => {
    if (!role) return null;
    const roleLabels: Record<string, { label: string; color: string }> = {
      leader: { label: t('communities.role.leader', 'Leader'), color: colors.primary[500] },
      co_leader: { label: t('communities.role.coLeader', 'Co-Leader'), color: colors.secondary[500] },
      admin: { label: t('communities.role.admin', 'Admin'), color: colors.warning[500] },
    };
    return roleLabels[role] || null;
  };

  // Render community card
  const renderCommunity = useCallback(
    ({ item: community, index }: { item: CommunityWithStatus; index: number }) => {
      const roleInfo = getRoleLabel(community.my_role);
      const hasUnread = (community as any).unread_count > 0;

      return (
        <Animated.View
          key={`community-${community.id}-${focusKey}`}
          entering={todayListItemMotion(index)}
          style={styles.fullWidth}
        >
          <Pressable
            onPress={() => handleOpenChat(community)}
            onPressIn={() => handlePrefetch(community)}
            className="active:opacity-90"
          >
            <PremiumCard3
              style={styles.communityCard}
            >
              <View className="p-4">
                <HStack space="md" className="items-center">
                  {/* Avatar with unread indicator */}
                  <View className="relative">
                    <Avatar size="lg" className="bg-primary-100">
                      {community.cover_image ? (
                        <AvatarImage source={{ uri: community.cover_image }} />
                      ) : (
                        <AvatarFallbackText className="text-primary-600">
                          {community.name.substring(0, 2).toUpperCase()}
                        </AvatarFallbackText>
                      )}
                    </Avatar>

                    {/* Unread indicator */}
                    {hasUnread && (
                      <View
                        className="absolute -top-1 -right-1 w-5 h-5 rounded-full items-center justify-center"
                        style={styles.unreadBadge}
                      >
                        <Text className="text-white text-xs font-bold">
                          {(community as any).unread_count > 99
                            ? '99+'
                            : (community as any).unread_count}
                        </Text>
                      </View>
                    )}
                  </View>

                  {/* Content */}
                  <VStack className="flex-1" space="xs">
                    <HStack className="justify-between items-start">
                      <VStack className="flex-1 mr-2">
                        <HStack space="sm" className="items-center">
                          <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
                            {community.name}
                          </Text>

                          {/* Role badge */}
                          {roleInfo && (
                            <Badge
                              size="sm"
                              style={{ backgroundColor: `${roleInfo.color}20` }}
                            >
                              <BadgeText style={{ color: roleInfo.color }} className="text-xs">
                                {roleInfo.label}
                              </BadgeText>
                            </Badge>
                          )}
                        </HStack>

                        <HStack space="md" className="items-center mt-0.5">
                          {/* Category */}
                          <HStack space="xs" className="items-center">
                            <View
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: getCategoryColor(community.category) }}
                            />
                            <Text className="text-xs text-gray-500">
                              {getCategoryLabel(community.category)}
                            </Text>
                          </HStack>

                          {/* Member count */}
                          <HStack space="xs" className="items-center">
                            <Icon as={Users} size="xs" className="text-gray-400" />
                            <Text className="text-xs text-gray-500">
                              {community.member_count}
                            </Text>
                          </HStack>

                          {/* Privacy */}
                          {community.is_private ? (
                            <Icon as={Lock} size="xs" className="text-gray-400" />
                          ) : (
                            <Icon as={Globe} size="xs" className="text-gray-400" />
                          )}
                        </HStack>
                      </VStack>

                      {/* Chat icon */}
                      <View
                        className="w-10 h-10 rounded-full items-center justify-center"
                        style={styles.chatButton}
                      >
                        <Icon as={MessageCircle} size="md" className="text-primary-600" />
                      </View>
                    </HStack>

                    {/* Last message preview */}
                    {(community as any).last_message && (
                      <Text className="text-gray-500 text-sm" numberOfLines={1}>
                        {(community as any).last_message.sender_name}
                        {': '}
                        {(community as any).last_message.text}
                      </Text>
                    )}
                  </VStack>
                </HStack>
              </View>
            </PremiumCard3>
          </Pressable>
        </Animated.View>
      );
    },
    [handleOpenChat, handlePrefetch, t, focusKey]
  );

  // Loading skeleton
  const CommunityListSkeleton = () => (
    <VStack space="md" className="px-5 pt-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <PremiumCard3 key={i}>
          <View className="p-4">
            <HStack space="md">
              <Skeleton className="w-14 h-14 rounded-full" isLoaded={false} />
              <VStack className="flex-1" space="sm">
                <Skeleton className="h-5 w-3/4" isLoaded={false} />
                <Skeleton className="h-3 w-1/2" isLoaded={false} />
                <Skeleton className="h-4 w-full" isLoaded={false} />
              </VStack>
            </HStack>
          </View>
        </PremiumCard3>
      ))}
    </VStack>
  );

  // Empty state
  const EmptyState = () => (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <Animated.View
        entering={ZoomIn.delay(200).springify()}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={styles.emptyStateCircle}
        >
          <Icon as={Users} size="3xl" className="text-primary-400" />
        </View>
      </Animated.View>

      <Heading size="xl" className="text-gray-900 mb-3 text-center font-bold">
        {searchQuery ? t('communities.noResults', 'No Results') : t('communities.noCommunities', 'No Communities')}
      </Heading>
      <Text className="text-gray-500 text-center text-base leading-6 max-w-sm">
        {searchQuery
          ? t('communities.noResultsDesc', `No communities found matching "${searchQuery}"`)
          : t('communities.noCommunitiesDesc', 'Join a community to connect with others, share messages, and grow together.')}
      </Text>

      {!searchQuery && (
        <Button
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/community/discover' as any);
          }}
          size="lg"
          className="mt-6"
        >
          <Icon as={Compass} size="md" className="text-white mr-2" />
          <ButtonText>{t('communities.discoverCommunities', 'Discover Communities')}</ButtonText>
        </Button>
      )}
    </View>
  );

  return (
    <Animated.View style={styles.flex1}>
      <StatusBar barStyle="dark-content" />
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {/* Header - stagger index 0 */}
        <Animated.View key={`header-${focusKey}`} entering={todayListItemMotion(0)} style={headerEnterStyle} className="px-5 pt-4 pb-3 border-b border-gray-100">
            <HStack className="items-center justify-between mb-4">
              <Heading size="2xl" className="text-gray-900 font-bold">
                {t('tabs.communities', 'Community')}
            </Heading>

            {/* Discover button */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push('/community/discover' as any);
              }}
              className="active:opacity-70"
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center"
                style={styles.discoverButton}
              >
                <Icon as={Compass} size="md" className="text-primary-600" />
              </View>
            </Pressable>
          </HStack>

          {/* Search bar */}
          {communities.length > 0 && (
            <HStack
              space="sm"
              className="items-center px-4 py-3 rounded-xl"
              style={styles.searchBar}
            >
              <Icon as={Search} size="md" className="text-gray-400" />
              <TextInput
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder={t('communities.searchPlaceholder', 'Search communities...')}
                placeholderTextColor={colors.gray[400]}
                className="flex-1 text-base text-gray-900"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => setSearchQuery('')}>
                  <Icon as={X} size="md" className="text-gray-400" />
                </Pressable>
              )}
            </HStack>
          )}
        </Animated.View>

      {/* Content */}
      {isLoading ? (
        <CommunityListSkeleton />
      ) : filteredCommunities.length > 0 ? (
        <Animated.View entering={PMotionV10.screenFadeIn} style={styles.flex1}>
          <FlashList
            data={filteredCommunities}
            renderItem={renderCommunity}
            keyExtractor={(item: CommunityWithStatus) => item.id}
            estimatedItemSize={120}
            contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary[500]}
              />
            }
            ListHeaderComponent={
              communities.length > 0 ? (
                <View className="px-5 mb-2">
                  <Text className="text-sm text-gray-500">
                    {t('communities.memberOf', '{{count}} communities', { count: communities.length })}
                  </Text>
                </View>
              ) : null
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

// Memoize screen + Apply Premium Motion V10 Ultra HOC for production-grade transitions
const MemoizedCommunityScreen = memo(CommunityScreen);
MemoizedCommunityScreen.displayName = 'CommunityScreen';
export default withPremiumMotionV10(MemoizedCommunityScreen);

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  fullWidth: {
    width: '100%',
  },
  communityCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  unreadBadge: {
    backgroundColor: colors.error[500],
  },
  chatButton: {
    backgroundColor: colors.primary[50],
  },
  emptyStateCircle: {
    backgroundColor: colors.primary[50],
  },
  discoverButton: {
    backgroundColor: colors.primary[50],
  },
  searchBar: {
    backgroundColor: colors.gray[100],
  },
});
