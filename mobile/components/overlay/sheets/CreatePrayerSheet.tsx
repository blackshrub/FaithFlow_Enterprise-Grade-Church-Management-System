/**
 * CreatePrayerSheet - Bottom Sheet for Creating Prayer Requests
 *
 * A clean bottom sheet form for submitting prayer requests.
 * Uses the unified overlay system.
 *
 * Styling: NativeWind-first with Gluestack Button
 */

import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  TextInput,
  Dimensions,
  PanResponder,
  Keyboard,
  Platform,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import {
  X,
  Heart,
  DollarSign,
  Sparkles,
  Briefcase,
  Users,
  Compass,
  Gift,
  Folder,
  Send,
  Globe,
  Lock,
} from 'lucide-react-native';

import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { useCreatePrayerRequest } from '@/hooks/usePrayer';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';
import type { OverlayComponentProps } from '@/stores/overlayStore';
import type { LucideIcon } from 'lucide-react-native';
import type { PrayerCategory } from '@/types/prayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Premium color palette - for icon colors only
const Colors = {
  gradient: {
    start: '#1e3a5f',
    end: '#3d5a7f',
  },
  accent: {
    primary: '#E8B86D',
  },
  neutral: {
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
  },
  white: '#FFFFFF',
};

// Category data
interface CategoryData {
  icon: LucideIcon;
  label: string;
}

const CATEGORIES: Record<string, CategoryData> = {
  health: { icon: Heart, label: 'prayer.category.health' },
  family: { icon: Users, label: 'prayer.category.family' },
  financial: { icon: DollarSign, label: 'prayer.category.financial' },
  spiritual: { icon: Sparkles, label: 'prayer.category.spiritual' },
  work: { icon: Briefcase, label: 'prayer.category.work' },
  relationships: { icon: Heart, label: 'prayer.category.relationships' },
  guidance: { icon: Compass, label: 'prayer.category.guidance' },
  thanksgiving: { icon: Gift, label: 'prayer.category.thanksgiving' },
  other: { icon: Folder, label: 'prayer.category.other' },
};

// Grid constants
const GRID_COLUMNS = 3;
const GRID_GAP = 8;
const CONTENT_PADDING = 20;
const AVAILABLE_WIDTH = SCREEN_WIDTH - (CONTENT_PADDING * 2);
const CARD_WIDTH = (AVAILABLE_WIDTH - (GRID_GAP * (GRID_COLUMNS - 1))) / GRID_COLUMNS;

