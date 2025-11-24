/**
 * Bible Reading Preferences Bottom Sheet
 *
 * YouVersion-style reading customization with live preview:
 * - Font size: 10-24pt with +/- buttons
 * - Line height: Cyclable button with 3 states
 * - Font family: 11 font options (horizontal scroll)
 * - 8 background themes (horizontal scroll)
 * - Max 50% screen height for live preview
 * - Transparent backdrop to see changes in real-time
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Pressable, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  Type,
  Palette,
  AlignJustify,
  Check,
  Plus,
  Minus,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Eye,
  EyeOff,
  Space,
} from 'lucide-react-native';
import GorhomBottomSheet, { BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { BottomSheetScrollView } from '@/components/ui/bottomsheet';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';

import {
  useBibleStore,
  type LineHeightType,
  type ThemeType,
  type TextAlign,
  type WordSpacing,
} from '@/stores/bibleStore';
import { BibleFontSelector } from './BibleFontSelector';
import { isChineseBible } from '@/utils/fonts';
import { colors, readingThemes } from '@/constants/theme';

interface ReadingPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Current Bible version code (e.g., 'NIV', 'CHS', 'TB')
   * Used to determine if font selector should be shown
   */
  version: string;
}

const LINE_HEIGHT_CYCLE: LineHeightType[] = ['compact', 'normal', 'relaxed'];

const LINE_HEIGHT_ICONS = {
  compact: AlignLeft,
  normal: AlignCenter,
  relaxed: AlignRight,
};

const THEMES: ThemeType[] = ['light', 'light2', 'light3', 'sepia', 'light4', 'dark', 'dark2', 'dark3'];

const TEXT_ALIGN_OPTIONS: { value: TextAlign; icon: typeof AlignLeft; label: string }[] = [
  { value: 'left', icon: AlignLeft, label: 'Left' },
  { value: 'justify', icon: AlignJustify, label: 'Justify' },
];

const WORD_SPACING_OPTIONS: { value: WordSpacing; label: string }[] = [
  { value: 'normal', label: 'Normal' },
  { value: 'wide', label: 'Wide' },
  { value: 'wider', label: 'Wider' },
];

