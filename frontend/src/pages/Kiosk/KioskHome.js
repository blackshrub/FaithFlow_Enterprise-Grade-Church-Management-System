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
import api from '../../services/api';

const KioskHome = () => {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation('kiosk');
  const [settings, setSettings] = useState(null);
  const [churchId, setChurchId] = useState(null);
  const [churchName, setChurchName] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if church is selected
    const storedChurchId = localStorage.getItem('kiosk_church_id');
    const storedChurchName = localStorage.getItem('kiosk_church_name');
    
    if (!storedChurchId) {
      // No church selected, redirect to church selector
      navigate('/kiosk', { replace: true });
      return;
    }
    
    setChurchId(storedChurchId);
    setChurchName(storedChurchName || '');
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const data = await kioskApi.getKioskSettings();
      setSettings(data);
      
      // Set default language if configured
      if (data?.default_language && !localStorage.getItem('kiosk_language_set')) {
        i18n.changeLanguage(data.default_language);
      }
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
  
  const handleChangeChurch = () => {
    // Clear church selection
    localStorage.removeItem('kiosk_church_id');
    localStorage.removeItem('kiosk_church_name');
    localStorage.removeItem('kiosk_church_data');
    localStorage.removeItem('kiosk_language_set');
    
    // Redirect to church selector
    navigate('/kiosk', { replace: true });
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
