/**
 * EmojiPicker Component
 *
 * Full-featured emoji picker using rn-emoji-keyboard with:
 * - Category tabs (smileys, people, animals, food, travel, objects, symbols, flags)
 * - Search functionality
 * - Skin tone support
 * - Recently used emojis
 * - Quick reactions bar
 * - Native keyboard integration option
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Pressable, Keyboard } from 'react-native';
import EmojiKeyboard, { type EmojiType } from 'rn-emoji-keyboard';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { MoreHorizontal, SmilePlus, X } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface EmojiPickerProps {
  visible: boolean;
  onClose: () => void;
  onEmojiSelect: (emoji: string) => void;
  onGifPress?: () => void;
  showGifButton?: boolean;
}

export interface QuickReactionsProps {
  onSelect: (emoji: string) => void;
  onExpandPress: () => void;
  selectedEmoji?: string | null;
  visible?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const QUICK_REACTIONS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

// =============================================================================
// QUICK REACTIONS BAR (for message reactions)
// =============================================================================

export function QuickReactions({
  onSelect,
  onExpandPress,
  selectedEmoji = null,
  visible = true,
}: QuickReactionsProps) {
  if (!visible) return null;

  return (
    <View
      className="flex-row rounded-[28px] px-2 py-2"
      style={{
        backgroundColor: '#FFFFFF',
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
          className={`p-2 mx-0.5 rounded-full ${selectedEmoji === emoji ? 'bg-primary-100' : ''}`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(emoji);
          }}
        >
          <Text className="text-2xl">{emoji}</Text>
        </Pressable>
      ))}
      <Pressable
        className="p-2 mx-0.5 rounded-full"
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onExpandPress();
        }}
      >
        <Icon as={MoreHorizontal} size="md" style={{ color: colors.gray[500] }} />
      </Pressable>
    </View>
  );
}

// =============================================================================
// INLINE EMOJI PICKER (shown above keyboard)
// =============================================================================

interface InlineEmojiPickerProps {
  visible: boolean;
  onEmojiSelect: (emoji: string) => void;
  onClose: () => void;
}

export function InlineEmojiPicker({
  visible,
  onEmojiSelect,
  onClose,
}: InlineEmojiPickerProps) {
  const handleEmojiSelected = useCallback(
    (emojiObject: EmojiType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onEmojiSelect(emojiObject.emoji);
    },
    [onEmojiSelect]
  );

  return (
    <EmojiKeyboard
      onEmojiSelected={handleEmojiSelected}
      open={visible}
      onClose={onClose}
      enableRecentlyUsed
      enableSearchBar
      enableSearchAnimation
      enableCategoryChangeGesture
      categoryPosition="top"
      categoryOrder={[
        'recently_used',
        'smileys_emotion',
        'people_body',
        'animals_nature',
        'food_drink',
        'travel_places',
        'activities',
        'objects',
        'symbols',
        'flags',
      ]}
      theme={{
        backdrop: colors.gray[900],
        knob: colors.gray[300],
        container: '#FFFFFF',
        header: colors.gray[100],
        category: {
          icon: colors.gray[600],
          iconActive: colors.primary[600],
          container: '#FFFFFF',
          containerActive: colors.primary[50],
        },
        search: {
          text: colors.gray[900],
          placeholder: colors.gray[400],
          icon: colors.gray[400],
          background: colors.gray[100],
        },
      }}
      styles={{
        container: {
          borderTopLeftRadius: 16,
          borderTopRightRadius: 16,
        },
      }}
    />
  );
}

// =============================================================================
// FULL EMOJI PICKER SHEET
// =============================================================================

export function EmojiPickerSheet({
  visible,
  onClose,
  onEmojiSelect,
  onGifPress,
  showGifButton = true,
}: EmojiPickerProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);

  const handleEmojiSelected = useCallback(
    (emojiObject: EmojiType) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onEmojiSelect(emojiObject.emoji);
    },
    [onEmojiSelect]
  );

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

  // Don't render anything when not visible to prevent emoji keyboard from showing
  if (!visible) return null;

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={0}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      handleIndicatorStyle={{ backgroundColor: colors.gray[300], width: 40 }}
    >
      <View className="flex-1 pt-1">
        {/* Header with GIF option */}
        <HStack className="justify-between items-center px-4 pb-2">
          <HStack space="md" className="items-center">
            <View className="p-2 rounded-lg" style={{ backgroundColor: colors.primary[50] }}>
              <Icon as={SmilePlus} size="md" style={{ color: colors.primary[600] }} />
            </View>
            {showGifButton && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onGifPress?.();
                }}
                className="p-2 rounded-lg"
                style={{ backgroundColor: colors.gray[100] }}
              >
                <Text className="text-sm font-semibold" style={{ color: colors.gray[600] }}>
                  GIF
                </Text>
              </Pressable>
            )}
          </HStack>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
          >
            <Icon as={X} size="md" style={{ color: colors.gray[500] }} />
          </Pressable>
        </HStack>

        {/* Emoji Keyboard - only renders when sheet is visible */}
        <View className="flex-1 mt-2">
          <EmojiKeyboard
            onEmojiSelected={handleEmojiSelected}
            open={true}
            onClose={onClose}
            enableRecentlyUsed
            enableSearchBar
            enableSearchAnimation
            enableCategoryChangeGesture
            categoryPosition="top"
            expandable={false}
            disableSafeArea
            categoryOrder={[
              'recently_used',
              'smileys_emotion',
              'people_body',
              'animals_nature',
              'food_drink',
              'travel_places',
              'activities',
              'objects',
              'symbols',
              'flags',
            ]}
            theme={{
              knob: 'transparent',
              container: 'transparent',
              header: colors.gray[50],
              category: {
                icon: colors.gray[500],
                iconActive: colors.primary[600],
                container: colors.gray[50],
                containerActive: colors.primary[100],
              },
              search: {
                text: colors.gray[900],
                placeholder: colors.gray[400],
                icon: colors.gray[400],
                background: colors.gray[100],
              },
            }}
            styles={{
              container: {
                flex: 1,
              },
            }}
          />
        </View>
      </View>
    </BottomSheet>
  );
}

