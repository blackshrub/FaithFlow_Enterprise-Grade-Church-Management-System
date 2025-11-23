/**
 * New Member Registration Component
 * 
 * For people not found in system - creates Pre-Visitor profile
 */

import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import OTPInput from './OTPInput';
import Webcam from 'react-webcam';

const NewMemberRegistration = ({ phone, onComplete, onError }) => {
  const { t } = useTranslation('kiosk');
  const webcamRef = useRef(null);

  // Get church_id from kiosk session
  const churchId = localStorage.getItem('kiosk_church_id');

  const [formData, setFormData] = useState({
    full_name: '',
    gender: '',
    date_of_birth: '',
    phone_whatsapp: phone,
    photo_base64: null
  });

  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front, 'environment' for back
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpVerified, setOtpVerified] = useState(false); // Prevent duplicate OTP verification

  // Check if form is complete (required fields filled)
  const isFormComplete = formData.full_name.trim() &&
                         formData.gender &&
                         formData.date_of_birth;
  
  const capturePhoto = () => {
    // Start 3-second countdown
    setCountdown(3);
    
    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Capture photo
          const imageSrc = webcamRef.current.getScreenshot();
          
          // If front camera (mirrored preview), un-mirror the saved photo
          if (facingMode === 'user') {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              
              // Flip horizontally to un-mirror
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(img, 0, 0);
              
              // Save un-mirrored photo
              const unMirroredImage = canvas.toDataURL('image/jpeg');
              setFormData({ ...formData, photo_base64: unMirroredImage });
            };
            img.src = imageSrc;
          } else {
            // Back camera - save as-is
            setFormData({ ...formData, photo_base64: imageSrc });
          }
          
          setShowCamera(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };
  
  const switchCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const handleResendOTP = async () => {
    setResending(true);
    setOtpError('');

    try {
      const { default: kioskApi } = await import('../../services/kioskApi');
      const churchId = localStorage.getItem('kiosk_church_id');

      const result = await kioskApi.sendOTP(phone, churchId);
      console.log('🔄 OTP resent:', result.debug_code);

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
      setOtpError('Failed to resend OTP. Please try again.');
    } finally {
      setResending(false);
    }
  };

  const handleOtpComplete = async (code) => {
    // Prevent duplicate verification
    if (verifying || otpVerified) {
      console.log('⚠️ Already verifying or verified, skipping duplicate call');
      return;
    }

    setOtpError('');
    setVerifying(true);

    try {
      // Import kioskApi here to avoid circular deps
      const { default: kioskApi } = await import('../../services/kioskApi');

      console.log('🔍 Verifying OTP:', code);

      // Verify OTP first
      const otpResult = await kioskApi.verifyOTP(phone, code);

      if (!otpResult.success) {
        setOtpError(t('existing_profile.otp_error'));
        setOtp('');
        setVerifying(false);
        return;
      }

      console.log('✅ OTP verified, creating member...');
      setOtpVerified(true); // Mark as verified to prevent re-verification

      // Create member - backend expects specific fields
      const memberData = {
        church_id: churchId,
        full_name: formData.full_name,
        gender: formData.gender,
        date_of_birth: formData.date_of_birth,
        phone_whatsapp: formData.phone_whatsapp,
        photo_base64: formData.photo_base64,
        // Let backend set default member status (Visitor)
        // Backend will auto-assign status based on is_default_for_new flag
      };

      console.log('📝 Member data:', memberData);

      const newMember = await kioskApi.createPreVisitor(memberData);
      console.log('✅ Member created:', newMember);
      onComplete(newMember);

    } catch (error) {
      console.error('❌ Registration error:', error);
      console.error('❌ Error details:', error.response?.data);
      setOtpError(t('new_profile.submit_error'));
      setOtp('');
      setOtpVerified(false); // Reset on error so user can retry
      if (onError) onError(error);
    } finally {
      setVerifying(false);
    }
  };
  
  return (
    <motion.div
      className="bg-white rounded-3xl shadow-2xl p-12 max-w-3xl mx-auto space-y-8"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-bold text-gray-900">
          {t('new_profile.title')}
        </h2>
        <p className="text-xl text-gray-600">
          {t('new_profile.description')}
        </p>
      </div>
      
      {/* Form Fields */}
      <div className="space-y-6">
        {/* Phone (disabled) */}
        <div>
          <Label className="text-xl font-medium text-gray-700">
            {t('phone.label')}
          </Label>
          <Input
            value={phone}
            disabled
            className="h-14 text-xl px-6 rounded-xl bg-gray-100"
          />
        </div>
        
        {/* Full Name */}
        <div>
          <Label className="text-xl font-medium text-gray-700">
            {t('new_profile.name_label')} *
          </Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="h-14 text-xl px-6 rounded-xl"
            autoFocus
          />
        </div>
        
        {/* Gender */}
        <div>
          <Label className="text-xl font-medium text-gray-700">
            {t('new_profile.gender_label')} *
          </Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger className="h-14 text-xl rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male" className="text-xl">{t('new_profile.gender_male')}</SelectItem>
              <SelectItem value="Female" className="text-xl">{t('new_profile.gender_female')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Birth Date */}
        <div>
          <Label className="text-xl font-medium text-gray-700">
            {t('new_profile.birthdate_label')} *
          </Label>
          <Input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            className="h-14 text-xl px-6 rounded-xl"
          />
        </div>
        
        {/* Photo */}
        <div>
          <Label className="text-xl font-medium text-gray-700">
            {t('new_profile.photo_label')}
          </Label>
          {!showCamera && !formData.photo_base64 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCamera(true)}
              className="w-full h-14 text-xl rounded-xl"
            >
              <Camera className="mr-2 h-6 w-6" />
              {t('new_profile.photo_take')}
            </Button>
          )}
          
          {showCamera && (
            <div className="space-y-4">
              <div className="relative rounded-2xl overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-2xl"
                  videoConstraints={{ 
                    facingMode: facingMode,
                    width: 1280,
                    height: 720
                  }}
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                />
                {countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-9xl font-bold text-white">
                      {countdown}
                    </div>
                  </div>
                )}
                
                {/* Switch Camera Button */}
                <button
                  onClick={switchCamera}
                  disabled={countdown > 0}
                  className="absolute top-4 right-4 bg-white/90 hover:bg-white p-3 rounded-full shadow-lg transition-all disabled:opacity-50"
                  title="Switch Camera"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCamera(false);
                    setCountdown(0);
                  }}
                  className="flex-1 h-14 text-xl rounded-xl"
                  disabled={countdown > 0}
                >
                  Cancel
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="flex-1 h-14 text-xl rounded-xl"
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? 'Capturing...' : 'Capture'}
                </Button>
              </div>
            </div>
          )}
          
          {formData.photo_base64 && (
            <div className="space-y-4">
              <img
                src={formData.photo_base64}
                alt="Preview"
                className="w-48 h-48 rounded-full object-cover mx-auto border-4 border-blue-200"
              />
              <Button
                variant="outline"
                onClick={() => setShowCamera(true)}
                className="w-full h-14 text-xl rounded-xl"
              >
                {t('new_profile.photo_change')}
              </Button>
            </div>
          )}
        </div>
      </div>
      
      {/* OTP Section - Only show when form is complete */}
      {isFormComplete && (
        <div className="border-t pt-8 space-y-6">
          <div className="text-center space-y-3">
            <p className="text-xl font-medium text-gray-700">
              {t('new_profile.otp_info')}
            </p>
            <p className="text-lg text-gray-600">
              {t('new_profile.otp_help')}
            </p>
          </div>
          
          <OTPInput
            length={4}
            value={otp}
            onChange={setOtp}
            onComplete={handleOtpComplete}
            disabled={verifying}
            autoFocus={false}
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

          <Button
            variant="ghost"
            onClick={handleResendOTP}
            disabled={resending || resendCooldown > 0}
            className="w-full text-lg"
          >
            {resending ? 'Sending...' : resendCooldown > 0 ? `Resend OTP in ${resendCooldown}s` : 'Resend OTP'}
          </Button>
        </div>
      )}
      
      {/* Helper text when form incomplete */}
      {!isFormComplete && (
        <div className="border-t pt-8">
          <p className="text-center text-xl text-gray-500">
            Please fill in all required fields above to continue.
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default NewMemberRegistration;
