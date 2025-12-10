/**
 * Community Main Screen - WhatsApp-style Threads List
 *
 * EXACT WhatsApp Communities design:
 * - Light grey header with community avatar (rounded square) + name
 * - "Community" subtitle in light grey
 * - Announcements section (pinned at top)
 * - "Groups you're in" section divider
 * - Groups/threads list with larger avatars
 * - "+ Add group" button at bottom
 * - Menu with Community Info & Settings
 */

import React, { useState, useCallback, useMemo, memo } from 'react';
import {
  View,
  Text,
  Pressable,
  RefreshControl,
  StatusBar,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { navigateTo } from '@/utils/navigation';
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInUp,
  FadeOut,
} from 'react-native-reanimated';
import {
  ChevronLeft,
  MoreHorizontal,
  Volume2,
  Plus,
  Info,
  Settings,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

// Gluestack UI for buttons
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { communityColors, colors } from '@/constants/theme';

import { withPremiumMotionV10 } from '@/hoc';

import { useCommunity, useCreateSubgroup } from '@/hooks/useCommunities';
import { getThreadsForCommunity } from '@/mock/community-mockdata';
import type { CommunityThread } from '@/types/communities';
import { Input, InputField } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';

// =============================================================================
// MENU SHEET
// =============================================================================

interface MenuSheetProps {
  visible: boolean;
  onClose: () => void;
  onInfo: () => void;
  onSettings: () => void;
  isLeader: boolean;
}

const MenuSheet = memo(({ visible, onClose, onInfo, onSettings, isLeader }: MenuSheetProps) => {
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        className="flex-1"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onPress={onClose}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Close menu"
      >
        <Animated.View
          entering={FadeInUp.duration(200)}
          exiting={FadeOut.duration(150)}
          className="absolute top-16 right-4 bg-white rounded-xl overflow-hidden"
          style={{
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 8,
            elevation: 8,
            minWidth: 200,
          }}
        >
          {/* Community Info */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
              onInfo();
            }}
            className="flex-row items-center px-4 py-3.5"
            style={({ pressed }) => pressed && { backgroundColor: communityColors.pressed }}
            accessible
            accessibilityRole="button"
            accessibilityLabel={t('communities.info.title', 'Community Info')}
          >
            <Info size={20} color={communityColors.text.tertiary} />
            <Text className="text-[16px] ml-3" style={{ color: communityColors.text.primary }}>
              {t('communities.info.title', 'Community Info')}
            </Text>
          </Pressable>

          {/* Divider */}
          <View className="h-px mx-4" style={{ backgroundColor: communityColors.divider }} />

          {/* Community Settings - only for leaders */}
          {isLeader && (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
                onSettings();
              }}
              className="flex-row items-center px-4 py-3.5"
              style={({ pressed }) => pressed && { backgroundColor: communityColors.pressed }}
              accessible
              accessibilityRole="button"
              accessibilityLabel={t('communities.settings', 'Community Settings')}
            >
              <Settings size={20} color={communityColors.text.tertiary} />
              <Text className="text-[16px] ml-3" style={{ color: communityColors.text.primary }}>
                {t('communities.settings', 'Community Settings')}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      </Pressable>
    </Modal>
  );
});

MenuSheet.displayName = 'MenuSheet';

// =============================================================================
// THREAD/GROUP ITEM - WhatsApp iOS style with larger avatar
// =============================================================================

interface ThreadItemProps {
  thread: CommunityThread;
  onPress: () => void;
  isAnnouncement?: boolean;
}

