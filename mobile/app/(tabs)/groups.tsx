/**
 * Community Tab - WhatsApp-Style Community List
 *
 * World-class, production-ready design with attention to:
 * - Typography: Proper font sizes, weights, line heights
 * - Spacing: Consistent 8pt grid system
 * - Touch targets: Minimum 44pt for accessibility
 * - Visual hierarchy: Clear information architecture
 * - Micro-interactions: Haptic feedback, animations
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  TextInput,
  StatusBar,
  Platform,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  SlideInRight,
} from 'react-native-reanimated';
import { useFocusKey } from '@/hooks/useFocusAnimation';
import {
  Search,
  X,
  Compass,
  CheckCheck,
  ArrowLeft,
  MessageCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';

import { Icon } from '@/components/ui/icon';
import { communityColors, colors } from '@/constants/theme';

import { useMyCommunities, usePrefetchCommunity } from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import type { CommunityWithStatus } from '@/types/communities';

// =============================================================================
// COMMUNITY LIST ITEM
// =============================================================================

interface CommunityItemProps {
  community: CommunityWithStatus;
  onPress: () => void;
  onPressIn: () => void;
}

const CommunityItem = memo(({ community, onPress, onPressIn }: CommunityItemProps) => {
  const { t } = useTranslation();
  const hasUnread = (community.unread_count ?? 0) > 0;

  // Format timestamp like WhatsApp - smart time display
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } else if (days === 1) {
      return t('common.yesterday', 'Yesterday');
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  // Get last message preview with thread name and type indicators
  const getLastMessagePreview = () => {
    if (!community.last_message) return '';
    const { sender_name, text_preview, message_type, thread_name } = community.last_message;

    let preview = text_preview;
    if (message_type === 'image') preview = '📷 Photo';
    else if (message_type === 'video') preview = '🎬 Video';
    else if (message_type === 'audio') preview = '🎵 Voice message';
    else if (message_type === 'document') preview = '📄 Document';
    else if (message_type === 'poll') preview = '📊 Poll';
    else if (message_type === 'location') preview = '📍 Location';

    // Include thread name if available
    if (thread_name) {
      return `${thread_name}: ${sender_name}: ${preview}`;
    }
    return `${sender_name}: ${preview}`;
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      android_ripple={{ color: communityColors.ripple, borderless: false }}
      className="flex-row items-start pr-5 pl-5 py-3.5 min-h-[80px] bg-white relative"
      style={({ pressed }) => [
        Platform.OS === 'ios' && pressed && { backgroundColor: communityColors.pressed },
      ]}
    >
      {/* Avatar - 64pt for better visual weight */}
      <View className="mr-3">
        {community.cover_image ? (
          <Image
            source={{ uri: community.cover_image }}
            className="w-16 h-16 rounded-full"
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={150}
            placeholder="LBMkBn00_N4n%Mxu-;WB~qt7M{WB"
            placeholderContentFit="cover"
          />
        ) : (
          <View className="w-16 h-16 rounded-full items-center justify-center" style={{ backgroundColor: communityColors.light }}>
            <Text className="text-2xl font-semibold tracking-wide" style={{ color: communityColors.text.onPrimary }}>
              {community.name.substring(0, 2).toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Content */}
      <View className="flex-1">
        {/* Top row: Name + Time */}
        <View className="flex-row justify-between items-center mb-1">
          <Text
            className={`flex-1 text-[17px] mr-3 ${hasUnread ? 'font-semibold' : 'font-medium'}`}
            style={{ color: communityColors.text.primary }}
            numberOfLines={1}
          >
            {community.name}
          </Text>
          <Text
            className={`text-[13px] ${hasUnread ? 'font-semibold' : ''}`}
            style={{ color: hasUnread ? communityColors.light : communityColors.text.secondary }}
          >
            {formatTime(community.last_message?.created_at)}
          </Text>
        </View>

        {/* Bottom row: Last message + Unread badge */}
        <View className="flex-row justify-between items-start">
          {/* Message status + Preview */}
          <View className="flex-1 flex-row items-start mr-2">
            {(community.my_role === 'leader' || community.my_role === 'admin') && community.last_message && (
              <Icon as={CheckCheck} size="md" style={{ color: communityColors.status.read, marginRight: 4, marginTop: 1 }} />
            )}
            <Text
              className={`flex-1 text-[15px] leading-[20px] ${hasUnread ? 'font-medium' : ''}`}
              style={{ color: hasUnread ? communityColors.text.primary : communityColors.text.secondary }}
              numberOfLines={2}
            >
              {getLastMessagePreview() || t('communities.noMessages', 'No messages yet')}
            </Text>
          </View>

          {/* Unread badge */}
          {hasUnread && (
            <View className="rounded-full min-w-[22px] h-[22px] items-center justify-center px-1.5" style={{ backgroundColor: communityColors.light }}>
              <Text className="text-[13px] font-bold" style={{ color: communityColors.text.onPrimary }}>
                {(community.unread_count ?? 0) > 99 ? '99+' : community.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Divider - starts after avatar (left: 20 padding + 64 avatar = 84) */}
      <View
        className="absolute bottom-0 right-0 z-10"
        style={{ left: 84, height: 1, backgroundColor: communityColors.divider }}
      />
    </Pressable>
  );
});

CommunityItem.displayName = 'CommunityItem';

// =============================================================================
// EMPTY STATE
// =============================================================================

const EmptyState = memo(() => {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View className="flex-1 items-center justify-center px-8">
      <Animated.View entering={FadeIn.delay(100).duration(400)}>
        <View className="w-[100px] h-[100px] rounded-full items-center justify-center mb-6" style={{ backgroundColor: '#E8F5E9' }}>
          <Icon as={MessageCircle} size="3xl" color={communityColors.dark} />
        </View>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(200).duration(400)}>
        <Text className="text-xl font-semibold text-center mb-2" style={{ color: communityColors.text.primary }}>
          {t('communities.noCommunities', 'No Communities Yet')}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(300).duration(400)}>
        <Text className="text-[15px] text-center leading-[22px] mb-6" style={{ color: communityColors.text.secondary }}>
          {t('communities.noCommunitiesDesc', 'Join a community to connect with others and grow together in faith.')}
        </Text>
      </Animated.View>

      <Animated.View entering={FadeIn.delay(400).duration(400)}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push('/community/discover' as any);
          }}
          className="px-6 py-3.5 rounded-3xl min-h-[48px] items-center justify-center active:opacity-90"
          style={{ backgroundColor: communityColors.dark }}
        >
          <Text className="text-base font-semibold" style={{ color: communityColors.text.onPrimary }}>
            {t('communities.discoverCommunities', 'Discover Communities')}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
});

