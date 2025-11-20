/**
 * Event Registration Kiosk Page
 * 
 * Flow:
 * 1. Phone + OTP
 * 2. Select event
 * 3. Confirm
 * 4. Success
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import OTPInput from '../../components/Kiosk/OTPInput';
import { Button } from '../../components/ui/button';
import { Card } from '../../components/ui/card';
import MemberAvatar from '../../components/MemberAvatar';
import kioskApi from '../../services/kioskApi';
import { format, parseISO } from 'date-fns';

const EventRegistrationKiosk = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');
  
  const [step, setStep] = useState('phone'); // phone, otp_existing, otp_new, select_event, confirm, success
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    if (step === 'select_event') {
      loadEvents();
    }
  }, [step]);
  
  const loadEvents = async () => {
    try {
      const data = await kioskApi.getUpcomingEvents();
      console.log('📅 Events API response:', data);
      
      // Handle both array and object response
      const eventList = Array.isArray(data) ? data : (data?.data || []);
      console.log('📅 Events to display:', eventList.length);
      
      setEvents(eventList);
    } catch (error) {
      console.error('Failed to load events:', error);
      setEvents([]);
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
        // If new member and no member object, we need to create one
        // For now, assume backend created or we have member_id
        setStep('select_event');
      } else {
        setOtpError(t('existing_profile.otp_error'));
        setOtp('');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setOtpError(t('otp.error_generic'));
      setOtp('');
    } finally {
      setVerifying(false);
    }
  };
  
  const handleConfirmRegistration = async () => {
    if (!selectedEvent || !member) return;
    
    setSubmitting(true);
    
    try {
      await kioskApi.registerForEvent(selectedEvent.id, member.id);
      setStep('success');
    } catch (error) {
      console.error('Registration error:', error);
      alert(t('errors.generic'));
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleBackToStart = () => {
    navigate('/kiosk');
  };
  
  // STEP: Phone Number
  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-8">
          <motion.div
            className="text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              {t('event_registration.title')}
            </h1>
            <p className="text-xl text-gray-600">Step 1 of 2: {t('phone.title')}</p>
          </motion.div>
          
          <PhoneStep
            onMemberFound={handleMemberFound}
            onMemberNotFound={handleMemberNotFound}
          />
        </div>
      </KioskLayout>
    );
  }
  
  // STEP: OTP for Existing Member
  if (step === 'otp_existing') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <motion.div
          className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Member Profile */}
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-bold text-gray-900">
              {t('existing_profile.title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('existing_profile.description')}
            </p>
            
            <div className="flex flex-col items-center gap-4 p-6 bg-blue-50 rounded-2xl">
              <MemberAvatar
                name={member?.full_name}
                photo={member?.photo_base64}
                size="xl"
              />
              <div>
                <p className="text-2xl font-bold text-gray-900">{member?.full_name}</p>
                <p className="text-lg text-gray-600">Status: {member?.member_status || 'Member'}</p>
              </div>
            </div>
          </div>
          
          {/* OTP Input */}
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-xl text-gray-700 mb-6">
                {t('existing_profile.otp_info')}
              </p>
            </div>
            
            <OTPInput
              length={4}
              value={otp}
              onChange={setOtp}
              onComplete={handleOtpComplete}
              disabled={verifying}
            />
            
            {otpError && (
              <motion.p
                className="text-center text-lg text-red-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {otpError}
              </motion.p>
            )}
            
            <p className="text-center text-gray-500">
              {t('existing_profile.otp_resend_hint')}
            </p>
          </div>
        </motion.div>
      </KioskLayout>
    );
  }
  
  // STEP: Select Event
  if (step === 'select_event') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-gray-900 mb-2">
              {t('event_registration.step_select_event')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('event_registration.select_event')}
            </p>
          </div>
          
          {events.length === 0 ? (
            <div className="bg-white rounded-3xl shadow-lg p-12 text-center">
              <Calendar className="w-20 h-20 mx-auto mb-4 text-gray-300" />
              <p className="text-2xl text-gray-600">
                {t('event_registration.no_events')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events.map((event, index) => (
                <motion.button
                  key={event.id}
                  onClick={() => {
                    setSelectedEvent(event);
                    setStep('confirm');
                  }}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {event.name}
                  </h3>
                  <div className="text-lg text-gray-600 space-y-1">
                    <p>📅 {event.event_date ? format(parseISO(event.event_date), 'EEEE, MMMM dd, yyyy') : 'TBA'}</p>
                    <p>🕒 {event.start_time || 'TBA'}</p>
                    <p>📍 {event.location || 'TBA'}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </KioskLayout>
    );
  }
  
  // STEP: Confirm
  if (step === 'confirm') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('select_event')}>
        <motion.div
          className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-bold text-gray-900">
              {t('event_registration.confirm_title')}
            </h2>
            <p className="text-xl text-gray-600">
              {t('event_registration.confirm_text')}
            </p>
          </div>
          
          <div className="bg-blue-50 rounded-2xl p-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-2">
              {selectedEvent?.name}
            </h3>
            <div className="text-lg text-gray-700 space-y-1">
              <p>📅 {selectedEvent?.event_date ? format(parseISO(selectedEvent.event_date), 'EEEE, MMMM dd, yyyy') : 'TBA'}</p>
              <p>🕒 {selectedEvent?.start_time || 'TBA'}</p>
              <p>📍 {selectedEvent?.location || 'TBA'}</p>
            </div>
          </div>
          
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setStep('select_event')}
              className="flex-1 h-16 text-xl rounded-xl"
            >
              {t('home.back')}
            </Button>
            <Button
              onClick={handleConfirmRegistration}
              disabled={submitting}
              className="flex-1 h-16 text-xl rounded-xl"
            >
              {submitting ? 'Processing...' : t('event_registration.confirm_button')}
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
        <motion.div
          className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8 text-center"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
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
              {t('event_registration.success_title')}
            </h2>
            <p className="text-2xl text-gray-600">
              {t('event_registration.success_text')}
            </p>
            <p className="text-3xl font-bold text-blue-600">
              {selectedEvent?.name}
            </p>
          </div>
          
          <Button
            onClick={handleBackToStart}
            className="w-full h-16 text-xl rounded-xl"
            size="lg"
          >
            {t('event_registration.success_back')}
          </Button>
        </motion.div>
      </KioskLayout>
    );
  }
  
  return null;
};

export default EventRegistrationKiosk;
