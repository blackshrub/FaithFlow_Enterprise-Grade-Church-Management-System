/**
 * Profile Edit Screen - Premium World-Class Redesign
 *
 * Features:
 * - Premium gradient header
 * - Elegant form sections with icons
 * - Smooth date pickers
 * - Beautiful save button
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  ChevronLeft,
  Calendar as CalendarIcon,
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Heart,
  ChevronDown,
  Check,
} from 'lucide-react-native';

import { useAuthStore } from '@/stores/auth';
import { showSuccessToast, showErrorToast } from '@/components/ui/Toast';
import { api } from '@/services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Premium color palette
const Colors = {
  gradient: {
    start: '#1a1a2e',
    mid: '#16213e',
    end: '#0f3460',
  },
  accent: {
    primary: '#C9A962',
    light: '#E8D5A8',
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
  success: '#10B981',
  error: '#EF4444',
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

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
  const insets = useSafeAreaInsets();
  const { member, setMember } = useAuthStore();

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
    if (!date) return t('profile.edit.selectDate', 'Select date');
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [t]);

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

  // Get initials
  const getInitials = (name: string) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Input component
  const InputField = ({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType = 'default',
    multiline = false,
    editable = true,
  }: {
    label: string;
    value: string;
    onChangeText: (text: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    multiline?: boolean;
    editable?: boolean;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <TextInput
        style={[
          styles.textInput,
          multiline && styles.textInputMultiline,
          !editable && styles.textInputDisabled,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.neutral[400]}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
      />
    </View>
  );

  // Date picker field
  const DateField = ({
    label,
    value,
    onPress,
  }: {
    label: string;
    value: Date | undefined;
    onPress: () => void;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.fieldRow,
          pressed && styles.fieldRowPressed,
        ]}
      >
        <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]} numberOfLines={1}>
          {formatDate(value)}
        </Text>
        <View style={styles.fieldIconWrap}>
          <CalendarIcon size={18} color={Colors.neutral[500]} />
        </View>
      </Pressable>
    </View>
  );

  // Select field
  const SelectField = ({
    label,
    value,
    placeholder,
    onPress,
  }: {
    label: string;
    value: string | undefined;
    placeholder: string;
    onPress: () => void;
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.fieldRow,
          pressed && styles.fieldRowPressed,
        ]}
      >
        <Text style={[styles.fieldText, !value && styles.fieldPlaceholder]} numberOfLines={1}>
          {value || placeholder}
        </Text>
        <View style={styles.fieldIconWrap}>
          <ChevronDown size={18} color={Colors.neutral[500]} />
        </View>
      </Pressable>
    </View>
  );

  // Simple select modal
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
  }) => {
    if (!visible) return null;
    return (
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>{title}</Text>
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSelect(option.value);
                onClose();
              }}
              style={[
                styles.modalOption,
                selectedValue === option.value && styles.modalOptionSelected,
              ]}
            >
              <Text
                style={[
                  styles.modalOptionText,
                  selectedValue === option.value && styles.modalOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {selectedValue === option.value && (
                <Check size={18} color={Colors.gradient.end} />
              )}
            </Pressable>
          ))}
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <LinearGradient
        colors={[Colors.gradient.start, Colors.gradient.mid]}
        style={[styles.header, { paddingTop: insets.top + spacing.sm }]}
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
            style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          >
            <ChevronLeft size={24} color={Colors.white} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('profile.edit.title', 'Edit Profile')}</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Avatar */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(100)}
          style={styles.avatarSection}
        >
          <LinearGradient
            colors={[Colors.accent.primary, Colors.accent.light]}
            style={styles.avatar}
          >
            <Text style={styles.avatarText}>{getInitials(fullName)}</Text>
          </LinearGradient>
          <Text style={styles.avatarHint}>
            {t('profile.edit.avatarHint', 'Update your information below')}
          </Text>
        </Animated.View>
      </LinearGradient>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Basic Information */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(150)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <User size={18} color={Colors.gradient.end} />
            </View>
            <Text style={styles.sectionTitle}>
              {t('profile.edit.basicInfo', 'Basic Information')}
            </Text>
          </View>
          <View style={styles.card}>
            <InputField
              label={t('profile.edit.fullName', 'Full Name')}
              value={fullName}
              onChangeText={setFullName}
              placeholder={t('profile.edit.fullNamePlaceholder', 'Enter your full name')}
            />
            <InputField
              label={t('profile.edit.email', 'Email')}
              value={email}
              onChangeText={setEmail}
              placeholder={t('profile.edit.emailPlaceholder', 'Enter your email')}
              keyboardType="email-address"
            />
            <InputField
              label={t('profile.edit.phone', 'WhatsApp Number')}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('profile.edit.phonePlaceholder', '+62 812 3456 7890')}
              keyboardType="phone-pad"
            />
            <DateField
              label={t('profile.edit.dateOfBirth', 'Date of Birth')}
              value={dateOfBirth}
              onPress={() => setShowDobPicker(true)}
            />
            <SelectField
              label={t('profile.edit.gender', 'Gender')}
              value={gender}
              placeholder={t('profile.edit.selectGender', 'Select gender')}
              onPress={() => setShowGenderSelect(true)}
            />
            <SelectField
              label={t('profile.edit.maritalStatus', 'Marital Status')}
              value={maritalStatus}
              placeholder={t('profile.edit.selectMaritalStatus', 'Select status')}
              onPress={() => setShowMaritalSelect(true)}
            />
          </View>
        </Animated.View>

        {/* Location Information */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(200)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <MapPin size={18} color={Colors.gradient.end} />
            </View>
            <Text style={styles.sectionTitle}>
              {t('profile.edit.locationInfo', 'Location')}
            </Text>
          </View>
          <View style={styles.card}>
            <InputField
              label={t('profile.edit.address', 'Address')}
              value={address}
              onChangeText={setAddress}
              placeholder={t('profile.edit.addressPlaceholder', 'Enter your address')}
              multiline
            />
            <View style={styles.row}>
              <View style={styles.halfWidth}>
                <InputField
                  label={t('profile.edit.city', 'City')}
                  value={city}
                  onChangeText={setCity}
                  placeholder="City"
                />
              </View>
              <View style={styles.halfWidth}>
                <InputField
                  label={t('profile.edit.state', 'State/Province')}
                  value={state}
                  onChangeText={setState}
                  placeholder="State"
                />
              </View>
            </View>
            <InputField
              label={t('profile.edit.country', 'Country')}
              value={country}
              onChangeText={setCountry}
              placeholder={t('profile.edit.countryPlaceholder', 'Indonesia')}
            />
          </View>
        </Animated.View>

        {/* Church Information */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(250)}
          style={styles.section}
        >
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconWrap}>
              <Heart size={18} color={Colors.gradient.end} />
            </View>
            <Text style={styles.sectionTitle}>
              {t('profile.edit.churchInfo', 'Church Information')}
            </Text>
          </View>
          <View style={styles.card}>
            <InputField
              label={t('profile.edit.occupation', 'Occupation')}
              value={occupation}
              onChangeText={setOccupation}
              placeholder={t('profile.edit.occupationPlaceholder', 'Enter your occupation')}
            />
            <DateField
              label={t('profile.edit.baptismDate', 'Baptism Date')}
              value={baptismDate}
              onPress={() => setShowBaptismPicker(true)}
            />
            <DateField
              label={t('profile.edit.membershipDate', 'Membership Date')}
              value={membershipDate}
              onPress={() => setShowMembershipPicker(true)}
            />
            <InputField
              label={t('profile.edit.notes', 'Notes')}
              value={notes}
              onChangeText={setNotes}
              placeholder={t('profile.edit.notesPlaceholder', 'Additional notes')}
              multiline
            />
          </View>
        </Animated.View>

        {/* Save Button */}
        <Animated.View
          entering={FadeInDown.duration(400).delay(300)}
          style={styles.saveSection}
        >
          <Pressable
            onPress={handleSave}
            disabled={saving}
            style={({ pressed }) => [
              styles.saveButton,
              pressed && styles.saveButtonPressed,
              saving && styles.saveButtonDisabled,
            ]}
          >
            <LinearGradient
              colors={[Colors.gradient.start, Colors.gradient.end]}
              style={styles.saveGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {saving ? (
                <ActivityIndicator color={Colors.white} size="small" />
              ) : (
                <>
                  <Check size={20} color={Colors.white} />
                  <Text style={styles.saveText}>
                    {t('profile.edit.save', 'Save Changes')}
                  </Text>
                </>
              )}
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <View style={{ height: 40 + insets.bottom }} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[100],
  },
  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.white,
  },
  avatarSection: {
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
  },
  avatarHint: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  // Section
  section: {
    marginBottom: spacing.lg,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sectionIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  // Input
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.neutral[600],
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.neutral[900],
  },
  textInputMultiline: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  textInputDisabled: {
    backgroundColor: Colors.neutral[200],
    color: Colors.neutral[500],
  },
  // Field row - for date and select fields
  fieldRow: {
    backgroundColor: Colors.neutral[100],
    borderRadius: 12,
    paddingLeft: 14,
    paddingRight: 10,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
  },
  fieldRowPressed: {
    backgroundColor: Colors.neutral[200],
  },
  fieldText: {
    flex: 1,
    fontSize: 15,
    color: Colors.neutral[900],
    marginRight: 8,
  },
  fieldPlaceholder: {
    color: Colors.neutral[400],
  },
  fieldIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Row layout
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfWidth: {
    flex: 1,
  },
  // Save
  saveSection: {
    marginTop: spacing.sm,
  },
  saveButton: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  saveButtonPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: spacing.sm,
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.white,
  },
  // Modal
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: spacing.lg,
    width: SCREEN_WIDTH - 48,
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[900],
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    marginBottom: spacing.xs,
  },
  modalOptionSelected: {
    backgroundColor: Colors.neutral[100],
  },
  modalOptionText: {
    fontSize: 15,
    color: Colors.neutral[700],
  },
  modalOptionTextSelected: {
    fontWeight: '600',
    color: Colors.gradient.end,
  },
});
