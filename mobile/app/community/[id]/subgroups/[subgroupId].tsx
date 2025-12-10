/**
 * Sub-group Chat Screen
 *
 * Chat screen for a specific sub-group within a community.
 * Similar to main chat but scoped to subgroup channel.
 * Includes WhatsApp-level performance optimizations and micro-interactions.
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Mic,
  X,
  MoreVertical,
  Timer,
  Info,
  MessageSquare,
  Settings,
} from 'lucide-react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import Animated, {
  FadeInUp,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withDelay,
  interpolate,
} from 'react-native-reanimated';

import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { AttachmentPicker, MediaAttachment } from '@/components/chat/AttachmentPicker';
import { WhatsAppText } from '@/components/chat/WhatsAppText';
import { LinkPreview } from '@/components/chat/LinkPreview';
import { MessageActionsSheet, ForwardMessageModal } from '@/components/chat/MessageActions';
import { LocationSharer, LocationPreview, LocationData, LiveLocationData } from '@/components/chat/LocationSharing';

// NEW: Enhanced WhatsApp-style components
import { EmojiPickerSheet } from '@/components/chat/EmojiPicker';
import { GifPickerSheet, GifButton, type GifItem } from '@/components/chat/GifPicker';
import { MediaGalleryViewer, type MediaItem } from '@/components/chat/MediaGallery';
import {
  ReadReceiptSummary,
  ReadReceiptList,
  type ReadReceiptUser,
} from '@/components/chat/ReadReceipts';
import {
  TypingIndicator as TypingIndicatorComponent,
  TypingBubble as NewTypingBubble,
  TypingStatus,
  type TypingUser,
} from '@/components/chat/TypingIndicator';
import {
  DisappearingMessagesSettings,
  DisappearingIndicator,
  type DisappearingDuration,
} from '@/components/chat/DisappearingMessages';

// Chat performance optimizations
import {
  SendButton,
  ScrollToBottomFAB,
  MessageStatusIndicator,
  ConnectionBanner,
  AttachmentButton,
  SwipeToReplyWrapper,
  DoubleTapReaction,
  DateHeader,
  useScrollPosition,
  useMessageGrouping,
} from '@/components/chat/ChatOptimizations';
import { VoiceNoteInput, VoiceNotePlayer } from '@/components/chat/VoiceNote';

import {
  useCommunity,
  useCommunitySubgroups,
  useCommunityMessages,
  useSendMessage,
  useSendMediaMessage,
  useMarkAsRead,
  useReactToMessage,
  useDeleteMessage,
  useEditMessage,
  useForwardMessage,
  useStarMessage,
  useStarredMessages,
  useMyCommunities,
} from '@/hooks/useCommunities';
import { useCommunitySubscription, useTypingIndicator } from '@/hooks/useMqtt';
import { useAuthStore } from '@/stores/auth';
import { useNavigationStore } from '@/stores/navigation';
import { uploadMedia, UploadProgressCallback } from '@/services/mediaUpload';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import type { CommunityMessage, CommunitySubgroup } from '@/types/communities';

// Upload components
import { UploadProgress, UploadStatus } from '@/components/chat/UploadProgress';

// =============================================================================
// MESSAGE BUBBLE
// =============================================================================

interface MessageBubbleProps {
  message: CommunityMessage;
  isOwnMessage: boolean;
  showSender: boolean;
  onLongPress?: () => void;
  onReact?: (emoji: string) => void;
  onReadReceiptPress?: (message: CommunityMessage) => void;
}

// Custom comparison for optimal re-renders
const areMessagePropsEqual = (
  prevProps: MessageBubbleProps,
  nextProps: MessageBubbleProps
): boolean => {
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.updated_at !== nextProps.message.updated_at) return false;
  if (prevProps.isOwnMessage !== nextProps.isOwnMessage) return false;
  if (prevProps.showSender !== nextProps.showSender) return false;

  const prevReactions = JSON.stringify(prevProps.message.reactions || {});
  const nextReactions = JSON.stringify(nextProps.message.reactions || {});
  if (prevReactions !== nextReactions) return false;

  const prevReadCount = prevProps.message.read_by?.length || 0;
  const nextReadCount = nextProps.message.read_by?.length || 0;
  if (prevReadCount !== nextReadCount) return false;

  return true;
};

const MessageBubble = React.memo(
  ({ message, isOwnMessage, showSender, onLongPress, onReact, onReadReceiptPress }: MessageBubbleProps) => {
    const formatTime = (dateString: string) => {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    };

    // Determine message status for indicator
    const getMessageStatus = (): 'sending' | 'sent' | 'delivered' | 'read' | 'failed' => {
      if (message.is_optimistic) return 'sending';
      if (message.send_failed) return 'failed';
      const readCount = message.read_by?.length || 0;
      if (readCount > 0) return 'read';
      if ((message.delivered_to?.length ?? 0) > 0) return 'delivered';
      return 'sent';
    };

    // Handle double-tap quick reaction
    const handleDoubleTap = useCallback(() => {
      onReact?.('❤️');
    }, [onReact]);

    if (message.is_deleted) {
      return (
        <View className={`my-1 px-4 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          <View
            className="px-4 py-2 rounded-2xl"
            style={{ backgroundColor: colors.gray[200] }}
          >
            <Text className="text-gray-500 italic text-sm">
              This message was deleted
            </Text>
          </View>
        </View>
      );
    }

    return (
      <Pressable
        onLongPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          onLongPress?.();
        }}
        delayLongPress={500}
        className={`my-0.5 px-4 ${isOwnMessage ? 'items-end' : 'items-start'}`}
        accessible
        accessibilityRole="button"
        accessibilityLabel={`Message from ${message.sender?.name || message.sender_name || 'Unknown'}: ${message.text || 'Media message'}`}
      >
        <View style={{ maxWidth: '80%' }}>
          {showSender && !isOwnMessage && (message.sender?.name || message.sender_name) && (
            <Text className="text-xs text-gray-500 ml-2 mb-1">
              {message.sender?.name || message.sender_name}
            </Text>
          )}

          {/* WhatsApp-exact colors: #DCF8C6 outgoing, #FFFFFF incoming */}
          <View
            className="px-4 py-2 rounded-2xl"
            style={{
              backgroundColor: isOwnMessage ? '#DCF8C6' : '#FFFFFF',
              borderBottomRightRadius: isOwnMessage ? 4 : borderRadius['2xl'],
              borderBottomLeftRadius: isOwnMessage ? borderRadius['2xl'] : 4,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            {message.media?.url && message.message_type === 'image' && (
              <Image
                source={{ uri: message.media.url }}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: borderRadius.lg,
                  marginBottom: message.text ? spacing.sm : 0,
                }}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            )}

            {/* Location message */}
            {(message.message_type === 'location' || message.message_type === 'live_location') && message.location && (
              <LocationPreview
                location={{
                  latitude: message.location.latitude,
                  longitude: message.location.longitude,
                  address: message.location.address,
                  ...(message.message_type === 'live_location' && {
                    duration: message.location.duration,
                    expiresAt: message.location.expires_at,
                    isActive: new Date(message.location.expires_at || '').getTime() > Date.now(),
                  }),
                }}
                isOwnMessage={isOwnMessage}
              />
            )}

            {/* Text content with WhatsApp-style formatting */}
            {message.text && (
              <WhatsAppText style={{ color: colors.gray[900] }}>
                {message.text}
              </WhatsAppText>
            )}

            {/* Link preview for URLs in text messages */}
            {message.text && message.message_type === 'text' && (() => {
              const urlMatch = message.text.match(/https?:\/\/[^\s]+/);
              if (urlMatch) {
                return <LinkPreview url={urlMatch[0]} isOwnMessage={isOwnMessage} compact />;
              }
              return null;
            })()}

            {/* WhatsApp-style time and status */}
            <HStack className="justify-end items-center mt-1">
              {message.is_edited && (
                <Text className="text-xs mr-1 text-gray-500">edited</Text>
              )}
              <Text className="text-xs text-gray-500">
                {formatTime(message.created_at)}
              </Text>
              {isOwnMessage && onReadReceiptPress ? (
                <Pressable
                  onPress={() => onReadReceiptPress(message)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessible
                  accessibilityRole="button"
                  accessibilityLabel="View read receipts"
                >
                  <MessageStatusIndicator
                    status={getMessageStatus()}
                    isOwnMessage={isOwnMessage}
                  />
                </Pressable>
              ) : (
                <MessageStatusIndicator
                  status={getMessageStatus()}
                  isOwnMessage={isOwnMessage}
                />
              )}
            </HStack>
          </View>

          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <HStack space="xs" className="mt-1 ml-2">
              {Object.entries(message.reactions).map(([emoji, memberIds]) => (
                <View
                  key={emoji}
                  className="px-2 py-0.5 rounded-full flex-row items-center"
                  style={{ backgroundColor: colors.gray[100] }}
                >
                  <Text className="text-sm">{emoji}</Text>
                  {memberIds.length > 1 && (
                    <Text className="text-xs text-gray-600 ml-1">
                      {memberIds.length}
                    </Text>
                  )}
                </View>
              ))}
            </HStack>
          )}
        </View>
      </Pressable>
    );
  },
  areMessagePropsEqual
);

