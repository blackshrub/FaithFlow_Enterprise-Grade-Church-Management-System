/**
 * Type augmentation for react-native-reanimated
 *
 * Fixes common type issues with Reanimated + NativeWind integration:
 * - sharedTransitionTag for shared element transitions
 * - className support from NativeWind
 * - children prop for Animated components
 * - entering/exiting animations
 * - View/Text/Image native props (numberOfLines, pointerEvents, etc.)
 */

import 'react-native-reanimated';
import { ReactNode } from 'react';
import {
  ViewStyle,
  TextStyle,
  ImageStyle,
  StyleProp,
  LayoutChangeEvent,
  AccessibilityRole,
  PointerEvent,
} from 'react-native';

declare module 'react-native-reanimated' {
  // Extend AnimatedProps to include all common props used with Animated components
  interface AnimatedProps<T> {
    // Shared element transitions
    sharedTransitionTag?: string;

    // NativeWind support
    className?: string;

    // React props
    children?: ReactNode;
    key?: string | number;

    // Reanimated animation props
    entering?: any;
    exiting?: any;
    layout?: any;

    // Style
    style?: StyleProp<ViewStyle | TextStyle | ImageStyle> | any;

    // View props
    pointerEvents?: 'box-none' | 'none' | 'box-only' | 'auto' | string;
    onLayout?: (event: LayoutChangeEvent) => void;
    testID?: string;
    accessibilityRole?: AccessibilityRole | string;
    accessibilityLabel?: string;

    // Text props
    numberOfLines?: number;
    ellipsizeMode?: 'head' | 'middle' | 'tail' | 'clip';
    selectable?: boolean;

    // Image props
    resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
    source?: any;
  }
}

// Augment React Native components to support sharedTransitionTag
declare module 'react-native' {
  interface ImageProps {
    sharedTransitionTag?: string;
  }

  interface ViewProps {
    sharedTransitionTag?: string;
  }
}
