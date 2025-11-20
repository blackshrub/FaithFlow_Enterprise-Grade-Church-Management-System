/**
 * Counseling Appointment Kiosk Page
 * 
 * Flow:
 * 1. Phone + OTP
 * 2. Pre-counseling form (type, notes, urgency)
 * 3. Select date (calendar)
 * 4. Select time slot
 * 5. Confirm
 * 6. Success
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageCircleHeart, Check, Calendar as CalendarIcon } from 'lucide-react';
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
import { format, parseISO, addDays, startOfDay } from 'date-fns';

const CounselingKiosk = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');
  
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  
  const [counselingData, setCounselingData] = useState({
    type: 'personal',
    notes: '',
    urgency: 'medium'
  });
  
  const [availableDates, setAvailableDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (step === 'select_date') {
      loadAvailableDates();
    }
  }, [step]);
  
  useEffect(() => {
    if (selectedDate) {
      loadSlotsForDate(selectedDate);
    }
  }, [selectedDate]);
  
  const loadAvailableDates = async () => {
    // Generate next 14 days
    const dates = [];
    for (let i = 1; i <= 14; i++) {
      dates.push(addDays(startOfDay(new Date()), i));
    }
    setAvailableDates(dates);
  };
  
  const loadSlotsForDate = async (date) => {
    try {
      const dateStr = format(date, 'yyyy-MM-dd');
      const slots = await kioskApi.getAvailableSlots(null, dateStr, dateStr);
      
      // Flatten and extract slots
      const allSlots = slots.flatMap(day => 
        day.slots || []
      ).filter(slot => slot);
      
      setAvailableSlots(allSlots);
    } catch (error) {
      console.error('Failed to load slots:', error);
      setAvailableSlots([]);
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
        setStep('counseling_form');
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
    setStep('counseling_form');
  };
  
  const handleSubmitCounseling = async () => {
    if (!selectedSlot) return;
    
    setSubmitting(true);
    
    try {
      await kioskApi.createCounselingRequest({
        slot_id: selectedSlot.slot_id,
        type: 'counseling',
        urgency: counselingData.urgency === 'low' ? 'low' : 
                 counselingData.urgency === 'high' ? 'high' : 'normal',
        topic: counselingData.type === 'family' ? 'Family' : 
               counselingData.type === 'marriage' ? 'Marriage' : 
               counselingData.type === 'personal' ? 'Personal' : 'Other',
        description: counselingData.notes || `Requesting ${counselingData.type} counseling`,
        preferred_channel: 'in_person'
      });
      
      setStep('success');
    } catch (error) {
      console.error('Counseling submission error:', error);
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
            <h1 className="text-4xl font-bold mb-2">{t('counseling.title')}</h1>
            <p className="text-xl text-gray-600">Step 1 of 3: {t('phone.title')}</p>
          </div>
          <PhoneStep onMemberFound={handleMemberFound} onMemberNotFound={handleMemberNotFound} />
        </div>
      </KioskLayout>
    );
  }
  
  // STEP: OTP Existing
  if (step === 'otp_existing') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold">{t('existing_profile.title')}</h2>
            <div className="flex flex-col items-center gap-4 p-6 bg-blue-50 rounded-2xl">
              <MemberAvatar name={member?.full_name} photo={member?.photo_base64} size="xl" />
              <div>
                <p className="text-2xl font-bold">{member?.full_name}</p>
                <p className="text-lg text-gray-600">Status: {member?.member_status || 'Member'}</p>
              </div>
            </div>
            <p className="text-xl">{t('existing_profile.otp_info')}</p>
          </div>
          <OTPInput length={4} value={otp} onChange={setOtp} onComplete={handleOtpComplete} disabled={verifying} />
          {otpError && <p className="text-center text-lg text-red-600">{otpError}</p>}
        </motion.div>
      </KioskLayout>
    );
  }
  
  // STEP: New Member
  if (step === 'otp_new') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <NewMemberRegistration phone={phone} onComplete={handleNewMemberComplete} preVisitorStatusId="pre-visitor" />
      </KioskLayout>
    );
  }
  
  // STEP: Counseling Form
  if (step === 'counseling_form') {
    return (
      <KioskLayout showBack showHome onBack={() => navigate('/kiosk')}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-3xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">{t('counseling.step_details')}</h2>
          </div>
          
          <div className="space-y-6">
            <div>
              <Label className="text-2xl font-medium mb-3 block">{t('counseling.type_label')}</Label>
              <Select value={counselingData.type} onValueChange={(value) => setCounselingData({ ...counselingData, type: value })}>
                <SelectTrigger className="h-14 text-xl rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="family" className="text-xl">{t('counseling.type_family')}</SelectItem>
                  <SelectItem value="personal" className="text-xl">{t('counseling.type_personal')}</SelectItem>
                  <SelectItem value="marriage" className="text-xl">{t('counseling.type_marriage')}</SelectItem>
                  <SelectItem value="other" className="text-xl">{t('counseling.type_other')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label className="text-2xl font-medium mb-3 block">{t('counseling.notes_label')}</Label>
              <Textarea value={counselingData.notes} onChange={(e) => setCounselingData({ ...counselingData, notes: e.target.value })} placeholder={t('counseling.notes_placeholder')} rows={5} className="text-xl p-6 rounded-xl" />
            </div>
            
            <div>
              <Label className="text-2xl font-medium mb-3 block">{t('counseling.urgency_label')}</Label>
              <div className="grid grid-cols-3 gap-4">
                {['low', 'medium', 'high'].map(level => (
                  <Button
                    key={level}
                    type="button"
                    variant={counselingData.urgency === level ? 'default' : 'outline'}
                    onClick={() => setCounselingData({ ...counselingData, urgency: level })}
                    className="h-16 text-xl rounded-xl"
                  >
                    {t(`counseling.urgency_${level}`)}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          <Button onClick={() => setStep('select_date')} className="w-full h-16 text-xl rounded-xl">
            Continue
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }
  
  // STEP: Select Date
  if (step === 'select_date') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('counseling_form')}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-4xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">{t('counseling.step_slot')}</h2>
            <p className="text-xl text-gray-600">{t('counseling.date_label')}</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {availableDates.map((date, index) => (
              <motion.button
                key={date.toISOString()}
                onClick={() => {
                  setSelectedDate(date);
                  setStep('select_time');
                }}
                className="bg-blue-50 hover:bg-blue-100 rounded-2xl p-6 text-center transition-all"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <div className="text-xl font-bold text-gray-900">
                  {format(date, 'EEE')}
                </div>
                <div className="text-3xl font-bold text-blue-600">
                  {format(date, 'dd')}
                </div>
                <div className="text-lg text-gray-600">
                  {format(date, 'MMM')}
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </KioskLayout>
    );
  }
  
  // STEP: Select Time
  if (step === 'select_time') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('select_date')}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-4xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">{t('counseling.time_label')}</h2>
            <p className="text-xl text-gray-600">{selectedDate && format(selectedDate, 'EEEE, MMMM dd, yyyy')}</p>
          </div>
          
          {availableSlots.length === 0 ? (
            <div className="text-center py-12">
              <CalendarIcon className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <p className="text-2xl text-gray-600">{t('counseling.no_slots')}</p>
              <Button onClick={() => setStep('select_date')} className="mt-6 h-14 px-8 text-xl rounded-xl">
                {t('home.back')}
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {availableSlots.slice(0, 12).map((slot, index) => (
                <motion.button
                  key={slot.slot_id}
                  onClick={() => {
                    setSelectedSlot(slot);
                    setStep('confirm');
                  }}
                  className="bg-green-50 hover:bg-green-100 rounded-2xl p-6 text-center transition-all"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <div className="text-2xl font-bold text-green-700">
                    {slot.start_time}
                  </div>
                  <div className="text-lg text-gray-600">
                    {slot.counselor_name || 'Available'}
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </motion.div>
      </KioskLayout>
    );
  }
  
  // STEP: Confirm
  if (step === 'confirm') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('select_time')}>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">{t('counseling.confirm_title')}</h2>
            <p className="text-xl text-gray-600">{t('counseling.confirm_text')}</p>
          </div>
          
          <div className="bg-blue-50 rounded-2xl p-6 space-y-3 text-lg">
            <p><strong>Type:</strong> {t(`counseling.type_${counselingData.type}`)}</p>
            <p><strong>Date:</strong> {selectedDate && format(selectedDate, 'EEEE, MMMM dd, yyyy')}</p>
            <p><strong>Time:</strong> {selectedSlot?.start_time} - {selectedSlot?.end_time}</p>
            <p><strong>Urgency:</strong> {t(`counseling.urgency_${counselingData.urgency}`)}</p>
          </div>
          
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setStep('select_time')} className="flex-1 h-16 text-xl rounded-xl">
              {t('home.back')}
            </Button>
            <Button onClick={handleSubmitCounseling} disabled={submitting} className="flex-1 h-16 text-xl rounded-xl">
              {submitting ? 'Processing...' : t('counseling.confirm_button')}
            </Button>
          </div>
        </motion.div>
      </KioskLayout>
    );
  }
  
  // STEP: Success
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
            <h2 className="text-5xl font-bold">{t('counseling.success_title')}</h2>
            <p className="text-2xl text-gray-600">{t('counseling.success_text')}</p>
          </div>
          
          <Button onClick={() => navigate('/kiosk')} className="w-full h-16 text-xl rounded-xl">
            {t('counseling.success_back')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }
  
  return null;
};

export default CounselingKiosk;
