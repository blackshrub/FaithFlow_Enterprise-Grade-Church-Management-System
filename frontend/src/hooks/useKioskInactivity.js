/**
 * Kiosk Inactivity Timeout Hook
 * 
 * Auto-returns to /kiosk home after period of inactivity
 * Does NOT apply to staff event check-in page
 */

import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const useKioskInactivity = (timeoutMinutes = 2) => {
  const navigate = useNavigate();
  const location = useLocation();
  const timeoutRef = useRef(null);
  
  // Don't apply timeout to staff event check-in
  const isStaffCheckin = location.pathname.includes('/kiosk/checkin');
  
  const resetTimer = () => {
    if (isStaffCheckin || timeoutMinutes === 0) return;
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      console.log('⏰ Kiosk inactivity timeout - returning to home');
      navigate('/kiosk', { replace: true });
    }, timeoutMinutes * 60 * 1000);
  };
  
  useEffect(() => {
    if (isStaffCheckin || timeoutMinutes === 0) return;
    
    // Events that indicate activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    // Set initial timer
    resetTimer();
    
    // Reset timer on any activity
    events.forEach(event => {
      document.addEventListener(event, resetTimer, true);
    });
    
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer, true);
      });
    };
  }, [timeoutMinutes, isStaffCheckin, navigate]);
  
  return { resetTimer };
};
