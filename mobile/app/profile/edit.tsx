/**
 * Profile Edit Screen
 *
 * Features:
 * - Edit member profile information
 * - Form validation
 * - Date pickers for birth date, baptism, membership
 * - Gender and marital status selects
 * - Save with loading state
 * - Toast notifications
 * - Complete bilingual support
 */

import React, { useState } from 'react';
import { ScrollView, Platform, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Heart,
} from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText } from '@/components/ui/button';
import { Input, InputField } from '@/components/ui/input';
import { Textarea, TextareaInput } from '@/components/ui/textarea';
import {
  FormControl,
  FormControlLabel,
  FormControlLabelText,
} from '@/components/ui/form-control';
import {
  Select,
  SelectTrigger,
  SelectInput,
  SelectIcon,
  SelectPortal,
  SelectBackdrop,
  SelectContent,
  SelectDragIndicatorWrapper,
  SelectDragIndicator,
  SelectItem,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';

import { useAuthStore } from '@/stores/auth';
import { colors, borderRadius, spacing, shadows } from '@/constants/theme';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';
import { api } from '@/services/api';

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

export default function ProfileEditScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { member, setMember } = useAuthStore();

  // Form state
  const [fullName, setFullName] = useState(member?.full_name || '');
  const [email, setEmail] = useState(member?.email || '');
  const [phone, setPhone] = useState(member?.phone_whatsapp || '');
  const [dateOfBirth, setDateOfBirth] = useState<Date | undefined>(
    member?.date_of_birth ? new Date(member.date_of_birth) : undefined
  );
  // Normalize gender value to expected case
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

  // Format date for display
  const formatDate = (date: Date | undefined) => {
    if (!date) return t('profile.edit.selectDate');
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  // Handle save
  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Validation
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

      // Update local member state
      if (response.data) {
        setMember({
          ...member!,
          ...response.data,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      showSuccessToast(t('profile.edit.success'), t('profile.edit.successDesc'));
      router.back();
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      showErrorToast(
        t('profile.edit.error'),
        error.response?.data?.detail || t('profile.edit.errorDesc')
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="px-6 pt-4 pb-4 bg-white border-b border-gray-200">
        <HStack space="md" className="items-center">
          <Pressable onPress={() => router.back()} className="active:opacity-60">
            <View
              style={{
                width: 40,
                height: 40,
                borderRadius: 999,
                backgroundColor: colors.gray[100],
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Icon as={ChevronLeft} size="lg" className="text-gray-700" />
            </View>
          </Pressable>
          <VStack className="flex-1">
            <Heading size="lg" className="text-gray-900">
              {t('profile.edit.title')}
            </Heading>
            <Text className="text-gray-600" size="sm">
              {t('profile.edit.subtitle')}
            </Text>
          </VStack>
        </HStack>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        <VStack space="lg" className="px-6 py-6">
          {/* Basic Information */}
          <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
            <VStack space="md" className="p-5">
              <HStack space="sm" className="items-center mb-2">
                <Icon as={User} size="md" className="text-primary-500" />
                <Heading size="md" className="text-gray-900">
                  {t('profile.edit.basicInfo')}
                </Heading>
              </HStack>

              {/* Full Name */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.fullName')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={fullName}
                    onChangeText={setFullName}
                    placeholder={t('profile.edit.fullNamePlaceholder')}
                  />
                </Input>
              </FormControl>

              {/* Email */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.email')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={email}
                    onChangeText={setEmail}
                    placeholder={t('profile.edit.emailPlaceholder')}
                    keyboardType="email-address"
                    autoCapitalize="none"
                  />
                </Input>
              </FormControl>

              {/* Phone */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.phone')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={phone}
                    onChangeText={setPhone}
                    placeholder={t('profile.edit.phonePlaceholder')}
                    keyboardType="phone-pad"
                  />
                </Input>
              </FormControl>

              {/* Date of Birth */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.dateOfBirth')}</FormControlLabelText>
                </FormControlLabel>
                <Pressable onPress={() => setShowDobPicker(true)}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.gray[300],
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm + 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text className={dateOfBirth ? 'text-gray-900' : 'text-gray-400'}>
                      {formatDate(dateOfBirth)}
                    </Text>
                    <Icon
                      as={CalendarIcon}
                      size="sm"
                      className={dateOfBirth ? 'text-primary-500' : 'text-gray-400'}
                    />
                  </View>
                </Pressable>
              </FormControl>

              {/* Gender */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.gender')}</FormControlLabelText>
                </FormControlLabel>
                <Select selectedValue={gender} onValueChange={(value) => setGender(value as any)}>
                  <SelectTrigger>
                    <SelectInput placeholder={t('profile.edit.selectGender')} />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label={t('profile.edit.male')} value="Male" />
                      <SelectItem label={t('profile.edit.female')} value="Female" />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </FormControl>

              {/* Marital Status */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.maritalStatus')}</FormControlLabelText>
                </FormControlLabel>
                <Select
                  selectedValue={maritalStatus}
                  onValueChange={(value) => setMaritalStatus(value as any)}
                >
                  <SelectTrigger>
                    <SelectInput placeholder={t('profile.edit.selectMaritalStatus')} />
                    <SelectIcon />
                  </SelectTrigger>
                  <SelectPortal>
                    <SelectBackdrop />
                    <SelectContent>
                      <SelectDragIndicatorWrapper>
                        <SelectDragIndicator />
                      </SelectDragIndicatorWrapper>
                      <SelectItem label={t('profile.edit.married')} value="Married" />
                      <SelectItem label={t('profile.edit.notMarried')} value="Not Married" />
                      <SelectItem label={t('profile.edit.widower')} value="Widower" />
                      <SelectItem label={t('profile.edit.widow')} value="Widow" />
                    </SelectContent>
                  </SelectPortal>
                </Select>
              </FormControl>
            </VStack>
          </Card>

          {/* Location Information */}
          <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
            <VStack space="md" className="p-5">
              <HStack space="sm" className="items-center mb-2">
                <Icon as={MapPin} size="md" className="text-primary-500" />
                <Heading size="md" className="text-gray-900">
                  {t('profile.edit.locationInfo')}
                </Heading>
              </HStack>

              {/* Address */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.address')}</FormControlLabelText>
                </FormControlLabel>
                <Textarea>
                  <TextareaInput
                    value={address}
                    onChangeText={setAddress}
                    placeholder={t('profile.edit.addressPlaceholder')}
                  />
                </Textarea>
              </FormControl>

              {/* City */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.city')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={city}
                    onChangeText={setCity}
                    placeholder={t('profile.edit.cityPlaceholder')}
                  />
                </Input>
              </FormControl>

              {/* State */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.state')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={state}
                    onChangeText={setState}
                    placeholder={t('profile.edit.statePlaceholder')}
                  />
                </Input>
              </FormControl>

              {/* Country */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.country')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={country}
                    onChangeText={setCountry}
                    placeholder={t('profile.edit.countryPlaceholder')}
                  />
                </Input>
              </FormControl>
            </VStack>
          </Card>

          {/* Church Information */}
          <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
            <VStack space="md" className="p-5">
              <HStack space="sm" className="items-center mb-2">
                <Icon as={Heart} size="md" className="text-primary-500" />
                <Heading size="md" className="text-gray-900">
                  {t('profile.edit.churchInfo')}
                </Heading>
              </HStack>

              {/* Occupation */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.occupation')}</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={occupation}
                    onChangeText={setOccupation}
                    placeholder={t('profile.edit.occupationPlaceholder')}
                  />
                </Input>
              </FormControl>

              {/* Baptism Date */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.baptismDate')}</FormControlLabelText>
                </FormControlLabel>
                <Pressable onPress={() => setShowBaptismPicker(true)}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.gray[300],
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm + 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text className={baptismDate ? 'text-gray-900' : 'text-gray-400'}>
                      {formatDate(baptismDate)}
                    </Text>
                    <Icon
                      as={CalendarIcon}
                      size="sm"
                      className={baptismDate ? 'text-primary-500' : 'text-gray-400'}
                    />
                  </View>
                </Pressable>
              </FormControl>

              {/* Membership Date */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.membershipDate')}</FormControlLabelText>
                </FormControlLabel>
                <Pressable onPress={() => setShowMembershipPicker(true)}>
                  <View
                    style={{
                      borderWidth: 1,
                      borderColor: colors.gray[300],
                      borderRadius: borderRadius.md,
                      paddingHorizontal: spacing.md,
                      paddingVertical: spacing.sm + 2,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <Text className={membershipDate ? 'text-gray-900' : 'text-gray-400'}>
                      {formatDate(membershipDate)}
                    </Text>
                    <Icon
                      as={CalendarIcon}
                      size="sm"
                      className={membershipDate ? 'text-primary-500' : 'text-gray-400'}
                    />
                  </View>
                </Pressable>
              </FormControl>

              {/* Notes */}
              <FormControl>
                <FormControlLabel>
                  <FormControlLabelText>{t('profile.edit.notes')}</FormControlLabelText>
                </FormControlLabel>
                <Textarea>
                  <TextareaInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder={t('profile.edit.notesPlaceholder')}
                  />
                </Textarea>
              </FormControl>
            </VStack>
          </Card>
        </VStack>

        {/* Save Button */}
        <View className="px-6 pb-6">
          <Button
            size="lg"
            onPress={handleSave}
            disabled={saving}
            style={{
              backgroundColor: colors.primary[500],
              borderRadius: borderRadius.lg,
            }}
          >
            {saving ? (
              <HStack space="sm" className="items-center">
                <Spinner size="small" color="#ffffff" />
                <ButtonText>{t('profile.edit.saving')}</ButtonText>
              </HStack>
            ) : (
              <ButtonText>{t('profile.edit.save')}</ButtonText>
            )}
          </Button>
        </View>

        {/* Bottom padding */}
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Date Pickers */}
      {showDobPicker && (
        <DateTimePicker
          value={dateOfBirth || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, selectedDate) => {
            setShowDobPicker(Platform.OS === 'ios');
            if (selectedDate) {
              setDateOfBirth(selectedDate);
            }
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
            if (selectedDate) {
              setBaptismDate(selectedDate);
            }
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
            if (selectedDate) {
              setMembershipDate(selectedDate);
            }
          }}
          maximumDate={new Date()}
        />
      )}
    </SafeAreaView>
  );
}
