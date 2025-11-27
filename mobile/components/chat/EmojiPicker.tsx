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
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet, Platform, Keyboard, Dimensions } from 'react-native';
import EmojiKeyboard, { type EmojiType } from 'rn-emoji-keyboard';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { MoreHorizontal, SmilePlus, Search, X } from 'lucide-react-native';

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

const RECENTLY_USED_KEY = 'recently_used_emojis';

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
    <View style={styles.quickReactionsContainer}>
      {QUICK_REACTIONS.map((emoji) => (
        <Pressable
          key={emoji}
          style={[
            styles.quickReactionButton,
            selectedEmoji === emoji && styles.quickReactionButtonSelected,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onSelect(emoji);
          }}
        >
          <Text style={styles.quickReactionEmoji}>{emoji}</Text>
        </Pressable>
      ))}
      <Pressable
        style={styles.quickReactionButton}
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
      <View style={styles.sheetContainer}>
        {/* Header with GIF option */}
        <HStack className="justify-between items-center px-4 pb-2">
          <HStack space="md" className="items-center">
            <View style={styles.tabActive}>
              <Icon as={SmilePlus} size="md" style={{ color: colors.primary[600] }} />
            </View>
            {showGifButton && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onGifPress?.();
                }}
                style={styles.tabInactive}
              >
                <Text style={styles.gifText}>GIF</Text>
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

        {/* Emoji Keyboard */}
        <View style={styles.emojiContainer}>
          <EmojiKeyboard
            onEmojiSelected={handleEmojiSelected}
            open={true}
            onClose={() => {}}
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
      style={({ pressed }) => [
        styles.emojiButton,
        pressed && styles.emojiButtonPressed,
      ]}
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
    <HStack space="xs" style={styles.reactionsDisplayContainer}>
      {displayReactions.map((reaction, index) => (
        <Pressable
          key={`${reaction.emoji}-${index}`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onReactionPress(reaction.emoji);
          }}
          style={[
            styles.reactionChip,
            reaction.reacted && styles.reactionChipActive,
          ]}
        >
          <Text style={styles.reactionChipEmoji}>{reaction.emoji}</Text>
          <Text
            style={[
              styles.reactionChipCount,
              reaction.reacted && styles.reactionChipCountActive,
            ]}
          >
            {reaction.count}
          </Text>
        </Pressable>
      ))}
      {remaining > 0 && (
        <View style={styles.reactionChip}>
          <Text style={styles.reactionChipCount}>+{remaining}</Text>
        </View>
      )}
    </HStack>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Quick reactions
  quickReactionsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    paddingHorizontal: 8,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  quickReactionButton: {
    padding: 8,
    marginHorizontal: 2,
    borderRadius: 20,
  },
  quickReactionButtonSelected: {
    backgroundColor: colors.primary[100],
  },
  quickReactionEmoji: {
    fontSize: 24,
  },

  // Sheet
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: colors.gray[300],
    width: 40,
  },
  sheetContainer: {
    flex: 1,
    paddingTop: 4,
  },
  emojiContainer: {
    flex: 1,
    marginTop: 8,
  },

  // Tabs
  tabActive: {
    padding: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.primary[50],
  },
  tabInactive: {
    padding: 8,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.gray[100],
  },
  gifText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[600],
  },

  // Emoji button
  emojiButton: {
    padding: 8,
    borderRadius: 20,
  },
  emojiButtonPressed: {
    backgroundColor: colors.gray[100],
  },

  // Reactions display
  reactionsDisplayContainer: {
    marginTop: 4,
    flexWrap: 'wrap',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray[100],
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionChipActive: {
    backgroundColor: colors.primary[100],
    borderWidth: 1,
    borderColor: colors.primary[300],
  },
  reactionChipEmoji: {
    fontSize: 14,
    marginRight: 4,
  },
  reactionChipCount: {
    fontSize: 12,
    color: colors.gray[600],
  },
  reactionChipCountActive: {
    color: colors.primary[700],
  },
});

// Default export for convenience
export default EmojiPickerSheet;
