/**
 * Community Chat Screen - WhatsApp-Style Real-Time Messaging
 *
 * Clean, elegant, production-ready chat experience with:
 * - Real-time messaging via MQTT
 * - Message list with infinite scroll
 * - Typing indicators
 * - Message status (sent, delivered, read)
 * - Reply to messages
 * - Reactions (long-press)
 * - Media support (images, videos, documents, voice)
 * - Poll messages
 * - Location sharing
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 *
 * Extracted components for maintainability:
 * - MessageBubble: Individual message rendering
 * - ChatHeader: WhatsApp-style header
 * - ChatInputBar: Message input with attachments
 * - ChatMenuSheet: Bottom sheet menu
 */

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path, Circle, Rect, G } from 'react-native-svg';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { navigateTo } from '@/utils/navigation';
import Animated from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';

import { withPremiumMotionV10 } from '@/hoc';
import { PMotionV10 } from '@/components/motion/premium-motion';
import { VStack } from '@/components/ui/vstack';
import { Skeleton } from '@/components/ui/skeleton';
import { HStack } from '@/components/ui/hstack';

// Chat components - extracted for cleaner code
import {
  MessageBubble,
  ChatHeader,
  ChatInputBar,
  ChatMenuSheet,
  type ChatInputBarRef,
} from '@/components/chat';

// Additional chat components
import { AttachmentPicker, MediaAttachment } from '@/components/chat/AttachmentPicker';
import { MediaPreview } from '@/components/chat/MediaPreview';
import { UploadProgress, UploadStatus } from '@/components/chat/UploadProgress';
import { MessageActionsSheet, ForwardMessageModal } from '@/components/chat/MessageActions';
import { LocationSharer, LocationData, LiveLocationData } from '@/components/chat/LocationSharing';
import { EmojiPickerSheet } from '@/components/chat/EmojiPicker';
import { GifPickerSheet, type GifItem } from '@/components/chat/GifPicker';
import { MediaGalleryViewer, type MediaItem } from '@/components/chat/MediaGallery';
import { ReadReceiptList } from '@/components/chat/ReadReceipts';
import { DisappearingMessagesSettings, type DisappearingDuration } from '@/components/chat/DisappearingMessages';
import { CreatePollModal } from '@/components/communities/CreatePollModal';

