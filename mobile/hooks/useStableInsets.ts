/**
 * useStableInsets - Stable Safe Area Insets Hook
 *
 * Returns safe area insets that are captured once at mount and never change.
 * This prevents layout flicker caused by insets updating during render.
 *
 * Use this for headers and fixed elements where you want stable positioning.
 *
 * Usage:
 * ```tsx
 * const insets = useStableInsets();
 * // insets.top, insets.bottom, etc. won't change after initial mount
 * ```
 */

import { useRef } from 'react';
import { useSafeAreaInsets, EdgeInsets } from 'react-native-safe-area-context';

/**
 * Returns safe area insets that are captured once at mount.
 * Prevents flicker from insets changing during render.
 */
export function useStableInsets(): EdgeInsets {
  const insets = useSafeAreaInsets();
  const stableInsets = useRef<EdgeInsets>(insets);

  // Capture insets on first render only
  // Don't update on subsequent renders to prevent flicker

  return stableInsets.current;
}

/**
 * Returns safe area insets that update only when significantly different.
 * Use this when you need to respond to orientation changes but want
 * to avoid minor fluctuations.
 *
 * @param threshold - Minimum change in pixels to trigger update (default: 10)
 */
export function useThrottledInsets(threshold: number = 10): EdgeInsets {
  const insets = useSafeAreaInsets();
  const stableInsets = useRef<EdgeInsets>(insets);

  // Only update if difference exceeds threshold
  const shouldUpdate =
    Math.abs(insets.top - stableInsets.current.top) > threshold ||
    Math.abs(insets.bottom - stableInsets.current.bottom) > threshold ||
    Math.abs(insets.left - stableInsets.current.left) > threshold ||
    Math.abs(insets.right - stableInsets.current.right) > threshold;

  if (shouldUpdate) {
    stableInsets.current = insets;
  }

  return stableInsets.current;
}

/**
 * Returns just the top inset, stable after mount.
 * Most common use case for headers.
 */
export function useStableTopInset(): number {
  const insets = useSafeAreaInsets();
  const stableTop = useRef(insets.top);
  return stableTop.current;
}

/**
 * Returns just the bottom inset, stable after mount.
 * Most common use case for tab bars and floating buttons.
 */
export function useStableBottomInset(): number {
  const insets = useSafeAreaInsets();
  const stableBottom = useRef(insets.bottom);
  return stableBottom.current;
}

export default useStableInsets;
