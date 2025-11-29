/**
 * Highlight Color Picker Component
 *
 * YouVersion-style inline color picker that appears above the action bar.
 * - Compact horizontal row of color dots
 * - Slide up animation
 * - 5 colors: yellow, green, blue, pink, orange
 */

import React from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { Check, X } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/ui/icon';
import { HStack } from '@/components/ui/hstack';
import { colors } from '@/constants/theme';
import type { Highlight } from '@/stores/bibleStore';

type HighlightColor = Highlight['color'];

interface ColorOption {
  key: HighlightColor | 'clear';
  color: string;
  label: string;
  isClear?: boolean;
}

const COLOR_OPTIONS: ColorOption[] = [
  { key: 'clear', color: colors.gray[200], label: 'Clear', isClear: true },
  { key: 'yellow', color: '#FEF3C7', label: 'Yellow' },
  { key: 'green', color: '#D1FAE5', label: 'Green' },
  { key: 'blue', color: '#DBEAFE', label: 'Blue' },
  { key: 'pink', color: '#FCE7F3', label: 'Pink' },
  { key: 'orange', color: '#FED7AA', label: 'Orange' },
];

interface HighlightColorPickerProps {
  /** Currently selected color (if any) */
  selectedColor?: HighlightColor;
  /** Callback when a color is selected */
  onSelectColor: (color: HighlightColor) => void;
  /** Callback when clear highlight is tapped */
  onClearHighlight: () => void;
}

export function HighlightColorPicker({
  selectedColor,
  onSelectColor,
  onClearHighlight,
}: HighlightColorPickerProps) {
  const insets = useSafeAreaInsets();

  // Calculate bottom position - above the action bar (which is above tab bar + FAB)
  const TAB_BAR_HEIGHT = 64;
  const FAB_EXTRA_HEIGHT = 24;
  const SPACING = 16;
  const ACTION_BAR_HEIGHT = 64; // Height of VerseSelectionBar
  const bottomOffset = TAB_BAR_HEIGHT + FAB_EXTRA_HEIGHT + SPACING + ACTION_BAR_HEIGHT + 8 + (insets.bottom > 0 ? 8 : 0);

  const handleOptionPress = (option: ColorOption) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (option.isClear) {
      onClearHighlight();
    } else {
      onSelectColor(option.key as HighlightColor);
    }
  };

  return (
    <Animated.View
      entering={SlideInDown.duration(200)}
      exiting={SlideOutDown.duration(150)}
      style={[
        styles.container,
        {
          bottom: bottomOffset,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.1,
          shadowRadius: 8,
          elevation: 8,
        },
      ]}
    >
      <View style={styles.content}>
        <HStack space="sm" className="items-center justify-center">
          {COLOR_OPTIONS.map((option) => {
            const isSelected = selectedColor === option.key;

            return (
              <Pressable
                key={option.key}
                onPress={() => handleOptionPress(option)}
                style={[
                  styles.colorButton,
                  {
                    backgroundColor: option.color,
                    borderWidth: isSelected ? 2 : 1,
                    borderColor: isSelected ? colors.gray[700] : colors.gray[300],
                  },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                {option.isClear ? (
                  <Icon
                    as={X}
                    size="sm"
                    style={{ color: colors.gray[600] }}
                  />
                ) : isSelected ? (
                  <Icon
                    as={Check}
                    size="sm"
                    style={{ color: colors.gray[700] }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </HStack>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    zIndex: 999, // Below action bar (1000)
  },
  content: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  colorButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
