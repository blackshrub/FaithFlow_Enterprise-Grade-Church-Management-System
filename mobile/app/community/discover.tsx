/**
 * Community Discovery Screen - Browse & Join Public Communities
 *
 * Features:
 * - Browse public communities
 * - Search communities
 * - Filter by category
 * - Join request functionality
 * - Pull-to-refresh
 * - WhatsApp iOS style design
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
  ScrollView,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import {
  ChevronLeft,
  Search,
  Users,
  X,
  Check,
  Clock,
  Lock,
  Globe,
  ChevronRight,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { Icon } from '@/components/ui/icon';

import { usePublicCommunities, useJoinCommunity } from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import type { CommunityWithStatus } from '@/types/communities';

// =============================================================================
// CONSTANTS - WhatsApp iOS Colors (matching Community screen)
// =============================================================================

const COLORS = {
  // Brand colors
  primary: '#075E54',
  primaryLight: '#128C7E',
  accent: '#25D366',
  accentBlue: '#34B7F1',

  // Neutrals
  white: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#F7F7F7',
  border: '#E8E8E8',
  divider: '#EBEBEB',

  // Text hierarchy
  textPrimary: '#1A1A1A',
  textSecondary: '#65676B',
  textTertiary: '#8A8D91',
  textOnPrimary: '#FFFFFF',

  // States
  pressed: 'rgba(0, 0, 0, 0.05)',
  ripple: 'rgba(0, 0, 0, 0.1)',

  // Category colors
  categoryCell: '#075E54',
  categoryMinistry: '#6366F1',
  categoryActivity: '#22C55E',
  categorySupport: '#F59E0B',
};

type CategoryFilter = 'all' | 'cell_group' | 'ministry_team' | 'activity' | 'support_group';

// =============================================================================
// COMMUNITY CARD COMPONENT
// =============================================================================

interface CommunityCardProps {
  community: CommunityWithStatus;
  onPress: () => void;
  onJoin: () => void;
  isJoining: boolean;
  getCategoryColor: (category: string) => string;
  getCategoryLabel: (category: string) => string;
}

const CommunityCard = memo(({
  community,
  onPress,
  onJoin,
  isJoining,
  getCategoryColor,
  getCategoryLabel,
}: CommunityCardProps) => {
  const { t } = useTranslation();

  const isMember = community.my_role !== undefined;
  const isPending = community.membership_status === 'pending';
  const isFull = community.max_members && community.member_count >= community.max_members;

  return (
    <Pressable
      onPress={onPress}
      android_ripple={{ color: COLORS.ripple, borderless: false }}
      className="flex-row items-start pr-4 bg-white relative"
      style={[
        { minHeight: 100, paddingVertical: 14, paddingLeft: 20 },
        ({ pressed }: { pressed: boolean }) =>
          Platform.OS === 'ios' && pressed ? { backgroundColor: COLORS.pressed } : undefined,
      ]}
    >
      {/* Avatar */}
      <View className="mr-3">
        {community.cover_image ? (
          <Image
            source={{ uri: community.cover_image }}
            className="w-16 h-16 rounded-full"
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
          />
        ) : (
          <View
            className="w-16 h-16 rounded-full items-center justify-center"
            style={{ backgroundColor: COLORS.primaryLight }}
          >
            <Text className="text-2xl font-semibold tracking-wide" style={{ color: COLORS.textOnPrimary }}>
              {community.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="flex-1">
        {/* Top row: Name + Privacy badge */}
        <View className="flex-row justify-between items-start mb-1">
          <Text
            className="flex-1 text-[17px] font-semibold mr-3"
            style={{ color: COLORS.textPrimary }}
            numberOfLines={1}
          >
            {community.name}
          </Text>
          {community.is_private ? (
            <View className="flex-row items-center px-2 py-0.5 rounded-full" style={{ backgroundColor: COLORS.surface }}>
              <Lock size={12} color={COLORS.textTertiary} />
              <Text className="text-[11px] ml-1" style={{ color: COLORS.textTertiary }}>
                {t('communities.privacy.private', 'Private')}
              </Text>
            </View>
          ) : (
            <View className="flex-row items-center px-2 py-0.5 rounded-full" style={{ backgroundColor: '#E8F5E9' }}>
              <Globe size={12} color={COLORS.accent} />
              <Text className="text-[11px] ml-1" style={{ color: COLORS.accent }}>
                {t('communities.privacy.public', 'Public')}
              </Text>
            </View>
          )}
        </View>

        {/* Category + Member count */}
        <View className="flex-row items-center mb-1.5">
          <View
            className="w-2 h-2 rounded-full mr-1.5"
            style={{ backgroundColor: getCategoryColor(community.category) }}
          />
          <Text className="text-[13px] mr-3" style={{ color: COLORS.textSecondary }}>
            {getCategoryLabel(community.category)}
          </Text>
          <Users size={14} color={COLORS.textTertiary} />
          <Text className="text-[13px] ml-1" style={{ color: COLORS.textTertiary }}>
            {community.member_count}
            {community.max_members && ` / ${community.max_members}`}
          </Text>
        </View>

        {/* Description */}
        {community.description && (
          <Text
            className="text-[14px] leading-[18px] mb-2"
            style={{ color: COLORS.textSecondary }}
            numberOfLines={2}
          >
            {community.description}
          </Text>
        )}

        {/* Action button */}
        <View className="flex-row">
          {isMember && !isPending ? (
            <Pressable
              onPress={onPress}
              className="flex-row items-center px-3 py-1.5 rounded-full"
              style={{ backgroundColor: COLORS.surface }}
            >
              <Text className="text-[13px] font-medium" style={{ color: COLORS.primary }}>
                {t('groups.openChat', 'Open Chat')}
              </Text>
              <ChevronRight size={16} color={COLORS.primary} style={{ marginLeft: 2 }} />
            </Pressable>
          ) : isPending ? (
            <View className="flex-row items-center px-3 py-1.5 rounded-full" style={{ backgroundColor: COLORS.surface }}>
              <Clock size={14} color={COLORS.textTertiary} />
              <Text className="text-[13px] font-medium ml-1.5" style={{ color: COLORS.textTertiary }}>
                {t('groups.pendingApproval', 'Pending Approval')}
              </Text>
            </View>
          ) : isFull ? (
            <View className="flex-row items-center px-3 py-1.5 rounded-full" style={{ backgroundColor: COLORS.surface }}>
              <Text className="text-[13px] font-medium" style={{ color: COLORS.textTertiary }}>
                {t('groups.full', 'Full')}
              </Text>
            </View>
          ) : (
            <Pressable
              onPress={onJoin}
              disabled={isJoining}
              className="flex-row items-center px-4 py-1.5 rounded-full active:opacity-80"
              style={{ backgroundColor: COLORS.accent }}
            >
              <Check size={14} color={COLORS.white} />
              <Text className="text-[13px] font-semibold ml-1.5" style={{ color: COLORS.white }}>
                {t('groups.join', 'Join')}
              </Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Divider */}
      <View
        className="absolute bottom-0 right-0 z-10"
        style={{ left: 84, height: 1, backgroundColor: COLORS.divider }}
      />
    </Pressable>
  );
});

CommunityCard.displayName = 'CommunityCard';

// =============================================================================
// LOADING SKELETON
// =============================================================================

const LoadingSkeleton = memo(() => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      {/* Header skeleton */}
      <View style={{ paddingTop: insets.top, backgroundColor: COLORS.white }}>
        <View className="flex-row items-center py-2" style={{ paddingLeft: 8 }}>
          <View className="w-10 h-10 rounded-full" style={{ backgroundColor: COLORS.surface }} />
          <View className="h-8 w-48 rounded ml-2" style={{ backgroundColor: COLORS.surface }} />
        </View>
        <View className="pr-4 pb-2" style={{ paddingLeft: 20 }}>
          <View className="rounded-xl" style={{ backgroundColor: COLORS.surface, height: 36 }} />
        </View>
        <View className="flex-row px-5 pb-2 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className="h-8 w-20 rounded-full" style={{ backgroundColor: COLORS.surface }} />
          ))}
        </View>
      </View>
      {/* List skeleton */}
      <View className="flex-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <Animated.View
            key={i}
            entering={FadeIn.delay(i * 80).duration(300)}
            className="flex-row pr-4 items-start"
            style={{ minHeight: 100, paddingVertical: 14, paddingLeft: 20 }}
          >
            <View className="w-16 h-16 rounded-full mr-3" style={{ backgroundColor: COLORS.surface }} />
            <View className="flex-1">
              <View className="h-[18px] w-[55%] rounded mb-2" style={{ backgroundColor: COLORS.surface }} />
              <View className="h-[14px] w-[40%] rounded mb-2" style={{ backgroundColor: COLORS.surface }} />
              <View className="h-[14px] w-[85%] rounded mb-2" style={{ backgroundColor: COLORS.surface }} />
              <View className="h-[28px] w-[80px] rounded-full" style={{ backgroundColor: COLORS.surface }} />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

