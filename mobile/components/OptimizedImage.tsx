/**
 * OptimizedImage Component
 * Phase 9.1.3 - High-performance image component with progressive loading
 *
 * Features:
 * - Blur placeholder while loading
 * - Progressive loading (thumbnail → full)
 * - Automatic retry on failure
 * - Memory-efficient rendering
 * - Loading/error states
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Image as RNImage,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ImageStyle,
  ViewStyle,
  ImageSourcePropType,
} from 'react-native';
import {
  getOptimizedImageUri,
  getThumbnailUri,
  imageLoadManager,
  ImagePriority,
  IMAGE_SIZES,
  IMAGE_QUALITY,
  getMemoryEfficientProps,
  monitorImageLoad,
} from '@/utils/imageOptimization';

interface OptimizedImageProps {
  /** Image source URI */
  source: string | ImageSourcePropType;

  /** Image style */
  style?: ImageStyle;

  /** Container style */
  containerStyle?: ViewStyle;

  /** Size preset (determines resolution) */
  size?: keyof typeof IMAGE_SIZES;

  /** Quality (0-1) */
  quality?: number;

  /** Loading priority */
  priority?: ImagePriority;

  /** Show loading indicator */
  showLoading?: boolean;

  /** Progressive loading (thumbnail first) */
  progressive?: boolean;

  /** Blur hash for placeholder (future implementation) */
  blurHash?: string;

  /** Retry attempts on failure */
  retry?: number;

  /** Callback when image loads */
  onLoad?: () => void;

  /** Callback when image fails to load */
  onError?: (error: Error) => void;

  /** Callback when loading starts */
  onLoadStart?: () => void;

  /** Callback when loading ends */
  onLoadEnd?: () => void;

  /** Resize mode */
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';

  /** Accessibility label */
  accessibilityLabel?: string;

  /** Test ID */
  testID?: string;
}

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  source,
  style,
  containerStyle,
  size = 'medium',
  quality = IMAGE_QUALITY.medium,
  priority = ImagePriority.NORMAL,
  showLoading = true,
  progressive = true,
  blurHash,
  retry = 2,
  onLoad,
  onError,
  onLoadStart,
  onLoadEnd,
  resizeMode = 'cover',
  accessibilityLabel,
  testID,
}) => {
  const [loadState, setLoadState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [currentUri, setCurrentUri] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const loadStartTime = useRef<number>(0);

  // Extract URI from source
  const getUri = (): string | null => {
    if (typeof source === 'string') {
      return source;
    }
    if (typeof source === 'object' && 'uri' in source && source.uri) {
      return source.uri;
    }
    return null;
  };

  const sourceUri = getUri();

  useEffect(() => {
    if (!sourceUri) {
      setLoadState('error');
      return;
    }

    loadImage();

    return () => {
      // Cleanup
      fadeAnim.setValue(0);
    };
  }, [sourceUri, size, quality]);

  const loadImage = async () => {
    if (!sourceUri) return;

    try {
      setLoadState('loading');
      loadStartTime.current = Date.now();
      onLoadStart?.();

      imageLoadManager.startLoading(sourceUri);

      if (progressive && !sourceUri.startsWith('data:')) {
        // Load thumbnail first for remote images
        const thumbnailUri = getThumbnailUri(sourceUri);
        setCurrentUri(thumbnailUri);

        // Small delay to show thumbnail
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Load full resolution
      const optimizedUri = getOptimizedImageUri(sourceUri, size, quality);

      // Preload the image
      await RNImage.prefetch(optimizedUri);

      // Monitor load time
      monitorImageLoad(optimizedUri, loadStartTime.current);

      // Update to full resolution
      setCurrentUri(optimizedUri);
      setLoadState('loaded');

      imageLoadManager.finishLoading(sourceUri, true);

      // Fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      onLoad?.();
      onLoadEnd?.();

    } catch (error) {
      console.error('Image load error:', error);

      imageLoadManager.finishLoading(sourceUri, false);

      // Retry logic
      if (retryCount < retry) {
        setRetryCount(prev => prev + 1);
        // Exponential backoff
        setTimeout(() => loadImage(), 1000 * Math.pow(2, retryCount));
        return;
      }

      setLoadState('error');
      onError?.(error as Error);
      onLoadEnd?.();
    }
  };

  // Get memory-efficient props
  const memoryProps = getMemoryEfficientProps(size);

  const renderContent = () => {
    if (!sourceUri) {
      return <View style={[styles.placeholder, style]} />;
    }

    if (loadState === 'loading' && !currentUri) {
      return (
        <View style={[styles.loadingContainer, style]}>
          {showLoading && (
            <ActivityIndicator
              size="small"
              color="#999"
              accessibilityLabel="Loading image"
            />
          )}
        </View>
      );
    }

    if (loadState === 'error') {
      return (
        <View style={[styles.errorContainer, style]}>
          <View style={styles.errorIcon}>
            <View style={styles.errorIconInner} />
          </View>
        </View>
      );
    }

    return (
      <Animated.Image
        source={{ uri: currentUri || undefined }}
        style={[
          style,
          { opacity: fadeAnim },
        ]}
        resizeMode={resizeMode}
        accessibilityLabel={accessibilityLabel}
        testID={testID}
        {...memoryProps}
        onError={(error) => {
          console.error('Image render error:', error);
          if (retryCount < retry) {
            setRetryCount(prev => prev + 1);
            setTimeout(() => loadImage(), 1000);
          } else {
            setLoadState('error');
            onError?.(new Error('Failed to load image'));
          }
        }}
      />
    );
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
  loadingContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholder: {
    backgroundColor: '#f5f5f5',
  },
  errorContainer: {
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e0e0e0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorIconInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#999',
  },
});

/**
 * Optimized Image with Blurhash placeholder
 * Future enhancement - requires blurhash library
 */
interface OptimizedImageWithBlurProps extends OptimizedImageProps {
  blurHash?: string;
}

export const OptimizedImageWithBlur: React.FC<OptimizedImageWithBlurProps> = (props) => {
  // For now, same as OptimizedImage
  // In production, render blurhash as placeholder
  // using: https://github.com/woltapp/react-native-blurhash
  return <OptimizedImage {...props} />;
};

/**
 * Lazy-loaded Optimized Image
 * Only loads when visible in viewport
 */
interface LazyOptimizedImageProps extends OptimizedImageProps {
  /** Whether image is in viewport */
  isVisible: boolean;
}

export const LazyOptimizedImage: React.FC<LazyOptimizedImageProps> = ({
  isVisible,
  ...props
}) => {
  if (!isVisible) {
    // Render placeholder until visible
    return (
      <View style={[styles.placeholder, props.style]} />
    );
  }

  return <OptimizedImage {...props} />;
};

export default OptimizedImage;
