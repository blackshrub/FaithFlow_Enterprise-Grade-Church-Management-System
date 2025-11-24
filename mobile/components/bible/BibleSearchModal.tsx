/**
 * Bible Search Modal
 *
 * Search verses by text content across the current Bible version
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Search, X } from 'lucide-react-native';
import GorhomBottomSheet, {
  BottomSheetBackdrop as GorhomBackdrop,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { BottomSheetScrollView } from '@/components/ui/bottomsheet';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';

import { colors } from '@/constants/theme';
import { useBibleSearchOffline } from '@/hooks/useBibleOffline';
import { getBookName } from '@/lib/bibleBookLookup';
import type { BibleTranslation } from '@/types/bible';

interface BibleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  version: string;
  onSelectVerse: (book: string, chapter: number, verse: number) => void;
}

export function BibleSearchModal({
  isOpen,
  onClose,
  version,
  onSelectVerse,
}: BibleSearchModalProps) {
  const bottomSheetRef = useRef<GorhomBottomSheet>(null);
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [searchQuery, setSearchQuery] = useState('');

  // Use offline search hook
  const { data: searchResults = [], isLoading: isSearching } = useBibleSearchOffline(
    version as BibleTranslation,
    searchQuery,
    { limit: 50, enabled: searchQuery.trim().length >= 3 }
  );

  // Calculate bottom inset
  const bottomInset = insets.bottom;

  // Control bottom sheet based on isOpen prop
  useEffect(() => {
    if (isOpen) {
      bottomSheetRef.current?.snapToIndex(0);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [isOpen]);

  // Handle verse selection
  const handleVerseSelect = (bookNumber: number, bookName: string, chapter: number, verse: number) => {
    // Convert book number to name for compatibility
    onSelectVerse(bookName, chapter, verse);
    setSearchQuery('');
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

  // Highlight search term in result
  const highlightText = (text: string, query: string) => {
    if (!query) return text;

    const parts = text.split(new RegExp(`(${query})`, 'gi'));
    return (
      <Text className="text-gray-700 text-sm">
        {parts.map((part, i) =>
          part.toLowerCase() === query.toLowerCase() ? (
            <Text key={i} className="bg-yellow-200 font-semibold">{part}</Text>
          ) : (
            <Text key={i}>{part}</Text>
          )
        )}
      </Text>
    );
  };

  return (
    <GorhomBottomSheet
      ref={bottomSheetRef}
      index={-1}
      snapPoints={['80%']}
      enablePanDownToClose
      bottomInset={bottomInset}
      detached={false}
      onClose={() => {
        setSearchQuery('');
        onClose();
      }}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: '#ffffff',
      }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
    >
      <BottomSheetScrollView
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View className="px-6 pt-2 pb-4 border-b border-gray-200">
          <Heading size="xl" className="text-gray-900 mb-4">
            {t('bible.searchBible')}
          </Heading>

          {/* Search Input */}
          <View
            className="flex-row items-center px-4 py-3 rounded-lg"
            style={{ backgroundColor: colors.gray[100] }}
          >
            <Icon as={Search} size="md" className="text-gray-400 mr-3" />
            <BottomSheetTextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder={t('bible.searchPlaceholder')}
              placeholderTextColor={colors.gray[400]}
              style={{
                flex: 1,
                fontSize: 16,
                color: colors.gray[900],
                padding: 0,
              }}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <Pressable onPress={() => setSearchQuery('')} className="ml-2">
                <Icon as={X} size="md" className="text-gray-400" />
              </Pressable>
            )}
          </View>

          {searchQuery.length > 0 && searchQuery.length < 3 && (
            <Text className="text-gray-500 text-xs mt-2">
              {t('bible.searchMinLength')}
            </Text>
          )}
        </View>

        {/* Search Results */}
        <VStack className="px-6 pt-4" space="sm">
          {isSearching ? (
            <View className="py-12 items-center">
              <ActivityIndicator size="large" color={colors.primary[500]} />
              <Text className="text-gray-500 mt-4">{t('bible.searching')}</Text>
            </View>
          ) : searchResults.length > 0 ? (
            <>
              <Text className="text-gray-600 text-sm mb-2">
                {searchResults.length} {t('bible.resultsFound')}
              </Text>
              {searchResults.map((result, index) => (
                <Pressable
                  key={`${result.book}-${result.chapter}-${result.verse}-${index}`}
                  onPress={() => handleVerseSelect(result.book, result.bookName, result.chapter, result.verse)}
                  className="active:opacity-70"
                >
                  <View
                    className="p-4 rounded-lg border"
                    style={{
                      backgroundColor: 'white',
                      borderColor: colors.gray[200],
                    }}
                  >
                    <Text className="text-primary-600 font-semibold text-xs mb-2">
                      {result.bookName} {result.chapter}:{result.verse}
                    </Text>
                    {highlightText(result.text, searchQuery)}
                  </View>
                </Pressable>
              ))}
            </>
          ) : searchQuery.length >= 3 ? (
            <View className="py-12 items-center">
              <Icon as={Search} size="xl" className="text-gray-300 mb-4" />
              <Text className="text-gray-500 text-center">{t('bible.noResults')}</Text>
            </View>
          ) : null}
        </VStack>
      </BottomSheetScrollView>
    </GorhomBottomSheet>
  );
}
