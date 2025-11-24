/**
 * Bible Reading Preferences Bottom Sheet
 *
 * YouVersion-style reading customization with live preview:
 * - Font size: 10-24pt with +/- buttons
 * - Line height: Cyclable button with 3 states
 * - Font family: 11 font options
 * - 7 background themes (4 light + 3 dark)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Pressable } from 'react-native';
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
  type FontFamily,
} from '@/stores/bibleStore';
import { colors, readingThemes } from '@/constants/theme';

interface ReadingPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LINE_HEIGHT_CYCLE: LineHeightType[] = ['compact', 'normal', 'relaxed'];

const LINE_HEIGHT_ICONS = {
  compact: AlignLeft,
  normal: AlignCenter,
  relaxed: AlignRight,
};

const FONT_FAMILIES: FontFamily[] = [
  'System',
  'Untitled Serif',
  'Avenir',
  'New York',
  'San Francisco',
  'Gentium Plus',
  'Baskerville',
  'Georgia',
  'Helvetica Neue',
  'Hoefler Text',
  'Verdana',
];

const THEMES: ThemeType[] = ['light', 'light2', 'light3', 'sepia', 'light4', 'dark', 'dark2', 'dark3'];

export function ReadingPreferencesModal({
  isOpen,
  onClose,
}: ReadingPreferencesModalProps) {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences } = useBibleStore();

  // Calculate bottom inset
  const TAB_BAR_HEIGHT = 64 + (insets.bottom > 0 ? 20 : 8);
  const bottomInset = TAB_BAR_HEIGHT;

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

  // Font family handler
  const handleFontFamilyChange = (fontFamily: FontFamily) => {
    updatePreferences({ fontFamily });
  };

  // Theme handler
  const handleThemeChange = (theme: ThemeType) => {
    updatePreferences({ theme });
  };

  // Backdrop component
  const renderBackdrop = useCallback(
    (props: any) => (
      <GorhomBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
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
      snapPoints={['85%']}
      enablePanDownToClose
      bottomInset={bottomInset}
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

          {/* Font Family Selector */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={Type} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">Font Family</Text>
            </HStack>

            <VStack space="xs">
              {FONT_FAMILIES.map((font) => (
                <Pressable
                  key={font}
                  onPress={() => handleFontFamilyChange(font)}
                  className="active:opacity-70"
                >
                  <View
                    className="p-3 rounded-lg flex-row items-center justify-between"
                    style={{
                      backgroundColor:
                        preferences.fontFamily === font ? colors.primary[50] : colors.gray[50],
                      borderWidth: preferences.fontFamily === font ? 2 : 1,
                      borderColor:
                        preferences.fontFamily === font ? colors.primary[500] : colors.gray[200],
                    }}
                  >
                    <Text
                      className={`text-sm ${
                        preferences.fontFamily === font
                          ? 'text-primary-600 font-semibold'
                          : 'text-gray-700'
                      }`}
                    >
                      {font}
                    </Text>
                    {preferences.fontFamily === font && (
                      <Icon as={Check} size="sm" className="text-primary-500" />
                    )}
                  </View>
                </Pressable>
              ))}
            </VStack>
          </VStack>

          {/* Theme Selection - 7 Themes */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={Palette} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">
                {t('bible.theme')}
              </Text>
            </HStack>

            <VStack space="sm">
              {THEMES.map((theme) => (
                <Pressable key={theme} onPress={() => handleThemeChange(theme)}>
                  <View
                    className="rounded-lg overflow-hidden"
                    style={{
                      borderWidth: 3,
                      borderColor:
                        preferences.theme === theme ? colors.primary[500] : colors.gray[200],
                    }}
                  >
                    <View
                      className="p-4"
                      style={{
                        backgroundColor: readingThemes[theme].background,
                      }}
                    >
                      <HStack className="items-center justify-between">
                        <VStack space="xs">
                          <Text
                            className="font-semibold"
                            style={{ color: readingThemes[theme].text }}
                          >
                            {readingThemes[theme].name}
                          </Text>
                          <Text
                            className="text-sm"
                            style={{
                              color: readingThemes[theme].verseNumber,
                            }}
                          >
                            {t('bible.themePreview')}
                          </Text>
                        </VStack>
                        {preferences.theme === theme && (
                          <View
                            className="p-2 rounded-full"
                            style={{
                              backgroundColor: colors.primary[500],
                            }}
                          >
                            <Icon as={Check} size="sm" className="text-white" />
                          </View>
                        )}
                      </HStack>
                    </View>
                  </View>
                </Pressable>
              ))}
            </VStack>
          </VStack>
        </VStack>
      </BottomSheetScrollView>
    </GorhomBottomSheet>
  );
}