EmptyState.displayName = 'EmptyState';

// =============================================================================
// SEARCH BAR
// =============================================================================

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  onClose: () => void;
}

const SearchBar = memo(({ value, onChangeText, onClose }: SearchBarProps) => {
  const { t } = useTranslation();

  return (
    <Animated.View
      entering={SlideInRight.duration(200)}
      exiting={FadeOut.duration(150)}
      className="flex-row items-center h-14 px-2"
      style={{ backgroundColor: communityColors.dark }}
    >
      {/* Back button - 44pt touch target */}
      <Pressable
        onPress={onClose}
        className="w-11 h-11 items-center justify-center"
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <Icon as={ArrowLeft} size="lg" color={communityColors.text.onPrimary} />
      </Pressable>

      {/* Search input */}
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={t('communities.search', 'Search...')}
        placeholderTextColor="rgba(255,255,255,0.6)"
        className="flex-1 text-[17px] py-2 px-2"
        style={{ color: communityColors.text.onPrimary }}
        autoFocus
        returnKeyType="search"
        autoCapitalize="none"
        autoCorrect={false}
        selectionColor="rgba(255,255,255,0.8)"
      />

      {/* Clear button */}
      {value.length > 0 && (
        <Pressable
          onPress={() => onChangeText('')}
          className="w-11 h-11 items-center justify-center"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon as={X} size="md" color={communityColors.text.onPrimary} />
        </Pressable>
      )}
    </Animated.View>
  );
});

SearchBar.displayName = 'SearchBar';

// =============================================================================
// LOADING SKELETON
// =============================================================================

const LoadingSkeleton = memo(() => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />
      {/* Header skeleton */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.white }}>
        <View className="flex-row items-center justify-between px-5 py-2">
          <Text className="text-[34px] font-bold" style={{ color: communityColors.text.primary, letterSpacing: -0.5 }}>
            {t('tabs.communities', 'Community')}
          </Text>
          <View className="w-10 h-10 rounded-full" style={{ backgroundColor: communityColors.background.surface }} />
        </View>
        <View className="px-5 pb-2">
          <View className="rounded-xl" style={{ backgroundColor: communityColors.background.surface, height: 36 }} />
        </View>
      </View>
      <View className="flex-1">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Animated.View
            key={i}
            entering={FadeIn.delay(i * 80).duration(300)}
            className="flex-row px-5 py-3.5 min-h-[80px] items-start"
          >
            <View className="w-16 h-16 rounded-full mr-3" style={{ backgroundColor: communityColors.background.surface }} />
            <View className="flex-1">
              <View className="h-[18px] w-[55%] rounded mb-2" style={{ backgroundColor: communityColors.background.surface }} />
              <View className="h-[14px] w-[85%] rounded mb-1" style={{ backgroundColor: communityColors.background.surface }} />
              <View className="h-[14px] w-[60%] rounded" style={{ backgroundColor: communityColors.background.surface }} />
            </View>
          </Animated.View>
        ))}
      </View>
    </View>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

