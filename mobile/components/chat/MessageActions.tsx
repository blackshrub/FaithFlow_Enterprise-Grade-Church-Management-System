/**
 * MessageActions Component
 *
 * WhatsApp-style message action sheet with:
 * - Reply (swipe gesture also available)
 * - Forward to other chats
 * - Star/favorite message
 * - Copy text
 * - Delete for me / Delete for everyone
 * - Message info (read receipts)
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Share,
  Clipboard,
  Alert,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetTextInput } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import {
  Reply,
  Forward,
  Star,
  Copy,
  Trash2,
  Info,
  Share2,
  MoreHorizontal,
  Check,
  Pencil,
  Send,
  X,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius } from '@/constants/theme';
import type { CommunityMessage } from '@/types/communities';

// =============================================================================
// TYPES
// =============================================================================

interface MessageActionsProps {
  message: CommunityMessage | null;
  visible: boolean;
  onClose: () => void;
  isOwnMessage: boolean;
  onReply: () => void;
  onForward: () => void;
  onStar: () => void;
  onCopy: () => void;
  onDelete: (forEveryone: boolean) => void;
  onInfo: () => void;
  onEdit?: (newText: string) => void;
  isStarred?: boolean;
  canEdit?: boolean; // Only allow editing within 15 minutes
}

interface ActionButtonProps {
  icon: React.ElementType;
  label: string;
  onPress: () => void;
  color?: string;
  destructive?: boolean;
}

// =============================================================================
// ACTION BUTTON
// =============================================================================

function ActionButton({
  icon,
  label,
  onPress,
  color = colors.gray[700],
  destructive = false,
}: ActionButtonProps) {
  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && styles.actionButtonPressed,
      ]}
    >
      <View
        style={[
          styles.iconContainer,
          destructive && styles.iconContainerDestructive,
        ]}
      >
        <Icon as={icon} size="md" style={{ color: destructive ? '#EF4444' : color }} />
      </View>
      <Text
        style={[
          styles.actionLabel,
          destructive && styles.actionLabelDestructive,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// =============================================================================
// MESSAGE ACTIONS SHEET
// =============================================================================

export function MessageActionsSheet({
  message,
  visible,
  onClose,
  isOwnMessage,
  onReply,
  onForward,
  onStar,
  onCopy,
  onDelete,
  onInfo,
  onEdit,
  isStarred = false,
  canEdit = false,
}: MessageActionsProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%'], []);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState('');

  const renderBackdrop = useCallback(
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

  const handleCopy = useCallback(() => {
    if (message?.text) {
      Clipboard.setString(message.text);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
    onCopy();
    onClose();
  }, [message, onCopy, onClose]);

  const handleShare = useCallback(async () => {
    if (!message?.text) return;

    try {
      await Share.share({
        message: message.text,
      });
    } catch {
      // Silently fail
    }
    onClose();
  }, [message, onClose]);

  const handleDeleteForMe = useCallback(() => {
    Alert.alert(
      'Delete message?',
      'This message will be deleted for you only.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for me',
          style: 'destructive',
          onPress: () => {
            onDelete(false);
            onClose();
          },
        },
      ]
    );
  }, [onDelete, onClose]);

  const handleDeleteForEveryone = useCallback(() => {
    Alert.alert(
      'Delete for everyone?',
      'This message will be deleted for all members.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete for everyone',
          style: 'destructive',
          onPress: () => {
            onDelete(true);
            onClose();
          },
        },
      ]
    );
  }, [onDelete, onClose]);

  const handleStartEdit = useCallback(() => {
    if (message?.text) {
      setEditText(message.text);
      setIsEditing(true);
    }
  }, [message]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setEditText('');
  }, []);

  const handleSubmitEdit = useCallback(() => {
    if (editText.trim() && onEdit && editText.trim() !== message?.text) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onEdit(editText.trim());
      setIsEditing(false);
      setEditText('');
      onClose();
    } else if (editText.trim() === message?.text) {
      // No changes made
      setIsEditing(false);
      setEditText('');
    }
  }, [editText, onEdit, message, onClose]);

  // Reset edit state when sheet closes
  React.useEffect(() => {
    if (!visible) {
      setIsEditing(false);
      setEditText('');
    }
  }, [visible]);

  if (!message) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.container}>
        {/* Edit Mode UI */}
        {isEditing ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.editContainer}
          >
            <HStack className="justify-between items-center mb-3">
              <HStack space="sm" className="items-center">
                <Icon as={Pencil} size="md" style={{ color: colors.primary[600] }} />
                <Text style={styles.editTitle}>Edit message</Text>
              </HStack>
              <Pressable onPress={handleCancelEdit} style={styles.cancelButton}>
                <Icon as={X} size="md" style={{ color: colors.gray[500] }} />
              </Pressable>
            </HStack>

            <View style={styles.editInputContainer}>
              <TextInput
                value={editText}
                onChangeText={setEditText}
                style={styles.editInput}
                multiline
                autoFocus
                placeholder="Edit your message..."
                placeholderTextColor={colors.gray[400]}
                maxLength={4096}
              />
              <Pressable
                onPress={handleSubmitEdit}
                disabled={!editText.trim() || editText.trim() === message.text}
                style={[
                  styles.sendEditButton,
                  (!editText.trim() || editText.trim() === message.text) && styles.sendEditButtonDisabled,
                ]}
              >
                <Icon as={Send} size="md" style={{ color: '#FFFFFF' }} />
              </Pressable>
            </View>

            <Text style={styles.editHint}>
              Edited messages will show "(edited)" indicator
            </Text>
          </KeyboardAvoidingView>
        ) : (
          <>
            {/* Message Preview */}
            <View style={styles.previewContainer}>
              <Text style={styles.previewText} numberOfLines={2}>
                {message.text || '[Media]'}
              </Text>
              <Text style={styles.previewTime}>
                {new Date(message.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {/* Quick Actions Row */}
            <View style={styles.quickActionsRow}>
              <ActionButton
                icon={Reply}
                label="Reply"
                onPress={() => {
                  onReply();
                  onClose();
                }}
              />
              <ActionButton
                icon={Forward}
                label="Forward"
                onPress={() => {
                  onForward();
                  onClose();
                }}
              />
              <ActionButton
                icon={isStarred ? Star : Star}
                label={isStarred ? 'Unstar' : 'Star'}
                onPress={() => {
                  onStar();
                  onClose();
                }}
                color={isStarred ? '#F59E0B' : colors.gray[700]}
              />
              {message.text && (
                <ActionButton icon={Copy} label="Copy" onPress={handleCopy} />
              )}
              {isOwnMessage && canEdit && message.text && (
                <ActionButton
                  icon={Pencil}
                  label="Edit"
                  onPress={handleStartEdit}
                  color={colors.primary[600]}
                />
              )}
            </View>
          </>
        )}

        {/* More Actions - only show when not editing */}
        {!isEditing && (
          <View style={styles.moreActionsContainer}>
            {message.text && (
              <Pressable style={styles.listAction} onPress={handleShare}>
                <Icon as={Share2} size="md" style={{ color: colors.gray[600] }} />
                <Text style={styles.listActionText}>Share</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.listAction}
              onPress={() => {
                onInfo();
                onClose();
              }}
            >
              <Icon as={Info} size="md" style={{ color: colors.gray[600] }} />
              <Text style={styles.listActionText}>Message info</Text>
              {isOwnMessage && (
                <HStack space="xs" className="ml-auto items-center">
                  <Icon as={Check} size="sm" style={{ color: '#53bdeb' }} />
                  <Text style={styles.readCount}>
                    {message.read_by?.length || 0} read
                  </Text>
                </HStack>
              )}
            </Pressable>

            {/* Delete Options */}
            <View style={styles.deleteSection}>
              <Pressable style={styles.listAction} onPress={handleDeleteForMe}>
                <Icon as={Trash2} size="md" style={{ color: '#EF4444' }} />
                <Text style={styles.listActionTextDestructive}>Delete for me</Text>
              </Pressable>

              {isOwnMessage && !message.is_deleted && (
                <Pressable style={styles.listAction} onPress={handleDeleteForEveryone}>
                  <Icon as={Trash2} size="md" style={{ color: '#EF4444' }} />
                  <Text style={styles.listActionTextDestructive}>
                    Delete for everyone
                  </Text>
                </Pressable>
              )}
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
}

// =============================================================================
// EMOJI REACTIONS PICKER
// =============================================================================

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

interface ReactionPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function ReactionPicker({ onSelect, onClose }: ReactionPickerProps) {
  return (
    <View style={styles.reactionContainer}>
      {QUICK_REACTIONS.map((emoji) => (
        <Pressable
          key={emoji}
          style={styles.reactionButton}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(emoji);
            onClose();
          }}
        >
          <Text style={styles.reactionEmoji}>{emoji}</Text>
        </Pressable>
      ))}
      <Pressable
        style={styles.reactionButton}
        onPress={() => {
          // For now, close and let user use quick reactions
          // Full emoji picker would require additional library (rn-emoji-keyboard)
          onClose();
        }}
      >
        <Icon as={MoreHorizontal} size="md" style={{ color: colors.gray[500] }} />
      </Pressable>
    </View>
  );
}

// =============================================================================
// FORWARD MESSAGE MODAL
// =============================================================================

interface ForwardModalProps {
  message: CommunityMessage | null;
  visible: boolean;
  onClose: () => void;
  onForward: (chatIds: string[]) => void;
  chats: Array<{ id: string; name: string; avatar?: string }>;
}

export function ForwardMessageModal({
  message,
  visible,
  onClose,
  onForward,
  chats,
}: ForwardModalProps) {
  const [selectedChats, setSelectedChats] = React.useState<string[]>([]);
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);

  const toggleChat = useCallback((chatId: string) => {
    setSelectedChats((prev) =>
      prev.includes(chatId)
        ? prev.filter((id) => id !== chatId)
        : [...prev, chatId]
    );
  }, []);

  const handleForward = useCallback(() => {
    if (selectedChats.length > 0) {
      onForward(selectedChats);
      setSelectedChats([]);
      onClose();
    }
  }, [selectedChats, onForward, onClose]);

  const renderBackdrop = useCallback(
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

  if (!message) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={() => {
        setSelectedChats([]);
        onClose();
      }}
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.forwardContainer}>
        <Text style={styles.forwardTitle}>Forward to</Text>

        {/* Message Preview */}
        <View style={styles.forwardPreview}>
          <Text style={styles.forwardPreviewText} numberOfLines={2}>
            {message.text || '[Media]'}
          </Text>
        </View>

        {/* Chat List */}
        <View style={styles.chatList}>
          {chats.map((chat) => (
            <Pressable
              key={chat.id}
              style={[
                styles.chatItem,
                selectedChats.includes(chat.id) && styles.chatItemSelected,
              ]}
              onPress={() => toggleChat(chat.id)}
            >
              <View style={styles.chatAvatar}>
                <Text style={styles.chatAvatarText}>
                  {chat.name.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text style={styles.chatName}>{chat.name}</Text>
              {selectedChats.includes(chat.id) && (
                <View style={styles.checkCircle}>
                  <Icon as={Check} size="sm" style={{ color: '#FFFFFF' }} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Forward Button */}
        {selectedChats.length > 0 && (
          <Pressable style={styles.forwardButton} onPress={handleForward}>
            <Icon as={Forward} size="md" style={{ color: '#FFFFFF' }} />
            <Text style={styles.forwardButtonText}>
              Forward to {selectedChats.length} chat{selectedChats.length > 1 ? 's' : ''}
            </Text>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Sheet styles
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: colors.gray[300],
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Preview
  previewContainer: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 16,
  },
  previewText: {
    fontSize: 14,
    color: colors.gray[800],
    lineHeight: 20,
  },
  previewTime: {
    fontSize: 11,
    color: colors.gray[500],
    marginTop: 4,
    textAlign: 'right',
  },

  // Quick actions
  quickActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[200],
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionButtonPressed: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  iconContainerDestructive: {
    backgroundColor: '#FEE2E2',
  },
  actionLabel: {
    fontSize: 12,
    color: colors.gray[700],
  },
  actionLabelDestructive: {
    color: '#EF4444',
  },

  // More actions
  moreActionsContainer: {
    paddingTop: 8,
  },
  listAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  listActionText: {
    fontSize: 16,
    color: colors.gray[800],
    marginLeft: 16,
  },
  listActionTextDestructive: {
    fontSize: 16,
    color: '#EF4444',
    marginLeft: 16,
  },
  readCount: {
    fontSize: 12,
    color: colors.gray[500],
  },
  deleteSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.gray[200],
  },

  // Edit mode
  editContainer: {
    flex: 1,
    paddingBottom: 16,
  },
  editTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
  },
  cancelButton: {
    padding: 8,
  },
  editInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.xl,
    padding: 12,
    marginBottom: 8,
  },
  editInput: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
    maxHeight: 120,
    minHeight: 40,
    paddingVertical: 0,
    paddingRight: 8,
  },
  sendEditButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#128C7E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendEditButtonDisabled: {
    backgroundColor: colors.gray[300],
  },
  editHint: {
    fontSize: 12,
    color: colors.gray[500],
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Reactions
  reactionContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  reactionButton: {
    padding: 8,
    marginHorizontal: 2,
  },
  reactionEmoji: {
    fontSize: 24,
  },

  // Forward modal
  forwardContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  forwardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray[900],
    marginBottom: 12,
  },
  forwardPreview: {
    backgroundColor: colors.gray[100],
    borderRadius: borderRadius.lg,
    padding: 12,
    marginBottom: 16,
  },
  forwardPreviewText: {
    fontSize: 14,
    color: colors.gray[700],
  },
  chatList: {
    flex: 1,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: borderRadius.lg,
  },
  chatItemSelected: {
    backgroundColor: colors.primary[50],
  },
  chatAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  chatAvatarText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },
  chatName: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
  forwardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#128C7E',
    borderRadius: borderRadius.lg,
    paddingVertical: 14,
    marginVertical: 16,
  },
  forwardButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
  },
});

export { MessageActionsSheet as default };
