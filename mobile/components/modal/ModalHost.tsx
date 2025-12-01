/**
 * Modal Host - Central Modal Renderer with Shared Axis Y
 *
 * ALL modals now use SharedAxisModal wrapper for consistent Material 3 animations.
 * Single point of control - no more scattered BottomSheets or local modal state.
 *
 * Animation Spec (Shared Axis Y):
 * - translateY: 40 → 0
 * - scale: 0.96 → 1
 * - opacity: 0 → 1
 * - duration: 280ms
 * - easing: Easing.out(Easing.cubic)
 *
 * Supported Modal Types:
 * - rating: Event rating modal
 * - calendar: Full calendar view
 * - categoryFilter: Event category filter
 * - noteEditor: Bible verse note editor
 * - streakDetails: Streak statistics
 *
 * Styling: NativeWind-first with inline style for dynamic/calculated values
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  X,
  Send,
  Star,
  Filter,
  Check,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Trophy,
  Target,
  Save,
} from 'lucide-react-native';
import Slider from '@react-native-community/slider';
import * as Haptics from 'expo-haptics';
import { Calendar, toDateId } from '@marceloterreiro/flash-calendar';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { useModalHost, ModalPayloads } from '@/stores/modalHost';
import { SharedAxisModal } from '../overlay/SharedAxisModal';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { Button, ButtonText } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import { ExploreColors, ExploreTypography, ExploreSpacing } from '@/constants/explore/designSystem';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ============================================================================
// MODAL HOST COMPONENT
// ============================================================================

export function ModalHost() {
  const { current, close } = useModalHost();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // All modals are now rendered with SharedAxisModal
  return (
    <>
      {/* Rating Modal */}
      <SharedAxisModal
        visible={current?.type === 'rating'}
        onClose={close}
      >
        {current?.type === 'rating' && (
          <RatingModalContent
            props={current.props as ModalPayloads['rating']}
            onClose={close}
          />
        )}
      </SharedAxisModal>

      {/* Category Filter Modal */}
      <SharedAxisModal
        visible={current?.type === 'categoryFilter'}
        onClose={close}
      >
        {current?.type === 'categoryFilter' && (
          <CategoryFilterContent
            props={current.props as ModalPayloads['categoryFilter']}
            onClose={close}
          />
        )}
      </SharedAxisModal>

      {/* Calendar Modal */}
      <SharedAxisModal
        visible={current?.type === 'calendar'}
        onClose={close}
      >
        {current?.type === 'calendar' && (
          <CalendarContent
            props={current.props as ModalPayloads['calendar']}
            onClose={close}
          />
        )}
      </SharedAxisModal>

      {/* Note Editor Modal */}
      <SharedAxisModal
        visible={current?.type === 'noteEditor'}
        onClose={close}
      >
        {current?.type === 'noteEditor' && (
          <NoteEditorContent
            props={current.props as ModalPayloads['noteEditor']}
            onClose={close}
          />
        )}
      </SharedAxisModal>

      {/* Streak Details Modal */}
      <SharedAxisModal
        visible={current?.type === 'streakDetails'}
        onClose={close}
      >
        {current?.type === 'streakDetails' && (
          <StreakDetailsContent
            props={current.props as ModalPayloads['streakDetails']}
            onClose={close}
          />
        )}
      </SharedAxisModal>
    </>
  );
}

// ============================================================================
// RATING MODAL CONTENT
// ============================================================================

interface RatingModalContentProps {
  props: ModalPayloads['rating'];
  onClose: () => void;
}

