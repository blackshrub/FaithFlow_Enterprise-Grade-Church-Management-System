/**
 * Church Selector - First screen for kiosk
 * 
 * User selects their church before accessing kiosk services
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Church, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import api from '../../services/api';

const ChurchSelector = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation('kiosk');
  const [churches, setChurches] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadChurches();
  }, []);
  
  const loadChurches = async () => {
    try {
      const response = await api.get('/churches/public/list');
      setChurches(response.data || []);
    } catch (error) {
      console.error('Failed to load churches:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const selectChurch = (church) => {
    // Store selected church
    localStorage.setItem('kiosk_church_id', church.id);
    localStorage.setItem('kiosk_church_name', church.name);
    localStorage.setItem('kiosk_church_data', JSON.stringify(church));
    
    // Navigate to kiosk home
    navigate('/kiosk/home');
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
      {/* Language Toggle */}
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
        <div className="w-full max-w-4xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-12"
          >
            {/* Header */}
            <div className="text-center space-y-4">
              <motion.div
                className="w-32 h-32 bg-blue-100 rounded-full flex items-center justify-center mx-auto"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <Church className="w-16 h-16 text-blue-600" />
              </motion.div>
              
              <h1 className="text-5xl md:text-6xl font-bold text-gray-900">
                {i18n.language === 'en' ? 'Welcome' : 'Selamat Datang'}
              </h1>
              <p className="text-2xl md:text-3xl text-gray-600">
                {i18n.language === 'en' ? 'Please select your church' : 'Silakan pilih gereja Anda'}
              </p>
            </div>
            
            {/* Church List */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {churches.map((church, index) => (
                <motion.button
                  key={church.id}
                  onClick={() => selectChurch(church)}
                  className="bg-white rounded-3xl p-8 shadow-lg hover:shadow-2xl transition-all text-left group"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <Church className="w-10 h-10 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-3xl font-bold text-gray-900 mb-2">
                        {church.name}
                      </h3>
                      {church.address && (
                        <p className="text-lg text-gray-600">
                          {church.address}
                        </p>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
            
            {churches.length === 0 && (
              <div className="text-center text-2xl text-gray-500 py-12">
                No churches available
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ChurchSelector;
