/**
 * OptimizedImage - High-performance image component
 *
 * A wrapper around expo-image with all performance optimizations:
 * - Memory + disk caching
 * - Proper content fitting
 * - Smooth loading transitions
 * - Placeholder support
 * - Error fallback
 * - Responsive sizing helpers
 */

import React, { memo, useMemo, useState, useCallback } from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { Image, ImageProps, ImageContentFit } from 'expo-image';
import { OPTIMIZED_IMAGE_PROPS, getResponsiveImageSize } from '@/utils/performance';

// ============================================================================
// TYPES
// ============================================================================

type ImageContext = 'thumbnail' | 'card' | 'hero' | 'avatar' | 'custom';

interface OptimizedImageProps extends Omit<ImageProps, 'source' | 'style'> {
  /**
   * Image URI
   */
  uri?: string | null;

  /**
   * Fallback image when uri is empty or fails to load
   */
  fallbackUri?: string;

  /**
   * Pre-defined size context for responsive sizing
   */
  context?: ImageContext;

  /**
   * Custom width (overrides context)
   */
  width?: number;

  /**
   * Custom height (overrides context)
   */
  height?: number;

  /**
   * Aspect ratio (width/height) - alternative to fixed height
   */
  aspectRatio?: number;

  /**
   * Border radius
   */
  borderRadius?: number;

  /**
   * Show placeholder while loading
   */
  showPlaceholder?: boolean;

  /**
   * Placeholder color
   */
  placeholderColor?: string;

  /**
   * How image should fit its container
   */
  contentFit?: ImageContentFit;

  /**
   * Container style
   */
  containerStyle?: StyleProp<ViewStyle>;

  /**
   * Called when image loads successfully
   */
  onLoad?: () => void;

  /**
   * Called when image fails to load
   */
  onError?: () => void;
}

// ============================================================================
// PLACEHOLDER COMPONENT
// ============================================================================

const Placeholder = memo(({ color, style }: { color: string; style: ViewStyle }) => (
  <View style={[style, { backgroundColor: color }]} />
));

Placeholder.displayName = 'ImagePlaceholder';

// ============================================================================
// BLURHASH PLACEHOLDERS (pre-computed for common scenarios)
// ============================================================================

const BLURHASH_PLACEHOLDERS = {
  // Soft blue-gray (default)
  default: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4',
  // Warm sunset
  warm: 'L4Qm%d%M_3xu-;j[IUof-;j[IUof',
  // Cool nature
  nature: 'LCEf#*IU00og~qM{t7Rj00WBxuof',
  // Portrait (skin tones)
  portrait: 'LBMkBn00_N4n%Mxu-;WB~qt7M{WB',
  // Abstract spiritual
  spiritual: 'L5H2EC=PM+yV0g%2.mRj009E%gRj',
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const OptimizedImage = memo(function OptimizedImage({
  uri,
  fallbackUri,
  context = 'card',
  width,
  height,
  aspectRatio,
  borderRadius = 0,
  showPlaceholder = true,
  placeholderColor = '#E5E7EB',
  contentFit = 'cover',
  containerStyle,
  onLoad,
  onError,
  ...restProps
}: OptimizedImageProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Calculate dimensions
  const dimensions = useMemo(() => {
    if (width && height) {
      return { width, height };
    }
    if (width && aspectRatio) {
      return { width, height: width / aspectRatio };
    }
    if (context !== 'custom') {
      return getResponsiveImageSize(context);
    }
    return { width: '100%' as any, height: 200 };
  }, [width, height, aspectRatio, context]);

  // Determine source
  const source = useMemo(() => {
    if (hasError && fallbackUri) {
      return { uri: fallbackUri };
    }
    if (!uri) {
      return fallbackUri ? { uri: fallbackUri } : undefined;
    }
    return { uri };
  }, [uri, fallbackUri, hasError]);

  // Handle load success
  const handleLoad = useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  // Handle load error
  const handleError = useCallback(() => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  }, [onError]);

  // Container style
  const computedContainerStyle = useMemo(
    () => [
      styles.container,
      dimensions,
      { borderRadius, overflow: 'hidden' as const },
      containerStyle,
    ],
    [dimensions, borderRadius, containerStyle]
  );

  // Image style
  const imageStyle = useMemo(
    () => ({
      width: '100%' as const,
      height: '100%' as const,
      borderRadius,
    }),
    [borderRadius]
  );

  // If no source available, show placeholder
  if (!source) {
    return (
      <View style={computedContainerStyle}>
        <View style={[styles.placeholder, { backgroundColor: placeholderColor }]} />
      </View>
    );
  }

  return (
    <View style={computedContainerStyle}>
      {/* Loading placeholder */}
      {isLoading && showPlaceholder && (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.placeholder,
            { backgroundColor: placeholderColor },
          ]}
        />
      )}

      {/* Main image */}
      <Image
        source={source}
        style={imageStyle}
        contentFit={contentFit}
        cachePolicy="memory-disk"
        transition={200}
        placeholder={BLURHASH_PLACEHOLDERS.default}
        placeholderContentFit="cover"
        onLoad={handleLoad}
        onError={handleError}
        {...restProps}
      />
    </View>
  );
});

// ============================================================================
// AVATAR VARIANT
// ============================================================================

interface AvatarProps {
  uri?: string | null;
  size?: number;
  name?: string;
  fallbackColor?: string;
}

export const OptimizedAvatar = memo(function OptimizedAvatar({
  uri,
  size = 48,
  name,
  fallbackColor = '#4A90D9',
}: AvatarProps) {
  const initials = useMemo(() => {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }, [name]);

  if (!uri) {
    return (
      <View
        style={[
          styles.avatarFallback,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: fallbackColor,
          },
        ]}
      >
        <View style={styles.avatarInitials}>
          {/* You would add Text component here for initials */}
        </View>
      </View>
    );
  }

  return (
    <OptimizedImage
      uri={uri}
      width={size}
      height={size}
      borderRadius={size / 2}
      contentFit="cover"
    />
  );
});

// ============================================================================
// HERO IMAGE VARIANT
// ============================================================================

interface HeroImageProps {
  uri?: string | null;
  aspectRatio?: number;
  gradient?: boolean;
  children?: React.ReactNode;
}

export const HeroImage = memo(function HeroImage({
  uri,
  aspectRatio = 16 / 9,
  gradient = false,
  children,
}: HeroImageProps) {
  return (
    <View style={styles.heroContainer}>
      <OptimizedImage
        uri={uri}
        context="custom"
        width={undefined}
        height={undefined}
        aspectRatio={aspectRatio}
        containerStyle={styles.heroImage}
      />
      {gradient && <View style={styles.heroGradient} />}
      {children && <View style={styles.heroContent}>{children}</View>}
    </View>
  );
});

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  placeholder: {
    flex: 1,
  },
  avatarFallback: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    // Style for initials text
  },
  heroContainer: {
    width: '100%',
    position: 'relative',
  },
  heroImage: {
    width: '100%',
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  heroContent: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    padding: 16,
  },
});

export default OptimizedImage;
