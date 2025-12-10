/**
 * Expo Router Type Augmentations
 *
 * Extends expo-router navigation types to support additional screen options
 * for optimized tab navigation performance.
 */

import 'expo-router';

declare module 'expo-router' {
  // Extend BottomTabNavigationOptions to include performance options
  interface BottomTabNavigationOptions {
    /**
     * Whether to show the header
     */
    headerShown?: boolean;

    /**
     * Animation type for screen transitions
     */
    animation?: 'none' | 'default' | 'fade' | 'flip' | 'simple_push' | 'slide_from_bottom' | 'slide_from_left' | 'slide_from_right' | string;

    /**
     * Duration of the animation in milliseconds
     * Set to 0 to disable animation for instant switching
     */
    animationDuration?: number;

    /**
     * Whether to lazily render screens
     */
    lazy?: boolean;

    /**
     * Whether to freeze screens when they lose focus
     */
    freezeOnBlur?: boolean;

    /**
     * Whether to unmount screens when they lose focus
     * Set to false to keep screens mounted for instant switching
     */
    unmountOnBlur?: boolean;
  }

  // Extend Tabs screen options
  interface TabsScreenOptions {
    headerShown?: boolean;
    animation?: string;
    animationDuration?: number;
    lazy?: boolean;
    freezeOnBlur?: boolean;
    unmountOnBlur?: boolean;
  }
}

// Also extend @react-navigation/bottom-tabs if needed
declare module '@react-navigation/bottom-tabs' {
  import { StyleProp, ViewStyle } from 'react-native';

  interface BottomTabNavigationOptions {
    headerShown?: boolean;
    animation?: string;
    animationDuration?: number;
    lazy?: boolean;
    freezeOnBlur?: boolean;
    unmountOnBlur?: boolean;
    sceneStyle?: StyleProp<ViewStyle>;
  }
}

export {};
