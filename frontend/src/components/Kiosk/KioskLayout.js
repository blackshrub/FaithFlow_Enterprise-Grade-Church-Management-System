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
 */

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Home, ArrowLeft, Globe, Church } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'framer-motion';
import { useKioskInactivity } from '../../hooks/useKioskInactivity';

const KioskLayout = ({ children, showBack = false, showHome = true, onBack = null, showChangeChurch = true }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { i18n, t } = useTranslation('kiosk');
  
  const churchName = localStorage.getItem('kiosk_church_name') || '';
  
  // Apply inactivity timeout (except for staff check-in)
  useKioskInactivity(2); // 2 minutes default
  
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
  };
  
  const handleChangeChurch = () => {
    localStorage.removeItem('kiosk_church_id');
    localStorage.removeItem('kiosk_church_name');
    localStorage.removeItem('kiosk_church_data');
    navigate('/kiosk', { replace: true });
  };
  
  return (
    <div data-kiosk="true" className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
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

          {/* Back button */}
          {showBack && !isHome && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="h-8 sm:h-10 lg:h-12 px-2 sm:px-3 lg:px-4 text-xs sm:text-sm lg:text-base rounded-lg sm:rounded-xl flex-shrink-0"
            >
              <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
              <span className="hidden sm:inline ml-1">{t('home.back')}</span>
            </Button>
          )}

          {/* Back to Start button */}
          {showHome && !isHome && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/kiosk/home')}
              className="h-8 sm:h-10 lg:h-12 px-2 sm:px-3 lg:px-4 text-xs sm:text-sm lg:text-base rounded-lg sm:rounded-xl flex-shrink-0"
            >
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
              <span className="hidden md:inline ml-1">{t('home.back_to_start')}</span>
            </Button>
          )}
        </div>

        {/* Right: Change Church + Language */}
        <div className="flex items-center gap-1.5 sm:gap-2 lg:gap-4 flex-shrink-0">
          {/* Change Church Button */}
          {showChangeChurch && churchName && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleChangeChurch}
              className="h-8 sm:h-10 lg:h-12 px-2 sm:px-3 lg:px-4 text-xs sm:text-sm lg:text-base rounded-lg sm:rounded-xl"
            >
              <Church className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
              <span className="hidden md:inline ml-1">{i18n.language === 'en' ? 'Change' : 'Ganti'}</span>
            </Button>
          )}

          {/* Language Toggle */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleLanguage}
            className="h-8 sm:h-10 lg:h-12 px-2 sm:px-3 lg:px-4 text-xs sm:text-sm lg:text-base rounded-lg sm:rounded-xl"
          >
            <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
            <span className="ml-1">{i18n.language === 'en' ? 'EN' : 'ID'}</span>
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-2 sm:p-4 lg:p-6 w-full overflow-x-hidden min-w-0">
        <div className="w-full max-w-[calc(100vw-1rem)] sm:max-w-[calc(100vw-2rem)] lg:max-w-6xl overflow-hidden min-w-0">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="w-full min-w-0"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default KioskLayout;
