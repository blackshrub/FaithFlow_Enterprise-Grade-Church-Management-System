/**
 * Kiosk Home Page
 *
 * Main entry point with 6 service tiles
 * Uses TanStack Query for data fetching
 */

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Calendar,
  Heart,
  MessageCircleHeart,
  Users,
  UserCog,
  ClipboardCheck
} from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import ServiceTile from '../../components/Kiosk/ServiceTile';
import { useKioskSettings, useKioskChurch } from '../../hooks/useKiosk';

const KioskHome = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('kiosk');

  // Get church context from localStorage
  const { churchId, churchName, isValid } = useKioskChurch();

  // Fetch kiosk settings using TanStack Query
  const {
    data: settings,
    isLoading,
    isError
  } = useKioskSettings(churchId, {
    enabled: isValid,
  });

  // Redirect if no church selected
  useEffect(() => {
    if (!isValid) {
      navigate('/kiosk', { replace: true });
    }
  }, [isValid, navigate]);

  // Set language when settings are loaded
  // Priority: user's manual selection > default from settings
  useEffect(() => {
    const userSetLanguage = localStorage.getItem('kiosk_language_set');
    const userLanguage = localStorage.getItem('kiosk_user_language');

    if (userSetLanguage && userLanguage) {
      // User has manually selected a language - use that
      i18n.changeLanguage(userLanguage);
    } else if (settings?.default_language) {
      // Use church default language
      i18n.changeLanguage(settings.default_language);
    }
  }, [settings?.default_language, i18n]);

  const handleChangeChurch = () => {
    // Clear church selection and language preference
    localStorage.removeItem('kiosk_church_id');
    localStorage.removeItem('kiosk_church_name');
    localStorage.removeItem('kiosk_church_data');
    localStorage.removeItem('kiosk_language_set');
    localStorage.removeItem('kiosk_user_language');

    // Redirect to church selector
    navigate('/kiosk', { replace: true });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-2xl text-gray-500">Loading...</div>
      </div>
    );
  }

  const services = [
    {
      id: 'event_registration',
      icon: Calendar,
      title: t('home.event_registration'),
      description: t('home.event_registration_desc'),
      path: '/kiosk/events/register',
      enabled: settings?.enable_event_registration !== false
    },
    {
      id: 'prayer',
      icon: Heart,
      title: t('home.prayer_request'),
      description: t('home.prayer_request_desc'),
      path: '/kiosk/prayer',
      enabled: settings?.enable_prayer !== false
    },
    {
      id: 'counseling',
      icon: MessageCircleHeart,
      title: t('home.counseling'),
      description: t('home.counseling_desc'),
      path: '/kiosk/counseling',
      enabled: settings?.enable_counseling !== false
    },
    {
      id: 'groups',
      icon: Users,
      title: t('home.join_group'),
      description: t('home.join_group_desc'),
      path: '/kiosk/groups/join',
      enabled: settings?.enable_groups !== false
    },
    {
      id: 'profile',
      icon: UserCog,
      title: t('home.update_profile'),
      description: t('home.update_profile_desc'),
      path: '/kiosk/profile/update',
      enabled: settings?.enable_profile_update !== false
    },
    {
      id: 'checkin',
      icon: ClipboardCheck,
      title: t('home.event_checkin'),
      description: t('home.event_checkin_desc'),
      path: '/kiosk/checkin',
      enabled: true // Always available
    },
  ];

  const enabledServices = services.filter(s => s.enabled);

  return (
    <KioskLayout showBack={false} showHome={false}>
      <div className="space-y-6 sm:space-y-8 lg:space-y-12 w-full max-w-full px-2 pb-4">
        {/* Welcome Header */}
        <motion.div
          className="text-center space-y-2 sm:space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-2xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 px-2">
            {settings?.home_title || t('home.title')}
          </h1>
          <p className="text-base sm:text-xl md:text-2xl lg:text-3xl text-gray-600 px-2">
            {settings?.home_subtitle || t('home.subtitle')}
          </p>
        </motion.div>

        {/* Service Tiles - auto-rows ensures uniform heights across all cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 auto-rows-fr">
          {enabledServices.map((service, index) => (
            <motion.div
              key={service.id}
              className="h-full"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ServiceTile
                icon={service.icon}
                title={service.title}
                description={service.description}
                onClick={() => navigate(service.path, { state: { churchId } })}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </KioskLayout>
  );
};

export default KioskHome;
