/**
 * Church Selector - First screen for kiosk
 * 
 * User selects their church from dropdown before accessing kiosk
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Church, Globe, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Label } from '../ui/label';
import api from '../../services/api';

const ChurchSelector = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation('kiosk');
  const [churches, setChurches] = useState([]);
  const [selectedChurch, setSelectedChurch] = useState('');
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadChurches();
  }, []);
  
  const loadChurches = async () => {
    try {
      const response = await api.get('/churches/public/list');
      const churchList = response.data || [];
      setChurches(churchList);
      
      // Auto-select if only one church
      if (churchList.length === 1) {
        setSelectedChurch(churchList[0].id);
      }
    } catch (error) {
      console.error('Failed to load churches:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleContinue = () => {
    if (!selectedChurch) return;

    const church = churches.find(c => c.id === selectedChurch);
    if (church) {
      // Store selected church - only store minimal required fields (no sensitive data)
      localStorage.setItem('kiosk_church_id', church.id);
      localStorage.setItem('kiosk_church_name', church.name);
      // Only store public display fields needed for kiosk UI
      const safeChurchData = {
        id: church.id,
        name: church.name,
        logo_url: church.logo_url,
        primary_color: church.primary_color,
        timezone: church.timezone,
      };
      localStorage.setItem('kiosk_church_data', JSON.stringify(safeChurchData));

      // Navigate to kiosk home
      navigate('/kiosk/home');
    }
  };
  
  const toggleLanguage = () => {
    const newLang = i18n.language === 'en' ? 'id' : 'en';
    i18n.changeLanguage(newLang);
  };
  
  if (loading) {
    return (
      <div data-kiosk="true" className="min-h-screen w-full max-w-[100vw] overflow-x-hidden flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-xl sm:text-2xl lg:text-3xl text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <div data-kiosk="true" className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Language Toggle - Top Right */}
      <div className="p-3 sm:p-4 lg:p-6 flex justify-end">
        <Button
          variant="outline"
          size="lg"
          onClick={toggleLanguage}
          className="h-10 sm:h-12 lg:h-14 px-4 sm:px-5 lg:px-6 text-sm sm:text-base lg:text-lg rounded-xl sm:rounded-2xl"
        >
          <Globe className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
          {i18n.language === 'en' ? 'EN' : 'ID'}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-3 sm:p-4 lg:p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 space-y-6 sm:space-y-8">
            {/* Icon */}
            <motion.div
              className="flex justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-blue-100 rounded-full flex items-center justify-center">
                <Church className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-blue-600" />
              </div>
            </motion.div>

            {/* Title */}
            <div className="text-center space-y-2 sm:space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">
                {i18n.language === 'en' ? 'Welcome' : 'Selamat Datang'}
              </h1>
              <p className="text-base sm:text-lg lg:text-2xl text-gray-600">
                {i18n.language === 'en' ? 'Please select your church' : 'Silakan pilih gereja Anda'}
              </p>
            </div>

            {/* Church Dropdown */}
            <div className="space-y-3 sm:space-y-4">
              <Label className="text-base sm:text-lg lg:text-2xl font-medium text-gray-700">
                {i18n.language === 'en' ? 'Church' : 'Gereja'}
              </Label>
              <Select value={selectedChurch} onValueChange={setSelectedChurch}>
                <SelectTrigger data-testid="church-select" className="h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-2xl rounded-xl">
                  <SelectValue placeholder={i18n.language === 'en' ? 'Select church...' : 'Pilih gereja...'} />
                </SelectTrigger>
                <SelectContent>
                  {churches.map(church => (
                    <SelectItem key={church.id} value={church.id} className="text-base sm:text-lg lg:text-xl py-3 sm:py-4">
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Continue Button */}
            <Button
              data-testid="continue-button"
              onClick={handleContinue}
              disabled={!selectedChurch}
              className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
              size="lg"
            >
              {i18n.language === 'en' ? 'Continue' : 'Lanjut'}
              <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChurchSelector;
