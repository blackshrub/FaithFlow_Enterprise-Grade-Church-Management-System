/**
 * RatingModal - Unified Overlay System (Bottom Sheet)
 *
 * Event rating bottom sheet with slider and review input.
 * Used via: overlay.showBottomSheet(RatingModal, payload)
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Pressable,
  Dimensions,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Send, Star } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { OverlayProps } from '@/components/overlay/types';
import type { RatingPayload } from '@/stores/overlayStore';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { overlayTheme } from '@/theme/overlayTheme';
import { interaction } from '@/constants/interaction';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const RatingModal: React.FC<OverlayProps<RatingPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  if (!payload) return null;

  const [rating, setRating] = useState(payload.existingRating || 8);
  const [review, setReview] = useState(payload.existingReview || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = useCallback((value: number) => {
    const roundedValue = Math.round(value);
    setRating(roundedValue);
    interaction.haptics.selection();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!payload.onSubmit) return;

    setIsSubmitting(true);
    try {
      interaction.haptics.success();
      await payload.onSubmit(rating, review.trim());
      onClose();
    } catch (error) {
      console.error('Rating submission failed:', error);
      interaction.haptics.error();
    } finally {
      setIsSubmitting(false);
    }
  }, [payload, rating, review, onClose]);

  const getRatingLabel = (value: number) => {
    if (value >= 9) return t('rating.excellent');
    if (value >= 7) return t('rating.great');
    if (value >= 5) return t('rating.good');
    if (value >= 3) return t('rating.fair');
    return t('rating.needsImprovement');
  };

  const getRatingColor = (value: number) => {
    if (value >= 8) return colors.success[500];
    if (value >= 6) return colors.primary[500];
    if (value >= 4) return colors.warning[500];
    return colors.error[500];
  };

  return (
    <View style={styles.sheetContainer}>
      {/* Handle */}
      <View style={styles.handleContainer}>
        <View style={styles.handle} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
      >
        <View style={styles.sheetContent}>
          {/* Header */}
          <HStack className="items-center justify-between mb-6">
            <View className="flex-1 pr-4">
              <Heading size="xl" className="text-gray-900 font-bold mb-1">
                {t('rating.title')}
              </Heading>
              <Text className="text-gray-600 text-sm" numberOfLines={2}>
                {payload.eventName}
              </Text>
            </View>
            <Pressable
              onPress={() => {
                interaction.haptics.tap();
                onClose();
              }}
              style={({ pressed }) => [
                styles.closeButton,
                pressed && styles.pressedMicro,
              ]}
            >
              <Icon as={X} size="sm" className="text-gray-600" />
            </Pressable>
          </HStack>

          <VStack space="xl">
            {/* Rating Display */}
            <View>
              <Text className="text-gray-700 font-semibold mb-3 text-base">
                {t('rating.question')}
              </Text>

              <View style={[styles.ratingDisplay, { backgroundColor: colors.gray[50] }]}>
                <Text style={[styles.ratingValue, { color: getRatingColor(rating) }]}>
                  {rating}
                </Text>
                <Text style={[styles.ratingLabel, { color: getRatingColor(rating) }]}>
                  {getRatingLabel(rating)}
                </Text>
              </View>

              {/* Slider */}
              <View className="px-2">
                <Slider
                  value={rating}
                  onValueChange={handleRatingChange}
                  minimumValue={1}
                  maximumValue={10}
                  step={1}
                  minimumTrackTintColor={getRatingColor(rating)}
                  maximumTrackTintColor={colors.gray[200]}
                  thumbTintColor={getRatingColor(rating)}
                  style={{ height: 40 }}
                />
                <HStack className="justify-between mt-2">
                  <Text className="text-xs text-gray-500">1</Text>
                  <Text className="text-xs text-gray-500">10</Text>
                </HStack>
              </View>
            </View>

            {/* Review Text Area */}
            <View>
              <Text className="text-gray-700 font-semibold mb-3 text-base">
                {t('rating.feedbackLabel')}
              </Text>
              <View style={styles.textInputContainer}>
                <TextInput
                  value={review}
                  onChangeText={setReview}
                  placeholder={t('rating.feedbackPlaceholder')}
                  placeholderTextColor={colors.gray[400]}
                  multiline
                  numberOfLines={4}
                  maxLength={1000}
                  textAlignVertical="top"
                  style={styles.textInput}
                />
              </View>
              <Text className="text-xs text-gray-500 mt-2 text-right">
                {t('rating.characterCount', { count: review.length, max: 1000 })}
              </Text>
            </View>

            {/* Submit Button */}
            <Button
              onPress={handleSubmit}
              disabled={isSubmitting}
              size="xl"
              className="mt-2"
              style={[
                styles.submitButton,
                isSubmitting && { opacity: interaction.disableOpacity },
              ]}
            >
              <Icon as={isSubmitting ? Star : Send} size="sm" className="text-white mr-2" />
              <ButtonText className="font-bold text-base">
                {isSubmitting
                  ? t('rating.submitting')
                  : payload.existingRating
                    ? t('rating.updateButton')
                    : t('rating.submitButton')}
              </ButtonText>
            </Button>
          </VStack>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  sheetContainer: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray[300],
    borderRadius: 2,
  },
  sheetContent: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xs,
  },
  closeButton: {
    width: overlayTheme.closeButton.size,
    height: overlayTheme.closeButton.size,
    borderRadius: overlayTheme.closeButton.borderRadius,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: overlayTheme.closeButton.backgroundColor,
  },
  pressedMicro: {
    opacity: interaction.press.opacity,
    transform: [{ scale: interaction.press.scale }],
  },
  ratingDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    marginBottom: spacing.md,
    borderRadius: borderRadius['2xl'],
  },
  ratingValue: {
    fontSize: 56,
    lineHeight: 64,
    fontWeight: '700',
    marginBottom: spacing.xs,
  },
  ratingLabel: {
    fontSize: 14,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  textInputContainer: {
    borderRadius: borderRadius['2xl'],
    overflow: 'hidden',
    backgroundColor: colors.gray[50],
    borderWidth: 1,
    borderColor: colors.gray[200],
  },
  textInput: {
    padding: spacing.lg,
    fontSize: 16,
    lineHeight: 24,
    color: colors.gray[900],
    minHeight: 120,
  },
  submitButton: {
    borderRadius: borderRadius.xl,
    ...shadows.md,
  },
});

export default RatingModal;
