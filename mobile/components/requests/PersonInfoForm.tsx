/**
 * PersonInfoForm - Reusable form for person info (name, phone, gender)
 *
 * Used in:
 * - Child Dedication (father, mother info)
 * - Holy Matrimony (person A, person B info)
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { User, Phone, Check } from 'lucide-react-native';
import { Input, InputField, InputIcon, InputSlot } from '@/components/ui/input';

interface PersonInfo {
  name: string;
  phone: string;
  gender?: 'male' | 'female';
  member_id?: string;
  is_baptized?: boolean;
  photo_url?: string;
}

interface PersonInfoFormProps {
  label: string;
  value: PersonInfo;
  onChange: (value: PersonInfo) => void;
  showGender?: boolean;
  showBaptized?: boolean;
  showIsMe?: boolean;
  currentMember?: {
    id: string;
    full_name: string;
    phone: string;
    photo_url?: string;
  };
  onSearchPress?: () => void;
  accentColor?: string;
}

export function PersonInfoForm({
  label,
  value,
  onChange,
  showGender = false,
  showBaptized = false,
  showIsMe = false,
  currentMember,
  onSearchPress,
  accentColor = '#3B82F6',
}: PersonInfoFormProps) {
  const { t } = useTranslation();
  const [isMe, setIsMe] = useState(false);

  const handleUseCurrentMember = () => {
    if (currentMember) {
      setIsMe(true);
      onChange({
        ...value,
        name: currentMember.full_name,
        phone: currentMember.phone,
        member_id: currentMember.id,
      });
    }
  };

  const handleManualEntry = () => {
    setIsMe(false);
    onChange({
      name: '',
      phone: '',
      gender: value.gender,
      is_baptized: value.is_baptized,
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>

      {/* Quick selection buttons */}
      {(showIsMe || onSearchPress) && (
        <View style={styles.quickActions}>
          {showIsMe && currentMember && (
            <Pressable
              style={[
                styles.quickButton,
                isMe && { backgroundColor: accentColor, borderColor: accentColor },
              ]}
              onPress={handleUseCurrentMember}
            >
              {currentMember.photo_url ? (
                <Image
                  source={{ uri: currentMember.photo_url }}
                  style={styles.buttonPhoto}
                />
              ) : (
                isMe && <Check size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.quickButtonText, isMe && { color: '#FFFFFF' }]}>
                {t('requests.form.thisIsMe', 'This is me')}
              </Text>
            </Pressable>
          )}

          {onSearchPress && (
            <Pressable
              style={styles.quickButton}
              onPress={onSearchPress}
            >
              <Text style={styles.quickButtonText}>
                {t('requests.form.searchMember', 'Search member')}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={[styles.quickButton, !isMe && !value.member_id && { borderColor: accentColor }]}
            onPress={handleManualEntry}
          >
            <Text
              style={[
                styles.quickButtonText,
                !isMe && !value.member_id && { color: accentColor },
              ]}
            >
              {t('requests.form.enterManually', 'Enter manually')}
            </Text>
          </Pressable>
        </View>
      )}

      {/* Name input */}
      <View style={styles.inputContainer}>
        <Input variant="outline" size="lg" className="mb-3">
          <InputSlot className="pl-3">
            <InputIcon as={User} className="text-typography-400" />
          </InputSlot>
          <InputField
            placeholder={t('requests.form.fullName', 'Full Name')}
            value={value.name}
            onChangeText={(text) => onChange({ ...value, name: text })}
            editable={!isMe}
          />
        </Input>
      </View>

      {/* Phone input */}
      <View style={styles.inputContainer}>
        <Input variant="outline" size="lg" className="mb-3">
          <InputSlot className="pl-3">
            <InputIcon as={Phone} className="text-typography-400" />
          </InputSlot>
          <InputField
            placeholder={t('requests.form.phoneNumber', 'Phone Number')}
            value={value.phone}
            onChangeText={(text) => onChange({ ...value, phone: text })}
            keyboardType="phone-pad"
            editable={!isMe}
          />
        </Input>
      </View>

      {/* Gender selection */}
      {showGender && (
        <View style={styles.genderContainer}>
          <Text style={styles.genderLabel}>{t('requests.form.gender', 'Gender')}</Text>
          <View style={styles.genderButtons}>
            <Pressable
              style={[
                styles.genderButton,
                value.gender === 'male' && { backgroundColor: '#DBEAFE', borderColor: '#3B82F6' },
              ]}
              onPress={() => onChange({ ...value, gender: 'male' })}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  value.gender === 'male' && { color: '#3B82F6' },
                ]}
              >
                {t('requests.form.male', 'Male')}
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.genderButton,
                value.gender === 'female' && { backgroundColor: '#FCE7F3', borderColor: '#EC4899' },
              ]}
              onPress={() => onChange({ ...value, gender: 'female' })}
            >
              <Text
                style={[
                  styles.genderButtonText,
                  value.gender === 'female' && { color: '#EC4899' },
                ]}
              >
                {t('requests.form.female', 'Female')}
              </Text>
            </Pressable>
          </View>
        </View>
      )}

      {/* Baptized checkbox */}
      {showBaptized && (
        <Pressable
          style={styles.checkboxContainer}
          onPress={() => onChange({ ...value, is_baptized: !value.is_baptized })}
        >
          <View
            style={[
              styles.checkbox,
              value.is_baptized && { backgroundColor: accentColor, borderColor: accentColor },
            ]}
          >
            {value.is_baptized && <Check size={14} color="#FFFFFF" />}
          </View>
          <Text style={styles.checkboxLabel}>
            {t('requests.form.isBaptized', 'Has been baptized')}
          </Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 16,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  quickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  quickButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  buttonPhoto: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 6,
  },
  inputContainer: {
    marginBottom: 4,
  },
  genderContainer: {
    marginTop: 8,
  },
  genderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  genderButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  genderButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  genderButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 15,
    color: '#374151',
  },
});

export default PersonInfoForm;