import {
  ScrollToBottomFAB,
  ConnectionBanner,
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
import { uploadMedia, UploadProgressCallback } from '@/services/mediaUpload';
import { getThreadById } from '@/mock/community-mockdata';
import type { CommunityMessage, CommunityThread } from '@/types/communities';
import { communityColors, colors } from '@/constants/theme';

// =============================================================================
// CONSTANTS
// =============================================================================

// WhatsApp iOS exact colors - now from centralized theme
const CHAT_COLORS = {
  headerBg: communityColors.background.chat,
  chatBg: communityColors.background.chat,
  primary: communityColors.primary[500],
};
const PRIMARY_500 = communityColors.primary[500];

// =============================================================================
// CHAT BACKGROUND COMPONENT - WhatsApp-style SVG Doodle Pattern
// =============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Hand-drawn doodle pattern based on provided PNG
// Artsy, creative icons with hand-drawn style
const DOODLE_COLOR = '#D5D0C8'; // Subtle beige/taupe color

// Large SVG tile with many hand-drawn style icons (based on provided PNG)
const DoodlePatternSVG = React.memo(() => {
  const TILE_SIZE = 280; // Large tile with many icons
  const C = DOODLE_COLOR;
  const SW = 1.8; // Hand-drawn stroke width

  return (
    <Svg width={TILE_SIZE} height={TILE_SIZE} viewBox={`0 0 ${TILE_SIZE} ${TILE_SIZE}`}>
      {/* Row 1 */}

      {/* Sun with rays - top left */}
      <G transform="translate(15, 15) scale(0.9)">
        <Circle cx="12" cy="12" r="6" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M12 2v4M12 20v4M2 12h4M20 12h4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Heart with arrow */}
      <G transform="translate(55, 20) rotate(-15) scale(0.8)">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M2 14l20-10" stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M22 4l-3 1 1-3" fill="none" stroke={C} strokeWidth={SW} />
      </G>

      {/* Magnifying glass */}
      <G transform="translate(100, 10) scale(0.85)">
        <Circle cx="11" cy="11" r="8" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M21 21l-4.35-4.35" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Laptop */}
      <G transform="translate(145, 8) scale(0.85)">
        <Rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M2 20h20" stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M7 8h10M7 11h6" stroke={C} strokeWidth={SW * 0.8} strokeLinecap="round" />
      </G>

      {/* Crown */}
      <G transform="translate(200, 12) scale(0.85)">
        <Path d="M2 17l3-10 5 6 5-10 5 10 3 6H2z" fill="none" stroke={C} strokeWidth={SW} strokeLinejoin="round" />
        <Circle cx="5" cy="7" r="1.5" fill={C} />
        <Circle cx="12" cy="3" r="1.5" fill={C} />
        <Circle cx="19" cy="7" r="1.5" fill={C} />
      </G>

      {/* Swirl decoration */}
      <G transform="translate(245, 15) scale(0.8)">
        <Path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c2.49 0 4.74-1.01 6.36-2.64" fill="none" stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M12 7c-2.76 0-5 2.24-5 5s2.24 5 5 5" fill="none" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Row 2 */}

      {/* Rocket */}
      <G transform="translate(10, 70) rotate(-20) scale(0.9)">
        <Path d="M12 2c-3 3-5 8-5 13l2 2 6 0 2-2c0-5-2-10-5-13z" fill="none" stroke={C} strokeWidth={SW} />
        <Circle cx="12" cy="11" r="2" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M7 17l-2 4M17 17l2 4M10 21l2-2 2 2" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Feather */}
      <G transform="translate(55, 55) rotate(15) scale(0.75)">
        <Path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5z" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M16 8L2 22M17 7l4-4" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Christmas ornament */}
      <G transform="translate(95, 50) scale(0.85)">
        <Circle cx="12" cy="14" r="8" fill="none" stroke={C} strokeWidth={SW} />
        <Rect x="10" y="4" width="4" height="3" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M12 2v2" stroke={C} strokeWidth={SW} />
      </G>

      {/* Thumbs up */}
      <G transform="translate(135, 60) scale(0.85)">
        <Path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" fill="none" stroke={C} strokeWidth={SW} />
      </G>

      {/* Warning triangle */}
      <G transform="translate(180, 55) scale(0.8)">
        <Path d="M12 2L2 20h20L12 2z" fill="none" stroke={C} strokeWidth={SW} strokeLinejoin="round" />
        <Path d="M12 9v4M12 17h.01" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Star outline */}
      <G transform="translate(220, 60) scale(0.7)">
        <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" fill="none" stroke={C} strokeWidth={SW} />
      </G>

      {/* Light bulb / plug */}
      <G transform="translate(250, 50) scale(0.8)">
        <Path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-7 7c0 2.38 1.19 4.47 3 5.74V17a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-2.26c1.81-1.27 3-3.36 3-5.74a7 7 0 0 0-7-7z" fill="none" stroke={C} strokeWidth={SW} />
      </G>

      {/* Row 3 */}

      {/* Paintbrush */}
      <G transform="translate(15, 135) rotate(-30) scale(0.85)">
        <Path d="M18.37 2.63L14 7l-1.59-1.59a2 2 0 0 0-2.82 0L8 7l9 9 1.59-1.59a2 2 0 0 0 0-2.82L17 10l4.37-4.37a2.12 2.12 0 1 0-3-3z" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M9 8L3 14l3 3 6-6" fill="none" stroke={C} strokeWidth={SW} />
      </G>

      {/* Letter A */}
      <G transform="translate(60, 130) scale(0.9)">
        <Path d="M12 4L4 20h4l2-5h8l2 5h4L12 4z" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M8 13h8" stroke={C} strokeWidth={SW} />
      </G>

      {/* Ribbon banner */}
      <G transform="translate(100, 120) scale(0.85)">
        <Path d="M2 12h4l2-4h8l2 4h4M6 12v6l4-2 4 2 4-2 4 2v-6" fill="none" stroke={C} strokeWidth={SW} strokeLinejoin="round" />
      </G>

      {/* Lightning bolt */}
      <G transform="translate(150, 115) scale(0.9)">
        <Path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill="none" stroke={C} strokeWidth={SW} strokeLinejoin="round" />
      </G>

      {/* Music note */}
      <G transform="translate(195, 125) scale(0.8)">
        <Path d="M9 18V5l12-2v13" stroke={C} strokeWidth={SW} fill="none" />
        <Circle cx="6" cy="18" r="3" fill="none" stroke={C} strokeWidth={SW} />
        <Circle cx="18" cy="16" r="3" fill="none" stroke={C} strokeWidth={SW} />
      </G>

      {/* Arrow pointing right */}
      <G transform="translate(235, 130) scale(0.85)">
        <Path d="M5 12h14M12 5l7 7-7 7" stroke={C} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>

      {/* Row 4 */}

      {/* Swirl left */}
      <G transform="translate(5, 185) scale(0.7)">
        <Path d="M3 12c0 5 4 9 9 9 3.5 0 6.5-2 8-5" fill="none" stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M12 3c-5 0-9 4-9 9" fill="none" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Lips/mouth */}
      <G transform="translate(35, 185) scale(0.85)">
        <Path d="M12 19c-5 0-9-3-9-7s4-7 9-7 9 3 9 7-4 7-9 7z" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M3 12h18" stroke={C} strokeWidth={SW} />
        <Rect x="8" y="13" width="2" height="3" fill={C} />
        <Rect x="14" y="13" width="2" height="3" fill={C} />
      </G>

      {/* Flower */}
      <G transform="translate(85, 180) scale(0.85)">
        <Circle cx="12" cy="12" r="4" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M12 2c1.5 2 1.5 4 0 6M12 18c-1.5 2-1.5 4 0 6M2 12c2-1.5 4-1.5 6 0M18 12c2 1.5 4 1.5 6 0M4.93 4.93c2.12.7 3.54 2.12 4.24 4.24M14.83 14.83c.7 2.12 2.12 3.54 4.24 4.24M4.93 19.07c2.12-.7 3.54-2.12 4.24-4.24M14.83 9.17c.7-2.12 2.12-3.54 4.24-4.24" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Ruler */}
      <G transform="translate(130, 190) rotate(-10) scale(0.9)">
        <Rect x="2" y="6" width="20" height="12" rx="1" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M6 6v4M10 6v3M14 6v4M18 6v3" stroke={C} strokeWidth={SW} />
      </G>

      {/* Apple */}
      <G transform="translate(175, 175) scale(0.85)">
        <Path d="M12 3c-1 0-2 .5-2.5 1.5C8 4 6 5 6 8c0 5 3 10 6 10s6-5 6-10c0-3-2-4-3.5-3.5-.5-1-1.5-1.5-2.5-1.5z" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M12 1v3" stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M14 2c1 1 2 1 3 0" stroke={C} strokeWidth={SW} strokeLinecap="round" fill="none" />
      </G>

      {/* Curved arrow */}
      <G transform="translate(220, 185) scale(0.8)">
        <Path d="M3 12c0-5 4-9 9-9s9 4 9 9" fill="none" stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M16 3l5 0 0 5" stroke={C} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </G>

      {/* Heart small */}
      <G transform="translate(255, 190) scale(0.65)">
        <Path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="none" stroke={C} strokeWidth={SW * 1.5} />
      </G>

      {/* Row 5 */}

      {/* Moon face */}
      <G transform="translate(60, 235) scale(0.85)">
        <Circle cx="12" cy="12" r="10" fill="none" stroke={C} strokeWidth={SW} />
        <Circle cx="8" cy="10" r="1.5" fill={C} />
        <Circle cx="15" cy="9" r="1" fill={C} />
        <Path d="M8 15c2 2 6 2 8 0" fill="none" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Shooting star */}
      <G transform="translate(115, 230) scale(0.85)">
        <Path d="M12 2l1.5 3 3.5.5-2.5 2.5.5 3.5-3-1.5-3 1.5.5-3.5L7 5.5l3.5-.5L12 2z" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M20 8l-6 6M18 16l-4 4M22 12l-5 5" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Glasses */}
      <G transform="translate(175, 240) scale(0.9)">
        <Circle cx="6" cy="12" r="4" fill="none" stroke={C} strokeWidth={SW} />
        <Circle cx="18" cy="12" r="4" fill="none" stroke={C} strokeWidth={SW} />
        <Path d="M10 12h4M2 12h0M22 12h0" stroke={C} strokeWidth={SW} />
        <Path d="M4 8l-2-2M20 8l2-2" stroke={C} strokeWidth={SW} strokeLinecap="round" />
      </G>

      {/* Swirl right */}
      <G transform="translate(230, 235) scale(0.75)">
        <Path d="M21 12c0 5-4 9-9 9-3.5 0-6.5-2-8-5" fill="none" stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <Path d="M12 3c5 0 9 4 9 9" fill="none" stroke={C} strokeWidth={SW} strokeLinecap="round" />
        <Circle cx="12" cy="12" r="3" fill="none" stroke={C} strokeWidth={SW} />
      </G>

      {/* Scattered dots */}
      <Circle cx="45" cy="45" r="2.5" fill={C} opacity="0.6" />
      <Circle cx="130" cy="95" r="2" fill={C} opacity="0.5" />
      <Circle cx="210" cy="100" r="2.5" fill={C} opacity="0.6" />
      <Circle cx="75" cy="165" r="2" fill={C} opacity="0.5" />
      <Circle cx="160" cy="160" r="2.5" fill={C} opacity="0.6" />
      <Circle cx="245" cy="170" r="2" fill={C} opacity="0.5" />
      <Circle cx="25" cy="220" r="2.5" fill={C} opacity="0.6" />
      <Circle cx="150" cy="250" r="2" fill={C} opacity="0.5" />

      {/* Small stars scattered */}
      <G transform="translate(165, 35) scale(0.4)">
        <Path d="M12 2l2 4 4.5.7-3.3 3.2.8 4.6L12 12.5l-4 2 .8-4.6L5.5 6.7 10 6l2-4z" fill="none" stroke={C} strokeWidth={SW * 2} />
      </G>
      <G transform="translate(45, 100) scale(0.35)">
        <Path d="M12 2l2 4 4.5.7-3.3 3.2.8 4.6L12 12.5l-4 2 .8-4.6L5.5 6.7 10 6l2-4z" fill="none" stroke={C} strokeWidth={SW * 2} />
      </G>
    </Svg>
  );
});

