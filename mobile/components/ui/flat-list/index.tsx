'use client';
/**
 * FlatList Re-export
 *
 * Re-exports FlashList as FlatList for better performance.
 * FlashList is optimized for large lists with recycling.
 *
 * Note: FlashList does NOT support horizontal lists well.
 * For horizontal carousels, use FlatList from 'react-native' directly.
 */
export { FlashList as FlatList } from '@shopify/flash-list';
