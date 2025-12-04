/**
 * OTP Input Component
 *
 * Features:
 * - 4 or 6 separate input boxes
 * - Auto-focus next on input
 * - Auto-submit when complete
 * - Large, accessible design
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';

const OTPInput = ({ length = 4, value = '', onChange, onComplete, disabled = false }) => {
  const [otp, setOtp] = useState(new Array(length).fill(''));
  const inputRefs = useRef([]);
  const hasCompletedRef = useRef(false);

  // Reset OTP when external value is cleared
  useEffect(() => {
    if (value === '') {
      setOtp(new Array(length).fill(''));
      hasCompletedRef.current = false;
    }
  }, [value, length]);

  // Handle OTP update - notify parent and check for completion
  const updateOtp = useCallback((newOtp) => {
    setOtp(newOtp);

    const otpString = newOtp.join('');
    onChange(otpString);

    // Only call onComplete once when all digits are filled
    if (otpString.length === length && !hasCompletedRef.current) {
      hasCompletedRef.current = true;
      onComplete(otpString);
    }
  }, [length, onChange, onComplete]);

  const handleChange = (index, inputValue) => {
    if (disabled) return;

    // Only allow digits
    const digit = inputValue.replace(/[^0-9]/g, '');

    if (digit.length > 1) {
      // Pasted multiple digits
      const digits = digit.slice(0, length).split('');
      const newOtp = [...otp];
      digits.forEach((d, i) => {
        if (index + i < length) {
          newOtp[index + i] = d;
        }
      });
      updateOtp(newOtp);

      // Focus last filled input
      const lastIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[lastIndex]?.focus();
    } else {
      // Single digit
      const newOtp = [...otp];
      newOtp[index] = digit;
      updateOtp(newOtp);

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
      hasCompletedRef.current = false; // Allow re-completion
      updateOtp(newOtp);
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
    updateOtp(newOtp);

    // Focus last input
    inputRefs.current[length - 1]?.focus();
  };

  return (
    <div className="flex gap-3 sm:gap-4 lg:gap-5 justify-center flex-wrap w-full max-w-full px-2 py-3">
      {otp.map((digit, index) => (
        <motion.input
          key={index}
          ref={(el) => (inputRefs.current[index] = el)}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          data-kiosk-otp="true"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onKeyPress={(e) => {
            // Strictly block non-numeric keys
            if (!/[0-9]/.test(e.key)) {
              e.preventDefault();
            }
          }}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`OTP digit ${index + 1} of ${length}`}
          className="w-14 h-14 sm:w-16 sm:h-16 lg:w-20 lg:h-20 font-bold text-center border-2 border-gray-300 rounded-lg sm:rounded-xl focus:border-blue-500 focus:ring-2 sm:focus:ring-4 focus:ring-blue-200 transition-all disabled:bg-gray-100 disabled:cursor-not-allowed"
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
