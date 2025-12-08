/**
 * Holy Matrimony Screen - Multi-step form
 *
 * Flow (3 steps):
 * 1. Partner A: [This is me] / [Search] / [Enter manually]
 * 2. Partner B: [Search] / [Enter manually]
 * 3. Details: Wedding date, Both baptized checkboxes, Notes
 * 4. Submit → Success
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
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Gem, Calendar, ChevronRight, AlertTriangle, Check } from 'lucide-react-native';

import { Button, ButtonText, ButtonSpinner, ButtonIcon } from '@/components/ui/button';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import {
  StepIndicator,
  PersonInfoForm,
  MemberSearchSheet,
  SuccessScreen,
} from '@/components/requests';
import { useAuthStore } from '@/stores/auth';
import api from '@/services/api';

interface PersonInfo {
  name: string;
  phone: string;
  member_id?: string;
  is_baptized?: boolean;
}

const STEPS = ['partner_a', 'partner_b', 'details'] as const;
type Step = typeof STEPS[number];

export default function HolyMatrimonyScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member, churchId } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [partnerA, setPartnerA] = useState<PersonInfo>({ name: '', phone: '', is_baptized: false });
  const [partnerB, setPartnerB] = useState<PersonInfo>({ name: '', phone: '', is_baptized: false });
  const [plannedDate, setPlannedDate] = useState<Date | null>(null);
  const [notes, setNotes] = useState('');

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showMemberSearch, setShowMemberSearch] = useState<'partner_a' | 'partner_b' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const currentMember = member ? {
    id: member.id,
    full_name: member.full_name,
    phone: member.phone_whatsapp || '',
    photo_url: member.photo_url,
  } : undefined;

  const bothBaptized = partnerA.is_baptized && partnerB.is_baptized;

  const canProceed = useCallback(() => {
    switch (STEPS[currentStep]) {
      case 'partner_a':
        return partnerA.name.trim().length > 0 && partnerA.phone.trim().length > 0;
      case 'partner_b':
        return partnerB.name.trim().length > 0 && partnerB.phone.trim().length > 0;
      case 'details':
        return true; // All fields are optional in details
      default:
        return false;
    }
  }, [currentStep, partnerA, partnerB]);

  const handleNext = useCallback(() => {
    if (currentStep < STEPS.length - 1) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setCurrentStep(currentStep + 1);
    }
  }, [currentStep]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      router.back();
    }
  }, [currentStep, router]);

  const handleMemberSelect = useCallback((selectedMember: any) => {
    if (showMemberSearch === 'partner_a') {
      setPartnerA({
        ...partnerA,
        name: selectedMember.full_name,
        phone: selectedMember.phone,
        member_id: selectedMember.id,
      });
    } else if (showMemberSearch === 'partner_b') {
      setPartnerB({
        ...partnerB,
        name: selectedMember.full_name,
        phone: selectedMember.phone,
        member_id: selectedMember.id,
      });
    }
    setShowMemberSearch(null);
  }, [showMemberSearch, partnerA, partnerB]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setPlannedDate(selectedDate);
    }
  };

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await api.post('/public/kiosk/member-care/holy-matrimony', {
        church_id: churchId,
        member_id: member?.id,
        full_name: member?.full_name,
        phone: member?.phone_whatsapp,
        person_a: {
          name: partnerA.name,
          phone: partnerA.phone,
          member_id: partnerA.member_id || null,
          is_baptized: partnerA.is_baptized || false,
        },
        person_b: {
          name: partnerB.name,
          phone: partnerB.phone,
          member_id: partnerB.member_id || null,
          is_baptized: partnerB.is_baptized || false,
        },
        planned_wedding_date: plannedDate?.toISOString().split('T')[0] || null,
        both_baptized: bothBaptized,
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
  }, [churchId, member, partnerA, partnerB, plannedDate, bothBaptized, notes, t]);

  // Success screen
  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <SuccessScreen
          type="holy-matrimony"
          title={t('requests.matrimony.successTitle', 'Request Submitted!')}
          subtitle={t(
            'requests.matrimony.successText',
            'Our pastoral team will contact you to discuss your wedding plans.'
          )}
          nextSteps={[
            { text: t('requests.matrimony.next1', 'We will contact you within 3-5 days') },
            { text: t('requests.matrimony.next2', 'Both partners may need to attend pre-marital counseling') },
            { text: t('requests.matrimony.next3', 'Church weddings are scheduled 3-6 months in advance') },
          ]}
        />
      </SafeAreaView>
    );
  }

  const renderStepContent = () => {
    const step = STEPS[currentStep];

    if (step === 'partner_a') {
      return (
        <Animated.View entering={FadeInRight.duration(300)}>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            {t('requests.matrimony.partnerA', 'First Partner')}
          </Text>
          <Text className="text-gray-600 mb-6">
            {t('requests.matrimony.partnerADesc', "Enter the first partner's details")}
          </Text>

          <PersonInfoForm
            label=""
            value={partnerA}
            onChange={setPartnerA}
            showIsMe
            showBaptized
            currentMember={currentMember}
            onSearchPress={() => setShowMemberSearch('partner_a')}
            accentColor="#D4AF37"
          />
        </Animated.View>
      );
    }

    if (step === 'partner_b') {
      return (
        <Animated.View entering={FadeInRight.duration(300)}>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            {t('requests.matrimony.partnerB', 'Second Partner')}
          </Text>
          <Text className="text-gray-600 mb-6">
            {t('requests.matrimony.partnerBDesc', "Enter the second partner's details")}
          </Text>

          <PersonInfoForm
            label=""
            value={partnerB}
            onChange={setPartnerB}
            showBaptized
            onSearchPress={() => setShowMemberSearch('partner_b')}
            accentColor="#D4AF37"
          />
        </Animated.View>
      );
    }

    if (step === 'details') {
      return (
        <Animated.View entering={FadeInRight.duration(300)}>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            {t('requests.matrimony.weddingDetails', 'Wedding Details')}
          </Text>
          <Text className="text-gray-600 mb-6">
            {t('requests.matrimony.detailsDesc', 'Provide additional information')}
          </Text>

          {/* Baptism Status Warning */}
          {!bothBaptized && (
            <View className="flex-row items-start p-4 bg-amber-50 border border-amber-200 rounded-xl mb-6">
              <AlertTriangle size={20} color="#D97706" />
              <View className="flex-1 ml-3">
                <Text className="font-medium text-amber-800">
                  {t('requests.matrimony.baptismWarning', 'Baptism Requirement')}
                </Text>
                <Text className="text-sm text-amber-700 mt-1">
                  {t(
                    'requests.matrimony.baptismWarningText',
                    'For a church wedding, both partners are usually required to be baptized. Our pastoral team will discuss this with you.'
                  )}
                </Text>
              </View>
            </View>
          )}

          {/* Baptism Status Summary */}
          <View className="bg-gray-50 rounded-xl p-4 mb-6">
            <Text className="font-medium text-gray-700 mb-3">
              {t('requests.matrimony.baptismStatus', 'Baptism Status')}
            </Text>
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-gray-600">{partnerA.name || 'Partner A'}</Text>
              <View
                className={`flex-row items-center px-3 py-1 rounded-full ${
                  partnerA.is_baptized ? 'bg-green-100' : 'bg-gray-200'
                }`}
              >
                {partnerA.is_baptized && <Check size={14} color="#10B981" />}
                <Text
                  className={`text-sm ml-1 ${
                    partnerA.is_baptized ? 'text-green-700' : 'text-gray-500'
                  }`}
                >
                  {partnerA.is_baptized
                    ? t('requests.matrimony.baptized', 'Baptized')
                    : t('requests.matrimony.notBaptized', 'Not Baptized')}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <Text className="text-gray-600">{partnerB.name || 'Partner B'}</Text>
              <View
                className={`flex-row items-center px-3 py-1 rounded-full ${
                  partnerB.is_baptized ? 'bg-green-100' : 'bg-gray-200'
                }`}
              >
                {partnerB.is_baptized && <Check size={14} color="#10B981" />}
                <Text
                  className={`text-sm ml-1 ${
                    partnerB.is_baptized ? 'text-green-700' : 'text-gray-500'
                  }`}
                >
                  {partnerB.is_baptized
                    ? t('requests.matrimony.baptized', 'Baptized')
                    : t('requests.matrimony.notBaptized', 'Not Baptized')}
                </Text>
              </View>
            </View>
          </View>

          {/* Planned Wedding Date */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('requests.matrimony.plannedDate', 'Planned Wedding Date (Optional)')}
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center h-12 px-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Calendar size={20} color="#6B7280" />
              <Text className={`ml-3 flex-1 ${plannedDate ? 'text-gray-900' : 'text-gray-400'}`}>
                {plannedDate
                  ? plannedDate.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })
                  : t('requests.matrimony.selectDate', 'Select planned date')}
              </Text>
            </Pressable>
            <Text className="text-xs text-gray-500 mt-1">
              {t('requests.matrimony.dateNote', 'Final date will be confirmed based on availability')}
            </Text>

            {showDatePicker && (
              <DateTimePicker
                value={plannedDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                minimumDate={new Date()}
              />
            )}
          </View>

          {/* Additional Notes */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('requests.matrimony.notes', 'Additional Notes (Optional)')}
            </Text>
            <Textarea size="lg" className="bg-gray-50">
              <TextareaInput
                placeholder={t(
                  'requests.matrimony.notesPlaceholder',
                  'Any questions, preferences, or special requests...'
                )}
                value={notes}
                onChangeText={setNotes}
                numberOfLines={3}
              />
            </Textarea>
          </View>
        </Animated.View>
      );
    }

    return null;
  };

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
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-gray-100 items-center justify-center"
          >
            <ArrowLeft size={20} color="#374151" />
          </Pressable>
          <View className="flex-1 items-center">
            <Text className="text-lg font-semibold text-gray-900">
              {t('requests.matrimony.title', 'Holy Matrimony')}
            </Text>
          </View>
          <View className="w-10" />
        </Animated.View>

        {/* Step Indicator */}
        <StepIndicator
          totalSteps={STEPS.length}
          currentStep={currentStep}
          labels={[
            t('requests.matrimony.stepPartnerA', 'Partner A'),
            t('requests.matrimony.stepPartnerB', 'Partner B'),
            t('requests.matrimony.stepDetails', 'Details'),
          ]}
          accentColor="#D4AF37"
        />

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {renderStepContent()}
        </ScrollView>

        {/* Bottom Button */}
        <Animated.View
          entering={FadeInDown.delay(300).duration(400)}
          className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100"
          style={{ paddingBottom: 34 }}
        >
          {currentStep < STEPS.length - 1 ? (
            <Button
              size="lg"
              onPress={handleNext}
              disabled={!canProceed()}
              className={`w-full ${!canProceed() ? 'opacity-50' : ''}`}
              style={{ backgroundColor: canProceed() ? '#D4AF37' : '#E5E7EB' }}
            >
              <ButtonText className="text-white">{t('common.next', 'Next')}</ButtonText>
              <ButtonIcon as={ChevronRight} className="text-white ml-2" />
            </Button>
          ) : (
            <Button
              size="lg"
              onPress={handleSubmit}
              disabled={isSubmitting}
              className="w-full"
              style={{ backgroundColor: '#D4AF37' }}
            >
              {isSubmitting ? (
                <ButtonSpinner color="#FFFFFF" />
              ) : (
                <ButtonText className="text-white">
                  {t('requests.matrimony.submit', 'Submit Request')}
                </ButtonText>
              )}
            </Button>
          )}
        </Animated.View>

        {/* Member Search Modal */}
        <Modal visible={showMemberSearch !== null} animationType="slide">
          <SafeAreaView className="flex-1">
            <MemberSearchSheet
              title={
                showMemberSearch === 'partner_a'
                  ? t('requests.search.searchPartnerA', 'Search Partner')
                  : t('requests.search.searchPartnerB', 'Search Partner')
              }
              onSelect={handleMemberSelect}
              onClose={() => setShowMemberSearch(null)}
              onCreateNew={() => setShowMemberSearch(null)}
              excludeIds={
                showMemberSearch === 'partner_b' && partnerA.member_id
                  ? [partnerA.member_id]
                  : []
              }
            />
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