export function ReadingPreferencesModal({
  isOpen,
  onClose,
  version,
}: ReadingPreferencesModalProps) {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences } = useBibleStore();

  // Calculate insets to prevent covering status bar
  const TAB_BAR_HEIGHT = 64 + (insets.bottom > 0 ? 20 : 8);
  const bottomInset = TAB_BAR_HEIGHT;
  const topInset = insets.top || 20; // Ensure minimum 20px from top (status bar)

  // Control bottom sheet
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  // Font size handlers
  const handleIncreaseFontSize = () => {
    if (preferences.fontSize < 24) {
      updatePreferences({ fontSize: preferences.fontSize + 1 });
    }
  };

  const handleDecreaseFontSize = () => {
    if (preferences.fontSize > 10) {
      updatePreferences({ fontSize: preferences.fontSize - 1 });
    }
  };

  // Line height cycle handler
  const handleCycleLineHeight = () => {
    const currentIndex = LINE_HEIGHT_CYCLE.indexOf(preferences.lineHeight);
    const nextIndex = (currentIndex + 1) % LINE_HEIGHT_CYCLE.length;
    updatePreferences({ lineHeight: LINE_HEIGHT_CYCLE[nextIndex] });
  };

  // Theme handler
  const handleThemeChange = (theme: ThemeType) => {
    updatePreferences({ theme });
  };

  // Text alignment handler
  const handleTextAlignChange = (textAlign: TextAlign) => {
    updatePreferences({ textAlign });
  };

  // Word spacing handler
  const handleWordSpacingChange = (wordSpacing: WordSpacing) => {
    updatePreferences({ wordSpacing });
  };

  // Toggle handlers
  const handleToggleVerseNumbers = () => {
    updatePreferences({ showVerseNumbers: !preferences.showVerseNumbers });
  };

  const handleToggleRedLetterWords = () => {
    updatePreferences({ redLetterWords: !preferences.redLetterWords });
  };

  // Backdrop component - transparent to allow live preview
  const renderBackdrop = useCallback(
    (props: any) => (
      <GorhomBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.3}
        onPress={onClose}
      />
    ),
    [onClose]
  );

  const CurrentLineHeightIcon = LINE_HEIGHT_ICONS[preferences.lineHeight];

  return (
    <GorhomBottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['60%', '85%']}
      enablePanDownToClose
      enableDynamicSizing={false}
      activeOffsetY={[-10, 10]} // Require 10px vertical movement before detecting pan
      failOffsetX={[-10, 10]} // Fail gesture if horizontal movement > 10px
      bottomInset={bottomInset}
      topInset={topInset}
      detached={false}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: '#ffffff',
      }}
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View className="px-6 pt-2 pb-4 border-b border-gray-200">
          <Heading size="xl" className="text-gray-900">
            {t('bible.readingPreferences')}
          </Heading>
        </View>

        <VStack space="lg" className="px-6 pt-6">
          {/* Font Size with +/- Buttons */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={Type} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">
                {t('bible.fontSize')}
              </Text>
            </HStack>

            <HStack className="items-center justify-between">
              {/* Decrease Button */}
              <Pressable
                onPress={handleDecreaseFontSize}
                disabled={preferences.fontSize <= 10}
                className="active:opacity-60"
                style={{
                  width: 48,
                  height: 48,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 24,
                  backgroundColor:
                    preferences.fontSize <= 10 ? colors.gray[100] : colors.primary[500],
                }}
              >
                <Icon
                  as={Minus}
                  size="md"
                  style={{
                    color: preferences.fontSize <= 10 ? colors.gray[300] : '#ffffff',
                  }}
                />
              </Pressable>

              {/* Font Size Display */}
              <View className="flex-1 items-center">
                <Text className="text-gray-900 font-bold text-3xl">
                  {preferences.fontSize}
                </Text>
                <Text className="text-gray-500 text-sm">pt</Text>
              </View>

              {/* Increase Button */}
              <Pressable
                onPress={handleIncreaseFontSize}
                disabled={preferences.fontSize >= 24}
                className="active:opacity-60"
                style={{
                  width: 48,
                  height: 48,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderRadius: 24,
                  backgroundColor:
                    preferences.fontSize >= 24 ? colors.gray[100] : colors.primary[500],
                }}
              >
                <Icon
                  as={Plus}
                  size="md"
                  style={{
                    color: preferences.fontSize >= 24 ? colors.gray[300] : '#ffffff',
                  }}
                />
              </Pressable>
            </HStack>
          </VStack>

          {/* Line Height - Cyclable Button */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={AlignJustify} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">
                {t('bible.lineHeight')}
              </Text>
            </HStack>

            <Pressable onPress={handleCycleLineHeight} className="active:opacity-70">
              <View
                className="p-4 rounded-lg flex-row items-center justify-between"
                style={{
                  backgroundColor: colors.primary[50],
                  borderWidth: 2,
                  borderColor: colors.primary[500],
                }}
              >
                <HStack space="sm" className="items-center">
                  <Icon as={CurrentLineHeightIcon} size="md" className="text-primary-600" />
                  <Text className="text-primary-600 font-semibold capitalize">
                    {t(`bible.lineHeights.${preferences.lineHeight}`)}
                  </Text>
                </HStack>
                <Text className="text-primary-600 text-xs">Tap to cycle</Text>
              </View>
            </Pressable>
          </VStack>

          {/* Text Alignment */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={AlignLeft} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">Text Alignment</Text>
            </HStack>

            <HStack space="sm">
              {TEXT_ALIGN_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleTextAlignChange(option.value)}
                  className="flex-1 active:opacity-70"
                >
                  <View
                    className="p-4 rounded-lg flex-row items-center justify-center"
                    style={{
                      backgroundColor:
                        preferences.textAlign === option.value
                          ? colors.primary[500]
                          : colors.gray[100],
                    }}
                  >
                    <Icon
                      as={option.icon}
                      size="sm"
                      style={{
                        color:
                          preferences.textAlign === option.value ? '#ffffff' : colors.gray[600],
                        marginRight: 8,
                      }}
                    />
                    <Text
                      className="font-semibold"
                      style={{
                        color:
                          preferences.textAlign === option.value ? '#ffffff' : colors.gray[600],
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </HStack>
          </VStack>

          {/* Word Spacing */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={Space} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">Word Spacing</Text>
            </HStack>

            <HStack space="sm">
              {WORD_SPACING_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  onPress={() => handleWordSpacingChange(option.value)}
                  className="flex-1 active:opacity-70"
                >
                  <View
                    className="p-4 rounded-lg items-center justify-center"
                    style={{
                      backgroundColor:
                        preferences.wordSpacing === option.value
                          ? colors.primary[500]
                          : colors.gray[100],
                    }}
                  >
                    <Text
                      className="font-semibold text-sm"
                      style={{
                        color:
                          preferences.wordSpacing === option.value ? '#ffffff' : colors.gray[600],
                      }}
                    >
                      {option.label}
                    </Text>
                  </View>
                </Pressable>
              ))}
            </HStack>
          </VStack>

          {/* Toggle Options */}
          <VStack space="sm">
            <Text className="text-gray-900 font-semibold text-base mb-2">Display Options</Text>

            {/* Show Verse Numbers Toggle */}
            <Pressable onPress={handleToggleVerseNumbers} className="active:opacity-70">
              <View
                className="p-4 rounded-lg flex-row items-center justify-between"
                style={{
                  backgroundColor: colors.gray[100],
                }}
              >
                <HStack space="sm" className="items-center">
                  <Icon
                    as={preferences.showVerseNumbers ? Eye : EyeOff}
                    size="md"
                    className="text-gray-600"
                  />
                  <Text className="text-gray-900 font-medium">Show Verse Numbers</Text>
                </HStack>
                <View
                  className="flex-row items-center justify-end"
                  style={{
                    width: 51,
                    height: 31,
                    borderRadius: 16,
                    backgroundColor: preferences.showVerseNumbers
                      ? colors.primary[500]
                      : colors.gray[300],
                    padding: 2,
                  }}
                >
                  <View
                    className="rounded-full bg-white shadow-sm"
                    style={{
                      width: 27,
                      height: 27,
                      position: 'absolute',
                      left: preferences.showVerseNumbers ? 22 : 2,
                    }}
                  />
                </View>
              </View>
            </Pressable>

            {/* Red Letter Words Toggle */}
            <Pressable onPress={handleToggleRedLetterWords} className="active:opacity-70">
              <View
                className="p-4 rounded-lg flex-row items-center justify-between"
                style={{
                  backgroundColor: colors.gray[100],
                }}
              >
                <VStack space="xs" className="flex-1">
                  <Text className="text-gray-900 font-medium">Red Letter Edition</Text>
                  <Text className="text-gray-500 text-xs">Highlight Jesus' words in red</Text>
                </VStack>
                <View
                  className="flex-row items-center justify-end"
                  style={{
                    width: 51,
                    height: 31,
                    borderRadius: 16,
                    backgroundColor: preferences.redLetterWords
                      ? colors.error[500]
                      : colors.gray[300],
                    padding: 2,
                  }}
                >
                  <View
                    className="rounded-full bg-white shadow-sm"
                    style={{
                      width: 27,
                      height: 27,
                      position: 'absolute',
                      left: preferences.redLetterWords ? 22 : 2,
                    }}
                  />
                </View>
              </View>
            </Pressable>
          </VStack>

          {/* Font Family Selector - NEW: Custom Bible Fonts with Live Preview */}
          {/* Hidden for Chinese Bibles - they use system fonts automatically */}
          {!isChineseBible(version) && (
            <VStack space="sm">
              <HStack space="sm" className="items-center mb-2">
                <Icon as={Type} size="md" className="text-gray-600" />
                <Text className="text-gray-900 font-semibold text-base">Bible Font</Text>
              </HStack>
              <BibleFontSelector version={version} />
            </VStack>
          )}

          {/* Theme Selection - Horizontal Scroll */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={Palette} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">
                {t('bible.theme')}
              </Text>
            </HStack>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 24 }}
            >
              <HStack space="sm">
                {THEMES.map((theme) => (
                  <Pressable key={theme} onPress={() => handleThemeChange(theme)}>
                    <View
                      className="rounded-lg overflow-hidden"
                      style={{
                        borderWidth: 3,
                        borderColor:
                          preferences.theme === theme ? colors.primary[500] : colors.gray[200],
                        width: 140,
                      }}
                    >
                      <View
                        className="p-3"
                        style={{
                          backgroundColor: readingThemes[theme].background,
                        }}
                      >
                        <Text
                          className="font-semibold text-sm mb-1"
                          style={{ color: readingThemes[theme].text }}
                        >
                          {readingThemes[theme].name}
                        </Text>
                        <Text
                          className="text-xs"
                          style={{
                            color: readingThemes[theme].verseNumber,
                          }}
                        >
                          Aa
                        </Text>
                        {preferences.theme === theme && (
                          <View
                            className="absolute top-1 right-1 p-1 rounded-full"
                            style={{
                              backgroundColor: colors.primary[500],
                            }}
                          >
                            <Icon as={Check} size="xs" className="text-white" />
                          </View>
                        )}
                      </View>
                    </View>
                  </Pressable>
                ))}
              </HStack>
            </ScrollView>
          </VStack>
        </VStack>
      </BottomSheetScrollView>
    </GorhomBottomSheet>
  );
}
