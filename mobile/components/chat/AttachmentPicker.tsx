/**
 * Attachment Picker for Chat
 *
 * Features:
 * - Pick images from gallery
 * - Take photo with camera
 * - Pick documents
 * - Returns media info for upload
 */

import React, { useCallback } from 'react';
import { View, Pressable, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Haptics from 'expo-haptics';
import {
  Image as ImageIcon,
  Camera,
  FileText,
  MapPin,
  X,
} from 'lucide-react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { colors, spacing, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface MediaAttachment {
  uri: string;
  type: 'image' | 'video' | 'document' | 'audio';
  mimeType: string;
  fileName: string;
  fileSize?: number;
  width?: number;
  height?: number;
  duration?: number; // For video and audio
}

interface AttachmentPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (attachment: MediaAttachment) => void;
  onLocationPress?: () => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function AttachmentPicker({ visible, onClose, onSelect, onLocationPress }: AttachmentPickerProps) {
  const bottomSheetRef = React.useRef<BottomSheet>(null);
  const snapPoints = React.useMemo(() => ['35%'], []);

  // Request permissions
  const requestCameraPermission = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Camera permission is required to take photos.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  const requestMediaLibraryPermission = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission Required',
        'Photo library permission is required to select images.',
        [{ text: 'OK' }]
      );
      return false;
    }
    return true;
  };

  // Pick image from gallery
  const handlePickImage = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const hasPermission = await requestMediaLibraryPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images', 'videos'],
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        const isVideo = asset.type === 'video';

        onSelect({
          uri: asset.uri,
          type: isVideo ? 'video' : 'image',
          mimeType: asset.mimeType || (isVideo ? 'video/mp4' : 'image/jpeg'),
          fileName: asset.fileName || `${isVideo ? 'video' : 'image'}_${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
          duration: asset.duration ?? undefined,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  }, [onSelect, onClose]);

  // Take photo with camera
  const handleTakePhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const hasPermission = await requestCameraPermission();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 0.8,
        exif: false,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        onSelect({
          uri: asset.uri,
          type: 'image',
          mimeType: asset.mimeType || 'image/jpeg',
          fileName: asset.fileName || `photo_${Date.now()}.jpg`,
          fileSize: asset.fileSize,
          width: asset.width,
          height: asset.height,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
    }
  }, [onSelect, onClose]);

  // Pick document
  const handlePickDocument = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [
          'application/pdf',
          'application/msword',
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'text/plain',
        ],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];

        onSelect({
          uri: asset.uri,
          type: 'document',
          mimeType: asset.mimeType || 'application/octet-stream',
          fileName: asset.name,
          fileSize: asset.size,
        });
        onClose();
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Error', 'Failed to pick document. Please try again.');
    }
  }, [onSelect, onClose]);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleLocationPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    onLocationPress?.();
  }, [onClose, onLocationPress]);

  const options = [
    {
      icon: ImageIcon,
      label: 'Photo & Video',
      color: colors.primary[500],
      bgColor: colors.primary[50],
      onPress: handlePickImage,
    },
    {
      icon: Camera,
      label: 'Camera',
      color: colors.success[500],
      bgColor: colors.success[50],
      onPress: handleTakePhoto,
    },
    {
      icon: FileText,
      label: 'Document',
      color: colors.warning[500],
      bgColor: colors.warning[50],
      onPress: handlePickDocument,
    },
    ...(onLocationPress
      ? [
          {
            icon: MapPin,
            label: 'Location',
            color: '#128C7E', // WhatsApp teal
            bgColor: '#E8F5E9',
            onPress: handleLocationPress,
          },
        ]
      : []),
  ];

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      enableDynamicSizing={false}
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.gray[300] }}
    >
      <View className="flex-1 px-5 pt-2">
        <HStack className="justify-between items-center mb-4">
          <Heading size="lg" className="text-gray-900 font-bold">
            Attach
          </Heading>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            className="active:opacity-70 p-2"
          >
            <Icon as={X} size="md" className="text-gray-500" />
          </Pressable>
        </HStack>

        <HStack space="lg" className="justify-center py-4">
          {options.map((option) => (
            <Pressable
              key={option.label}
              onPress={option.onPress}
              className="items-center active:opacity-70"
            >
              <View
                className="w-16 h-16 rounded-full items-center justify-center mb-2"
                style={{ backgroundColor: option.bgColor }}
              >
                <Icon
                  as={option.icon}
                  size="xl"
                  style={{ color: option.color }}
                />
              </View>
              <Text className="text-gray-700 text-sm font-medium">
                {option.label}
              </Text>
            </Pressable>
          ))}
        </HStack>
      </View>
    </BottomSheet>
  );
}

export default AttachmentPicker;
