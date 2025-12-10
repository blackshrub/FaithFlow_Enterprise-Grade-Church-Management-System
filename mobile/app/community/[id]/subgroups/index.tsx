/**
 * Sub-groups List Screen
 *
 * Lists all sub-groups within a community:
 * - Sub-group cards with name, description, member count
 * - Last message preview
 * - Unread badge
 * - Create sub-group button (if allowed)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  Plus,
  Users,
  MessageSquare,
  ChevronRight,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';

import {
  useCommunity,
  useCommunitySubgroups,
} from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import type { CommunitySubgroup } from '@/types/communities';
import { CreateSubgroupModal } from '@/components/communities/CreateSubgroupModal';
import { goBack, navigateTo } from '@/utils/navigation';

// =============================================================================
// SUB-GROUP CARD
// =============================================================================

interface SubgroupCardProps {
  subgroup: CommunitySubgroup;
  onPress: () => void;
}

function SubgroupCard({ subgroup, onPress }: SubgroupCardProps) {
  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      className="active:opacity-80"
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Open ${subgroup.name} subgroup`}
    >
      <View
        className="mx-4 my-2 p-4 rounded-xl bg-white"
        style={shadows.sm}
      >
        <HStack space="md" className="items-center">
          {/* Avatar */}
          <Avatar size="lg" className="bg-primary-100">
            {subgroup.cover_image_fid ? (
              <AvatarImage source={{ uri: subgroup.cover_image_fid }} />
            ) : (
              <AvatarFallbackText className="text-primary-600">
                {subgroup.name.substring(0, 2).toUpperCase()}
              </AvatarFallbackText>
            )}
          </Avatar>

          {/* Info */}
          <VStack className="flex-1" space="xs">
            <HStack className="justify-between items-center">
              <Text className="text-gray-900 font-bold text-base" numberOfLines={1}>
                {subgroup.name}
              </Text>
              {subgroup.last_message?.created_at && (
                <Text className="text-gray-500 text-xs">
                  {formatTime(subgroup.last_message.created_at)}
                </Text>
              )}
            </HStack>

            {subgroup.description && (
              <Text className="text-gray-600 text-sm" numberOfLines={1}>
                {subgroup.description}
              </Text>
            )}

            <HStack className="justify-between items-center">
              {/* Last message */}
              {subgroup.last_message ? (
                <Text className="text-gray-500 text-sm flex-1" numberOfLines={1}>
                  <Text className="font-medium">
                    {subgroup.last_message.sender_name}:
                  </Text>{' '}
                  {subgroup.last_message.text_preview}
                </Text>
              ) : (
                <Text className="text-gray-600 text-sm italic">
                  No messages yet
                </Text>
              )}

              {/* Unread badge */}
              {(subgroup.unread_count ?? 0) > 0 && (
                <Badge
                  variant="solid"
                  action="error"
                  className="rounded-full min-w-[22px] h-[22px]"
                >
                  <BadgeText className="text-xs">
                    {subgroup.unread_count! > 99 ? '99+' : subgroup.unread_count}
                  </BadgeText>
                </Badge>
              )}
            </HStack>

            {/* Member count */}
            <HStack space="xs" className="items-center">
              <Icon as={Users} size="xs" className="text-gray-500" />
              <Text className="text-gray-500 text-xs">
                {subgroup.member_count} members
              </Text>
            </HStack>
          </VStack>

          <Icon as={ChevronRight} size="md" className="text-gray-300" />
        </HStack>
      </View>
    </Pressable>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function SubgroupsListScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: communityId } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuthStore();

  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch community and subgroups
  const { data: community, isLoading: isLoadingCommunity } = useCommunity(communityId);
  const {
    data: subgroups,
    isLoading: isLoadingSubgroups,
    refetch,
    isRefetching,
  } = useCommunitySubgroups(communityId);

  // Check if user can create subgroups
  const canCreateSubgroup = useCallback(() => {
    if (!community || !member) return false;

    const settings = community.settings;
    if (!settings?.allow_member_create_subgroups) {
      // Only leaders can create
      return community.leader_member_ids?.includes(member.id) ||
             community.my_role === 'admin' ||
             community.my_role === 'leader';
    }
    return true; // All members can create
  }, [community, member]);

  const handleSubgroupPress = (subgroup: CommunitySubgroup) => {
    navigateTo(`/community/${communityId}/subgroups/${subgroup.id}`);
  };

  const handleCreateSubgroup = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateModal(true);
  };

  // Loading state
  if (isLoadingCommunity || (isLoadingSubgroups && !subgroups)) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        {/* Header skeleton */}
        <HStack className="px-4 py-3 bg-white border-b border-gray-100 items-center" space="md">
          <Skeleton className="w-10 h-10 rounded-full" isLoaded={false} />
          <Skeleton className="h-6 w-40" isLoaded={false} />
        </HStack>

        {/* List skeleton */}
        <VStack className="p-4" space="md">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-xl" isLoaded={false} />
          ))}
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View
        className="bg-white border-b border-gray-100"
        style={shadows.sm}
      >
        <HStack className="px-4 py-3 items-center" space="md">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              goBack();
            }}
            className="active:opacity-70"
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('common.back', 'Go back')}
          >
            <Icon as={ArrowLeft} size="lg" className="text-gray-800" />
          </Pressable>

          <VStack className="flex-1">
            <Heading size="lg" className="text-gray-900">
              {t('communities.subgroups.title', 'Sub-groups')}
            </Heading>
            <Text className="text-gray-500 text-sm">
              {community?.name}
            </Text>
          </VStack>

          {/* Create button */}
          {canCreateSubgroup() && (
            <Button
              size="sm"
              variant="solid"
              action="primary"
              onPress={handleCreateSubgroup}
              className="rounded-full"
            >
              <ButtonIcon as={Plus} />
            </Button>
          )}
        </HStack>
      </View>

      {/* Sub-groups list */}
      {subgroups && subgroups.length > 0 ? (
        <FlashList
          data={subgroups}
          renderItem={({ item }: { item: CommunitySubgroup }) => (
            <SubgroupCard
              subgroup={item}
              onPress={() => handleSubgroupPress(item)}
            />
          )}
          keyExtractor={(item: CommunitySubgroup) => item.id}
          estimatedItemSize={120}
          contentContainerStyle={{ paddingVertical: spacing.md }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              colors={[colors.primary[500]]}
              tintColor={colors.primary[500]}
            />
          }
        />
      ) : (
        // Empty state
        <VStack className="flex-1 items-center justify-center px-8" space="md">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: colors.gray[100] }}
          >
            <Icon as={MessageSquare} size="2xl" className="text-gray-500" />
          </View>
          <Text className="text-gray-600 text-center text-lg font-medium">
            {t('communities.subgroups.noSubgroups', 'No sub-groups yet')}
          </Text>
          <Text className="text-gray-500 text-center">
            {t('communities.subgroups.createFirst', 'Create a sub-group to start smaller discussions within this community.')}
          </Text>
          {canCreateSubgroup() && (
            <Button
              variant="solid"
              action="primary"
              size="lg"
              onPress={handleCreateSubgroup}
              className="mt-4"
            >
              <ButtonIcon as={Plus} className="mr-2" />
              <ButtonText>{t('communities.subgroups.create', 'Create Sub-group')}</ButtonText>
            </Button>
          )}
        </VStack>
      )}

      {/* Create modal */}
      <CreateSubgroupModal
        visible={showCreateModal}
        communityId={communityId}
        onClose={() => setShowCreateModal(false)}
        onCreated={(subgroup) => {
          setShowCreateModal(false);
          handleSubgroupPress(subgroup);
        }}
      />
    </SafeAreaView>
  );
}
