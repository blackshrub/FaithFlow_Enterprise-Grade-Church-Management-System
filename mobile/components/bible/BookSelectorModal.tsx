/**
 * Bible Book & Chapter Selector Modal
 *
 * YouVersion-style navigation:
 * - Testament tabs (OT/NT)
 * - Book grid
 * - Chapter selector
 * - Quick search
 */

import React, { useState } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { useTranslation } from 'react-i18next';
import { X } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Modal, ModalBackdrop, ModalContent } from '@/components/ui/modal';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Card } from '@/components/ui/card';

import { colors, spacing, borderRadius } from '@/constants/theme';
import type { BibleBook } from '@/types/api';

interface BookSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  books: BibleBook[];
  onSelectChapter: (book: string, chapter: number) => void;
}

export function BookSelectorModal({
  isOpen,
  onClose,
  books,
  onSelectChapter,
}: BookSelectorModalProps) {
  const { t } = useTranslation();
  const [selectedTestament, setSelectedTestament] = useState<'OT' | 'NT'>('OT');
  const [selectedBook, setSelectedBook] = useState<BibleBook | null>(null);

  const filteredBooks = books.filter((book) => book.testament === selectedTestament);

  const handleBookSelect = (book: BibleBook) => {
    setSelectedBook(book);
  };

  const handleChapterSelect = (chapter: number) => {
    if (selectedBook) {
      onSelectChapter(selectedBook.name, chapter);
      onClose();
      setSelectedBook(null);
    }
  };

  const handleBack = () => {
    if (selectedBook) {
      setSelectedBook(null);
    } else {
      onClose();
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="full">
      <ModalBackdrop />
      <ModalContent className="bg-white" style={{ maxHeight: '90%' }}>
        {/* Header */}
        <View className="px-6 pt-6 pb-4 border-b border-gray-200">
          <HStack className="items-center justify-between">
            <Heading size="xl">
              {selectedBook ? selectedBook.name : t('bible.selectBook')}
            </Heading>
            <Pressable onPress={handleBack} className="p-2">
              <Icon as={X} size="lg" className="text-gray-600" />
            </Pressable>
          </HStack>
        </View>

        <ScrollView className="flex-1">
          {!selectedBook ? (
            /* Book Selection */
            <VStack space="md" className="p-6">
              {/* Testament Tabs */}
              <HStack space="sm">
                <Pressable
                  onPress={() => setSelectedTestament('OT')}
                  className="flex-1"
                >
                  <View
                    className="py-3 px-4 rounded-lg items-center"
                    style={{
                      backgroundColor:
                        selectedTestament === 'OT'
                          ? colors.primary[500]
                          : colors.gray[100],
                    }}
                  >
                    <Text
                      className={`font-semibold ${
                        selectedTestament === 'OT'
                          ? 'text-white'
                          : 'text-gray-600'
                      }`}
                    >
                      {t('bible.oldTestament')}
                    </Text>
                  </View>
                </Pressable>

                <Pressable
                  onPress={() => setSelectedTestament('NT')}
                  className="flex-1"
                >
                  <View
                    className="py-3 px-4 rounded-lg items-center"
                    style={{
                      backgroundColor:
                        selectedTestament === 'NT'
                          ? colors.primary[500]
                          : colors.gray[100],
                    }}
                  >
                    <Text
                      className={`font-semibold ${
                        selectedTestament === 'NT'
                          ? 'text-white'
                          : 'text-gray-600'
                      }`}
                    >
                      {t('bible.newTestament')}
                    </Text>
                  </View>
                </Pressable>
              </HStack>

              {/* Books Grid */}
              <View className="flex-row flex-wrap gap-2">
                {filteredBooks.map((book, index) => (
                  <MotiView
                    key={book.name}
                    from={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{
                      type: 'spring',
                      delay: index * 30,
                    }}
                    style={{ width: '48%' }}
                  >
                    <Pressable
                      onPress={() => handleBookSelect(book)}
                      className="active:opacity-70"
                    >
                      <Card className="p-4">
                        <Text className="text-gray-900 font-semibold text-center">
                          {book.name}
                        </Text>
                        <Text className="text-gray-500 text-xs text-center mt-1">
                          {book.chapters} {t('bible.chapters' as any) || 'chapters'}
                        </Text>
                      </Card>
                    </Pressable>
                  </MotiView>
                ))}
              </View>
            </VStack>
          ) : (
            /* Chapter Selection */
            <View className="p-6">
              <View className="flex-row flex-wrap gap-2">
                {Array.from({ length: selectedBook.chapters }, (_, i) => i + 1).map(
                  (chapter, index) => (
                    <MotiView
                      key={chapter}
                      from={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{
                        type: 'spring',
                        delay: index * 20,
                      }}
                      style={{ width: '18%' }}
                    >
                      <Pressable
                        onPress={() => handleChapterSelect(chapter)}
                        className="active:opacity-70"
                      >
                        <View
                          className="p-4 items-center justify-center rounded-lg"
                          style={{
                            backgroundColor: colors.gray[100],
                            aspectRatio: 1,
                          }}
                        >
                          <Text className="text-gray-900 font-bold text-lg">
                            {chapter}
                          </Text>
                        </View>
                      </Pressable>
                    </MotiView>
                  )
                )}
              </View>
            </View>
          )}
        </ScrollView>
      </ModalContent>
    </Modal>
  );
}
