/**
 * Join Group Kiosk Page
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import OTPInput from '../../components/Kiosk/OTPInput';
import NewMemberRegistration from '../../components/Kiosk/NewMemberRegistration';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import MemberAvatar from '../../components/MemberAvatar';
import kioskApi from '../../services/kioskApi';

const JoinGroupKiosk = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');
  
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (step === 'select_group') {
      loadGroups();
    }
  }, [step]);
  
  const loadGroups = async () => {
    try {
      const data = await kioskApi.getPublicGroups();
      setGroups(data);
    } catch (error) {
      console.error('Failed to load groups:', error);
    }
  };
  
  const handleMemberFound = (foundMember, foundPhone) => {
    setMember(foundMember);
    setPhone(foundPhone);
    setStep('otp_existing');
  };
  
  const handleMemberNotFound = (foundPhone) => {
    setPhone(foundPhone);
    setStep('otp_new');
  };
  
  const handleOtpComplete = async (code) => {
    setOtpError('');
    setVerifying(true);
    try {
      const result = await kioskApi.verifyOTP(phone, code);
      if (result.success) {
        setStep('select_group');
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
  
  const handleNewMemberComplete = (newMember) => {
    setMember(newMember);
    setStep('select_group');
  };
  
  const handleJoinGroup = async () => {
    if (!selectedGroup) return;
    setSubmitting(true);
    try {
      await kioskApi.createGroupJoinRequest(selectedGroup.id, member.id, message);
      setStep('success');
    } catch (error) {
      console.error('Join group error:', error);
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
            <h1 className="text-4xl font-bold mb-2">{t('groups.title')}</h1>
            <p className="text-xl text-gray-600">Step 1 of 2: {t('phone.title')}</p>
          </div>
          <PhoneStep onMemberFound={handleMemberFound} onMemberNotFound={handleMemberNotFound} />
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
  
  if (step === 'otp_new') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <NewMemberRegistration phone={phone} onComplete={handleNewMemberComplete} preVisitorStatusId="pre-visitor" />
      </KioskLayout>
    );
  }
  
  if (step === 'select_group') {
    return (
      <KioskLayout showBack showHome onBack={() => navigate('/kiosk')}>
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">{t('groups.step_list')}</h2>
          </div>
          
          {groups.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center">
              <Users className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <p className="text-2xl text-gray-600">{t('groups.no_groups')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {groups.map((group, index) => (
                <motion.button
                  key={group.id}
                  onClick={() => {
                    setSelectedGroup(group);
                    setStep('confirm');
                  }}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <h3 className="text-2xl font-bold mb-2">{group.name}</h3>
                  {group.description && <p className="text-lg text-gray-600 mb-2">{group.description.slice(0, 150)}...</p>}
                  {group.meeting_schedule && <p className="text-lg text-gray-500">📅 {group.meeting_schedule}</p>}
                  {group.leader_name && <p className="text-lg text-gray-500">👤 {group.leader_name}</p>}
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </KioskLayout>
    );
  }
  
  if (step === 'confirm') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('select_group')}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-4">Join {selectedGroup?.name}?</h2>
          </div>
          
          <div className="bg-blue-50 rounded-2xl p-6">
            <h3 className="text-2xl font-bold mb-2">{selectedGroup?.name}</h3>
            <p className="text-lg text-gray-700">{selectedGroup?.description}</p>
          </div>
          
          <div>
            <Label className="text-xl font-medium mb-3 block">{t('groups.message_label')}</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('groups.message_placeholder')} rows={4} className="text-xl p-6 rounded-xl" />
          </div>
          
          <Button onClick={handleJoinGroup} disabled={submitting} className="w-full h-16 text-xl rounded-xl">
            {submitting ? 'Sending...' : t('groups.join_button')}
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
            <h2 className="text-5xl font-bold">{t('groups.success_title')}</h2>
            <p className="text-2xl text-gray-600">{t('groups.success_text')}</p>
          </div>
          <Button onClick={() => navigate('/kiosk')} className="w-full h-16 text-xl rounded-xl">{t('groups.success_back')}</Button>
        </motion.div>
      </KioskLayout>
    );
  }
  
  return null;
};

export default JoinGroupKiosk;
