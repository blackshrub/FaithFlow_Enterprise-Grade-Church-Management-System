/**
 * Child Dedication Screen - Multi-step form
 *
 * Flow (3 steps):
 * 1. Father: [I am the father] / [Search] / [Enter manually]
 * 2. Mother: [I am the mother] / [Search] / [Enter manually]
 * 3. Child: Name, DOB, Gender, Required Photo
 * 4. Submit → Success
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ArrowLeft, Baby, User, Camera, Calendar, ChevronRight } from 'lucide-react-native';

import { Button, ButtonText, ButtonSpinner, ButtonIcon } from '@/components/ui/button';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';
import {
  StepIndicator,
  PersonInfoForm,
  PhotoCaptureSheet,
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

interface ChildInfo {
  name: string;
  birth_date: Date | null;
  gender: 'male' | 'female' | null;
  photo_uri: string | null;
}

const STEPS = ['father', 'mother', 'child'] as const;
type Step = typeof STEPS[number];

export default function ChildDedicationScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member, churchId } = useAuthStore();

  const [currentStep, setCurrentStep] = useState<number>(0);
  const [father, setFather] = useState<PersonInfo>({ name: '', phone: '' });
  const [mother, setMother] = useState<PersonInfo>({ name: '', phone: '' });
  const [child, setChild] = useState<ChildInfo>({
    name: '',
    birth_date: null,
    gender: null,
    photo_uri: null,
  });

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPhotoCapture, setShowPhotoCapture] = useState(false);
  const [showMemberSearch, setShowMemberSearch] = useState<'father' | 'mother' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  // Track if the registrant was auto-assigned as parent (based on gender)
  const [registrantRole, setRegistrantRole] = useState<'father' | 'mother' | null>(null);

  const currentMember = member ? {
    id: member.id,
    full_name: member.full_name,
    phone: member.phone_whatsapp || '',
    photo_url: member.photo_url,
  } : undefined;

  // Gender-based auto-assignment: If registrant is male, auto-assign as father and skip to mother step
  // If registrant is female, auto-assign as mother and start at father step (no "This is me" for father)
  useEffect(() => {
    if (member?.gender && currentMember) {
      if (member.gender === 'male') {
        // Male registrant → auto-assign as father, skip to mother step
        setFather({
          name: currentMember.full_name,
          phone: currentMember.phone,
          member_id: currentMember.id,
          is_baptized: false,
        });
        setRegistrantRole('father');
        setCurrentStep(1); // Skip to mother step
      } else if (member.gender === 'female') {
        // Female registrant → auto-assign as mother, start at father step (no "This is me" option)
        setMother({
          name: currentMember.full_name,
          phone: currentMember.phone,
          member_id: currentMember.id,
          is_baptized: false,
        });
        setRegistrantRole('mother');
        setCurrentStep(0); // Start at father step
      }
    }
  }, [member?.gender, member?.id]);

  const canProceed = useCallback(() => {
    switch (STEPS[currentStep]) {
      case 'father':
        return father.name.trim().length > 0 && father.phone.trim().length > 0;
      case 'mother':
        return mother.name.trim().length > 0 && mother.phone.trim().length > 0;
      case 'child':
        return (
          child.name.trim().length > 0 &&
          child.birth_date !== null &&
          child.gender !== null &&
          child.photo_uri !== null
        );
      default:
        return false;
    }
  }, [currentStep, father, mother, child]);

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
    if (showMemberSearch === 'father') {
      setFather({
        name: selectedMember.full_name,
        phone: selectedMember.phone,
        member_id: selectedMember.id,
      });
    } else if (showMemberSearch === 'mother') {
      setMother({
        name: selectedMember.full_name,
        phone: selectedMember.phone,
        member_id: selectedMember.id,
      });
    }
    setShowMemberSearch(null);
  }, [showMemberSearch]);

  const handlePhotoCapture = useCallback((photoUri: string) => {
    setChild({ ...child, photo_uri: photoUri });
    setShowPhotoCapture(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [child]);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setChild({ ...child, birth_date: selectedDate });
    }
  };

  const handleSubmit = useCallback(async () => {
    if (!canProceed()) return;

    setIsSubmitting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      // Upload photo first
      let photoUrl = null;
      if (child.photo_uri) {
        const formData = new FormData();
        formData.append('photo', {
          uri: child.photo_uri,
          type: 'image/jpeg',
          name: 'child_photo.jpg',
        } as any);
        formData.append('church_id', churchId || '');

        const uploadResponse = await api.post('/public/kiosk/member-care/upload-child-photo', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        photoUrl = uploadResponse.data.url;
      }

      // Submit dedication request
      await api.post('/public/kiosk/member-care/child-dedication', {
        church_id: churchId,
        member_id: member?.id,
        full_name: member?.full_name,
        phone: member?.phone_whatsapp,
        father: {
          name: father.name,
          phone: father.phone,
          member_id: father.member_id || null,
          is_baptized: father.is_baptized || false,
        },
        mother: {
          name: mother.name,
          phone: mother.phone,
          member_id: mother.member_id || null,
          is_baptized: mother.is_baptized || false,
        },
        child: {
          name: child.name,
          birth_date: child.birth_date?.toISOString().split('T')[0],
          gender: child.gender,
          photo_url: photoUrl,
        },
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
  }, [churchId, member, father, mother, child, canProceed, t]);

  // Success screen
  if (isSuccess) {
    return (
      <SafeAreaView className="flex-1 bg-white">
        <SuccessScreen
          type="child-dedication"
          title={t('requests.childDedication.successTitle', 'Request Submitted!')}
          subtitle={t(
            'requests.childDedication.successText',
            'Our pastoral team will contact you to schedule the dedication ceremony.'
          )}
          nextSteps={[
            { text: t('requests.childDedication.next1', 'We will contact you within 3-5 days') },
            { text: t('requests.childDedication.next2', 'Parents may need to attend a preparation session') },
            { text: t('requests.childDedication.next3', 'Dedication ceremonies are usually held during Sunday service') },
          ]}
        />
      </SafeAreaView>
    );
  }

  const renderStepContent = () => {
    const step = STEPS[currentStep];

    if (step === 'father') {
      // If registrant is male and auto-assigned as father, show summary instead of form
      if (registrantRole === 'father') {
        return (
          <Animated.View entering={FadeInRight.duration(300)}>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {t('requests.childDedication.fatherInfo', "Father's Information")}
            </Text>
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <Text className="text-green-700 font-medium mb-1">
                {t('requests.childDedication.youAreFather', 'You are registered as the father')}
              </Text>
              <Text className="text-green-600">{father.name}</Text>
              <Text className="text-green-600">{father.phone}</Text>
            </View>
          </Animated.View>
        );
      }

      return (
        <Animated.View entering={FadeInRight.duration(300)}>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            {t('requests.childDedication.fatherInfo', "Father's Information")}
          </Text>
          <Text className="text-gray-600 mb-6">
            {t('requests.childDedication.fatherDesc', 'Enter the father\'s details')}
          </Text>

          <PersonInfoForm
            label=""
            value={father}
            onChange={setFather}
            showIsMe={registrantRole !== 'mother'} // Hide "This is me" if registrant is already assigned as mother
            showBaptized
            currentMember={currentMember}
            onSearchPress={() => setShowMemberSearch('father')}
            accentColor="#EC4899"
          />
        </Animated.View>
      );
    }

    if (step === 'mother') {
      // If registrant is female and auto-assigned as mother, show summary instead of form
      if (registrantRole === 'mother') {
        return (
          <Animated.View entering={FadeInRight.duration(300)}>
            <Text className="text-xl font-bold text-gray-900 mb-2">
              {t('requests.childDedication.motherInfo', "Mother's Information")}
            </Text>
            <View className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
              <Text className="text-green-700 font-medium mb-1">
                {t('requests.childDedication.youAreMother', 'You are registered as the mother')}
              </Text>
              <Text className="text-green-600">{mother.name}</Text>
              <Text className="text-green-600">{mother.phone}</Text>
            </View>
          </Animated.View>
        );
      }

      return (
        <Animated.View entering={FadeInRight.duration(300)}>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            {t('requests.childDedication.motherInfo', "Mother's Information")}
          </Text>
          <Text className="text-gray-600 mb-6">
            {t('requests.childDedication.motherDesc', 'Enter the mother\'s details')}
          </Text>

          <PersonInfoForm
            label=""
            value={mother}
            onChange={setMother}
            showIsMe={registrantRole !== 'father'} // Hide "This is me" if registrant is already assigned as father
            showBaptized
            currentMember={currentMember}
            onSearchPress={() => setShowMemberSearch('mother')}
            accentColor="#EC4899"
          />
        </Animated.View>
      );
    }

    if (step === 'child') {
      return (
        <Animated.View entering={FadeInRight.duration(300)}>
          <Text className="text-xl font-bold text-gray-900 mb-2">
            {t('requests.childDedication.childInfo', "Child's Information")}
          </Text>
          <Text className="text-gray-600 mb-6">
            {t('requests.childDedication.childDesc', 'Enter the child\'s details and photo')}
          </Text>

          {/* Child Name */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('requests.childDedication.childName', "Child's Name")} *
            </Text>
            <Input variant="outline" size="lg">
              <InputSlot className="pl-3">
                <InputIcon as={User} className="text-typography-400" />
              </InputSlot>
              <InputField
                placeholder={t('requests.form.fullName', 'Full Name')}
                value={child.name}
                onChangeText={(text) => setChild({ ...child, name: text })}
              />
            </Input>
          </View>

          {/* Birth Date */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('requests.childDedication.birthDate', 'Date of Birth')} *
            </Text>
            <Pressable
              onPress={() => setShowDatePicker(true)}
              className="flex-row items-center h-12 px-4 bg-gray-50 rounded-xl border border-gray-200"
            >
              <Calendar size={20} color="#6B7280" />
              <Text className={`ml-3 flex-1 ${child.birth_date ? 'text-gray-900' : 'text-gray-400'}`}>
                {child.birth_date
                  ? child.birth_date.toLocaleDateString()
                  : t('requests.childDedication.selectBirthDate', 'Select birth date')}
              </Text>
            </Pressable>

            {showDatePicker && (
              <DateTimePicker
                value={child.birth_date || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleDateChange}
                maximumDate={new Date()}
              />
            )}
          </View>

          {/* Gender */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('requests.form.gender', 'Gender')} *
            </Text>
            <View className="flex-row gap-3">
              <Pressable
                onPress={() => setChild({ ...child, gender: 'male' })}
                className={`flex-1 py-3 rounded-xl border-2 ${
                  child.gender === 'male'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    child.gender === 'male' ? 'text-blue-600' : 'text-gray-600'
                  }`}
                >
                  {t('requests.form.male', 'Male')}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => setChild({ ...child, gender: 'female' })}
                className={`flex-1 py-3 rounded-xl border-2 ${
                  child.gender === 'female'
                    ? 'border-pink-500 bg-pink-50'
                    : 'border-gray-200'
                }`}
              >
                <Text
                  className={`text-center font-medium ${
                    child.gender === 'female' ? 'text-pink-600' : 'text-gray-600'
                  }`}
                >
                  {t('requests.form.female', 'Female')}
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Photo */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">
              {t('requests.childDedication.childPhoto', "Child's Photo")} *
            </Text>
            <Pressable
              onPress={() => setShowPhotoCapture(true)}
              className={`items-center justify-center p-6 rounded-xl border-2 border-dashed ${
                child.photo_uri ? 'border-pink-300 bg-pink-50' : 'border-gray-300'
              }`}
            >
              {child.photo_uri ? (
                <Image
                  source={{ uri: child.photo_uri }}
                  className="w-32 h-32 rounded-xl"
                  resizeMode="cover"
                />
              ) : (
                <>
                  <Camera size={32} color="#EC4899" />
                  <Text className="text-pink-600 font-medium mt-2">
                    {t('requests.childDedication.takePhoto', 'Take Photo')}
                  </Text>
                </>
              )}
            </Pressable>
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
              {t('requests.childDedication.title', 'Child Dedication')}
            </Text>
          </View>
          <View className="w-10" />
        </Animated.View>

        {/* Step Indicator */}
        <StepIndicator
          totalSteps={STEPS.length}
          currentStep={currentStep}
          labels={[
            t('requests.childDedication.stepFather', 'Father'),
            t('requests.childDedication.stepMother', 'Mother'),
            t('requests.childDedication.stepChild', 'Child'),
          ]}
          accentColor="#EC4899"
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
              style={{ backgroundColor: canProceed() ? '#EC4899' : '#E5E7EB' }}
            >
              <ButtonText className="text-white">{t('common.next', 'Next')}</ButtonText>
              <ButtonIcon as={ChevronRight} className="text-white ml-2" />
            </Button>
          ) : (
            <Button
              size="lg"
              onPress={handleSubmit}
              disabled={isSubmitting || !canProceed()}
              className={`w-full ${!canProceed() ? 'opacity-50' : ''}`}
              style={{ backgroundColor: canProceed() ? '#EC4899' : '#E5E7EB' }}
            >
              {isSubmitting ? (
                <ButtonSpinner color="#FFFFFF" />
              ) : (
                <ButtonText className="text-white">
                  {t('requests.childDedication.submit', 'Submit Request')}
                </ButtonText>
              )}
            </Button>
          )}
        </Animated.View>

        {/* Photo Capture Modal */}
        <Modal visible={showPhotoCapture} animationType="slide">
          <PhotoCaptureSheet
            onPhotoCapture={handlePhotoCapture}
            onClose={() => setShowPhotoCapture(false)}
          />
        </Modal>

        {/* Member Search Modal */}
        <Modal visible={showMemberSearch !== null} animationType="slide">
          <SafeAreaView className="flex-1">
            <MemberSearchSheet
              title={
                showMemberSearch === 'father'
                  ? t('requests.search.searchFather', 'Search Father')
                  : t('requests.search.searchMother', 'Search Mother')
              }
              onSelect={handleMemberSelect}
              onClose={() => setShowMemberSearch(null)}
              onCreateNew={() => setShowMemberSearch(null)}
            />
          </SafeAreaView>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
