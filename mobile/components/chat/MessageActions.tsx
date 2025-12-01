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
      className="items-center p-2"
      style={({ pressed }) => pressed && { opacity: 0.7 }}
    >
      <View
        className="items-center justify-center mb-1.5"
        style={{
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: destructive ? '#FEE2E2' : colors.gray[100],
        }}
      >
        <Icon as={icon} size="md" style={{ color: destructive ? '#EF4444' : color }} />
      </View>
      <Text
        className="text-xs"
        style={{ color: destructive ? '#EF4444' : colors.gray[700] }}
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
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      handleIndicatorStyle={{ backgroundColor: colors.gray[300], width: 40 }}
    >
      <View className="flex-1 px-4">
        {/* Edit Mode UI */}
        {isEditing ? (
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            className="flex-1 pb-4"
          >
            <HStack className="justify-between items-center mb-3">
              <HStack space="sm" className="items-center">
                <Icon as={Pencil} size="md" style={{ color: colors.primary[600] }} />
                <Text className="text-lg font-semibold" style={{ color: colors.gray[900] }}>Edit message</Text>
              </HStack>
              <Pressable onPress={handleCancelEdit} className="p-2">
                <Icon as={X} size="md" style={{ color: colors.gray[500] }} />
              </Pressable>
            </HStack>

            <View
              className="flex-row items-end p-3 mb-2"
              style={{ backgroundColor: colors.gray[100], borderRadius: borderRadius.xl }}
            >
              <TextInput
                value={editText}
                onChangeText={setEditText}
                className="flex-1 text-base py-0 pr-2"
                style={{ color: colors.gray[900], maxHeight: 120, minHeight: 40 }}
                multiline
                autoFocus
                placeholder="Edit your message..."
                placeholderTextColor={colors.gray[400]}
                maxLength={4096}
              />
              <Pressable
                onPress={handleSubmitEdit}
                disabled={!editText.trim() || editText.trim() === message.text}
                className="items-center justify-center"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: (!editText.trim() || editText.trim() === message.text) ? colors.gray[300] : '#128C7E',
                }}
              >
                <Icon as={Send} size="md" style={{ color: '#FFFFFF' }} />
              </Pressable>
            </View>

            <Text className="text-xs text-center italic" style={{ color: colors.gray[500] }}>
              Edited messages will show "(edited)" indicator
            </Text>
          </KeyboardAvoidingView>
        ) : (
          <>
            {/* Message Preview */}
            <View className="p-3 mb-4" style={{ backgroundColor: colors.gray[100], borderRadius: borderRadius.lg }}>
              <Text className="text-sm leading-5" style={{ color: colors.gray[800] }} numberOfLines={2}>
                {message.text || '[Media]'}
              </Text>
              <Text className="text-[11px] text-right mt-1" style={{ color: colors.gray[500] }}>
                {new Date(message.created_at).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })}
              </Text>
            </View>

            {/* Quick Actions Row */}
            <View
              className="flex-row justify-around py-4"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.gray[200] }}
            >
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
          <View className="pt-2">
            {message.text && (
              <Pressable className="flex-row items-center py-3.5 px-2" onPress={handleShare}>
                <Icon as={Share2} size="md" style={{ color: colors.gray[600] }} />
                <Text className="text-base ml-4" style={{ color: colors.gray[800] }}>Share</Text>
              </Pressable>
            )}

            <Pressable
              className="flex-row items-center py-3.5 px-2"
              onPress={() => {
                onInfo();
                onClose();
              }}
            >
              <Icon as={Info} size="md" style={{ color: colors.gray[600] }} />
              <Text className="text-base ml-4" style={{ color: colors.gray[800] }}>Message info</Text>
              {isOwnMessage && (
                <HStack space="xs" className="ml-auto items-center">
                  <Icon as={Check} size="sm" style={{ color: '#53bdeb' }} />
                  <Text className="text-xs" style={{ color: colors.gray[500] }}>
                    {message.read_by?.length || 0} read
                  </Text>
                </HStack>
              )}
            </Pressable>

            {/* Delete Options */}
            <View className="mt-2 pt-2" style={{ borderTopWidth: 1, borderTopColor: colors.gray[200] }}>
              <Pressable className="flex-row items-center py-3.5 px-2" onPress={handleDeleteForMe}>
                <Icon as={Trash2} size="md" style={{ color: '#EF4444' }} />
                <Text className="text-base ml-4" style={{ color: '#EF4444' }}>Delete for me</Text>
              </Pressable>

              {isOwnMessage && !message.is_deleted && (
                <Pressable className="flex-row items-center py-3.5 px-2" onPress={handleDeleteForEveryone}>
                  <Icon as={Trash2} size="md" style={{ color: '#EF4444' }} />
                  <Text className="text-base ml-4" style={{ color: '#EF4444' }}>
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
    <View
      className="flex-row bg-white px-2 py-2"
      style={{
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
      }}
    >
      {QUICK_REACTIONS.map((emoji) => (
        <Pressable
          key={emoji}
          className="p-2 mx-0.5"
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(emoji);
            onClose();
          }}
        >
          <Text className="text-2xl">{emoji}</Text>
        </Pressable>
      ))}
      <Pressable
        className="p-2 mx-0.5"
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
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      handleIndicatorStyle={{ backgroundColor: colors.gray[300], width: 40 }}
    >
      <View className="flex-1 px-4">
        <Text className="text-lg font-semibold mb-3" style={{ color: colors.gray[900] }}>Forward to</Text>

        {/* Message Preview */}
        <View className="p-3 mb-4" style={{ backgroundColor: colors.gray[100], borderRadius: borderRadius.lg }}>
          <Text className="text-sm" style={{ color: colors.gray[700] }} numberOfLines={2}>
            {message.text || '[Media]'}
          </Text>
        </View>

        {/* Chat List */}
        <View className="flex-1">
          {chats.map((chat) => (
            <Pressable
              key={chat.id}
              className="flex-row items-center py-3 px-2"
              style={[
                { borderRadius: borderRadius.lg },
                selectedChats.includes(chat.id) && { backgroundColor: colors.primary[50] },
              ]}
              onPress={() => toggleChat(chat.id)}
            >
              <View
                className="items-center justify-center mr-3"
                style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gray[300] }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.gray[600] }}>
                  {chat.name.substring(0, 2).toUpperCase()}
                </Text>
              </View>
              <Text className="flex-1 text-base" style={{ color: colors.gray[900] }}>{chat.name}</Text>
              {selectedChats.includes(chat.id) && (
                <View
                  className="items-center justify-center"
                  style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary[500] }}
                >
                  <Icon as={Check} size="sm" style={{ color: '#FFFFFF' }} />
                </View>
              )}
            </Pressable>
          ))}
        </View>

        {/* Forward Button */}
        {selectedChats.length > 0 && (
          <Pressable
            className="flex-row items-center justify-center py-3.5 my-4"
            style={{ backgroundColor: '#128C7E', borderRadius: borderRadius.lg }}
            onPress={handleForward}
          >
            <Icon as={Forward} size="md" style={{ color: '#FFFFFF' }} />
            <Text className="text-base font-semibold text-white ml-2">
              Forward to {selectedChats.length} chat{selectedChats.length > 1 ? 's' : ''}
            </Text>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}

export { MessageActionsSheet as default };