export function CreatePrayerSheet({ onClose }: OverlayComponentProps) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<PrayerCategory | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);

  // Create prayer mutation
  const createPrayerMutation = useCreatePrayerRequest();
  const isPending = createPrayerMutation.isPending;

  // Keyboard height for bottom margin
  const keyboardHeight = useSharedValue(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      keyboardHeight.value = withTiming(e.endCoordinates.height, {
        duration: Platform.OS === 'ios' ? 250 : 200,
        easing: Easing.out(Easing.cubic),
      });
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeight.value = withTiming(0, {
        duration: 200,
        easing: Easing.out(Easing.cubic),
      });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardHeight]);

  const keyboardMarginStyle = useAnimatedStyle(() => ({
    marginBottom: keyboardHeight.value,
  }));

  // Swipe-to-dismiss gesture (only on handle area)
  const translateY = useSharedValue(0);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 5,
    onPanResponderMove: (_, gesture) => {
      if (gesture.dy > 0) {
        translateY.value = gesture.dy;
      }
    },
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dy > 80) {
        translateY.value = withTiming(400, { duration: 200 });
        runOnJS(handleClose)();
      } else {
        translateY.value = withTiming(0, { duration: 200 });
      }
    },
  }), [translateY, handleClose]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Handle submit
  const handleSubmit = useCallback(() => {
    if (!title.trim()) {
      showErrorToast(t('prayer.create.error'), t('prayer.create.titleRequired'));
      return;
    }
    if (!description.trim()) {
      showErrorToast(t('prayer.create.error'), t('prayer.create.descriptionRequired'));
      return;
    }
    if (!category) {
      showErrorToast(t('prayer.create.error'), t('prayer.create.categoryRequired'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createPrayerMutation.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        category,
        is_anonymous: isAnonymous,
      },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccessToast(t('prayer.create.success'), t('prayer.create.successDesc'));
          onClose();
        },
        onError: (error: any) => {
          showErrorToast(
            t('prayer.create.error'),
            error.response?.data?.detail || t('prayer.create.errorDesc')
          );
        },
      }
    );
  }, [title, description, category, isAnonymous, createPrayerMutation, onClose, t]);

  const isFormValid = title.trim().length > 0 && description.trim().length > 0 && category !== null;

  // Render category card - with index to handle margin
  const renderCategoryCard = (key: string, data: CategoryData, index: number) => {
    const IconComponent = data.icon;
    const isSelected = category === key;
    const label = t(data.label, key.charAt(0).toUpperCase() + key.slice(1));

    // Only add right margin if NOT the last column (index % 3 !== 2)
    const isLastColumn = (index % GRID_COLUMNS) === (GRID_COLUMNS - 1);

    return (
      <Pressable
        key={key}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCategory(key as PrayerCategory);
        }}
        className={`items-center p-2.5 rounded-xl border ${
          isSelected
            ? 'border-2 border-[#1e3a5f] bg-white'
            : 'border-neutral-200 bg-neutral-50'
        }`}
        style={{
          width: CARD_WIDTH,
          marginRight: isLastColumn ? 0 : GRID_GAP,
          marginBottom: GRID_GAP,
        }}
      >
        <View
          className={`w-9 h-9 rounded-[10px] items-center justify-center mb-1.5 ${
            isSelected ? 'bg-[#1e3a5f]/10' : 'bg-neutral-100'
          }`}
        >
          <IconComponent
            size={18}
            color={isSelected ? Colors.gradient.start : Colors.neutral[600]}
          />
        </View>
        <Text
          className={`text-[11px] font-semibold text-center ${
            isSelected ? 'text-[#1e3a5f]' : 'text-neutral-600'
          }`}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Animated.View
      className="bg-white rounded-t-3xl"
      style={[animatedStyle, keyboardMarginStyle]}
    >
      {/* Handle - swipe here to dismiss */}
      <View className="items-center pt-4 pb-3" {...panResponder.panHandlers}>
        <View className="w-10 h-1 rounded-full bg-neutral-300" />
      </View>

      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pb-4 border-b border-neutral-100">
        <Text className="text-[20px] font-bold text-neutral-900" style={{ letterSpacing: -0.3 }}>
          {t('prayer.create.title', 'New Prayer Request')}
        </Text>
        <Pressable
          onPress={onClose}
          className="w-11 h-11 rounded-full bg-neutral-100 items-center justify-center active:opacity-70"
        >
          <X size={20} color={Colors.neutral[600]} />
        </Pressable>
      </View>

      {/* Content - ScrollView with fixed max height */}
      <ScrollView
        style={{ maxHeight: SCREEN_HEIGHT * 0.55 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={true}
        bounces={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Title Input */}
        <View className="mb-5">
          <Text className="text-[13px] font-semibold text-neutral-600 mb-2 uppercase tracking-wide">
            {t('prayer.create.titleLabel', 'Prayer Title')}
          </Text>
          <TextInput
            className="bg-neutral-50 rounded-xl p-3.5 text-base text-neutral-900 border border-neutral-200"
            value={title}
            onChangeText={setTitle}
            placeholder={t('prayer.create.titlePlaceholder', 'What would you like prayer for?')}
            placeholderTextColor={Colors.neutral[400]}
            maxLength={100}
          />
          <Text className="text-[11px] text-neutral-400 text-right mt-1">
            {title.length}/100
          </Text>
        </View>

        {/* Description Input */}
        <View className="mb-5">
          <Text className="text-[13px] font-semibold text-neutral-600 mb-2 uppercase tracking-wide">
            {t('prayer.create.descriptionLabel', 'Details')}
          </Text>
          <TextInput
            className="bg-neutral-50 rounded-xl p-3.5 text-base text-neutral-900 border border-neutral-200"
            style={{ minHeight: 100 }}
            value={description}
            onChangeText={setDescription}
            placeholder={t('prayer.create.descriptionPlaceholder', 'Share more about your prayer request...')}
            placeholderTextColor={Colors.neutral[400]}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            maxLength={500}
          />
          <Text className="text-[11px] text-neutral-400 text-right mt-1">
            {description.length}/500
          </Text>
        </View>

        {/* Category Selection */}
        <View className="mb-5">
          <Text className="text-[13px] font-semibold text-neutral-600 mb-2 uppercase tracking-wide">
            {t('prayer.create.categoryLabel', 'Category')}
          </Text>
          <View className="flex-row flex-wrap">
            {Object.entries(CATEGORIES).map(([key, data], index) => renderCategoryCard(key, data, index))}
          </View>
        </View>

        {/* Anonymous Toggle */}
        <View className="mb-5">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setIsAnonymous(!isAnonymous);
            }}
            className="flex-row items-center justify-between bg-neutral-50 rounded-xl p-3.5 border border-neutral-200"
          >
            <View className="flex-row items-center flex-1">
              {isAnonymous ? (
                <Lock size={20} color={Colors.gradient.start} />
              ) : (
                <Globe size={20} color={Colors.neutral[500]} />
              )}
              <View className="ml-3 flex-1">
                <Text className="text-sm font-semibold text-neutral-800">
                  {isAnonymous
                    ? t('prayer.create.anonymous', 'Post Anonymously')
                    : t('prayer.create.public', 'Post with Name')}
                </Text>
                <Text className="text-xs text-neutral-500 mt-0.5">
                  {isAnonymous
                    ? t('prayer.create.anonymousDesc', 'Your name will be hidden')
                    : t('prayer.create.publicDesc', 'Others will see your name')}
                </Text>
              </View>
            </View>
            <View
              className={`w-[46px] h-[26px] rounded-[13px] p-0.5 justify-center ${
                isAnonymous ? 'bg-[#1e3a5f]' : 'bg-neutral-200'
              }`}
            >
              <View
                className={`w-[22px] h-[22px] rounded-[11px] bg-white shadow-sm ${
                  isAnonymous ? 'self-end' : 'self-start'
                }`}
              />
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Submit Button - Using Gluestack Button */}
      <View
        className="px-5 pt-3 border-t border-neutral-100"
        style={{ paddingBottom: Math.max(insets.bottom, 16) + 8 }}
      >
        <Button
          size="lg"
          onPress={handleSubmit}
          isDisabled={!isFormValid || isPending}
          className="rounded-xl"
        >
          {isPending ? (
            <ButtonSpinner color={Colors.white} />
          ) : (
            <Send size={18} color={Colors.white} />
          )}
          <ButtonText className="ml-2 font-bold">
            {isPending
              ? t('prayer.create.submitting', 'Submitting...')
              : t('prayer.create.submit', 'Submit Prayer Request')}
          </ButtonText>
        </Button>
      </View>
    </Animated.View>
  );
}

export default CreatePrayerSheet;
