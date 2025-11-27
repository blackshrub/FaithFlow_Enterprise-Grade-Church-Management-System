/**
 * Media Preview Component
 *
 * Displays media previews for:
 * - Pending uploads (before send)
 * - Message bubbles (sent media)
 * - Full-screen media viewer
 *
 * Supports: images, videos, documents, audio
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Pressable,
  Modal,
  Dimensions,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import {
  X,
  Play,
  FileText,
  Download,
  Share2,
  Volume2,
  Music,
  File,
  Maximize2,
} from 'lucide-react-native';
import { MotiView } from 'moti';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius, shadows } from '@/constants/theme';
import type { MessageMedia } from '@/types/communities';
import { getMediaUrl, downloadMedia } from '@/services/mediaUpload';

// =============================================================================
// TYPES
// =============================================================================

interface MediaPreviewProps {
  // For local file preview (before upload)
  uri?: string;
  type?: 'image' | 'video' | 'audio' | 'document';
  mimeType?: string;
  fileName?: string;
  fileSize?: number;

  // For remote media (from message)
  media?: MessageMedia;

  // Display options
  width?: number;
  height?: number;
  showFileName?: boolean;
  showFileSize?: boolean;
  compact?: boolean;

  // Modal/visibility control
  visible?: boolean;

  // Callbacks
  onRemove?: () => void;
  onPress?: () => void;
  onClose?: () => void;
}

interface FullScreenViewerProps {
  visible: boolean;
  media: MessageMedia;
  onClose: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

function formatFileSize(bytes?: number): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getDocumentIcon(mimeType?: string) {
  if (!mimeType) return File;
  if (mimeType.includes('pdf')) return FileText;
  if (mimeType.includes('word') || mimeType.includes('document')) return FileText;
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return FileText;
  if (mimeType.includes('audio')) return Music;
  return File;
}

function getDocumentColor(mimeType?: string): string {
  if (!mimeType) return colors.gray[500];
  if (mimeType.includes('pdf')) return colors.error[500];
  if (mimeType.includes('word') || mimeType.includes('document')) return colors.primary[500];
  if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return colors.success[500];
  if (mimeType.includes('audio')) return colors.warning[500];
  return colors.gray[500];
}

// =============================================================================
// VIDEO PLAYER COMPONENT (expo-video)
// =============================================================================

interface VideoPlayerProps {
  uri: string;
  onLoadStart?: () => void;
  onLoad?: () => void;
}

function VideoPlayer({ uri, onLoadStart, onLoad }: VideoPlayerProps) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    onLoadStart?.();
  });

  // Handle load complete
  React.useEffect(() => {
    if (player) {
      onLoad?.();
    }
  }, [player, onLoad]);

  return (
    <VideoView
      player={player}
      style={{
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT * 0.8,
      }}
      contentFit="contain"
      nativeControls
      allowsFullscreen
      allowsPictureInPicture
    />
  );
}

// =============================================================================
// FULL SCREEN VIEWER
// =============================================================================

export function FullScreenMediaViewer({ visible, media, onClose }: FullScreenViewerProps) {
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const mediaUrl = media.seaweedfs_fid ? getMediaUrl(media.seaweedfs_fid) : '';
  const isVideo = media.mime_type?.startsWith('video');
  const isImage = media.mime_type?.startsWith('image');

  const handleDownload = async () => {
    if (!media.seaweedfs_fid || !media.file_name) return;

    try {
      setDownloading(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      const result = await downloadMedia(media.seaweedfs_fid, media.file_name);

      if (result.success && result.localUri) {
        Alert.alert('Downloaded', `File saved to: ${media.file_name}`);
      } else {
        Alert.alert('Error', result.error || 'Download failed');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to download file');
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!media.seaweedfs_fid || !media.file_name) return;

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Download first if not cached
      const result = await downloadMedia(media.seaweedfs_fid, media.file_name);

      if (result.success && result.localUri) {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(result.localUri);
        } else {
          Alert.alert('Error', 'Sharing is not available on this device');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to share file');
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black">
        {/* Header */}
        <View
          className="absolute top-0 left-0 right-0 z-10 pt-12 pb-4 px-4"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <HStack className="justify-between items-center">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              className="p-2"
            >
              <Icon as={X} size="lg" className="text-white" />
            </Pressable>

            <Text className="text-white font-medium flex-1 text-center" numberOfLines={1}>
              {media.file_name || 'Media'}
            </Text>

            <HStack space="md">
              <Pressable
                onPress={handleDownload}
                disabled={downloading}
                className="p-2"
              >
                {downloading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Icon as={Download} size="md" className="text-white" />
                )}
              </Pressable>
              <Pressable onPress={handleShare} className="p-2">
                <Icon as={Share2} size="md" className="text-white" />
              </Pressable>
            </HStack>
          </HStack>
        </View>

        {/* Content */}
        <View className="flex-1 justify-center items-center">
          {loading && (
            <View className="absolute inset-0 justify-center items-center">
              <ActivityIndicator color="white" size="large" />
            </View>
          )}

          {isImage && (
            <Image
              source={{ uri: mediaUrl }}
              style={{
                width: SCREEN_WIDTH,
                height: SCREEN_HEIGHT * 0.8,
              }}
              contentFit="contain"
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
              onError={() => setLoading(false)}
            />
          )}

          {isVideo && (
            <VideoPlayer
              uri={mediaUrl}
              onLoadStart={() => setLoading(true)}
              onLoad={() => setLoading(false)}
            />
          )}
        </View>

        {/* Footer with file info */}
        <View
          className="absolute bottom-0 left-0 right-0 pb-8 pt-4 px-4"
          style={{
            backgroundColor: 'rgba(0,0,0,0.5)',
          }}
        >
          <VStack space="xs" className="items-center">
            {media.file_size && (
              <Text className="text-white/70 text-sm">
                {formatFileSize(media.file_size)}
              </Text>
            )}
            {media.width && media.height && (
              <Text className="text-white/70 text-sm">
                {media.width} × {media.height}
              </Text>
            )}
          </VStack>
        </View>
      </View>
    </Modal>
  );
}

