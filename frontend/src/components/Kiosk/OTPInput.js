/**
 * OTP Input Component
 * 
 * Features:
 * - 4 or 6 separate input boxes
 * - Auto-focus next on input
 * - Auto-submit when complete
 * - Large, accessible design
 */

import React, { useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';

const OTPInput = ({ length = 4, value = '', onChange, onComplete, disabled = false }) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);
  
  useEffect(() => {
    if (value === '') {
      setOtp(new Array(length).fill(''));
    }
  }, [value, length]);
  
  useEffect(() => {
    const otpString = otp.join('');
    onChange(otpString);
    
    if (otpString.length === length) {
      onComplete(otpString);
    }
  }, [otp, length, onChange, onComplete]);
  
  const handleChange = (index, value) => {
    if (disabled) return;
    
    // Only allow digits
    const digit = value.replace(/[^0-9]/g, '');
    
    if (digit.length > 1) {
      // Pasted multiple digits
      const digits = digit.slice(0, length).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < length) {
          newOtp[index + i] = d;
        }
      });
      setOtp(newOtp);
      
      // Focus last filled input
      const lastIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[lastIndex]?.focus();
    } else {
      // Single digit
      const newOtp = [...otp];
      newOtp[index] = digit;
      setOtp(newOtp);
      
      // Auto-focus next
      if (digit && index < length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };
  
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!otp[index] && index > 0) {
        // Focus previous if current is empty
        inputRefs.current[index - 1]?.focus();
      }
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };
  
  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    const digits = pastedData.slice(0, length).split('');
    const newOtp = new Array(length).fill('');
    digits.forEach((digit, i) => {
      newOtp[i] = digit;
    });
    setOtp(newOtp);
    
    // Focus last input
    inputRefs.current[length - 1]?.focus();
  };
  
  return (
    <div className="flex gap-3 justify-center">
      {otp.map((digit, index) => (
        <motion.input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          className="w-16 h-16 text-3xl font-bold text-center border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-4 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.15, delay: index * 0.05 }}
          autoFocus={index === 0}
        />
      ))}
    </div>
  );
};

export default OTPInput;
