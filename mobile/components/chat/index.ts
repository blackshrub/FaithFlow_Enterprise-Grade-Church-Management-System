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
