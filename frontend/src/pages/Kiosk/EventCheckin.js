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
 *
 * Uses TanStack Query for data fetching
 */

import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ClipboardCheck, QrCode, Search, UserCheck, Camera as CameraIcon, Check, ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import OTPInput from '../../components/Kiosk/OTPInput';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import MemberAvatar from '../../components/MemberAvatar';
import { useKioskEvents, useVerifyPIN, useKioskChurch } from '../../hooks/useKiosk';
import api from '../../services/api';
import kioskApi from '../../services/kioskApi';
import QrScanner from 'qr-scanner';

const EventCheckinKiosk = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  // Get church context
  const { churchId } = useKioskChurch();

  const [step, setStep] = useState('pin'); // pin, select_event, scan_or_search, success
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [staff, setStaff] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mode, setMode] = useState('scan'); // scan or search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [checkinInProgress, setCheckinInProgress] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastCheckedIn, setLastCheckedIn] = useState(null);
  const [checkinError, setCheckinError] = useState('');
  const [recentCheckins, setRecentCheckins] = useState([]);

  // Fetch events using TanStack Query
  const {
    data: events = [],
    isLoading: eventsLoading,
  } = useKioskEvents(churchId, {
    enabled: step === 'select_event' && !!churchId,
  });

  // PIN verification mutation
  const pinMutation = useVerifyPIN();

  // Check-in API call
  const performCheckin = useCallback(async (memberId, memberName, qrCode = null) => {
    if (checkinInProgress) return;

    setCheckinInProgress(true);
    setCheckinError('');

    try {
      // Call the events check-in API
      const response = await api.post(`/events/${selectedEvent.id}/check-in`, {
        member_id: memberId,
        qr_code: qrCode,
        source: 'kiosk'
      });

      if (response.data) {
        // Success - add to recent checkins and show success
        setLastCheckedIn({ name: memberName, time: new Date() });
        setRecentCheckins(prev => [
          { name: memberName, time: new Date() },
          ...prev.slice(0, 9)
        ]);
        setStep('success');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.detail || t('errors.generic');
      setCheckinError(errorMessage);

      // Auto-clear error after 3 seconds
      setTimeout(() => setCheckinError(''), 3000);
    } finally {
      setCheckinInProgress(false);
    }
  }, [selectedEvent, checkinInProgress, t]);

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

    try {
      // QR data might be member ID or formatted QR code
      // Try to parse it - could be JSON or plain member ID
      let memberId = qrData;
      let memberName = 'Member';

      try {
        const parsed = JSON.parse(qrData);
        memberId = parsed.member_id || parsed.memberId || qrData;
        memberName = parsed.member_name || parsed.name || 'Member';
      } catch {
        // Not JSON, use as-is (plain member ID)
        memberId = qrData;
      }

      // Perform check-in with QR code
      await performCheckin(memberId, memberName, qrData);
    } catch (error) {
      console.error('QR scan error:', error);
      setCheckinError('Invalid QR code');
      setTimeout(() => setCheckinError(''), 3000);
    }
  };

  const handlePinComplete = async (code) => {
    setPinError('');

    try {
      const result = await pinMutation.mutateAsync({ churchId, pin: code });

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
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      // Include church_id in the lookup
      const response = await kioskApi.lookupMemberByPhone(searchTerm, churchId);
      setSearchResults(response ? [response] : []);
    } catch (error) {
      console.error('Search error:', error);
      setSearchResults([]);
    }
  };

  const handleMemberCheckin = async (member) => {
    await performCheckin(member.id, member.full_name);
  };

  const handleContinueChecking = () => {
    setLastCheckedIn(null);
    setSearchTerm('');
    setSearchResults([]);
    setStep('scan_or_search');
  };

  // STEP: PIN Entry
  if (step === 'pin') {
    return (
      <KioskLayout showBack showHome>
        <motion.div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 w-full box-border overflow-hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{t('pin.title')}</h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">{t('pin.description')}</p>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <OTPInput
              length={6}
              value={pin}
              onChange={setPin}
              onComplete={handlePinComplete}
              disabled={pinMutation.isPending}
            />

            {pinError && (
              <motion.p className="text-center text-sm sm:text-base lg:text-lg text-red-600" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {pinError}
              </motion.p>
            )}
          </div>
        </motion.div>
      </KioskLayout>
    );
  }

  // STEP: Select Event
  if (step === 'select_event') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('pin')}>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">Select Event</h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">Logged in as: {staff?.full_name}</p>
          </div>

          {eventsLoading ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 text-center">
              <div className="text-lg sm:text-xl lg:text-2xl text-gray-600">Loading events...</div>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 text-center">
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-600">{t('event_registration.no_events')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {events.map((event, index) => (
                <motion.button
                  key={event.id}
                  onClick={() => {
                    setSelectedEvent(event);
                    setStep('scan_or_search');
                  }}
                  className="bg-white rounded-xl sm:rounded-2xl p-4 sm:p-5 lg:p-6 shadow-lg hover:shadow-xl transition-all text-left"
                  whileHover={{ scale: 1.02 }}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <h3 className="text-lg sm:text-xl lg:text-2xl font-bold mb-2">{event.name}</h3>
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600">{event.event_date}</p>
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
        <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <h2 className="text-xl sm:text-2xl lg:text-4xl font-bold mb-2">Check-In: {selectedEvent?.name}</h2>
            {checkinError && (
              <motion.p
                className="text-sm sm:text-base lg:text-lg text-red-600 mt-2"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {checkinError}
              </motion.p>
            )}
          </div>

          {/* Mode Toggle */}
          <div className="flex gap-2 sm:gap-4 justify-center">
            <Button
              variant={mode === 'scan' ? 'default' : 'outline'}
              onClick={() => setMode('scan')}
              className="h-10 sm:h-12 lg:h-14 px-4 sm:px-6 lg:px-8 text-sm sm:text-base lg:text-xl rounded-xl"
            >
              <QrCode className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              Scan QR
            </Button>
            <Button
              variant={mode === 'search' ? 'default' : 'outline'}
              onClick={() => setMode('search')}
              className="h-10 sm:h-12 lg:h-14 px-4 sm:px-6 lg:px-8 text-sm sm:text-base lg:text-xl rounded-xl"
            >
              <Search className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              Search
            </Button>
          </div>

          {/* Scan Mode */}
          {mode === 'scan' && (
            <motion.div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {!scanning ? (
                <div className="text-center space-y-4 sm:space-y-6">
                  <QrCode className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 mx-auto text-gray-300" />
                  <Button
                    onClick={() => setScanning(true)}
                    className="h-12 sm:h-14 lg:h-16 px-6 sm:px-8 lg:px-12 text-base sm:text-lg lg:text-xl rounded-xl"
                    disabled={checkinInProgress}
                  >
                    <CameraIcon className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
                    Start Scanning
                  </Button>
                </div>
              ) : (
                <div className="space-y-3 sm:space-y-4">
                  <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black">
                    <video ref={videoRef} className="w-full" />
                    <div className="absolute inset-0 border-2 sm:border-4 border-blue-500 rounded-xl sm:rounded-2xl pointer-events-none" />
                  </div>
                  <p className="text-center text-sm sm:text-base lg:text-lg text-gray-600">Point camera at QR code</p>
                  <Button variant="outline" onClick={() => {
                    setScanning(false);
                    if (qrScannerRef.current) {
                      qrScannerRef.current.stop();
                    }
                  }} className="w-full h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl rounded-xl">
                    Stop Scanning
                  </Button>
                </div>
              )}
            </motion.div>
          )}

          {/* Search Mode */}
          {mode === 'search' && (
            <motion.div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl space-y-4 sm:space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="flex gap-2 sm:gap-4">
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Name or phone number..."
                  className="h-10 sm:h-12 lg:h-14 text-sm sm:text-base lg:text-xl px-3 sm:px-4 lg:px-6 rounded-xl flex-1"
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                />
                <Button onClick={handleSearch} className="h-10 sm:h-12 lg:h-14 px-4 sm:px-6 lg:px-8 text-sm sm:text-base lg:text-xl rounded-xl">
                  Search
                </Button>
              </div>

              {searchResults.length > 0 && (
                <div className="space-y-2 sm:space-y-3">
                  {searchResults.map(member => (
                    <button
                      key={member.id}
                      onClick={() => handleMemberCheckin(member)}
                      disabled={checkinInProgress}
                      className="w-full bg-blue-50 rounded-lg sm:rounded-xl p-3 sm:p-4 flex items-center gap-2 sm:gap-4 hover:bg-blue-100 transition-all disabled:opacity-50"
                    >
                      <MemberAvatar member={member} size="md" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-base sm:text-lg lg:text-xl font-bold truncate">{member.full_name}</p>
                        <p className="text-sm sm:text-base lg:text-lg text-gray-600 truncate">{member.phone_whatsapp}</p>
                      </div>
                      {checkinInProgress ? (
                        <span className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-green-600 flex-shrink-0"></span>
                      ) : (
                        <UserCheck className="w-6 h-6 sm:w-8 sm:h-8 text-green-600 flex-shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* Recent Check-ins */}
          {recentCheckins.length > 0 && (
            <div className="bg-white rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow">
              <p className="text-sm sm:text-base lg:text-lg font-medium text-gray-700 mb-2 sm:mb-3">Recent Check-ins ({recentCheckins.length})</p>
              <div className="flex gap-1.5 sm:gap-2 overflow-x-auto">
                {recentCheckins.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="flex-shrink-0 bg-green-50 rounded-lg p-1.5 sm:p-2 border border-green-200">
                    <p className="text-[10px] sm:text-xs lg:text-sm font-medium text-green-900 truncate max-w-[80px] sm:max-w-[120px]">
                      {item.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </KioskLayout>
    );
  }

  // STEP: Success
  if (step === 'success') {
    return (
      <KioskLayout showBack={false} showHome={false}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 text-center w-full box-border overflow-hidden"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <Check className="w-10 h-10 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-green-600" />
            </div>
          </motion.div>

          <div className="space-y-2 sm:space-y-3 lg:space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">Check-In Complete!</h2>
            <p className="text-lg sm:text-2xl lg:text-3xl text-blue-600 font-bold">{lastCheckedIn?.name}</p>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">has been checked in successfully.</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => navigate('/kiosk/home')}
              className="flex-1 h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
            >
              <ArrowLeft className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              {t('home.back_to_start')}
            </Button>
            <Button
              onClick={handleContinueChecking}
              className="flex-1 h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
            >
              Check In Another
            </Button>
          </div>
        </motion.div>
      </KioskLayout>
    );
  }

  return null;
};

export default EventCheckinKiosk;
