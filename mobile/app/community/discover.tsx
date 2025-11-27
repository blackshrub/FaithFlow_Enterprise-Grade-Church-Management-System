/**
 * Community Discovery Screen - Browse & Join Public Communities
 *
 * Features:
 * - Browse public communities
 * - Search communities
 * - Filter by category
 * - Join request functionality
 * - Pull-to-refresh
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  TextInput,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Users,
  X,
  Filter,
  ChevronRight,
  Check,
  Clock,
  Lock,
  Globe,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { MotiView } from 'moti';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Button, ButtonText } from '@/components/ui/button';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';

import { usePublicCommunities, useJoinCommunity } from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import type { CommunityWithStatus } from '@/types/communities';

type CategoryFilter = 'all' | 'cell_group' | 'ministry_team' | 'activity' | 'support_group';

export default function CommunityDiscoverScreen() {
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
                t('groups.joinRequestSent'),
                t('groups.joinRequestSentDesc', { name: community.name })
              );
            } else {
              Alert.alert(
                t('groups.joinSuccess'),
                t('groups.joinSuccessDesc', { name: community.name })
              );
            }
          },
          onError: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            Alert.alert(t('common.error'), t('groups.joinError'));
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
      cell_group: t('communities.category.cellGroup'),
      ministry_team: t('communities.category.ministryTeam'),
      activity: t('communities.category.activity'),
      support_group: t('communities.category.supportGroup'),
    };
    return labels[category] || category;
  };

  const categories: { key: CategoryFilter; label: string }[] = [
    { key: 'all', label: t('common.all', 'All') },
    { key: 'cell_group', label: t('communities.category.cellGroup') },
    { key: 'ministry_team', label: t('communities.category.ministryTeam') },
    { key: 'activity', label: t('communities.category.activity') },
    { key: 'support_group', label: t('communities.category.supportGroup') },
  ];

  // Render community card
  const renderCommunity = useCallback(
    ({ item: community }: { item: CommunityWithStatus }) => {
      const isMember = community.my_role !== undefined;
      const isPending = community.membership_status === 'pending';
      const isFull =
        community.max_members && community.member_count >= community.max_members;

      return (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            if (isMember && !isPending) {
              router.push(`/community/${community.id}/chat` as any);
            }
          }}
          className="active:opacity-90"
        >
          <Card
            style={{
              ...shadows.sm,
              borderRadius: borderRadius.xl,
              marginHorizontal: spacing.lg,
              marginBottom: spacing.md,
            }}
          >
            <View className="p-4">
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
                    <VStack className="flex-1 mr-2">
                      <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
                        {community.name}
                      </Text>

                      <HStack space="md" className="items-center mt-0.5">
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
                        <BadgeText className="text-gray-500">Private</BadgeText>
                      </Badge>
                    ) : (
                      <Badge variant="outline" size="sm" action="success">
                        <Icon as={Globe} size="xs" className="text-success-600 mr-1" />
                        <BadgeText className="text-success-600">Public</BadgeText>
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
                  <View className="mt-2">
                    {isMember && !isPending ? (
                      <Button
                        size="sm"
                        variant="outline"
                        action="secondary"
                        onPress={() => router.push(`/community/${community.id}/chat` as any)}
                      >
                        <Icon as={ChevronRight} size="sm" className="text-primary-600 mr-1" />
                        <ButtonText className="text-primary-600">Open Chat</ButtonText>
                      </Button>
                    ) : isPending ? (
                      <Button size="sm" variant="outline" disabled>
                        <Icon as={Clock} size="sm" className="text-gray-400 mr-1" />
                        <ButtonText className="text-gray-500">
                          {t('groups.pendingApproval')}
                        </ButtonText>
                      </Button>
                    ) : isFull ? (
                      <Button size="sm" variant="outline" disabled>
                        <ButtonText className="text-gray-500">{t('groups.full')}</ButtonText>
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onPress={() => handleJoin(community)}
                        disabled={joinMutation.isPending}
                      >
                        <Icon as={Check} size="sm" className="text-white mr-1" />
                        <ButtonText>{t('groups.join')}</ButtonText>
                      </Button>
                    )}
                  </View>
                </VStack>
              </HStack>
            </View>
          </Card>
        </Pressable>
      );
    },
    [handleJoin, joinMutation.isPending, router, t]
  );

  // Loading skeleton
  const CommunityListSkeleton = () => (
    <VStack space="md" className="px-5">
      {[1, 2, 3, 4].map((i) => (
        <Card key={i} style={{ ...shadows.sm, borderRadius: borderRadius.xl }}>
          <View className="p-4">
            <HStack space="md">
              <Skeleton className="w-14 h-14 rounded-full" isLoaded={false} />
              <VStack className="flex-1" space="sm">
                <Skeleton className="h-5 w-3/4" isLoaded={false} />
                <Skeleton className="h-3 w-1/2" isLoaded={false} />
                <Skeleton className="h-12 w-full" isLoaded={false} />
              </VStack>
            </HStack>
          </View>
        </Card>
      ))}
    </VStack>
  );

  // Empty state
  const EmptyState = () => (
    <View className="flex-1 items-center justify-center px-8 py-16">
      <MotiView
        from={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', delay: 200 }}
      >
        <View
          className="w-24 h-24 rounded-full items-center justify-center mb-6"
          style={{ backgroundColor: colors.primary[50] }}
        >
          <Icon as={Search} size="3xl" className="text-primary-400" />
        </View>
      </MotiView>

      <Heading size="xl" className="text-gray-900 mb-3 text-center font-bold">
        {searchQuery ? 'No Results' : 'No Communities'}
      </Heading>
      <Text className="text-gray-500 text-center text-base leading-6 max-w-sm">
        {searchQuery
          ? `No communities found matching "${searchQuery}"`
          : 'No public communities available at the moment.'}
      </Text>

      {searchQuery && (
        <Button
          onPress={() => setSearchQuery('')}
          size="md"
          variant="outline"
          className="mt-6"
        >
          <ButtonText>Clear Search</ButtonText>
        </Button>
      )}
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="px-5 pt-4 pb-3 border-b border-gray-100">
        <HStack className="items-center mb-4" space="md">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="active:opacity-70"
          >
            <Icon as={ArrowLeft} size="lg" className="text-gray-800" />
          </Pressable>

          <Heading size="2xl" className="text-gray-900 font-bold flex-1">
            {t('communities.discover')}
          </Heading>
        </HStack>

        {/* Search bar */}
        <HStack
          space="sm"
          className="items-center px-4 py-3 rounded-xl"
          style={{ backgroundColor: colors.gray[100] }}
        >
          <Icon as={Search} size="md" className="text-gray-400" />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Search communities..."
            placeholderTextColor={colors.gray[400]}
            className="flex-1 text-base text-gray-900"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery('')}>
              <Icon as={X} size="md" className="text-gray-400" />
            </Pressable>
          )}
        </HStack>

        {/* Category filters */}
        <HStack space="sm" className="mt-3">
          {categories.map((cat) => {
            const isActive = categoryFilter === cat.key;
            return (
              <Pressable
                key={cat.key}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setCategoryFilter(cat.key);
                }}
              >
                <View
                  className="px-4 py-2 rounded-full"
                  style={{
                    backgroundColor: isActive ? colors.primary[500] : colors.gray[100],
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
            );
          })}
        </HStack>
      </View>

      {/* Content */}
      {isLoading ? (
        <View className="pt-4">
          <CommunityListSkeleton />
        </View>
      ) : filteredCommunities.length > 0 ? (
        <FlashList
          data={filteredCommunities}
          renderItem={renderCommunity}
          keyExtractor={(item: CommunityWithStatus) => item.id}
          estimatedItemSize={160}
          contentContainerStyle={{ paddingTop: spacing.md, paddingBottom: 120 }}
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
        <EmptyState />
      )}
    </SafeAreaView>
  );
}
