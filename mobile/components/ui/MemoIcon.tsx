/**
 * MemoIcon - Memoized Icon Wrapper
 *
 * Wraps lucide-react-native icons with React.memo to prevent
 * unnecessary re-renders when icon props haven't changed.
 *
 * Usage:
 * ```tsx
 * import { MemoIcon } from '@/components/ui/MemoIcon';
 * import { Calendar } from 'lucide-react-native';
 *
 * <MemoIcon icon={Calendar} size={24} color="#000" />
 * ```
 */

import React, { memo, useMemo } from 'react';
import type { LucideIcon, LucideProps } from 'lucide-react-native';

// =============================================================================
// TYPES
// =============================================================================

export interface MemoIconProps extends Omit<LucideProps, 'ref'> {
  /** The Lucide icon component to render */
  icon: LucideIcon;
  /** Icon size (default: 24) */
  size?: number;
  /** Icon color */
  color?: string;
  /** Stroke width (default: 2) */
  strokeWidth?: number;
}

// =============================================================================
// COMPONENT
// =============================================================================

/**
 * Memoized icon component that prevents re-renders when props haven't changed.
 */
export const MemoIcon = memo(function MemoIcon({
  icon: Icon,
  size = 24,
  color,
  strokeWidth = 2,
  ...rest
}: MemoIconProps) {
  return <Icon size={size} color={color} strokeWidth={strokeWidth} {...rest} />;
});

// =============================================================================
// ICON SIZE PRESETS
// =============================================================================

export const IconSize = {
  xs: 14,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export type IconSizeKey = keyof typeof IconSize;

// =============================================================================
// PRESET ICONS (commonly used with fixed props)
// =============================================================================

/**
 * Creates a memoized icon with preset props
 */
export function createPresetIcon(
  Icon: LucideIcon,
  defaultProps: Partial<MemoIconProps> = {}
) {
  return memo(function PresetIcon(props: Partial<MemoIconProps>) {
    const mergedProps = { ...defaultProps, ...props };
    return <Icon {...mergedProps} />;
  });
}

// =============================================================================
// UTILITY: Icon with stable ref
// =============================================================================

/**
 * Hook to get a stable icon component reference
 * Use when passing icon as prop to memoized child components
 */
export function useStableIcon(Icon: LucideIcon) {
  return useMemo(() => Icon, [Icon]);
}

// =============================================================================
// ICON BUTTON WRAPPER
// =============================================================================

export interface MemoIconButtonProps extends MemoIconProps {
  /** Called when pressed */
  onPress?: () => void;
  /** Disabled state */
  disabled?: boolean;
  /** Hit slop for touch area */
  hitSlop?: number;
}

/**
 * Icon wrapped in a touchable area
 * Memoized to prevent re-renders
 */
export const MemoIconButton = memo(function MemoIconButton({
  icon: Icon,
  size = 24,
  color,
  strokeWidth = 2,
  onPress,
  disabled,
  hitSlop = 8,
  ...rest
}: MemoIconButtonProps) {
  const { Pressable } = require('react-native');
  const Haptics = require('expo-haptics');

  const handlePress = React.useCallback(() => {
    if (!disabled && onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress();
    }
  }, [disabled, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      hitSlop={hitSlop}
      style={({ pressed }: { pressed: boolean }) => ({
        opacity: pressed ? 0.7 : disabled ? 0.5 : 1,
      })}
    >
      <Icon size={size} color={color} strokeWidth={strokeWidth} {...rest} />
    </Pressable>
  );
});

export default MemoIcon;