const ThreadItem = memo(({ thread, onPress, isAnnouncement = false }: ThreadItemProps) => {
  const { t } = useTranslation();

  // Format date like WhatsApp (DD/MM/YY or Yesterday)
  const formatDate = (dateString?: string) => {
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
    } else {
      // DD/MM/YY format like WhatsApp
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear().toString().slice(-2);
      return `${day}/${month}/${year}`;
    }
  };

  const hasUnread = (thread.unread_count ?? 0) > 0;

  // Get sender name and message preview separately
  const getPreviewParts = () => {
    if (!thread.last_message) {
      return { senderName: '', message: thread.description || '' };
    }
    const { sender_name, text_preview, message_type } = thread.last_message;

    let message = text_preview;
    if (message_type === 'image') message = '📷 Photo';
    else if (message_type === 'video') message = '🎬 Video';
    else if (message_type === 'audio') message = '🎵 Voice message';
    else if (message_type === 'document') message = '📄 Document';
    else if (message_type === 'poll') message = '📊 Poll';
    else if (message_type === 'system') return { senderName: '', message };

    return { senderName: sender_name, message };
  };

  const { senderName, message } = getPreviewParts();

  return (
    <Pressable
      onPress={onPress}
      className="flex-row px-5 py-3.5 min-h-[80px] items-start bg-white"
      style={({ pressed }) => [
        pressed && Platform.OS === 'ios' ? { backgroundColor: communityColors.pressed } : undefined,
      ]}
      android_ripple={{ color: 'rgba(0,0,0,0.1)' }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${thread.name}${hasUnread ? `, ${thread.unread_count} unread ${thread.unread_count === 1 ? 'message' : 'messages'}` : ''}`}
    >
      {/* Avatar - 56px */}
      <View className="mr-3">
        {isAnnouncement ? (
          // Announcement icon - green megaphone in circle
          <View
            className="w-[56px] h-[56px] rounded-full items-center justify-center"
            style={{ backgroundColor: '#DCF8C6' }}
          >
            <Volume2 size={28} color={communityColors.dark} />
          </View>
        ) : thread.cover_image ? (
          <Image
            source={{ uri: thread.cover_image }}
            className="w-[56px] h-[56px] rounded-full"
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          // Default avatar with initials
          <View
            className="w-[56px] h-[56px] rounded-full items-center justify-center"
            style={{ backgroundColor: '#00A884' }}
          >
            <Text className="text-[20px] font-semibold text-white">
              {thread.name?.substring(0, 2).toUpperCase() || '??'}
            </Text>
          </View>
        )}
      </View>

      {/* Content - top aligned */}
      <View className="flex-1 border-b" style={{ borderBottomColor: communityColors.divider, paddingBottom: 14 }}>
        <View className="flex-row justify-between items-start">
          {/* Name */}
          <Text
            className={`flex-1 text-[17px] mr-2 ${hasUnread ? 'font-semibold' : 'font-normal'}`}
            style={{ color: communityColors.text.primary }}
            numberOfLines={1}
          >
            {thread.name}
          </Text>
          {/* Date */}
          <Text
            className="text-[13px]"
            style={{ color: hasUnread ? communityColors.dark : communityColors.text.secondary }}
          >
            {formatDate(thread.last_message?.created_at)}
          </Text>
        </View>
        {/* Preview - sender bold, message regular (unless unread), 2 lines */}
        <View className="flex-row justify-between items-start mt-1">
          <Text
            className="flex-1 text-[15px] leading-[20px]"
            style={{ color: communityColors.text.secondary }}
            numberOfLines={2}
          >
            {senderName ? (
              <>
                <Text style={{ fontWeight: hasUnread ? '600' : '600' }}>{senderName}: </Text>
                <Text style={{ fontWeight: hasUnread ? '600' : '400' }}>{message}</Text>
              </>
            ) : (
              <Text style={{ fontWeight: hasUnread ? '600' : '400' }}>{message}</Text>
            )}
          </Text>
          {/* Unread badge - darker green */}
          {hasUnread && (
            <View
              className="ml-2 min-w-[20px] h-[20px] rounded-full items-center justify-center px-1.5"
              style={{ backgroundColor: communityColors.mentionBadge }}
            >
              <Text className="text-[12px] font-bold text-white">
                {(thread.unread_count ?? 0) > 99 ? '99+' : thread.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
});

ThreadItem.displayName = 'ThreadItem';

// =============================================================================
// SECTION HEADER - Compact
// =============================================================================

const SectionHeader = memo(({ title }: { title: string }) => (
  <View className="px-5 py-2.5 bg-white">
    <Text className="text-[15px] font-semibold" style={{ color: communityColors.text.secondary }}>
      {title}
    </Text>
  </View>
));

SectionHeader.displayName = 'SectionHeader';

// =============================================================================
// CREATE GROUP MODAL
// =============================================================================

interface CreateGroupModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (name: string, description?: string) => void;
  isLoading: boolean;
}

const CreateGroupModal = memo(({ visible, onClose, onSubmit, isLoading }: CreateGroupModalProps) => {
  const { t } = useTranslation();
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  const handleSubmit = useCallback(() => {
    if (!groupName.trim()) return;
    onSubmit(groupName.trim(), groupDescription.trim() || undefined);
  }, [groupName, groupDescription, onSubmit]);

  const handleClose = useCallback(() => {
    setGroupName('');
    setGroupDescription('');
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable
        className="flex-1 justify-center items-center"
        style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
        onPress={handleClose}
        accessible={false}
      >
        <Pressable
          onPress={(e) => e.stopPropagation()}
        >
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(150)}
            className="bg-white rounded-2xl mx-5 p-5 w-[90%] max-w-[400px]"
          >
          {/* Header */}
          <Text className="text-xl font-bold text-gray-900 mb-4">
            {t('communities.createGroup', 'Create New Group')}
          </Text>

          {/* Group Name Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('communities.groupName', 'Group Name')}
            </Text>
            <Input variant="outline" size="md">
              <InputField
                placeholder={t('communities.groupNamePlaceholder', 'Enter group name')}
                value={groupName}
                onChangeText={setGroupName}
                autoCapitalize="words"
                autoFocus
              />
            </Input>
          </View>

          {/* Description Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('communities.description', 'Description')} ({t('common.optional', 'optional')})
            </Text>
            <Textarea size="md">
              <TextareaInput
                placeholder={t('communities.descriptionPlaceholder', 'What is this group about?')}
                value={groupDescription}
                onChangeText={setGroupDescription}
                multiline
                numberOfLines={3}
              />
            </Textarea>
          </View>

          {/* Buttons */}
          <View className="flex-row gap-3">
            <Button
              variant="outline"
              size="md"
              className="flex-1"
              onPress={handleClose}
              isDisabled={isLoading}
            >
              <ButtonText>{t('common.cancel', 'Cancel')}</ButtonText>
            </Button>
            <Button
              size="md"
              className="flex-1"
              style={{ backgroundColor: communityColors.accent }}
              onPress={handleSubmit}
              isDisabled={!groupName.trim() || isLoading}
            >
              {isLoading ? (
                <ButtonText>{t('common.creating', 'Creating...')}</ButtonText>
              ) : (
                <ButtonText>{t('common.create', 'Create')}</ButtonText>
              )}
            </Button>
          </View>
        </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
});

CreateGroupModal.displayName = 'CreateGroupModal';

// =============================================================================
// LOADING SKELETON
// =============================================================================

const LoadingSkeleton = memo(() => {
  const insets = useSafeAreaInsets();

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="dark-content" backgroundColor={communityColors.background.surface} />
      <View style={{ paddingTop: insets.top, backgroundColor: communityColors.background.surface }}>
        {/* Header skeleton */}
        <View className="flex-row items-center justify-between px-5 py-2">
          <View className="w-8 h-8 rounded" style={{ backgroundColor: '#E0E0E0' }} />
          <View className="w-8 h-8 rounded" style={{ backgroundColor: '#E0E0E0' }} />
        </View>
        {/* Community info skeleton */}
        <View className="flex-row items-center px-5 py-4">
          <View className="w-[60px] h-[60px] rounded-2xl mr-3" style={{ backgroundColor: '#E0E0E0' }} />
          <View className="flex-1">
            <View className="h-7 w-48 rounded mb-2" style={{ backgroundColor: '#E0E0E0' }} />
            <View className="h-4 w-24 rounded" style={{ backgroundColor: '#E0E0E0' }} />
          </View>
        </View>
      </View>
      {/* List skeleton */}
      {[1, 2, 3, 4, 5].map((i) => (
        <Animated.View
          key={i}
          entering={FadeIn.delay(i * 80).duration(300)}
          className="flex-row items-start px-5 py-3.5 min-h-[80px]"
        >
          <View
            className="w-[56px] h-[56px] rounded-full mr-3"
            style={{ backgroundColor: communityColors.background.surface }}
          />
          <View className="flex-1 pb-3.5">
            <View className="h-4 w-3/4 rounded mb-2" style={{ backgroundColor: communityColors.background.surface }} />
            <View className="h-3 w-full rounded mb-1" style={{ backgroundColor: communityColors.background.surface }} />
            <View className="h-3 w-2/3 rounded" style={{ backgroundColor: communityColors.background.surface }} />
          </View>
        </Animated.View>
      ))}
    </View>
  );
});

LoadingSkeleton.displayName = 'LoadingSkeleton';

// =============================================================================
// MAIN SCREEN
// =============================================================================

function CommunityThreadsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const [refreshing, setRefreshing] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);

  // Fetch community details
  const { data: community, isLoading, refetch } = useCommunity(id);

  // Create subgroup mutation
  const createSubgroupMutation = useCreateSubgroup();

  // Get threads for this community
  const threads = useMemo(() => {
    if (!id) return [];
    return getThreadsForCommunity(id);
  }, [id]);

  // Separate announcement thread from other threads
  const { announcementThread, groupThreads } = useMemo(() => {
    const announcement = threads.find((t) => t.thread_type === 'announcement');
    const groups = threads.filter((t) => t.thread_type !== 'announcement');
    return { announcementThread: announcement, groupThreads: groups };
  }, [threads]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleThreadPress = useCallback(
    (thread: CommunityThread) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      navigateTo(`/community/${id}/chat?thread_id=${thread.id}`);
    },
    [id]
  );

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  const handleMenu = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowMenu(true);
  }, []);

  const handleInfo = useCallback(() => {
    navigateTo(`/community/${id}/info`);
  }, [id]);

  const handleSettings = useCallback(() => {
    navigateTo(`/community/${id}/settings`);
  }, [id]);

  const handleAddGroup = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowCreateGroupModal(true);
  }, []);

  const handleCreateGroup = useCallback(
    (name: string, description?: string) => {
      if (!id) return;
      createSubgroupMutation.mutate(
        { communityId: id, name, description },
        {
          onSuccess: (newSubgroup) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            setShowCreateGroupModal(false);
            refetch(); // Refresh the threads list
          },
          onError: (error) => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            console.error('Failed to create group:', error);
          },
        }
      );
    },
    [id, createSubgroupMutation, refetch]
  );

  const isLeader = community?.my_role === 'admin' || community?.my_role === 'leader';

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: communityColors.background.surface }} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={communityColors.background.surface} />

      {/* Header - Light grey background */}
      <View style={{ backgroundColor: communityColors.background.surface }}>
        {/* Navigation bar */}
        <View className="flex-row items-center justify-between px-2 h-11">
          {/* Back button */}
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeft size={28} color={communityColors.text.primary} strokeWidth={1.5} />
          </Pressable>

          {/* Menu button */}
          <Pressable
            onPress={handleMenu}
            className="w-10 h-10 items-center justify-center"
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <MoreHorizontal size={24} color={communityColors.text.primary} />
          </Pressable>
        </View>

        {/* Community Header - avatar, bold name, "Community" subtitle */}
        <Animated.View
          entering={FadeIn.duration(300)}
          className="flex-row items-center px-4 pb-4"
        >
          {/* Community Avatar - Rounded Square, 60px */}
          {community?.cover_image ? (
            <Image
              source={{ uri: community.cover_image }}
              className="w-[60px] h-[60px] rounded-2xl mr-3"
              contentFit="cover"
              cachePolicy="memory-disk"
            />
          ) : (
            <View
              className="w-[60px] h-[60px] rounded-2xl items-center justify-center mr-3"
              style={{ backgroundColor: '#00A884' }}
            >
              <Volume2 size={30} color="#FFFFFF" />
            </View>
          )}

          {/* Community Info */}
          <View className="flex-1">
            {/* Community Name - Bold and larger */}
            <Text
              className="text-[22px] font-bold"
              style={{ color: communityColors.text.primary }}
              numberOfLines={2}
            >
              {community?.name || 'Community'}
            </Text>

            {/* "Community" subtitle - light grey */}
            <Text className="text-[14px] mt-0.5" style={{ color: communityColors.text.secondary }}>
              {t('communities.community', 'Community')}
            </Text>
          </View>
        </Animated.View>
      </View>

      {/* Main content area - white background */}
      <View style={{ flex: 1, backgroundColor: '#FFFFFF' }}>
        <ScrollView
          style={{ flex: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={communityColors.accent}
              colors={[communityColors.accent]}
            />
          }
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 20 }}
        >
          {/* Announcements Section */}
          {announcementThread && (
            <Animated.View entering={FadeInDown.delay(100).duration(300)}>
              <ThreadItem
                thread={announcementThread}
                onPress={() => handleThreadPress(announcementThread)}
                isAnnouncement
              />
            </Animated.View>
          )}

          {/* Groups Section Header - Compact spacing */}
          {groupThreads.length > 0 && (
            <SectionHeader title={t('communities.groupsYoureIn', "Groups you're in")} />
          )}

          {/* Groups List */}
          {groupThreads.map((thread, index) => (
            <Animated.View
              key={thread.id}
              entering={FadeInDown.delay(150 + index * 40).duration(300)}
            >
              <ThreadItem
                thread={thread}
                onPress={() => handleThreadPress(thread)}
              />
            </Animated.View>
          ))}
        </ScrollView>

        {/* Add Group Button - Gluestack Button at bottom */}
        <SafeAreaView edges={['bottom']} style={{ backgroundColor: '#FFFFFF' }}>
          <View
            className="px-5 py-3 border-t-[0.5px]"
            style={{ borderTopColor: communityColors.divider }}
          >
            <Button
              size="lg"
              className="rounded-full"
              style={{ backgroundColor: communityColors.accent }}
              onPress={handleAddGroup}
            >
              <ButtonIcon as={Plus} size="md" className="mr-2" />
              <ButtonText className="font-semibold">
                {t('communities.addGroup', 'Add group')}
              </ButtonText>
            </Button>
          </View>
        </SafeAreaView>
      </View>

      {/* Menu Sheet */}
      <MenuSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onInfo={handleInfo}
        onSettings={handleSettings}
        isLeader={isLeader}
      />

      {/* Create Group Modal */}
      <CreateGroupModal
        visible={showCreateGroupModal}
        onClose={() => setShowCreateGroupModal(false)}
        onSubmit={handleCreateGroup}
        isLoading={createSubgroupMutation.isPending}
      />
    </SafeAreaView>
  );
}

// Memoize and apply Premium Motion HOC
const MemoizedCommunityThreadsScreen = memo(CommunityThreadsScreen);
MemoizedCommunityThreadsScreen.displayName = 'CommunityThreadsScreen';
export default withPremiumMotionV10(MemoizedCommunityThreadsScreen);
