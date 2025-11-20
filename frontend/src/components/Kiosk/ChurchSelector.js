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
      // Store selected church
      localStorage.setItem('kiosk_church_id', church.id);
      localStorage.setItem('kiosk_church_name', church.name);
      localStorage.setItem('kiosk_church_data', JSON.stringify(church));
      
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-3xl text-gray-500">Loading...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col">
      {/* Language Toggle - Top Right */}
      <div className="p-6 flex justify-end">
        <Button
          variant="outline"
          size="lg"
          onClick={toggleLanguage}
          className="h-14 px-6 text-lg rounded-2xl"
        >
          <Globe className="mr-2 h-5 w-5" />
          {i18n.language === 'en' ? 'EN' : 'ID'}
        </Button>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-2xl"
        >
          <div className="bg-white rounded-3xl shadow-2xl p-12 space-y-8">
            {/* Icon */}
            <motion.div
              className="flex justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <div className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center">
                <Church className="w-16 h-16 text-blue-600" />
              </div>
            </motion.div>
            
            {/* Title */}
            <div className="text-center space-y-3">
              <h1 className="text-5xl font-bold text-gray-900">
                {i18n.language === 'en' ? 'Welcome' : 'Selamat Datang'}
              </h1>
              <p className="text-2xl text-gray-600">
                {i18n.language === 'en' ? 'Please select your church' : 'Silakan pilih gereja Anda'}
              </p>
            </div>
            
            {/* Church Dropdown */}
            <div className="space-y-4">
              <Label className="text-2xl font-medium text-gray-700">
                {i18n.language === 'en' ? 'Church' : 'Gereja'}
              </Label>
              <Select value={selectedChurch} onValueChange={setSelectedChurch}>
                <SelectTrigger className="h-16 text-2xl rounded-xl">
                  <SelectValue placeholder={i18n.language === 'en' ? 'Select church...' : 'Pilih gereja...'} />
                </SelectTrigger>
                <SelectContent>
                  {churches.map(church => (
                    <SelectItem key={church.id} value={church.id} className="text-xl py-4">
                      {church.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            {/* Continue Button */}
            <Button
              onClick={handleContinue}
              disabled={!selectedChurch}
              className="w-full h-16 text-xl rounded-xl"
              size="lg"
            >
              {i18n.language === 'en' ? 'Continue' : 'Lanjut'}
              <ArrowRight className="ml-2 h-6 w-6" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ChurchSelector;
