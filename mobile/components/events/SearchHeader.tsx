/**
 * SearchHeader - Search Bar with Category Filter
 *
 * Combines SearchBar and category filter button.
 * Used at the top of the events list (static, doesn't scroll).
 * Styling: NativeWind-first with inline style for shadows/spacing constants
 */

import React, { memo } from 'react';
import { View, Text, Pressable } from 'react-native';
import { Filter, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { SearchBar } from './SearchBar';
import { spacing, radius } from '@/constants/spacing';

// Colors (for icon colors only)
const Colors = {
  gradientEnd: '#0f3460',
  neutral400: '#a3a3a3',
};

interface EventCategory {
  id: string;
  name: string;
  color?: string;
}

interface SearchHeaderProps {
  /** Available categories */
  categories: EventCategory[];
  /** Currently selected category ID */
  selectedCategory: string | null;
  /** Handler for filter button press */
  onFilterPress: () => void;
  /** Translation function for "All Categories" label */
  allCategoriesLabel: string;
}

function SearchHeaderComponent({
  categories,
  selectedCategory,
  onFilterPress,
  allCategoriesLabel,
}: SearchHeaderProps) {
  const selectedCategoryName = selectedCategory
    ? categories.find((c) => c.id === selectedCategory)?.name
    : null;

  return (
    <View style={{ paddingHorizontal: spacing.ml, paddingTop: spacing.ml }}>
      <SearchBar />
      {categories.length > 0 && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onFilterPress();
          }}
          className="flex-row items-center bg-white"
          style={{
            borderRadius: radius.card,
            padding: spacing.sm,
            marginBottom: spacing.ml,
            gap: spacing.s,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.04,
            shadowRadius: 8,
            elevation: 2,
          }}
          accessible
          accessibilityRole="button"
          accessibilityLabel={selectedCategoryName ? `Filter by ${selectedCategoryName}` : allCategoriesLabel}
        >
          <Filter size={18} color={Colors.gradientEnd} />
          <Text className="flex-1 text-[15px] font-semibold text-neutral-800">
            {selectedCategoryName || allCategoriesLabel}
          </Text>
          <ChevronRight size={18} color={Colors.neutral400} />
        </Pressable>
      )}
    </View>
  );
}

export const SearchHeader = memo(SearchHeaderComponent);

export default SearchHeader;
