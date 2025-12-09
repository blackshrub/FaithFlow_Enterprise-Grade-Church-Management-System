/**
 * Baptism Request Kiosk Page
 *
 * Flow:
 * 1. Phone + OTP verification
 * 2. Baptism request form with optional preferred date
 * 3. Success
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Droplets, Check, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import ExistingMemberOTP from '../../components/Kiosk/ExistingMemberOTP';
import NewMemberRegistration from '../../components/Kiosk/NewMemberRegistration';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { useSubmitBaptism, useKioskChurch } from '../../hooks/useKiosk';

const BaptismKiosk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('kiosk');

  // Get church context
  const { churchId: storedChurchId } = useKioskChurch();
  const churchId = location.state?.churchId || storedChurchId;

  // Submission mutation
  const submitMutation = useSubmitBaptism();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);

  const [formData, setFormData] = useState({
    preferred_date: '',
    testimony: '',
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
    setStep('baptism_form');
  };

  const handleNewMemberComplete = (newMember) => {
    setMember(newMember);
    setStep('baptism_form');
  };

  const handleSubmit = async () => {
    if (!member) return;

    const payload = {
      church_id: churchId,
      member_id: member.id,
      full_name: member.full_name,
      phone: phone,
      email: member.email,
      preferred_date: formData.preferred_date || null,
      testimony: formData.testimony || null,
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

  // STEP: Phone
  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Droplets className="w-8 h-8 sm:w-10 sm:h-10 text-blue-600" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('baptism.title', 'Baptism Request')}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('baptism.subtitle', 'Public declaration of your faith in Christ')}
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

  // STEP: Baptism Form
  if (step === 'baptism_form') {
    return (
      <KioskLayout showBack showHome onBack={() => navigate('/kiosk/home')}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-3xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 w-full box-border mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Droplets className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('baptism.formTitle', 'Request Baptism')}
            </h2>
            <p className="text-gray-600">
              {t('baptism.formSubtitle', 'Our team will contact you to schedule your baptism')}
            </p>
          </div>

          {/* Verified Member Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">
                  {member?.full_name?.charAt(0) || 'M'}
                </span>
              </div>
              <div>
                <p className="font-semibold text-gray-900">{member?.full_name}</p>
                <p className="text-sm text-gray-600">{phone}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Preferred Date */}
            <div>
              <Label className="text-base sm:text-lg font-medium text-gray-700 mb-2 block">
                <Calendar className="inline w-4 h-4 mr-2" />
                {t('baptism.preferredDate', 'Preferred Date (Optional)')}
              </Label>
              <Input
                type="date"
                value={formData.preferred_date}
                onChange={(e) => setFormData({ ...formData, preferred_date: e.target.value })}
                min={new Date().toISOString().split('T')[0]}
                className="h-12 text-base sm:text-lg rounded-xl"
              />
              <p className="text-sm text-gray-500 mt-1">
                {t('baptism.dateNote', 'We will confirm the actual date based on availability')}
              </p>
            </div>

            {/* Testimony */}
            <div>
              <Label className="text-base sm:text-lg font-medium text-gray-700 mb-2 block">
                {t('baptism.testimony', 'Your Testimony (Optional)')}
              </Label>
              <Textarea
                value={formData.testimony}
                onChange={(e) => setFormData({ ...formData, testimony: e.target.value })}
                placeholder={t('baptism.testimonyPlaceholder', 'Share briefly how you came to faith...')}
                rows={4}
                className="text-base sm:text-lg rounded-xl resize-none"
              />
            </div>

            {/* Additional Notes */}
            <div>
              <Label className="text-base sm:text-lg font-medium text-gray-700 mb-2 block">
                {t('baptism.notes', 'Additional Notes (Optional)')}
              </Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder={t('baptism.notesPlaceholder', 'Any questions or special requests...')}
                rows={2}
                className="text-base sm:text-lg rounded-xl resize-none"
              />
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending}
            className="w-full h-14 sm:h-16 text-lg sm:text-xl rounded-xl"
          >
            {submitMutation.isPending
              ? t('common.submitting', 'Submitting...')
              : t('baptism.submit', 'Submit Request')}
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
          {/* Success Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-12 h-12 sm:w-16 sm:h-16 text-green-600" />
            </div>
          </motion.div>

          {/* Success Message */}
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">
              {t('baptism.successTitle', 'Request Submitted!')}
            </h2>
            <p className="text-base sm:text-lg lg:text-2xl text-gray-600">
              {t('baptism.successText', 'Our pastoral team will contact you to schedule your baptism.')}
            </p>
          </div>

          {/* Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 sm:p-6 text-left">
            <h3 className="font-bold text-blue-900 mb-2">
              {t('baptism.whatNext', 'What happens next?')}
            </h3>
            <ul className="text-blue-800 space-y-1 text-sm sm:text-base">
              <li>• {t('baptism.next1', 'We will contact you within 3-5 days')}</li>
              <li>• {t('baptism.next2', 'You may be invited to a baptism preparation class')}</li>
              <li>• {t('baptism.next3', 'Baptism dates are usually announced monthly')}</li>
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

export default BaptismKiosk;