DoodlePatternSVG.displayName = 'DoodlePatternSVG';

// Chat background with repeating SVG doodle pattern
const ChatBackground = React.memo(({ children }: { children: React.ReactNode }) => {
  // Calculate how many tiles we need to cover the screen
  const TILE_SIZE = 280; // Match DoodlePatternSVG tile size
  const cols = Math.ceil(SCREEN_WIDTH / TILE_SIZE) + 1;
  const rows = Math.ceil(SCREEN_HEIGHT / TILE_SIZE) + 1;

  // Generate tile positions
  const tiles = useMemo(() => {
    const result = [];
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        result.push({ key: `${row}-${col}`, x: col * TILE_SIZE, y: row * TILE_SIZE });
      }
    }
    return result;
  }, [cols, rows]);

  return (
    <View className="flex-1" style={{ backgroundColor: CHAT_COLORS.chatBg }}>
      {/* SVG Pattern Layer - absolute positioned behind content */}
      <View
        className="absolute inset-0"
        style={{ opacity: 0.8 }}
        pointerEvents="none"
      >
        {tiles.map((tile) => (
          <View
            key={tile.key}
            style={{
              position: 'absolute',
              left: tile.x,
              top: tile.y,
            }}
          >
            <DoodlePatternSVG />
          </View>
        ))}
      </View>
      {/* Content Layer */}
      {children}
    </View>
  );
});

