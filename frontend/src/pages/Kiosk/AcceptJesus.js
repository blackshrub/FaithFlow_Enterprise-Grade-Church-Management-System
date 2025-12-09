/**
 * Accept Jesus / Recommitment Kiosk Page
 *
 * Flow:
 * 1. Phone + OTP verification
 * 2. Guided prayer display with commitment type selection
 * 3. Confirmation checkbox
 * 4. Success celebration
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Cross, Check, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import ExistingMemberOTP from '../../components/Kiosk/ExistingMemberOTP';
import NewMemberRegistration from '../../components/Kiosk/NewMemberRegistration';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { Checkbox } from '../../components/ui/checkbox';
import { useSubmitAcceptJesus, useGuidedPrayer, useKioskChurch } from '../../hooks/useKiosk';

const AcceptJesusKiosk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('kiosk');
  const isIndonesian = i18n.language === 'id';

  // Get church context
  const { churchId: storedChurchId } = useKioskChurch();
  const churchId = location.state?.churchId || storedChurchId;

  // Fetch guided prayer
  const { data: prayerData } = useGuidedPrayer(churchId);
  const guidedPrayer = isIndonesian ? prayerData?.prayer_id : prayerData?.prayer_en;

  // Submission mutation
  const submitMutation = useSubmitAcceptJesus();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);

  const [formData, setFormData] = useState({
    commitment_type: 'first_time',
    prayer_read: false,
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
    setStep('prayer_form');
  };

  const handleNewMemberComplete = (newMember) => {
    setMember(newMember);
    setStep('prayer_form');
  };

  const handleSubmit = async () => {
    if (!formData.prayer_read || !member) return;

    const payload = {
      church_id: churchId,
      member_id: member.id,
      full_name: member.full_name,
      phone: phone,
      email: member.email,
      commitment_type: formData.commitment_type,
      prayer_read: formData.prayer_read,
      guided_prayer_text: guidedPrayer,
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
            <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cross className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('acceptJesus.title', 'Accept Jesus')}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('acceptJesus.subtitle', 'Make a commitment to follow Christ')}
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

  // STEP: Prayer Form
  if (step === 'prayer_form') {
    return (
      <KioskLayout showBack showHome onBack={() => navigate('/kiosk/home')}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-4xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 w-full box-border mb-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Header */}
          <div className="text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Cross className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('acceptJesus.prayerTitle', 'Guided Prayer')}
            </h2>
            <p className="text-gray-600">
              {t('acceptJesus.prayerSubtitle', 'Read this prayer aloud or in your heart')}
            </p>
          </div>

          {/* Commitment Type Selection */}
          <div className="flex justify-center gap-4">
            <Button
              variant={formData.commitment_type === 'first_time' ? 'default' : 'outline'}
              onClick={() => setFormData({ ...formData, commitment_type: 'first_time' })}
              className="h-12 px-6 text-base sm:text-lg rounded-xl"
            >
              {t('acceptJesus.firstTime', 'First Time Decision')}
            </Button>
            <Button
              variant={formData.commitment_type === 'recommitment' ? 'default' : 'outline'}
              onClick={() => setFormData({ ...formData, commitment_type: 'recommitment' })}
              className="h-12 px-6 text-base sm:text-lg rounded-xl"
            >
              {t('acceptJesus.recommitment', 'Recommitment')}
            </Button>
          </div>

          {/* Guided Prayer Display */}
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-6 sm:p-8">
            <div className="prose prose-lg max-w-none">
              <p className="text-lg sm:text-xl lg:text-2xl leading-relaxed text-amber-900 whitespace-pre-wrap">
                {guidedPrayer || t('acceptJesus.defaultPrayer', 'Lord Jesus, I believe You are the Son of God who died for my sins. I confess that I am a sinner and I need Your forgiveness. I repent of my sins and turn away from them. I invite You into my heart as my Lord and Savior. Thank You for Your gift of eternal life. Help me to live for You all the days of my life. In Jesus name, Amen.')}
              </p>
            </div>
          </div>

          {/* Confirmation Checkbox */}
          <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
            <Checkbox
              id="prayer_read"
              checked={formData.prayer_read}
              onCheckedChange={(checked) => setFormData({ ...formData, prayer_read: checked })}
              className="w-6 h-6"
            />
            <Label htmlFor="prayer_read" className="text-base sm:text-lg lg:text-xl text-gray-700 cursor-pointer">
              {t('acceptJesus.confirmPrayer', 'I have read and prayed this prayer from my heart')}
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={submitMutation.isPending || !formData.prayer_read}
            className="w-full h-14 sm:h-16 text-lg sm:text-xl rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
          >
            {submitMutation.isPending
              ? t('common.submitting', 'Submitting...')
              : t('acceptJesus.submit', 'Confirm My Decision')}
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
          {/* Celebration Icon */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto">
              <Heart className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
            </div>
          </motion.div>

          {/* Success Message */}
          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">
              {t('acceptJesus.successTitle', 'Welcome to the Family!')}
            </h2>
            <p className="text-base sm:text-lg lg:text-2xl text-gray-600">
              {t('acceptJesus.successText', 'Heaven is rejoicing! Our pastoral team will contact you soon to help you grow in your faith.')}
            </p>
          </div>

          {/* Next Steps Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 sm:p-6 text-left">
            <h3 className="font-bold text-amber-900 mb-2">
              {t('acceptJesus.nextSteps', 'Next Steps')}
            </h3>
            <ul className="text-amber-800 space-y-1 text-sm sm:text-base">
              <li>• {t('acceptJesus.nextStep1', 'Our team will contact you within 24-48 hours')}</li>
              <li>• {t('acceptJesus.nextStep2', 'Join our new believers class')}</li>
              <li>• {t('acceptJesus.nextStep3', 'Consider water baptism')}</li>
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

export default AcceptJesusKiosk;
