/**
 * Community Preview Screen - View Community Details Before Joining
 *
 * For non-members to see:
 * - Community info (name, description, category)
 * - Member count and privacy status
 * - Meeting schedule/location
 * - Join button
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 */

import React, { useCallback, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StatusBar,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown, FadeInUp } from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import {
  ChevronLeft,
  Users,
  Calendar,
  MapPin,
  Lock,
  Globe,
  Check,
  Clock,
  Info,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { useCommunity, useJoinCommunity } from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import { communityColors, colors } from '@/constants/theme';
import { goBack, replaceTo } from '@/utils/navigation';

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 220;

// =============================================================================
// LOADING SKELETON
// =============================================================================

const LoadingSkeleton = memo(() => {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />
      {/* Header skeleton */}
      <View style={{ height: HEADER_HEIGHT, backgroundColor: communityColors.light }} />
      {/* Content skeleton */}
      <View className="p-5">
        <View className="h-8 w-48 rounded mb-2" style={{ backgroundColor: communityColors.background.surface }} />
        <View className="h-4 w-32 rounded mb-6" style={{ backgroundColor: communityColors.background.surface }} />
        <View className="h-24 w-full rounded-xl mb-4" style={{ backgroundColor: communityColors.background.surface }} />
        <View className="h-32 w-full rounded-xl mb-4" style={{ backgroundColor: communityColors.background.surface }} />
        <View className="h-14 w-full rounded-full" style={{ backgroundColor: communityColors.background.surface }} />
      </View>
    </View>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

// =============================================================================
// MAIN SCREEN
// =============================================================================

function CommunityPreviewScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuthStore();

  // Fetch community details
  const { data: community, isLoading } = useCommunity(id);

  // Join mutation
  const joinMutation = useJoinCommunity();

  const getCategoryColor = useCallback((category?: string) => {
    const categoryColorsMap: Record<string, string> = {
      cell_group: communityColors.category.general,
      ministry_team: communityColors.category.ministry,
      activity: communityColors.category.activity,
      support_group: communityColors.category.support,
    };
    return categoryColorsMap[category || ''] || communityColors.text.tertiary;
  }, []);

  const getCategoryLabel = useCallback((category?: string) => {
    const labels: Record<string, string> = {
      cell_group: t('communities.category.cellGroup', 'Cell Group'),
      ministry_team: t('communities.category.ministryTeam', 'Ministry Team'),
      activity: t('communities.category.activity', 'Activity'),
      support_group: t('communities.category.supportGroup', 'Support Group'),
    };
    return labels[category || ''] || category || '';
  }, [t]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    goBack();
  }, []);

  const handleJoin = useCallback(() => {
    if (!community) return;
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
                defaultValue: `Your request to join ${community.name} has been sent. You'll be notified when approved.`,
              }),
              [{ text: t('common.ok', 'OK'), onPress: () => router.back() }]
            );
          } else {
            Alert.alert(
              t('groups.joinSuccess', 'Joined Successfully'),
              t('groups.joinSuccessDesc', {
                name: community.name,
                defaultValue: `You have joined ${community.name}.`,
              }),
              [
                { text: t('common.ok', 'OK'), style: 'cancel', onPress: () => goBack() },
                {
                  text: t('groups.openChat', 'Open Chat'),
                  onPress: () => replaceTo(`/community/${community.id}/chat`),
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
  }, [community, joinMutation, t, router]);

  // Check membership status
  const isMember = community?.my_role !== undefined;
  const isPending = community?.membership_status === 'pending';
  const isFull = community?.max_members && community?.member_count >= community?.max_members;

  // Loading state
  if (isLoading) {
    return <LoadingSkeleton />;
  }

  // If already a member, redirect to chat
  if (isMember && !isPending) {
    replaceTo(`/community/${id}/chat`);
    return null;
  }

  return (
    <View className="flex-1" style={{ backgroundColor: communityColors.background.surface }}>
      <StatusBar barStyle="light-content" />

      {/* Header with cover image */}
      <View style={{ height: HEADER_HEIGHT }}>
        {community?.cover_image ? (
          <Image
            source={{ uri: community.cover_image }}
            style={{ width: SCREEN_WIDTH, height: HEADER_HEIGHT }}
            contentFit="cover"
          />
        ) : (
          <LinearGradient
            colors={[getCategoryColor(community?.category), communityColors.dark]}
            style={{ width: SCREEN_WIDTH, height: HEADER_HEIGHT }}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
        )}

        {/* Overlay gradient */}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          }}
        />

        {/* Back button */}
        <Pressable
          onPress={handleBack}
          className="absolute active:opacity-70"
          style={{
            top: insets.top + 8,
            left: 12,
            width: 40,
            height: 40,
            borderRadius: 20,
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={24} color={colors.white} />
        </Pressable>

        {/* Community name overlay */}
        <View className="absolute bottom-0 left-0 right-0 p-5">

          {/* Category badge */}
          <Animated.View entering={FadeIn.delay(100).duration(300)}>
            <View
              className="self-start px-3 py-1 rounded-full mb-2"
              style={{ backgroundColor: getCategoryColor(community?.category) }}
            >
              <Text className="text-[12px] font-bold" style={{ color: colors.white }}>
                {getCategoryLabel(community?.category)}
              </Text>
            </View>
          </Animated.View>

          {/* Name */}
          <Animated.View entering={FadeInUp.delay(150).duration(300)}>
            <Text className="text-[28px] font-bold" style={{ color: colors.white }}>
              {community?.name}
            </Text>
          </Animated.View>

          {/* Member count + Privacy */}
          <Animated.View entering={FadeInUp.delay(200).duration(300)}>
            <View className="flex-row items-center mt-1">
              <Users size={16} color="rgba(255,255,255,0.8)" />
              <Text className="text-[14px] ml-1.5" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {community?.member_count || 0} {t('communities.members', 'members')}
              </Text>
              <View className="w-1 h-1 rounded-full mx-2" style={{ backgroundColor: 'rgba(255,255,255,0.5)' }} />
              {community?.is_private ? (
                <>
                  <Lock size={14} color="rgba(255,255,255,0.8)" />
                  <Text className="text-[14px] ml-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {t('communities.privacy.private', 'Private')}
                  </Text>
                </>
              ) : (
                <>
                  <Globe size={14} color="rgba(255,255,255,0.8)" />
                  <Text className="text-[14px] ml-1" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {t('communities.privacy.public', 'Public')}
                  </Text>
                </>
              )}
            </View>
          </Animated.View>
        </View>
      </View>

      {/* Content */}
      <Animated.ScrollView
        entering={FadeInDown.delay(250).duration(400)}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 100 }}
      >
        {/* Description */}
        {community?.description && (
          <View
            className="rounded-2xl p-4 mb-4"
            style={{ backgroundColor: colors.white }}
          >
            <View className="flex-row items-center mb-3">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: communityColors.background.surface }}
              >
                <Info size={20} color={communityColors.dark} />
              </View>
              <Text className="text-[17px] font-semibold ml-3" style={{ color: communityColors.text.primary }}>
                {t('communities.info.description', 'About')}
              </Text>
            </View>
            <Text className="text-[15px] leading-[22px]" style={{ color: communityColors.text.secondary }}>
              {community.description}
            </Text>
          </View>
        )}

        {/* Meeting info */}
        {(community?.meeting_schedule || community?.meeting_location) && (
          <View
            className="rounded-2xl p-4 mb-4"
            style={{ backgroundColor: colors.white }}
          >
            {community.meeting_schedule && (
              <View className="flex-row items-start mb-4">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: communityColors.background.surface }}
                >
                  <Calendar size={20} color={communityColors.dark} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[13px] font-medium mb-0.5" style={{ color: communityColors.text.tertiary }}>
                    {t('communities.info.schedule', 'Schedule')}
                  </Text>
                  <Text className="text-[15px] font-medium" style={{ color: communityColors.text.primary }}>
                    {community.meeting_schedule}
                  </Text>
                </View>
              </View>
            )}

            {community.meeting_location && (
              <View className="flex-row items-start">
                <View
                  className="w-10 h-10 rounded-xl items-center justify-center"
                  style={{ backgroundColor: communityColors.background.surface }}
                >
                  <MapPin size={20} color={communityColors.dark} />
                </View>
                <View className="flex-1 ml-3">
                  <Text className="text-[13px] font-medium mb-0.5" style={{ color: communityColors.text.tertiary }}>
                    {t('communities.info.location', 'Location')}
                  </Text>
                  <Text className="text-[15px] font-medium" style={{ color: communityColors.text.primary }}>
                    {community.meeting_location}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {/* Privacy notice */}
        {community?.is_private && (
          <View
            className="rounded-2xl p-4 mb-4"
            style={{ backgroundColor: '#FFF8E1' }}
          >
            <View className="flex-row items-start">
              <Lock size={18} color="#F59E0B" style={{ marginTop: 2 }} />
              <View className="flex-1 ml-3">
                <Text className="text-[14px] font-medium mb-1" style={{ color: '#92400E' }}>
                  {t('communities.preview.privateGroup', 'Private Community')}
                </Text>
                <Text className="text-[13px] leading-[18px]" style={{ color: '#B45309' }}>
                  {t('communities.preview.privateGroupDesc', 'This community requires approval to join. A leader will review your request.')}
                </Text>
              </View>
            </View>
          </View>
        )}
      </Animated.ScrollView>

      {/* Bottom action bar */}
      <Animated.View
        entering={FadeInUp.delay(400).duration(300)}
        className="absolute bottom-0 left-0 right-0 px-5"
        style={{
          paddingBottom: insets.bottom + 16,
          paddingTop: 16,
          backgroundColor: colors.white,
          borderTopWidth: 1,
          borderTopColor: communityColors.divider,
        }}
      >
        {isPending ? (
          <View
            className="flex-row items-center justify-center py-4 rounded-full"
            style={{ backgroundColor: communityColors.background.surface }}
          >
            <Clock size={20} color={communityColors.text.tertiary} />
            <Text className="text-[16px] font-semibold ml-2" style={{ color: communityColors.text.tertiary }}>
              {t('groups.pendingApproval', 'Pending Approval')}
            </Text>
          </View>
        ) : isFull ? (
          <View
            className="flex-row items-center justify-center py-4 rounded-full"
            style={{ backgroundColor: communityColors.background.surface }}
          >
            <Text className="text-[16px] font-semibold" style={{ color: communityColors.text.tertiary }}>
              {t('groups.full', 'Community is Full')}
            </Text>
          </View>
        ) : (
          <Pressable
            onPress={handleJoin}
            disabled={joinMutation.isPending}
            className="flex-row items-center justify-center py-4 rounded-full active:opacity-90"
            style={{ backgroundColor: communityColors.accent }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={community?.is_private ? t('groups.requestToJoin', 'Request to Join') : t('groups.join', 'Join Community')}
          >
            {joinMutation.isPending ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <>
                <Check size={22} color={colors.white} />
                <Text className="text-[17px] font-bold ml-2" style={{ color: colors.white }}>
                  {community?.is_private
                    ? t('groups.requestToJoin', 'Request to Join')
                    : t('groups.join', 'Join Community')}
                </Text>
              </>
            )}
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
}

// Memoize and apply Premium Motion HOC
const MemoizedCommunityPreviewScreen = memo(CommunityPreviewScreen);
MemoizedCommunityPreviewScreen.displayName = 'CommunityPreviewScreen';
export default withPremiumMotionV10(MemoizedCommunityPreviewScreen);
