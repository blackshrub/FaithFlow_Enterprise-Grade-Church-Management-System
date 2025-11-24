/**
 * Bible Version Selector Bottom Sheet
 *
 * Allows users to select between different Bible translations:
 * - TB (Terjemahan Baru - Indonesian)
 * - NIV, NKJV, NLT, ESV (English)
 * - CHS (Chinese)
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react-native';
import GorhomBottomSheet, { BottomSheetBackdrop as GorhomBackdrop } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { BottomSheetScrollView } from '@/components/ui/bottomsheet';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';

import { colors } from '@/constants/theme';
import type { BibleVersion } from '@/types/api';

interface BibleVersionSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  versions: BibleVersion[];
  currentVersion: string;
  onSelectVersion: (versionCode: string) => void;
}

export function BibleVersionSelector({
  isOpen,
  onClose,
  versions,
  currentVersion,
  onSelectVersion,
}: BibleVersionSelectorProps) {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Calculate bottom inset to account for tab bar
  const TAB_BAR_HEIGHT = 80;
  const bottomInset = insets.bottom + TAB_BAR_HEIGHT;

  // Control bottom sheet based on isOpen prop
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  const handleSelectVersion = (versionCode: string) => {
    onSelectVersion(versionCode);
    onClose();
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
      snapPoints={['50%']}
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
            {t('bible.selectVersion')}
          </Heading>
        </View>

        {/* Version List */}
        <VStack className="p-6" space="sm">
          {versions.map((version) => (
            <Pressable
              key={version.id}
              onPress={() => handleSelectVersion(version.code)}
              className="active:opacity-70"
            >
              <View
                className="p-4 rounded-lg border"
                style={{
                  backgroundColor:
                    currentVersion === version.code ? colors.primary[50] : 'white',
                  borderColor:
                    currentVersion === version.code ? colors.primary[500] : colors.gray[200],
                  borderWidth: currentVersion === version.code ? 2 : 1,
                }}
              >
                <HStack className="items-center justify-between">
                  <VStack space="xs" className="flex-1">
                    <HStack space="xs" className="items-center">
                      <Text
                        className={`font-bold text-base ${
                          currentVersion === version.code
                            ? 'text-primary-600'
                            : 'text-gray-900'
                        }`}
                      >
                        {version.code}
                      </Text>
                      <Text
                        className={`text-xs px-2 py-0.5 rounded ${
                          version.language === 'id'
                            ? 'bg-blue-100 text-blue-700'
                            : version.language === 'en'
                            ? 'bg-green-100 text-green-700'
                            : 'bg-purple-100 text-purple-700'
                        }`}
                      >
                        {version.language.toUpperCase()}
                      </Text>
                    </HStack>
                    <Text className="text-gray-600 text-sm">{version.name}</Text>
                    {version.description && (
                      <Text className="text-gray-500 text-xs">{version.description}</Text>
                    )}
                  </VStack>

                  {currentVersion === version.code && (
                    <Icon as={Check} size="md" className="text-primary-500 ml-2" />
                  )}
                </HStack>
              </View>
            </Pressable>
          ))}
        </VStack>
      </BottomSheetScrollView>
    </GorhomBottomSheet>
  );
}
