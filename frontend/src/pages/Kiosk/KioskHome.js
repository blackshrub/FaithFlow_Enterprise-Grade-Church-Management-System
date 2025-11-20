/**
 * Kiosk Home Page
 * 
 * Main entry point with 6 service tiles
 */

import React, { useEffect, useState } from 'react';
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
import kioskApi from '../../services/kioskApi';

const KioskHome = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const data = await kioskApi.getKioskSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load kiosk settings:', error);
      // Default to all enabled
      setSettings({
        enable_event_registration: true,
        enable_prayer: true,
        enable_counseling: true,
        enable_groups: true,
        enable_profile_update: true
      });
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) {
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
      description: 'Register for upcoming church events',
      path: '/kiosk/events/register',
      enabled: settings?.enable_event_registration !== false
    },
    {
      id: 'prayer',
      icon: Heart,
      title: t('home.prayer_request'),
      description: 'Share your prayer needs with us',
      path: '/kiosk/prayer',
      enabled: settings?.enable_prayer !== false
    },
    {
      id: 'counseling',
      icon: MessageCircleHeart,
      title: t('home.counseling'),
      description: 'Request a counseling appointment',
      path: '/kiosk/counseling',
      enabled: settings?.enable_counseling !== false
    },
    {
      id: 'groups',
      icon: Users,
      title: t('home.join_group'),
      description: 'Join a small group or ministry',
      path: '/kiosk/groups/join',
      enabled: settings?.enable_groups !== false
    },
    {
      id: 'profile',
      icon: UserCog,
      title: t('home.update_profile'),
      description: 'Update your contact information',
      path: '/kiosk/profile/update',
      enabled: settings?.enable_profile_update !== false
    },
    {
      id: 'checkin',
      icon: ClipboardCheck,
      title: t('home.event_checkin'),
      description: 'For staff: Event attendance',
      path: '/kiosk/checkin',
      enabled: true // Always available
    },
  ];
  
  const enabledServices = services.filter(s => s.enabled);
  
  return (
    <KioskLayout showBack={false} showHome={false}>
      <div className="space-y-12">
        {/* Welcome Header */}
        <motion.div
          className="text-center space-y-4"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
            {settings?.home_title || t('home.title')}
          </h1>
          <p className="text-2xl md:text-3xl text-gray-600">
            {settings?.home_subtitle || t('home.subtitle')}
          </p>
        </motion.div>
        
        {/* Service Tiles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {enabledServices.map((service, index) => (
            <motion.div
              key={service.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <ServiceTile
                icon={service.icon}
                title={service.title}
                description={service.description}
                onClick={() => navigate(service.path)}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </KioskLayout>
  );
};

export default KioskHome;
