/**
 * MediaGallery Component
 *
 * Custom lightweight gallery viewer using Reanimated 4 + Gesture Handler.
 * Features:
 * - Pinch-to-zoom (up to 5x)
 * - Double-tap to zoom
 * - Pan gestures when zoomed
 * - Swipe between images
 * - Swipe down to close
 * - 120Hz smooth animations
 * - Grid view of all media
 * - Video playback support
 * - Download/share media
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Pressable,
  StyleSheet,
  Dimensions,
  Modal,
  StatusBar,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
  useAnimatedReaction,
} from 'react-native-reanimated';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { FlashList } from '@shopify/flash-list';
import {
  X,
  Download,
  Share2,
  ChevronLeft,
  ChevronRight,
  Play,
  Pause,
  Image as ImageIcon,
  Video,
  FileText,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface MediaItem {
  id: string;
  uri: string;
  type: 'image' | 'video' | 'document';
  thumbnail_uri?: string;
  width?: number;
  height?: number;
  duration?: number;
  file_name?: string;
  file_size?: number;
  sender_name?: string;
  created_at?: string;
}

interface MediaGalleryProps {
  media: MediaItem[];
  initialIndex?: number;
  visible: boolean;
  onClose: () => void;
  communityName?: string;
}

interface MediaGridProps {
  media: MediaItem[];
  onItemPress: (index: number) => void;
  columns?: number;
}

interface ZoomableImageProps {
  uri: string;
  onSwipeDown: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_SCALE = 1;
const MAX_SCALE = 5;
const SWIPE_THRESHOLD = 100;
const SPRING_CONFIG = { damping: 15, stiffness: 150, mass: 0.5 };

// =============================================================================
// ZOOMABLE IMAGE (with pinch, double-tap, pan gestures)
// =============================================================================

function ZoomableImage({
  uri,
  onSwipeDown,
  onSwipeLeft,
  onSwipeRight,
}: ZoomableImageProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const focalX = useSharedValue(0);
  const focalY = useSharedValue(0);

  // Reset on image change
  React.useEffect(() => {
    scale.value = withSpring(1, SPRING_CONFIG);
    savedScale.value = 1;
    translateX.value = withSpring(0, SPRING_CONFIG);
    translateY.value = withSpring(0, SPRING_CONFIG);
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [uri]);

  // Pinch gesture
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.min(
        Math.max(savedScale.value * e.scale, MIN_SCALE),
        MAX_SCALE
      );
    })
    .onEnd(() => {
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE, SPRING_CONFIG);
        savedScale.value = MIN_SCALE;
      } else if (scale.value > MAX_SCALE) {
        scale.value = withSpring(MAX_SCALE, SPRING_CONFIG);
        savedScale.value = MAX_SCALE;
      } else {
        savedScale.value = scale.value;
      }
    });

  // Double tap gesture
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onStart((e) => {
      focalX.value = e.x;
      focalY.value = e.y;
    })
    .onEnd(() => {
      if (scale.value > 1) {
        // Reset to normal
        scale.value = withSpring(1, SPRING_CONFIG);
        savedScale.value = 1;
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        // Zoom to 2.5x centered on tap
        const newScale = 2.5;
        const centerX = SCREEN_WIDTH / 2;
        const centerY = SCREEN_HEIGHT / 2;
        const offsetX = (centerX - focalX.value) * (newScale - 1);
        const offsetY = (centerY - focalY.value) * (newScale - 1);

        scale.value = withSpring(newScale, SPRING_CONFIG);
        savedScale.value = newScale;
        translateX.value = withSpring(offsetX, SPRING_CONFIG);
        translateY.value = withSpring(offsetY, SPRING_CONFIG);
        savedTranslateX.value = offsetX;
        savedTranslateY.value = offsetY;
      }
    });

  // Pan gesture
  const panGesture = Gesture.Pan()
    .averageTouches(true)
    .onUpdate((e) => {
      if (scale.value > 1) {
        // When zoomed, pan the image
        translateX.value = savedTranslateX.value + e.translationX;
        translateY.value = savedTranslateY.value + e.translationY;
      } else {
        // When not zoomed, track for swipe gestures
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      }
    })
    .onEnd((e) => {
      if (scale.value > 1) {
        // Clamp pan to image bounds
        const maxX = (SCREEN_WIDTH * (scale.value - 1)) / 2;
        const maxY = (SCREEN_HEIGHT * (scale.value - 1)) / 2;

        translateX.value = withSpring(
          Math.min(Math.max(translateX.value, -maxX), maxX),
          SPRING_CONFIG
        );
        translateY.value = withSpring(
          Math.min(Math.max(translateY.value, -maxY), maxY),
          SPRING_CONFIG
        );
        savedTranslateX.value = translateX.value;
        savedTranslateY.value = translateY.value;
      } else {
        // Check for swipe gestures
        const velocityX = Math.abs(e.velocityX);
        const velocityY = Math.abs(e.velocityY);

        if (e.translationY > SWIPE_THRESHOLD && velocityY > velocityX) {
          // Swipe down to close
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
          runOnJS(onSwipeDown)();
        } else if (e.translationX < -SWIPE_THRESHOLD && velocityX > velocityY && onSwipeLeft) {
          // Swipe left for next
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          runOnJS(onSwipeLeft)();
        } else if (e.translationX > SWIPE_THRESHOLD && velocityX > velocityY && onSwipeRight) {
          // Swipe right for previous
          runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Light);
          runOnJS(onSwipeRight)();
        }

        // Reset position
        translateX.value = withSpring(0, SPRING_CONFIG);
        translateY.value = withSpring(0, SPRING_CONFIG);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const composed = Gesture.Race(
    Gesture.Simultaneous(pinchGesture, panGesture),
    doubleTapGesture
  );

  const animatedStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      translateY.value,
      [-200, 0, 200],
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    );

    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { scale: scale.value },
      ],
      opacity: scale.value > 1 ? 1 : opacity,
    };
  });

  return (
    <GestureDetector gesture={composed}>
      <Animated.View
        className="justify-center items-center"
        style={[{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }, animatedStyle]}
      >
        <Image
          source={{ uri }}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
          contentFit="contain"
          transition={200}
        />
      </Animated.View>
    </GestureDetector>
  );
}

// =============================================================================
// VIDEO PLAYER
// =============================================================================

interface VideoPlayerProps {
  uri: string;
  onSwipeDown: () => void;
}

function VideoPlayerComponent({ uri, onSwipeDown }: VideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
  });
  const [isPlaying, setIsPlaying] = useState(false);

  const translateY = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      translateY.value = e.translationY;
    })
    .onEnd((e) => {
      if (e.translationY > SWIPE_THRESHOLD) {
        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
        runOnJS(onSwipeDown)();
      }
      translateY.value = withSpring(0, SPRING_CONFIG);
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: interpolate(
      translateY.value,
      [-200, 0, 200],
      [0.5, 1, 0.5],
      Extrapolation.CLAMP
    ),
  }));

  const togglePlayback = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isPlaying) {
      player.pause();
    } else {
      player.play();
    }
    setIsPlaying(!isPlaying);
  }, [isPlaying, player]);

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        className="justify-center items-center"
        style={[{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }, animatedStyle]}
      >
        <VideoView
          player={player}
          style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT * 0.7 }}
          contentFit="contain"
          nativeControls={true}
        />
        <Pressable
          style={StyleSheet.absoluteFillObject}
          className="justify-center items-center"
          onPress={togglePlayback}
        >
          {!isPlaying && (
            <View
              className="justify-center items-center"
              style={{ width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <Icon as={Play} size="3xl" style={{ color: '#FFFFFF' }} />
            </View>
          )}
        </Pressable>
      </Animated.View>
    </GestureDetector>
  );
}

// =============================================================================
// MEDIA GRID VIEW
// =============================================================================

export function MediaGrid({ media, onItemPress, columns = 3 }: MediaGridProps) {
  const itemSize = (SCREEN_WIDTH - 4 * (columns + 1)) / columns;

  const renderItem = useCallback(
    ({ item, index }: { item: MediaItem; index: number }) => {
      const isVideo = item.type === 'video';
      const isDocument = item.type === 'document';

      return (
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onItemPress(index);
          }}
          className="rounded overflow-hidden"
          style={{ width: itemSize, height: itemSize, margin: 2, backgroundColor: colors.gray[100] }}
        >
          {isDocument ? (
            <View className="w-full h-full justify-center items-center p-2" style={{ backgroundColor: colors.gray[100] }}>
              <Icon as={FileText} size="xl" style={{ color: colors.gray[400] }} />
              <Text className="text-[10px] text-center mt-1" style={{ color: colors.gray[600] }} numberOfLines={1}>
                {item.file_name}
              </Text>
            </View>
          ) : (
            <Image
              source={{ uri: item.thumbnail_uri || item.uri }}
              className="w-full h-full"
              contentFit="cover"
              transition={100}
            />
          )}
          {isVideo && (
            <View
              className="absolute bottom-1 left-1 flex-row items-center rounded px-1 py-0.5"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <Icon as={Play} size="sm" style={{ color: '#FFFFFF' }} />
              {item.duration && (
                <Text className="text-[10px] text-white ml-0.5">
                  {Math.floor(item.duration / 60)}:{String(Math.floor(item.duration % 60)).padStart(2, '0')}
                </Text>
              )}
            </View>
          )}
        </Pressable>
      );
    },
    [itemSize, onItemPress]
  );

  return (
    <View className="flex-1" style={{ minHeight: 200 }}>
      <FlashList
        data={media}
        renderItem={renderItem}
        numColumns={columns}
        estimatedItemSize={itemSize}
        keyExtractor={(item: MediaItem) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 4 }}
      />
    </View>
  );
}

// =============================================================================
// FULL SCREEN GALLERY VIEWER
// =============================================================================

export function MediaGalleryViewer({
  media,
  initialIndex = 0,
  visible,
  onClose,
  communityName,
}: MediaGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const currentItem = media[currentIndex];

  // Reset index when opening
  React.useEffect(() => {
    if (visible) {
      setCurrentIndex(initialIndex);
    }
  }, [visible, initialIndex]);

  const handleNext = useCallback(() => {
    if (currentIndex < media.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, media.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  }, [currentIndex]);

  const handleDownload = useCallback(async () => {
    if (!currentItem) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Request permission
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        return;
      }

      // Download to local
      const fileUri = (FileSystem.documentDirectory || '') + (currentItem.file_name || 'media');
      const downloadResult = await FileSystem.downloadAsync(currentItem.uri, fileUri);

      // Save to media library
      await MediaLibrary.saveToLibraryAsync(downloadResult.uri);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Download failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  }, [currentItem]);

  const handleShare = useCallback(async () => {
    if (!currentItem) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(currentItem.uri);
      }
    } catch (error) {
      console.error('Share failed:', error);
    }
  }, [currentItem]);

  if (!visible || !currentItem) return null;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent={false}
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <StatusBar hidden />
      <GestureHandlerRootView className="flex-1 bg-black">
        {/* Header */}
        <View
          className="absolute top-0 left-0 right-0 flex-row items-center justify-between px-4 pb-3"
          style={{
            zIndex: 10,
            paddingTop: Platform.OS === 'ios' ? 50 : 20,
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <Pressable onPress={onClose} className="p-2">
            <Icon as={X} size="lg" style={{ color: '#FFFFFF' }} />
          </Pressable>

          <View className="flex-1 items-center">
            <Text className="text-base font-semibold text-white">
              {currentIndex + 1} / {media.length}
            </Text>
            {communityName && (
              <Text className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{communityName}</Text>
            )}
          </View>

          <HStack space="sm">
            <Pressable onPress={handleDownload} className="p-2">
              <Icon as={Download} size="md" style={{ color: '#FFFFFF' }} />
            </Pressable>
            <Pressable onPress={handleShare} className="p-2">
              <Icon as={Share2} size="md" style={{ color: '#FFFFFF' }} />
            </Pressable>
          </HStack>
        </View>

        {/* Media Viewer */}
        <View className="flex-1 justify-center items-center">
          {currentItem.type === 'video' ? (
            <VideoPlayerComponent uri={currentItem.uri} onSwipeDown={onClose} />
          ) : currentItem.type === 'image' ? (
            <ZoomableImage
              uri={currentItem.uri}
              onSwipeDown={onClose}
              onSwipeLeft={currentIndex < media.length - 1 ? handleNext : undefined}
              onSwipeRight={currentIndex > 0 ? handlePrev : undefined}
            />
          ) : (
            <View className="items-center justify-center p-10">
              <Icon as={FileText} size="xl" style={{ color: colors.gray[400] }} />
              <Text className="text-base text-white text-center mt-4">{currentItem.file_name}</Text>
            </View>
          )}
        </View>

        {/* Navigation Arrows */}
        {media.length > 1 && (
          <>
            {currentIndex > 0 && (
              <Pressable
                onPress={handlePrev}
                className="absolute justify-center items-center"
                style={{
                  top: '50%',
                  marginTop: -25,
                  left: 16,
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              >
                <Icon as={ChevronLeft} size="xl" style={{ color: '#FFFFFF' }} />
              </Pressable>
            )}
            {currentIndex < media.length - 1 && (
              <Pressable
                onPress={handleNext}
                className="absolute justify-center items-center"
                style={{
                  top: '50%',
                  marginTop: -25,
                  right: 16,
                  width: 50,
                  height: 50,
                  borderRadius: 25,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                }}
              >
                <Icon as={ChevronRight} size="xl" style={{ color: '#FFFFFF' }} />
              </Pressable>
            )}
          </>
        )}

        {/* Bottom Info */}
        {currentItem.sender_name && (
          <View
            className="absolute bottom-0 left-0 right-0 px-4 py-4"
            style={{
              paddingBottom: Platform.OS === 'ios' ? 40 : 16,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          >
            <Text className="text-sm font-medium text-white">{currentItem.sender_name}</Text>
            {currentItem.created_at && (
              <Text className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                {new Date(currentItem.created_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            )}
          </View>
        )}
      </GestureHandlerRootView>
    </Modal>
  );
}

// =============================================================================
// MEDIA TABS COMPONENT (for community media section)
// =============================================================================

interface MediaTabsProps {
  media: MediaItem[];
  onViewAll: () => void;
}

export function MediaTabs({ media, onViewAll }: MediaTabsProps) {
  const images = media.filter((m) => m.type === 'image').slice(0, 6);
  const videos = media.filter((m) => m.type === 'video').slice(0, 6);
  const documents = media.filter((m) => m.type === 'document').slice(0, 6);

  const [selectedTab, setSelectedTab] = useState<'images' | 'videos' | 'documents'>('images');
  const [galleryVisible, setGalleryVisible] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);

  const currentMedia = selectedTab === 'images' ? images : selectedTab === 'videos' ? videos : documents;

  const handleItemPress = (index: number) => {
    setGalleryIndex(index);
    setGalleryVisible(true);
  };

  return (
    <View className="bg-white overflow-hidden" style={{ borderRadius: borderRadius.xl }}>
      {/* Tabs */}
      <HStack
        space="sm"
        className="px-4 py-3 items-center"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}
      >
        <Pressable
          onPress={() => setSelectedTab('images')}
          className="flex-row items-center px-3 py-2"
          style={{
            borderRadius: borderRadius.lg,
            backgroundColor: selectedTab === 'images' ? colors.primary[50] : colors.gray[50],
          }}
        >
          <Icon
            as={ImageIcon}
            size="sm"
            style={{ color: selectedTab === 'images' ? colors.primary[600] : colors.gray[500] }}
          />
          <Text
            className={`text-xs ml-1 ${selectedTab === 'images' ? 'font-semibold' : ''}`}
            style={{ color: selectedTab === 'images' ? colors.primary[600] : colors.gray[500] }}
          >
            {images.length}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedTab('videos')}
          className="flex-row items-center px-3 py-2"
          style={{
            borderRadius: borderRadius.lg,
            backgroundColor: selectedTab === 'videos' ? colors.primary[50] : colors.gray[50],
          }}
        >
          <Icon
            as={Video}
            size="sm"
            style={{ color: selectedTab === 'videos' ? colors.primary[600] : colors.gray[500] }}
          />
          <Text
            className={`text-xs ml-1 ${selectedTab === 'videos' ? 'font-semibold' : ''}`}
            style={{ color: selectedTab === 'videos' ? colors.primary[600] : colors.gray[500] }}
          >
            {videos.length}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setSelectedTab('documents')}
          className="flex-row items-center px-3 py-2"
          style={{
            borderRadius: borderRadius.lg,
            backgroundColor: selectedTab === 'documents' ? colors.primary[50] : colors.gray[50],
          }}
        >
          <Icon
            as={FileText}
            size="sm"
            style={{ color: selectedTab === 'documents' ? colors.primary[600] : colors.gray[500] }}
          />
          <Text
            className={`text-xs ml-1 ${selectedTab === 'documents' ? 'font-semibold' : ''}`}
            style={{ color: selectedTab === 'documents' ? colors.primary[600] : colors.gray[500] }}
          >
            {documents.length}
          </Text>
        </Pressable>

        <Pressable onPress={onViewAll} className="ml-auto px-3 py-2">
          <Text className="text-sm font-medium" style={{ color: colors.primary[600] }}>View all</Text>
        </Pressable>
      </HStack>

      {/* Grid Preview */}
      <MediaGrid media={currentMedia} onItemPress={handleItemPress} />

      {/* Gallery Viewer */}
      <MediaGalleryViewer
        media={currentMedia}
        initialIndex={galleryIndex}
        visible={galleryVisible}
        onClose={() => setGalleryVisible(false)}
      />
    </View>
  );
}

export default MediaGalleryViewer;
