/**
 * Rating & Review Modal
 *
 * Modal for members to rate and review attended events
 * Features:
 * - Non-traditional 1-10 slider rating
 * - Optional text review (max 1000 chars)
 * - Premium UI with smooth animations
 */

import React, { useState } from 'react';
import { Modal, Pressable, View, TextInput, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { MotiView } from 'moti';
import { X, Send, Star } from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import Slider from '@react-native-community/slider';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';

interface RatingReviewModalProps {
  visible: boolean;
  onClose: () => void;
  onSubmit: (rating: number, review: string) => void;
  eventName: string;
  isSubmitting?: boolean;
  existingRating?: number;
  existingReview?: string;
}

export function RatingReviewModal({
  visible,
  onClose,
  onSubmit,
  eventName,
  isSubmitting = false,
  existingRating,
  existingReview,
}: RatingReviewModalProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(existingRating || 8);
  const [review, setReview] = useState(existingReview || '');

  const handleRatingChange = (value: number) => {
    const roundedValue = Math.round(value);
    setRating(roundedValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSubmit(rating, review.trim());
  };

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
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <View className="flex-1 bg-black/50 justify-end">
          <Pressable className="flex-1" onPress={onClose} />

          <MotiView
            from={{ translateY: 500 }}
            animate={{ translateY: 0 }}
            exit={{ translateY: 500 }}
            transition={{ type: 'timing', duration: 300 }}
            style={{
              backgroundColor: '#FFFFFF',
              borderTopLeftRadius: borderRadius['3xl'],
              borderTopRightRadius: borderRadius['3xl'],
              ...shadows.xl,
              maxHeight: '90%',
            }}
          >
            <ScrollView showsVerticalScrollIndicator={false}>
              <View className="p-6">
                {/* Header */}
                <HStack className="items-center justify-between mb-6">
                  <View className="flex-1 pr-4">
                    <Heading size="xl" className="text-gray-900 font-bold mb-1">
                      {t('rating.title')}
                    </Heading>
                    <Text className="text-gray-600 text-sm" numberOfLines={2}>
                      {eventName}
                    </Text>
                  </View>
                  <Pressable
                    onPress={onClose}
                    className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
                    style={{ backgroundColor: colors.gray[100] }}
                  >
                    <Icon as={X} size="sm" className="text-gray-600" />
                  </Pressable>
                </HStack>

                <VStack space="xl">
                  {/* Rating Slider */}
                  <View>
                    <Text className="text-gray-700 font-semibold mb-3 text-base">
                      {t('rating.question')}
                    </Text>

                    {/* Rating Display */}
                    <View
                      className="items-center justify-center py-6 mb-4 rounded-2xl"
                      style={{ backgroundColor: colors.gray[50] }}
                    >
                      <Text
                        className="font-bold mb-2"
                        style={{
                          fontSize: 56,
                          lineHeight: 64,
                          color: getRatingColor(rating),
                        }}
                      >
                        {rating}
                      </Text>
                      <Text
                        className="text-sm font-bold uppercase tracking-wider"
                        style={{ color: getRatingColor(rating) }}
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
                    <View
                      className="rounded-2xl overflow-hidden"
                      style={{
                        backgroundColor: colors.gray[50],
                        borderWidth: 1,
                        borderColor: colors.gray[200],
                      }}
                    >
                      <TextInput
                        value={review}
                        onChangeText={setReview}
                        placeholder={t('rating.feedbackPlaceholder')}
                        placeholderTextColor={colors.gray[400]}
                        multiline
                        numberOfLines={5}
                        maxLength={1000}
                        textAlignVertical="top"
                        style={{
                          padding: spacing.lg,
                          fontSize: 16,
                          lineHeight: 24,
                          color: colors.gray[900],
                          minHeight: 120,
                        }}
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
                    style={{
                      borderRadius: borderRadius.xl,
                      ...shadows.md,
                    }}
                  >
                    <Icon
                      as={isSubmitting ? Star : Send}
                      size="sm"
                      className="text-white mr-2"
                    />
                    <ButtonText className="font-bold text-base">
                      {isSubmitting
                        ? t('rating.submitting')
                        : existingRating
                          ? t('rating.updateButton')
                          : t('rating.submitButton')}
                    </ButtonText>
                  </Button>

                  <Text className="text-xs text-gray-500 text-center">
                    {t('rating.helpText')}
                  </Text>
                </VStack>
              </View>
            </ScrollView>
          </MotiView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
