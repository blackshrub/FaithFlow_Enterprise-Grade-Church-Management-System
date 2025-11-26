/**
 * Profile Update Kiosk Page
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserCog, Check, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import OTPInput from '../../components/Kiosk/OTPInput';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import MemberAvatar from '../../components/MemberAvatar';
import kioskApi from '../../services/kioskApi';

const ProfileUpdateKiosk = () => {
  const location = useLocation();
  const churchId = location.state?.churchId || localStorage.getItem('kiosk_church_id');
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');
  
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [formData, setFormData] = useState({});
  const [submitting, setSubmitting] = useState(false);
  
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
  
  const handleOtpComplete = async (code) => {
    setOtpError('');
    setVerifying(true);
    try {
      const result = await kioskApi.verifyOTP(phone, code);
      if (result.success) {
        // Check if pre-visitor
        if (member.member_status?.toLowerCase().includes('pre-visitor') || 
            member.member_status?.toLowerCase().includes('previsitor')) {
          setStep('not_allowed');
        } else {
          setFormData({
            full_name: member.full_name || '',
            email: member.email || '',
            address: member.address || '',
            date_of_birth: member.date_of_birth || ''
          });
          setStep('edit_form');
        }
      } else {
        setOtpError(t('existing_profile.otp_error'));
        setOtp('');
      }
    } catch (error) {
      setOtpError(t('otp.error_generic'));
      setOtp('');
    } finally {
      setVerifying(false);
    }
  };
  
  const handleSave = async () => {
    setSubmitting(true);
    try {
      await kioskApi.updateMemberProfile(member.id, formData);
      setStep('success');
    } catch (error) {
      console.error('Update error:', error);
      alert(t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };
  
  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">{t('profile_update.title')}</h1>
            <p className="text-xl text-gray-600">Step 1 of 2: {t('phone.title')}</p>
          </div>
          <PhoneStep churchId={churchId} onMemberFound={handleMemberFound} onMemberNotFound={handleMemberNotFound} />
        </div>
      </KioskLayout>
    );
  }
  
  if (step === 'otp_existing') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold">{t('existing_profile.title')}</h2>
            <div className="flex flex-col items-center gap-4 p-6 bg-blue-50 rounded-2xl">
              <MemberAvatar name={member?.full_name} photo={member?.photo_base64} size="xl" />
              <p className="text-2xl font-bold">{member?.full_name}</p>
            </div>
            <p className="text-xl">{t('existing_profile.otp_info')}</p>
          </div>
          <OTPInput length={4} value={otp} onChange={setOtp} onComplete={handleOtpComplete} disabled={verifying} />
          {otpError && <p className="text-center text-lg text-red-600">{otpError}</p>}
        </motion.div>
      </KioskLayout>
    );
  }
  
  if (step === 'not_found') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
            <UserCog className="w-16 h-16 text-blue-600" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">
              {t('new_profile.title')}
            </h2>
            <p className="text-2xl text-gray-600">
              {t('new_profile.description')}
            </p>
            <p className="text-xl text-gray-500">
              Phone: {phone}
            </p>
          </div>
          <div className="space-y-4">
            <Button
              onClick={() => navigate('/kiosk/events/register', { state: { phone } })}
              className="w-full h-16 text-xl rounded-xl"
            >
              Register as New Member
            </Button>
            <Button
              variant="outline"
              onClick={() => setStep('phone')}
              className="w-full h-16 text-xl rounded-xl"
            >
              Try Another Number
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/kiosk/home')}
              className="w-full h-14 text-lg"
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
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8 text-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="w-32 h-32 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
            <UserCog className="w-16 h-16 text-amber-600" />
          </div>
          <div className="space-y-4">
            <h2 className="text-4xl font-bold">{t('profile_update.not_allowed_title')}</h2>
            <p className="text-2xl text-gray-600">{t('profile_update.not_allowed_text')}</p>
          </div>
          <Button onClick={() => navigate('/kiosk/home')} className="w-full h-16 text-xl rounded-xl">{t('home.back_to_start')}</Button>
        </motion.div>
      </KioskLayout>
    );
  }
  
  if (step === 'edit_form') {
    return (
      <KioskLayout showBack showHome onBack={() => navigate('/kiosk/home')}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-3xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">{t('profile_update.step_edit')}</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <Label className="text-xl font-medium">{t('profile_update.name_label')}</Label>
              <Input value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="h-14 text-xl px-6 rounded-xl" />
            </div>
            <div>
              <Label className="text-xl font-medium">{t('profile_update.email_label')}</Label>
              <Input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="h-14 text-xl px-6 rounded-xl" />
            </div>
            <div>
              <Label className="text-xl font-medium">{t('profile_update.address_label')}</Label>
              <Input value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="h-14 text-xl px-6 rounded-xl" />
            </div>
            <div>
              <Label className="text-xl font-medium">{t('profile_update.birthdate_label')}</Label>
              <Input type="date" value={formData.date_of_birth} onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })} className="h-14 text-xl px-6 rounded-xl" />
            </div>
          </div>
          
          <Button onClick={handleSave} disabled={submitting} className="w-full h-16 text-xl rounded-xl">
            {submitting ? 'Saving...' : t('profile_update.save_button')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }
  
  if (step === 'success') {
    return (
      <KioskLayout showBack={false} showHome={false}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8 text-center" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-16 h-16 text-green-600" />
            </div>
          </motion.div>
          <div className="space-y-4">
            <h2 className="text-5xl font-bold">{t('profile_update.success_title')}</h2>
            <p className="text-2xl text-gray-600">{t('profile_update.success_text')}</p>
          </div>
          <Button onClick={() => navigate('/kiosk/home')} className="w-full h-16 text-xl rounded-xl">{t('profile_update.success_back')}</Button>
        </motion.div>
      </KioskLayout>
    );
  }
  
  return null;
};

export default ProfileUpdateKiosk;
