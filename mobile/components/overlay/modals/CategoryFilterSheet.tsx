/**
 * CategoryFilterSheet - Unified Overlay System
 *
 * Bottom sheet for filtering events by category.
 * Used via: overlay.showBottomSheet(CategoryFilterSheet, payload)
 *
 * Styling: NativeWind-first with inline style for dynamic/shadow values
 */

import React, { useCallback } from 'react';
import { View, ScrollView, Pressable, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, Filter, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { OverlayComponentProps } from '@/stores/overlayStore';
import type { CategoryFilterPayload } from '@/stores/overlayStore';
import { Text } from '@/components/ui/text';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium colors - for icon colors only
const Colors = {
  neutral: {
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
  },
  white: '#FFFFFF',
  primary: {
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
};

export const CategoryFilterSheet: React.FC<OverlayComponentProps<CategoryFilterPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!payload) return null;

  const handleSelectCategory = useCallback((categoryId: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    payload.onSelect(categoryId);
    onClose();
  }, [payload, onClose]);

  return (
    <View
      className="bg-white rounded-t-3xl"
      style={{
        maxHeight: SCREEN_HEIGHT * 0.85,
        paddingBottom: insets.bottom + 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      {/* Handle indicator */}
      <View className="items-center pt-3 pb-2">
        <View className="w-10 h-1 rounded-full bg-black/20" />
      </View>

      <View className="px-5 pt-2">
        {/* Header */}
        <View className="flex-row items-start justify-between mb-5">
          <View className="flex-1 mr-4">
            <Text
              className="text-[22px] font-bold text-neutral-900 mb-1"
              style={{ letterSpacing: -0.3 }}
            >
              {t('events.filterByCategory', 'Filter by Category')}
            </Text>
            <Text className="text-sm text-neutral-500">
              {t('events.selectCategoryDesc', 'Select a category to filter events')}
            </Text>
          </View>

          {/* Close button - 44px for finger-friendly touch */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center active:opacity-70"
          >
            <X size={20} color={Colors.neutral[600]} />
          </Pressable>
        </View>

        {/* All Categories Option */}
        <Pressable
          onPress={() => handleSelectCategory(null)}
          className={`flex-row items-center p-4 rounded-2xl border-2 gap-4 mb-3 ${
            payload.selectedCategory === null
              ? 'bg-blue-50 border-blue-500'
              : 'bg-neutral-50 border-transparent'
          }`}
        >
          <View
            className={`w-12 h-12 rounded-xl items-center justify-center ${
              payload.selectedCategory === null ? 'bg-blue-100' : 'bg-neutral-100'
            }`}
          >
            <Filter
              size={20}
              color={payload.selectedCategory === null ? Colors.primary[600] : Colors.neutral[400]}
            />
          </View>

          <View className="flex-1">
            <Text
              className={`text-base font-semibold ${
                payload.selectedCategory === null ? 'text-blue-700' : 'text-neutral-900'
              }`}
            >
              {t('events.allCategories', 'All Categories')}
            </Text>
            <Text className="text-[13px] text-neutral-500 mt-0.5">
              {t('events.showAllEvents', 'Show all events')}
            </Text>
          </View>

          {payload.selectedCategory === null && (
            <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
              <Check size={14} color={Colors.white} />
            </View>
          )}
        </Pressable>

        {/* Category List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={{ maxHeight: 400 }}
          contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        >
          {payload.categories.map((category) => {
            const isSelected = payload.selectedCategory === category.id;

            return (
              <Pressable
                key={category.id}
                onPress={() => handleSelectCategory(category.id)}
                className={`flex-row items-center p-4 rounded-2xl border-2 gap-4 ${
                  isSelected
                    ? 'bg-blue-50 border-blue-500'
                    : 'bg-neutral-50 border-transparent'
                }`}
              >
                <View
                  className={`w-12 h-12 rounded-xl items-center justify-center ${
                    isSelected ? 'bg-blue-100' : 'bg-neutral-100'
                  }`}
                >
                  <View
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: category.color || Colors.primary[500] }}
                  />
                </View>

                <View className="flex-1">
                  <Text
                    className={`text-base font-semibold ${
                      isSelected ? 'text-blue-700' : 'text-neutral-900'
                    }`}
                  >
                    {category.name}
                  </Text>
                </View>

                {isSelected && (
                  <View className="w-6 h-6 rounded-full bg-blue-500 items-center justify-center">
                    <Check size={14} color={Colors.white} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

export default CategoryFilterSheet;
