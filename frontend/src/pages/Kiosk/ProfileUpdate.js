/**
 * Profile Update Kiosk Page
 *
 * Allows members to update their profile via kiosk.
 * Phone number changes require OTP verification of the new number.
 * Fields displayed are configurable per church via kiosk settings.
 *
 * Uses TanStack Query for data fetching
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCog, Check, Phone, AlertCircle, User, MapPin, Briefcase, Heart, Droplets, Mail, Calendar, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import ExistingMemberOTP from '../../components/Kiosk/ExistingMemberOTP';
import OTPInput from '../../components/Kiosk/OTPInput';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useKioskSettings, useUpdateMemberProfile, useSendOTP, useVerifyOTP, useKioskChurch } from '../../hooks/useKiosk';
import kioskApi from '../../services/kioskApi';

const ProfileUpdateKiosk = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');

  // Get church context
  const { churchId: storedChurchId } = useKioskChurch();
  const churchId = location.state?.churchId || storedChurchId;

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState(''); // Original verified phone
  const [member, setMember] = useState(null);
  const [formData, setFormData] = useState({});

  // Phone change verification state
  const [newPhone, setNewPhone] = useState(''); // New phone to verify
  const [newPhoneOtp, setNewPhoneOtp] = useState('');
  const [newPhoneError, setNewPhoneError] = useState('');
  const [newPhoneResendCooldown, setNewPhoneResendCooldown] = useState(0);

  // Fetch kiosk settings using TanStack Query
  const { data: settings } = useKioskSettings(churchId, {
    enabled: !!churchId,
  });

  // Profile fields enabled for this church (derived from settings)
  const enabledFields = settings?.profile_fields?.length > 0
    ? settings.profile_fields
    : ['full_name', 'phone', 'date_of_birth', 'address'];

  // Mutations
  const updateProfileMutation = useUpdateMemberProfile();
  const sendOTPMutation = useSendOTP();
  const verifyOTPMutation = useVerifyOTP();

  // Check if a field is enabled
  const isFieldEnabled = (fieldName) => enabledFields.includes(fieldName);

  const handleMemberFound = (foundMember, foundPhone) => {
    setMember(foundMember);
    setPhone(foundPhone);
    setStep('otp_existing');
  };

  const handleMemberNotFound = (foundPhone) => {
    // Show a helpful message instead of generic error
    setStep('not_found');
    setPhone(foundPhone);
  };

  // Convert DB value to Select value (lowercase)
  const toSelectValue = (val) => (val || '').toLowerCase();

  // Convert Select value to DB value (capitalize)
  const toDbValue = (val) => {
    if (!val) return '';
    return val.charAt(0).toUpperCase() + val.slice(1).toLowerCase();
  };

  const handleOtpVerified = (verifiedMember) => {
    // Check if pre-visitor
    if (verifiedMember.member_status?.toLowerCase().includes('pre-visitor') ||
        verifiedMember.member_status?.toLowerCase().includes('previsitor')) {
      setStep('not_allowed');
    } else {
      // Populate all user-editable fields from member document
      // Note: phone_whatsapp is the actual field name in DB
      setFormData({
        full_name: verifiedMember.full_name || '',
        email: verifiedMember.email || '',
        phone: verifiedMember.phone_whatsapp || phone,
        date_of_birth: verifiedMember.date_of_birth || '',
        gender: toSelectValue(verifiedMember.gender),
        blood_type: verifiedMember.blood_type || '',
        marital_status: toSelectValue(verifiedMember.marital_status),
        occupation: verifiedMember.occupation || '',
        address: verifiedMember.address || '',
        city: verifiedMember.city || '',
        state: verifiedMember.state || '',
        country: verifiedMember.country || '',
      });
      setStep('edit_form');
    }
  };

  // Normalize phone number for comparison (remove spaces, dashes, etc.)
  const normalizePhone = (p) => (p || '').replace(/[\s\-\(\)]/g, '');

  // Check if phone number has been changed
  const hasPhoneChanged = () => {
    return normalizePhone(formData.phone) !== normalizePhone(phone);
  };

  // Send OTP to new phone number
  const handleSendNewPhoneOtp = async () => {
    const phoneToVerify = normalizePhone(formData.phone);
    if (!phoneToVerify || phoneToVerify.length < 10) {
      setNewPhoneError(t('profile_update.phone_invalid') || 'Please enter a valid phone number');
      return;
    }

    setNewPhoneError('');

    try {
      // Check if number already registered to another member
      const existingMember = await kioskApi.lookupMemberByPhone(phoneToVerify, churchId);
      if (existingMember && existingMember.id !== member.id) {
        setNewPhoneError(t('profile_update.phone_already_registered') || 'This phone number is already registered to another member');
        return;
      }

      await sendOTPMutation.mutateAsync({ phone: phoneToVerify, churchId });
      setNewPhone(phoneToVerify);
      setStep('verify_new_phone');

      // Start cooldown timer
      setNewPhoneResendCooldown(60);
      const cooldownInterval = setInterval(() => {
        setNewPhoneResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to send OTP to new phone:', error);
      setNewPhoneError(t('otp.send_error') || 'Failed to send OTP. Please try again.');
    }
  };

  // Verify OTP for new phone number
  const handleVerifyNewPhoneOtp = async (code) => {
    setNewPhoneError('');

    try {
      const result = await verifyOTPMutation.mutateAsync({ phone: newPhone, code });
      if (result.success) {
        // OTP verified, now save the profile with new phone
        await saveProfile({ ...formData, phone: newPhone });
      } else {
        setNewPhoneError(t('existing_profile.otp_error') || 'Invalid OTP. Please try again.');
        setNewPhoneOtp('');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setNewPhoneError(t('otp.error_generic') || 'Verification failed. Please try again.');
      setNewPhoneOtp('');
    }
  };

  // Resend OTP to new phone
  const handleResendNewPhoneOtp = async () => {
    setNewPhoneError('');

    try {
      await sendOTPMutation.mutateAsync({ phone: newPhone, churchId });

      // Reset cooldown
      setNewPhoneResendCooldown(60);
      const cooldownInterval = setInterval(() => {
        setNewPhoneResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      console.error('Failed to resend OTP:', error);
      setNewPhoneError(t('otp.resend_error') || 'Failed to resend OTP');
    }
  };

  // Save profile (called directly or after phone OTP verification)
  const saveProfile = async (dataToSave) => {
    try {
      await updateProfileMutation.mutateAsync({ memberId: member.id, data: dataToSave });
      setStep('success');
    } catch (error) {
      console.error('Update error:', error);
      alert(t('errors.generic') || 'An error occurred. Please try again.');
    }
  };

  const handleSave = async () => {
    // If phone has changed, require OTP verification first
    if (hasPhoneChanged()) {
      handleSendNewPhoneOtp();
    } else {
      // No phone change, save directly (exclude phone from update if unchanged)
      const { phone: _, ...dataWithoutPhone } = formData;
      await saveProfile(dataWithoutPhone);
    }
  };

  // Field configuration for dynamic rendering
  const fieldConfig = {
    full_name: {
      type: 'text',
      label: t('profile_update.name_label'),
      icon: User,
      section: 'basic'
    },
    phone: {
      type: 'tel',
      label: t('profile_update.phone_label') || 'Phone Number',
      icon: Phone,
      section: 'basic',
      showChangeWarning: true
    },
    email: {
      type: 'email',
      label: t('profile_update.email_label'),
      icon: Mail,
      section: 'basic'
    },
    date_of_birth: {
      type: 'date',
      label: t('profile_update.birthdate_label'),
      icon: Calendar,
      section: 'personal'
    },
    gender: {
      type: 'select',
      label: t('profile_update.gender_label') || 'Gender',
      icon: User,
      section: 'personal',
      options: [
        { value: 'male', label: t('profile_update.gender_male') || 'Male' },
        { value: 'female', label: t('profile_update.gender_female') || 'Female' }
      ],
      placeholder: t('profile_update.gender_placeholder') || 'Select gender'
    },
    marital_status: {
      type: 'select',
      label: t('profile_update.marital_status_label') || 'Marital Status',
      icon: Heart,
      section: 'personal',
      options: [
        { value: 'single', label: t('profile_update.marital_single') || 'Single' },
        { value: 'married', label: t('profile_update.marital_married') || 'Married' },
        { value: 'divorced', label: t('profile_update.marital_divorced') || 'Divorced' },
        { value: 'widowed', label: t('profile_update.marital_widowed') || 'Widowed' }
      ],
      placeholder: t('profile_update.marital_status_placeholder') || 'Select marital status'
    },
    blood_type: {
      type: 'select',
      label: t('profile_update.blood_type_label') || 'Blood Type',
      icon: Droplets,
      section: 'personal',
      options: [
        { value: 'A', label: 'A' },
        { value: 'B', label: 'B' },
        { value: 'AB', label: 'AB' },
        { value: 'O', label: 'O' },
        { value: 'A+', label: 'A+' },
        { value: 'A-', label: 'A-' },
        { value: 'B+', label: 'B+' },
        { value: 'B-', label: 'B-' },
        { value: 'AB+', label: 'AB+' },
        { value: 'AB-', label: 'AB-' },
        { value: 'O+', label: 'O+' },
        { value: 'O-', label: 'O-' }
      ],
      placeholder: t('profile_update.blood_type_placeholder') || 'Select blood type'
    },
    occupation: {
      type: 'text',
      label: t('profile_update.occupation_label') || 'Occupation',
      icon: Briefcase,
      section: 'personal',
      placeholder: t('profile_update.occupation_placeholder') || 'Enter your occupation'
    },
    address: {
      type: 'text',
      label: t('profile_update.address_label'),
      icon: MapPin,
      section: 'address',
      placeholder: t('profile_update.address_placeholder') || 'Street address'
    },
    city: {
      type: 'text',
      label: t('profile_update.city_label') || 'City',
      icon: Building,
      section: 'address',
      placeholder: t('profile_update.city_placeholder') || 'City'
    },
    state: {
      type: 'text',
      label: t('profile_update.state_label') || 'State/Province',
      icon: MapPin,
      section: 'address',
      placeholder: t('profile_update.state_placeholder') || 'State/Province'
    },
    country: {
      type: 'text',
      label: t('profile_update.country_label') || 'Country',
      icon: MapPin,
      section: 'address',
      placeholder: t('profile_update.country_placeholder') || 'Country'
    }
  };

  // Render a single field based on config
  const renderField = (fieldName) => {
    if (!isFieldEnabled(fieldName)) return null;

    const config = fieldConfig[fieldName];
    if (!config) return null;

    const Icon = config.icon;
    const phoneChanged = fieldName === 'phone' && hasPhoneChanged();

    if (config.type === 'select') {
      return (
        <div key={fieldName}>
          <Label className="text-base sm:text-lg lg:text-xl font-medium flex items-center gap-2">
            {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
            {config.label}
          </Label>
          <Select
            value={formData[fieldName] || ''}
            onValueChange={(value) => setFormData({ ...formData, [fieldName]: value })}
          >
            <SelectTrigger className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl px-3 sm:px-4 lg:px-6 rounded-xl">
              <SelectValue placeholder={config.placeholder} />
            </SelectTrigger>
            <SelectContent>
              {config.options.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    return (
      <div key={fieldName}>
        <Label className="text-base sm:text-lg lg:text-xl font-medium flex items-center gap-2">
          {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5" />}
          {config.label}
        </Label>
        <Input
          type={config.type}
          value={formData[fieldName] || ''}
          onChange={(e) => {
            setFormData({ ...formData, [fieldName]: e.target.value });
            if (fieldName === 'phone') setNewPhoneError('');
          }}
          placeholder={config.placeholder}
          className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl px-3 sm:px-4 lg:px-6 rounded-xl"
        />
        {config.showChangeWarning && phoneChanged && (
          <p className="mt-2 text-xs sm:text-sm lg:text-base text-amber-600 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
            {t('profile_update.phone_change_notice') || 'Phone change requires OTP verification'}
          </p>
        )}
        {fieldName === 'phone' && newPhoneError && (
          <p className="mt-2 text-xs sm:text-sm lg:text-base text-red-600">
            {newPhoneError}
          </p>
        )}
      </div>
    );
  };

  // Group enabled fields by section
  const getFieldsBySection = (section) => {
    return Object.keys(fieldConfig)
      .filter(fieldName => fieldConfig[fieldName].section === section && isFieldEnabled(fieldName));
  };

  const basicFields = getFieldsBySection('basic');
  const personalFields = getFieldsBySection('personal');
  const addressFields = getFieldsBySection('address');

  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{t('profile_update.title')}</h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">Step 1 of 2: {t('phone.title')}</p>
          </div>
          <PhoneStep churchId={churchId} onMemberFound={handleMemberFound} onMemberNotFound={handleMemberNotFound} />
        </div>
      </KioskLayout>
    );
  }

  if (step === 'otp_existing') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <ExistingMemberOTP
          member={member}
          phone={phone}
          onVerified={handleOtpVerified}
        />
      </KioskLayout>
    );
  }

  if (step === 'not_found') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <motion.div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto w-full space-y-4 sm:space-y-6 lg:space-y-8 text-center box-border overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <UserCog className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-blue-600" />
          </div>
          <div className="space-y-4 px-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">
              {t('new_profile.title')}
            </h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600">
              {t('new_profile.description')}
            </p>
            <p className="text-base sm:text-lg lg:text-xl text-gray-500">
              Phone: {phone}
            </p>
          </div>
          <div className="space-y-4">
            <Button
              onClick={() => navigate('/kiosk/events/register', { state: { phone } })}
              className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
            >
              Register as New Member
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep('phone')}
              className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
            >
              Try Another Number
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/kiosk/home')}
              className="w-full h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-lg"
            >
              {t('home.back_to_start')}
            </Button>
          </div>
        </motion.div>
      </KioskLayout>
    );
  }

  if (step === 'not_allowed') {
    return (
      <KioskLayout showBack={false} showHome={false}>
        <motion.div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto w-full space-y-4 sm:space-y-6 lg:space-y-8 text-center box-border overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <UserCog className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-amber-600" />
          </div>
          <div className="space-y-4 px-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{t('profile_update.not_allowed_title')}</h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600">{t('profile_update.not_allowed_text')}</p>
          </div>
          <Button onClick={() => navigate('/kiosk/home')} className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl">{t('home.back_to_start')}</Button>
        </motion.div>
      </KioskLayout>
    );
  }

  if (step === 'edit_form') {
    const phoneChanged = hasPhoneChanged();

    return (
      <KioskLayout showBack showHome onBack={() => navigate('/kiosk/home')}>
        <motion.div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-3xl mx-auto w-full space-y-4 sm:space-y-6 lg:space-y-8 box-border overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center px-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{t('profile_update.step_edit')}</h2>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* === BASIC INFO SECTION === */}
            {basicFields.length > 0 && (
              <>
                <div className="pb-2 border-b border-gray-200">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <User className="w-4 h-4" />
                    {t('profile_update.section_basic') || 'Basic Information'}
                  </h3>
                </div>
                {basicFields.map(renderField)}
              </>
            )}

            {/* === PERSONAL DETAILS SECTION === */}
            {personalFields.length > 0 && (
              <>
                <div className="pt-4 pb-2 border-b border-gray-200">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <Heart className="w-4 h-4" />
                    {t('profile_update.section_personal') || 'Personal Details'}
                  </h3>
                </div>
                {personalFields.map(renderField)}
              </>
            )}

            {/* === ADDRESS SECTION === */}
            {addressFields.length > 0 && (
              <>
                <div className="pt-4 pb-2 border-b border-gray-200">
                  <h3 className="text-sm sm:text-base font-semibold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    {t('profile_update.section_address') || 'Address'}
                  </h3>
                </div>
                {addressFields.map(renderField)}
              </>
            )}
          </div>

          <Button
            onClick={handleSave}
            disabled={updateProfileMutation.isPending || sendOTPMutation.isPending}
            className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
          >
            {updateProfileMutation.isPending || sendOTPMutation.isPending
              ? (phoneChanged ? (t('profile_update.sending_otp') || 'Sending OTP...') : (t('profile_update.saving') || 'Saving...'))
              : (phoneChanged ? (t('profile_update.verify_and_save') || 'Verify & Save') : t('profile_update.save_button'))
            }
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }

  // Step: Verify new phone number via OTP
  if (step === 'verify_new_phone') {
    return (
      <KioskLayout showBack showHome onBack={() => {
        setStep('edit_form');
        setNewPhoneOtp('');
        setNewPhoneError('');
      }}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 w-full box-border overflow-hidden"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Header */}
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <Phone className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-600" />
            </div>
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {t('profile_update.verify_new_phone_title') || 'Verify New Phone Number'}
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('profile_update.verify_new_phone_subtitle') || 'Enter the OTP sent to your new number'}
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-lg">
              <Phone className="w-4 h-4 text-blue-600" />
              <span className="text-base sm:text-lg font-medium text-blue-700">{newPhone}</span>
            </div>
          </div>

          {/* OTP Input */}
          <div className="space-y-4 sm:space-y-6">
            <OTPInput
              length={4}
              value={newPhoneOtp}
              onChange={setNewPhoneOtp}
              onComplete={handleVerifyNewPhoneOtp}
              disabled={verifyOTPMutation.isPending || updateProfileMutation.isPending}
            />

            {newPhoneError && (
              <motion.p
                className="text-center text-sm sm:text-base lg:text-lg text-red-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {newPhoneError}
              </motion.p>
            )}

            {(verifyOTPMutation.isPending || updateProfileMutation.isPending) && (
              <p className="text-center text-sm sm:text-base text-gray-500">
                {verifyOTPMutation.isPending
                  ? (t('profile_update.verifying') || 'Verifying...')
                  : (t('profile_update.saving') || 'Saving...')
                }
              </p>
            )}

            <p className="text-center text-xs sm:text-sm lg:text-base text-gray-500">
              {t('existing_profile.otp_resend_hint') || "Didn't receive the code?"}
            </p>

            <Button
              variant="ghost"
              onClick={handleResendNewPhoneOtp}
              disabled={sendOTPMutation.isPending || newPhoneResendCooldown > 0}
              className="w-full text-sm sm:text-base lg:text-lg"
            >
              {sendOTPMutation.isPending
                ? (t('otp.sending') || 'Sending...')
                : newPhoneResendCooldown > 0
                  ? `${t('otp.resend') || 'Resend OTP'} (${newPhoneResendCooldown}s)`
                  : (t('otp.resend') || 'Resend OTP')
              }
            </Button>
          </div>

          {/* Change number link */}
          <Button
            variant="outline"
            onClick={() => {
              setStep('edit_form');
              setNewPhoneOtp('');
              setNewPhoneError('');
            }}
            className="w-full text-sm sm:text-base"
          >
            {t('profile_update.change_number') || 'Use Different Number'}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }

  if (step === 'success') {
    return (
      <KioskLayout showBack={false} showHome={false}>
        <motion.div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto w-full space-y-4 sm:space-y-6 lg:space-y-8 text-center box-border overflow-hidden" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-green-600" />
            </div>
          </motion.div>
          <div className="space-y-4 px-2">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold">{t('profile_update.success_title')}</h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600">{t('profile_update.success_text')}</p>
          </div>
          <Button onClick={() => navigate('/kiosk/home')} className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl">{t('profile_update.success_back')}</Button>
        </motion.div>
      </KioskLayout>
    );
  }

  return null;
};

export default ProfileUpdateKiosk;
