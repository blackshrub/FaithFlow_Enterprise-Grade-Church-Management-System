/**
 * Category Filter Modal (Global)
 *
 * Rendered in tabs layout for proper gesture handling
 * Controlled via Zustand store
 * Uses BottomSheetModal with present/dismiss methods
 */

import React, { useRef, useCallback, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Filter, Check } from 'lucide-react-native';
import { MotiView } from 'moti';
import BottomSheet, { BottomSheetBackdrop, BottomSheetBackdropProps } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { ScrollView } from '@/components/ui/scroll-view';
import { colors, borderRadius, shadows } from '@/constants/theme';
import { useCategoryFilterStore } from '@/stores/categoryFilter';

export function CategoryFilterModal() {
  const { t } = useTranslation();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['60%'], []);

  const { visible, categories, selectedCategory, selectCategory, close } = useCategoryFilterStore();

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
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

  const handleSelectCategory = (categoryId: string | null) => {
    selectCategory(categoryId);
  };

  const handleDismiss = useCallback(() => {
    close();
  }, [close]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      bottomInset={0}
      onClose={handleDismiss}
      backdropComponent={renderBackdrop}
      backgroundStyle={{
        backgroundColor: colors.white,
      }}
      handleIndicatorStyle={{
        backgroundColor: colors.gray[300],
        width: 40,
        height: 4,
      }}
    >
      <View className="flex-1 px-6 pb-8">
        {/* Header */}
        <View className="mb-6">
          <Heading size="xl" className="text-gray-900 font-bold mb-2">
            {t('events.filterByCategory')}
          </Heading>
          <Text className="text-gray-500 text-sm">{t('events.selectCategoryDesc')}</Text>
        </View>

        {/* All Categories Option */}
        <Pressable
          onPress={() => handleSelectCategory(null)}
          className="active:opacity-70 mb-3"
        >
          <MotiView
            animate={{
              backgroundColor: selectedCategory === null ? colors.primary[50] : colors.gray[50],
              borderColor: selectedCategory === null ? colors.primary[500] : 'transparent',
            }}
            transition={{ type: 'timing', duration: 200 }}
            className="p-4 rounded-2xl border-2"
          >
            <HStack space="md" className="items-center">
              <View
                className="w-12 h-12 rounded-xl items-center justify-center"
                style={{
                  backgroundColor:
                    selectedCategory === null ? colors.primary[100] : colors.gray[100],
                }}
              >
                <Icon
                  as={Filter}
                  size="lg"
                  className={selectedCategory === null ? 'text-primary-600' : 'text-gray-400'}
                />
              </View>

              <VStack className="flex-1">
                <Text
                  className={`font-bold text-base ${
                    selectedCategory === null ? 'text-primary-700' : 'text-gray-900'
                  }`}
                >
                  {t('events.allCategories')}
                </Text>
                <Text className="text-gray-500 text-xs">{t('events.showAllEvents')}</Text>
              </VStack>

              {selectedCategory === null && (
                <MotiView
                  from={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', damping: 15 }}
                >
                  <View
                    className="w-6 h-6 rounded-full items-center justify-center"
                    style={{ backgroundColor: colors.primary[500] }}
                  >
                    <Icon as={Check} size="xs" className="text-white" />
                  </View>
                </MotiView>
              )}
            </HStack>
          </MotiView>
        </Pressable>

        {/* Category List */}
        <ScrollView showsVerticalScrollIndicator={false}>
          <VStack space="sm">
            {categories.map((category: any, index: number) => {
              const isSelected = selectedCategory === category.id;

              return (
                <Pressable
                  key={category.id}
                  onPress={() => handleSelectCategory(category.id)}
                  className="active:opacity-70"
                >
                  <MotiView
                    animate={{
                      backgroundColor: isSelected ? colors.primary[50] : colors.white,
                      borderColor: isSelected ? colors.primary[500] : colors.gray[200],
                    }}
                    transition={{ type: 'timing', duration: 200 }}
                    className="p-4 rounded-2xl border-2"
                    style={shadows.sm}
                  >
                      <HStack space="md" className="items-center">
                        <View
                          className="w-12 h-12 rounded-xl items-center justify-center"
                          style={{
                            backgroundColor: isSelected
                              ? category.color + '20'
                              : colors.gray[100],
                          }}
                        >
                          <View
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: category.color }}
                          />
                        </View>

                        <VStack className="flex-1">
                          <Text
                            className={`font-bold text-base ${
                              isSelected ? 'text-primary-700' : 'text-gray-900'
                            }`}
                          >
                            {category.name}
                          </Text>
                          {category.description && (
                            <Text className="text-gray-500 text-xs" numberOfLines={1}>
                              {category.description}
                            </Text>
                          )}
                        </VStack>

                        {isSelected && (
                          <MotiView
                            from={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                          >
                            <View
                              className="w-6 h-6 rounded-full items-center justify-center"
                              style={{ backgroundColor: colors.primary[500] }}
                            >
                              <Icon as={Check} size="xs" className="text-white" />
                            </View>
                          </MotiView>
                        )}
                      </HStack>
                    </MotiView>
                </Pressable>
              );
            })}
          </VStack>
        </ScrollView>
      </View>
    </BottomSheet>
  );
}
