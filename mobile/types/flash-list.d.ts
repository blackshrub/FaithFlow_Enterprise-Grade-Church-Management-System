/**
 * FlashList Type Augmentations
 *
 * Extends FlashList types to support legacy props for migration compatibility.
 */

import '@shopify/flash-list';

declare module '@shopify/flash-list' {
  interface FlashListProps<T> {
    /**
     * Estimated item size for performance optimization
     * @deprecated In FlashList v2, this is calculated automatically
     */
    estimatedItemSize?: number;
  }
}

export {};
