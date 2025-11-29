/**
 * OptimizedList - High-performance list component using FlashList
 *
 * A wrapper around @shopify/flash-list with all performance optimizations pre-configured.
 * FlashList is 10x faster than FlatList for large lists.
 *
 * Features:
 * - Uses FlashList for 10x better performance
 * - Pre-configured performance props
 * - Built-in loading states
 * - Pull-to-refresh support
 * - Empty state handling
 * - Automatic keyExtractor
 * - Item separator support
 */

import React, { useCallback, useMemo, memo, forwardRef, Ref } from 'react';
import {
  View,
  Text,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  ViewStyle,
} from 'react-native';
import { FlashList, ListRenderItem } from '@shopify/flash-list';
import type { StyleProp, ViewStyle as ContentStyle } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

interface OptimizedListProps<T> {
  /**
   * Data array to render
   */
  data: readonly T[] | null | undefined;

  /**
   * Render function for each item (required)
   */
  renderItem: ListRenderItem<T>;

  /**
   * Unique key field in your data items (default: 'id')
   */
  keyField?: keyof T | string;

  /**
   * Estimated item height for FlashList optimization (required for best performance)
   */
  estimatedItemSize?: number;

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
   * Style for the container
   */
  containerStyle?: ViewStyle;

  /**
   * Content container style
   */
  contentContainerStyle?: ContentStyle;

  /**
   * Draw distance for virtualization (default: 250)
   * Lower values = less memory, higher values = smoother scrolling
   */
  drawDistance?: number;

  /**
   * Called when scroll reaches end
   */
  onEndReached?: () => void;

  /**
   * How far from end to trigger onEndReached
   */
  onEndReachedThreshold?: number;

  /**
   * Header component
   */
  ListHeaderComponent?: React.ComponentType | React.ReactElement | null;

  /**
   * Footer component
   */
  ListFooterComponent?: React.ComponentType | React.ReactElement | null;

  /**
   * Item separator component
   */
  ItemSeparatorComponent?: React.ComponentType | null;

  /**
   * Extra data to trigger re-renders
   */
  extraData?: any;

  /**
   * Number of columns for grid layout
   */
  numColumns?: number;

  /**
   * Horizontal scrolling
   */
  horizontal?: boolean;

  /**
   * Inverted list (for chat)
   */
  inverted?: boolean;
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
// MAIN COMPONENT
// ============================================================================

function OptimizedListInner<T>(
  props: OptimizedListProps<T>,
  ref: Ref<typeof FlashList<T>>
) {
  const {
    data,
    renderItem,
    keyField = 'id',
    estimatedItemSize = 100,
    isLoading = false,
    isRefreshing = false,
    onRefresh,
    emptyText = 'No items found',
    EmptyComponent,
    containerStyle,
    contentContainerStyle,
    drawDistance = 250,
    onEndReached,
    onEndReachedThreshold = 0.5,
    ListHeaderComponent,
    ListFooterComponent,
    ItemSeparatorComponent,
    extraData,
    numColumns,
    horizontal,
    inverted,
  } = props;

  // Create stable keyExtractor
  const keyExtractor = useCallback(
    (item: T, index: number) => {
      if (typeof item === 'object' && item !== null) {
        const key = (item as Record<string, unknown>)[keyField as string];
        return key !== undefined ? String(key) : `item-${index}`;
      }
      return `item-${index}`;
    },
    [keyField]
  );

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

  return (
    <FlashList<T>
      ref={ref}
      data={data}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      estimatedItemSize={estimatedItemSize}
      ListEmptyComponent={ListEmptyComponent}
      refreshControl={refreshControl}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
      drawDistance={drawDistance}
      contentContainerStyle={contentContainerStyle}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ItemSeparatorComponent={ItemSeparatorComponent}
      extraData={extraData}
      numColumns={numColumns}
      horizontal={horizontal}
      inverted={inverted}
    />
  );
}

// Forward ref with proper typing using a type assertion
export const OptimizedList = forwardRef(OptimizedListInner) as <T>(
  props: OptimizedListProps<T> & { ref?: Ref<typeof FlashList<T>> }
) => React.ReactElement | null;

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
