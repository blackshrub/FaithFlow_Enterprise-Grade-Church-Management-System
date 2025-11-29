/**
 * SearchHeader - Search Bar with Category Filter
 *
 * Combines SearchBar and category filter button.
 * Used at the top of the events list (static, doesn't scroll).
 */

import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Filter, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import { SearchBar } from './SearchBar';
import { spacing, radius } from '@/constants/spacing';

// Colors
const Colors = {
  gradient: {
    end: '#0f3460',
  },
  neutral: {
    100: '#f5f5f5',
    400: '#a3a3a3',
    800: '#262626',
  },
  white: '#ffffff',
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
    <View style={styles.container}>
      <SearchBar />
      {categories.length > 0 && (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onFilterPress();
          }}
          style={styles.filterBtn}
        >
          <Filter size={18} color={Colors.gradient.end} />
          <Text style={styles.filterText}>
            {selectedCategoryName || allCategoriesLabel}
          </Text>
          <ChevronRight size={18} color={Colors.neutral[400]} />
        </Pressable>
      )}
    </View>
  );
}

export const SearchHeader = memo(SearchHeaderComponent);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.ml,
    paddingTop: spacing.ml,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: radius.card,
    padding: spacing.sm,
    marginBottom: spacing.ml,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
    gap: spacing.s,
  },
  filterText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
});

export default SearchHeader;