ChatBackground.displayName = 'ChatBackground';

// Alias for backwards compatibility
const PatternBackground = ChatBackground;

// =============================================================================
// TYPING INDICATOR COMPONENT
// =============================================================================

const TypingIndicator = React.memo(({ text }: { text: string | null }) => {
  if (!text) return null;

  return (
    <Animated.View className="px-4 py-2">
      <View className="bg-gray-100 rounded-2xl px-3 py-2 self-start">
        <View className="flex-row gap-1">
          <View className="w-2 h-2 rounded-full bg-gray-400" />
          <View className="w-2 h-2 rounded-full bg-gray-400" />
          <View className="w-2 h-2 rounded-full bg-gray-400" />
        </View>
      </View>
    </Animated.View>
  );
});

TypingIndicator.displayName = 'TypingIndicator';

// =============================================================================
// MAIN CHAT SCREEN
// =============================================================================

function CommunityChatScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id, thread_id } = useLocalSearchParams<{ id: string; thread_id?: string }>();
  const { member } = useAuthStore();

  // Get thread details if thread_id is provided
  const thread: CommunityThread | undefined = thread_id ? getThreadById(thread_id) : undefined;

  // Input state
  const [inputText, setInputText] = useState('');
  const [replyingTo, setReplyingTo] = useState<CommunityMessage | null>(null);
  const inputRef = useRef<ChatInputBarRef>(null);
  const listRef = useRef<any>(null);

  // UI state
  const [showMenu, setShowMenu] = useState(false);
  const [showAttachmentPicker, setShowAttachmentPicker] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showLocationSharer, setShowLocationSharer] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connected');
  void setConnectionStatus;

  // Upload state
  const [uploadStatus, setUploadStatus] = useState<UploadStatus | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingAttachment, setPendingAttachment] = useState<MediaAttachment | null>(null);

  // Message actions state
  const [selectedMessage, setSelectedMessage] = useState<CommunityMessage | null>(null);
  const [showActionsSheet, setShowActionsSheet] = useState(false);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [starredMessages, setStarredMessages] = useState<Set<string>>(new Set());

  // Enhanced features state
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [reactionTargetMessage, setReactionTargetMessage] = useState<CommunityMessage | null>(null);
  const [mediaGalleryItems, setMediaGalleryItems] = useState<MediaItem[]>([]);
  const [mediaGalleryIndex, setMediaGalleryIndex] = useState(0);
  const [showMediaGallery, setShowMediaGallery] = useState(false);

  // Read receipts and disappearing messages
  const [showReadReceiptList, setShowReadReceiptList] = useState(false);
  const [readReceiptMessage, setReadReceiptMessage] = useState<CommunityMessage | null>(null);
  const [showDisappearingSettings, setShowDisappearingSettings] = useState(false);
  const [disappearingDuration, setDisappearingDuration] = useState<DisappearingDuration>('off');

  // Unread tracking
  const [firstUnreadMessageId, setFirstUnreadMessageId] = useState<string | null>(null);
  const initialLoadRef = useRef(true);

  // Typing indicator refs
  const lastTypingRef = useRef<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Scroll position tracking
  const { isAtBottom, newMessageCount, handleScroll, resetNewMessages } = useScrollPosition();
  const messageQueue = useMessageQueue();
  void messageQueue;

  // Data queries
  const { data: community, isLoading: isLoadingCommunity } = useCommunity(id);
  const {
    data: messagesData,
    isLoading: isLoadingMessages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useCommunityMessages(id, 'general');
  const { data: starredMessagesData } = useStarredMessages(id);
  const { data: myCommunities } = useMyCommunities();

  // Mutations
  const sendMessageMutation = useSendMessage();
  const sendMediaMutation = useSendMediaMessage();
  const markAsReadMutation = useMarkAsRead();
  const reactToMessageMutation = useReactToMessage();
  const deleteMessageMutation = useDeleteMessage();
  const editMessageMutation = useEditMessage();
  const forwardMessageMutation = useForwardMessage();
  const starMessageMutation = useStarMessage();

  // MQTT
  const { sendTyping } = useCommunitySubscription(id, 'general');
  const typingIndicatorText = useTypingIndicator(id);

  // Computed values
  const isLeader = community?.my_role === 'admin' || community?.my_role === 'leader';

  const messages = useMemo(() => {
    if (!messagesData?.pages) return [];
    return messagesData.pages.flatMap((page) => page.messages);
  }, [messagesData]);

  const groupedMessages = useMessageGrouping(messages);

  const messageIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    groupedMessages.forEach((item, index) => {
      if (item && !item.type && item.id) {
        map.set(item.id, index);
      }
    });
    return map;
  }, [groupedMessages]);

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

  const unreadCount = useMemo(() => {
    if (!firstUnreadMessageId || !member) return 0;
    let count = 0;
    for (const msg of messages) {
      const isOwnMessage = msg.sender?.id === member.id;
      const isRead = msg.read_by?.some((r) => r.member_id === member.id);
      if (!isOwnMessage && !isRead) count++;
    }
    return count;
  }, [messages, member, firstUnreadMessageId]);

  // Effects
  useEffect(() => {
    if (starredMessagesData) {
      setStarredMessages(new Set(starredMessagesData.map((msg) => msg.id)));
    }
  }, [starredMessagesData]);

  const setCurrentRoute = useNavigationStore((state) => state.setCurrentRoute);
  useEffect(() => {
    if (id) {
      setCurrentRoute(`/community/${id}/chat`, { communityId: id, threadId: thread_id });
    }
    return () => setCurrentRoute('', {});
  }, [id, thread_id, setCurrentRoute]);

  // Check if user can post in this thread (announcement threads are admin-only)
  const canPostInThread = useMemo(() => {
    if (!thread) return true; // Default channel allows all
    if (thread.who_can_post === 'all_members') return true;
    // Admin-only posting
    return isLeader || thread.admin_member_ids.includes(member?.id || '');
  }, [thread, isLeader, member?.id]);

  useEffect(() => {
    if (initialLoadRef.current && messages.length > 0 && member) {
      initialLoadRef.current = false;
      for (let i = messages.length - 1; i >= 0; i--) {
        const msg = messages[i];
        if (msg.sender?.id !== member.id && !msg.read_by?.some((r) => r.member_id === member.id)) {
          setFirstUnreadMessageId(msg.id);
          break;
        }
      }
    }
  }, [messages, member]);

  useEffect(() => {
    if (messages.length > 0 && member) {
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

  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    };
  }, []);

  // Handlers
  const handleTyping = useCallback(() => {
    const now = Date.now();
    if (now - lastTypingRef.current > 2000) {
      sendTyping(true);
      lastTypingRef.current = now;
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => sendTyping(false), 3000);
  }, [sendTyping]);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !member) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const messageText = inputText.trim();
    setInputText('');
    setReplyingTo(null);
    sendTyping(false);
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

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
      setInputText(messageText);
    }
  }, [inputText, id, member, replyingTo, sendMessageMutation, sendTyping, t]);

  const handleReaction = useCallback(
    (messageId: string, emoji: string) => {
      if (!member) return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const existingReaction = messages.find((m) => m.id === messageId)?.reactions?.[emoji];
      const hasReacted = existingReaction?.includes(member.id);
      reactToMessageMutation.mutate({
        messageId,
        emoji,
        action: hasReacted ? 'remove' : 'add',
        communityId: id,
        channelType: 'general',
      });
    },
    [member, reactToMessageMutation, messages, id]
  );

  const scrollToMessage = useCallback(
    (messageId: string) => {
      const index = messageIndexMap.get(messageId);
      if (index !== undefined && listRef.current) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        listRef.current.scrollToIndex({ index, animated: true, viewPosition: 0.5 });
      }
    },
    [messageIndexMap]
  );

  const handleOpenMediaGallery = useCallback(
    (uri: string) => {
      const index = allMediaItems.findIndex((item) => item.uri === uri);
      if (index !== -1) {
        setMediaGalleryItems(allMediaItems);
        setMediaGalleryIndex(index);
        setShowMediaGallery(true);
      } else {
        setPreviewImage(uri);
      }
    },
    [allMediaItems]
  );

  const handleMessageLongPress = useCallback((message: CommunityMessage) => {
    setSelectedMessage(message);
    setShowActionsSheet(true);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
    resetNewMessages();
  }, [resetNewMessages]);

  const handleMediaUpload = useCallback(
    async (attachment: MediaAttachment) => {
      if (!member) return;
      setUploadStatus('uploading');
      setUploadProgress(0);
      setPendingAttachment(attachment);

      try {
        const progressCallback: UploadProgressCallback = (progress) => {
          setUploadProgress(progress.percentage);
        };
        const result = await uploadMedia(id, attachment, progressCallback);

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
        setTimeout(() => {
          setUploadStatus(null);
          setPendingAttachment(null);
        }, 1500);
      } catch (error) {
        setUploadStatus('error');
        Alert.alert(t('chat.uploadFailed', 'Upload Failed'), t('chat.couldNotUploadMedia'));
      }
    },
    [id, member, inputText, sendMediaMutation]
  );

  const handleVoiceUpload = useCallback(
    async (uri: string, duration: number) => {
      if (!member) return;
      const voiceAttachment: MediaAttachment = {
        uri,
        type: 'audio',
        mimeType: 'audio/m4a',
        fileName: `voice_${Date.now()}.m4a`,
        duration,
      };
      await handleMediaUpload(voiceAttachment);
    },
    [member, handleMediaUpload]
  );

  const handleShareLocation = useCallback(
    async (location: LocationData) => {
      if (!member) return;
      try {
        await sendMessageMutation.mutateAsync({
          communityId: id,
          channelType: 'general',
          message: {
            message_type: 'location',
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
        Alert.alert(t('common.error'), t('chat.failedToShareLocation'));
      }
    },
    [id, member, sendMessageMutation, t]
  );

  const handleShareLiveLocation = useCallback(
    async (location: LiveLocationData) => {
      if (!member) return;
      try {
        await sendMessageMutation.mutateAsync({
          communityId: id,
          channelType: 'general',
          message: {
            message_type: 'live_location',
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
        Alert.alert(t('common.error'), t('chat.failedToShareLiveLocation'));
      }
    },
    [id, member, sendMessageMutation, t]
  );

  const handleStarMessage = useCallback(
    async (messageId: string) => {
      const isStarred = starredMessages.has(messageId);
      setStarredMessages((prev) => {
        const newSet = new Set(prev);
        isStarred ? newSet.delete(messageId) : newSet.add(messageId);
        return newSet;
      });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      try {
        await starMessageMutation.mutateAsync({ messageId, action: isStarred ? 'remove' : 'add' });
      } catch (error) {
        setStarredMessages((prev) => {
          const newSet = new Set(prev);
          isStarred ? newSet.add(messageId) : newSet.delete(messageId);
          return newSet;
        });
      }
    },
    [starredMessages, starMessageMutation]
  );

  const handleDeleteMessage = useCallback(
    async (messageId: string, forEveryone: boolean) => {
      try {
        await deleteMessageMutation.mutateAsync({ messageId, forEveryone });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert(t('common.error'), t('chat.couldNotDeleteMessage'));
      }
    },
    [deleteMessageMutation, t]
  );

  const handleEditMessage = useCallback(
    async (newText: string) => {
      if (!selectedMessage) return;
      try {
        await editMessageMutation.mutateAsync({ messageId: selectedMessage.id, text: newText });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        Alert.alert(t('common.error'), t('chat.couldNotEditMessage'));
      }
    },
    [selectedMessage, editMessageMutation, t]
  );

  const handleForwardMessage = useCallback(
    async (chatIds: string[]) => {
      if (!selectedMessage) return;
      try {
        const result = await forwardMessageMutation.mutateAsync({
          messageId: selectedMessage.id,
          targetCommunityIds: chatIds,
        });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(t('common.success'), t('chat.messageForwardedTo', { count: result.forwarded_count }));
      } catch (error) {
        Alert.alert(t('common.error'), t('chat.couldNotForwardMessage'));
      }
    },
    [selectedMessage, forwardMessageMutation, t]
  );

  const handleGifSelect = useCallback(
    async (gif: GifItem) => {
      if (!member) return;
      setShowGifPicker(false);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      try {
        await sendMessageMutation.mutateAsync({
          communityId: id,
          channelType: 'general',
          message: { message_type: 'text', text: gif.url },
        });
      } catch (error) {
        Alert.alert(t('common.error'), t('chat.failedToSendGif'));
      }
    },
    [member, id, sendMessageMutation, t]
  );

  const handleEmojiSelect = useCallback(
    (emoji: string) => {
      if (reactionTargetMessage) {
        handleReaction(reactionTargetMessage.id, emoji);
      }
      setShowEmojiPicker(false);
      setReactionTargetMessage(null);
    },
    [reactionTargetMessage, handleReaction]
  );

  const canEditMessage = useCallback(
    (message: CommunityMessage): boolean => {
      if (!message || !member) return false;
      if (message.sender?.id !== member.id) return false;
      if (message.message_type !== 'text' || message.is_deleted) return false;
      const fifteenMinutes = 15 * 60 * 1000;
      return Date.now() - new Date(message.created_at).getTime() < fifteenMinutes;
    },
    [member]
  );

  // Render message item
  const renderMessage = useCallback(
    ({ item, index }: { item: CommunityMessage | { type: 'date_header'; date: string }; index: number }) => {
      if (item && 'type' in item && item.type === 'date_header') {
        return <DateHeader date={item.date} />;
      }

      const message = item as CommunityMessage;
      const isOwnMessage = message.sender?.id === member?.id;

      let prevMessage: CommunityMessage | null = null;
      for (let i = index + 1; i < groupedMessages.length; i++) {
        const prev = groupedMessages[i];
        if (prev && !('type' in prev)) {
          prevMessage = prev;
          break;
        }
      }

      const showSender = !isOwnMessage && (!prevMessage || prevMessage.sender?.id !== message.sender?.id);
      const showUnreadDivider = message.id === firstUnreadMessageId && unreadCount > 0;

      return (
        <Animated.View entering={PMotionV10.cardStagger(index, 400)}>
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

  // Loading state - iOS style (matches ChatHeader layout)
  if (isLoadingCommunity || (isLoadingMessages && messages.length === 0)) {
    return (
      <SafeAreaView className="flex-1" style={{ backgroundColor: CHAT_COLORS.headerBg }} edges={['top']}>
        {/* Header skeleton - matches ChatHeader styling exactly */}
        <View
          className="flex-row items-center"
          style={{ height: 56, borderBottomColor: '#D1D7DB', borderBottomWidth: 0.5 }}
        >
          {/* Back chevron area */}
          <View className="w-11 pl-1 items-center justify-center">
            <Skeleton className="w-7 h-7 rounded" isLoaded={false} />
          </View>
          {/* Avatar - marginLeft: 20, w-11 h-11 */}
          <View className="ml-5">
            <Skeleton className="w-11 h-11 rounded-full" isLoaded={false} />
          </View>
          {/* Title + subtitle */}
          <VStack className="flex-1 gap-1 ml-3">
            <Skeleton className="w-36 h-[17px] rounded" isLoaded={false} />
            <Skeleton className="w-24 h-[13px] rounded" isLoaded={false} />
          </VStack>
          {/* Action buttons - Video (27px) + Phone (22px) */}
          <View className="flex-row items-center pr-3 gap-2">
            <Skeleton className="w-[27px] h-[27px] rounded" isLoaded={false} />
            <Skeleton className="w-[22px] h-[22px] rounded" isLoaded={false} />
          </View>
        </View>
        {/* Messages skeleton with pattern background */}
        <PatternBackground>
          <VStack className="flex-1 p-4 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <View key={i} className={i % 2 === 0 ? 'items-end' : 'items-start'}>
                <Skeleton
                  className={`${i % 3 === 0 ? 'w-[45%]' : i % 2 === 0 ? 'w-[65%]' : 'w-[55%]'} h-14 rounded-2xl`}
                  isLoaded={false}
                />
              </View>
            ))}
          </VStack>
        </PatternBackground>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: CHAT_COLORS.headerBg }} edges={['top']}>
      {/* Header - iOS style white background */}
      <ChatHeader
        communityName={thread ? thread.name : (community?.name || 'Community')}
        communityImage={thread?.cover_image || community?.cover_image}
        memberCount={thread ? thread.member_count : (community?.member_count || 0)}
        typingText={typingIndicatorText}
        onBack={() => {
          // If in a thread, go back to community threads list
          if (thread_id) {
            navigateTo(`/community/${id}`);
          } else {
            router.back();
          }
        }}
        onPress={() => navigateTo(`/community/${id}/info`)}
        onSearch={() => navigateTo(`/community/${id}/search`)}
        onMenu={() => setShowMenu(true)}
      />

      {/* Connection Status */}
      <ConnectionBanner status={connectionStatus} />

      {/* Messages - WhatsApp style with pattern background */}
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <PatternBackground>
          <Animated.View entering={PMotionV10.screenFadeIn} className="flex-1">
            <FlashList
              ref={listRef}
              data={groupedMessages}
              renderItem={renderMessage}
              keyExtractor={(item: CommunityMessage | { type: 'date_header'; date: string }) =>
                item && 'type' in item && item.type === 'date_header'
                  ? `date-${item.date}`
                  : (item as CommunityMessage).id
              }
              getItemType={(item: CommunityMessage | { type: 'date_header'; date: string }) => (item && 'type' in item && item.type === 'date_header' ? 'date_header' : 'message')}
              estimatedItemSize={80}
              inverted
              drawDistance={800}
              contentContainerStyle={{ paddingVertical: 16 }}
              onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
              onEndReachedThreshold={0.3}
              onScroll={handleScroll}
              scrollEventThrottle={8}
              ListFooterComponent={isFetchingNextPage ? <ActivityIndicator className="py-4" color={PRIMARY_500} /> : null}
              ListHeaderComponent={<TypingIndicator text={typingIndicatorText} />}
              removeClippedSubviews={Platform.OS === 'android'}
            />
            <ScrollToBottomFAB visible={!isAtBottom} newMessageCount={newMessageCount} onPress={handleScrollToBottom} />
          </Animated.View>
        </PatternBackground>

        {/* Input Bar - show read-only message for announcement threads */}
        {canPostInThread ? (
          <ChatInputBar
            ref={inputRef}
            value={inputText}
            onChangeText={setInputText}
            onSend={handleSend}
            onTyping={handleTyping}
            onAttachmentPress={() => setShowAttachmentPicker(true)}
            onGifPress={() => setShowGifPicker(true)}
            onVoiceSend={handleVoiceUpload}
            replyingTo={replyingTo ? { id: replyingTo.id, senderName: replyingTo.sender?.name || 'Unknown', preview: replyingTo.text || 'Media' } : null}
            onClearReply={() => setReplyingTo(null)}
            isSending={sendMessageMutation.isPending}
            isVoiceDisabled={!member || uploadStatus === 'uploading'}
          />
        ) : (
          <View
            className="flex-row items-center justify-center py-4 px-5"
            style={{ backgroundColor: '#F5F5F5', borderTopWidth: 0.5, borderTopColor: '#E0E0E0' }}
          >
            <Text className="text-[14px] text-center" style={{ color: '#8E8E93' }}>
              {t('chat.announcementOnly', 'Only admins can post in this channel')}
            </Text>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Modals and Sheets */}
      <ChatMenuSheet
        visible={showMenu}
        onClose={() => setShowMenu(false)}
        onAnnouncements={() => navigateTo(`/community/${id}/announcements`)}
        onSubgroups={() => navigateTo(`/community/${id}/subgroups`)}
        onCreatePoll={() => setShowPollModal(true)}
        onCommunityInfo={() => navigateTo(`/community/${id}/info`)}
        onDisappearingMessages={() => setShowDisappearingSettings(true)}
        onSettings={isLeader ? () => navigateTo(`/community/${id}/settings`) : undefined}
        isLeader={isLeader}
        disappearingDuration={disappearingDuration}
      />

      <AttachmentPicker
        visible={showAttachmentPicker}
        onClose={() => setShowAttachmentPicker(false)}
        onSelect={(attachment) => {
          setShowAttachmentPicker(false);
          handleMediaUpload(attachment);
        }}
        onLocationPress={() => setShowLocationSharer(true)}
      />

      {uploadStatus && pendingAttachment && (
        <UploadProgress
          fileName={pendingAttachment.fileName}
          progress={uploadProgress}
          status={uploadStatus}
          onCancel={() => {
            setUploadStatus(null);
            setPendingAttachment(null);
          }}
          onRetry={() => pendingAttachment && handleMediaUpload(pendingAttachment)}
        />
      )}

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

      {previewImage && (
        <MediaPreview uri={previewImage} type="image" visible={!!previewImage} onClose={() => setPreviewImage(null)} />
      )}

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
        onStar={() => selectedMessage && handleStarMessage(selectedMessage.id)}
        onCopy={() => {}}
        onEdit={handleEditMessage}
        onDelete={(forEveryone) => selectedMessage && handleDeleteMessage(selectedMessage.id, forEveryone)}
        onInfo={() => {
          if (selectedMessage) {
            const sentAt = new Date(selectedMessage.created_at).toLocaleString();
            const readCount = selectedMessage.read_by?.length || 0;
            const readByNames = selectedMessage.read_by?.slice(0, 5).map((r) => r.member_name).join(', ') || t('chat.noOneYet');
            const moreReaders = readCount > 5 ? `\n+${readCount - 5} ${t('chat.more')}` : '';
            Alert.alert(t('chat.messageInfo'), `${t('chat.sent')}: ${sentAt}\n\n${t('chat.readBy')} (${readCount}):\n${readByNames}${moreReaders}`);
          }
        }}
      />

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

      <LocationSharer
        visible={showLocationSharer}
        onClose={() => setShowLocationSharer(false)}
        onShareLocation={handleShareLocation}
        onShareLiveLocation={handleShareLiveLocation}
      />

      <EmojiPickerSheet
        visible={showEmojiPicker}
        onClose={() => {
          setShowEmojiPicker(false);
          setReactionTargetMessage(null);
        }}
        onEmojiSelect={handleEmojiSelect}
      />

      <GifPickerSheet visible={showGifPicker} onClose={() => setShowGifPicker(false)} onGifSelect={handleGifSelect} />

      {showMediaGallery && mediaGalleryItems.length > 0 && (
        <MediaGalleryViewer
          media={mediaGalleryItems}
          initialIndex={mediaGalleryIndex}
          visible={showMediaGallery}
          onClose={() => setShowMediaGallery(false)}
        />
      )}

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
    </SafeAreaView>
  );
}

export default withPremiumMotionV10(CommunityChatScreen);
