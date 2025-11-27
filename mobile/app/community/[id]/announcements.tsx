/**
 * Announcements Feed Screen
 *
 * Dedicated view for community announcements:
 * - Announcement cards with special styling
 * - Thread replies (if allowed)
 * - Only leaders can post (based on settings)
 * - Reactions and read receipts
 */

import React, { useState, useCallback as _useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  RefreshControl,
  ActivityIndicator,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { MotiView } from 'moti';
import {
  ArrowLeft,
  Megaphone,
  Send,
  MessageCircle,
  Heart as _Heart,
  ThumbsUp as _ThumbsUp,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  Pin as _Pin,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge as _Badge, BadgeText as _BadgeText } from '@/components/ui/badge';
import { Button, ButtonText, ButtonIcon, ButtonSpinner } from '@/components/ui/button';

import {
  useCommunity,
  useCommunityMessages,
  useSendMessage,
  useReactToMessage,
} from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import type { CommunityMessage } from '@/types/communities';

// =============================================================================
// ANNOUNCEMENT CARD
// =============================================================================

interface AnnouncementCardProps {
  announcement: CommunityMessage;
  onReply: () => void;
  onReact: (emoji: string) => void;
  currentMemberId?: string;
  allowReplies: boolean;
}

function AnnouncementCard({
  announcement,
  onReply,
  onReact,
  currentMemberId,
  allowReplies,
}: AnnouncementCardProps) {
  const [showReplies, setShowReplies] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  const reactions = announcement.reactions || {};
  // Kept for future UI: show total reaction count
  const reactionCount = Object.values(reactions).reduce((sum, arr) => sum + arr.length, 0);
  void reactionCount;

  const hasReacted = (emoji: string) => {
    return reactions[emoji]?.includes(currentMemberId || '');
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 20 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: 'timing', duration: 300 }}
    >
      <View
        className="mx-4 my-2 rounded-xl bg-white overflow-hidden"
        style={shadows.md}
      >
        {/* Header with megaphone icon */}
        <View
          className="px-4 py-3 flex-row items-center"
          style={{ backgroundColor: colors.primary[50] }}
        >
          <View
            className="w-10 h-10 rounded-full items-center justify-center mr-3"
            style={{ backgroundColor: colors.primary[500] }}
          >
            <Icon as={Megaphone} size="md" className="text-white" />
          </View>
          <VStack className="flex-1">
            <Text className="text-primary-700 font-bold">
              {announcement.sender_name || 'Announcement'}
            </Text>
            <Text className="text-primary-600 text-xs">
              {formatDate(announcement.created_at)}
            </Text>
          </VStack>
          <Pressable className="p-2">
            <Icon as={MoreVertical} size="md" className="text-primary-600" />
          </Pressable>
        </View>

        {/* Content */}
        <View className="p-4">
          {/* Media */}
          {announcement.media?.seaweedfs_fid && announcement.message_type === 'image' && (
            <Image
              source={{ uri: announcement.media.seaweedfs_fid }}
              style={{
                width: '100%',
                height: 200,
                borderRadius: borderRadius.lg,
                marginBottom: spacing.md,
              }}
              contentFit="cover"
            />
          )}

          {/* Text */}
          {announcement.text && (
            <Text className="text-gray-900 text-base leading-relaxed">
              {announcement.text}
            </Text>
          )}
        </View>

        {/* Reactions bar */}
        <View className="px-4 py-3 border-t border-gray-100">
          <HStack space="lg" className="items-center">
            {/* Quick reactions */}
            {['👍', '❤️', '🙏', '🎉'].map((emoji) => (
              <Pressable
                key={emoji}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onReact(emoji);
                }}
                className={`px-3 py-1.5 rounded-full flex-row items-center ${
                  hasReacted(emoji) ? 'bg-primary-100' : 'bg-gray-100'
                }`}
              >
                <Text className="text-lg mr-1">{emoji}</Text>
                {reactions[emoji]?.length > 0 && (
                  <Text className={`text-sm ${hasReacted(emoji) ? 'text-primary-600' : 'text-gray-600'}`}>
                    {reactions[emoji].length}
                  </Text>
                )}
              </Pressable>
            ))}

            <View className="flex-1" />

            {/* Reply count */}
            {allowReplies && announcement.reply_count > 0 && (
              <Pressable
                onPress={() => setShowReplies(!showReplies)}
                className="flex-row items-center"
              >
                <Icon as={MessageCircle} size="sm" className="text-gray-500 mr-1" />
                <Text className="text-gray-600 text-sm mr-1">
                  {announcement.reply_count}
                </Text>
                <Icon
                  as={showReplies ? ChevronUp : ChevronDown}
                  size="sm"
                  className="text-gray-400"
                />
              </Pressable>
            )}
          </HStack>
        </View>

        {/* Reply button */}
        {allowReplies && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onReply();
            }}
            className="px-4 py-3 border-t border-gray-100 flex-row items-center justify-center"
          >
            <Icon as={MessageCircle} size="sm" className="text-primary-600 mr-2" />
            <Text className="text-primary-600 font-medium">Reply to announcement</Text>
          </Pressable>
        )}
      </View>
    </MotiView>
  );
}

// =============================================================================
// COMPOSE ANNOUNCEMENT (for leaders)
// =============================================================================

interface ComposeAnnouncementProps {
  onSend: (text: string) => Promise<void>;
  isSending: boolean;
}