function RatingModalContent({ props, onClose }: RatingModalContentProps) {
  const { t } = useTranslation();
  const [rating, setRating] = useState(props.existingRating || 8);
  const [review, setReview] = useState(props.existingReview || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRatingChange = (value: number) => {
    const roundedValue = Math.round(value);
    setRating(roundedValue);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await props.onSubmit(rating, review.trim());
      onClose();
    } catch (error) {
      console.error('Rating submission failed:', error);
    } finally {
      setIsSubmitting(false);
    }
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 justify-center items-center"
    >
      <View
        className="bg-white rounded-3xl w-full"
        style={{
          maxWidth: SCREEN_WIDTH - 32,
          maxHeight: SCREEN_HEIGHT - 120,
          ...shadows.xl,
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
                  {props.eventName}
                </Text>
              </View>
              <Pressable
                onPress={onClose}
                className="w-10 h-10 rounded-full items-center justify-center bg-gray-100"
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

                <View
                  className="items-center justify-center py-6 mb-4 rounded-2xl"
                  style={{ backgroundColor: colors.gray[50] }}
                >
                  <Text
                    className="text-[56px] leading-[64px] font-bold mb-1"
                    style={{ color: getRatingColor(rating) }}
                  >
                    {rating}
                  </Text>
                  <Text
                    className="text-sm font-bold uppercase tracking-wide"
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
                <View className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-200">
                  <TextInput
                    value={review}
                    onChangeText={setReview}
                    placeholder={t('rating.feedbackPlaceholder')}
                    placeholderTextColor={colors.gray[400]}
                    multiline
                    numberOfLines={5}
                    maxLength={1000}
                    textAlignVertical="top"
                    className="p-4 text-base text-gray-900"
                    style={{ minHeight: 120, lineHeight: 24 }}
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
                className="mt-2 rounded-xl"
                style={shadows.md}
              >
                <Icon as={isSubmitting ? Star : Send} size="sm" className="text-white mr-2" />
                <ButtonText className="font-bold text-base">
                  {isSubmitting
                    ? t('rating.submitting')
                    : props.existingRating
                      ? t('rating.updateButton')
                      : t('rating.submitButton')}
                </ButtonText>
              </Button>
            </VStack>
          </View>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// CATEGORY FILTER CONTENT
// ============================================================================

interface CategoryFilterContentProps {
  props: ModalPayloads['categoryFilter'];
  onClose: () => void;
}

function CategoryFilterContent({ props, onClose }: CategoryFilterContentProps) {
  const { t } = useTranslation();

  const handleSelectCategory = (categoryId: string | null) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    props.onSelect(categoryId);
    onClose();
  };

  return (
    <View
      className="bg-white rounded-3xl w-full"
      style={{
        maxWidth: SCREEN_WIDTH - 32,
        maxHeight: SCREEN_HEIGHT - 120,
        ...shadows.xl,
      }}
    >
      <View className="p-6">
        {/* Header */}
        <HStack className="items-center justify-between mb-6">
          <View className="flex-1">
            <Heading size="xl" className="text-gray-900 font-bold mb-2">
              {t('events.filterByCategory')}
            </Heading>
            <Text className="text-gray-500 text-sm">{t('events.selectCategoryDesc')}</Text>
          </View>
          <Pressable
            onPress={onClose}
            className="w-10 h-10 rounded-full items-center justify-center bg-gray-100"
          >
            <Icon as={X} size="sm" className="text-gray-600" />
          </Pressable>
        </HStack>

        {/* All Categories Option */}
        <Pressable
          onPress={() => handleSelectCategory(null)}
          className="active:opacity-70 mb-3"
        >
          <View
            className="p-4 rounded-2xl border-2"
            style={{
              backgroundColor: props.selectedCategory === null ? colors.primary[50] : colors.gray[50],
              borderColor: props.selectedCategory === null ? colors.primary[500] : 'transparent',
            }}
          >
            <HStack space="md" className="items-center">
              <View
                className="w-12 h-12 rounded-xl items-center justify-center"
                style={{
                  backgroundColor: props.selectedCategory === null ? colors.primary[100] : colors.gray[100],
                }}
              >
                <Icon as={Filter} size="lg" className={props.selectedCategory === null ? 'text-primary-600' : 'text-gray-400'} />
              </View>

              <VStack className="flex-1">
                <Text className={`font-bold text-base ${props.selectedCategory === null ? 'text-primary-700' : 'text-gray-900'}`}>
                  {t('events.allCategories')}
                </Text>
                <Text className="text-gray-500 text-xs">{t('events.showAllEvents')}</Text>
              </VStack>

              {props.selectedCategory === null && (
                <View className="w-6 h-6 rounded-full items-center justify-center bg-primary-500">
                  <Icon as={Check} size="xs" className="text-white" />
                </View>
              )}
            </HStack>
          </View>
        </Pressable>

        {/* Category List */}
        <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 400 }}>
          <VStack space="sm">
            {props.categories.map((category) => {
              const isSelected = props.selectedCategory === category.id;

              return (
                <Pressable
                  key={category.id}
                  onPress={() => handleSelectCategory(category.id)}
                  className="active:opacity-70"
                >
                  <View
                    className="p-4 rounded-2xl border-2"
                    style={{
                      backgroundColor: isSelected ? colors.primary[50] : colors.white,
                      borderColor: isSelected ? colors.primary[500] : colors.gray[200],
                      ...shadows.sm,
                    }}
                  >
                    <HStack space="md" className="items-center">
                      <View
                        className="w-12 h-12 rounded-xl items-center justify-center"
                        style={{
                          backgroundColor: isSelected ? colors.primary[100] : colors.gray[100],
                        }}
                      >
                        <View
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: colors.primary[500] }}
                        />
                      </View>

                      <VStack className="flex-1">
                        <Text className={`font-bold text-base ${isSelected ? 'text-primary-700' : 'text-gray-900'}`}>
                          {category.name}
                        </Text>
                      </VStack>

                      {isSelected && (
                        <View className="w-6 h-6 rounded-full items-center justify-center bg-primary-500">
                          <Icon as={Check} size="xs" className="text-white" />
                        </View>
                      )}
                    </HStack>
                  </View>
                </Pressable>
              );
            })}
          </VStack>
        </ScrollView>
      </View>
    </View>
  );
}

