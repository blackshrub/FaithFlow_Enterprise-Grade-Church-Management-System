/**
 * Holy Matrimony Request Kiosk Page
 *
 * Flow:
 * 1. Phone + OTP verification
 * 2. Person A info (self or search or manual)
 * 3. Person B info (search or manual)
 * 4. Wedding details
 * 5. Success
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Gem, Heart, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import ExistingMemberOTP from '../../components/Kiosk/ExistingMemberOTP';
import NewMemberRegistration from '../../components/Kiosk/NewMemberRegistration';
import MemberSearchSelect from '../../components/Kiosk/MemberSearchSelect';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useSubmitHolyMatrimony, useKioskChurch } from '../../hooks/useKiosk';

const HolyMatrimonyKiosk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('kiosk');

  // Get church context
  const { churchId: storedChurchId } = useKioskChurch();
  const churchId = location.state?.churchId || storedChurchId;

  // Submission mutation
  const submitMutation = useSubmitHolyMatrimony();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);

  const [formData, setFormData] = useState({
    // Person A (usually the one filling the form)
    person_a: {
      name: '',
      phone: '',
      member_id: null,
      is_baptized: false,
      mode: null, // 'self', 'search', or 'manual'
    },
    // Person B (partner)
    person_b: {
      name: '',
      phone: '',
      member_id: null,
      is_baptized: false,
      mode: null,
    },
    // Wedding details
    planned_wedding_date: '',
    notes: '',
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
    setStep('person_a_info');
  };

  const handleNewMemberComplete = (newMember) => {
    setMember(newMember);
    setStep('person_a_info');
  };

  const handlePersonAChange = (value) => {
    setFormData({
      ...formData,
      person_a: value,
    });
  };

  const handlePersonBChange = (value) => {
    setFormData({
      ...formData,
      person_b: value,
    });
  };

  const handleSubmit = async () => {
    if (!member) return;

    const payload = {
      church_id: churchId,
      member_id: member.id,
      full_name: member.full_name,
      phone: phone,
      email: member.email,
      person_a: {
        name: formData.person_a.name,
        phone: formData.person_a.phone,
        is_baptized: formData.person_a.is_baptized,
        member_id: formData.person_a.member_id,
      },
      person_b: {
        name: formData.person_b.name,
        phone: formData.person_b.phone,
        is_baptized: formData.person_b.is_baptized,
        member_id: formData.person_b.member_id,
      },
      planned_wedding_date: formData.planned_wedding_date || null,
      notes: formData.notes || null,
    };

    try {
      await submitMutation.mutateAsync(payload);
      setStep('success');
    } catch (error) {
      console.error('Submission error:', error);
      alert(t('errors.generic', 'Something went wrong. Please try again.'));
    }
  };

  const canProceedFromPersonA = formData.person_a.name && formData.person_a.phone;
  const canProceedFromPersonB = formData.person_b.name && formData.person_b.phone;
  const bothBaptized = formData.person_a.is_baptized && formData.person_b.is_baptized;

  // Get IDs to exclude from search (don't show the same person twice)
  const excludeFromPersonBSearch = formData.person_a.member_id
    ? [formData.person_a.member_id]
    : [];

  // STEP: Phone
  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gem className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('holyMatrimony.title', 'Holy Matrimony')}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('holyMatrimony.subtitle', 'Request a church wedding ceremony')}
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

  // STEP: Person A Info (Groom or Bride - whoever is filling)
  if (step === 'person_a_info') {
    return (
      <KioskLayout showBack showHome onBack={() => navigate('/kiosk/home')}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 w-full box-border mb-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('holyMatrimony.yourInfo', 'Your Information')}
            </h2>
            <p className="text-gray-600">
              {t('holyMatrimony.personASubtitle', 'Please provide your details')}
            </p>
          </div>

          <MemberSearchSelect
            churchId={churchId}
            currentMember={member}
            value={formData.person_a}
            onChange={handlePersonAChange}
            showThisIsMe={true}
            showBaptized={true}
            showGender={true}
            showBirthDate={true}
            showPhotoUpload={true}
            label={t('holyMatrimony.selectYourself', 'Select yourself')}
          />

          <Button
            onClick={() => setStep('person_b_info')}
            disabled={!canProceedFromPersonA}
            className="w-full h-14 text-lg rounded-xl"
          >
            {t('common.continue', 'Continue')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }

  // STEP: Person B Info (Partner)
  if (step === 'person_b_info') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('person_a_info')}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 w-full box-border mb-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-gray-300" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('holyMatrimony.partnerInfo', "Partner's Information")}
            </h2>
            <p className="text-gray-600">
              {t('holyMatrimony.personBSubtitle', "Please provide your partner's details")}
            </p>
          </div>

          <MemberSearchSelect
            churchId={churchId}
            value={formData.person_b}
            onChange={handlePersonBChange}
            showThisIsMe={false}
            showBaptized={true}
            showGender={true}
            showBirthDate={true}
            showPhotoUpload={true}
            label={t('holyMatrimony.selectPartner', 'Select your partner')}
            excludeMemberIds={excludeFromPersonBSearch}
          />

          {/* Baptism warning */}
          {formData.person_a.name && formData.person_b.name && !bothBaptized && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-amber-800 text-sm">
                <strong>{t('holyMatrimony.baptismNote', 'Note:')}</strong>{' '}
                {t('holyMatrimony.baptismRequirement', 'Both partners should be baptized for a church wedding. Our team will discuss this with you.')}
              </p>
            </div>
          )}

          <Button
            onClick={() => setStep('wedding_details')}
            disabled={!canProceedFromPersonB}
            className="w-full h-14 text-lg rounded-xl"
          >
            {t('common.continue', 'Continue')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }

  // STEP: Wedding Details
  if (step === 'wedding_details') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('person_b_info')}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 w-full box-border mb-6"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
              <div className="w-3 h-3 rounded-full bg-amber-500" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              {t('holyMatrimony.weddingDetails', 'Wedding Details')}
            </h2>
          </div>

          {/* Couple Summary */}
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-center justify-center gap-4">
              <div className="text-center">
                <p className="font-semibold">{formData.person_a.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${formData.person_a.is_baptized ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {formData.person_a.is_baptized ? t('holyMatrimony.baptized', 'Baptized') : t('holyMatrimony.notBaptized', 'Not Baptized')}
                </span>
              </div>
              <Heart className="w-6 h-6 text-rose-500" />
              <div className="text-center">
                <p className="font-semibold">{formData.person_b.name}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${formData.person_b.is_baptized ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {formData.person_b.is_baptized ? t('holyMatrimony.baptized', 'Baptized') : t('holyMatrimony.notBaptized', 'Not Baptized')}
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-base font-medium mb-2 block">
                <Calendar className="inline w-4 h-4 mr-2" />
                {t('holyMatrimony.plannedDate', 'Planned Wedding Date (Optional)')}
              </Label>
              <Input
                type="date"
                value={formData.planned_wedding_date}
                onChange={(e) => setFormData({ ...formData, planned_wedding_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="h-12 text-base rounded-xl"
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('holyMatrimony.dateNote', 'We will confirm availability with you')}
              </p>
            </div>

            <div>
              <Label className="text-base font-medium mb-2 block">
                {t('holyMatrimony.notes', 'Additional Notes (Optional)')}
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('holyMatrimony.notesPlaceholder', 'Any questions or special requests...')}
                rows={3}
                className="text-base rounded-xl resize-none"
              />
            </div>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full h-14 text-lg rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {submitMutation.isPending
              ? t('common.submitting', 'Submitting...')
              : t('holyMatrimony.submit', 'Submit Request')}
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
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto">
              <Gem className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
            </div>
          </motion.div>

          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">
              {t('holyMatrimony.successTitle', 'Request Submitted!')}
            </h2>
            <p className="text-base sm:text-lg lg:text-2xl text-gray-600">
              {t('holyMatrimony.successText', 'Congratulations on your upcoming wedding! Our team will contact you soon.')}
            </p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 text-left">
            <h3 className="font-bold text-amber-900 mb-2">
              {t('holyMatrimony.whatNext', 'What happens next?')}
            </h3>
            <ul className="text-amber-800 space-y-1 text-sm sm:text-base">
              <li>• {t('holyMatrimony.next1', 'Our pastoral team will contact you within 3-5 days')}</li>
              <li>• {t('holyMatrimony.next2', 'You will be invited to a pre-marital counseling session')}</li>
              <li>• {t('holyMatrimony.next3', 'We will discuss wedding dates and requirements')}</li>
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

export default HolyMatrimonyKiosk;
