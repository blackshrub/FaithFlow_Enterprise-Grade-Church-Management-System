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
import { Input } from '../ui/input';
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
    
    console.log('Original phone:', phone);
    console.log('Normalized phone:', normalizedPhone);
    
    setLoading(true);
    
    try {
      const member = await kioskApi.lookupMemberByPhone(normalizedPhone);
      
      console.log('👤 Member lookup result:', member);
      
      if (member) {
        // Existing member - send OTP automatically
        console.log('✅ Member found, sending OTP...');
        const otpResult = await kioskApi.sendOTP(normalizedPhone);
        console.log('📨 OTP send result:', otpResult);
        console.log('🔐 OTP CODE (for testing):', otpResult.debug_code);
        
        onMemberFound(member, normalizedPhone);
      } else {
        // New member - send OTP automatically
        console.log('⚠️ Member not found, creating new, sending OTP...');
        const otpResult = await kioskApi.sendOTP(normalizedPhone);
        console.log('📨 OTP send result:', otpResult);
        console.log('🔐 OTP CODE (for testing):', otpResult.debug_code);
        
        onMemberNotFound(normalizedPhone);
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
      className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="space-y-8">
        {/* Icon */}
        <motion.div
          className="flex justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center">
            <Phone className="w-12 h-12 text-blue-600" />
          </div>
        </motion.div>
        
        {/* Title */}
        <div className="text-center space-y-3">
          <h2 className="text-4xl font-bold text-gray-900">
            {t('phone.title')}
          </h2>
          <p className="text-xl text-gray-600">
            {t('phone.description')}
          </p>
        </div>
        
        {/* Phone Input */}
        <div className="space-y-4">
          <Label htmlFor="phone" className="text-2xl font-medium text-gray-700">
            {t('phone.label')}
          </Label>
          <Input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('phone.placeholder')}
            className="h-16 text-2xl px-6 rounded-xl border-2 focus:ring-4 focus:ring-blue-200"
            disabled={loading}
            autoFocus
            onKeyPress={(e) => e.key === 'Enter' && handleContinue()}
          />
          
          {error && (
            <motion.p
              className="text-lg text-red-600"
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
          onClick={handleContinue}
          disabled={loading || !phone}
          className="w-full h-16 text-xl rounded-xl"
          size="lg"
        >
          {loading ? t('phone.lookup_error') : t('phone.continue')}
        </Button>
      </div>
    </motion.div>
  );
};

export default PhoneStep;
