/**
 * Bible Reading Preferences Bottom Sheet
 *
 * YouVersion-style reading customization with live preview:
 * - Font size adjustment
 * - Theme selection (light/dark/sepia)
 * - Line height adjustment
 * - User sees changes in real-time on Bible text behind the sheet
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Type, Palette, AlignJustify, Check } from 'lucide-react-native';
import GorhomBottomSheet, { BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { BottomSheetScrollView } from '@/components/ui/bottomsheet';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';

import { useBibleStore, BiblePreferences } from '@/stores/bibleStore';
import { colors, readingThemes } from '@/constants/theme';

interface ReadingPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReadingPreferencesModal({
  isOpen,
  onClose,
}: ReadingPreferencesModalProps) {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { preferences, updatePreferences } = useBibleStore();

  // Calculate bottom inset - just use safe area, let sheet sit on top of tab bar
  const bottomInset = insets.bottom;

  // Control bottom sheet based on isOpen prop
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const fontSizes: Array<BiblePreferences['fontSize']> = [
    'small',
    'medium',
    'large',
    'xlarge',
  ];

  const themes: Array<BiblePreferences['theme']> = ['light', 'dark', 'sepia'];

  const lineHeights: Array<BiblePreferences['lineHeight']> = [
    'compact',
    'normal',
    'relaxed',
  ];

  const handleFontSizeChange = (size: BiblePreferences['fontSize']) => {
    updatePreferences({ fontSize: size });
  };

  const handleThemeChange = (theme: BiblePreferences['theme']) => {
    updatePreferences({ theme });
  };

  const handleLineHeightChange = (lineHeight: BiblePreferences['lineHeight']) => {
    updatePreferences({ lineHeight });
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

  return (
    <GorhomBottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['65%']}
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
          {/* Font Size */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={Type} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">
                {t('bible.fontSize')}
              </Text>
            </HStack>

            <HStack space="sm">
              {fontSizes.map((size) => (
                <Pressable
                  key={size}
                  onPress={() => handleFontSizeChange(size)}
                  className="flex-1"
                >
                  <View
                    className="py-3 px-2 rounded-lg items-center"
                    style={{
                      backgroundColor:
                        preferences.fontSize === size
                          ? colors.primary[500]
                          : colors.gray[100],
                      borderWidth: 2,
                      borderColor:
                        preferences.fontSize === size
                          ? colors.primary[600]
                          : 'transparent',
                    }}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        preferences.fontSize === size
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {t(`bible.fontSizes.${size}`)}
                    </Text>
                    {preferences.fontSize === size && (
                      <Icon as={Check} size="xs" className="text-white mt-1" />
                    )}
                  </View>
                </Pressable>
              ))}
            </HStack>
          </VStack>

          {/* Theme Selection */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={Palette} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">
                {t('bible.theme')}
              </Text>
            </HStack>

            <VStack space="sm">
              {themes.map((theme) => (
                <Pressable key={theme} onPress={() => handleThemeChange(theme)}>
                  <View
                    className="rounded-lg overflow-hidden"
                    style={{
                      borderWidth: 3,
                      borderColor:
                        preferences.theme === theme
                          ? colors.primary[500]
                          : colors.gray[200],
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
                            className="font-semibold capitalize"
                            style={{ color: readingThemes[theme].text }}
                          >
                            {t(`bible.themes.${theme}`)}
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

          {/* Line Height */}
          <VStack space="sm">
            <HStack space="sm" className="items-center mb-2">
              <Icon as={AlignJustify} size="md" className="text-gray-600" />
              <Text className="text-gray-900 font-semibold text-base">
                {t('bible.lineHeight')}
              </Text>
            </HStack>

            <HStack space="sm">
              {lineHeights.map((lineHeight) => (
                <Pressable
                  key={lineHeight}
                  onPress={() => handleLineHeightChange(lineHeight)}
                  className="flex-1"
                >
                  <View
                    className="py-3 px-2 rounded-lg items-center"
                    style={{
                      backgroundColor:
                        preferences.lineHeight === lineHeight
                          ? colors.primary[500]
                          : colors.gray[100],
                      borderWidth: 2,
                      borderColor:
                        preferences.lineHeight === lineHeight
                          ? colors.primary[600]
                          : 'transparent',
                    }}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        preferences.lineHeight === lineHeight
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {t(`bible.lineHeights.${lineHeight}`)}
                    </Text>
                    {preferences.lineHeight === lineHeight && (
                      <Icon as={Check} size="xs" className="text-white mt-1" />
                    )}
                  </View>
                </Pressable>
              ))}
            </HStack>
          </VStack>
        </VStack>
      </BottomSheetScrollView>
    </GorhomBottomSheet>
  );
}
