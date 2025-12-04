/**
 * Kiosk Inactivity Timeout Hook
 *
 * Auto-returns to /kiosk home after period of inactivity
 * Shows warning dialog 30 seconds before timeout
 * Clears sensitive session data on timeout
 * Does NOT apply to staff event check-in page
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useKioskInactivity = (timeoutMinutes = 2) => {
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef(null);
  const warningRef = useRef(null);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState(30);
  const countdownRef = useRef(null);

  // Don't apply timeout to staff event check-in or kiosk home/selector
  const isStaffCheckin = location.pathname.includes('/kiosk/checkin');
  const isKioskHome = location.pathname === '/kiosk' || location.pathname === '/kiosk/home';
  const shouldApplyTimeout = !isStaffCheckin && !isKioskHome && timeoutMinutes > 0;

  // Clear sensitive session data but keep church context
  const clearSessionData = useCallback(() => {
    // Keep church identification for next user
    // kiosk_church_id, kiosk_church_name, kiosk_church_data are preserved

    // Clear any form data that might be cached
    sessionStorage.clear();
  }, []);

  // Handle timeout - navigate home and clear data
  const handleTimeout = useCallback(() => {
    setShowWarning(false);
    clearSessionData();
    navigate('/kiosk/home', { replace: true });
  }, [navigate, clearSessionData]);

  // Handle user choosing to stay
  const handleStayActive = useCallback(() => {
    setShowWarning(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }
    resetTimer();
  }, []);

  // Show warning and start countdown
  const showTimeoutWarning = useCallback(() => {
    setSecondsRemaining(30);
    setShowWarning(true);

    // Start countdown
    countdownRef.current = setInterval(() => {
      setSecondsRemaining(prev => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [handleTimeout]);

  const resetTimer = useCallback(() => {
    if (!shouldApplyTimeout) return;

    // Clear existing timers
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (warningRef.current) {
      clearTimeout(warningRef.current);
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    // Hide warning if showing
    setShowWarning(false);

    // Calculate timeout (minus 30 seconds for warning)
    const warningTime = Math.max((timeoutMinutes * 60 - 30) * 1000, 10000); // Min 10 seconds before warning

    // Set warning timer
    warningRef.current = setTimeout(() => {
      showTimeoutWarning();
    }, warningTime);

  }, [shouldApplyTimeout, timeoutMinutes, showTimeoutWarning]);

  useEffect(() => {
    if (!shouldApplyTimeout) return;

    // Events that indicate activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Set initial timer
    resetTimer();

    // Reset timer on any activity (but not if warning is showing)
    const handleActivity = () => {
      if (!showWarning) {
        resetTimer();
      }
    };

    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (warningRef.current) {
        clearTimeout(warningRef.current);
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [shouldApplyTimeout, resetTimer, showWarning]);

  return {
    resetTimer,
    showWarning,
    secondsRemaining,
    handleStayActive,
    handleTimeout
  };
};
