/**
 * Join Group Kiosk Page
 *
 * Uses TanStack Query for data fetching
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Users, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import ExistingMemberOTP from '../../components/Kiosk/ExistingMemberOTP';
import NewMemberRegistration from '../../components/Kiosk/NewMemberRegistration';
import { Button } from '../../components/ui/button';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import { useKioskGroups, useJoinGroup, useKioskChurch } from '../../hooks/useKiosk';

const JoinGroupKiosk = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');

  // Get church context
  const { churchId: storedChurchId } = useKioskChurch();
  const churchId = location.state?.churchId || storedChurchId;

  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [message, setMessage] = useState('');

  // Fetch groups using TanStack Query
  const {
    data: groups = [],
    isLoading: groupsLoading,
    isError: groupsError
  } = useKioskGroups(churchId, null, {
    enabled: step === 'select_group' && !!churchId,
  });

  // Join group mutation
  const joinGroupMutation = useJoinGroup();
  
  const handleMemberFound = (foundMember, foundPhone) => {
    setMember(foundMember);
    setPhone(foundPhone);
    setStep('otp_existing');
  };
  
  const handleMemberNotFound = (foundPhone) => {
    setPhone(foundPhone);
    setStep('otp_new');
  };

  const handleOtpVerified = (verifiedMember) => {
    setMember(verifiedMember);
    setStep('select_group');
  };

  const handleNewMemberComplete = (newMember) => {
    setMember(newMember);
    setStep('select_group');
  };
  
  const handleJoinGroup = async () => {
    if (!selectedGroup || !member) return;

    try {
      await joinGroupMutation.mutateAsync({
        groupId: selectedGroup.id,
        memberId: member.id,
        message
      });
      setStep('success');
    } catch (error) {
      console.error('Join group error:', error);
      alert(t('errors.generic'));
    }
  };
  
  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{t('groups.title')}</h1>
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
  
  if (step === 'otp_new') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <NewMemberRegistration phone={phone} onComplete={handleNewMemberComplete} />
      </KioskLayout>
    );
  }
  
  if (step === 'select_group') {
    return (
      <KioskLayout showBack showHome onBack={() => navigate('/kiosk/home')}>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{t('groups.step_list')}</h2>
          </div>

          {groupsLoading ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-12 text-center">
              <div className="text-lg sm:text-xl lg:text-2xl text-gray-600">Loading groups...</div>
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-8 lg:p-12 text-center">
              <Users className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto mb-4 text-gray-300" />
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-600">{t('groups.no_groups')}</p>
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
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg hover:shadow-xl transition-all text-left"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">{group.name}</h3>
                  {group.description && <p className="text-sm sm:text-base lg:text-lg text-gray-600 mb-2 line-clamp-2">{group.description}</p>}
                  {group.meeting_schedule && <p className="text-sm sm:text-base lg:text-lg text-gray-500">📅 {group.meeting_schedule}</p>}
                  {group.leader_name && <p className="text-sm sm:text-base lg:text-lg text-gray-500">👤 {group.leader_name}</p>}
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
        <motion.div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto w-full space-y-4 sm:space-y-6 lg:space-y-8 box-border overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center px-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-4">Join {selectedGroup?.name}?</h2>
          </div>

          <div className="bg-blue-50 rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6">
            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">{selectedGroup?.name}</h3>
            <p className="text-sm sm:text-base lg:text-lg text-gray-700">{selectedGroup?.description}</p>
          </div>

          <div>
            <Label className="text-base sm:text-lg lg:text-xl font-medium mb-3 block">{t('groups.message_label')}</Label>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder={t('groups.message_placeholder')} rows={4} className="text-sm sm:text-base lg:text-xl p-3 sm:p-4 lg:p-6 rounded-xl" />
          </div>

          <Button onClick={handleJoinGroup} disabled={joinGroupMutation.isPending} className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl">
            {joinGroupMutation.isPending ? 'Sending...' : t('groups.join_button')}
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
          <div className="space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold">{t('groups.success_title')}</h2>
            <p className="text-lg sm:text-xl lg:text-2xl text-gray-600">{t('groups.success_text')}</p>
          </div>
          <Button onClick={() => navigate('/kiosk/home')} className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl">{t('groups.success_back')}</Button>
        </motion.div>
      </KioskLayout>
    );
  }
  
  return null;
};

export default JoinGroupKiosk;
