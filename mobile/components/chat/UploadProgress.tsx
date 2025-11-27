/**
 * Upload Progress Component
 *
 * Shows upload progress for media being sent in chat:
 * - Progress bar with percentage
 * - Cancel option
 * - Preview thumbnail
 * - Retry on failure
 */

import React from 'react';
import { View, Pressable, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { X, AlertCircle, RefreshCw, Check } from 'lucide-react-native';
import { MotiView } from 'moti';

import { Text } from '@/components/ui/text';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { colors, borderRadius } from '@/constants/theme';
import type { MediaAttachment } from '@/components/chat/AttachmentPicker';

// =============================================================================
// TYPES
// =============================================================================

export type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';

export interface PendingUpload {
  id: string;
  attachment: MediaAttachment;
  status: UploadStatus;
  progress: number;
  error?: string;
}

interface UploadProgressProps {
  // Either pass the full upload object
  upload?: PendingUpload;
  // Or pass individual props
  fileName?: string;
  progress?: number;
  status?: UploadStatus;
  error?: string;
  // Callbacks
  onCancel?: () => void;
  onRetry?: () => void;
}

interface UploadProgressBarProps {
  progress: number;
  status: UploadStatus;
}

// =============================================================================
// PROGRESS BAR
// =============================================================================

function UploadProgressBar({ progress, status }: UploadProgressBarProps) {
  const getBarColor = () => {
    switch (status) {
      case 'success':
        return colors.success[500];
      case 'error':
        return colors.error[500];
      default:
        return colors.primary[500];
    }
  };

  return (
    <View
      className="h-1 w-full rounded-full overflow-hidden"
      style={{ backgroundColor: colors.gray[200] }}
    >
      <MotiView
        from={{ width: '0%' }}
        animate={{ width: `${progress}%` }}
        transition={{ type: 'timing', duration: 200 }}
        style={{
          height: '100%',
          backgroundColor: getBarColor(),
        }}
      />
    </View>
  );
}

// =============================================================================
// UPLOAD PROGRESS COMPONENT
// =============================================================================

export function UploadProgress({
  upload,
  fileName: propFileName,
  progress: propProgress,
  status: propStatus,
  error: propError,
  onCancel,
  onRetry,
}: UploadProgressProps) {
  // Support both patterns: full upload object or flat props
  const attachment = upload?.attachment;
  const status = propStatus ?? upload?.status ?? 'pending';
  const progress = propProgress ?? upload?.progress ?? 0;
  const error = propError ?? upload?.error;
  const fileName = propFileName ?? attachment?.fileName ?? 'File';

  const isImage = attachment?.type === 'image';
  const isVideo = attachment?.type === 'video';
  const hasPreview = (isImage || isVideo) && attachment;

  const getStatusIcon = () => {
    switch (status) {
      case 'success':
        return (
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.success[100] }}
          >
            <Icon as={Check} size="sm" style={{ color: colors.success[600] }} />
          </View>
        );
      case 'error':
        return (
          <View
            className="w-8 h-8 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.error[100] }}
          >
            <Icon as={AlertCircle} size="sm" style={{ color: colors.error[600] }} />
          </View>
        );
      case 'uploading':
        return (
          <View className="w-8 h-8 items-center justify-center">
            <ActivityIndicator color={colors.primary[500]} size="small" />
          </View>
        );
      default:
        return null;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'pending':
        return 'Waiting...';
      case 'uploading':
        return `Uploading ${progress}%`;
      case 'success':
        return 'Uploaded';
      case 'error':
        return error || 'Upload failed';
      default:
        return '';
    }
  };

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      exit={{ opacity: 0, translateY: -10 }}
      transition={{ type: 'timing', duration: 200 }}
      className="mx-4 mb-2"
    >
      <View
        className="rounded-xl overflow-hidden"
        style={{ backgroundColor: colors.gray[100] }}
      >
        <HStack className="p-3" space="md">
          {/* Preview thumbnail */}
          {hasPreview && attachment ? (
            <View
              className="w-14 h-14 rounded-lg overflow-hidden"
              style={{ backgroundColor: colors.gray[200] }}
            >
              <Image
                source={{ uri: attachment.uri }}
                style={{ width: 56, height: 56 }}
                contentFit="cover"
              />
              {/* Overlay for uploading state */}
              {status === 'uploading' && (
                <View
                  className="absolute inset-0 items-center justify-center"
                  style={{ backgroundColor: 'rgba(0,0,0,0.3)' }}
                >
                  <ActivityIndicator color="white" size="small" />
                </View>
              )}
            </View>
          ) : (
            <View
              className="w-14 h-14 rounded-lg items-center justify-center"
              style={{ backgroundColor: colors.gray[200] }}
            >
              {getStatusIcon()}
            </View>
          )}

          {/* Info */}
          <VStack className="flex-1" space="xs">
            <Text className="text-gray-900 font-medium text-sm" numberOfLines={1}>
              {fileName}
            </Text>
            <Text
              className={`text-xs ${status === 'error' ? 'text-error-600' : 'text-gray-500'}`}
              numberOfLines={1}
            >
              {getStatusText()}
            </Text>

            {/* Progress bar */}
            {(status === 'uploading' || status === 'pending') && (
              <UploadProgressBar progress={progress} status={status} />
            )}
          </VStack>

          {/* Actions */}
          <VStack className="items-center justify-center">
            {status === 'uploading' && onCancel && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onCancel();
                }}
                className="p-2 active:opacity-70"
              >
                <Icon as={X} size="md" className="text-gray-400" />
              </Pressable>
            )}

            {status === 'error' && onRetry && (
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onRetry();
                }}
                className="p-2 active:opacity-70"
              >
                <Icon as={RefreshCw} size="md" style={{ color: colors.primary[500] }} />
              </Pressable>
            )}

            {status === 'success' && (
              <View
                className="w-6 h-6 rounded-full items-center justify-center"
                style={{ backgroundColor: colors.success[500] }}
              >
                <Icon as={Check} size="xs" className="text-white" />
              </View>
            )}
          </VStack>
        </HStack>
      </View>
    </MotiView>
  );
}

// =============================================================================
// MULTIPLE UPLOADS LIST
// =============================================================================

interface UploadProgressListProps {
  uploads: PendingUpload[];
  onCancel?: (uploadId: string) => void;
  onRetry?: (uploadId: string) => void;
}

export function UploadProgressList({ uploads, onCancel, onRetry }: UploadProgressListProps) {
  if (uploads.length === 0) return null;

  return (
    <VStack space="sm" className="py-2">
      {uploads.map((upload) => (
        <UploadProgress
          key={upload.id}
          upload={upload}
          onCancel={onCancel ? () => onCancel(upload.id) : undefined}
          onRetry={onRetry ? () => onRetry(upload.id) : undefined}
        />
      ))}
    </VStack>
  );
}

export default UploadProgress;
