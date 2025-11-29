/**
 * CategoryFilterSheet - Unified Overlay System
 *
 * Bottom sheet for filtering events by category.
 * Used via: overlay.showBottomSheet(CategoryFilterSheet, payload)
 *
 * Features:
 * - Full-height bottom sheet with edge-to-edge design
 * - Large close button (44px)
 * - Safe area handling
 * - Smooth sheet animation
 */

import React, { useCallback } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { X, Filter, Check } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { OverlayComponentProps } from '@/stores/overlayStore';
import type { CategoryFilterPayload } from '@/stores/overlayStore';
import { Text } from '@/components/ui/text';
import { spacing, radius } from '@/constants/spacing';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium colors - consistent with app theme
const Colors = {
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
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
    <View style={[styles.sheetCard, { paddingBottom: insets.bottom + 12 }]}>
      {/* Handle indicator */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <View style={styles.sheetContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>
              {t('events.filterByCategory', 'Filter by Category')}
            </Text>
            <Text style={styles.headerSubtitle}>
              {t('events.selectCategoryDesc', 'Select a category to filter events')}
            </Text>
          </View>

          {/* Close button - 44px for finger-friendly touch */}
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            style={styles.closeButton}
          >
            <X size={20} color={Colors.neutral[600]} />
          </Pressable>
        </View>

        {/* All Categories Option */}
        <Pressable
          onPress={() => handleSelectCategory(null)}
          style={[
            styles.categoryItem,
            payload.selectedCategory === null && styles.categoryItemSelected,
          ]}
        >
          <View style={[
            styles.categoryIcon,
            payload.selectedCategory === null && styles.categoryIconSelected,
          ]}>
            <Filter
              size={20}
              color={payload.selectedCategory === null ? Colors.primary[600] : Colors.neutral[400]}
            />
          </View>

          <View style={styles.categoryContent}>
            <Text style={[
              styles.categoryName,
              payload.selectedCategory === null && styles.categoryNameSelected,
            ]}>
              {t('events.allCategories', 'All Categories')}
            </Text>
            <Text style={styles.categoryHint}>
              {t('events.showAllEvents', 'Show all events')}
            </Text>
          </View>

          {payload.selectedCategory === null && (
            <View style={styles.checkIcon}>
              <Check size={14} color={Colors.white} />
            </View>
          )}
        </Pressable>

        {/* Category List */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          style={styles.categoryList}
          contentContainerStyle={styles.categoryListContent}
        >
          {payload.categories.map((category) => {
            const isSelected = payload.selectedCategory === category.id;

            return (
              <Pressable
                key={category.id}
                onPress={() => handleSelectCategory(category.id)}
                style={[
                  styles.categoryItem,
                  isSelected && styles.categoryItemSelected,
                ]}
              >
                <View style={[
                  styles.categoryIcon,
                  isSelected && styles.categoryIconSelected,
                ]}>
                  <View
                    style={[
                      styles.categoryDot,
                      { backgroundColor: category.color || Colors.primary[500] },
                    ]}
                  />
                </View>

                <View style={styles.categoryContent}>
                  <Text style={[
                    styles.categoryName,
                    isSelected && styles.categoryNameSelected,
                  ]}>
                    {category.name}
                  </Text>
                </View>

                {isSelected && (
                  <View style={styles.checkIcon}>
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

const styles = StyleSheet.create({
  sheetCard: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  sheetContent: {
    paddingHorizontal: spacing.ml,
    paddingTop: spacing.s,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: spacing.l,
  },
  headerText: {
    flex: 1,
    marginRight: spacing.m,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.neutral[900],
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryList: {
    maxHeight: 400,
  },
  categoryListContent: {
    gap: spacing.sm,
    paddingBottom: spacing.m,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.m,
    borderRadius: radius.card,
    backgroundColor: Colors.neutral[50],
    borderWidth: 2,
    borderColor: 'transparent',
    gap: spacing.m,
  },
  categoryItemSelected: {
    backgroundColor: Colors.primary[50],
    borderColor: Colors.primary[500],
  },
  categoryIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.l,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconSelected: {
    backgroundColor: Colors.primary[100],
  },
  categoryDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  categoryContent: {
    flex: 1,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  categoryNameSelected: {
    color: Colors.primary[700],
  },
  categoryHint: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  checkIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default CategoryFilterSheet;
