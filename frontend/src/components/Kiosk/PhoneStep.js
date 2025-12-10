/**
 * Phone Number Step - Shared by all kiosk services
 * 
 * Handles phone lookup and branches to existing/new member flow
 */

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Phone } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import kioskApi from '../../services/kioskApi';

const PhoneStep = ({ onMemberFound, onMemberNotFound, onError, churchId }) => {
  const { t } = useTranslation('kiosk');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const handleContinue = async () => {
    setError('');
    
    // Basic validation
    if (!phone || phone.length < 10) {
      setError(t('phone.invalid'));
      return;
    }
    
    // Normalize phone number for WhatsApp (Indonesia)
    let normalizedPhone = phone.trim();
    
    // Remove any spaces, dashes, or special characters
    normalizedPhone = normalizedPhone.replace(/[\s\-\(\)]/g, '');
    
    // If starts with 0, replace with 62 (Indonesia country code)
    if (normalizedPhone.startsWith('0')) {
      normalizedPhone = '62' + normalizedPhone.substring(1);
    }
    
    // If doesn't start with +, add it
    if (!normalizedPhone.startsWith('+')) {
      normalizedPhone = '+' + normalizedPhone;
    }
    
    
    setLoading(true);
    
    try {
      const member = await kioskApi.lookupMemberByPhone(normalizedPhone, churchId);
      
      
      if (member) {
        // Existing member - send OTP automatically
        const otpResult = await kioskApi.sendOTP(normalizedPhone, churchId);
        const expiresIn = otpResult?.expires_in_seconds || 300; // Default 5 minutes

        onMemberFound(member, normalizedPhone, expiresIn);
      } else {
        // New member - send OTP automatically
        const otpResult = await kioskApi.sendOTP(normalizedPhone, churchId);
        const expiresIn = otpResult?.expires_in_seconds || 300; // Default 5 minutes

        onMemberNotFound(normalizedPhone, expiresIn);
      }
    } catch (err) {
      console.error('❌ Phone lookup error:', err);
      console.error('❌ Error response:', err.response?.data);
      setError(t('phone.lookup_error'));
      if (onError) onError(err);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <motion.div
      className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto w-full box-border mb-6"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-4 sm:space-y-6 lg:space-y-8">
        {/* Icon */}
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-blue-100 rounded-full flex items-center justify-center">
            <Phone className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-600" />
          </div>
        </motion.div>

        {/* Title */}
        <div className="text-center space-y-2 sm:space-y-3">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
            {t('phone.title')}
          </h2>
          <p className="text-base sm:text-lg lg:text-xl text-gray-600">
            {t('phone.description')}
          </p>
        </div>

        {/* Phone Input - Numbers only */}
        <div className="space-y-3 sm:space-y-4">
          <Label htmlFor="phone" className="text-base sm:text-xl lg:text-2xl font-medium text-gray-700">
            {t('phone.label')}
          </Label>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            pattern="[0-9]*"
            data-kiosk-phone="true"
            data-testid="phone-input"
            aria-label={t('phone.label')}
            value={phone}
            onChange={(e) => {
              // Strictly allow only numbers
              const numericValue = e.target.value.replace(/[^0-9]/g, '');
              setPhone(numericValue);
            }}
            placeholder={t('phone.placeholder')}
            className="w-full h-16 sm:h-20 lg:h-24 px-4 sm:px-6 lg:px-8 rounded-xl border-2 border-gray-300 focus:border-blue-500 focus:ring-2 sm:focus:ring-4 focus:ring-blue-200 focus:outline-none font-medium tracking-wider disabled:bg-gray-100 disabled:cursor-not-allowed"
            disabled={loading}
            autoFocus
            onKeyPress={(e) => {
              // Block non-numeric keys
              if (!/[0-9]/.test(e.key) && e.key !== 'Enter') {
                e.preventDefault();
              }
              if (e.key === 'Enter') handleContinue();
            }}
          />

          {error && (
            <motion.p
              className="text-sm sm:text-base lg:text-lg text-red-600"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2 }}
            >
              {error}
            </motion.p>
          )}
        </div>

        {/* Continue Button */}
        <Button
          data-testid="send-otp-button"
          onClick={handleContinue}
          disabled={loading || !phone}
          className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
          size="lg"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin rounded-full h-4 w-4 sm:h-5 sm:w-5 border-b-2 border-white"></span>
              {t('otp.verifying')}
            </span>
          ) : t('phone.continue')}
        </Button>
      </div>
    </motion.div>
  );
};

export default PhoneStep;