// =============================================================================
// MAIN SCREEN
// =============================================================================

function CommunityScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member } = useAuthStore();
  const insets = useSafeAreaInsets();

  // Focus key - triggers child animation replay on tab focus (no container opacity flash)
  const focusKey = useFocusKey();

  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch communities
  const {
    data: communities = [],
    isLoading,
    refetch,
  } = useMyCommunities();

  // Prefetch for instant navigation
  const prefetchCommunity = usePrefetchCommunity();

  // Filter communities
  const filteredCommunities = useMemo(() => {
    if (!searchQuery.trim()) return communities;
    const query = searchQuery.toLowerCase();
    return communities.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.description?.toLowerCase().includes(query)
    );
  }, [communities, searchQuery]);

  // Handlers
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleOpenCommunity = useCallback(
    (community: CommunityWithStatus) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Navigate to community threads list (WhatsApp Communities style)
      router.push(`/community/${community.id}` as any);
    },
    [router]
  );

  const handlePrefetch = useCallback(
    (community: CommunityWithStatus) => {
      prefetchCommunity(community.id, member?.church_id);
    },
    [prefetchCommunity, member?.church_id]
  );

  // Render item with focusKey for re-triggering animations
  const renderItem = useCallback(
    ({ item, index }: { item: CommunityWithStatus; index: number }) => (
      <Animated.View
        key={`community-${item.id}-${focusKey}`}
        entering={FadeInDown.delay(Math.min(index * 40, 200)).duration(300)}
      >
        <CommunityItem
          community={item}
          onPress={() => handleOpenCommunity(item)}
          onPressIn={() => handlePrefetch(item)}
        />
      </Animated.View>
    ),
    [handleOpenCommunity, handlePrefetch, focusKey]
  );

  // Loading skeleton
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={colors.white} />

      {/* Header - WhatsApp iOS style with white background */}
      <View style={{ paddingTop: insets.top, backgroundColor: colors.white }}>
        {/* Title row */}
        <View className="flex-row items-center justify-between px-5 py-2">
          <Text className="text-[34px] font-bold" style={{ color: communityColors.text.primary, letterSpacing: -0.5 }}>
            {t('tabs.communities', 'Community')}
          </Text>
          <Pressable
            onPress={() => router.push('/community/discover')}
            className="w-10 h-10 items-center justify-center rounded-full"
            style={{ backgroundColor: communityColors.background.surface }}
          >
            <Icon as={Compass} size="md" color={communityColors.dark} />
          </Pressable>
        </View>

        {/* Search bar - always visible */}
        <View className="px-5 pb-2">
          <View
            className="flex-row items-center rounded-xl px-3"
            style={{ backgroundColor: communityColors.background.surface, height: 36 }}
          >
            <Icon as={Search} size="md" color={communityColors.text.tertiary} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('communities.searchPlaceholder', 'Search')}
              placeholderTextColor={communityColors.text.tertiary}
              className="flex-1 ml-2 text-[17px]"
              style={{ color: communityColors.text.primary, paddingVertical: 0 }}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')}>
                <Icon as={X} size="md" color={communityColors.text.tertiary} />
              </Pressable>
            )}
          </View>
        </View>
      </View>

      {/* Content */}
      {filteredCommunities.length === 0 && !searchQuery ? (
        <EmptyState />
      ) : (
        <FlashList
          data={filteredCommunities}
          renderItem={renderItem}
          keyExtractor={(item: CommunityWithStatus) => item.id}
          estimatedItemSize={80}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          // Performance optimizations
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          drawDistance={200}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={communityColors.dark}
              colors={[communityColors.dark]}
            />
          }
          ListEmptyComponent={
            searchQuery ? (
              <View className="flex-1 items-center justify-center py-16 px-6">
                <Text className="text-[15px] text-center" style={{ color: communityColors.text.secondary }}>
                  {t('communities.noResults', 'No communities found for "{{query}}"', { query: searchQuery })}
                </Text>
              </View>
            ) : null
          }
        />
      )}

    </View>
  );
}

// Memoize screen for performance
const MemoizedCommunityScreen = memo(CommunityScreen);
MemoizedCommunityScreen.displayName = 'CommunityScreen';
export default MemoizedCommunityScreen;