// ============================================================================
// CALENDAR CONTENT
// ============================================================================

interface CalendarContentProps {
  props: ModalPayloads['calendar'];
  onClose: () => void;
}

function CalendarContent({ props, onClose }: CalendarContentProps) {
  const { t } = useTranslation();
  const [currentMonth, setCurrentMonth] = useState(props.selectedDate || new Date());
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(props.selectedDate);

  const handleDateSelect = useCallback((dateId: string) => {
    const date = new Date(dateId);
    setSelectedDate(date);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (props.onDateSelect) {
      props.onDateSelect(date);
    }
  }, [props.onDateSelect]);

  const handlePrevMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() - 1);
      return newDate;
    });
  };

  const handleNextMonth = () => {
    setCurrentMonth((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + 1);
      return newDate;
    });
  };

  return (
    <View
      className="bg-white rounded-3xl w-full p-6"
      style={{
        maxWidth: SCREEN_WIDTH - 32,
        maxHeight: SCREEN_HEIGHT - 120,
        ...shadows.xl,
      }}
    >
      {/* Header */}
      <HStack className="justify-between items-center mb-4">
        <VStack>
          <Heading size="xl" className="text-gray-900 font-bold">
            {t('events.calendar.title')}
          </Heading>
          <Text className="text-gray-500 text-sm">{t('events.calendar.selectDate')}</Text>
        </VStack>

        <Pressable
          onPress={onClose}
          className="w-10 h-10 rounded-full items-center justify-center bg-gray-100"
        >
          <Icon as={X} size="md" className="text-gray-600" />
        </Pressable>
      </HStack>

      {/* Month Navigation */}
      <HStack className="justify-between items-center mb-4 px-2">
        <Pressable
          onPress={handlePrevMonth}
          className="w-9 h-9 rounded-full items-center justify-center bg-gray-100"
        >
          <Icon as={ChevronLeft} size="md" className="text-gray-700" />
        </Pressable>

        <Text className="text-gray-900 font-bold text-base">
          {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
        </Text>

        <Pressable
          onPress={handleNextMonth}
          className="w-9 h-9 rounded-full items-center justify-center bg-gray-100"
        >
          <Icon as={ChevronRight} size="md" className="text-gray-700" />
        </Pressable>
      </HStack>

      {/* Calendar */}
      <Calendar
        calendarMonthId={currentMonth.toISOString().split('T')[0]}
        calendarColorScheme="light"
        calendarFirstDayOfWeek="monday"
        calendarDayHeight={48}
        onCalendarDayPress={handleDateSelect}
      />

      {/* Done Button */}
      <Button onPress={onClose} size="lg" className="mt-4">
        <ButtonText className="font-bold">{t('common.done')}</ButtonText>
      </Button>
    </View>
  );
}

// ============================================================================
// NOTE EDITOR CONTENT
// ============================================================================

interface NoteEditorContentProps {
  props: ModalPayloads['noteEditor'];
  onClose: () => void;
}

function NoteEditorContent({ props, onClose }: NoteEditorContentProps) {
  const { t } = useTranslation();
  const [note, setNote] = useState(props.existingNote || '');

  const handleSave = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (props.onSave) {
      props.onSave(note.trim());
    }
    onClose();
  };

  const verseReference = `${props.book} ${props.chapter}:${props.verse}`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 justify-center items-center"
    >
      <View
        className="bg-white rounded-3xl w-full p-6"
        style={{
          maxWidth: SCREEN_WIDTH - 32,
          maxHeight: SCREEN_HEIGHT - 120,
          ...shadows.xl,
        }}
      >
        {/* Header */}
        <HStack className="justify-between items-center mb-4">
          <VStack className="flex-1">
            <Heading size="lg" className="text-gray-900 font-bold">
              {t('bible.addNote')}
            </Heading>
            <Text className="text-primary-600 font-semibold text-sm">
              {verseReference}
            </Text>
          </VStack>

          <Pressable
            onPress={onClose}
            className="w-10 h-10 rounded-full items-center justify-center bg-gray-100"
          >
            <Icon as={X} size="md" className="text-gray-600" />
          </Pressable>
        </HStack>

        {/* Note Input */}
        <View className="rounded-2xl overflow-hidden bg-gray-50 border border-gray-200">
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={t('bible.notePlaceholder')}
            placeholderTextColor={colors.gray[400]}
            multiline
            numberOfLines={8}
            textAlignVertical="top"
            autoFocus
            className="p-4 text-base text-gray-900"
            style={{ minHeight: 200, lineHeight: 24 }}
          />
        </View>

        {/* Actions */}
        <HStack space="md" className="mt-4">
          <Button variant="outline" onPress={onClose} className="flex-1">
            <ButtonText>{t('common.cancel')}</ButtonText>
          </Button>
          <Button onPress={handleSave} className="flex-1">
            <Icon as={Save} size="sm" className="text-white mr-2" />
            <ButtonText className="font-bold">{t('common.save')}</ButtonText>
          </Button>
        </HStack>
      </View>
    </KeyboardAvoidingView>
  );
}

