/**
 * OptimizedList - High-performance list component
 *
 * A wrapper around FlatList with all performance optimizations pre-configured.
 * Use this instead of FlatList for lists with 20+ items.
 *
 * Features:
 * - Pre-configured performance props
 * - Built-in loading states
 * - Pull-to-refresh support
 * - Empty state handling
 * - Automatic keyExtractor
 * - Item separator support
 */

import React, { useCallback, useMemo, memo } from 'react';
import {
  FlatList,
  FlatListProps,
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
  ViewStyle,
} from 'react-native';
import {
  FLATLIST_PERFORMANCE_PROPS,
  LARGE_LIST_PROPS,
  IMAGE_LIST_PROPS,
  createGetItemLayout,
} from '@/utils/performance';

// ============================================================================
// TYPES
// ============================================================================

interface OptimizedListProps<T> extends Omit<FlatListProps<T>, 'keyExtractor'> {
  /**
   * Unique key field in your data items (default: 'id')
   */
  keyField?: keyof T | string;

  /**
   * Fixed item height for optimal scroll performance.
   * If provided, enables getItemLayout optimization.
   */
  itemHeight?: number;

  /**
   * Height of separator between items
   */
  separatorHeight?: number;

  /**
   * Loading state - shows spinner
   */
  isLoading?: boolean;

  /**
   * Refreshing state - for pull-to-refresh
   */
  isRefreshing?: boolean;

  /**
   * Callback for pull-to-refresh
   */
  onRefresh?: () => void;

  /**
   * Text to show when list is empty
   */
  emptyText?: string;

  /**
   * Component to show when list is empty
   */
  EmptyComponent?: React.ComponentType;

  /**
   * Performance mode:
   * - 'default': Standard optimization (most cases)
   * - 'large': For 100+ items
   * - 'images': For image-heavy lists
   */
  performanceMode?: 'default' | 'large' | 'images';

  /**
   * Style for the container
   */
  containerStyle?: ViewStyle;
}

// ============================================================================
// DEFAULT EMPTY COMPONENT
// ============================================================================

const DefaultEmptyComponent = memo(({ text }: { text: string }) => (
  <View style={styles.emptyContainer}>
    <Text style={styles.emptyText}>{text}</Text>
  </View>
));

DefaultEmptyComponent.displayName = 'DefaultEmptyComponent';

// ============================================================================
// DEFAULT LOADING COMPONENT
// ============================================================================

const LoadingComponent = memo(() => (
  <View style={styles.loadingContainer}>
    <ActivityIndicator size="large" color="#4A90D9" />
  </View>
));

LoadingComponent.displayName = 'LoadingComponent';

// ============================================================================
// ITEM SEPARATOR
// ============================================================================

const ItemSeparator = memo(({ height }: { height: number }) => (
  <View style={{ height }} />
));

ItemSeparator.displayName = 'ItemSeparator';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function OptimizedListInner<T extends Record<string, any>>(
  props: OptimizedListProps<T>,
  ref: React.Ref<FlatList<T>>
) {
  const {
    data,
    keyField = 'id',
    itemHeight,
    separatorHeight = 0,
    isLoading = false,
    isRefreshing = false,
    onRefresh,
    emptyText = 'No items found',
    EmptyComponent,
    performanceMode = 'default',
    containerStyle,
    ...restProps
  } = props;

  // Select performance props based on mode
  const performanceProps = useMemo(() => {
    switch (performanceMode) {
      case 'large':
        return LARGE_LIST_PROPS;
      case 'images':
        return IMAGE_LIST_PROPS;
      default:
        return FLATLIST_PERFORMANCE_PROPS;
    }
  }, [performanceMode]);

  // Create stable keyExtractor
  const keyExtractor = useCallback(
    (item: T, index: number) => {
      const key = item[keyField as keyof T];
      return key !== undefined ? String(key) : `item-${index}`;
    },
    [keyField]
  );

  // Create getItemLayout if itemHeight is provided
  const getItemLayout = useMemo(() => {
    if (!itemHeight) return undefined;
    const totalHeight = itemHeight + separatorHeight;
    return (_data: T[] | null | undefined, index: number) => ({
      length: totalHeight,
      offset: totalHeight * index,
      index,
    });
  }, [itemHeight, separatorHeight]);

  // Create stable separator component
  const ItemSeparatorComponent = useMemo(() => {
    if (separatorHeight <= 0) return undefined;
    return () => <ItemSeparator height={separatorHeight} />;
  }, [separatorHeight]);

  // Create empty component
  const ListEmptyComponent = useMemo(() => {
    if (isLoading) return <LoadingComponent />;
    if (EmptyComponent) return <EmptyComponent />;
    return <DefaultEmptyComponent text={emptyText} />;
  }, [isLoading, EmptyComponent, emptyText]);

  // Create refresh control
  const refreshControl = useMemo(() => {
    if (!onRefresh) return undefined;
    return (
      <RefreshControl
        refreshing={isRefreshing}
        onRefresh={onRefresh}
        tintColor="#4A90D9"
        colors={['#4A90D9']}
      />
    );
  }, [onRefresh, isRefreshing]);

  // Don't render list if loading initial data
  if (isLoading && (!data || data.length === 0)) {
    return (
      <View style={[styles.container, containerStyle]}>
        <LoadingComponent />
      </View>
    );
  }

  // Build props object to avoid overload issues
  const flatListProps = {
    ref,
    data,
    keyExtractor,
    ...(getItemLayout ? { getItemLayout } : {}),
    ItemSeparatorComponent,
    ListEmptyComponent,
    refreshControl,
    showsVerticalScrollIndicator: false,
    ...performanceProps,
    ...restProps,
  };

  return <FlatList<T> {...(flatListProps as any)} />;
}

// Forward ref with proper typing
export const OptimizedList = React.forwardRef(OptimizedListInner) as <
  T extends Record<string, any>
>(
  props: OptimizedListProps<T> & { ref?: React.Ref<FlatList<T>> }
) => React.ReactElement;

// ============================================================================
// VIRTUALIZED SECTION LIST (for grouped data)
// ============================================================================

interface OptimizedSectionListProps<T> {
  sections: Array<{ title: string; data: T[] }>;
  renderItem: (info: { item: T; index: number; section: { title: string; data: T[] } }) => React.ReactElement;
  renderSectionHeader?: (info: { section: { title: string; data: T[] } }) => React.ReactElement;
  keyField?: keyof T | string;
  itemHeight?: number;
  sectionHeaderHeight?: number;
  isLoading?: boolean;
  emptyText?: string;
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default OptimizedList;