// =============================================================================
// EMPTY STATE
// =============================================================================

const EmptyState = memo(({ searchQuery, onClearSearch }: { searchQuery: string; onClearSearch: () => void }) => {
  const { t } = useTranslation();

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      className="flex-1 items-center justify-center px-8"
    >
      <View
        className="w-20 h-20 rounded-full items-center justify-center mb-4"
        style={{ backgroundColor: COLORS.surface }}
      >
        <Search size={32} color={COLORS.textTertiary} />
      </View>
      <Text className="text-xl font-bold text-center mb-2" style={{ color: COLORS.textPrimary }}>
        {searchQuery
          ? t('communities.discover.empty.noResults', 'No Results')
          : t('communities.discover.empty.noCommunities', 'No Communities')}
      </Text>
      <Text className="text-[15px] text-center leading-[20px]" style={{ color: COLORS.textSecondary }}>
        {searchQuery
          ? t('communities.discover.empty.noResultsDesc', `No communities found matching "${searchQuery}"`)
          : t('communities.discover.empty.noCommunitiesDesc', 'No public communities available at the moment.')}
      </Text>
      {searchQuery && (
        <Pressable
          onPress={onClearSearch}
          className="mt-4 px-5 py-2.5 rounded-full active:opacity-80"
          style={{ backgroundColor: COLORS.surface }}
        >
          <Text className="text-[15px] font-medium" style={{ color: COLORS.primary }}>
            {t('communities.discover.empty.clearSearch', 'Clear Search')}
          </Text>
        </Pressable>
      )}
    </Animated.View>
  );
});