MessageBubble.displayName = 'MessageBubble';

// =============================================================================
// TYPING INDICATOR
// =============================================================================

// Animated dot for typing indicator
function AnimatedDot({ delay }: { delay: number }) {
  const progress = useSharedValue(0);

  React.useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 600 }), -1, true)
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0.4, 1]),
    transform: [{ scale: interpolate(progress.value, [0, 1], [0.8, 1]) }],
  }));

  return (
    <Animated.View
      style={[
        { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gray[400] },
        animatedStyle,
      ]}
    />
  );
}

const TypingIndicator = ({ text }: { text: string | null }) => {
  if (!text) return null;

  return (
    <Animated.View
      entering={FadeInUp.duration(200)}
      exiting={FadeOut.duration(200)}
      className="px-4 py-2"
    >
      <HStack space="sm" className="items-center">
        <View
          className="px-3 py-2 rounded-2xl"
          style={{ backgroundColor: colors.gray[100] }}
        >
          <HStack space="xs">
            <AnimatedDot delay={0} />
            <AnimatedDot delay={200} />
            <AnimatedDot delay={400} />
          </HStack>
        </View>
        <Text className="text-gray-500 text-sm">{text}</Text>
      </HStack>
    </Animated.View>
  );
};

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function SubgroupChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: communityId, subgroupId } = useLocalSearchParams<{ id: string; subgroupId: string }>();
  const { member } = useAuthStore();

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommunityMessage | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');

  // Upload state
  const [pendingAttachment, setPendingAttachment] = useState<MediaAttachment | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // WhatsApp UX feature states
  const [selectedMessage, setSelectedMessage] = useState<CommunityMessage | null>(null);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [showLocationSharer, setShowLocationSharer] = useState(false);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set());

  // NEW: Enhanced chat feature states
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [reactionTargetMessage, setReactionTargetMessage] = useState<CommunityMessage | null>(null);
  const [mediaGalleryItems, setMediaGalleryItems] = useState<MediaItem[]>([]);
  const [mediaGalleryIndex, setMediaGalleryIndex] = useState(0);
  const [showMediaGallery, setShowMediaGallery] = useState(false);

  // NEW: Read receipts and disappearing messages states
  const [showReadReceiptList, setShowReadReceiptList] = useState(false);
  const [readReceiptMessage, setReadReceiptMessage] = useState<CommunityMessage | null>(null);
  const [showDisappearingSettings, setShowDisappearingSettings] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState<DisappearingDuration>('off');

  // Menu state
  const [showMenu, setShowMenu] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const menuSheetRef = useRef<BottomSheet>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const listRef = useRef<any>(null);

  // Scroll position tracking for FAB
  const {
    isAtBottom,
    newMessageCount,
    handleScroll,
    incrementNewMessages,
    resetNewMessages,
  } = useScrollPosition();

  const lastTypingRef = useRef<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch data
  const { data: community } = useCommunity(communityId);
  const { data: subgroups } = useCommunitySubgroups(communityId);
  const subgroup = subgroups?.find(s => s.id === subgroupId);

  // Check user permissions
  const isLeader = community?.my_role === 'admin' || community?.my_role === 'leader';

  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityMessages(communityId, 'subgroup', subgroupId);

  // Fetch starred messages for this community
  const { data: starredMessagesData } = useStarredMessages(communityId);

  // Fetch user's communities for forwarding messages
  const { data: myCommunities } = useMyCommunities();

  // Transform communities for forward modal (exclude current community)
  const forwardChats = useMemo(() => {
    if (!myCommunities) return [];
    return myCommunities
      .filter((c) => c.id !== communityId)
      .map((c) => ({
        id: c.id,
        name: c.name,
        avatar: c.cover_image || c.avatar_url,
      }));
  }, [myCommunities, communityId]);

  // Initialize starred messages set from backend data
  useEffect(() => {
    if (starredMessagesData) {
      const starredIds = new Set(starredMessagesData.map(msg => msg.id));
      setStarredMessages(starredIds);
    }
  }, [starredMessagesData]);

  // Track current route for notification suppression
  const setCurrentRoute = useNavigationStore((state) => state.setCurrentRoute);
  useEffect(() => {
    if (communityId && subgroupId) {
      setCurrentRoute(`/community/${communityId}/subgroups/${subgroupId}`, {
        communityId,
        subgroupId,
      });
    }
    return () => {
      setCurrentRoute('', {});
    };
  }, [communityId, subgroupId, setCurrentRoute]);

  const sendMessageMutation = useSendMessage();
  const sendMediaMutation = useSendMediaMessage();
  const markAsReadMutation = useMarkAsRead();
  const reactToMessageMutation = useReactToMessage();
  const deleteMessageMutation = useDeleteMessage();
  const editMessageMutation = useEditMessage();
  const forwardMessageMutation = useForwardMessage();
  const starMessageMutation = useStarMessage();

  // MQTT subscription for subgroup
  const { sendTyping } = useCommunitySubscription(communityId, 'subgroup', subgroupId);
  const typingIndicatorText = useTypingIndicator(communityId);

  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  // Group messages by date for date headers
  const groupedMessages = useMessageGrouping(messages);

  // Handle message reaction
  const handleReaction = useCallback((messageId: string, emoji: string) => {
    if (!member) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    // Determine if adding or removing reaction
    const existingReaction = messages.find(m => m.id === messageId)?.reactions?.[emoji];
    const hasReacted = existingReaction?.includes(member.id);

    reactToMessageMutation.mutate({
      messageId,
      emoji,
      action: hasReacted ? 'remove' : 'add',
      communityId,
      channelType: 'subgroup',
      subgroupId,
    });
  }, [member, reactToMessageMutation, messages, communityId, subgroupId]);

  // Collect all media items from messages for gallery viewer
  const allMediaItems = useMemo((): MediaItem[] => {
    return messages
      .filter((m) => (m.message_type === 'image' || m.message_type === 'video') && m.media?.url)
      .map((m) => ({
        id: m.id,
        type: m.message_type as 'image' | 'video',
        uri: m.media!.url,
        thumbnail_uri: m.media!.thumbnail_url,
        width: m.media!.width,
        height: m.media!.height,
        sender_name: m.sender?.name || m.sender_name || 'Unknown',
        created_at: m.created_at,
      }));
  }, [messages]);

  // Handle opening media gallery
  const handleOpenMediaGallery = useCallback((uri: string) => {
    const index = allMediaItems.findIndex((item) => item.uri === uri);
    if (index !== -1) {
      setMediaGalleryItems(allMediaItems);
      setMediaGalleryIndex(index);
      setShowMediaGallery(true);
    }
  }, [allMediaItems]);

  // Handle full emoji picker selection for reactions
  const handleOpenEmojiPicker = useCallback((message: CommunityMessage) => {
    setReactionTargetMessage(message);
    setShowEmojiPicker(true);
  }, []);

  const handleEmojiSelect = useCallback((emoji: string) => {
    if (reactionTargetMessage) {
      handleReaction(reactionTargetMessage.id, emoji);
    }
    setShowEmojiPicker(false);
    setReactionTargetMessage(null);
  }, [reactionTargetMessage, handleReaction]);

  // Handle GIF selection
  // NOTE: GIF sending requires media upload support - for now send as text with URL
  const handleGifSelect = useCallback(async (gif: GifItem) => {
    if (!member) return;

    setShowGifPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      // Send GIF URL as text message (backend would need to support GIF media type)
      await sendMessageMutation.mutateAsync({
        communityId,
        channelType: 'subgroup',
        subgroupId,
        message: {
          message_type: 'text',
          text: gif.url, // Send GIF URL as message text
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to send GIF');
    }
  }, [member, communityId, subgroupId, sendMessageMutation]);

  // Handle edit message
  const handleEditMessage = useCallback(async (newText: string) => {
    if (!selectedMessage) return;

    try {
      await editMessageMutation.mutateAsync({
        messageId: selectedMessage.id,
        text: newText,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[EditMessage] Failed:', error);
      Alert.alert('Error', 'Could not edit message. Please try again.');
    }
  }, [selectedMessage, editMessageMutation]);

  // Check if message can be edited (within 15 minutes)
  const canEditMessage = useCallback((message: CommunityMessage): boolean => {
    if (!message || !member) return false;
    if (message.sender_member_id !== member.id) return false;
    if (message.message_type !== 'text') return false;
    if (message.is_deleted) return false;

    const createdAt = new Date(message.created_at).getTime();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    return (now - createdAt) < fifteenMinutes;
  }, [member]);

  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      sendTyping(true);
      lastTypingRef.current = now;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 3000) as unknown as ReturnType<typeof setTimeout>;
  }, [sendTyping]);

  // Scroll to bottom handler
  const handleScrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    resetNewMessages();
  }, [resetNewMessages]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !member) return;

    const messageText = inputText.trim();
    setInputText('');
    setReplyingTo(null);
    sendTyping(false);

    try {
      await sendMessageMutation.mutateAsync({
        communityId,
        channelType: 'subgroup',
        subgroupId,
        message: {
          message_type: 'text',
          text: messageText,
          reply_to_message_id: replyingTo?.id,
        },
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message');
      setInputText(messageText);
    }
  }, [inputText, communityId, subgroupId, member, replyingTo, sendMessageMutation, sendTyping]);

  // Handle message long press - open WhatsApp-style action sheet
  const handleMessageLongPress = useCallback((message: CommunityMessage) => {
    setSelectedMessage(message);
    setShowActionsSheet(true);
  }, []);

  // Handle media upload
  const handleMediaUpload = useCallback(async (attachment: MediaAttachment) => {
    if (!member) return;

    setUploadStatus('uploading');
    setUploadProgress(0);
    setPendingAttachment(attachment);

    try {
      const progressCallback: UploadProgressCallback = (progress) => {
        setUploadProgress(progress.percentage);
      };

      const result = await uploadMedia(
        communityId,
        attachment,
        progressCallback
      );

      // Send the media message
      await sendMediaMutation.mutateAsync({
        communityId,
        channelType: 'subgroup',
        subgroupId,
        messageType: attachment.type,
        media: {
          seaweedfs_fid: result.fid || result.media?.seaweedfs_fid || '',
          mime_type: attachment.mimeType,
          file_name: attachment.fileName,
          file_size: attachment.fileSize || 0,
          width: attachment.width,
          height: attachment.height,
        },
        text: inputText.trim() || undefined,
      });

      setUploadStatus('success');
      setInputText('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        setUploadStatus(null);
        setPendingAttachment(null);
      }, 1500);
    } catch (error) {
      setUploadStatus('error');
      Alert.alert('Upload Failed', 'Could not upload media. Please try again.');
    }
  }, [communityId, subgroupId, member, inputText, sendMediaMutation]);

  // Handle voice note upload
  const handleVoiceUpload = useCallback(async (uri: string, duration: number) => {
    if (!member) return;

    setUploadStatus('uploading');
    setUploadProgress(0);

    const voiceAttachment: MediaAttachment = {
      uri,
      type: 'audio',
      mimeType: 'audio/m4a',
      fileName: `voice_${Date.now()}.m4a`,
      duration,
    };

    setPendingAttachment(voiceAttachment);

    try {
      const progressCallback: UploadProgressCallback = (progress) => {
        setUploadProgress(progress.percentage);
      };

      const result = await uploadMedia(
        communityId,
        voiceAttachment,
        progressCallback
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      await sendMediaMutation.mutateAsync({
        communityId,
        channelType: 'subgroup',
        subgroupId,
        messageType: 'audio',
        media: {
          seaweedfs_fid: result.fid || result.media?.seaweedfs_fid || '',
          mime_type: voiceAttachment.mimeType,
          file_name: voiceAttachment.fileName,
          file_size: 0,
          duration: duration,
        },
      });

      setUploadStatus('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      setTimeout(() => {
        setUploadStatus(null);
        setPendingAttachment(null);
      }, 1500);
    } catch (error) {
      console.error('[VoiceUpload] Failed:', error);
      setUploadStatus('error');
      Alert.alert('Upload Failed', 'Could not send voice message. Please try again.');
    }
  }, [communityId, subgroupId, member, sendMediaMutation]);

  // Handle message star/unstar
  const handleStarMessage = useCallback(async (messageId: string) => {
    const isCurrentlyStarred = starredMessages.has(messageId);
    const action = isCurrentlyStarred ? 'remove' : 'add';

    // Optimistic update
    setStarredMessages((prev) => {
      const newSet = new Set(prev);
      if (isCurrentlyStarred) {
        newSet.delete(messageId);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      } else {
        newSet.add(messageId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      return newSet;
    });

    try {
      await starMessageMutation.mutateAsync({ messageId, action });
    } catch (error) {
      // Rollback on error
      console.error('[StarMessage] Failed:', error);
      setStarredMessages((prev) => {
        const newSet = new Set(prev);
        if (isCurrentlyStarred) {
          newSet.add(messageId);
        } else {
          newSet.delete(messageId);
        }
        return newSet;
      });
    }
  }, [starredMessages, starMessageMutation]);

  // Handle message delete
  const handleDeleteMessage = useCallback(async (messageId: string, forEveryone: boolean) => {
    try {
      await deleteMessageMutation.mutateAsync({
        messageId,
        forEveryone,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[DeleteMessage] Failed:', error);
      Alert.alert('Error', 'Could not delete message. Please try again.');
    }
  }, [deleteMessageMutation]);

  // Handle message forward
  const handleForwardMessage = useCallback(async (chatIds: string[]) => {
    if (!selectedMessage) return;

    try {
      const result = await forwardMessageMutation.mutateAsync({
        messageId: selectedMessage.id,
        targetCommunityIds: chatIds,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', `Message forwarded to ${result.forwarded_count} chat(s)`);
    } catch (error) {
      console.error('[ForwardMessage] Failed:', error);
      Alert.alert('Error', 'Could not forward message. Please try again.');
    }
  }, [selectedMessage, forwardMessageMutation]);

  // Handle location sharing
  const handleShareLocation = useCallback(async (location: LocationData) => {
    if (!member) return;

    try {
      await sendMessageMutation.mutateAsync({
        communityId,
        channelType: 'subgroup',
        subgroupId,
        message: {
          message_type: 'location' as const,
          text: location.address || `${location.latitude}, ${location.longitude}`,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
          },
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to share location');
    }
  }, [communityId, subgroupId, member, sendMessageMutation]);

  // Handle live location sharing
  const handleShareLiveLocation = useCallback(async (location: LiveLocationData) => {
    if (!member) return;

    try {
      await sendMessageMutation.mutateAsync({
        communityId,
        channelType: 'subgroup',
        subgroupId,
        message: {
          message_type: 'live_location' as const,
          text: location.address || `${location.latitude}, ${location.longitude}`,
          location: {
            latitude: location.latitude,
            longitude: location.longitude,
            address: location.address,
            duration: location.duration,
            expires_at: location.expiresAt,
          },
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to share live location');
    }
  }, [communityId, subgroupId, member, sendMessageMutation]);

  useEffect(() => {
    if (messages.length > 0 && member) {
      const latestMessage = messages[0];
      if (
        latestMessage &&
        latestMessage.sender_member_id !== member.id &&
        !latestMessage.read_by?.some((r) => r.member_id === member.id)
      ) {
        markAsReadMutation.mutate(latestMessage.id);
      }
    }
  }, [messages, member]);

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  const renderMessage = useCallback(
    ({ item, index }: { item: CommunityMessage | { type: 'date_header'; date: string }; index: number }) => {
      // Render date header
      if (item && 'type' in item && item.type === 'date_header') {
        return <DateHeader date={item.date} />;
      }

      const message = item as CommunityMessage;
      const isOwnMessage = message.sender_member_id === member?.id;

      // Find previous message (skip date headers) for sender grouping
      let prevMessage: CommunityMessage | null = null;
      for (let i = index + 1; i < groupedMessages.length; i++) {
        const prev = groupedMessages[i];
        if (prev && !('type' in prev)) {
          prevMessage = prev;
          break;
        }
      }

      const showSender = !isOwnMessage && (!prevMessage || prevMessage.sender_member_id !== message.sender_member_id);

      return (
        <SwipeToReplyWrapper
          onReply={() => {
            setReplyingTo(message);
            inputRef.current?.focus();
          }}
          enabled={!message.is_deleted}
        >
          <DoubleTapReaction
            onDoubleTap={() => handleReaction(message.id, '❤️')}
            enabled={!message.is_deleted && !message.is_optimistic}
          >
            <MessageBubble
              message={message}
              isOwnMessage={isOwnMessage}
              showSender={showSender}
              onLongPress={() => handleMessageLongPress(message)}
              onReact={(emoji) => handleReaction(message.id, emoji)}
              onReadReceiptPress={(msg) => {
                setReadReceiptMessage(msg);
                setShowReadReceiptList(true);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
            />
          </DoubleTapReaction>
        </SwipeToReplyWrapper>
      );
    },
    [member?.id, groupedMessages, handleMessageLongPress, handleReaction]
  );

  // Loading state
  if (!subgroup || (isLoadingMessages && messages.length === 0)) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        <HStack className="px-4 py-3 border-b border-gray-100 items-center" space="md">
          <Skeleton className="w-10 h-10 rounded-full" isLoaded={false} />
          <VStack className="flex-1">
            <Skeleton className="h-5 w-32" isLoaded={false} />
            <Skeleton className="h-3 w-20 mt-1" isLoaded={false} />
          </VStack>
        </HStack>
        <VStack className="flex-1 p-4" space="md">
          {[1, 2, 3, 4].map((i) => (
            <View key={i} className={`${i % 2 === 0 ? 'items-end' : 'items-start'}`}>
              <Skeleton
                className="h-12 rounded-2xl"
                style={{ width: `${60 + Math.random() * 20}%` }}
                isLoaded={false}
              />
            </View>
          ))}
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: '#ECE5DD' }} edges={['top']}>
      {/* Header - WhatsApp teal color */}
      <View style={{ backgroundColor: '#075E54', ...shadows.sm }}>
        <HStack className="px-4 py-3 items-center" space="md">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="active:opacity-70"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon as={ArrowLeft} size="lg" style={{ color: '#FFFFFF' }} />
          </Pressable>

          <Avatar size="md" className="bg-gray-300">
            <AvatarFallbackText className="text-gray-600">
              {subgroup.name.substring(0, 2).toUpperCase()}
            </AvatarFallbackText>
          </Avatar>

          <VStack className="flex-1">
            <Text className="font-bold text-base" style={{ color: '#FFFFFF' }} numberOfLines={1}>
              {subgroup.name}
            </Text>
            {typingIndicatorText ? (
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Text className="text-xs italic" style={{ color: '#25D366' }}>
                  {typingIndicatorText}
                </Text>
              </HStack>
            ) : (
              <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {subgroup.member_count} members • {community?.name}
              </Text>
            )}
          </VStack>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMenu(true);
            }}
            className="active:opacity-70 p-2"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Open menu"
          >
            <Icon as={MoreVertical} size="md" style={{ color: '#FFFFFF' }} />
          </Pressable>
        </HStack>
      </View>

      {/* Connection Status Banner */}
      <ConnectionBanner status={connectionStatus} />

      {/* Messages list */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View className="flex-1">
          <FlashList
            ref={listRef}
            data={groupedMessages}
            renderItem={renderMessage}
            keyExtractor={(item: CommunityMessage | { type: 'date_header'; date: string }) => {
              if (item && 'type' in item && item.type === 'date_header') {
                return `date-${item.date}`;
              }
              return (item as CommunityMessage).id;
            }}
            getItemType={(item: CommunityMessage | { type: 'date_header'; date: string }) => {
              if (item && 'type' in item && item.type === 'date_header') {
                return 'date_header';
              }
              return 'message';
            }}
            estimatedItemSize={80}
            inverted
            // High refresh rate optimizations (90Hz/120Hz/144Hz)
            drawDistance={800}
            estimatedListSize={{ height: 800, width: 400 }}
            overrideItemLayout={(layout: { size: number }, item: CommunityMessage | { type: 'date_header'; date: string }) => {
              // Date header
              if (item && 'type' in item && item.type === 'date_header') {
                layout.size = 48;
                return;
              }

              const msg = item as CommunityMessage;
              if (msg.is_deleted) layout.size = 50;
              else if (msg.message_type === 'image' || msg.message_type === 'video') {
                layout.size = 260 + (msg.text ? 40 : 0);
              } else {
                const textLength = msg.text?.length || 0;
                const lines = Math.ceil(textLength / 38);
                layout.size = 60 + lines * 22;
              }
            }}
            contentContainerStyle={{ paddingVertical: spacing.md }}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) fetchNextPage();
            }}
            onEndReachedThreshold={0.3}
            onScroll={handleScroll}
            // Lower scrollEventThrottle for smoother 120Hz tracking
            scrollEventThrottle={8}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View className="py-4 items-center">
                  <ActivityIndicator color={colors.primary[500]} />
                </View>
              ) : null
            }
            ListHeaderComponent={<TypingIndicator text={typingIndicatorText} />}
            maintainVisibleContentPosition={{
              minIndexForVisible: 1,
              autoscrollToTopThreshold: 10,
            }}
            removeClippedSubviews={Platform.OS === 'android'}
          />

          {/* Scroll to Bottom FAB */}
          <ScrollToBottomFAB
            visible={!isAtBottom}
            newMessageCount={newMessageCount}
            onPress={handleScrollToBottom}
          />
        </View>

        {/* Reply preview */}
        {replyingTo && (
          <View className="bg-white border-t border-gray-100 px-4 py-3" style={shadows.sm}>
            <HStack className="items-center" space="md">
              <View className="flex-1 pl-3 border-l-2 border-primary-500">
                <Text className="text-primary-600 font-medium text-sm">
                  {replyingTo.sender?.name || replyingTo.sender_name || 'Unknown'}
                </Text>
                <Text className="text-gray-600 text-sm" numberOfLines={1}>
                  {replyingTo.text || 'Media'}
                </Text>
              </View>
              <Pressable onPress={() => setReplyingTo(null)} className="p-2" accessible accessibilityRole="button" accessibilityLabel="Cancel reply">
                <Icon as={X} size="sm" className="text-gray-500" />
              </Pressable>
            </HStack>
          </View>
        )}

        {/* Input bar */}
        <View className="bg-white border-t border-gray-100 px-4 py-3" style={shadows.md}>
          <HStack space="sm" className="items-end">
            {/* Animated Attachment button */}
            <AttachmentButton
              onPress={() => setShowAttachmentPicker(true)}
            />

            {/* GIF button */}
            <GifButton onPress={() => setShowGifPicker(true)} />

            {/* Text input */}
            <View
              className="flex-1 rounded-3xl px-4 py-2"
              style={{
                backgroundColor: colors.gray[100],
                borderColor: isInputFocused ? colors.primary[300] : colors.gray[200],
                borderWidth: isInputFocused ? 1.5 : 1,
                minHeight: 44,
                maxHeight: 120,
              }}
            >
              <TextInput
                ref={inputRef}
                value={inputText}
                onChangeText={(text) => {
                  setInputText(text);
                  handleTyping();
                }}
                placeholder="Type a message..."
                placeholderTextColor={colors.gray[400]}
                multiline
                maxLength={4000}
                onFocus={() => setIsInputFocused(true)}
                onBlur={() => setIsInputFocused(false)}
                style={{
                  fontSize: 16,
                  color: colors.gray[900],
                  paddingVertical: Platform.OS === 'ios' ? 8 : 4,
                }}
              />
            </View>

            {/* Send/Voice button */}
            {inputText.trim() ? (
              <SendButton
                onPress={handleSend}
                disabled={!inputText.trim()}
                isSending={sendMessageMutation.isPending}
              />
            ) : (
              <VoiceNoteInput
                onSend={(uri, duration) => {
                  handleVoiceUpload(uri, duration);
                }}
                disabled={!member || uploadStatus === 'uploading'}
              />
            )}
          </HStack>
        </View>

        <SafeAreaView edges={['bottom']} className="bg-white" />
      </KeyboardAvoidingView>

      <AttachmentPicker
        visible={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        onSelect={(attachment) => {
          setShowAttachmentPicker(false);
          handleMediaUpload(attachment);
        }}
        onLocationPress={() => setShowLocationSharer(true)}
      />

      {/* Upload Progress */}
      {uploadStatus && pendingAttachment && (
        <UploadProgress
          fileName={pendingAttachment.fileName}
          progress={uploadProgress}
          status={uploadStatus}
          onCancel={() => {
            setUploadStatus(null);
            setPendingAttachment(null);
          }}
          onRetry={() => {
            if (pendingAttachment) {
              handleMediaUpload(pendingAttachment);
            }
          }}
        />
      )}

      {/* Message Actions Sheet - WhatsApp-style long press menu */}
      <MessageActionsSheet
        message={selectedMessage}
        visible={showActionsSheet}
        onClose={() => {
          setShowActionsSheet(false);
          setSelectedMessage(null);
        }}
        isOwnMessage={selectedMessage?.sender_member_id === member?.id}
        isStarred={selectedMessage ? starredMessages.has(selectedMessage.id) : false}
        canEdit={selectedMessage ? canEditMessage(selectedMessage) : false}
        onReply={() => {
          if (selectedMessage) {
            setReplyingTo(selectedMessage);
            inputRef.current?.focus();
          }
        }}
        onForward={() => {
          setShowActionsSheet(false);
          setShowForwardModal(true);
        }}
        onStar={() => {
          if (selectedMessage) {
            handleStarMessage(selectedMessage.id);
          }
        }}
        onCopy={() => {}}
        onEdit={handleEditMessage}
        onDelete={(forEveryone) => {
          if (selectedMessage) {
            handleDeleteMessage(selectedMessage.id, forEveryone);
          }
        }}
        onInfo={() => {
          if (selectedMessage) {
            const sentAt = new Date(selectedMessage.created_at).toLocaleString();
            const readCount = selectedMessage.read_by?.length || 0;
            const readByNames = selectedMessage.read_by?.slice(0, 5).map(r => r.member_name).join(', ') || 'No one yet';
            const moreReaders = readCount > 5 ? `\n+${readCount - 5} more` : '';

            Alert.alert(
              'Message Info',
              `Sent: ${sentAt}\n\nRead by (${readCount}):\n${readByNames}${moreReaders}`,
              [{ text: 'OK' }]
            );
          }
        }}
      />

      {/* Forward Message Modal */}
      <ForwardMessageModal
        message={selectedMessage}
        visible={showForwardModal}
        onClose={() => {
          setShowForwardModal(false);
          setSelectedMessage(null);
        }}
        onForward={handleForwardMessage}
        chats={forwardChats}
      />

      {/* Location Sharer */}
      <LocationSharer
        visible={showLocationSharer}
        onClose={() => setShowLocationSharer(false)}
        onShareLocation={handleShareLocation}
        onShareLiveLocation={handleShareLiveLocation}
      />

      {/* NEW: Full Emoji Picker for reactions */}
      <EmojiPickerSheet
        visible={showEmojiPicker}
        onClose={() => {
          setShowEmojiPicker(false);
          setReactionTargetMessage(null);
        }}
        onEmojiSelect={handleEmojiSelect}
      />

      {/* NEW: GIF Picker */}
      <GifPickerSheet
        visible={showGifPicker}
        onClose={() => setShowGifPicker(false)}
        onGifSelect={handleGifSelect}
      />

      {/* NEW: Media Gallery Viewer */}
      {showMediaGallery && mediaGalleryItems.length > 0 && (
        <MediaGalleryViewer
          media={mediaGalleryItems}
          initialIndex={mediaGalleryIndex}
          visible={showMediaGallery}
          onClose={() => setShowMediaGallery(false)}
        />
      )}

      {/* NEW: Read Receipt List */}
      {readReceiptMessage && (
        <ReadReceiptList
          visible={showReadReceiptList}
          onClose={() => {
            setShowReadReceiptList(false);
            setReadReceiptMessage(null);
          }}
          messageId={readReceiptMessage.id}
          readers={(readReceiptMessage.read_by || []).map((receipt) => ({
            id: receipt.member_id,
            name: receipt.member_name,
            read_at: receipt.read_at,
          }))}
          totalMembers={subgroup?.member_count || community?.member_count || 0}
          sentAt={readReceiptMessage.created_at}
          deliveredAt={readReceiptMessage.created_at}
        />
      )}

      {/* NEW: Disappearing Messages Settings */}
      <DisappearingMessagesSettings
        visible={showDisappearingSettings}
        onClose={() => setShowDisappearingSettings(false)}
        currentDuration={disappearingDuration}
        onDurationChange={(duration) => {
          setDisappearingDuration(duration);
          setShowDisappearingSettings(false);
        }}
        isAdmin={isLeader}
      />

      {/* Subgroup Menu Bottom Sheet */}
      <BottomSheet
        ref={menuSheetRef}
        index={showMenu ? 0 : -1}
        snapPoints={['35%']}
        enablePanDownToClose
        onClose={() => setShowMenu(false)}
        backdropComponent={(props) => (
          <BottomSheetBackdrop
            {...props}
            disappearsOnIndex={-1}
            appearsOnIndex={0}
            opacity={0.5}
            pressBehavior="close"
          />
        )}
        handleIndicatorStyle={{ backgroundColor: colors.gray[300] }}
        backgroundStyle={{ backgroundColor: colors.white }}
      >
        <VStack className="p-4" space="sm">
          <Text className="text-lg font-bold text-gray-900 px-2 mb-2">
            {subgroup?.name || 'Subgroup'} Options
          </Text>

          {/* Disappearing Messages */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMenu(false);
              setTimeout(() => setShowDisappearingSettings(true), 300);
            }}
            className="flex-row items-center px-2 py-3 rounded-lg active:bg-gray-100"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Disappearing messages settings"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: colors.warning[100] }}
            >
              <Icon as={Timer} size="md" style={{ color: colors.warning[600] }} />
            </View>
            <VStack className="flex-1">
              <Text className="text-base text-gray-900">Disappearing Messages</Text>
              <Text className="text-sm text-gray-500">
                {disappearingDuration === 'off' ? 'Off' : `Messages disappear after ${disappearingDuration}`}
              </Text>
            </VStack>
            {disappearingDuration !== 'off' && (
              <DisappearingIndicator duration={disappearingDuration} />
            )}
          </Pressable>

          {/* Subgroup Info */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMenu(false);
              // Navigate to subgroup info screen (if available)
              Alert.alert(
                subgroup?.name || 'Subgroup Info',
                `Members: ${subgroup?.member_count || 0}\nDescription: ${subgroup?.description || 'No description'}\n\nCreated within: ${community?.name || 'Unknown community'}`,
                [{ text: 'OK' }]
              );
            }}
            className="flex-row items-center px-2 py-3 rounded-lg active:bg-gray-100"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Subgroup info"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: colors.primary[100] }}
            >
              <Icon as={Info} size="md" style={{ color: colors.primary[600] }} />
            </View>
            <VStack className="flex-1">
              <Text className="text-base text-gray-900">Subgroup Info</Text>
              <Text className="text-sm text-gray-500">{subgroup?.member_count || 0} members</Text>
            </VStack>
          </Pressable>

          {/* Back to Main Chat */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMenu(false);
              router.replace(`/community/${communityId}/chat`);
            }}
            className="flex-row items-center px-2 py-3 rounded-lg active:bg-gray-100"
            accessible
            accessibilityRole="button"
            accessibilityLabel="Back to main chat"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{ backgroundColor: colors.secondary[100] }}
            >
              <Icon as={MessageSquare} size="md" style={{ color: colors.secondary[600] }} />
            </View>
            <VStack className="flex-1">
              <Text className="text-base text-gray-900">Back to Main Chat</Text>
              <Text className="text-sm text-gray-500">{community?.name || 'Community'}</Text>
            </VStack>
          </Pressable>
        </VStack>
      </BottomSheet>
    </SafeAreaView>
  );
}
