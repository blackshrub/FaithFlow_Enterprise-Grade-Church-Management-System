/**
 * Bible Reading Preferences Modal
 *
 * YouVersion-style reading customization:
 * - Font size adjustment
 * - Theme selection (light/dark/sepia)
 * - Line height adjustment
 * - Live preview
 */

import React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Type, Palette, AlignJustify, Check } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Modal, ModalBackdrop, ModalContent } from '@/components/ui/modal';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';

import { useBibleStore, BiblePreferences } from '@/stores/bibleStore';
import { colors, spacing, borderRadius, readingThemes } from '@/constants/theme';

interface ReadingPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ReadingPreferencesModal({
  isOpen,
  onClose,
}: ReadingPreferencesModalProps) {
  const { t } = useTranslation();
  const { preferences, updatePreferences } = useBibleStore();

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

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="lg">
      <ModalBackdrop />
      <ModalContent className="bg-white">
        {/* Header */}
        <View className="px-6 pt-6 pb-4 border-b border-gray-200">
          <HStack className="items-center justify-between">
            <Heading size="xl">{t('bible.readingPreferences')}</Heading>
            <Pressable onPress={onClose} className="p-2">
              <Icon as={X} size="lg" className="text-gray-600" />
            </Pressable>
          </HStack>
        </View>

        <ScrollView className="flex-1">
          <VStack space="lg" className="p-6">
            {/* Font Size */}
            <VStack space="sm">
              <HStack space="sm" className="items-center mb-2">
                <Icon as={Type} size="md" className="text-gray-600" />
                <Text className="text-gray-900 font-semibold">
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
                        <Icon
                          as={Check}
                          size="xs"
                          className="text-white mt-1"
                        />
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
                <Text className="text-gray-900 font-semibold">
                  {t('bible.theme')}
                </Text>
              </HStack>

              <VStack space="sm">
                {themes.map((theme) => (
                  <Pressable
                    key={theme}
                    onPress={() => handleThemeChange(theme)}
                  >
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
                <Text className="text-gray-900 font-semibold">
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
                        <Icon
                          as={Check}
                          size="xs"
                          className="text-white mt-1"
                        />
                      )}
                    </View>
                  </Pressable>
                ))}
              </HStack>
            </VStack>

            {/* Sample Preview */}
            <Card
              className="p-4"
              style={{
                backgroundColor: readingThemes[preferences.theme].background,
              }}
            >
              <VStack space="xs">
                <Text
                  className="font-semibold mb-2"
                  style={{ color: readingThemes[preferences.theme].text }}
                >
                  {t('bible.preview')}
                </Text>
                <View className="flex-row">
                  <Text
                    className="font-bold mr-2"
                    style={{
                      fontSize:
                        preferences.fontSize === 'small'
                          ? 16
                          : preferences.fontSize === 'medium'
                          ? 18
                          : preferences.fontSize === 'large'
                          ? 20
                          : 24,
                      color: readingThemes[preferences.theme].verseNumber,
                    }}
                  >
                    16
                  </Text>
                  <Text
                    className="flex-1"
                    style={{
                      fontSize:
                        preferences.fontSize === 'small'
                          ? 16
                          : preferences.fontSize === 'medium'
                          ? 18
                          : preferences.fontSize === 'large'
                          ? 20
                          : 24,
                      lineHeight:
                        preferences.fontSize === 'small'
                          ? 16 *
                            (preferences.lineHeight === 'compact'
                              ? 1.4
                              : preferences.lineHeight === 'normal'
                              ? 1.6
                              : 1.8)
                          : preferences.fontSize === 'medium'
                          ? 18 *
                            (preferences.lineHeight === 'compact'
                              ? 1.4
                              : preferences.lineHeight === 'normal'
                              ? 1.6
                              : 1.8)
                          : preferences.fontSize === 'large'
                          ? 20 *
                            (preferences.lineHeight === 'compact'
                              ? 1.4
                              : preferences.lineHeight === 'normal'
                              ? 1.6
                              : 1.8)
                          : 24 *
                            (preferences.lineHeight === 'compact'
                              ? 1.4
                              : preferences.lineHeight === 'normal'
                              ? 1.6
                              : 1.8),
                      color: readingThemes[preferences.theme].text,
                    }}
                  >
                    {t('bible.sampleVerse')}
                  </Text>
                </View>
              </VStack>
            </Card>
          </VStack>
        </ScrollView>
      </ModalContent>
    </Modal>
  );
}
