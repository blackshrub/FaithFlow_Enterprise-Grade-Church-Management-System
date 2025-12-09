/**
 * Child Dedication Request Kiosk Page
 *
 * Flow:
 * 1. Phone + OTP verification
 * 2. Father info (self or search or manual)
 * 3. Mother info (self or search or manual)
 * 4. Child info + required photo
 * 5. Success
 */

import React, { useState, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Baby, Camera, X } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import ExistingMemberOTP from '../../components/Kiosk/ExistingMemberOTP';
import NewMemberRegistration from '../../components/Kiosk/NewMemberRegistration';
import MemberSearchSelect from '../../components/Kiosk/MemberSearchSelect';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useSubmitChildDedication, useUploadChildPhoto, useKioskChurch } from '../../hooks/useKiosk';

const ChildDedicationKiosk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('kiosk');
  const fileInputRef = useRef(null);

  // Get church context
  const { churchId: storedChurchId } = useKioskChurch();
  const churchId = location.state?.churchId || storedChurchId;

  // Mutations
  const submitMutation = useSubmitChildDedication();
  const uploadPhotoMutation = useUploadChildPhoto();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);

  const [formData, setFormData] = useState({
    // Father
    father: {
      name: '',
      phone: '',
      member_id: null,
      is_baptized: false,
      mode: null, // 'self', 'search', or 'manual'
    },
    // Mother
    mother: {
      name: '',
      phone: '',
      member_id: null,
      is_baptized: false,
      mode: null,
    },
    // Child
    child: {
      name: '',
      birth_date: '',
      gender: '',
      photo_url: '',
      photo_preview: null,
    },
  });

  const handleMemberFound = (foundMember, foundPhone, expiresIn) => {
    setMember(foundMember);
    setPhone(foundPhone);
    setOtpExpiresIn(expiresIn || 300);
    setStep('otp_existing');
  };

  const handleMemberNotFound = (foundPhone, expiresIn) => {
    setPhone(foundPhone);
    setOtpExpiresIn(expiresIn || 300);
    setStep('otp_new');
  };

  const handleOtpVerified = (verifiedMember) => {
    setMember(verifiedMember);

    // Gender-based auto-assignment
    if (verifiedMember.gender === 'male') {
      // Auto-assign as father
      setFormData(prev => ({
        ...prev,
        father: {
          name: verifiedMember.full_name,
          phone: verifiedMember.phone_whatsapp || verifiedMember.phone || phone,
          member_id: verifiedMember.id,
          is_baptized: false,
          mode: 'self',
          photo_url: verifiedMember.photo_url || '',
        }
      }));
      setStep('mother_info'); // Skip father step, go directly to mother
    } else if (verifiedMember.gender === 'female') {
      // Auto-assign as mother
      setFormData(prev => ({
        ...prev,
        mother: {
          name: verifiedMember.full_name,
          phone: verifiedMember.phone_whatsapp || verifiedMember.phone || phone,
          member_id: verifiedMember.id,
          is_baptized: false,
          mode: 'self',
          photo_url: verifiedMember.photo_url || '',
        }
      }));
      setStep('father_info'); // Go to father step (no "This is me" option)
    } else {
      // Gender unknown - show normal flow starting with father
      setStep('father_info');
    }
  };

  const handleNewMemberComplete = (newMember) => {
    setMember(newMember);

    // Gender-based auto-assignment for new members too
    if (newMember.gender === 'male') {
      setFormData(prev => ({
        ...prev,
        father: {
          name: newMember.full_name,
          phone: newMember.phone_whatsapp || newMember.phone || phone,
          member_id: newMember.id,
          is_baptized: false,
          mode: 'self',
          photo_url: newMember.photo_url || '',
        }
      }));
      setStep('mother_info');
    } else if (newMember.gender === 'female') {
      setFormData(prev => ({
        ...prev,
        mother: {
          name: newMember.full_name,
          phone: newMember.phone_whatsapp || newMember.phone || phone,
          member_id: newMember.id,
          is_baptized: false,
          mode: 'self',
          photo_url: newMember.photo_url || '',
        }
      }));
      setStep('father_info');
    } else {
      setStep('father_info');
    }
  };

  const handleFatherChange = (value) => {
    setFormData({
      ...formData,
      father: value,
    });
  };

  const handleMotherChange = (value) => {
    setFormData({
      ...formData,
      mother: value,
    });
  };

  const handlePhotoCapture = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create preview
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target.result;
      setFormData({
        ...formData,
        child: {
          ...formData.child,
          photo_preview: base64,
        },
      });

      // Upload to server
      try {
        const result = await uploadPhotoMutation.mutateAsync({
          photoBase64: base64.split(',')[1],
          churchId,
        });
        setFormData((prev) => ({
          ...prev,
          child: {
            ...prev.child,
            photo_url: result.photo_url,
          },
        }));
      } catch (error) {
        console.error('Photo upload error:', error);
        alert(t('errors.photoUpload', 'Failed to upload photo. Please try again.'));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!member || !formData.child.photo_url) return;

    const payload = {
      church_id: churchId,
      member_id: member.id,
      full_name: member.full_name,
      phone: phone,
      email: member.email,
      father: {
        name: formData.father.name,
        phone: formData.father.phone,
        is_baptized: formData.father.is_baptized,
        member_id: formData.father.member_id,
      },
      mother: {
        name: formData.mother.name,
        phone: formData.mother.phone,
        is_baptized: formData.mother.is_baptized,
        member_id: formData.mother.member_id,
      },
      child: {
        name: formData.child.name,
        birth_date: formData.child.birth_date,
        gender: formData.child.gender,
        photo_url: formData.child.photo_url,
      },
    };

    try {
      await submitMutation.mutateAsync(payload);
      setStep('success');
    } catch (error) {
      console.error('Submission error:', error);
      alert(t('errors.generic', 'Something went wrong. Please try again.'));
    }
  };

  const canProceedFromFather = formData.father.name && formData.father.phone;
  const canProceedFromMother = formData.mother.name && formData.mother.phone;
  const canSubmitChild = formData.child.name && formData.child.birth_date && formData.child.gender && formData.child.photo_url;

  // Get IDs to exclude from search (don't show already selected member)
  const excludeFromMotherSearch = formData.father.member_id
    ? [formData.father.member_id]
    : [];

  // STEP: Phone
  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Baby className="w-8 h-8 sm:w-10 sm:h-10 text-pink-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('childDedication.title', 'Child Dedication')}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('childDedication.subtitle', 'Dedicate your child to God')}
            </p>
          </div>

          <PhoneStep
            churchId={churchId}
            onMemberFound={handleMemberFound}
            onMemberNotFound={handleMemberNotFound}
          />
        </div>
      </KioskLayout>
    );
  }

  // STEP: OTP Existing
  if (step === 'otp_existing') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <ExistingMemberOTP
          member={member}
          phone={phone}
          initialExpiresIn={otpExpiresIn}
          onVerified={handleOtpVerified}
        />
      </KioskLayout>
    );
  }

  // STEP: New Member Registration
  if (step === 'otp_new') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <NewMemberRegistration
          phone={phone}
          initialExpiresIn={otpExpiresIn}
          onComplete={handleNewMemberComplete}
        />
      </KioskLayout>
    );
  }

  // STEP: Father Info
  if (step === 'father_info') {
    // If mother is already assigned (registrant is female), hide "This is me" for father
    const motherIsSelf = formData.mother.mode === 'self';

    // Get IDs to exclude (if mother is already selected)
    const excludeFromFatherSearch = formData.mother.member_id
      ? [formData.mother.member_id]
      : [];

    return (
      <KioskLayout showBack showHome onBack={() => navigate('/kiosk/home')}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 w-full box-border mb-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('childDedication.fatherTitle', "Father's Information")}
            </h2>
            <p className="text-gray-600">
              {t('childDedication.fatherSubtitle', "Please provide father's details")}
            </p>
          </div>

          {/* Show summary if father is auto-assigned */}
          {formData.father.mode === 'self' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                {formData.father.photo_url ? (
                  <img src={formData.father.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">{formData.father.name?.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg text-gray-900">{formData.father.name}</p>
                  <p className="text-gray-600">{formData.father.phone}</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {t('common.thisIsMe', 'This is me')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Show MemberSearchSelect if father is not auto-assigned */}
          {formData.father.mode !== 'self' && (
            <MemberSearchSelect
              churchId={churchId}
              currentMember={motherIsSelf ? null : member}
              value={formData.father}
              onChange={handleFatherChange}
              showThisIsMe={!motherIsSelf}
              showBaptized={true}
              showGender={true}
              showBirthDate={true}
              showPhotoUpload={true}
              label={t('childDedication.selectFather', 'Select father')}
              excludeMemberIds={excludeFromFatherSearch}
            />
          )}

          <Button
            onClick={() => setStep('mother_info')}
            disabled={!canProceedFromFather}
            className="w-full h-14 text-lg rounded-xl"
          >
            {t('common.continue', 'Continue')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }

  // STEP: Mother Info
  if (step === 'mother_info') {
    // Check if father selected "This is me" - if so, mother can't also be "This is me"
    const fatherIsSelf = formData.father.mode === 'self';

    // Get IDs to exclude from search (don't show the father again)
    const excludeFromMotherSearchIds = formData.father.member_id
      ? [formData.father.member_id]
      : [];

    return (
      <KioskLayout showBack showHome onBack={() => formData.mother.mode === 'self' ? navigate('/kiosk/home') : setStep('father_info')}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 w-full box-border mb-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('childDedication.motherTitle', "Mother's Information")}
            </h2>
            <p className="text-gray-600">
              {t('childDedication.motherSubtitle', "Please provide mother's details")}
            </p>
          </div>

          {/* Show summary if mother is auto-assigned */}
          {formData.mother.mode === 'self' && (
            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
              <div className="flex items-center gap-3">
                {formData.mother.photo_url ? (
                  <img src={formData.mother.photo_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 font-semibold">{formData.mother.name?.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg text-gray-900">{formData.mother.name}</p>
                  <p className="text-gray-600">{formData.mother.phone}</p>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                    {t('common.thisIsMe', 'This is me')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Show MemberSearchSelect if mother is not auto-assigned */}
          {formData.mother.mode !== 'self' && (
            <MemberSearchSelect
              churchId={churchId}
              currentMember={fatherIsSelf ? null : member}
              value={formData.mother}
              onChange={handleMotherChange}
              showThisIsMe={!fatherIsSelf}
              showBaptized={true}
              showGender={true}
              showBirthDate={true}
              showPhotoUpload={true}
              label={t('childDedication.selectMother', 'Select mother')}
              excludeMemberIds={excludeFromMotherSearchIds}
            />
          )}

          <Button
            onClick={() => setStep('child_info')}
            disabled={!canProceedFromMother}
            className="w-full h-14 text-lg rounded-xl"
          >
            {t('common.continue', 'Continue')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }

  // STEP: Child Info
  if (step === 'child_info') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('mother_info')}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 w-full box-border mb-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <div className="w-3 h-3 rounded-full bg-pink-500" />
              <div className="w-3 h-3 rounded-full bg-pink-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('childDedication.childTitle', "Child's Information")}
            </h2>
          </div>

          {/* Parents Summary */}
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
            <div className="flex items-center justify-between text-sm">
              <div>
                <span className="text-gray-500">{t('childDedication.father', 'Father')}:</span>
                <span className="ml-2 font-medium">{formData.father.name}</span>
              </div>
              <div>
                <span className="text-gray-500">{t('childDedication.mother', 'Mother')}:</span>
                <span className="ml-2 font-medium">{formData.mother.name}</span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {/* Child Photo - Required */}
            <div>
              <Label className="text-base font-medium mb-2 block">
                {t('childDedication.childPhoto', "Child's Photo")} * ({t('childDedication.required', 'Required')})
              </Label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCapture}
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition-colors ${
                  formData.child.photo_preview
                    ? 'border-pink-300 bg-pink-50'
                    : 'border-gray-300 hover:border-pink-400 hover:bg-pink-50'
                }`}
              >
                {formData.child.photo_preview ? (
                  <div className="relative">
                    <img
                      src={formData.child.photo_preview}
                      alt="Child"
                      className="w-32 h-32 object-cover rounded-xl"
                    />
                    {uploadPhotoMutation.isPending && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                        <span className="text-white text-sm">Uploading...</span>
                      </div>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setFormData({
                          ...formData,
                          child: { ...formData.child, photo_preview: null, photo_url: '' },
                        });
                      }}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-gray-400 mb-2" />
                    <span className="text-gray-500">
                      {t('childDedication.tapToCapture', 'Tap to take photo')}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium mb-2 block">
                {t('childDedication.childName', "Child's Full Name")} *
              </Label>
              <Input
                value={formData.child.name}
                onChange={(e) => setFormData({
                  ...formData,
                  child: { ...formData.child, name: e.target.value },
                })}
                className="h-12 text-base rounded-xl"
              />
            </div>

            <div>
              <Label className="text-base font-medium mb-2 block">
                {t('childDedication.birthDate', 'Date of Birth')} *
              </Label>
              <Input
                type="date"
                value={formData.child.birth_date}
                onChange={(e) => setFormData({
                  ...formData,
                  child: { ...formData.child, birth_date: e.target.value },
                })}
                max={new Date().toISOString().split('T')[0]}
                className="h-12 text-base rounded-xl"
              />
            </div>

            <div>
              <Label className="text-base font-medium mb-2 block">
                {t('childDedication.gender', 'Gender')} *
              </Label>
              <Select
                value={formData.child.gender}
                onValueChange={(value) => setFormData({
                  ...formData,
                  child: { ...formData.child, gender: value },
                })}
              >
                <SelectTrigger className="h-12 text-base rounded-xl">
                  <SelectValue placeholder={t('childDedication.selectGender', 'Select gender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">{t('common.male', 'Male')}</SelectItem>
                  <SelectItem value="female">{t('common.female', 'Female')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!canSubmitChild || submitMutation.isPending}
            className="w-full h-14 text-lg rounded-xl"
          >
            {submitMutation.isPending
              ? t('common.submitting', 'Submitting...')
              : t('childDedication.submit', 'Submit Request')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }

  // STEP: Success
  if (step === 'success') {
    return (
      <KioskLayout showBack={false} showHome={false}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 text-center w-full box-border mb-6"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-pink-100 rounded-full flex items-center justify-center mx-auto">
              <Baby className="w-12 h-12 sm:w-16 sm:h-16 text-pink-600" />
            </div>
          </motion.div>

          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">
              {t('childDedication.successTitle', 'Request Submitted!')}
            </h2>
            <p className="text-base sm:text-lg lg:text-2xl text-gray-600">
              {t('childDedication.successText', 'Our team will contact you to schedule the dedication.')}
            </p>
          </div>

          <div className="bg-pink-50 border border-pink-200 rounded-xl p-4 sm:p-6 text-left">
            <h3 className="font-bold text-pink-900 mb-2">
              {t('childDedication.whatNext', 'What happens next?')}
            </h3>
            <ul className="text-pink-800 space-y-1 text-sm sm:text-base">
              <li>• {t('childDedication.next1', 'We will contact you within 3-5 days')}</li>
              <li>• {t('childDedication.next2', 'Dedication dates are scheduled monthly')}</li>
              <li>• {t('childDedication.next3', 'You may be invited to a preparation session')}</li>
            </ul>
          </div>

          <Button
            onClick={() => navigate('/kiosk/home')}
            className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
          >
            {t('common.backToHome', 'Back to Home')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }

  return null;
};

export default ChildDedicationKiosk;
