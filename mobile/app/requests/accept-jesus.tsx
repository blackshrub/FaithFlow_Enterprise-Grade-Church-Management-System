/**
 * Accept Jesus Screen - Salvation Decision / Recommitment
 *
 * Flow (single screen):
 * 1. Display guided prayer (scrollable, bilingual)
 * 2. Toggle: First Time / Recommitment
 * 3. Checkbox: "I have read and prayed this prayer"
 * 4. Submit → Success with celebration
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
import { ArrowLeft, Cross, Check, Heart } from 'lucide-react-native';

import { Button, ButtonText, ButtonSpinner } from '@/components/ui/button';
import { GuidedPrayerDisplay, SuccessScreen } from '@/components/requests';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

type CommitmentType = 'first_time' | 'recommitment';

export default function AcceptJesusScreen() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const { member, churchId } = useAuthStore();

  const [commitmentType, setCommitmentType] = useState<CommitmentType>('first_time');
  const [prayerRead, setPrayerRead] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [guidedPrayer, setGuidedPrayer] = useState('');

  // Fetch guided prayer from church settings
  React.useEffect(() => {
    const fetchGuidedPrayer = async () => {
      try {
        const response = await api.get(`/public/kiosk/member-care/guided-prayer?church_id=${churchId}`);
        const isIndonesian = i18n.language === 'id';
        setGuidedPrayer(isIndonesian ? response.data?.prayer_id : response.data?.prayer_en);
      } catch (error) {
        console.log('Using default prayer');
      }
    };
    if (churchId) fetchGuidedPrayer();
  }, [churchId, i18n.language]);

  const handleSubmit = useCallback(async () => {
    if (!prayerRead) {
      Alert.alert(
        t('requests.acceptJesus.confirmRequired', 'Confirmation Required'),
        t('requests.acceptJesus.pleaseConfirm', 'Please confirm that you have read and prayed this prayer.')
      );
      return;
    }

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.post('/public/kiosk/member-care/accept-jesus', {
        church_id: churchId,
        member_id: member?.id,
        full_name: member?.full_name,
        phone: member?.phone_whatsapp,
        email: member?.email,
        commitment_type: commitmentType,
        prayer_read: prayerRead,
        guided_prayer_text: guidedPrayer,
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
  }, [prayerRead, commitmentType, churchId, member, guidedPrayer, t]);

  // Success screen
  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <SuccessScreen
          type="accept-jesus"
          title={t('requests.acceptJesus.successTitle', 'Welcome to the Family!')}
          subtitle={t(
            'requests.acceptJesus.successText',
            'Heaven is rejoicing! Our pastoral team will contact you soon to help you grow in your faith.'
          )}
          nextSteps={[
            { text: t('requests.acceptJesus.nextStep1', 'Our team will contact you within 24-48 hours') },
            { text: t('requests.acceptJesus.nextStep2', 'Join our new believers class') },
            { text: t('requests.acceptJesus.nextStep3', 'Consider water baptism') },
          ]}
          showConfetti
          customIcon={Heart}
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
              {t('requests.acceptJesus.title', 'Accept Jesus')}
            </Text>
          </View>
          <View className="w-10" />
        </Animated.View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Icon & Subtitle */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(400)}
            className="items-center mb-6"
          >
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              className="w-20 h-20 rounded-full items-center justify-center mb-4"
            >
              <Cross size={36} color="#FFFFFF" strokeWidth={2} />
            </LinearGradient>
            <Text className="text-base text-gray-600 text-center">
              {t('requests.acceptJesus.subtitle', 'Make a commitment to follow Christ')}
            </Text>
          </Animated.View>

          {/* Commitment Type Toggle */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(400)}
            className="flex-row gap-3 mb-6"
          >
            <Pressable
              onPress={() => setCommitmentType('first_time')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                commitmentType === 'first_time'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  commitmentType === 'first_time' ? 'text-amber-700' : 'text-gray-600'
                }`}
              >
                {t('requests.acceptJesus.firstTime', 'First Time Decision')}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setCommitmentType('recommitment')}
              className={`flex-1 py-3 px-4 rounded-xl border-2 ${
                commitmentType === 'recommitment'
                  ? 'border-amber-500 bg-amber-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <Text
                className={`text-center font-medium ${
                  commitmentType === 'recommitment' ? 'text-amber-700' : 'text-gray-600'
                }`}
              >
                {t('requests.acceptJesus.recommitment', 'Recommitment')}
              </Text>
            </Pressable>
          </Animated.View>

          {/* Guided Prayer */}
          <Animated.View entering={FadeInDown.delay(300).duration(400)}>
            <Text className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-3">
              {t('requests.acceptJesus.guidedPrayer', 'Guided Prayer')}
            </Text>
            <GuidedPrayerDisplay prayerText={guidedPrayer} maxHeight={280} />
          </Animated.View>

          {/* Confirmation Checkbox */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(400)}
            className="mt-6"
          >
            <Pressable
              onPress={() => {
                setPrayerRead(!prayerRead);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              className="flex-row items-center p-4 bg-gray-50 rounded-xl"
            >
              <View
                className={`w-6 h-6 rounded-md mr-3 items-center justify-center ${
                  prayerRead ? 'bg-amber-500' : 'border-2 border-gray-300'
                }`}
              >
                {prayerRead && <Check size={16} color="#FFFFFF" />}
              </View>
              <Text className="flex-1 text-base text-gray-700">
                {t(
                  'requests.acceptJesus.confirmPrayer',
                  'I have read and prayed this prayer from my heart'
                )}
              </Text>
            </Pressable>
          </Animated.View>
        </ScrollView>

        {/* Submit Button */}
        <Animated.View
          entering={FadeInDown.delay(500).duration(400)}
          className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100"
          style={{ paddingBottom: 34 }}
        >
          <Button
            size="lg"
            onPress={handleSubmit}
            disabled={isSubmitting || !prayerRead}
            className={`w-full ${!prayerRead ? 'opacity-50' : ''}`}
            style={{ backgroundColor: prayerRead ? '#D97706' : '#E5E7EB' }}
          >
            {isSubmitting ? (
              <ButtonSpinner color="#FFFFFF" />
            ) : (
              <ButtonText className="text-white">
                {t('requests.acceptJesus.submit', 'Confirm My Decision')}
              </ButtonText>
            )}
          </Button>
        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
