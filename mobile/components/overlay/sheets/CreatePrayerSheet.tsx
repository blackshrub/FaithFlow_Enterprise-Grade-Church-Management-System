/**
 * CreatePrayerSheet - Bottom Sheet for Creating Prayer Requests
 *
 * A clean bottom sheet form for submitting prayer requests.
 * Uses the unified overlay system.
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Dimensions,
  PanResponder,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
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

import { useCreatePrayerRequest } from '@/hooks/usePrayer';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';
import type { OverlayComponentProps } from '@/stores/overlayStore';
import type { LucideIcon } from 'lucide-react-native';
import type { PrayerCategory, CreatePrayerRequest } from '@/types/prayer';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Calculate heights for the sheet
const MAX_SHEET_HEIGHT = SCREEN_HEIGHT * 0.85;
const CONTENT_HEIGHT = SCREEN_HEIGHT * 0.6; // Fixed height for content area

// Premium color palette
const Colors = {
  gradient: {
    start: '#1e3a5f',
    mid: '#2d4a6f',
    end: '#3d5a7f',
  },
  accent: {
    primary: '#E8B86D',
  },
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
        // Close if dragged down more than 80px
        translateY.value = withTiming(400, { duration: 200 });
        runOnJS(handleClose)();
      } else {
        // Snap back
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

  // Render category card
  const renderCategoryCard = (key: string, data: CategoryData) => {
    const IconComponent = data.icon;
    const isSelected = category === key;
    const label = t(data.label, key.charAt(0).toUpperCase() + key.slice(1));

    return (
      <Pressable
        key={key}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCategory(key as PrayerCategory);
        }}
        style={[styles.categoryCard, isSelected && styles.categoryCardSelected]}
      >
        <View style={[styles.categoryIconWrap, isSelected && styles.categoryIconWrapSelected]}>
          <IconComponent
            size={18}
            color={isSelected ? Colors.gradient.start : Colors.neutral[600]}
          />
        </View>
        <Text
          style={[styles.categoryLabel, isSelected && styles.categoryLabelSelected]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <Animated.View style={[styles.container, { paddingBottom: insets.bottom + 16 }, animatedStyle]}>
      {/* Handle - swipe here to dismiss */}
      <View style={styles.handleContainer} {...panResponder.panHandlers}>
        <View style={styles.handle} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{t('prayer.create.title', 'New Prayer Request')}</Text>
        <Pressable onPress={onClose} style={styles.closeBtn}>
          <X size={20} color={Colors.neutral[600]} />
        </Pressable>
      </View>

      {/* Content - ScrollView works independently */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
          bounces={true}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{t('prayer.create.titleLabel', 'Prayer Title')}</Text>
            <TextInput
              style={styles.titleInput}
              value={title}
              onChangeText={setTitle}
              placeholder={t('prayer.create.titlePlaceholder', 'What would you like prayer for?')}
              placeholderTextColor={Colors.neutral[400]}
              maxLength={100}
            />
            <Text style={styles.charCount}>{title.length}/100</Text>
          </View>

          {/* Description Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{t('prayer.create.descriptionLabel', 'Details')}</Text>
            <TextInput
              style={styles.descriptionInput}
              value={description}
              onChangeText={setDescription}
              placeholder={t('prayer.create.descriptionPlaceholder', 'Share more about your prayer request...')}
              placeholderTextColor={Colors.neutral[400]}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={500}
            />
            <Text style={styles.charCount}>{description.length}/500</Text>
          </View>

          {/* Category Selection */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>{t('prayer.create.categoryLabel', 'Category')}</Text>
            <View style={styles.categoryGrid}>
              {Object.entries(CATEGORIES).map(([key, data]) => renderCategoryCard(key, data))}
            </View>
          </View>

          {/* Anonymous Toggle */}
          <View style={styles.inputSection}>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setIsAnonymous(!isAnonymous);
              }}
              style={styles.anonymousToggle}
            >
              <View style={styles.anonymousLeft}>
                {isAnonymous ? (
                  <Lock size={20} color={Colors.gradient.start} />
                ) : (
                  <Globe size={20} color={Colors.neutral[500]} />
                )}
                <View style={styles.anonymousTextWrap}>
                  <Text style={styles.anonymousTitle}>
                    {isAnonymous
                      ? t('prayer.create.anonymous', 'Post Anonymously')
                      : t('prayer.create.public', 'Post with Name')}
                  </Text>
                  <Text style={styles.anonymousDesc}>
                    {isAnonymous
                      ? t('prayer.create.anonymousDesc', 'Your name will be hidden')
                      : t('prayer.create.publicDesc', 'Others will see your name')}
                  </Text>
                </View>
              </View>
              <View style={[styles.toggleSwitch, isAnonymous && styles.toggleSwitchActive]}>
                <View style={[styles.toggleThumb, isAnonymous && styles.toggleThumbActive]} />
              </View>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Submit Button */}
      <View style={styles.footer}>
        <Pressable
          onPress={handleSubmit}
          disabled={!isFormValid || isPending}
          style={[styles.submitBtn, (!isFormValid || isPending) && styles.submitBtnDisabled]}
        >
          <LinearGradient
            colors={
              isFormValid && !isPending
                ? [Colors.gradient.start, Colors.gradient.end]
                : [Colors.neutral[300], Colors.neutral[400]]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitGradient}
          >
            <Send size={18} color={Colors.white} />
            <Text style={styles.submitText}>
              {isPending
                ? t('prayer.create.submitting', 'Submitting...')
                : t('prayer.create.submit', 'Submit Prayer Request')}
            </Text>
          </LinearGradient>
        </Pressable>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: MAX_SHEET_HEIGHT,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 16,
    paddingBottom: 12,
    // Larger touch target for swipe gesture
    minHeight: 32,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.neutral[300],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[100],
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardView: {
    height: CONTENT_HEIGHT, // Fixed height instead of flex
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.neutral[600],
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  titleInput: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.neutral[900],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  descriptionInput: {
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: Colors.neutral[900],
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    color: Colors.neutral[400],
    textAlign: 'right',
    marginTop: 4,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -(GRID_GAP / 2),
  },
  categoryCard: {
    width: CARD_WIDTH,
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.neutral[200],
    marginHorizontal: GRID_GAP / 2,
    marginBottom: GRID_GAP,
  },
  categoryCardSelected: {
    borderColor: Colors.gradient.start,
    borderWidth: 2,
    backgroundColor: Colors.white,
  },
  categoryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  categoryIconWrapSelected: {
    backgroundColor: `${Colors.gradient.start}15`,
  },
  categoryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.neutral[600],
    textAlign: 'center',
  },
  categoryLabelSelected: {
    color: Colors.gradient.start,
  },
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.neutral[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  anonymousLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  anonymousTextWrap: {
    marginLeft: 12,
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  anonymousDesc: {
    fontSize: 12,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  toggleSwitch: {
    width: 46,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.neutral[200],
    padding: 2,
    justifyContent: 'center',
  },
  toggleSwitchActive: {
    backgroundColor: Colors.gradient.start,
  },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: Colors.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[100],
  },
  submitBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
  },
  submitText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
});

export default CreatePrayerSheet;
