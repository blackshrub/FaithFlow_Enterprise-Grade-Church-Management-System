/**
 * Chat Components
 *
 * Barrel export for all WhatsApp-like chat components
 */

// Core Message Actions
export {
  MessageActionsSheet,
  ReactionPicker,
  ForwardMessageModal,
} from './MessageActions';

// Attachments
export {
  AttachmentPicker,
  type MediaAttachment,
} from './AttachmentPicker';

// Voice Notes
export {
  VoiceNoteInput,
  VoiceNotePlayer,
} from './VoiceNote';

// Emoji & Reactions (NEW)
export {
  EmojiPickerSheet,
  EmojiButton,
  InlineEmojiPicker,
  QuickReactions,
  ReactionsDisplay,
} from './EmojiPicker';

// GIF Support (NEW)
export {
  GifPickerSheet,
  GifButton,
  GifMessage,
  type GifItem,
} from './GifPicker';

// Media Gallery (NEW)
export {
  MediaGalleryViewer,
  MediaGrid,
  MediaTabs,
  type MediaItem,
} from './MediaGallery';

// Media Preview
export { MediaPreview } from './MediaPreview';
export { UploadProgress } from './UploadProgress';

// Disappearing Messages
export {
  DisappearingMessagesSettings,
  DisappearingIndicator,
  DisappearingBadge,
  MessageCountdown,
  getDurationLabel,
  getDurationInMs,
  formatCountdown,
  type DisappearingDuration,
} from './DisappearingMessages';

// Text Formatting
export { WhatsAppText } from './WhatsAppText';

// Link Preview
export { LinkPreview } from './LinkPreview';

// Message Search
export { MessageSearchHeader, HighlightedText, SearchContext, useMessageSearch } from './MessageSearch';

// Location Sharing
export { LocationSharer, LocationPreview } from './LocationSharing';

// Read Receipts (NEW)
export {
  MessageStatusIndicator as ReadReceiptStatus,
  ReadReceiptSummary,
  ReadReceiptList,
  type MessageStatus,
  type ReadReceiptUser,
} from './ReadReceipts';

// Typing Indicators (NEW)
export {
  TypingIndicator,
  TypingDots,
  TypingBubble as TypingIndicatorBubble,
  TypingStatus,
  useTypingIndicator,
  type TypingUser,
} from './TypingIndicator';

// Performance Optimizations
export {
  SendButton,
  ScrollToBottomFAB,
  MessageStatusIndicator,
  ConnectionBanner,
  AttachmentButton,
  SwipeToReplyWrapper,
  DoubleTapReaction,
  DateHeader,
  UnreadDivider,
  TypingBubble,
  useScrollPosition,
  useMessageQueue,
  useMessageGrouping,
} from './ChatOptimizations';

// WhatsApp-Style Components (NEW - Extracted for cleaner chat.tsx)
export {
  MessageBubble,
  areMessagePropsEqual,
  type MessageBubbleProps,
} from './MessageBubble';

export {
  ChatHeader,
  type ChatHeaderProps,
} from './ChatHeader';

export {
  ChatInputBar,
  type ChatInputBarProps,
  type ChatInputBarRef,
  type ReplyData,
} from './ChatInputBar';

export {
  ChatMenuSheet,
  type ChatMenuSheetProps,
} from './ChatMenuSheet';
