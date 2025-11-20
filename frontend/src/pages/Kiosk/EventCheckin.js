/**
 * Event Check-In Kiosk (Staff Only)
 * 
 * Flow:
 * 1. PIN entry (6-digit)
 * 2. Select event
 * 3. QR scan or search member
 * 4. Check-in confirmation
 * 
 * NO INACTIVITY TIMEOUT for this page
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, QrCode, Search, UserCheck, Camera as CameraIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import OTPInput from '../../components/Kiosk/OTPInput';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Card } from '../../components/ui/card';
import MemberAvatar from '../../components/MemberAvatar';
import kioskApi from '../../services/kioskApi';
import { useAuth } from '../../context/AuthContext';
import QrScanner from 'qr-scanner';

const EventCheckinKiosk = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');
  const { church } = useAuth();
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  
  const [step, setStep] = useState('pin'); // pin, select_event, scan_or_search, confirm
  const [pin, setPin] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [pinError, setPinError] = useState('');
  const [staff, setStaff] = useState(null);
  
  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mode, setMode] = useState('scan'); // scan or search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedMember, setSelectedMember] = useState(null);
  const [scanning, setScanning] = useState(false);
  
  // QR scanning with qr-scanner library
  useEffect(() => {
    if (scanning && videoRef.current) {
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        result => handleQRScanned(result.data),
        {
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );
      
      qrScannerRef.current.start();
      
      return () => {
        if (qrScannerRef.current) {
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
        }
      };
    }
  }, [scanning]);
  
  const handleQRScanned = async (qrData) => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
    }
    setScanning(false);
    
    // Extract member ID from QR
    try {
      const memberId = qrData; // Assume QR contains member ID
      // Fetch member and check in
      // TODO: Call check-in API
      console.log('Scanned member:', memberId);
      alert(`Scanned: ${memberId}`);
    } catch (error) {
      console.error('QR scan error:', error);
    }
  };
  
  useEffect(() => {
    if (step === 'select_event') {
      loadEvents();
    }
  }, [step]);
  
  const loadEvents = async () => {
    try {
      const data = await kioskApi.getUpcomingEvents();
      setEvents(data);
    } catch (error) {
      console.error('Failed to load events:', error);
    }
  };
  
  const handlePinComplete = async (code) => {
    setPinError('');
    setVerifying(true);
    
    try {
      const result = await kioskApi.verifyPIN(church?.id, code);
      
      if (result.success) {
        setStaff(result.user);
        setStep('select_event');
      } else {
        setPinError(t('pin.invalid'));
        setPin('');
      }
    } catch (error) {
      console.error('PIN error:', error);
      setPinError(t('pin.error'));
      setPin('');
    } finally {
      setVerifying(false);
    }
  };
  
  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const response = await kioskApi.lookupMemberByPhone(searchTerm);
      setSearchResults(response ? [response] : []);
    } catch (error) {
      console.error('Search error:', error);
    }
  };
  
  // STEP: PIN Entry
  if (step === 'pin') {
    return (
      <KioskLayout showBack showHome>
        <motion.div className="bg-white rounded-3xl shadow-2xl p-12 max-w-2xl mx-auto space-y-8" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center space-y-4">
            <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-12 h-12 text-blue-600" />
            </div>
            <h2 className="text-4xl font-bold">{t('pin.title')}</h2>
            <p className="text-xl text-gray-600">{t('pin.description')}</p>
          </div>
          
          <div className="space-y-6">
            <OTPInput
              length={6}
              value={pin}
              onChange={setPin}
              onComplete={handlePinComplete}
              disabled={verifying}
            />
            
            {pinError && (
              <motion.p className="text-center text-lg text-red-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {pinError}
              </motion.p>
            )}
            
            <p className="text-center text-gray-500 text-lg">
              Default PIN: 000000
            </p>
          </div>
        </motion.div>
      </KioskLayout>
    );
  }
  
  // STEP: Select Event
  if (step === 'select_event') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('pin')}>
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">Select Event</h2>
            <p className="text-xl text-gray-600">Logged in as: {staff?.full_name}</p>
          </div>
          
          {events.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center">
              <p className="text-2xl text-gray-600">No events available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {events.map((event, index) => (
                <motion.button
                  key={event.id}
                  onClick={() => {
                    setSelectedEvent(event);
                    setStep('scan_or_search');
                  }}
                  className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all text-left"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <h3 className="text-2xl font-bold mb-2">{event.name}</h3>
                  <p className="text-lg text-gray-600">{event.event_date}</p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </KioskLayout>
    );
  }
  
  // STEP: Scan or Search
  if (step === 'scan_or_search') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('select_event')}>
        <div className="space-y-8">
          <div className="text-center">
            <h2 className="text-4xl font-bold mb-2">Check-In: {selectedEvent?.name}</h2>
          </div>
          
          {/* Mode Toggle */}
          <div className="flex gap-4 justify-center">
            <Button
              variant={mode === 'scan' ? 'default' : 'outline'}
              onClick={() => setMode('scan')}
              className="h-14 px-8 text-xl rounded-xl"
            >
              <QrCode className="mr-2 h-6 w-6" />
              Scan QR
            </Button>
            <Button
              variant={mode === 'search' ? 'default' : 'outline'}
              onClick={() => setMode('search')}
              className="h-14 px-8 text-xl rounded-xl"
            >
              <Search className="mr-2 h-6 w-6" />
              Search
            </Button>
          </div>
          
          {/* Scan Mode */}
          {mode === 'scan' && (
            <motion.div className="bg-white rounded-3xl p-8 shadow-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!scanning ? (
                <div className="text-center space-y-6">
                  <QrCode className="w-32 h-32 mx-auto text-gray-300" />
                  <Button onClick={() => setScanning(true)} className="h-16 px-12 text-xl rounded-xl">
                    <CameraIcon className="mr-2 h-6 w-6" />
                    Start Scanning
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative rounded-2xl overflow-hidden">
                    <Webcam ref={webcamRef} className="w-full" />
                    <div className="absolute inset-0 border-4 border-blue-500 rounded-2xl pointer-events-none" />
                  </div>
                  <Button variant="outline" onClick={() => setScanning(false)} className="w-full h-14 text-xl rounded-xl">
                    Stop Scanning
                  </Button>
                </div>
              )}
            </motion.div>
          )}
          
          {/* Search Mode */}
          {mode === 'search' && (
            <motion.div className="bg-white rounded-3xl p-8 shadow-xl space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex gap-4">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name or phone number..."
                  className="h-14 text-xl px-6 rounded-xl flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} className="h-14 px-8 text-xl rounded-xl">
                  Search
                </Button>
              </div>
              
              {searchResults.length > 0 && (
                <div className="space-y-3">
                  {searchResults.map(member => (
                    <button
                      key={member.id}
                      onClick={() => {
                        setSelectedMember(member);
                        // TODO: Call check-in API
                        alert(`Checked in: ${member.full_name}`);
                      }}
                      className="w-full bg-blue-50 rounded-xl p-4 flex items-center gap-4 hover:bg-blue-100 transition-all"
                    >
                      <MemberAvatar name={member.full_name} photo={member.photo_base64} size="md" />
                      <div className="text-left flex-1">
                        <p className="text-xl font-bold">{member.full_name}</p>
                        <p className="text-lg text-gray-600">{member.phone_whatsapp}</p>
                      </div>
                      <UserCheck className="w-8 h-8 text-green-600" />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </div>
      </KioskLayout>
    );
  }
  
  return null;
};

export default EventCheckinKiosk;
