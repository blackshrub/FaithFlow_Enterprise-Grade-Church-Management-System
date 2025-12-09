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
  ClipboardCheck,
  Cross,
  Droplets,
  Baby,
  Gem
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
    // Member Care Services (highlighted with special styling)
    {
      id: 'accept_jesus',
      icon: Cross,
      title: t('home.accept_jesus'),
      description: t('home.accept_jesus_desc'),
      path: '/kiosk/accept-jesus',
      enabled: settings?.enable_accept_jesus !== false,
      highlight: true, // Special golden/highlighted styling
    },
    {
      id: 'baptism',
      icon: Droplets,
      title: t('home.baptism'),
      description: t('home.baptism_desc'),
      path: '/kiosk/baptism',
      enabled: settings?.enable_baptism !== false,
    },
    {
      id: 'child_dedication',
      icon: Baby,
      title: t('home.child_dedication'),
      description: t('home.child_dedication_desc'),
      path: '/kiosk/child-dedication',
      enabled: settings?.enable_child_dedication !== false,
    },
    {
      id: 'holy_matrimony',
      icon: Gem,
      title: t('home.holy_matrimony'),
      description: t('home.holy_matrimony_desc'),
      path: '/kiosk/holy-matrimony',
      enabled: settings?.enable_holy_matrimony !== false,
    },
    // Existing Services
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
      {/* Full-height container for landscape - no scroll */}
      <div className="flex flex-col h-full w-full max-w-7xl mx-auto px-3 sm:px-4 lg:px-6">
        {/* Welcome Header - compact */}
        <motion.div
          className="text-center py-3 sm:py-4 lg:py-6 flex-shrink-0"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900">
            {settings?.home_title || t('home.title')}
          </h1>
          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-600 mt-1">
            {settings?.home_subtitle || t('home.subtitle')}
          </p>
        </motion.div>

        {/* Service Tiles Grid - fills remaining space */}
        {/* Landscape: 5 cols (2 rows), Portrait: 2-3 cols (scrollable) */}
        <div className="flex-1 min-h-0 pb-3 sm:pb-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 sm:gap-3 lg:gap-4 h-full auto-rows-fr">
            {enabledServices.map((service, index) => (
              <motion.div
                key={service.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.04 }}
              >
                <ServiceTile
                  icon={service.icon}
                  title={service.title}
                  description={service.description}
                  onClick={() => navigate(service.path, { state: { churchId } })}
                  highlight={service.highlight}
                />
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </KioskLayout>
  );
};

export default KioskHome;
