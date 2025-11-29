/**
 * Community Chat Screen - WhatsApp-Style Real-Time Messaging
 *
 * Features:
 * - Real-time messaging via MQTT
 * - Message list with infinite scroll
 * - Typing indicators
 * - Message status (sent, delivered, read)
 * - Reply to messages
 * - Reactions (long-press)
 * - Image/media preview with full-screen viewer
 * - Poll messages with voting
 * - Media upload with progress
 * - Header menu with navigation
 * - Skeleton loading
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
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
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
import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import {
  ArrowLeft,
  X,
  MoreVertical,
  Users,
  Info,
  Search,
  Settings,
  Megaphone,
  BarChart3,
  FileText,
  Video,
  Phone,
  Timer,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { AttachmentPicker, MediaAttachment } from '@/components/chat/AttachmentPicker';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

// Chat components
import { MediaPreview } from '@/components/chat/MediaPreview';
import { UploadProgress, UploadStatus } from '@/components/chat/UploadProgress';
import { VoiceNoteInput, VoiceNotePlayer } from '@/components/chat/VoiceNote';
import { WhatsAppText } from '@/components/chat/WhatsAppText';
import { LinkPreview } from '@/components/chat/LinkPreview';
import { MessageActionsSheet, ForwardMessageModal } from '@/components/chat/MessageActions';
import { LocationSharer, LocationPreview, LocationData, LiveLocationData } from '@/components/chat/LocationSharing';

// NEW: Enhanced WhatsApp-style components
import { EmojiPickerSheet } from '@/components/chat/EmojiPicker';
import { GifPickerSheet, GifButton, type GifItem } from '@/components/chat/GifPicker';
import { MediaGalleryViewer, type MediaItem } from '@/components/chat/MediaGallery';
import { ReadReceiptList } from '@/components/chat/ReadReceipts';
import {
  DisappearingMessagesSettings,
  DisappearingIndicator,
  type DisappearingDuration,
} from '@/components/chat/DisappearingMessages';

// Community components
import { PollCard, Poll } from '@/components/communities/PollCard';
import { CreatePollModal } from '@/components/communities/CreatePollModal';

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
  UnreadDivider,
  useScrollPosition,
  useMessageQueue,
  useMessageGrouping,
} from '@/components/chat/ChatOptimizations';

import {
  useCommunity,
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
import { useCallStore } from '@/stores/call';
import { CallType } from '@/types/call';
import { uploadMedia, UploadProgressCallback } from '@/services/mediaUpload';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import type { CommunityMessage } from '@/types/communities';

// =============================================================================
// TYPES
// =============================================================================

interface MessageBubbleProps {
  message: CommunityMessage;
  isOwnMessage: boolean;
  showSender: boolean;
  currentMemberId?: string;
  onLongPress?: () => void;
  onReply?: () => void;
  onReact?: (emoji: string) => void;
  onImagePress?: (uri: string) => void;
  onReplyPreviewPress?: (messageId: string) => void;
  onReadReceiptPress?: (message: CommunityMessage) => void;
}

// =============================================================================
// MESSAGE BUBBLE COMPONENT
// =============================================================================

// Custom comparison for MessageBubble to prevent unnecessary re-renders
const areMessagePropsEqual = (
  prevProps: MessageBubbleProps,
  nextProps: MessageBubbleProps
): boolean => {
  // Fast path: same message ID and same modification timestamp
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.updated_at !== nextProps.message.updated_at) return false;
  if (prevProps.isOwnMessage !== nextProps.isOwnMessage) return false;
  if (prevProps.showSender !== nextProps.showSender) return false;

  // Check reactions changed (shallow comparison)
  const prevReactions = JSON.stringify(prevProps.message.reactions || {});
  const nextReactions = JSON.stringify(nextProps.message.reactions || {});
  if (prevReactions !== nextReactions) return false;

  // Check read_by changed
  const prevReadCount = prevProps.message.read_by?.length || 0;
  const nextReadCount = nextProps.message.read_by?.length || 0;
  if (prevReadCount !== nextReadCount) return false;

  // Check poll votes changed
  if (prevProps.message.poll && nextProps.message.poll) {
    const prevPollVotes = prevProps.message.poll.total_votes;
    const nextPollVotes = nextProps.message.poll.total_votes;
    if (prevPollVotes !== nextPollVotes) return false;
  }

  return true;
};

const MessageBubble = React.memo(
  ({ message, isOwnMessage, showSender, currentMemberId, onLongPress, onReply: _onReply, onReact, onImagePress, onReplyPreviewPress, onReadReceiptPress }: MessageBubbleProps) => {
    const { t } = useTranslation();

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

    // Handle double-tap quick reaction (heart) - reserved for future gesture
    const handleDoubleTap = useCallback(() => {
      onReact?.('❤️');
    }, [onReact]);
    void handleDoubleTap;

    // Handle tap on reply preview to jump to original message
    const handleReplyPreviewTap = useCallback(() => {
      if (message.reply_to_message_id) {
        onReplyPreviewPress?.(message.reply_to_message_id);
      }
    }, [message.reply_to_message_id, onReplyPreviewPress]);

    // Deleted message
    if (message.is_deleted) {
      return (
        <View
          className={`my-1 px-4 ${isOwnMessage ? 'items-end' : 'items-start'}`}
        >
          <View
            className="px-4 py-2 rounded-2xl"
            style={{
              backgroundColor: isOwnMessage ? colors.gray[200] : colors.gray[100],
            }}
          >
            <Text className="text-gray-500 italic text-sm">
              {t('chat.messageDeleted', 'This message was deleted')}
            </Text>
          </View>
        </View>
      );
    }

    // Poll message - render PollCard
    if (message.message_type === 'poll' && message.poll) {
      return (
        <View className={`my-1 px-4 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {/* Sender name (for group messages) */}
          {showSender && !isOwnMessage && message.sender && (
            <Text className="text-xs text-gray-500 ml-2 mb-1">
              {message.sender.name}
            </Text>
          )}
          <View style={{ maxWidth: '85%', minWidth: 280 }}>
            <PollCard
              poll={message.poll as Poll}
              messageId={message.id}
              currentMemberId={currentMemberId}
              myVotes={message.poll.my_votes || []}
            />
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
      >
        <View
          style={{
            maxWidth: '80%',
          }}
        >
          {/* Sender name (for group messages) */}
          {showSender && !isOwnMessage && message.sender && (
            <Text className="text-xs text-gray-500 ml-2 mb-1">
              {message.sender.name}
            </Text>
          )}

          {/* Reply reference - tappable to jump to original */}
          {message.reply_to && (
            <Pressable
              onPress={handleReplyPreviewTap}
              className="px-3 py-2 mb-1 rounded-lg border-l-2 border-primary-400 active:opacity-70"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <Text className="text-xs text-primary-600 font-medium">
                {message.reply_to.sender_name}
              </Text>
              <Text className="text-xs text-gray-600" numberOfLines={1}>
                {message.reply_to.preview}
              </Text>
            </Pressable>
          )}

          {/* Message content - WhatsApp-exact colors */}
          <View
            className="px-4 py-2 rounded-2xl"
            style={{
              // WhatsApp colors: #DCF8C6 for outgoing (light green), #FFFFFF for incoming
              backgroundColor: isOwnMessage ? '#DCF8C6' : '#FFFFFF',
              borderBottomRightRadius: isOwnMessage ? 4 : borderRadius['2xl'],
              borderBottomLeftRadius: isOwnMessage ? borderRadius['2xl'] : 4,
              // Subtle shadow for WhatsApp depth effect
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.08,
              shadowRadius: 2,
              elevation: 1,
            }}
          >
            {/* Image message */}
            {message.message_type === 'image' && message.media?.url && (
              <Pressable
                onPress={() => onImagePress?.(message.media!.url)}
              >
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
                  placeholder={message.media.thumbnail_url}
                  placeholderContentFit="cover"
                />
              </Pressable>
            )}

            {/* Video message */}
            {message.message_type === 'video' && message.media?.url && (
              <Pressable
                onPress={() => onImagePress?.(message.media!.url)}
                className="relative"
              >
                <Image
                  source={{ uri: message.media.thumbnail_url || message.media.url }}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: borderRadius.lg,
                    marginBottom: message.text ? spacing.sm : 0,
                  }}
                  cachePolicy="memory-disk"
                  transition={200}
                  contentFit="cover"
                />
                <View
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: borderRadius.lg }}
                >
                  <View
                    className="w-12 h-12 rounded-full items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                  >
                    <Icon as={Video} size="md" className="text-gray-800" />
                  </View>
                </View>
              </Pressable>
            )}

            {/* Document message - WhatsApp style */}
            {message.message_type === 'document' && message.media && (
              <Pressable
                onPress={async () => {
                  if (message.media?.url) {
                    try {
                      const canOpen = await Linking.canOpenURL(message.media.url);
                      if (canOpen) {
                        await Linking.openURL(message.media.url);
                      } else {
                        Alert.alert(t('common.error', 'Error'), t('chat.cannotOpenDocument', 'Cannot open this document'));
                      }
                    } catch (error) {
                      Alert.alert(t('common.error', 'Error'), t('chat.failedToOpenDocument', 'Failed to open document'));
                    }
                  }
                }}
                className="flex-row items-center py-2"
              >
                <View
                  className="w-10 h-10 rounded-lg items-center justify-center mr-3"
                  style={{ backgroundColor: colors.gray[200] }}
                >
                  <Icon
                    as={FileText}
                    size="md"
                    style={{ color: colors.gray[600] }}
                  />
                </View>
                <VStack className="flex-1">
                  <Text className="font-medium text-gray-900" numberOfLines={1}>
                    {message.media.file_name || t('chat.document', 'Document')}
                  </Text>
                  <Text className="text-xs text-gray-500">
                    {message.media.file_size ? `${Math.round(message.media.file_size / 1024)} KB` : t('chat.file', 'File')}
                  </Text>
                </VStack>
              </Pressable>
            )}

            {/* Audio/Voice message - WhatsApp style */}
            {message.message_type === 'audio' && message.media?.url && (
              <VoiceNotePlayer
                uri={message.media.url}
                duration={message.media.duration || 0}
                isOwnMessage={isOwnMessage}
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

            {/* Time & status - WhatsApp style */}
            <HStack className="justify-end items-center mt-1">
              {message.is_edited && (
                <Text className="text-xs mr-1 text-gray-500">{t('chat.edited', 'edited')}</Text>
              )}
              <Text className="text-xs text-gray-500">
                {formatTime(message.created_at)}
              </Text>
              {isOwnMessage && onReadReceiptPress ? (
                <Pressable
                  onPress={() => onReadReceiptPress(message)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
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

          {/* Reactions */}
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
// TYPING INDICATOR COMPONENT
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
          <HStack space="xs" className="items-center">
            {/* Animated dots */}
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

function CommunityChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuthStore();
  const { initiateCall } = useCallStore();

  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommunityMessage | null>(null);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [pendingAttachment, setPendingAttachment] = useState<MediaAttachment | null>(null);

  // New state for enhanced features
  const [showMenu, setShowMenu] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  // Connection status for future connection banner feature
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  void setConnectionStatus;

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

  // Track unread messages - the first unread message ID when chat opens
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const initialLoadRef = useRef(true);

  const inputRef = useRef<TextInput>(null);
  const listRef = useRef<any>(null); // FlashList ref with complex generic
  const menuSheetRef = useRef<BottomSheet>(null);
  const menuSnapPoints = useMemo(() => ['55%'], []);

  // Scroll position tracking for FAB
  const {
    isAtBottom,
    newMessageCount,
    handleScroll,
    incrementNewMessages: _incrementNewMessages,
    resetNewMessages,
  } = useScrollPosition();

  // Message queue for offline reliability (reserved for future offline support)
  const messageQueue = useMessageQueue();
  void messageQueue;

  // Typing indicator state
  const lastTypingRef = useRef<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch community details
  const { data: community, isLoading: isLoadingCommunity } = useCommunity(id);

  // Fetch messages with infinite scroll
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityMessages(id, 'general');

  // Fetch starred messages for this community
  const { data: starredMessagesData } = useStarredMessages(id);

  // Fetch user's communities for forwarding messages
  const { data: myCommunities } = useMyCommunities();

  // Transform communities for forward modal (exclude current community)
  const forwardChats = useMemo(() => {
    if (!myCommunities) return [];
    return myCommunities
      .filter((c) => c.id !== id)
      .map((c) => ({
        id: c.id,
        name: c.name,
        avatar: c.cover_image || c.avatar_url,
      }));
  }, [myCommunities, id]);

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
    if (id) {
      setCurrentRoute(`/community/${id}/chat`, { communityId: id });
    }
    return () => {
      setCurrentRoute('', {});
    };
  }, [id, setCurrentRoute]);

  // Mutations
  const sendMessageMutation = useSendMessage();
  const sendMediaMutation = useSendMediaMessage();
  const markAsReadMutation = useMarkAsRead();
  const reactToMessageMutation = useReactToMessage();
  const deleteMessageMutation = useDeleteMessage();
  const editMessageMutation = useEditMessage();
  const forwardMessageMutation = useForwardMessage();
  const starMessageMutation = useStarMessage();

  // Check user permissions
  const isLeader = community?.my_role === 'admin' || community?.my_role === 'leader';

  // MQTT subscription
  const { sendTyping, typingUsers: _typingUsers } = useCommunitySubscription(id, 'general');
  const typingIndicatorText = useTypingIndicator(id);

  // Flatten messages from all pages
  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  // Group messages by date for date headers
  const groupedMessages = useMessageGrouping(messages);

  // Map message IDs to their indices for scroll-to-message
  const messageIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    groupedMessages.forEach((item, index) => {
      if (item && !item.type && item.id) {
        map.set(item.id, index);
      }
    });
    return map;
  }, [groupedMessages]);

  // Handle scroll to a specific message (for reply preview tap)
  const scrollToMessage = useCallback((messageId: string) => {
    const index = messageIndexMap.get(messageId);
    if (index !== undefined && listRef.current) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      listRef.current.scrollToIndex({
        index,
        animated: true,
        viewPosition: 0.5, // Center the message
      });
    }
  }, [messageIndexMap]);

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
      communityId: id,
      channelType: 'general',
    });
  }, [member, reactToMessageMutation, messages, id]);

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
        sender_name: m.sender?.name || 'Unknown',
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
    } else {
      // Fallback: single image preview
      setPreviewImage(uri);
    }
  }, [allMediaItems]);

  // Handle full emoji picker selection for reactions
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
        communityId: id,
        channelType: 'general',
        message: {
          message_type: 'text',
          text: gif.url, // Send GIF URL as message text
        },
      });
    } catch (error) {
      Alert.alert(t('common.error', 'Error'), t('chat.failedToSendGif', 'Failed to send GIF'));
    }
  }, [member, id, sendMessageMutation]);

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
      Alert.alert(t('common.error', 'Error'), t('chat.couldNotEditMessage', 'Could not edit message. Please try again.'));
    }
  }, [selectedMessage, editMessageMutation]);

  // Check if message can be edited (within 15 minutes)
  const canEditMessage = useCallback((message: CommunityMessage): boolean => {
    if (!message || !member) return false;
    if (message.sender?.id !== member.id) return false;
    if (message.message_type !== 'text') return false;
    if (message.is_deleted) return false;

    const createdAt = new Date(message.created_at).getTime();
    const now = Date.now();
    const fifteenMinutes = 15 * 60 * 1000;
    return (now - createdAt) < fifteenMinutes;
  }, [member]);

  // Detect unread messages on initial load
  useEffect(() => {
    if (initialLoadRef.current && messages.length > 0 && member) {
      initialLoadRef.current = false;

      // Find the first unread message (oldest unread that's not from current user)
      // Messages are in reverse chronological order (newest first)
      let unreadCount = 0;
      let firstUnreadId: string | null = null;

      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        const isOwnMessage = msg.sender?.id === member.id;
        const isRead = msg.read_by?.some((r) => r.member_id === member.id);

        if (!isOwnMessage && !isRead) {
          unreadCount++;
          if (!firstUnreadId) {
            firstUnreadId = msg.id;
          }
        }
      }

      if (firstUnreadId && unreadCount > 0) {
        setFirstUnreadMessageId(firstUnreadId);
      }
    }
  }, [messages, member]);

  // Handle typing indicator
  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      sendTyping(true);
      lastTypingRef.current = now;
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set timeout to stop typing
    typingTimeoutRef.current = setTimeout(() => {
      sendTyping(false);
    }, 3000);
  }, [sendTyping]);

  // Scroll to bottom handler
  const handleScrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    resetNewMessages();
  }, [resetNewMessages]);

  // Menu backdrop renderer
  const renderMenuBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Handle send message
  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !member) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const messageText = inputText.trim();
    setInputText('');
    setReplyingTo(null);

    // Stop typing indicator
    sendTyping(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    try {
      await sendMessageMutation.mutateAsync({
        communityId: id,
        channelType: 'general',
        message: {
          message_type: 'text',
          text: messageText,
          reply_to_message_id: replyingTo?.id,
        },
      });
    } catch (error) {
      Alert.alert(t('common.error'), t('communities.sendError'));
      setInputText(messageText); // Restore text on error
    }
  }, [inputText, id, member, replyingTo, sendMessageMutation, sendTyping, t]);

  // Handle message long press - open WhatsApp-style action sheet
  const handleMessageLongPress = useCallback((message: CommunityMessage) => {
    setSelectedMessage(message);
    setShowActionsSheet(true);
  }, []);

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
          newSet.add(messageId); // Restore star
        } else {
          newSet.delete(messageId); // Remove star
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
      Alert.alert(t('common.error', 'Error'), t('chat.couldNotDeleteMessage', 'Could not delete message. Please try again.'));
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
      Alert.alert(t('common.success', 'Success'), t('chat.messageForwardedTo', 'Message forwarded to {{count}} chat(s)', { count: result.forwarded_count }));
    } catch (error) {
      console.error('[ForwardMessage] Failed:', error);
      Alert.alert(t('common.error', 'Error'), t('chat.couldNotForwardMessage', 'Could not forward message. Please try again.'));
    }
  }, [selectedMessage, forwardMessageMutation]);

  // Handle voice call initiation
  const handleVoiceCall = useCallback(async () => {
    if (!community || !member) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Initiate call: empty callee_ids means group/community call
      await initiateCall([], CallType.VOICE, id);
      // Navigate to call screen
      router.push(`/call/${id}` as any);
    } catch (error) {
      console.error('[VoiceCall] Failed:', error);
      Alert.alert(t('common.error', 'Error'), t('chat.couldNotStartVoiceCall', 'Could not start voice call. Please try again.'));
    }
  }, [community, member, id, initiateCall, router, t]);

  // Handle video call initiation
  const handleVideoCall = useCallback(async () => {
    if (!community || !member) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Initiate call: empty callee_ids means group/community call
      await initiateCall([], CallType.VIDEO, id);
      // Navigate to call screen
      router.push(`/call/${id}` as any);
    } catch (error) {
      console.error('[VideoCall] Failed:', error);
      Alert.alert(t('common.error', 'Error'), t('chat.couldNotStartVideoCall', 'Could not start video call. Please try again.'));
    }
  }, [community, member, id, initiateCall, router, t]);

  // Handle location sharing
  const handleShareLocation = useCallback(async (location: LocationData) => {
    if (!member) return;

    // Send location as a message
    try {
      await sendMessageMutation.mutateAsync({
        communityId: id,
        channelType: 'general',
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
      Alert.alert(t('common.error', 'Error'), t('chat.failedToShareLocation', 'Failed to share location'));
    }
  }, [id, member, sendMessageMutation, t]);

  // Handle live location sharing
  const handleShareLiveLocation = useCallback(async (location: LiveLocationData) => {
    if (!member) return;

    try {
      await sendMessageMutation.mutateAsync({
        communityId: id,
        channelType: 'general',
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
      Alert.alert(t('common.error', 'Error'), t('chat.failedToShareLiveLocation', 'Failed to share live location'));
    }
  }, [id, member, sendMessageMutation, t]);

  // Mark messages as read
  useEffect(() => {
    if (messages.length > 0 && member) {
      // Mark the latest unread message as read
      const latestMessage = messages[0];
      if (
        latestMessage &&
        latestMessage.sender?.id !== member.id &&
        !latestMessage.read_by?.some((r) => r.member_id === member.id)
      ) {
        markAsReadMutation.mutate(latestMessage.id);
      }
    }
  }, [messages, member]);

  // Cleanup typing timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
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
        id,
        attachment,
        progressCallback
      );

      // Send the media message
      await sendMediaMutation.mutateAsync({
        communityId: id,
        channelType: 'general',
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

      // Clear status after a delay
      setTimeout(() => {
        setUploadStatus(null);
        setPendingAttachment(null);
      }, 1500);
    } catch (error) {
      setUploadStatus('error');
      Alert.alert(t('chat.uploadFailed', 'Upload Failed'), t('chat.couldNotUploadMedia', 'Could not upload media. Please try again.'));
    }
  }, [id, member, inputText, sendMediaMutation]);

  // Handle voice note upload
  const handleVoiceUpload = useCallback(async (uri: string, duration: number) => {
    if (!member) return;

    setUploadStatus('uploading');
    setUploadProgress(0);

    // Create voice attachment object
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
        id,
        voiceAttachment,
        progressCallback
      );

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Send the audio message
      await sendMediaMutation.mutateAsync({
        communityId: id,
        channelType: 'general',
        messageType: 'audio',
        media: {
          seaweedfs_fid: result.fid || result.media?.seaweedfs_fid || '',
          mime_type: voiceAttachment.mimeType,
          file_name: voiceAttachment.fileName,
          file_size: 0, // Will be set by backend
          duration: duration,
        },
      });

      setUploadStatus('success');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Clear status after a delay
      setTimeout(() => {
        setUploadStatus(null);
        setPendingAttachment(null);
      }, 1500);
    } catch (error) {
      console.error('[VoiceUpload] Failed:', error);
      setUploadStatus('error');
      Alert.alert(t('chat.uploadFailed', 'Upload Failed'), t('chat.couldNotSendVoiceMessage', 'Could not send voice message. Please try again.'));
    }
  }, [id, member, sendMediaMutation]);

  // Calculate unread count for the divider
  const unreadCount = useMemo(() => {
    if (!firstUnreadMessageId || !member) return 0;
    let count = 0;
    for (const msg of messages) {
      const isOwnMessage = msg.sender?.id === member.id;
      const isRead = msg.read_by?.some((r) => r.member_id === member.id);
      if (!isOwnMessage && !isRead) {
        count++;
      }
    }
    return count;
  }, [messages, member, firstUnreadMessageId]);

  // Render message item with WhatsApp-style gestures
  const renderMessage = useCallback(
    ({ item, index }: { item: CommunityMessage | { type: 'date_header'; date: string }; index: number }) => {
      // Render date header
      if (item && 'type' in item && item.type === 'date_header') {
        return <DateHeader date={item.date} />;
      }

      const message = item as CommunityMessage;
      const isOwnMessage = message.sender?.id === member?.id;

      // Find previous message (skip date headers) for sender grouping
      let prevMessage: CommunityMessage | null = null;
      for (let i = index + 1; i < groupedMessages.length; i++) {
        const prev = groupedMessages[i];
        if (prev && !('type' in prev)) {
          prevMessage = prev;
          break;
        }
      }

      const showSender =
        !isOwnMessage &&
        (!prevMessage || prevMessage.sender?.id !== message.sender?.id);

      // Check if this is the first unread message
      const showUnreadDivider = message.id === firstUnreadMessageId && unreadCount > 0;

      return (
        <Animated.View entering={PMotionV10.cardStagger(index, 400)}>
          {/* Unread messages divider - shown above the first unread message */}
          {showUnreadDivider && <UnreadDivider count={unreadCount} />}

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
                currentMemberId={member?.id}
                onLongPress={() => handleMessageLongPress(message)}
                onReply={() => setReplyingTo(message)}
                onReact={(emoji) => handleReaction(message.id, emoji)}
                onImagePress={handleOpenMediaGallery}
                onReplyPreviewPress={scrollToMessage}
                onReadReceiptPress={(msg) => {
                  setReadReceiptMessage(msg);
                  setShowReadReceiptList(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
              />
            </DoubleTapReaction>
          </SwipeToReplyWrapper>
        </Animated.View>
      );
    },
    [member?.id, groupedMessages, handleMessageLongPress, handleReaction, handleOpenMediaGallery, scrollToMessage, firstUnreadMessageId, unreadCount]
  );

  // Loading state
  if (isLoadingCommunity || (isLoadingMessages && messages.length === 0)) {
    return (
      <SafeAreaView className="flex-1 bg-white" edges={['top']}>
        {/* Header skeleton */}
        <HStack className="px-4 py-3 border-b border-gray-100 items-center" space="md">
          <Skeleton className="w-10 h-10 rounded-full" isLoaded={false} />
          <VStack className="flex-1">
            <Skeleton className="h-5 w-32" isLoaded={false} />
            <Skeleton className="h-3 w-20 mt-1" isLoaded={false} />
          </VStack>
        </HStack>

        {/* Messages skeleton */}
        <VStack className="flex-1 p-4" space="md">
          {[1, 2, 3, 4, 5].map((i) => (
            <View
              key={i}
              className={`${i % 2 === 0 ? 'items-end' : 'items-start'}`}
            >
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
      {/* Header - WhatsApp teal color (#075E54 or #128C7E) */}
      <Animated.View
        entering={PMotionV10.subtleSlide('right')}
        exiting={PMotionV10.screenFadeOut}
        style={{
          backgroundColor: '#075E54',
          ...shadows.sm,
        }}
      >
        <HStack className="px-4 py-3 items-center" space="md">
          {/* Back button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="active:opacity-70"
          >
            <Icon as={ArrowLeft} size="lg" style={{ color: '#FFFFFF' }} />
          </Pressable>

          {/* Community avatar */}
          <Avatar size="md" className="bg-gray-300">
            {community?.cover_image ? (
              <AvatarImage source={{ uri: community.cover_image }} />
            ) : (
              <AvatarFallbackText className="text-gray-600">
                {community?.name?.substring(0, 2).toUpperCase() || '??'}
              </AvatarFallbackText>
            )}
          </Avatar>

          {/* Community info */}
          <Pressable
            className="flex-1 active:opacity-70"
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/community/${id}/info` as any);
            }}
          >
            <Text className="font-bold text-base" style={{ color: '#FFFFFF' }} numberOfLines={1}>
              {community?.name || 'Community'}
            </Text>
            {typingIndicatorText ? (
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Text className="text-xs italic" style={{ color: '#25D366' }}>
                  {typingIndicatorText}
                </Text>
              </HStack>
            ) : (
              <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.8)' }}>
                {t('chat.memberCount', '{{count}} members', { count: community?.member_count || 0 })}
              </Text>
            )}
          </Pressable>

          {/* Voice call button */}
          <Pressable
            onPress={handleVoiceCall}
            className="active:opacity-70 p-2"
          >
            <Icon as={Phone} size="md" style={{ color: '#FFFFFF' }} />
          </Pressable>

          {/* Video call button */}
          <Pressable
            onPress={handleVideoCall}
            className="active:opacity-70 p-2"
          >
            <Icon as={Video} size="md" style={{ color: '#FFFFFF' }} />
          </Pressable>

          {/* Search button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/community/${id}/search` as any);
            }}
            className="active:opacity-70 p-2"
          >
            <Icon as={Search} size="md" style={{ color: '#FFFFFF' }} />
          </Pressable>

          {/* Menu button */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowMenu(true);
            }}
            className="active:opacity-70 p-2"
          >
            <Icon as={MoreVertical} size="md" style={{ color: '#FFFFFF' }} />
          </Pressable>
        </HStack>
      </Animated.View>

      {/* Connection Status Banner */}
      <ConnectionBanner status={connectionStatus} />

      {/* Messages list */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <Animated.View entering={PMotionV10.screenFadeIn} style={{ flex: 1 }}>
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
            drawDistance={800} // Increased for smoother scrolling at high refresh rates
            estimatedListSize={{ height: 800, width: 400 }}
            overrideItemLayout={(layout: { size: number }, item: CommunityMessage | { type: 'date_header'; date: string }) => {
              // Date header
              if (item && 'type' in item && item.type === 'date_header') {
                layout.size = 48;
                return;
              }

              const msg = item as CommunityMessage;
              // Estimate item height for better virtualization
              if (msg.is_deleted) layout.size = 50;
              else if (msg.message_type === 'poll') layout.size = 300;
              else if (msg.message_type === 'image' || msg.message_type === 'video') {
                layout.size = 260 + (msg.text ? 40 : 0);
              } else if (msg.message_type === 'document') layout.size = 100;
              else if (msg.message_type === 'audio') layout.size = 80;
              else {
                const textLength = msg.text?.length || 0;
                const lines = Math.ceil(textLength / 38);
                layout.size = 60 + lines * 22 + (msg.reply_to ? 55 : 0);
              }
            }}
            contentContainerStyle={{
              paddingVertical: spacing.md,
            }}
            onEndReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.3}
            onScroll={handleScroll}
            // Lower scrollEventThrottle for smoother 120Hz tracking (8ms = ~120fps)
            scrollEventThrottle={8}
            ListFooterComponent={
              isFetchingNextPage ? (
                <View className="py-4 items-center">
                  <ActivityIndicator color={colors.primary[500]} />
                </View>
              ) : null
            }
            ListHeaderComponent={
              <TypingIndicator text={typingIndicatorText} />
            }
            // Extra optimizations for smooth scrolling at high refresh rates
            maintainVisibleContentPosition={{
              minIndexForVisible: 1,
              autoscrollToTopThreshold: 10,
            }}
            // Reduce re-renders during fast scrolling
            removeClippedSubviews={Platform.OS === 'android'}
          />

          {/* Scroll to Bottom FAB */}
          <ScrollToBottomFAB
            visible={!isAtBottom}
            newMessageCount={newMessageCount}
            onPress={handleScrollToBottom}
          />
        </Animated.View>

        {/* Reply preview */}
        {replyingTo && (
          <View
            className="bg-white border-t border-gray-100 px-4 py-3"
            style={shadows.sm}
          >
            <HStack className="items-center" space="md">
              <View className="flex-1 pl-3 border-l-2 border-primary-500">
                <Text className="text-primary-600 font-medium text-sm">
                  {replyingTo.sender?.name || 'Unknown'}
                </Text>
                <Text className="text-gray-600 text-sm" numberOfLines={1}>
                  {replyingTo.text || 'Media'}
                </Text>
              </View>
              <Pressable
                onPress={() => setReplyingTo(null)}
                className="p-2 active:opacity-70"
              >
                <Icon as={X} size="sm" className="text-gray-500" />
              </Pressable>
            </HStack>
          </View>
        )}

        {/* Input bar */}
        <View
          className="bg-white border-t border-gray-100 px-4 py-3"
          style={shadows.md}
        >
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
                placeholder={t('communities.typeMessage', 'Type a message...')}
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

        {/* Safe area bottom padding */}
        <SafeAreaView edges={['bottom']} className="bg-white" />
      </KeyboardAvoidingView>

      {/* Attachment Picker */}
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

      {/* Create Poll Modal */}
      <CreatePollModal
        visible={showPollModal}
        communityId={id}
        channelType="general"
        onClose={() => setShowPollModal(false)}
        onCreated={() => {
          setShowPollModal(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }}
      />

      {/* Image Preview Modal */}
      {previewImage && (
        <MediaPreview
          uri={previewImage}
          type="image"
          visible={!!previewImage}
          onClose={() => setPreviewImage(null)}
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
        isOwnMessage={selectedMessage?.sender?.id === member?.id}
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
        onCopy={() => {
          // Copy handled internally by MessageActionsSheet
        }}
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
            const readByNames = selectedMessage.read_by?.slice(0, 5).map(r => r.member_name).join(', ') || t('chat.noOneYet', 'No one yet');
            const moreReaders = readCount > 5 ? `\n+${readCount - 5} ${t('chat.more', 'more')}` : '';

            Alert.alert(
              t('chat.messageInfo', 'Message Info'),
              `${t('chat.sent', 'Sent')}: ${sentAt}\n\n${t('chat.readBy', 'Read by')} (${readCount}):\n${readByNames}${moreReaders}`,
              [{ text: t('common.ok', 'OK') }]
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

      {/* Menu Bottom Sheet (replaces laggy Modal) */}
      <BottomSheet
        ref={menuSheetRef}
        index={showMenu ? 0 : -1}
        snapPoints={menuSnapPoints}
        enablePanDownToClose
        enableDynamicSizing={false}
        onClose={() => setShowMenu(false)}
        backdropComponent={renderMenuBackdrop}
        handleIndicatorStyle={{ backgroundColor: colors.gray[300] }}
      >
        <View className="flex-1 px-4 pt-2">
          {/* Announcements */}
          <Pressable
            onPress={() => {
              setShowMenu(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/community/${id}/announcements` as any);
            }}
            className="flex-row items-center px-4 py-4 rounded-xl active:bg-gray-50"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: colors.warning[100] }}
            >
              <Icon as={Megaphone} size="md" style={{ color: colors.warning[500] }} />
            </View>
            <VStack className="flex-1">
              <Text className="text-gray-900 font-medium">{t('chat.menu.announcements', 'Announcements')}</Text>
              <Text className="text-gray-500 text-xs">{t('chat.menu.announcementsDesc', 'Important updates from leaders')}</Text>
            </VStack>
          </Pressable>

          {/* Sub-groups */}
          <Pressable
            onPress={() => {
              setShowMenu(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/community/${id}/subgroups` as any);
            }}
            className="flex-row items-center px-4 py-4 rounded-xl active:bg-gray-50"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: colors.secondary[100] }}
            >
              <Icon as={Users} size="md" style={{ color: colors.secondary[500] }} />
            </View>
            <VStack className="flex-1">
              <Text className="text-gray-900 font-medium">{t('chat.menu.subgroups', 'Sub-groups')}</Text>
              <Text className="text-gray-500 text-xs">{t('chat.menu.subgroupsDesc', 'Smaller groups within community')}</Text>
            </VStack>
          </Pressable>

          {/* Create Poll */}
          <Pressable
            onPress={() => {
              setShowMenu(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowPollModal(true);
            }}
            className="flex-row items-center px-4 py-4 rounded-xl active:bg-gray-50"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: colors.info[100] }}
            >
              <Icon as={BarChart3} size="md" style={{ color: colors.info[500] }} />
            </View>
            <VStack className="flex-1">
              <Text className="text-gray-900 font-medium">{t('chat.menu.createPoll', 'Create Poll')}</Text>
              <Text className="text-gray-500 text-xs">{t('chat.menu.createPollDesc', 'Ask the community a question')}</Text>
            </VStack>
          </Pressable>

          {/* Community Info */}
          <Pressable
            onPress={() => {
              setShowMenu(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/community/${id}/info` as any);
            }}
            className="flex-row items-center px-4 py-4 rounded-xl active:bg-gray-50"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: colors.gray[100] }}
            >
              <Icon as={Info} size="md" style={{ color: colors.gray[500] }} />
            </View>
            <VStack className="flex-1">
              <Text className="text-gray-900 font-medium">{t('chat.menu.communityInfo', 'Community Info')}</Text>
              <Text className="text-gray-500 text-xs">{t('chat.menu.communityInfoDesc', 'Members, description, media')}</Text>
            </VStack>
          </Pressable>

          {/* Disappearing Messages */}
          <Pressable
            onPress={() => {
              setShowMenu(false);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setShowDisappearingSettings(true);
            }}
            className="flex-row items-center px-4 py-4 rounded-xl active:bg-gray-50"
          >
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-4"
              style={{ backgroundColor: colors.success[100] }}
            >
              <Icon as={Timer} size="md" style={{ color: colors.success[500] }} />
            </View>
            <VStack className="flex-1">
              <Text className="text-gray-900 font-medium">{t('chat.menu.disappearingMessages', 'Disappearing Messages')}</Text>
              <Text className="text-gray-500 text-xs">
                {disappearingDuration === 'off' ? t('chat.menu.off', 'Off') : t('chat.menu.messagesDisappearAfter', 'Messages disappear after {{duration}}', { duration: disappearingDuration })}
              </Text>
            </VStack>
            {disappearingDuration !== 'off' && (
              <DisappearingIndicator duration={disappearingDuration} size="sm" />
            )}
          </Pressable>

          {/* Settings (Leaders only) */}
          {isLeader && (
            <Pressable
              onPress={() => {
                setShowMenu(false);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/community/${id}/settings` as any);
              }}
              className="flex-row items-center px-4 py-4 rounded-xl active:bg-gray-50"
            >
              <View
                className="w-10 h-10 rounded-full items-center justify-center mr-4"
                style={{ backgroundColor: colors.primary[100] }}
              >
                <Icon as={Settings} size="md" style={{ color: colors.primary[500] }} />
              </View>
              <VStack className="flex-1">
                <Text className="text-gray-900 font-medium">{t('chat.menu.settings', 'Settings')}</Text>
                <Text className="text-gray-500 text-xs">{t('chat.menu.settingsDesc', 'Manage community settings')}</Text>
              </VStack>
            </Pressable>
          )}
        </View>
      </BottomSheet>

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
          totalMembers={community?.member_count || 0}
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
          // TODO: Save to backend
        }}
        isAdmin={isLeader}
      />
    </SafeAreaView>
  );
}

// Apply Premium Motion V10 Ultra HOC for production-grade transitions
export default withPremiumMotionV10(CommunityChatScreen);
