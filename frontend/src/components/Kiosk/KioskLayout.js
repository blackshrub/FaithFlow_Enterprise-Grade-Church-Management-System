/**
 * KioskLayout - Full-screen wrapper for all kiosk pages
 *
 * Features:
 * - Full viewport height
 * - Centered content
 * - Large typography
 * - Back/Home navigation
 * - Language toggle
 * - Framer Motion wrapper
 * - Inactivity timeout with warning
 */

import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, Globe, Church, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { useKioskInactivity } from '../../hooks/useKioskInactivity';

const KioskLayout = ({ children, showBack = false, showHome = true, onBack = null, showChangeChurch = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation('kiosk');

  const churchName = localStorage.getItem('kiosk_church_name') || '';

  // Set document title for kiosk pages
  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'FaithFlow Kiosk';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  // Apply inactivity timeout (except for staff check-in)
  const { showWarning, secondsRemaining, handleStayActive, handleTimeout } = useKioskInactivity(2); // 2 minutes default

  const isHome = location.pathname === '/kiosk' || location.pathname === '/kiosk/home';

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'id' : 'en';
    i18n.changeLanguage(newLang);
    // Mark that user has manually selected a language - prevents default from overriding
    localStorage.setItem('kiosk_language_set', 'true');
    localStorage.setItem('kiosk_user_language', newLang);
  };

  const handleChangeChurch = () => {
    localStorage.removeItem('kiosk_church_id');
    localStorage.removeItem('kiosk_church_name');
    localStorage.removeItem('kiosk_church_data');
    localStorage.removeItem('kiosk_language_set');
    localStorage.removeItem('kiosk_user_language');
    navigate('/kiosk', { replace: true });
  };

  return (
    <div data-kiosk="true" className="h-screen w-full max-w-[100vw] overflow-hidden bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Top Navigation - Mobile responsive */}
      <div className="p-2 sm:p-4 lg:p-6 flex flex-wrap items-center justify-between gap-2 sm:gap-4 w-full max-w-[100vw] overflow-x-hidden">
        {/* Left: Church name + Navigation buttons */}
        <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-shrink">
          {/* Church Name */}
          {churchName && (
            <div className="flex items-center gap-1 sm:gap-2 text-sm sm:text-base lg:text-xl font-semibold text-gray-700 min-w-0">
              <Church className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-blue-600 flex-shrink-0" />
              <span className="truncate max-w-[80px] sm:max-w-[150px] lg:max-w-[250px]">{churchName}</span>
            </div>
          )}

          {/* Back button - min 44px touch target */}
          {showBack && !isHome && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              aria-label={t('home.back')}
              className="h-11 sm:h-12 lg:h-14 px-3 sm:px-4 lg:px-5 text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              <span className="hidden sm:inline ml-1.5">{t('home.back')}</span>
            </Button>
          )}

          {/* Back to Start button - min 44px touch target */}
          {showHome && !isHome && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/kiosk/home')}
              aria-label={t('home.back_to_start')}
              className="h-11 sm:h-12 lg:h-14 px-3 sm:px-4 lg:px-5 text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl flex-shrink-0"
            >
              <Home className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              <span className="hidden md:inline ml-1.5">{t('home.back_to_start')}</span>
            </Button>
          )}
        </div>

        {/* Right: Change Church + Language */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4 flex-shrink-0">
          {/* Change Church Button - min 44px touch target */}
          {showChangeChurch && churchName && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleChangeChurch}
              aria-label={i18n.language === 'en' ? 'Change church' : 'Ganti gereja'}
              className="h-11 sm:h-12 lg:h-14 px-3 sm:px-4 lg:px-5 text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl"
            >
              <Church className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              <span className="hidden md:inline ml-1.5">{i18n.language === 'en' ? 'Change' : 'Ganti'}</span>
            </Button>
          )}

          {/* Language Toggle - min 44px touch target */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            aria-label={i18n.language === 'en' ? 'Switch to Indonesian' : 'Ganti ke Bahasa Inggris'}
            className="h-11 sm:h-12 lg:h-14 px-3 sm:px-4 lg:px-5 text-sm sm:text-base lg:text-lg rounded-lg sm:rounded-xl"
          >
            <Globe className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            <span className="ml-1.5">{i18n.language === 'en' ? 'EN' : 'ID'}</span>
          </Button>
        </div>
      </div>

      {/* Main Content - fills remaining height */}
      <div className="flex-1 flex flex-col min-h-0 w-full overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex-1 flex flex-col min-h-0 w-full"
        >
          {children}
        </motion.div>
      </div>

      {/* Inactivity Warning Modal */}
      <AnimatePresence>
        {showWarning && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="timeout-title"
            aria-describedby="timeout-desc"
          >
            <motion.div
              className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 max-w-lg mx-4 text-center"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
            >
              {/* Warning Icon */}
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                <AlertTriangle className="w-8 h-8 sm:w-10 sm:h-10 text-amber-600" />
              </div>

              {/* Title */}
              <h2 id="timeout-title" className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-2 sm:mb-3">
                {t('timeout.title')}
              </h2>

              {/* Description */}
              <p id="timeout-desc" className="text-base sm:text-lg lg:text-xl text-gray-600 mb-4 sm:mb-6">
                {t('timeout.text')}
              </p>

              {/* Countdown */}
              <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-amber-600 mb-6 sm:mb-8">
                {secondsRemaining}
              </div>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button
                  variant="outline"
                  onClick={handleTimeout}
                  className="flex-1 h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
                >
                  {t('timeout.button')}
                </Button>
                <Button
                  onClick={handleStayActive}
                  className="flex-1 h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
                  autoFocus
                >
                  {i18n.language === 'en' ? 'Stay Here' : 'Tetap di Sini'}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default KioskLayout;
