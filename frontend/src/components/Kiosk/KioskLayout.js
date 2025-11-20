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
import { Home, ArrowLeft, Globe } from 'lucide-react';
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
  
  const isHome = location.pathname === '/kiosk';
  
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
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Top Navigation */}
      <div className="p-6 flex items-center justify-between">
        <div className="flex gap-4">
          {showBack && !isHome && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={handleBack}
                className="h-14 px-6 text-lg rounded-2xl"
              >
                <ArrowLeft className="mr-2 h-5 w-5" />
                {t('home.back')}
              </Button>
            </motion.div>
          )}
          
          {showHome && !isHome && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/kiosk')}
                className="h-14 px-6 text-lg rounded-2xl"
              >
                <Home className="mr-2 h-5 w-5" />
                {t('home.back_to_start')}
              </Button>
            </motion.div>
          )}
        </div>
        
        {/* Language Toggle */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Button
            variant="outline"
            size="lg"
            onClick={toggleLanguage}
            className="h-14 px-6 text-lg rounded-2xl"
          >
            <Globe className="mr-2 h-5 w-5" />
            {i18n.language === 'en' ? 'EN' : 'ID'}
          </Button>
        </motion.div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default KioskLayout;
