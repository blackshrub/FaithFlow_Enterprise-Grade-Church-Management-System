/**
 * PhotoCaptureSheet - Photo capture for child photo in dedication
 *
 * Design:
 * - Uses expo-image-picker for camera and gallery access
 * - Face guide overlay on preview
 * - Preview and retake option
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { Camera, RotateCcw, Image as ImageIcon, Check, X } from 'lucide-react-native';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';

interface PhotoCaptureSheetProps {
  onPhotoCapture: (photoUri: string, base64?: string) => void;
  onClose: () => void;
}

export function PhotoCaptureSheet({ onPhotoCapture, onClose }: PhotoCaptureSheetProps) {
  const { t } = useTranslation();
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    checkPermissions();
  }, []);

  const checkPermissions = async () => {
    const cameraStatus = await ImagePicker.requestCameraPermissionsAsync();
    const mediaStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
    setHasPermission(cameraStatus.granted && mediaStatus.granted);
  };

  const handleCameraCapture = async () => {
    setIsCapturing(true);
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to capture photo:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onPhotoCapture(capturedPhoto);
    }
  };

  const handlePickFromGallery = async () => {
    setIsCapturing(true);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Failed to pick image:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  // Permission loading
  if (hasPermission === null) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Permission not granted
  if (!hasPermission) {
    return (
      <View style={styles.container}>
        <View style={styles.permissionContainer}>
          <Camera size={48} color="#9CA3AF" />
          <Text style={styles.permissionTitle}>
            {t('requests.photo.permissionTitle', 'Camera Access Required')}
          </Text>
          <Text style={styles.permissionText}>
            {t('requests.photo.permissionText', 'We need camera access to capture child photo')}
          </Text>
          <Button onPress={checkPermissions} className="mt-4">
            <ButtonText>{t('requests.photo.grantPermission', 'Grant Permission')}</ButtonText>
          </Button>
          <Pressable
            onPress={onClose}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Cancel photo capture"
            style={styles.cancelButton}
          >
            <Text style={styles.cancelButtonText}>{t('common.cancel', 'Cancel')}</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Photo preview mode
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedPhoto }} style={styles.preview} />

          {/* Face guide overlay */}
          <View style={styles.faceGuideOverlay}>
            <View style={styles.faceGuide} />
          </View>
        </View>

        <View style={styles.previewActions}>
          <Button
            variant="outline"
            size="lg"
            onPress={handleRetake}
            className="flex-1 mr-2"
          >
            <ButtonIcon as={RotateCcw} className="mr-2" />
            <ButtonText>{t('requests.photo.retake', 'Retake')}</ButtonText>
          </Button>

          <Button
            size="lg"
            onPress={handleConfirm}
            className="flex-1 ml-2"
          >
            <ButtonIcon as={Check} className="mr-2" />
            <ButtonText>{t('requests.photo.usePhoto', 'Use Photo')}</ButtonText>
          </Button>
        </View>
      </View>
    );
  }

  // Photo capture options
  return (
    <View style={styles.container}>
      {/* Close button */}
      <Pressable
        style={styles.closeButton}
        onPress={onClose}
        accessible
        accessibilityRole="button"
        accessibilityLabel="Close photo capture"
      >
        <X size={24} color="#374151" />
      </Pressable>

      <View style={styles.optionsContainer}>
        <Text style={styles.optionsTitle}>
          {t('requests.photo.title', 'Add Child Photo')}
        </Text>
        <Text style={styles.optionsSubtitle}>
          {t('requests.photo.subtitle', 'Take a clear photo of the child\'s face')}
        </Text>

        {/* Face guide preview */}
        <View style={styles.faceGuidePreview}>
          <View style={styles.faceGuide}>
            <Camera size={40} color="#9CA3AF" />
          </View>
        </View>

        <View style={styles.optionButtons}>
          {/* Camera option */}
          <Pressable
            style={styles.optionButton}
            onPress={handleCameraCapture}
            disabled={isCapturing}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Take photo with camera"
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#3B82F6" />
            ) : (
              <>
                <View style={[styles.optionIcon, { backgroundColor: '#EFF6FF' }]}>
                  <Camera size={28} color="#3B82F6" />
                </View>
                <Text style={styles.optionText}>
                  {t('requests.photo.takePhoto', 'Take Photo')}
                </Text>
              </>
            )}
          </Pressable>

          {/* Gallery option */}
          <Pressable
            style={styles.optionButton}
            onPress={handlePickFromGallery}
            disabled={isCapturing}
            accessible
            accessibilityRole="button"
            accessibilityLabel="Choose photo from gallery"
          >
            {isCapturing ? (
              <ActivityIndicator size="small" color="#EC4899" />
            ) : (
              <>
                <View style={[styles.optionIcon, { backgroundColor: '#FDF2F8' }]}>
                  <ImageIcon size={28} color="#EC4899" />
                </View>
                <Text style={styles.optionText}>
                  {t('requests.photo.chooseFromGallery', 'Choose from Gallery')}
                </Text>
              </>
            )}
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    zIndex: 100,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
  },
  optionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  optionsSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 32,
  },
  faceGuidePreview: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: '#F9FAFB',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
    borderWidth: 3,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
  },
  faceGuide: {
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.7)',
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionButtons: {
    flexDirection: 'row',
    gap: 16,
  },
  optionButton: {
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    minWidth: 140,
    minHeight: 120,
    justifyContent: 'center',
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    textAlign: 'center',
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  preview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  faceGuideOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewActions: {
    flexDirection: 'row',
    padding: 20,
    paddingBottom: 40,
    backgroundColor: '#FFFFFF',
  },
  permissionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 24,
    marginBottom: 8,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
  },
  cancelButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
});

export default PhotoCaptureSheet;
