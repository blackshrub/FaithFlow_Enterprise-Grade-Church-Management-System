/**
 * New Member Registration Component
 *
 * For people not found in system - creates Pre-Visitor profile
 * Features:
 * - Camera permission error handling
 * - Full i18n support
 * - Accessible error messages
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, User, AlertCircle, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import OTPInput from './OTPInput';
import Webcam from 'react-webcam';

const STORAGE_KEY = 'kiosk_new_member_form';

const NewMemberRegistration = ({ phone, onComplete, onError, initialExpiresIn = 300 }) => {
  const { t } = useTranslation('kiosk');
  const webcamRef = useRef(null);

  // Get church_id from kiosk session
  const churchId = localStorage.getItem('kiosk_church_id');

  // Initialize form data with persisted values if available
  const [formData, setFormData] = useState(() => {
    try {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only restore if phone matches (same session)
        if (parsed.phone_whatsapp === phone) {
          return {
            full_name: parsed.full_name || '',
            gender: parsed.gender || '',
            date_of_birth: parsed.date_of_birth || '',
            phone_whatsapp: phone,
            photo_base64: null // Don't persist photo (too large)
          };
        }
      }
    } catch (e) {
      // Ignore parse errors
    }
    return {
      full_name: '',
      gender: '',
      date_of_birth: '',
      phone_whatsapp: phone,
      photo_base64: null
    };
  });

  // Persist form data on change (excluding photo)
  useEffect(() => {
    const dataToSave = {
      full_name: formData.full_name,
      gender: formData.gender,
      date_of_birth: formData.date_of_birth,
      phone_whatsapp: formData.phone_whatsapp
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  }, [formData.full_name, formData.gender, formData.date_of_birth, formData.phone_whatsapp]);

  const [otp, setOtp] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [showCamera, setShowCamera] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front, 'environment' for back
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpVerified, setOtpVerified] = useState(false); // Prevent duplicate OTP verification
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

  // Handle camera errors
  const handleCameraError = useCallback((error) => {
    if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
      setCameraError(t('camera.permission_denied'));
    } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
      setCameraError(t('camera.not_found'));
    } else {
      setCameraError(t('camera.error'));
    }
    setShowCamera(false);
  }, [t]);

  const openCamera = () => {
    setCameraError(null);
    setShowCamera(true);
  };

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
              const ctx = canvas.getContext('2d', { willReadFrequently: true });

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

  const handleOtpComplete = async (code) => {
    // Prevent duplicate verification
    if (verifying || otpVerified) {
      return;
    }

    setOtpError('');
    setVerifying(true);

    try {
      // Import kioskApi here to avoid circular deps
      const { default: kioskApi } = await import('../../services/kioskApi');


      // Verify OTP first
      const otpResult = await kioskApi.verifyOTP(phone, code);

      if (!otpResult.success) {
        setOtpError(t('existing_profile.otp_error'));
        setOtp('');
        setVerifying(false);
        return;
      }

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


      const newMember = await kioskApi.createPreVisitor(memberData);

      // Clear persisted form data on success
      sessionStorage.removeItem(STORAGE_KEY);

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
      className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-3xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 w-full box-border mb-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="text-center space-y-2 sm:space-y-3">
        <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
          {t('new_profile.title')}
        </h2>
        <p className="text-base sm:text-lg lg:text-xl text-gray-600">
          {t('new_profile.description')}
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4 sm:space-y-6">
        {/* Phone (disabled) */}
        <div>
          <Label className="text-base sm:text-lg lg:text-xl font-medium text-gray-700">
            {t('phone.label')}
          </Label>
          <Input
            value={phone}
            disabled
            className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl px-3 sm:px-4 lg:px-6 rounded-xl bg-gray-100"
          />
        </div>

        {/* Full Name */}
        <div>
          <Label className="text-base sm:text-lg lg:text-xl font-medium text-gray-700">
            {t('new_profile.name_label')} *
          </Label>
          <Input
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl px-3 sm:px-4 lg:px-6 rounded-xl"
            autoFocus
          />
        </div>

        {/* Gender */}
        <div>
          <Label className="text-base sm:text-lg lg:text-xl font-medium text-gray-700">
            {t('new_profile.gender_label')} *
          </Label>
          <Select
            value={formData.gender}
            onValueChange={(value) => setFormData({ ...formData, gender: value })}
          >
            <SelectTrigger className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Male" className="text-sm sm:text-base lg:text-xl">{t('new_profile.gender_male')}</SelectItem>
              <SelectItem value="Female" className="text-sm sm:text-base lg:text-xl">{t('new_profile.gender_female')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Birth Date */}
        <div>
          <Label className="text-base sm:text-lg lg:text-xl font-medium text-gray-700">
            {t('new_profile.birthdate_label')} *
          </Label>
          <Input
            type="date"
            value={formData.date_of_birth}
            onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
            className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl px-3 sm:px-4 lg:px-6 rounded-xl"
          />
        </div>

        {/* Photo */}
        <div>
          <Label className="text-base sm:text-lg lg:text-xl font-medium text-gray-700">
            {t('new_profile.photo_label')}
          </Label>

          {/* Camera Error Message */}
          {cameraError && (
            <motion.div
              role="alert"
              className="flex items-center gap-2 p-3 mb-3 bg-red-50 border border-red-200 rounded-xl text-red-700"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm sm:text-base">{cameraError}</span>
            </motion.div>
          )}

          {!showCamera && !formData.photo_base64 && (
            <Button
              type="button"
              variant="outline"
              onClick={openCamera}
              className="w-full h-12 sm:h-14 lg:h-16 text-sm sm:text-base lg:text-xl rounded-xl"
            >
              <Camera className="mr-2 h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7" />
              {t('new_profile.photo_take')}
            </Button>
          )}

          {showCamera && (
            <div className="space-y-3 sm:space-y-4">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-xl sm:rounded-2xl"
                  videoConstraints={{
                    facingMode: facingMode,
                    width: 1280,
                    height: 720
                  }}
                  style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
                  onUserMediaError={handleCameraError}
                />
                {countdown > 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                    <div className="text-6xl sm:text-7xl lg:text-9xl font-bold text-white">
                      {countdown}
                    </div>
                  </div>
                )}

                {/* Switch Camera Button */}
                <button
                  onClick={switchCamera}
                  disabled={countdown > 0}
                  className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/90 hover:bg-white p-3 sm:p-4 rounded-full shadow-lg transition-all disabled:opacity-50"
                  title={t('camera.switch')}
                  aria-label={t('camera.switch')}
                >
                  <svg className="w-5 h-5 sm:w-6 sm:h-6 lg:w-7 lg:h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
              <div className="flex gap-2 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCamera(false);
                    setCountdown(0);
                  }}
                  className="flex-1 h-12 sm:h-14 lg:h-16 text-sm sm:text-base lg:text-xl rounded-xl"
                  disabled={countdown > 0}
                >
                  {t('button.cancel')}
                </Button>
                <Button
                  onClick={capturePhoto}
                  className="flex-1 h-12 sm:h-14 lg:h-16 text-sm sm:text-base lg:text-xl rounded-xl"
                  disabled={countdown > 0}
                >
                  {countdown > 0 ? t('button.capturing') : t('button.capture')}
                </Button>
              </div>
            </div>
          )}

          {formData.photo_base64 && (
            <div className="space-y-3 sm:space-y-4">
              <img
                src={formData.photo_base64}
                alt="Preview"
                className="w-32 h-32 sm:w-40 sm:h-40 lg:w-48 lg:h-48 rounded-full object-cover mx-auto border-4 border-blue-200"
              />
              <Button
                variant="outline"
                onClick={() => setShowCamera(true)}
                className="w-full h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl rounded-xl"
              >
                {t('new_profile.photo_change')}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* OTP Section - Only show when form is complete */}
      {isFormComplete && (
        <div className="border-t pt-4 sm:pt-6 lg:pt-8 space-y-4 sm:space-y-6">
          <div className="text-center space-y-2 sm:space-y-3">
            <p className="text-base sm:text-lg lg:text-xl font-medium text-gray-700">
              {t('new_profile.otp_info')}
            </p>
            <p className="text-sm sm:text-base lg:text-lg text-gray-600">
              {t('new_profile.otp_help')}
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
            autoFocus={false}
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
        </div>
      )}

      {/* Helper text when form incomplete */}
      {!isFormComplete && (
        <div className="border-t pt-4 sm:pt-6 lg:pt-8">
          <p className="text-center text-base sm:text-lg lg:text-xl text-gray-500">
            {t('new_profile.form_incomplete')}
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default NewMemberRegistration;
