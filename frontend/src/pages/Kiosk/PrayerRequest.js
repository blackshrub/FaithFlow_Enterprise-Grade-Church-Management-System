/**
 * Prayer Request Kiosk Page
 * 
 * Flow:
 * 1. Phone + OTP
 * 2. Prayer request form
 * 3. Success
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import OTPInput from '../../components/Kiosk/OTPInput';
import NewMemberRegistration from '../../components/Kiosk/NewMemberRegistration';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import MemberAvatar from '../../components/MemberAvatar';
import kioskApi from '../../services/kioskApi';

const PrayerRequestKiosk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('kiosk');
  
  const churchId = location.state?.churchId || localStorage.getItem('kiosk_church_id');
  
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  
  const [prayerData, setPrayerData] = useState({
    request: '',
    category: 'other',
    needs_followup: true
  });
  const [submitting, setSubmitting] = useState(false);
  
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
  
  const handleOtpComplete = async (code) => {
    setOtpError('');
    setVerifying(true);
    
    try {
      const result = await kioskApi.verifyOTP(phone, code);
      
      if (result.success) {
        setStep('prayer_form');
      } else {
        setOtpError(t('existing_profile.otp_error'));
        setOtp('');
      }
    } catch (error) {
      console.error('OTP error:', error);
      setOtpError(t('otp.error_generic'));
      setOtp('');
    } finally {
      setVerifying(false);
    }
  };
  
  const handleNewMemberComplete = (newMember) => {
    setMember(newMember);
    setStep('prayer_form');
  };
  
  const handleSubmitPrayer = async () => {
    if (!prayerData.request.trim()) return;
    
    setSubmitting(true);
    
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
      const result = await kioskApi.submitPrayerRequest(payload);
      console.log('🙏 Prayer request result:', result);
      
      setStep('success');
    } catch (error) {
      console.error('❌ Prayer submission error:', error);
      console.error('❌ Error response:', error.response?.data);
      alert(t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };
  
  // STEP: Phone
  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {t('prayer.title')}
            </h1>
            <p className="text-xl text-gray-600">Step 1 of 2: {t('phone.title')}</p>
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
        <motion.div
          className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold">{t('existing_profile.title')}</h2>
            
            <div className="flex flex-col items-center gap-4 p-6 bg-blue-50 rounded-2xl">
              <MemberAvatar
                member={member}
                size="xl"
              />
              <div>
                <p className="text-2xl font-bold">{member?.full_name}</p>
                <p className="text-lg text-gray-600">Status: {member?.member_status || 'Member'}</p>
              </div>
            </div>
            
            <p className="text-xl text-gray-700">{t('existing_profile.otp_info')}</p>
          </div>
          
          <OTPInput
            length={4}
            value={otp}
            onChange={setOtp}
            onComplete={handleOtpComplete}
            disabled={verifying}
          />
          
          {otpError && (
            <motion.p className="text-center text-lg text-red-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {otpError}
            </motion.p>
          )}
          
          <p className="text-center text-gray-500">{t('existing_profile.otp_resend_hint')}</p>
        </motion.div>
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
          className="bg-white rounded-3xl shadow-2xl p-12 max-w-3xl mx-auto space-y-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              {t('prayer.step_request')}
            </h2>
          </div>
          
          <div className="space-y-6">
            {/* Prayer Request */}
            <div>
              <Label className="text-2xl font-medium text-gray-700 mb-3 block">
                {t('prayer.request_label')}
              </Label>
              <Textarea
                value={prayerData.request}
                onChange={(e) => setPrayerData({ ...prayerData, request: e.target.value })}
                placeholder={t('prayer.request_placeholder')}
                rows={6}
                className="text-xl p-6 rounded-xl resize-none"
              />
            </div>
            
            {/* Category */}
            <div>
              <Label className="text-xl font-medium text-gray-700">
                {t('prayer.category_label')}
              </Label>
              <Select
                value={prayerData.category}
                onValueChange={(value) => setPrayerData({ ...prayerData, category: value })}
              >
                <SelectTrigger className="h-14 text-xl rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="health" className="text-xl">{t('prayer.category_health') || 'Health'}</SelectItem>
                  <SelectItem value="family" className="text-xl">{t('prayer.category_family') || 'Family'}</SelectItem>
                  <SelectItem value="work" className="text-xl">{t('prayer.category_work') || 'Work'}</SelectItem>
                  <SelectItem value="financial" className="text-xl">{t('prayer.category_financial') || 'Financial'}</SelectItem>
                  <SelectItem value="guidance" className="text-xl">{t('prayer.category_guidance') || 'Guidance'}</SelectItem>
                  <SelectItem value="other" className="text-xl">{t('prayer.category_other') || 'Other'}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Follow-up */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
              <Label className="text-xl font-medium text-gray-700 flex-1">
                {t('prayer.followup_label')}
              </Label>
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={prayerData.needs_followup ? 'default' : 'outline'}
                  onClick={() => setPrayerData({ ...prayerData, needs_followup: true })}
                  className="h-12 px-8 text-lg rounded-xl"
                >
                  {t('prayer.followup_yes')}
                </Button>
                <Button
                  type="button"
                  variant={!prayerData.needs_followup ? 'default' : 'outline'}
                  onClick={() => setPrayerData({ ...prayerData, needs_followup: false })}
                  className="h-12 px-8 text-lg rounded-xl"
                >
                  {t('prayer.followup_no')}
                </Button>
              </div>
            </div>
          </div>
          
          <Button
            onClick={handleSubmitPrayer}
            disabled={submitting || !prayerData.request.trim()}
            className="w-full h-16 text-xl rounded-xl"
          >
            {submitting ? 'Sending...' : t('prayer.submit')}
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
          className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-16 h-16 text-green-600" />
            </div>
          </motion.div>
          
          <div className="space-y-4">
            <h2 className="text-5xl font-bold text-gray-900">
              {t('prayer.success_title')}
            </h2>
            <p className="text-2xl text-gray-600">
              {t('prayer.success_text')}
            </p>
          </div>
          
          <Button
            onClick={() => navigate('/kiosk/home')}
            className="w-full h-16 text-xl rounded-xl"
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
