/**
 * Baptism Request Screen
 *
 * Flow (single screen):
 * 1. Pre-filled name/phone from auth
 * 2. Optional: Preferred date picker
 * 3. Optional: Testimony textarea
 * 4. Optional: Notes
 * 5. Submit → Success
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Droplets, Calendar, User, Phone, FileText } from 'lucide-react-native';

import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import { SuccessScreen } from '@/components/requests';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

export default function BaptismScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member, churchId } = useAuthStore();

  const [preferredDate, setPreferredDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [testimony, setTestimony] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setPreferredDate(selectedDate);
    }
  };

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.post('/public/kiosk/member-care/baptism', {
        church_id: churchId,
        member_id: member?.id,
        full_name: member?.full_name,
        phone: member?.phone_whatsapp,
        email: member?.email,
        preferred_date: preferredDate?.toISOString().split('T')[0] || null,
        testimony: testimony || null,
        notes: notes || null,
      });

      setIsSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Submit error:', error);
      Alert.alert(
        t('common.error', 'Error'),
        t('requests.submitError', 'Something went wrong. Please try again.')
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [churchId, member, preferredDate, testimony, notes, t]);

  // Success screen
  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <SuccessScreen
          type="baptism"
          title={t('requests.baptism.successTitle', 'Request Submitted!')}
          subtitle={t(
            'requests.baptism.successText',
            'Our pastoral team will contact you to schedule your baptism.'
          )}
          nextSteps={[
            { text: t('requests.baptism.next1', 'We will contact you within 3-5 days') },
            { text: t('requests.baptism.next2', 'You may be invited to a baptism preparation class') },
            { text: t('requests.baptism.next3', 'Baptism dates are usually announced monthly') },
          ]}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(300)}
          className="flex-row items-center px-4 py-3 border-b border-gray-100"
        >
          <Pressable
            onPress={() => router.back()}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-lg font-semibold text-gray-900">
              {t('requests.baptism.title', 'Baptism Request')}
            </Text>
          </View>
          <View className="w-10" />
        </Animated.View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Icon & Subtitle */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            className="items-center mb-6"
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
            >
              <Droplets size={36} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
            <Text className="text-base text-gray-600 text-center">
              {t('requests.baptism.subtitle', 'Public declaration of your faith in Christ')}
            </Text>
          </Animated.View>

          {/* Pre-filled Member Info */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6"
          >
            <View className="flex-row items-center gap-3">
              <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center">
                <Text className="text-lg font-bold text-blue-600">
                  {member?.full_name?.charAt(0) || 'M'}
                </Text>
              </View>
              <View>
                <Text className="font-semibold text-gray-900">{member?.full_name}</Text>
                <Text className="text-sm text-gray-600">{member?.phone_whatsapp}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Preferred Date */}
          <Animated.View
            entering={FadeInDown.delay(300).duration(400)}
            className="mb-4"
          >
            <Text className="text-sm font-medium text-gray-700 mb-2">
              <Calendar size={14} color="#6B7280" /> {t('requests.baptism.preferredDate', 'Preferred Date (Optional)')}
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center h-12 px-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Calendar size={20} color="#6B7280" />
              <Text className={`ml-3 flex-1 ${preferredDate ? 'text-gray-900' : 'text-gray-400'}`}>
                {preferredDate
                  ? formatDate(preferredDate)
                  : t('requests.baptism.selectDate', 'Select preferred date')}
              </Text>
            </Pressable>
            <Text className="text-xs text-gray-500 mt-1">
              {t('requests.baptism.dateNote', 'We will confirm the actual date based on availability')}
            </Text>

            {showDatePicker && (
              <DateTimePicker
                value={preferredDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </Animated.View>

          {/* Testimony */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
            className="mb-4"
          >
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('requests.baptism.testimony', 'Your Testimony (Optional)')}
            </Text>
            <Textarea size="lg" className="bg-gray-50">
              <TextareaInput
                placeholder={t('requests.baptism.testimonyPlaceholder', 'Share briefly how you came to faith...')}
                value={testimony}
                onChangeText={setTestimony}
                numberOfLines={4}
              />
            </Textarea>
          </Animated.View>

          {/* Additional Notes */}
          <Animated.View
            entering={FadeInDown.delay(500).duration(400)}
            className="mb-4"
          >
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('requests.baptism.notes', 'Additional Notes (Optional)')}
            </Text>
            <Textarea size="lg" className="bg-gray-50">
              <TextareaInput
                placeholder={t('requests.baptism.notesPlaceholder', 'Any questions or special requests...')}
                value={notes}
                onChangeText={setNotes}
                numberOfLines={2}
              />
            </Textarea>
          </Animated.View>
        </ScrollView>

        {/* Submit Button */}
        <Animated.View
          entering={FadeInDown.delay(600).duration(400)}
          className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100"
          style={{ paddingBottom: 34 }}
        >
          <Button
            size="lg"
            onPress={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
          >
            {isSubmitting ? (
              <ButtonSpinner color="#FFFFFF" />
            ) : (
              <ButtonText>{t('requests.baptism.submit', 'Submit Request')}</ButtonText>
            )}
          </Button>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
