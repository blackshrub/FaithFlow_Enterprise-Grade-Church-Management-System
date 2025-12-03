/**
 * Prayer Request Kiosk Page
 *
 * Flow:
 * 1. Phone + OTP
 * 2. Prayer request form
 * 3. Success
 *
 * Uses TanStack Query for mutations
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import ExistingMemberOTP from '../../components/Kiosk/ExistingMemberOTP';
import NewMemberRegistration from '../../components/Kiosk/NewMemberRegistration';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useSubmitPrayerRequest, useKioskChurch } from '../../hooks/useKiosk';

const PrayerRequestKiosk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('kiosk');

  // Get church context
  const { churchId: storedChurchId } = useKioskChurch();
  const churchId = location.state?.churchId || storedChurchId;

  // Prayer request mutation
  const prayerMutation = useSubmitPrayerRequest();

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);

  const [prayerData, setPrayerData] = useState({
    request: '',
    category: 'other',
    needs_followup: true
  });
  
  const handleMemberFound = (foundMember, foundPhone) => {
    console.log('✅ PrayerRequest - Member found:', foundMember?.full_name);
    setMember(foundMember);
    setPhone(foundPhone);
    setStep('otp_existing');
  };
  
  const handleMemberNotFound = (foundPhone) => {
    console.log('⚠️ PrayerRequest - Member not found:', foundPhone);
    setPhone(foundPhone);
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
  
  const handleSubmitPrayer = async () => {
    if (!prayerData.request.trim() || !member) return;

    const payload = {
      member_id: member.id,
      requester_name: member.full_name,
      requester_contact: phone,
      title: prayerData.request.slice(0, 100),
      description: prayerData.request,
      category: prayerData.category,
      status: 'new',
      needs_follow_up: prayerData.needs_followup
    };

    console.log('🙏 Prayer request payload:', payload);

    try {
      const result = await prayerMutation.mutateAsync(payload);
      console.log('🙏 Prayer request result:', result);
      setStep('success');
    } catch (error) {
      console.error('❌ Prayer submission error:', error);
      console.error('❌ Error response:', error.response?.data);
      alert(t('errors.generic'));
    }
  };
  
  // STEP: Phone
  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('prayer.title')}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">Step 1 of 2: {t('phone.title')}</p>
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
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-3xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 w-full box-border overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('prayer.step_request')}
            </h2>
          </div>

          <div className="space-y-4 sm:space-y-6">
            {/* Prayer Request */}
            <div>
              <Label className="text-base sm:text-lg lg:text-2xl font-medium text-gray-700 mb-2 sm:mb-3 block">
                {t('prayer.request_label')}
              </Label>
              <Textarea
                value={prayerData.request}
                onChange={(e) => setPrayerData({ ...prayerData, request: e.target.value })}
                placeholder={t('prayer.request_placeholder')}
                rows={4}
                className="text-sm sm:text-base lg:text-xl p-3 sm:p-4 lg:p-6 rounded-xl resize-none"
              />
            </div>

            {/* Category */}
            <div>
              <Label className="text-sm sm:text-base lg:text-xl font-medium text-gray-700">
                {t('prayer.category_label')}
              </Label>
              <Select
                value={prayerData.category}
                onValueChange={(value) => setPrayerData({ ...prayerData, category: value })}
              >
                <SelectTrigger className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="healing" className="text-sm sm:text-base lg:text-xl">{t('prayer.category_health') || 'Healing'}</SelectItem>
                  <SelectItem value="family" className="text-sm sm:text-base lg:text-xl">{t('prayer.category_family') || 'Family'}</SelectItem>
                  <SelectItem value="work" className="text-sm sm:text-base lg:text-xl">{t('prayer.category_work') || 'Work'}</SelectItem>
                  <SelectItem value="financial" className="text-sm sm:text-base lg:text-xl">{t('prayer.category_financial') || 'Financial'}</SelectItem>
                  <SelectItem value="spiritual" className="text-sm sm:text-base lg:text-xl">{t('prayer.category_spiritual') || 'Spiritual'}</SelectItem>
                  <SelectItem value="guidance" className="text-sm sm:text-base lg:text-xl">{t('prayer.category_guidance') || 'Guidance'}</SelectItem>
                  <SelectItem value="thanksgiving" className="text-sm sm:text-base lg:text-xl">{t('prayer.category_thanksgiving') || 'Thanksgiving'}</SelectItem>
                  <SelectItem value="other" className="text-sm sm:text-base lg:text-xl">{t('prayer.category_other') || 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Follow-up */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-3 sm:p-4 bg-gray-50 rounded-xl">
              <Label className="text-sm sm:text-base lg:text-xl font-medium text-gray-700 flex-1">
                {t('prayer.followup_label')}
              </Label>
              <div className="flex gap-2 sm:gap-3">
                <Button
                  type="button"
                  variant={prayerData.needs_followup ? 'default' : 'outline'}
                  onClick={() => setPrayerData({ ...prayerData, needs_followup: true })}
                  className="h-10 sm:h-12 px-4 sm:px-6 lg:px-8 text-sm sm:text-base lg:text-lg rounded-xl"
                >
                  {t('prayer.followup_yes')}
                </Button>
                <Button
                  type="button"
                  variant={!prayerData.needs_followup ? 'default' : 'outline'}
                  onClick={() => setPrayerData({ ...prayerData, needs_followup: false })}
                  className="h-10 sm:h-12 px-4 sm:px-6 lg:px-8 text-sm sm:text-base lg:text-lg rounded-xl"
                >
                  {t('prayer.followup_no')}
                </Button>
              </div>
            </div>
          </div>

          <Button
            onClick={handleSubmitPrayer}
            disabled={prayerMutation.isPending || !prayerData.request.trim()}
            className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
          >
            {prayerMutation.isPending ? 'Sending...' : t('prayer.submit')}
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
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 text-center w-full box-border overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-green-600" />
            </div>
          </motion.div>

          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">
              {t('prayer.success_title')}
            </h2>
            <p className="text-base sm:text-lg lg:text-2xl text-gray-600">
              {t('prayer.success_text')}
            </p>
          </div>

          <Button
            onClick={() => navigate('/kiosk/home')}
            className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
          >
            {t('prayer.success_back')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }
  
  return null;
};

export default PrayerRequestKiosk;
