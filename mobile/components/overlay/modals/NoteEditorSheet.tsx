/**
 * NoteEditorSheet - Unified Overlay System
 *
 * Bible verse note editor sheet.
 * Used via: overlay.showBottomSheet(NoteEditorSheet, payload)
 *
 * Standardized styling:
 * - Header title: 20px font-bold (slightly smaller for two-line header)
 * - Close button: 44x44 with 20px icon
 * - NativeWind + minimal inline styles
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  Dimensions,
  ScrollView,
  Keyboard,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { X, Save } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

import type { OverlayProps } from '@/components/overlay/types';
import type { NoteEditorPayload } from '@/stores/overlayStore';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Consistent colors
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
};

export const NoteEditorSheet: React.FC<OverlayProps<NoteEditorPayload>> = ({
  payload,
  onClose,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

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

  // Delayed focus
  useEffect(() => {
    const timer = setTimeout(() => {
      inputRef.current?.focus();
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  // Animated style for keyboard
  const animatedContainerStyle = useAnimatedStyle(() => ({
    marginBottom: keyboardHeight.value,
  }));

  if (!payload) return null;

  const [note, setNote] = useState(payload.existingNote || '');

  const handleSave = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (payload.onSave) {
      payload.onSave(note.trim());
    }
    onClose();
  }, [payload, note, onClose]);

  const verseReference = `${payload.book} ${payload.chapter}:${payload.verse}`;

  return (
    <Animated.View
      className="bg-white rounded-t-[24px] overflow-hidden"
      style={[{ maxHeight: SCREEN_HEIGHT * 0.7 }, animatedContainerStyle]}
    >
      {/* Handle indicator */}
      <View className="items-center py-3">
        <View className="w-10 h-1 rounded-full bg-neutral-300" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        bounces={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24 }}
      >
        {/* Header */}
        <View className="flex-row items-start justify-between mb-4">
          <View className="flex-1">
            <Text
              className="text-[20px] font-bold text-neutral-900 mb-1"
              style={{ letterSpacing: -0.3 }}
            >
              {t('bible.addNote', 'Add Note')}
            </Text>
            <Text className="text-[14px] font-semibold" style={{ color: Colors.primary[600] }}>
              {verseReference}
            </Text>
          </View>

          {/* Close button - 44px */}
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

        {/* Note Input */}
        <View className="rounded-2xl overflow-hidden border border-neutral-200 bg-neutral-50 mb-4">
          <TextInput
            ref={inputRef}
            value={note}
            onChangeText={setNote}
            placeholder={t('bible.notePlaceholder', 'Write your thoughts, reflections, or insights about this verse...')}
            placeholderTextColor={Colors.neutral[400]}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
            className="p-4 text-base text-neutral-900"
            style={{ minHeight: 150, lineHeight: 24 }}
          />
        </View>

        {/* Actions */}
        <View className="flex-row gap-3">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onClose();
            }}
            className="flex-1 items-center justify-center py-4 rounded-2xl border border-neutral-200 active:opacity-80"
          >
            <Text className="text-base font-semibold text-neutral-700">
              {t('common.cancel', 'Cancel')}
            </Text>
          </Pressable>

          <Pressable
            onPress={handleSave}
            className="flex-1 flex-row items-center justify-center py-4 rounded-2xl gap-2 active:opacity-80"
            style={{
              backgroundColor: Colors.primary[600],
              shadowColor: Colors.primary[600],
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.3,
              shadowRadius: 8,
              elevation: 4,
            }}
          >
            <Save size={18} color={Colors.white} />
            <Text className="text-base font-bold text-white">
              {t('common.save', 'Save')}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </Animated.View>
  );
};

export default NoteEditorSheet;