function ComposeAnnouncement({ onSend, isSending }: ComposeAnnouncementProps) {
  const [text, setText] = useState('');

  const handleSend = async () => {
    if (!text.trim()) return;
    await onSend(text.trim());
    setText('');
  };

  return (
    <View
      className="mx-4 my-2 p-4 rounded-xl bg-white"
      style={shadows.md}
    >
      <HStack space="md" className="items-start">
        <View
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.primary[100] }}
        >
          <Icon as={Megaphone} size="md" style={{ color: colors.primary[600] }} />
        </View>

        <VStack className="flex-1" space="sm">
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Write an announcement..."
            placeholderTextColor={colors.gray[400]}
            multiline
            maxLength={2000}
            className="text-base"
            style={{
              color: colors.gray[900],
              minHeight: 60,
              textAlignVertical: 'top',
            }}
          />

          <HStack className="justify-end">
            <Button
              size="sm"
              variant="solid"
              action="primary"
              onPress={handleSend}
              disabled={!text.trim() || isSending}
            >
              {isSending ? (
                <ButtonSpinner className="mr-2" />
              ) : (
                <ButtonIcon as={Send} className="mr-2" />
              )}
              <ButtonText>{isSending ? 'Posting...' : 'Post'}</ButtonText>
            </Button>
          </HStack>
        </VStack>
      </HStack>
    </View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function AnnouncementsScreen() {
  const { t: _t } = useTranslation();
  const router = useRouter();
  const { id: communityId } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuthStore();

  // Reply state for future thread feature
  const [replyingTo, setReplyingTo] = useState<CommunityMessage | null>(null);
  void replyingTo; void setReplyingTo;

  // Fetch community and announcements
  const { data: community, isLoading: isLoadingCommunity } = useCommunity(communityId);
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
    isRefetching,
  } = useCommunityMessages(communityId, 'announcement');

  const sendMessageMutation = useSendMessage();
  const reactMutation = useReactToMessage();

  // Flatten messages
  const announcements = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  // Check permissions
  const canPost = useMemo(() => {
    if (!community || !member) return false;
    const settings = community.settings;
    if (settings?.who_can_announce === 'all_members') return true;
    return community.leader_member_ids?.includes(member.id) ||
           community.my_role === 'admin' ||
           community.my_role === 'leader';
  }, [community, member]);

  const allowReplies = community?.settings?.allow_announcement_replies ?? false;

  const handleSendAnnouncement = async (text: string) => {
    try {
      await sendMessageMutation.mutateAsync({
        communityId,
        channelType: 'announcement',
        message: { message_type: 'text', text },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to post announcement');
    }
  };

  const handleReact = async (messageId: string, emoji: string) => {
    try {
      const reactions = announcements.find(a => a.id === messageId)?.reactions || {};
      const hasReacted = reactions[emoji]?.includes(member?.id || '');

      await reactMutation.mutateAsync({
        messageId,
        emoji,
        action: hasReacted ? 'remove' : 'add',
        communityId,
        channelType: 'announcement',
      });
    } catch (error) {
      console.error('Reaction failed:', error);
    }
  };

  const handleReply = (announcement: CommunityMessage) => {
    // Navigate to thread view
    router.push(`/community/${communityId}/announcement/${announcement.id}` as any);
  };

  // Loading state
  if (isLoadingCommunity || (isLoadingMessages && announcements.length === 0)) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <HStack className="px-4 py-3 bg-white border-b border-gray-100 items-center" space="md">
          <Skeleton className="w-10 h-10 rounded-full" isLoaded={false} />
          <Skeleton className="h-6 w-40" isLoaded={false} />
        </HStack>
        <VStack className="p-4" space="md">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 rounded-xl" isLoaded={false} />
          ))}
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100" style={shadows.sm}>
        <HStack className="px-4 py-3 items-center" space="md">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="active:opacity-70"
          >
            <Icon as={ArrowLeft} size="lg" className="text-gray-800" />
          </Pressable>

          <View
            className="w-10 h-10 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.primary[100] }}
          >
            <Icon as={Megaphone} size="md" style={{ color: colors.primary[600] }} />
          </View>

          <VStack className="flex-1">
            <Heading size="lg" className="text-gray-900">
              Announcements
            </Heading>
            <Text className="text-gray-500 text-sm">
              {community?.name}
            </Text>
          </VStack>
        </HStack>
      </View>

      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* Compose area for leaders */}
        {canPost && (
          <ComposeAnnouncement
            onSend={handleSendAnnouncement}
            isSending={sendMessageMutation.isPending}
          />
        )}

        {/* Announcements list */}
        {announcements.length > 0 ? (
          <FlashList
            data={announcements}
            renderItem={({ item }: { item: CommunityMessage }) => (
              <AnnouncementCard
                announcement={item}
                onReply={() => handleReply(item)}
                onReact={(emoji) => handleReact(item.id, emoji)}
                currentMemberId={member?.id}
                allowReplies={allowReplies}
              />
            )}
            keyExtractor={(item: CommunityMessage) => item.id}
            estimatedItemSize={300}
            contentContainerStyle={{ paddingBottom: spacing.xl }}
            refreshControl={
              <RefreshControl
                refreshing={isRefetching}
                onRefresh={refetch}
                colors={[colors.primary[500]]}
                tintColor={colors.primary[500]}
              />
            }
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View className="py-4 items-center">
                  <ActivityIndicator color={colors.primary[500]} />
                </View>
              ) : null
            }
          />
        ) : (
          <VStack className="flex-1 items-center justify-center px-8" space="md">
            <View
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <Icon as={Megaphone} size="2xl" className="text-gray-400" />
            </View>
            <Text className="text-gray-600 text-center text-lg font-medium">
              No announcements yet
            </Text>
            <Text className="text-gray-500 text-center">
              {canPost
                ? 'Post the first announcement to share important updates with your community.'
                : 'Leaders will post announcements here.'}
            </Text>
          </VStack>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
