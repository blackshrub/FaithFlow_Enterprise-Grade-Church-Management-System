/**
 * Community Info Screen - WhatsApp-Style Community Details
 *
 * Features:
 * - Community header with cover image
 * - Description section
 * - Members list with roles
 * - Shared media gallery
 * - Mute notifications toggle
 * - Leave community option
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Pressable,
  Alert,
  Switch,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Animated from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import {
  ArrowLeft,
  Users,
  Bell,
  BellOff,
  LogOut,
  Flag,
  Image as ImageIcon,
  ChevronRight,
  Crown,
  Shield,
  User,
  Calendar,
  MapPin,
  Info,
  Megaphone,
  Search,
  Settings,
  BarChart3,
  MessageCircle,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { PremiumCard3 } from '@/components/ui/premium-card';
import { Icon } from '@/components/ui/icon';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { ScrollView } from '@/components/ui/scroll-view';

import { useCommunity, useCommunityMembers, useLeaveCommunity, useUpdateNotificationPreference } from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, borderRadius } from '@/constants/theme';
import type { CommunityMember } from '@/types/communities';

// Member Management Component
import {
  MemberManagementSheet,
  MemberList,
  type CommunityMember as MemberType,
  type MemberRole,
} from '@/components/communities/MemberManagement';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 200;

function CommunityInfoScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuthStore();

  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showMemberManagement, setShowMemberManagement] = useState(false);
  const [selectedMember, setSelectedMember] = useState<MemberType | null>(null);

  // Fetch community details
  const { data: community, isLoading: isLoadingCommunity } = useCommunity(id);

  // Fetch members
  const { data: members = [], isLoading: isLoadingMembers } = useCommunityMembers(
    member?.church_id || '',
    id
  );

  // Leave mutation
  const leaveMutation = useLeaveCommunity();

  // Notification preference mutation
  const notificationMutation = useUpdateNotificationPreference();

  // Initialize notifications from community data
  useEffect(() => {
    if (community?.notifications_enabled !== undefined) {
      setNotificationsEnabled(community.notifications_enabled);
    }
  }, [community?.notifications_enabled]);

  // Check if user is admin/leader
  const isLeader = community?.my_role === 'admin' || community?.my_role === 'leader';

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleToggleNotifications = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newValue = !notificationsEnabled;

    // Optimistic update
    setNotificationsEnabled(newValue);

    // Call API to update notification preference
    notificationMutation.mutate(
      { communityId: id, enabled: newValue },
      {
        onError: () => {
          // Rollback on error
          setNotificationsEnabled(!newValue);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            t('common.error'),
            t('communities.info.notificationUpdateError', 'Failed to update notification preference')
          );
        },
      }
    );
  }, [notificationsEnabled, notificationMutation, id, t]);

  const handleLeaveCommunity = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      t('communities.info.leaveGroup'),
      t('groups.leaveConfirmDesc', { name: community?.name }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'destructive',
          onPress: () => {
            leaveMutation.mutate(id, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                router.replace('/(tabs)/groups');
              },
              onError: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert(t('common.error'), t('groups.leaveError'));
              },
            });
          },
        },
      ]
    );
  }, [community?.name, id, leaveMutation, router, t]);

  const handleReport = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      t('communities.info.reportGroup'),
      'This feature is coming soon.',
      [{ text: t('common.ok') }]
    );
  }, [t]);

  // Transform members for MemberManagement component
  const managementMembers: MemberType[] = members.map((m: CommunityMember) => ({
    id: m.id,
    member_id: m.id,
    name: m.full_name || 'Unknown',
    avatar_url: m.profile_photo,
    role: (m.role as MemberRole) || 'member',
    joined_at: m.joined_at || new Date().toISOString(),
    is_online: false,
  }));

  // Get current user's role for member management
  const currentUserRole: MemberRole = (community?.my_role as MemberRole) || 'member';

  // Member management handlers
  const handlePromoteMember = useCallback((memberId: string, newRole: MemberRole) => {
    const memberToChange = members.find((m: CommunityMember) => m.id === memberId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Call API to promote member
    Alert.alert('Success', `${memberToChange?.full_name} promoted to ${newRole}`);
    setShowMemberManagement(false);
    setSelectedMember(null);
  }, [members]);

  const handleDemoteMember = useCallback((memberId: string, newRole: MemberRole) => {
    const memberToChange = members.find((m: CommunityMember) => m.id === memberId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Call API to demote member
    Alert.alert('Success', `${memberToChange?.full_name} demoted to ${newRole}`);
    setShowMemberManagement(false);
    setSelectedMember(null);
  }, [members]);

  const handleKickMember = useCallback((memberId: string) => {
    const memberToKick = members.find((m: CommunityMember) => m.id === memberId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    // TODO: Call API to kick member
    Alert.alert('Success', `${memberToKick?.full_name} has been removed from the community.`);
    setShowMemberManagement(false);
    setSelectedMember(null);
  }, [members]);

  const handleMemberPress = useCallback((memberData: MemberType) => {
    setSelectedMember(memberData);
    setShowMemberManagement(true);
  }, []);

  const getRoleIcon = (role?: string) => {
    switch (role) {
      case 'leader':
        return Crown;
      case 'assistant':
        return Shield;
      default:
        return User;
    }
  };

  const getRoleBadgeColor = (role?: string) => {
    switch (role) {
      case 'leader':
        return colors.warning[500];
      case 'assistant':
        return colors.info[500];
      default:
        return colors.gray[400];
    }
  };

  const getCategoryColor = (category?: string) => {
    const categoryColors: Record<string, string> = {
      cell_group: colors.primary[500],
      ministry_team: colors.secondary[500],
      activity: colors.success[500],
      support_group: colors.warning[500],
    };
    return categoryColors[category || ''] || colors.gray[500];
  };

  const getCategoryLabel = (category?: string) => {
    const labels: Record<string, string> = {
      cell_group: t('communities.category.cellGroup'),
      ministry_team: t('communities.category.ministryTeam'),
      activity: t('communities.category.activity'),
      support_group: t('communities.category.supportGroup'),
    };
    return labels[category || ''] || category || '';
  };

  // Loading state
  if (isLoadingCommunity) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <Skeleton className="h-48 w-full" isLoaded={false} />
        <View className="p-5">
          <Skeleton className="h-8 w-48 mb-2" isLoaded={false} />
          <Skeleton className="h-4 w-32 mb-6" isLoaded={false} />
          <Skeleton className="h-24 w-full rounded-xl mb-4" isLoaded={false} />
          <Skeleton className="h-48 w-full rounded-xl" isLoaded={false} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View className="flex-1 bg-gray-50">
      <ScrollView showsVerticalScrollIndicator={false}>
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
              colors={[getCategoryColor(community?.category), colors.primary[700]]}
              style={{ width: SCREEN_WIDTH, height: HEADER_HEIGHT }}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            />
          )}

          {/* Overlay gradient */}
          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent', 'rgba(0,0,0,0.6)']}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
            }}
          />

          {/* Back button */}
          <SafeAreaView
            edges={['top']}
            style={{ position: 'absolute', top: 0, left: 0 }}
          >
            <Pressable
              onPress={handleBack}
              className="active:opacity-70"
              style={{
                margin: spacing.md,
                width: 40,
                height: 40,
                borderRadius: borderRadius.full,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon as={ArrowLeft} size="lg" className="text-white" />
            </Pressable>
          </SafeAreaView>

          {/* Community name overlay */}
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: spacing.lg,
            }}
          >
            <Badge
              variant="solid"
              style={{
                backgroundColor: getCategoryColor(community?.category),
                alignSelf: 'flex-start',
                marginBottom: spacing.sm,
              }}
            >
              <BadgeText className="text-white text-xs font-bold">
                {getCategoryLabel(community?.category)}
              </BadgeText>
            </Badge>

            <Heading size="2xl" className="text-white font-bold">
              {community?.name}
            </Heading>

            <HStack space="sm" className="items-center mt-1">
              <Icon as={Users} size="sm" className="text-white/80" />
              <Text className="text-white/80 text-sm">
                {community?.member_count || 0} {t('communities.members')}
              </Text>
            </HStack>
          </View>
        </View>

        {/* Content */}
        <Animated.View entering={PMotionV10.screenFadeIn}>
        <VStack space="md" className="p-5">
          {/* Description */}
          {community?.description && (
            <PremiumCard3>
              <View className="p-4">
                <HStack space="sm" className="items-center mb-3">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: colors.primary[50] }}
                  >
                    <Icon as={Info} size="md" className="text-primary-600" />
                  </View>
                  <Heading size="md" className="text-gray-900 font-bold">
                    {t('communities.info.description')}
                  </Heading>
                </HStack>
                <Text className="text-gray-700 text-base leading-6">
                  {community.description}
                </Text>
              </View>
            </PremiumCard3>
          )}

          {/* Quick Actions */}
          <PremiumCard3>
            <View>
              {/* Chat */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/community/${id}/chat` as any);
                }}
                className="px-4 py-4 active:bg-gray-50"
              >
                <HStack className="justify-between items-center">
                  <HStack space="md" className="items-center">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: colors.primary[50] }}
                    >
                      <Icon as={MessageCircle} size="md" style={{ color: colors.primary[600] }} />
                    </View>
                    <Text className="text-gray-900 font-medium">Chat</Text>
                  </HStack>
                  <Icon as={ChevronRight} size="md" className="text-gray-400" />
                </HStack>
              </Pressable>

              {/* Announcements */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/community/${id}/announcements` as any);
                }}
                className="px-4 py-4 border-t border-gray-100 active:bg-gray-50"
              >
                <HStack className="justify-between items-center">
                  <HStack space="md" className="items-center">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: colors.warning[50] }}
                    >
                      <Icon as={Megaphone} size="md" style={{ color: colors.warning[600] }} />
                    </View>
                    <Text className="text-gray-900 font-medium">Announcements</Text>
                  </HStack>
                  <Icon as={ChevronRight} size="md" className="text-gray-400" />
                </HStack>
              </Pressable>

              {/* Sub-groups */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/community/${id}/subgroups` as any);
                }}
                className="px-4 py-4 border-t border-gray-100 active:bg-gray-50"
              >
                <HStack className="justify-between items-center">
                  <HStack space="md" className="items-center">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: colors.secondary[50] }}
                    >
                      <Icon as={Users} size="md" style={{ color: colors.secondary[600] }} />
                    </View>
                    <Text className="text-gray-900 font-medium">Sub-groups</Text>
                  </HStack>
                  <Icon as={ChevronRight} size="md" className="text-gray-400" />
                </HStack>
              </Pressable>

              {/* Search */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/community/${id}/search` as any);
                }}
                className="px-4 py-4 border-t border-gray-100 active:bg-gray-50"
              >
                <HStack className="justify-between items-center">
                  <HStack space="md" className="items-center">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: colors.info[50] }}
                    >
                      <Icon as={Search} size="md" style={{ color: colors.info[600] }} />
                    </View>
                    <Text className="text-gray-900 font-medium">Search Messages</Text>
                  </HStack>
                  <Icon as={ChevronRight} size="md" className="text-gray-400" />
                </HStack>
              </Pressable>

              {/* Settings (Leaders only) */}
              {isLeader && (
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push(`/community/${id}/settings` as any);
                  }}
                  className="px-4 py-4 border-t border-gray-100 active:bg-gray-50"
                >
                  <HStack className="justify-between items-center">
                    <HStack space="md" className="items-center">
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: colors.gray[100] }}
                      >
                        <Icon as={Settings} size="md" style={{ color: colors.gray[600] }} />
                      </View>
                      <Text className="text-gray-900 font-medium">Community Settings</Text>
                    </HStack>
                    <Icon as={ChevronRight} size="md" className="text-gray-400" />
                  </HStack>
                </Pressable>
              )}
            </View>
          </PremiumCard3>

          {/* Meeting info */}
          {(community?.meeting_schedule || community?.meeting_location) && (
            <PremiumCard3>
              <View className="p-4">
                <VStack space="md">
                  {community.meeting_schedule && (
                    <HStack space="sm">
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: colors.primary[50] }}
                      >
                        <Icon as={Calendar} size="md" className="text-primary-600" />
                      </View>
                      <VStack className="flex-1">
                        <Text className="text-gray-500 text-xs font-medium uppercase">
                          Schedule
                        </Text>
                        <Text className="text-gray-900 font-medium">
                          {community.meeting_schedule}
                        </Text>
                      </VStack>
                    </HStack>
                  )}

                  {community.meeting_location && (
                    <HStack space="sm">
                      <View
                        className="w-10 h-10 rounded-xl items-center justify-center"
                        style={{ backgroundColor: colors.primary[50] }}
                      >
                        <Icon as={MapPin} size="md" className="text-primary-600" />
                      </View>
                      <VStack className="flex-1">
                        <Text className="text-gray-500 text-xs font-medium uppercase">
                          Location
                        </Text>
                        <Text className="text-gray-900 font-medium">
                          {community.meeting_location}
                        </Text>
                      </VStack>
                    </HStack>
                  )}
                </VStack>
              </View>
            </PremiumCard3>
          )}

          {/* Members */}
          <PremiumCard3>
            <View className="p-4">
              <HStack className="justify-between items-center mb-4">
                <HStack space="sm" className="items-center">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: colors.primary[50] }}
                  >
                    <Icon as={Users} size="md" className="text-primary-600" />
                  </View>
                  <Heading size="md" className="text-gray-900 font-bold">
                    {t('communities.info.membersList')}
                  </Heading>
                </HStack>
                <Badge variant="outline">
                  <BadgeText className="text-primary-600">
                    {members.length}
                  </BadgeText>
                </Badge>
              </HStack>

              {isLoadingMembers ? (
                <VStack space="sm">
                  {[1, 2, 3].map((i) => (
                    <HStack key={i} space="md" className="items-center">
                      <Skeleton className="w-12 h-12 rounded-full" isLoaded={false} />
                      <VStack className="flex-1">
                        <Skeleton className="h-4 w-32" isLoaded={false} />
                        <Skeleton className="h-3 w-20 mt-1" isLoaded={false} />
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <VStack space="sm">
                  {members.slice(0, 5).map((m: CommunityMember) => (
                    <HStack key={m.id} space="md" className="items-center py-2">
                      <Avatar size="md" className="bg-primary-100">
                        {m.profile_photo ? (
                          <AvatarImage source={{ uri: m.profile_photo }} />
                        ) : (
                          <AvatarFallbackText className="text-primary-600">
                            {m.full_name?.substring(0, 2).toUpperCase() || '??'}
                          </AvatarFallbackText>
                        )}
                      </Avatar>

                      <VStack className="flex-1">
                        <HStack space="xs" className="items-center">
                          <Text className="text-gray-900 font-medium">
                            {m.full_name}
                          </Text>
                          {m.id === member?.id && (
                            <Text className="text-gray-500 text-xs">(You)</Text>
                          )}
                        </HStack>
                        {m.role && m.role !== 'member' && (
                          <HStack space="xs" className="items-center">
                            <Icon
                              as={getRoleIcon(m.role)}
                              size="xs"
                              style={{ color: getRoleBadgeColor(m.role) }}
                            />
                            <Text
                              className="text-xs font-medium capitalize"
                              style={{ color: getRoleBadgeColor(m.role) }}
                            >
                              {t(`communities.roles.${m.role}`, m.role)}
                            </Text>
                          </HStack>
                        )}
                      </VStack>
                    </HStack>
                  ))}

                  {members.length > 5 && (
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        router.push(`/community/${id}/members` as any);
                      }}
                      className="py-3 items-center active:opacity-70"
                    >
                      <Text className="text-primary-600 font-medium">
                        View all {members.length} members
                      </Text>
                    </Pressable>
                  )}

                  {/* Manage Members button for leaders */}
                  {isLeader && (
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShowMemberManagement(true);
                      }}
                      className="py-3 px-4 mt-2 rounded-xl items-center active:opacity-70"
                      style={{ backgroundColor: colors.primary[50] }}
                    >
                      <HStack space="sm" className="items-center">
                        <Icon as={Settings} size="sm" style={{ color: colors.primary[600] }} />
                        <Text className="text-primary-600 font-medium">
                          Manage Members
                        </Text>
                      </HStack>
                    </Pressable>
                  )}
                </VStack>
              )}
            </View>
          </PremiumCard3>

          {/* Settings */}
          <PremiumCard3>
            <View>
              {/* Notifications toggle */}
              <Pressable
                onPress={handleToggleNotifications}
                className="px-4 py-4 active:bg-gray-50"
              >
                <HStack className="justify-between items-center">
                  <HStack space="md" className="items-center">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: colors.primary[50] }}
                    >
                      <Icon
                        as={notificationsEnabled ? Bell : BellOff}
                        size="md"
                        className="text-primary-600"
                      />
                    </View>
                    <Text className="text-gray-900 font-medium">
                      {t('communities.info.muteNotifications')}
                    </Text>
                  </HStack>
                  <Switch
                    value={!notificationsEnabled}
                    onValueChange={() => handleToggleNotifications()}
                    trackColor={{ false: colors.gray[300], true: colors.primary[500] }}
                  />
                </HStack>
              </Pressable>

              {/* Shared media */}
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(`/community/${id}/media` as any);
                }}
                className="px-4 py-4 border-t border-gray-100 active:bg-gray-50"
              >
                <HStack className="justify-between items-center">
                  <HStack space="md" className="items-center">
                    <View
                      className="w-10 h-10 rounded-xl items-center justify-center"
                      style={{ backgroundColor: colors.primary[50] }}
                    >
                      <Icon as={ImageIcon} size="md" className="text-primary-600" />
                    </View>
                    <Text className="text-gray-900 font-medium">
                      {t('communities.info.media')}
                    </Text>
                  </HStack>
                  <Icon as={ChevronRight} size="md" className="text-gray-400" />
                </HStack>
              </Pressable>
            </View>
          </PremiumCard3>

          {/* Danger zone */}
          <PremiumCard3>
            <View>
              {/* Leave community */}
              <Pressable
                onPress={handleLeaveCommunity}
                disabled={leaveMutation.isPending}
                className="px-4 py-4 active:bg-red-50"
              >
                <HStack space="md" className="items-center">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: colors.error[50] }}
                  >
                    <Icon as={LogOut} size="md" className="text-error-600" />
                  </View>
                  <Text className="text-error-600 font-medium">
                    {t('communities.info.leaveGroup')}
                  </Text>
                </HStack>
              </Pressable>

              {/* Report */}
              <Pressable
                onPress={handleReport}
                className="px-4 py-4 border-t border-gray-100 active:bg-gray-50"
              >
                <HStack space="md" className="items-center">
                  <View
                    className="w-10 h-10 rounded-xl items-center justify-center"
                    style={{ backgroundColor: colors.warning[50] }}
                  >
                    <Icon as={Flag} size="md" className="text-warning-600" />
                  </View>
                  <Text className="text-warning-600 font-medium">
                    {t('communities.info.reportGroup')}
                  </Text>
                </HStack>
              </Pressable>
            </View>
          </PremiumCard3>

          {/* Bottom padding */}
          <View style={{ height: 40 }} />
        </VStack>
        </Animated.View>
      </ScrollView>

      {/* Member Management Sheet */}
      <MemberManagementSheet
        visible={showMemberManagement}
        onClose={() => {
          setShowMemberManagement(false);
          setSelectedMember(null);
        }}
        member={selectedMember}
        currentUserRole={currentUserRole}
        onPromote={handlePromoteMember}
        onDemote={handleDemoteMember}
        onKick={handleKickMember}
        communityName={community?.name}
      />
    </View>
  );
}

// Apply Premium Motion V10 Ultra HOC for production-grade transitions
export default withPremiumMotionV10(CommunityInfoScreen);
