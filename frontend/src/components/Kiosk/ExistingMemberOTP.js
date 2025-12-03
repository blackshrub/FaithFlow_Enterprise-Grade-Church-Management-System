/**
 * Existing Member OTP Verification Component
 *
 * Shared component for verifying existing members via OTP
 * Used by: EventRegistration, PrayerRequest, JoinGroup, CounselingAppointment, ProfileUpdate
 * Features:
 * - OTP expiration countdown timer
 * - Resend cooldown
 * - Accessible error messages
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import OTPInput from './OTPInput';
import MemberAvatar from '../MemberAvatar';
import { Button } from '../ui/button';
import kioskApi from '../../services/kioskApi';

const ExistingMemberOTP = ({
  member,
  phone,
  onVerified,
  onError,
  // Optional customization
  title,
  subtitle,
  showResend = true,
  initialExpiresIn = 300 // 5 minutes default
}) => {
  const { t } = useTranslation('kiosk');

  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpExpiresIn, setOtpExpiresIn] = useState(initialExpiresIn);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // OTP expiration countdown
  useEffect(() => {
    if (otpExpiresIn <= 0) return;

    const timer = setInterval(() => {
      setOtpExpiresIn(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [otpExpiresIn]);

  const handleOtpComplete = async (code) => {
    setOtpError('');
    setVerifying(true);

    try {
      const result = await kioskApi.verifyOTP(phone, code);

      if (result.success) {
        onVerified(member);
      } else {
        setOtpError(t('existing_profile.otp_error'));
        setOtp('');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setOtpError(t('otp.error_generic'));
      setOtp('');
      if (onError) onError(error);
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOTP = async () => {
    setResending(true);
    setOtpError('');

    try {
      const churchId = localStorage.getItem('kiosk_church_id');
      const result = await kioskApi.sendOTP(phone, churchId);

      // Reset OTP expiration timer
      const newExpiresIn = result?.expires_in_seconds || 300;
      setOtpExpiresIn(newExpiresIn);

      // Start 60-second cooldown
      setResendCooldown(60);
      const cooldownInterval = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(cooldownInterval);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (error) {
      setOtpError(t('otp.resend_error'));
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 w-full box-border mb-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Member Profile */}
      <div className="text-center space-y-3 sm:space-y-4 lg:space-y-6">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
          {title || t('existing_profile.title')}
        </h2>

        {subtitle && (
          <p className="text-base sm:text-lg lg:text-2xl text-gray-600">
            {subtitle}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 lg:p-8 bg-blue-50 rounded-xl sm:rounded-2xl">
          <MemberAvatar member={member} size="xl" />
          <div className="text-center">
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
              {member?.full_name}
            </p>
            <p className="text-sm sm:text-base lg:text-xl text-gray-600">
              {member?.member_status || 'Member'}
            </p>
          </div>
        </div>
      </div>

      {/* OTP Section */}
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        <div className="text-center">
          <p className="text-base sm:text-xl lg:text-2xl text-gray-700 mb-4 sm:mb-6 lg:mb-8">
            {t('existing_profile.otp_info')}
          </p>

          {/* OTP Expiration Countdown */}
          {otpExpiresIn > 0 ? (
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm sm:text-base ${
              otpExpiresIn <= 60 ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
            }`}>
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t('otp.expires_in', { time: formatTime(otpExpiresIn) })}</span>
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-red-100 text-red-700 text-sm sm:text-base">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              <span>{t('otp.expired')}</span>
            </div>
          )}
        </div>

        <OTPInput
          length={4}
          value={otp}
          onChange={setOtp}
          onComplete={handleOtpComplete}
          disabled={verifying || otpExpiresIn === 0}
        />

        {otpError && (
          <motion.p
            role="alert"
            aria-live="assertive"
            className="text-center text-sm sm:text-base lg:text-lg text-red-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {otpError}
          </motion.p>
        )}

        <p className="text-center text-xs sm:text-sm lg:text-base text-gray-500">
          {t('existing_profile.otp_resend_hint')}
        </p>

        {showResend && (
          <Button
            variant="ghost"
            onClick={handleResendOTP}
            disabled={resending || resendCooldown > 0}
            className="w-full h-12 sm:h-14 text-sm sm:text-base lg:text-lg"
          >
            {resending
              ? t('otp.sending')
              : resendCooldown > 0
                ? t('otp.resend_in', { seconds: resendCooldown })
                : t('otp.resend')
            }
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default ExistingMemberOTP;
