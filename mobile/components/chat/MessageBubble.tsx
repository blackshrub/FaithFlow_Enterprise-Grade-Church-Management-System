/**
 * MessageBubble - World-Class Chat Message Component
 *
 * Production-ready message bubble with attention to:
 * - Typography: Optimal font sizes for readability (16pt body, 11pt meta)
 * - Spacing: Comfortable padding and margins (12pt vertical, 14pt horizontal)
 * - Visual hierarchy: Clear distinction between content types
 * - Accessibility: Proper touch targets, color contrast
 * - Performance: Memoized with custom comparison
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 */

import React, { useCallback } from 'react';
import { View, Text, Pressable, Alert, Linking, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { FileText, Play, Download } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';

import { WhatsAppText } from './WhatsAppText';
import { LinkPreview } from './LinkPreview';
import { VoiceNotePlayer } from './VoiceNote';
import { LocationPreview } from './LocationSharing';
import { MessageStatusIndicator } from './ChatOptimizations';
import { PollCard, Poll } from '@/components/communities/PollCard';

import type { CommunityMessage } from '@/types/communities';
import { communityColors, colors } from '@/constants/theme';

// =============================================================================
// DESIGN TOKENS - Chat-specific semantic aliases to communityColors
// =============================================================================

const CHAT_COLORS = {
  // Bubble backgrounds
  outgoing: communityColors.bubble.outgoing,
  incoming: communityColors.bubble.incoming,

  // Text colors
  textPrimary: communityColors.text.primary,
  textSecondary: communityColors.text.secondary,
  textMeta: communityColors.text.tertiary,
  textSenderName: communityColors.text.senderName,

  // Status colors
  statusRead: communityColors.status.read,

  // UI elements
  replyBorder: communityColors.text.senderName,
  replyBackground: 'rgba(6, 207, 156, 0.08)',
  deletedBackground: communityColors.background.surface,
  reactionBadge: colors.white,
  reactionBadgeBorder: communityColors.border,

  // Media
  overlay: 'rgba(0, 0, 0, 0.4)',
  playButton: 'rgba(255, 255, 255, 0.95)',
  documentBg: communityColors.background.surface,
};

// Bubble dimensions
const BUBBLE = {
  maxWidth: '82%',
  borderRadius: 18,
  tailRadius: 4,
  paddingHorizontal: 14,
  paddingVertical: 10,
};

// Media dimensions
const MEDIA = {
  maxWidth: 280,
  maxHeight: 280,
  borderRadius: 12,
};

// =============================================================================
// TYPES
// =============================================================================

export interface MessageBubbleProps {
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
// COMPARISON FUNCTION FOR MEMO
// =============================================================================

export const areMessagePropsEqual = (
  prevProps: MessageBubbleProps,
  nextProps: MessageBubbleProps
): boolean => {
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.updated_at !== nextProps.message.updated_at) return false;
  if (prevProps.isOwnMessage !== nextProps.isOwnMessage) return false;
  if (prevProps.showSender !== nextProps.showSender) return false;

  // Check reactions
  const prevReactions = JSON.stringify(prevProps.message.reactions || {});
  const nextReactions = JSON.stringify(nextProps.message.reactions || {});
  if (prevReactions !== nextReactions) return false;

  // Check read_by count
  const prevReadCount = prevProps.message.read_by?.length || 0;
  const nextReadCount = nextProps.message.read_by?.length || 0;
  if (prevReadCount !== nextReadCount) return false;

  // Check poll votes
  if (prevProps.message.poll && nextProps.message.poll) {
    if (prevProps.message.poll.total_votes !== nextProps.message.poll.total_votes) return false;
  }

  return true;
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const formatTime = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// =============================================================================
// MESSAGE BUBBLE COMPONENT
// =============================================================================

export const MessageBubble = React.memo(
  ({
    message,
    isOwnMessage,
    showSender,
    currentMemberId,
    onLongPress,
    onReply: _onReply,
    onReact,
    onImagePress,
    onReplyPreviewPress,
    onReadReceiptPress,
  }: MessageBubbleProps) => {
    const { t } = useTranslation();

    // Message status
    const getMessageStatus = (): 'sending' | 'sent' | 'delivered' | 'read' | 'failed' => {
      if (message.is_optimistic) return 'sending';
      if (message.send_failed) return 'failed';
      if ((message.read_by?.length || 0) > 0) return 'read';
      if ((message.delivered_to?.length ?? 0) > 0) return 'delivered';
      return 'sent';
    };

    // Double-tap for quick reaction
    const handleDoubleTap = useCallback(() => {
      onReact?.('❤️');
    }, [onReact]);
    void handleDoubleTap;

    // Jump to replied message
    const handleReplyPreviewTap = useCallback(() => {
      if (message.reply_to_message_id) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onReplyPreviewPress?.(message.reply_to_message_id);
      }
    }, [message.reply_to_message_id, onReplyPreviewPress]);

    // Deleted message
    if (message.is_deleted) {
      return (
        <View className={`my-0.5 px-3 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          <View
            className={`px-3.5 py-2.5 rounded-[18px] border border-gray-200 ${isOwnMessage ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}
            style={{ backgroundColor: CHAT_COLORS.deletedBackground }}
          >
            <Text className="text-[15px] italic" style={{ color: CHAT_COLORS.textSecondary }}>
              {isOwnMessage
                ? t('chat.youDeletedMessage', 'You deleted this message')
                : t('chat.messageDeleted', 'This message was deleted')}
            </Text>
          </View>
        </View>
      );
    }

    // Poll message
    if (message.message_type === 'poll' && message.poll) {
      return (
        <View className={`my-0.5 px-3 ${isOwnMessage ? 'items-end' : 'items-start'}`}>
          {showSender && !isOwnMessage && message.sender && (
            <Text className="text-[13px] font-semibold tracking-wide ml-2 mb-1" style={{ color: CHAT_COLORS.textSenderName }}>
              {message.sender.name}
            </Text>
          )}
          <View className="max-w-[90%] min-w-[280px]">
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
        delayLongPress={400}
        className={`my-0.5 px-3 ${isOwnMessage ? 'items-end' : 'items-start'}`}
      >
        <View className="max-w-[82%]">
          {/* Sender name for group chats */}
          {showSender && !isOwnMessage && message.sender && (
            <Text className="text-[13px] font-semibold tracking-wide ml-2 mb-1" style={{ color: CHAT_COLORS.textSenderName }}>
              {message.sender.name}
            </Text>
          )}

          {/* Reply reference */}
          {message.reply_to && (
            <Pressable
              onPress={handleReplyPreviewTap}
              className={`flex-row rounded-lg mb-1 overflow-hidden ${isOwnMessage ? 'bg-black/5' : ''}`}
              style={!isOwnMessage ? { backgroundColor: CHAT_COLORS.replyBackground } : undefined}
            >
              <View className="w-1" style={{ backgroundColor: CHAT_COLORS.replyBorder }} />
              <View className="flex-1 py-2 px-3">
                <Text className="text-[13px] font-semibold mb-0.5" style={{ color: CHAT_COLORS.replyBorder }}>
                  {message.reply_to.sender_name}
                </Text>
                <Text className="text-[13px] leading-[17px]" style={{ color: CHAT_COLORS.textSecondary }} numberOfLines={1}>
                  {message.reply_to.preview}
                </Text>
              </View>
            </Pressable>
          )}

          {/* Message bubble */}
          <View
            className={`px-3.5 py-2.5 rounded-[18px] ${isOwnMessage ? 'rounded-br-[4px]' : 'rounded-bl-[4px]'}`}
            style={[
              { backgroundColor: isOwnMessage ? CHAT_COLORS.outgoing : CHAT_COLORS.incoming },
              Platform.select({
                ios: {
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.06,
                  shadowRadius: 2,
                },
                android: { elevation: 1 },
              }),
            ]}
          >
            {/* Image message */}
            {message.message_type === 'image' && message.media?.url && (
              <Pressable
                onPress={() => onImagePress?.(message.media!.url)}
                className="mb-1 rounded-xl overflow-hidden"
              >
                <Image
                  source={{ uri: message.media.url }}
                  className={`rounded-xl ${message.text ? 'mb-2' : ''}`}
                  style={{ width: MEDIA.maxWidth, height: MEDIA.maxHeight }}
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
                className="mb-1 rounded-xl overflow-hidden"
              >
                <Image
                  source={{ uri: message.media.thumbnail_url || message.media.url }}
                  className={`rounded-xl ${message.text ? 'mb-2' : ''}`}
                  style={{ width: MEDIA.maxWidth, height: MEDIA.maxHeight }}
                  cachePolicy="memory-disk"
                  transition={200}
                  contentFit="cover"
                />
                <View
                  className="absolute inset-0 items-center justify-center rounded-xl"
                  style={{ backgroundColor: CHAT_COLORS.overlay }}
                >
                  <View
                    className="w-14 h-14 rounded-full items-center justify-center"
                    style={{ backgroundColor: CHAT_COLORS.playButton }}
                  >
                    <Play size={24} color={CHAT_COLORS.textPrimary} style={{ marginLeft: 4 }} />
                  </View>
                </View>
              </Pressable>
            )}

            {/* Document message */}
            {message.message_type === 'document' && message.media && (
              <Pressable
                onPress={async () => {
                  if (message.media?.url) {
                    try {
                      const canOpen = await Linking.canOpenURL(message.media.url);
                      if (canOpen) {
                        await Linking.openURL(message.media.url);
                      } else {
                        Alert.alert(
                          t('common.error', 'Error'),
                          t('chat.cannotOpenDocument', 'Cannot open this document')
                        );
                      }
                    } catch {
                      Alert.alert(
                        t('common.error', 'Error'),
                        t('chat.failedToOpenDocument', 'Failed to open document')
                      );
                    }
                  }
                }}
                className={`flex-row items-center rounded-lg p-3 mb-1 ${isOwnMessage ? 'bg-black/5' : ''}`}
                style={!isOwnMessage ? { backgroundColor: CHAT_COLORS.documentBg } : undefined}
              >
                <View className="w-11 h-11 rounded-full bg-white items-center justify-center mr-3">
                  <FileText size={24} color={CHAT_COLORS.textSenderName} />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-medium mb-0.5" style={{ color: CHAT_COLORS.textPrimary }} numberOfLines={1}>
                    {message.media.file_name || t('chat.document', 'Document')}
                  </Text>
                  <Text className="text-xs" style={{ color: CHAT_COLORS.textSecondary }}>
                    {formatFileSize(message.media.file_size)}
                  </Text>
                </View>
                <View className="w-9 h-9 rounded-full items-center justify-center">
                  <Download size={20} color={CHAT_COLORS.textSecondary} />
                </View>
              </Pressable>
            )}

            {/* Voice message */}
            {message.message_type === 'audio' && message.media?.url && (
              <VoiceNotePlayer
                uri={message.media.url}
                duration={message.media.duration || 0}
                isOwnMessage={isOwnMessage}
              />
            )}

            {/* Location message */}
            {(message.message_type === 'location' || message.message_type === 'live_location') &&
              message.location && (
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

            {/* Text content */}
            {message.text && (
              <WhatsAppText className="text-base leading-[22px] tracking-[0.1px]" style={{ color: CHAT_COLORS.textPrimary }}>
                {message.text}
              </WhatsAppText>
            )}

            {/* Link preview */}
            {message.text &&
              message.message_type === 'text' &&
              (() => {
                const urlMatch = message.text.match(/https?:\/\/[^\s]+/);
                if (urlMatch) {
                  return <LinkPreview url={urlMatch[0]} isOwnMessage={isOwnMessage} compact />;
                }
                return null;
              })()}

            {/* Timestamp and status */}
            <View className="flex-row justify-end items-center mt-1 gap-1">
              {message.is_edited && (
                <Text className="text-[11px] mr-1" style={{ color: CHAT_COLORS.textMeta }}>
                  {t('chat.edited', 'edited')}
                </Text>
              )}
              <Text className="text-[11px]" style={{ color: CHAT_COLORS.textMeta }}>
                {formatTime(message.created_at)}
              </Text>
              {isOwnMessage && (
                onReadReceiptPress ? (
                  <Pressable
                    onPress={() => onReadReceiptPress(message)}
                    hitSlop={{ top: 12, bottom: 12, left: 8, right: 8 }}
                    className="ml-0.5"
                  >
                    <MessageStatusIndicator status={getMessageStatus()} isOwnMessage={isOwnMessage} />
                  </Pressable>
                ) : (
                  <MessageStatusIndicator status={getMessageStatus()} isOwnMessage={isOwnMessage} />
                )
              )}
            </View>
          </View>

          {/* Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <View className={`flex-row flex-wrap -mt-2 gap-1 ${isOwnMessage ? 'mr-2 justify-end' : 'ml-2'}`}>
              {Object.entries(message.reactions).map(([emoji, memberIds]) => (
                <View
                  key={emoji}
                  className="flex-row items-center px-2 py-1 rounded-xl border"
                  style={[
                    {
                      backgroundColor: CHAT_COLORS.reactionBadge,
                      borderColor: CHAT_COLORS.reactionBadgeBorder,
                    },
                    Platform.select({
                      ios: {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.08,
                        shadowRadius: 2,
                      },
                      android: { elevation: 2 },
                    }),
                  ]}
                >
                  <Text className="text-base">{emoji}</Text>
                  {memberIds.length > 1 && (
                    <Text className="text-xs font-medium ml-1" style={{ color: CHAT_COLORS.textSecondary }}>
                      {memberIds.length}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          )}
        </View>
      </Pressable>
    );
  },
  areMessagePropsEqual
);

MessageBubble.displayName = 'MessageBubble';

export default MessageBubble;
