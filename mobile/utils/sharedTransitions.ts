/**
 * Shared Element Transition Utilities
 *
 * Provides consistent shared element transitions across the app using
 * Reanimated's sharedTransitionTag feature with Expo Router.
 *
 * IMPORTANT: expo-image is NOT compatible with sharedTransitionTag.
 * We must use React Native's standard Image component for shared transitions.
 * See: https://github.com/expo/expo/issues/23407
 *
 * Usage:
 * 1. Use AnimatedImage instead of regular Image/expo-image
 * 2. Add sharedTransitionTag={tags.devotionImage(id)} to source
 * 3. Add same tag to destination detail screen
 */

import { Image } from 'react-native';
import Animated from 'react-native-reanimated';

/**
 * AnimatedImage - For shared element transitions
 * Uses React Native Image (NOT expo-image) as expo-image doesn't support sharedTransitionTag
 */
export const AnimatedImage = Animated.createAnimatedComponent(Image);

/**
 * Tag generators for shared element transitions
 * Use these to ensure consistent tag naming across cards and detail screens
 */
export const sharedTags = {
  // Explore - Devotion
  devotionImage: (id: string) => `devotion-image-${id}`,
  devotionTitle: (id: string) => `devotion-title-${id}`,

  // Explore - Bible Figure
  figureImage: (id: string) => `figure-image-${id}`,
  figureName: (id: string) => `figure-name-${id}`,

  // Explore - Bible Study
  studyImage: (id: string) => `study-image-${id}`,
  studyTitle: (id: string) => `study-title-${id}`,

  // Events
  eventImage: (id: string) => `event-image-${id}`,
  eventTitle: (id: string) => `event-title-${id}`,

  // Give - Offering type icons
  offeringIcon: (type: string) => `offering-icon-${type}`,
  offeringLabel: (type: string) => `offering-label-${type}`,
};

/**
 * Alias for backward compatibility
 */
export const tags = sharedTags;

export default {
  AnimatedImage,
  sharedTags,
  tags,
};