EmptyState.displayName = 'EmptyState';

// =============================================================================
// MAIN SCREEN
// =============================================================================

function CommunityDiscoverScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
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
                }),
                [
                  { text: t('common.ok', 'OK'), style: 'cancel' },
                  {
                    text: t('groups.openChat', 'Open Chat'),
                    onPress: () => router.push(`/community/${community.id}/chat` as any),
                  },
                ]
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
    [joinMutation, t, router]
  );

  const getCategoryColor = useCallback((category: string) => {
    const categoryColors: Record<string, string> = {
      cell_group: COLORS.categoryCell,
      ministry_team: COLORS.categoryMinistry,
      activity: COLORS.categoryActivity,
      support_group: COLORS.categorySupport,
    };
    return categoryColors[category] || COLORS.textTertiary;
  }, []);

  const getCategoryLabel = useCallback((category: string) => {
    const labels: Record<string, string> = {
      cell_group: t('communities.category.cellGroup', 'Cell Group'),
      ministry_team: t('communities.category.ministryTeam', 'Ministry Team'),
      activity: t('communities.category.activity', 'Activity'),
      support_group: t('communities.category.supportGroup', 'Support Group'),
    };
    return labels[category] || category;
  }, [t]);

  const categories: { key: CategoryFilter; label: string }[] = useMemo(() => [
    { key: 'all', label: t('common.all', 'All') },
    { key: 'cell_group', label: t('communities.category.cellGroup', 'Cell Group') },
    { key: 'ministry_team', label: t('communities.category.ministryTeam', 'Ministry') },
    { key: 'activity', label: t('communities.category.activity', 'Activity') },
    { key: 'support_group', label: t('communities.category.supportGroup', 'Support') },
  ], [t]);

  const handleCommunityPress = useCallback((community: CommunityWithStatus) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const isMember = community.my_role !== undefined;
    const isPending = community.membership_status === 'pending';

    if (isMember && !isPending) {
      router.push(`/community/${community.id}/chat` as any);
    } else {
      // Navigate to community preview/info page
      router.push(`/community/${community.id}/preview` as any);
    }
  }, [router]);

  const renderItem = useCallback(
    ({ item: community, index }: { item: CommunityWithStatus; index: number }) => (
      <Animated.View entering={FadeInDown.delay(index * 50).duration(300)}>
        <CommunityCard
          community={community}
          onPress={() => handleCommunityPress(community)}
          onJoin={() => handleJoin(community)}
          isJoining={joinMutation.isPending}
          getCategoryColor={getCategoryColor}
          getCategoryLabel={getCategoryLabel}
        />
      </Animated.View>
    ),
    [handleCommunityPress, handleJoin, joinMutation.isPending, getCategoryColor, getCategoryLabel]
  );

  // Loading skeleton
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      {/* Header - WhatsApp iOS style */}
      <View style={{ paddingTop: insets.top, backgroundColor: COLORS.white }}>
        {/* Title row with back button */}
        <View className="flex-row items-center py-2" style={{ paddingLeft: 8 }}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="p-2 active:opacity-70"
          >
            <ChevronLeft size={28} color="#007AFF" strokeWidth={2} />
          </Pressable>
          <Text className="text-[28px] font-bold ml-1" style={{ color: COLORS.textPrimary }}>
            {t('communities.discover', 'Discover')}
          </Text>
        </View>

        {/* Search bar */}
        <View className="pr-4 pb-2" style={{ paddingLeft: 20 }}>
          <View
            className="flex-row items-center rounded-xl px-3"
            style={{ backgroundColor: COLORS.surface, height: 36 }}
          >
            <Search size={18} color={COLORS.textTertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('communities.discover.searchPlaceholder', 'Search communities...')}
              placeholderTextColor={COLORS.textTertiary}
              className="flex-1 ml-2 text-[17px]"
              style={{ color: COLORS.textPrimary, paddingVertical: 0 }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <X size={18} color={COLORS.textTertiary} />
              </Pressable>
            )}
          </View>
        </View>

        {/* Category filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="pb-2"
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {categories.map((cat) => {
            const isActive = categoryFilter === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCategoryFilter(cat.key);
                }}
                className="rounded-full px-4 py-2 active:opacity-80"
                style={{
                  backgroundColor: isActive ? COLORS.primary : COLORS.surface,
                }}
              >
                <Text
                  className="text-[14px] font-medium"
                  style={{ color: isActive ? COLORS.white : COLORS.textSecondary }}
                >
                  {cat.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Divider */}
      <View style={{ height: 1, backgroundColor: COLORS.divider }} />

      {/* Content */}
      {filteredCommunities.length === 0 ? (
        <EmptyState searchQuery={searchQuery} onClearSearch={() => setSearchQuery('')} />
      ) : (
        <FlashList
          data={filteredCommunities}
          renderItem={renderItem}
          keyExtractor={(item: CommunityWithStatus) => item.id}
          estimatedItemSize={120}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
}

// Memoize and apply Premium Motion HOC
const MemoizedCommunityDiscoverScreen = memo(CommunityDiscoverScreen);
MemoizedCommunityDiscoverScreen.displayName = 'CommunityDiscoverScreen';
export default withPremiumMotionV10(MemoizedCommunityDiscoverScreen);
