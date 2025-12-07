/**
 * Profile Edit Screen - iOS Settings Style with NativeWind
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Matches main profile screen iOS Settings style
 * - React Native + Animated for transitions
 */

import React, { useState, useCallback, memo, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  Pressable,
  TextInput,
  Dimensions,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated from 'react-native-reanimated';
import { withPremiumMotionV10 } from '@/hoc';
import {
  PMotion,
  shouldSkipEnteringAnimation,
} from '@/components/motion/premium-motion';
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  Check,
  ChevronRight,
} from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';
import { api } from '@/services/api';
import { getErrorMessage } from '@/utils/errorHelpers';

// Gluestack for AlertDialog
import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogBody,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Button, ButtonText } from '@/components/ui/button';
import { Heading } from '@/components/ui/heading';
import { Text as GText } from '@/components/ui/text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCREEN_KEY = 'profile-edit-screen';

interface MemberUpdateRequest {
  full_name?: string;
  email?: string;
  phone_whatsapp?: string;
  date_of_birth?: string;
  gender?: 'Male' | 'Female';
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  marital_status?: 'Married' | 'Not Married' | 'Widower' | 'Widow';
  occupation?: string;
  baptism_date?: string;
  membership_date?: string;
  notes?: string;
}

function ProfileEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { member, setMember } = useAuthStore();
  const skipAnimations = useMemo(() => shouldSkipEnteringAnimation(SCREEN_KEY), []);

  // Form state
  const [fullName, setFullName] = useState(member?.full_name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [phone, setPhone] = useState(member?.phone_whatsapp || '');
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    member?.date_of_birth ? new Date(member.date_of_birth) : undefined
  );
  const normalizeGender = (g: string | undefined): 'Male' | 'Female' | undefined => {
    if (!g) return undefined;
    if (g.toLowerCase() === 'male') return 'Male';
    if (g.toLowerCase() === 'female') return 'Female';
    return undefined;
  };
  const [gender, setGender] = useState<'Male' | 'Female' | undefined>(normalizeGender(member?.gender));
  const [address, setAddress] = useState(member?.address || '');
  const [city, setCity] = useState(member?.city || '');
  const [state, setState] = useState(member?.state || '');
  const [country, setCountry] = useState(member?.country || '');
  const [maritalStatus, setMaritalStatus] = useState<
    'Married' | 'Not Married' | 'Widower' | 'Widow' | undefined
  >(member?.marital_status);
  const [occupation, setOccupation] = useState(member?.occupation || '');
  const [baptismDate, setBaptismDate] = useState<Date | undefined>(
    member?.baptism_date ? new Date(member.baptism_date) : undefined
  );
  const [membershipDate, setMembershipDate] = useState<Date | undefined>(
    member?.membership_date ? new Date(member.membership_date) : undefined
  );
  const [notes, setNotes] = useState(member?.notes || '');

  // UI state
  const [saving, setSaving] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [showBaptismPicker, setShowBaptismPicker] = useState(false);
  const [showMembershipPicker, setShowMembershipPicker] = useState(false);
  const [showGenderSelect, setShowGenderSelect] = useState(false);
  const [showMaritalSelect, setShowMaritalSelect] = useState(false);

  // Format date for display
  const formatDate = useCallback((date: Date | undefined) => {
    if (!date) return '';
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  // Handle save
  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!fullName.trim()) {
      showErrorToast(t('profile.edit.error'), t('profile.edit.nameRequired'));
      return;
    }

    setSaving(true);

    try {
      const updateData: MemberUpdateRequest = {
        full_name: fullName,
        email: email || undefined,
        phone_whatsapp: phone || undefined,
        date_of_birth: dateOfBirth?.toISOString().split('T')[0],
        gender,
        address: address || undefined,
        city: city || undefined,
        state: state || undefined,
        country: country || undefined,
        marital_status: maritalStatus,
        occupation: occupation || undefined,
        baptism_date: baptismDate?.toISOString().split('T')[0],
        membership_date: membershipDate?.toISOString().split('T')[0],
        notes: notes || undefined,
      };

      const response = await api.patch(`/api/members/${member?.id}`, updateData);

      if (response.data) {
        setMember({
          ...member!,
          ...response.data,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccessToast(t('profile.edit.success'), t('profile.edit.successDesc'));
      router.back();
    } catch (error: unknown) {
      console.error('Failed to update profile:', error);
      showErrorToast(
        t('profile.edit.error'),
        getErrorMessage(error, t('profile.edit.errorDesc'))
      );
    } finally {
      setSaving(false);
    }
  };

  // Get initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // iOS Settings style menu item
  const MenuItem = ({
    label,
    value,
    placeholder,
    onPress,
    isLast = false,
    editable = true,
  }: {
    label: string;
    value?: string;
    placeholder?: string;
    onPress?: () => void;
    isLast?: boolean;
    editable?: boolean;
  }) => (
    <Pressable
      onPress={onPress}
      disabled={!editable || !onPress}
      className="active:bg-background-100 px-4 min-h-[52px] justify-center"
    >
      <View className="flex-row items-center py-3">
        <Text className="w-[100px] text-[17px] text-typography-900">{label}</Text>
        <Text
          className={`flex-1 text-[17px] text-right ${value ? 'text-typography-500' : 'text-typography-400'}`}
          numberOfLines={1}
        >
          {value || placeholder || ''}
        </Text>
        {onPress && editable && (
          <ChevronRight size={20} color="#D4D4D4" strokeWidth={2} className="ml-1" />
        )}
      </View>
      {!isLast && (
        <View className="absolute bottom-0 right-0 left-[16px] h-px bg-outline-200" />
      )}
    </Pressable>
  );

  // Input menu item for inline editing
  const InputMenuItem = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    isLast = false,
    editable = true,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    isLast?: boolean;
    editable?: boolean;
  }) => (
    <View className="px-4 min-h-[52px] justify-center">
      <View className="flex-row items-center py-3">
        <Text className="w-[100px] text-[17px] text-typography-900">{label}</Text>
        <TextInput
          className="flex-1 text-[17px] text-typography-500 text-right"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#A3A3A3"
          keyboardType={keyboardType}
          editable={editable}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
        />
      </View>
      {!isLast && (
        <View className="absolute bottom-0 right-0 left-[16px] h-px bg-outline-200" />
      )}
    </View>
  );

  // Multiline input for notes/address
  const MultilineMenuItem = ({
    label,
    value,
    onChangeText,
    placeholder,
    isLast = false,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    isLast?: boolean;
  }) => (
    <View className="px-4 py-3">
      <Text className="text-[17px] text-typography-900 mb-2">{label}</Text>
      <TextInput
        className="text-[15px] text-typography-500 min-h-[60px]"
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#A3A3A3"
        multiline
        style={{ textAlignVertical: 'top' }}
      />
      {!isLast && (
        <View className="absolute bottom-0 right-0 left-[16px] h-px bg-outline-200" />
      )}
    </View>
  );

  // Select modal
  const SelectModal = ({
    visible,
    onClose,
    options,
    selectedValue,
    onSelect,
    title,
  }: {
    visible: boolean;
    onClose: () => void;
    options: { label: string; value: string }[];
    selectedValue: string | undefined;
    onSelect: (value: any) => void;
    title: string;
  }) => (
    <AlertDialog isOpen={visible} onClose={onClose}>
      <AlertDialogBackdrop />
      <AlertDialogContent className="rounded-2xl max-w-[320px]">
        <AlertDialogHeader>
          <Heading size="lg">{title}</Heading>
        </AlertDialogHeader>
        <AlertDialogBody>
          <View className="gap-1">
            {options.map((option) => (
              <Pressable
                key={option.value}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onSelect(option.value);
                  onClose();
                }}
                className={`flex-row items-center justify-between py-3 px-3 rounded-xl ${selectedValue === option.value ? 'bg-primary-50' : ''}`}
              >
                <GText className={selectedValue === option.value ? 'text-primary-600 font-semibold' : ''}>
                  {option.label}
                </GText>
                {selectedValue === option.value && (
                  <Check size={18} color="#4F46E5" />
                )}
              </Pressable>
            ))}
          </View>
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button variant="outline" onPress={onClose} className="border-outline-300">
            <ButtonText className="text-typography-700">{t('common.cancel', 'Cancel')}</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return (
    <View className="flex-1 bg-[#F2F2F7]">
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View
        className="bg-[#F2F2F7] px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <View className="flex-row items-center justify-between h-11">
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            className="w-10 h-10 rounded-full items-center justify-center active:opacity-70"
          >
            <ChevronLeft size={24} color="#171717" />
          </Pressable>
          <Text className="text-lg font-semibold text-typography-900">
            {t('profile.edit.title', 'Edit Profile')}
          </Text>
          <Pressable
            onPress={handleSave}
            disabled={saving}
            className="px-3 py-2 active:opacity-70"
          >
            {saving ? (
              <ActivityIndicator size="small" color="#4F46E5" />
            ) : (
              <Text className="text-[17px] font-semibold text-primary-600">
                {t('common.save', 'Save')}
              </Text>
            )}
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: insets.bottom + 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets={true}
        keyboardDismissMode="interactive"
      >
        {/* Profile Avatar */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(0)}
          className="items-center mb-5"
        >
          <LinearGradient
            colors={['#4F46E5', '#6366F1']}
            style={{ width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' }}
          >
            <Text className="text-[28px] font-bold text-white">
              {getInitials(fullName || 'User')}
            </Text>
          </LinearGradient>
          <Text className="text-[13px] text-typography-500 mt-2">
            {t('profile.edit.avatarHint', 'Tap to change photo')}
          </Text>
        </Animated.View>

        {/* Basic Information */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(1)}
          className="mb-7"
        >
          <Text className="text-[13px] font-medium text-typography-500 mb-2.5 ml-4 tracking-wide uppercase">
            {t('profile.edit.basicInfo', 'Basic Information')}
          </Text>
          <View className="bg-white rounded-xl overflow-hidden">
            <InputMenuItem
              label={t('profile.edit.name', 'Name')}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('profile.edit.fullNamePlaceholder', 'Full name')}
            />
            <InputMenuItem
              label={t('profile.edit.email', 'Email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('profile.edit.emailPlaceholder', 'Email address')}
              keyboardType="email-address"
            />
            <InputMenuItem
              label={t('profile.edit.phone', 'Phone')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('profile.edit.phonePlaceholder', '+62 812 3456 7890')}
              keyboardType="phone-pad"
            />
            <MenuItem
              label={t('profile.edit.birthday', 'Birthday')}
              value={formatDate(dateOfBirth)}
              placeholder={t('profile.edit.selectDate', 'Select date')}
              onPress={() => setShowDobPicker(true)}
            />
            <MenuItem
              label={t('profile.edit.gender', 'Gender')}
              value={gender}
              placeholder={t('profile.edit.selectGender', 'Select')}
              onPress={() => setShowGenderSelect(true)}
            />
            <MenuItem
              label={t('profile.edit.status', 'Status')}
              value={maritalStatus}
              placeholder={t('profile.edit.selectMaritalStatus', 'Select')}
              onPress={() => setShowMaritalSelect(true)}
              isLast
            />
          </View>
        </Animated.View>

        {/* Location */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(2)}
          className="mb-7"
        >
          <Text className="text-[13px] font-medium text-typography-500 mb-2.5 ml-4 tracking-wide uppercase">
            {t('profile.edit.locationInfo', 'Location')}
          </Text>
          <View className="bg-white rounded-xl overflow-hidden">
            <MultilineMenuItem
              label={t('profile.edit.address', 'Address')}
              value={address}
              onChangeText={setAddress}
              placeholder={t('profile.edit.addressPlaceholder', 'Street address')}
            />
            <InputMenuItem
              label={t('profile.edit.city', 'City')}
              value={city}
              onChangeText={setCity}
              placeholder="City"
            />
            <InputMenuItem
              label={t('profile.edit.state', 'Province')}
              value={state}
              onChangeText={setState}
              placeholder="Province"
            />
            <InputMenuItem
              label={t('profile.edit.country', 'Country')}
              value={country}
              onChangeText={setCountry}
              placeholder="Indonesia"
              isLast
            />
          </View>
        </Animated.View>

        {/* Church Information */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(3)}
          className="mb-7"
        >
          <Text className="text-[13px] font-medium text-typography-500 mb-2.5 ml-4 tracking-wide uppercase">
            {t('profile.edit.churchInfo', 'Church Information')}
          </Text>
          <View className="bg-white rounded-xl overflow-hidden">
            <InputMenuItem
              label={t('profile.edit.occupation', 'Job')}
              value={occupation}
              onChangeText={setOccupation}
              placeholder={t('profile.edit.occupationPlaceholder', 'Your occupation')}
            />
            <MenuItem
              label={t('profile.edit.baptism', 'Baptism')}
              value={formatDate(baptismDate)}
              placeholder={t('profile.edit.selectDate', 'Select date')}
              onPress={() => setShowBaptismPicker(true)}
            />
            <MenuItem
              label={t('profile.edit.joined', 'Joined')}
              value={formatDate(membershipDate)}
              placeholder={t('profile.edit.selectDate', 'Select date')}
              onPress={() => setShowMembershipPicker(true)}
              isLast
            />
          </View>
        </Animated.View>

        {/* Notes */}
        <Animated.View
          entering={skipAnimations ? undefined : PMotion.sectionStagger(4)}
          className="mb-7"
        >
          <Text className="text-[13px] font-medium text-typography-500 mb-2.5 ml-4 tracking-wide uppercase">
            {t('profile.edit.notes', 'Notes')}
          </Text>
          <View className="bg-white rounded-xl overflow-hidden">
            <MultilineMenuItem
              label={t('profile.edit.additionalNotes', 'Additional Notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('profile.edit.notesPlaceholder', 'Any additional information')}
              isLast
            />
          </View>
        </Animated.View>
      </ScrollView>

      {/* Date Pickers */}
      {showDobPicker && (
        <DateTimePicker
          value={dateOfBirth || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDobPicker(Platform.OS === 'ios');
            if (selectedDate) setDateOfBirth(selectedDate);
          }}
          maximumDate={new Date()}
        />
      )}

      {showBaptismPicker && (
        <DateTimePicker
          value={baptismDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowBaptismPicker(Platform.OS === 'ios');
            if (selectedDate) setBaptismDate(selectedDate);
          }}
          maximumDate={new Date()}
        />
      )}

      {showMembershipPicker && (
        <DateTimePicker
          value={membershipDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowMembershipPicker(Platform.OS === 'ios');
            if (selectedDate) setMembershipDate(selectedDate);
          }}
          maximumDate={new Date()}
        />
      )}

      {/* Select Modals */}
      <SelectModal
        visible={showGenderSelect}
        onClose={() => setShowGenderSelect(false)}
        title={t('profile.edit.selectGender', 'Select Gender')}
        options={[
          { label: t('profile.edit.male', 'Male'), value: 'Male' },
          { label: t('profile.edit.female', 'Female'), value: 'Female' },
        ]}
        selectedValue={gender}
        onSelect={setGender}
      />

      <SelectModal
        visible={showMaritalSelect}
        onClose={() => setShowMaritalSelect(false)}
        title={t('profile.edit.selectMaritalStatus', 'Select Marital Status')}
        options={[
          { label: t('profile.edit.married', 'Married'), value: 'Married' },
          { label: t('profile.edit.notMarried', 'Not Married'), value: 'Not Married' },
          { label: t('profile.edit.widower', 'Widower'), value: 'Widower' },
          { label: t('profile.edit.widow', 'Widow'), value: 'Widow' },
        ]}
        selectedValue={maritalStatus}
        onSelect={setMaritalStatus}
      />
    </View>
  );
}

const MemoizedProfileEditScreen = memo(ProfileEditScreen);
MemoizedProfileEditScreen.displayName = 'ProfileEditScreen';
export default withPremiumMotionV10(MemoizedProfileEditScreen);
