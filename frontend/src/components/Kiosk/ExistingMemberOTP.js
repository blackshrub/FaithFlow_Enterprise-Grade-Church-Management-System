/**
 * Existing Member OTP Verification Component
 *
 * Shared component for verifying existing members via OTP
 * Used by: EventRegistration, PrayerRequest, JoinGroup, CounselingAppointment, ProfileUpdate
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
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
  showResend = true
}) => {
  const { t } = useTranslation('kiosk');

  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

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
      await kioskApi.sendOTP(phone, churchId);

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
      console.error('Failed to resend OTP:', error);
      setOtpError(t('otp.resend_error') || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  return (
    <motion.div
      className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 w-full box-border overflow-hidden"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {/* Member Profile */}
      <div className="text-center space-y-3 sm:space-y-4 lg:space-y-6">
        <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">
          {title || t('existing_profile.title')}
        </h2>

        {subtitle && (
          <p className="text-base sm:text-lg lg:text-xl text-gray-600">
            {subtitle}
          </p>
        )}

        <div className="flex flex-col items-center gap-3 sm:gap-4 p-4 sm:p-6 bg-blue-50 rounded-xl sm:rounded-2xl">
          <MemberAvatar member={member} size="xl" />
          <div className="text-center">
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
              {member?.full_name}
            </p>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">
              {member?.member_status || 'Member'}
            </p>
          </div>
        </div>
      </div>

      {/* OTP Section */}
      <div className="space-y-4 sm:space-y-6">
        <div className="text-center">
          <p className="text-base sm:text-lg lg:text-xl text-gray-700 mb-4 sm:mb-6">
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
            className="w-full text-sm sm:text-base lg:text-lg"
          >
            {resending
              ? t('otp.sending') || 'Sending...'
              : resendCooldown > 0
                ? `${t('otp.resend') || 'Resend OTP'} (${resendCooldown}s)`
                : t('otp.resend') || 'Resend OTP'
            }
          </Button>
        )}
      </div>
    </motion.div>
  );
};

export default ExistingMemberOTP;