// =============================================================================
// MEDIA PREVIEW COMPONENT
// =============================================================================

export function MediaPreview({
  uri,
  type,
  mimeType,
  fileName,
  fileSize,
  media,
  width = 200,
  height = 200,
  showFileName = true,
  showFileSize = true,
  compact = false,
  onRemove,
  onPress,
}: MediaPreviewProps) {
  const [fullScreenVisible, setFullScreenVisible] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  // Determine source and type
  const mediaUri = uri || (media?.seaweedfs_fid ? getMediaUrl(media.seaweedfs_fid) : '');
  const mediaType = type || (media?.mime_type?.split('/')[0] as 'image' | 'video' | 'audio' | 'document') || 'document';
  const mediaMimeType = mimeType || media?.mime_type;
  const mediaFileName = fileName || media?.file_name || 'file';
  const mediaFileSize = fileSize || media?.file_size;

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (onPress) {
      onPress();
    } else if (mediaType === 'image' || mediaType === 'video') {
      if (media) {
        setFullScreenVisible(true);
      }
    }
  }, [onPress, mediaType, media]);

  // Compact document/audio preview
  if (compact || mediaType === 'document' || mediaType === 'audio') {
    const DocIcon = getDocumentIcon(mediaMimeType);
    const docColor = getDocumentColor(mediaMimeType);

    return (
      <>
        <Pressable
          onPress={handlePress}
          className="active:opacity-80"
        >
          <View
            className="flex-row items-center p-3 rounded-xl"
            style={{
              backgroundColor: colors.gray[100],
              minWidth: 200,
            }}
          >
            {/* Document icon */}
            <View
              className="w-12 h-12 rounded-lg items-center justify-center mr-3"
              style={{ backgroundColor: `${docColor}20` }}
            >
              <Icon as={DocIcon} size="lg" style={{ color: docColor }} />
            </View>

            {/* File info */}
            <VStack className="flex-1" space="xs">
              {showFileName && (
                <Text className="text-gray-900 font-medium text-sm" numberOfLines={1}>
                  {mediaFileName}
                </Text>
              )}
              {showFileSize && mediaFileSize && (
                <Text className="text-gray-500 text-xs">
                  {formatFileSize(mediaFileSize)}
                </Text>
              )}
            </VStack>

            {/* Remove button */}
            {onRemove && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onRemove();
                }}
                className="p-2"
              >
                <Icon as={X} size="sm" className="text-gray-400" />
              </Pressable>
            )}
          </View>
        </Pressable>

        {media && (
          <FullScreenMediaViewer
            visible={fullScreenVisible}
            media={media}
            onClose={() => setFullScreenVisible(false)}
          />
        )}
      </>
    );
  }

  // Image/Video preview
  return (
    <>
      <Pressable
        onPress={handlePress}
        className="active:opacity-90 relative overflow-hidden"
        style={{
          width,
          height,
          borderRadius: borderRadius.lg,
        }}
      >
        {/* Image */}
        {mediaType === 'image' && mediaUri && (
          <>
            <Image
              source={{ uri: mediaUri }}
              style={{ width, height }}
              contentFit="cover"
              onLoadStart={() => setImageLoading(true)}
              onLoad={() => setImageLoading(false)}
              onError={() => setImageLoading(false)}
            />
            {imageLoading && (
              <View
                className="absolute inset-0 items-center justify-center"
                style={{ backgroundColor: colors.gray[200] }}
              >
                <ActivityIndicator color={colors.gray[400]} />
              </View>
            )}
          </>
        )}

        {/* Video thumbnail with play button */}
        {mediaType === 'video' && mediaUri && (
          <>
            <Image
              source={{ uri: mediaUri }}
              style={{ width, height }}
              contentFit="cover"
            />
            <View className="absolute inset-0 items-center justify-center bg-black/30">
              <View
                className="w-14 h-14 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
              >
                <Icon as={Play} size="xl" className="text-gray-900 ml-1" />
              </View>
            </View>
          </>
        )}

        {/* Expand button */}
        {media && (
          <View className="absolute top-2 right-2">
            <View
              className="p-1.5 rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            >
              <Icon as={Maximize2} size="xs" className="text-white" />
            </View>
          </View>
        )}

        {/* Remove button */}
        {onRemove && (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onRemove();
            }}
            className="absolute top-2 right-2 p-1.5 rounded-full"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <Icon as={X} size="sm" className="text-white" />
          </Pressable>
        )}

        {/* File size badge */}
        {showFileSize && mediaFileSize && (
          <View
            className="absolute bottom-2 left-2 px-2 py-1 rounded"
            style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          >
            <Text className="text-white text-xs font-medium">
              {formatFileSize(mediaFileSize)}
            </Text>
          </View>
        )}
      </Pressable>

      {/* Full screen viewer */}
      {media && (
        <FullScreenMediaViewer
          visible={fullScreenVisible}
          media={media}
          onClose={() => setFullScreenVisible(false)}
        />
      )}
    </>
  );
}

export default MediaPreview;
