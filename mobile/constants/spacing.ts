/**
 * Spacing System v2
 *
 * Consistent spacing tokens for FaithFlow mobile app.
 * Use these instead of magic numbers for padding/margin values.
 *
 * Usage:
 * import { spacing } from '@/constants/spacing';
 * <View style={{ padding: spacing.m }}>
 */

export const spacing = {
  /** 6px - Extra small spacing for tight layouts */
  xs: 6,
  /** 10px - Small spacing for compact elements */
  s: 10,
  /** 12px - Small-medium spacing */
  sm: 12,
  /** 16px - Medium spacing (default) */
  m: 16,
  /** 20px - Medium-large spacing */
  ml: 20,
  /** 24px - Large spacing for sections */
  l: 24,
  /** 32px - Extra large spacing */
  xl: 32,
  /** 40px - Double extra large spacing */
  xxl: 40,
} as const;

/** Border radius tokens */
export const radius = {
  /** 8px - Small radius for badges, pills */
  s: 8,
  /** 12px - Medium radius for buttons, inputs */
  m: 12,
  /** 16px - Large radius for cards */
  l: 16,
  /** 18px - Premium card radius (V9 standard) */
  card: 18,
  /** 20px - Extra large radius */
  xl: 20,
  /** Full circle radius */
  full: 9999,
} as const;

export type Spacing = typeof spacing;
export type Radius = typeof radius;
