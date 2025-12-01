/**
 * RatingModal - Unified Overlay System (Bottom Sheet)
 *
 * Event rating bottom sheet with slider and review input.
 * Used via: overlay.showBottomSheet(RatingModal, payload)
 *
 * Styling Strategy:
 * - NativeWind (className) for layout and styling
 * - Inline style for dynamic values, shadows, and colors from Colors object
 *
 * Standardized sizing:
 * - Header title: 22px font-bold
 * - Header subtitle: 14px
 * - Section labels: 16px font-semibold
 * - Rating display: 48px number
 * - Body text/input: 16px
 * - Small text: 12px
 * - Close button: 44x44 with 20px icon
 * - Submit button icon: 18px
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Send, Star } from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import type { OverlayProps } from '@/components/overlay/types';
import type { RatingPayload } from '@/stores/overlayStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Consistent colors with app theme
const Colors = {
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  white: '#FFFFFF',
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    500: '#3B82F6',
    600: '#2563EB',
    700: '#1D4ED8',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

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
    Haptics.selectionAsync();
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!payload.onSubmit) return;

    setIsSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await payload.onSubmit(rating, review.trim());
      onClose();
    } catch (error) {
      console.error('Rating submission failed:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSubmitting(false);
    }
  }, [payload, rating, review, onClose]);

  const getRatingLabel = (value: number) => {
    if (value >= 9) return t('rating.excellent', 'Excellent');
    if (value >= 7) return t('rating.great', 'Great');
    if (value >= 5) return t('rating.good', 'Good');
    if (value >= 3) return t('rating.fair', 'Fair');
    return t('rating.needsImprovement', 'Needs Improvement');
  };

  const getRatingColor = (value: number) => {
    if (value >= 8) return Colors.success;
    if (value >= 6) return Colors.primary[500];
    if (value >= 4) return Colors.warning;
    return Colors.error;
  };

  return (
    <View
      className="bg-white rounded-t-3xl"
      style={{
        maxHeight: SCREEN_HEIGHT * 0.85,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.15,
        shadowRadius: 24,
        elevation: 12,
      }}
    >
      {/* Handle indicator */}
      <View className="items-center pt-3 pb-1">
        <View className="w-10 h-1 rounded-full bg-neutral-300" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="px-5 pt-2">
          {/* Header */}
          <View className="flex-row items-start justify-between mb-6">
            <View className="flex-1 pr-4">
              <Text
                className="text-[22px] font-bold text-neutral-900 mb-1"
                style={{ letterSpacing: -0.3 }}
              >
                {t('rating.title', 'Rate This Event')}
              </Text>
              <Text className="text-[14px] text-neutral-500" numberOfLines={2}>
                {payload.eventName}
              </Text>
            </View>

            {/* Close button - 44px for finger-friendly touch */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onClose();
              }}
              className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center active:opacity-70"
            >
              <X size={20} color={Colors.neutral[600]} />
            </Pressable>
          </View>

          {/* Rating Question */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-neutral-700 mb-3">
              {t('rating.question', 'How would you rate this event?')}
            </Text>

            {/* Rating Display */}
            <View
              className="items-center justify-center py-6 mb-4 rounded-2xl"
              style={{ backgroundColor: Colors.neutral[50] }}
            >
              <Text
                className="font-bold mb-1"
                style={{
                  fontSize: 48,
                  lineHeight: 56,
                  color: getRatingColor(rating),
                }}
              >
                {rating}
              </Text>
              <Text
                className="font-bold uppercase tracking-wide"
                style={{
                  fontSize: 14,
                  color: getRatingColor(rating),
                }}
              >
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
                maximumTrackTintColor={Colors.neutral[200]}
                thumbTintColor={getRatingColor(rating)}
                style={{ height: 40 }}
              />
              <View className="flex-row justify-between mt-2">
                <Text className="text-xs text-neutral-500">1</Text>
                <Text className="text-xs text-neutral-500">10</Text>
              </View>
            </View>
          </View>

          {/* Review Text Area */}
          <View className="mb-6">
            <Text className="text-base font-semibold text-neutral-700 mb-3">
              {t('rating.feedbackLabel', 'Share your feedback (optional)')}
            </Text>

            <View
              className="rounded-2xl overflow-hidden border"
              style={{
                backgroundColor: Colors.neutral[50],
                borderColor: Colors.neutral[200],
              }}
            >
              <TextInput
                value={review}
                onChangeText={setReview}
                placeholder={t('rating.feedbackPlaceholder', 'What did you enjoy? Any suggestions for improvement?')}
                placeholderTextColor={Colors.neutral[400]}
                multiline
                numberOfLines={4}
                maxLength={1000}
                textAlignVertical="top"
                className="p-4 text-base text-neutral-900"
                style={{ minHeight: 120, lineHeight: 24 }}
              />
            </View>

            <Text className="text-xs text-neutral-500 mt-2 text-right">
              {review.length}/1000
            </Text>
          </View>

          {/* Submit Button */}
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`flex-row items-center justify-center py-4 rounded-2xl gap-2 ${isSubmitting ? 'opacity-60' : ''}`}
            style={{
              backgroundColor: Colors.primary[600],
              shadowColor: Colors.primary[600],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <Send size={18} color={Colors.white} />
            )}
            <Text className="text-base font-bold text-white">
              {isSubmitting
                ? t('rating.submitting', 'Submitting...')
                : payload.existingRating
                  ? t('rating.updateButton', 'Update Rating')
                  : t('rating.submitButton', 'Submit Rating')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
};

export default RatingModal;