// ============================================================================
// STREAK DETAILS CONTENT
// ============================================================================

interface StreakDetailsContentProps {
  props: ModalPayloads['streakDetails'];
  onClose: () => void;
}

function StreakDetailsContent({ props, onClose }: StreakDetailsContentProps) {
  const { t } = useTranslation();

  const streakRules = [
    t('explore.streakRules.rule1'),
    t('explore.streakRules.rule2'),
    t('explore.streakRules.rule3'),
    t('explore.streakRules.rule4'),
  ];

  return (
    <View
      className="bg-white rounded-3xl w-full"
      style={{
        maxWidth: SCREEN_WIDTH - 32,
        maxHeight: SCREEN_HEIGHT - 120,
        ...shadows.xl,
      }}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="p-6">
          {/* Header */}
          <HStack className="justify-between items-center mb-6">
            <HStack space="md" className="items-center">
              <View
                className="w-12 h-12 rounded-full items-center justify-center"
                style={{ backgroundColor: ExploreColors.secondary[50] }}
              >
                <Flame size={28} color={ExploreColors.secondary[600]} />
              </View>
              <Heading size="xl" className="text-gray-900 font-bold">
                {t('explore.yourStreak')}
              </Heading>
            </HStack>

            <Pressable
              onPress={onClose}
              className="w-10 h-10 rounded-full items-center justify-center bg-gray-100"
            >
              <Icon as={X} size="md" className="text-gray-600" />
            </Pressable>
          </HStack>

          {/* Stats Grid */}
          <View className="flex-row gap-4 mb-6">
            <View className="flex-1 items-center p-4 rounded-xl bg-gray-50">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mb-2"
                style={{ backgroundColor: ExploreColors.secondary[50] }}
              >
                <Flame size={20} color={ExploreColors.secondary[600]} />
              </View>
              <Text className="text-3xl font-bold text-gray-900">{props.streakCount}</Text>
              <Text className="text-xs text-gray-500 mt-1">{t('explore.currentStreak')}</Text>
            </View>

            <View className="flex-1 items-center p-4 rounded-xl bg-gray-50">
              <View
                className="w-10 h-10 rounded-full items-center justify-center mb-2"
                style={{ backgroundColor: colors.primary[50] }}
              >
                <Trophy size={20} color={colors.primary[600]} />
              </View>
              <Text className="text-3xl font-bold text-gray-900">{props.longestStreak}</Text>
              <Text className="text-xs text-gray-500 mt-1">{t('explore.longestStreak')}</Text>
            </View>
          </View>

          {/* Week Progress */}
          <View className="p-4 rounded-xl bg-gray-50 mb-6">
            <Text className="text-gray-700 font-semibold mb-3">{t('explore.thisWeek')}</Text>
            <HStack className="justify-between">
              {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => (
                <View key={index} className="items-center">
                  <View
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{
                      backgroundColor: props.currentWeekDays[index]
                        ? ExploreColors.secondary[500]
                        : colors.gray[200],
                    }}
                  >
                    {props.currentWeekDays[index] && (
                      <Check size={14} color={colors.white} />
                    )}
                  </View>
                  <Text className="text-xs text-gray-500 mt-1">{day}</Text>
                </View>
              ))}
            </HStack>
          </View>

          {/* Rules */}
          <View className="p-4 rounded-xl bg-gray-50">
            <Text className="text-gray-700 font-semibold mb-3">{t('explore.howStreaksWork')}</Text>
            {streakRules.map((rule, index) => (
              <HStack key={index} space="sm" className="items-start mb-2">
                <View
                  className="w-5 h-5 rounded-full items-center justify-center mt-0.5"
                  style={{ backgroundColor: colors.primary[50] }}
                >
                  <Target size={12} color={colors.primary[600]} />
                </View>
                <Text className="text-gray-600 text-sm flex-1">{rule}</Text>
              </HStack>
            ))}
          </View>

          {/* Close Button */}
          <Button onPress={onClose} size="lg" className="mt-4">
            <ButtonText className="font-bold">{t('common.done')}</ButtonText>
          </Button>
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ModalHost;