// =============================================================================
// EMOJI BUTTON (to trigger picker)
// =============================================================================

interface EmojiButtonProps {
  onPress: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function EmojiButton({ onPress, size = 'md' }: EmojiButtonProps) {
  const iconSize = size === 'sm' ? 'sm' : size === 'lg' ? 'xl' : 'md';

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        Keyboard.dismiss();
        onPress();
      }}
      className="p-2 rounded-full active:bg-gray-100"
    >
      <Icon as={SmilePlus} size={iconSize} style={{ color: colors.gray[500] }} />
    </Pressable>
  );
}

// =============================================================================
// REACTIONS DISPLAY (show reactions on a message)
// =============================================================================

interface ReactionsDisplayProps {
  reactions: Array<{ emoji: string; count: number; reacted?: boolean }>;
  onReactionPress: (emoji: string) => void;
  maxDisplay?: number;
}

export function ReactionsDisplay({
  reactions,
  onReactionPress,
  maxDisplay = 5,
}: ReactionsDisplayProps) {
  if (reactions.length === 0) return null;

  const displayReactions = reactions.slice(0, maxDisplay);
  const remaining = reactions.length - maxDisplay;

  return (
    <HStack space="xs" className="mt-1 flex-wrap">
      {displayReactions.map((reaction, index) => (
        <Pressable
          key={`${reaction.emoji}-${index}`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onReactionPress(reaction.emoji);
          }}
          className={`flex-row items-center rounded-xl px-2 py-1 ${
            reaction.reacted ? 'border border-primary-300' : ''
          }`}
          style={{ backgroundColor: reaction.reacted ? colors.primary[100] : colors.gray[100] }}
        >
          <Text className="text-sm mr-1">{reaction.emoji}</Text>
          <Text
            className={`text-xs ${reaction.reacted ? 'text-primary-700' : 'text-gray-600'}`}
          >
            {reaction.count}
          </Text>
        </Pressable>
      ))}
      {remaining > 0 && (
        <View className="flex-row items-center rounded-xl px-2 py-1" style={{ backgroundColor: colors.gray[100] }}>
          <Text className="text-xs text-gray-600">+{remaining}</Text>
        </View>
      )}
    </HStack>
  );
}

// Default export for convenience
export default EmojiPickerSheet;
