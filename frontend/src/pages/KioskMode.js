import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Scan, Search, UserPlus, CheckCircle, ArrowLeft, SwitchCamera } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useEvents } from '@/hooks/useEvents';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsAPI, membersAPI } from '@/services/api';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import { BrowserQRCodeReader } from '@zxing/library';
import SuccessModal from '@/components/Kiosk/SuccessModal';
import OnsiteRSVPModal from '@/components/Kiosk/OnsiteRSVPModal';
import QuickAddForm from '@/components/Kiosk/QuickAddForm';

function KioskMode() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: events = [] } = useEvents({ is_active: true });
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await membersAPI.list();
      return response.data;
    },
  });

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedSession, setSelectedSession] = useState('');
  const [facingMode, setFacingMode] = useState('environment'); // 'user' or 'environment'
  const [isScanning, setIsScanning] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCheckIns, setRecentCheckIns] = useState([]);
  const [successData, setSuccessData] = useState(null);
  const [onsiteRSVPData, setOnsiteRSVPData] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [kioskTheme, setKioskTheme] = useState(() => {
    return localStorage.getItem('kioskTheme') || 'ocean';
  });

  // Theme configurations with colorful patterns
  const themes = {
    ocean: 'bg-gradient-to-br from-blue-400 via-blue-500 to-cyan-600',
    sunset: 'bg-gradient-to-br from-orange-400 via-pink-500 to-red-600',
    forest: 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600',
    lavender: 'bg-gradient-to-br from-purple-400 via-violet-500 to-indigo-600',
    rose: 'bg-gradient-to-br from-pink-400 via-rose-500 to-fuchsia-600',
    midnight: 'bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900',
    autumn: 'bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600',
    mint: 'bg-gradient-to-br from-teal-300 via-green-400 to-emerald-500',
    coral: 'bg-gradient-to-br from-coral-400 via-orange-400 to-pink-500',
    galaxy: 'bg-gradient-to-br from-purple-900 via-violet-800 to-fuchsia-900',
  };

  const handleThemeChange = (theme) => {
    setKioskTheme(theme);
    localStorage.setItem('kioskTheme', theme);
  };

  const webcamRef = useRef(null);
  const codeReader = useRef(null);
  const scanInterval = useRef(null);

  useEffect(() => {
    codeReader.current = new BrowserQRCodeReader();
    return () => {
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
      }
    };
  }, []);

  // Auto-start scanning when event selected
  useEffect(() => {
    if (selectedEvent && isScanning) {
      startScanning();
    }
    return () => stopScanning();
  }, [selectedEvent, isScanning, facingMode]);

  const startScanning = () => {
    if (scanInterval.current) clearInterval(scanInterval.current);
    
    scanInterval.current = setInterval(() => {
      if (webcamRef.current) {
        const imageSrc = webcamRef.current.getScreenshot();
        if (imageSrc && codeReader.current) {
          codeReader.current
            .decodeFromImageUrl(imageSrc)
            .then(result => {
              if (result) {
                handleQRCodeScanned(result.text);
              }
            })
            .catch(() => {});
        }
      }
    }, 500);
  };

  const stopScanning = () => {
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const checkInMutation = useMutation({
    mutationFn: ({ eventId, memberId, sessionId, qrCode }) =>
      eventsAPI.checkIn(eventId, { 
        member_id: memberId, 
        session_id: sessionId,
        qr_code: qrCode 
      }),
    onSuccess: (response) => {
      if (response.data.requires_onsite_rsvp) {
        // Show onsite RSVP modal
        setOnsiteRSVPData({
          member_id: response.data.member_id,
          member_name: response.data.member_name,
          event_id: selectedEvent.id,
          session_id: selectedEvent.event_type === 'series' ? selectedSession : null
        });
      } else {
        // Success!
        setSuccessData({
          name: response.data.member_name,
          photo: response.data.member_photo
        });
        addToRecentCheckIns(response.data.member_name, response.data.member_photo);
        queryClient.invalidateQueries({ queryKey: ['attendance'] });
      }
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || t('events.kiosk.checkInError');
      toast.error(errorMsg, { duration: 3000 });
    },
  });

  const handleQRCodeScanned = (qrData) => {
    if (!selectedEvent) {
      toast.error(t('events.kiosk.selectEvent'));
      return;
    }

    if (selectedEvent.event_type === 'series' && !selectedSession) {
      toast.error(t('events.kiosk.selectSession'));
      return;
    }

    checkInMutation.mutate({
      eventId: selectedEvent.id,
      memberId: null,
      sessionId: selectedEvent.event_type === 'series' ? selectedSession : null,
      qrCode: qrData
    });
  };

  const handleManualCheckIn = (member) => {
    if (!selectedEvent) {
      toast.error(t('events.kiosk.selectEvent'));
      return;
    }

    checkInMutation.mutate({
      eventId: selectedEvent.id,
      memberId: member.id,
      sessionId: selectedEvent.event_type === 'series' ? selectedSession : null,
      qrCode: null
    });
    setSearchQuery('');
  };

  const addToRecentCheckIns = (name, photo) => {
    setRecentCheckIns(prev => [
      { name, photo, time: new Date() },
      ...prev.slice(0, 9)
    ]);
  };

  const filteredMembers = members.filter(member =>
    searchQuery.length >= 2 && (
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.phone_whatsapp?.includes(searchQuery)
    )
  );

  return (
    <div className={`h-screen w-screen overflow-hidden flex flex-col ${themes[kioskTheme]}`}>
      {/* Top Bar */}
      <div className="bg-white/95 backdrop-blur-sm shadow-sm px-6 py-4 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <a href="/events" className="text-gray-600 hover:text-gray-900">
            <ArrowLeft className="h-6 w-6" />
          </a>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('events.kiosk.title')}</h1>
            <p className="text-sm text-gray-600">{selectedEvent?.name || t('events.kiosk.selectEvent')}</p>
          </div>
        </div>
        
        {/* Event Selection */}
        <div className="flex gap-4 items-center">
          {/* Theme Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-gray-700">{t('events.kiosk.theme')}:</span>
            <select
              value={kioskTheme}
              onChange={(e) => handleThemeChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium"
            >
              {Object.keys(themes).map(theme => (
                <option key={theme} value={theme}>
                  {t(`events.kiosk.themes.${theme}`)}
                </option>
              ))}
            </select>
          </div>

          <select
            value={selectedEvent?.id || ''}
            onChange={(e) => {
              const event = events.find(ev => ev.id === e.target.value);
              setSelectedEvent(event);
              setSelectedSession('');
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium"
          >
            <option value="">{t('events.kiosk.selectEvent')}</option>
            {events.map(event => (
              <option key={event.id} value={event.id}>
                {event.name}
              </option>
            ))}
          </select>

          {selectedEvent?.event_type === 'series' && (
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg font-medium"
            >
              <option value="">{t('events.kiosk.selectSession')}</option>
              {selectedEvent.sessions?.map((session, idx) => (
                <option key={idx} value={session.name}>
                  {session.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Main Split Screen */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Camera Scanner */}
        <div className={`w-1/2 flex flex-col relative ${themes[kioskTheme]}`}>
          <div className="absolute top-4 right-4 z-10 flex gap-2">
            <Button
              onClick={toggleCamera}
              variant="secondary"
              size="sm"
              className="bg-white/90 hover:bg-white"
            >
              <SwitchCamera className="h-4 w-4 mr-2" />
              {t('events.kiosk.switchCamera')}
            </Button>
          </div>

          {selectedEvent ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="relative w-full max-w-2xl">
                <Webcam
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  className="w-full rounded-lg"
                  videoConstraints={{ facingMode }}
                />
                <div className="absolute inset-0 border-8 border-green-500 rounded-lg pointer-events-none animate-pulse" />
                <p className="text-center text-white text-lg mt-4 font-medium">
                  {t('events.kiosk.pointCamera')}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-white">
                <Camera className="h-24 w-24 mx-auto mb-4 opacity-50" />
                <p className="text-xl">{t('events.kiosk.selectEvent')}</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Manual Search */}
        <div className="w-1/2 bg-white flex flex-col">
          {/* Search Bar - Fixed at Top */}
          <div className="p-6 border-b border-gray-200 flex-shrink-0">
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('events.kiosk.searchMemberPlaceholder')}
                  className="pl-10 h-12 text-lg"
                />
              </div>
              <Button
                onClick={() => setShowQuickAdd(true)}
                className="h-12 px-6"
                disabled={!selectedEvent}
              >
                <UserPlus className="h-5 w-5 mr-2" />
                {t('events.kiosk.addNewVisitor')}
              </Button>
            </div>
          </div>

          {/* Search Results */}
          <div className="flex-1 overflow-y-auto p-6">
            {searchQuery.length < 2 ? (
              <div className="text-center py-12 text-gray-500">
                <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
                <p>{t('events.kiosk.manualSearch')}</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium mb-2">{t('events.kiosk.noResults')}</p>
                <p className="text-sm">{t('events.kiosk.tryDifferentSearch')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredMembers.slice(0, 8).map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleManualCheckIn(member)}
                    className="w-full bg-white border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-lg transition-all text-left"
                  >
                    <div className="flex items-center gap-4">
                      {member.photo_base64 ? (
                        <img
                          src={member.photo_base64}
                          alt={member.full_name}
                          className="w-16 h-16 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-2xl font-bold text-gray-500">
                            {member.full_name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-lg text-gray-900">{member.full_name}</p>
                        <p className="text-sm text-gray-600">{member.phone_whatsapp || t('common.na')}</p>
                      </div>
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Recent Check-ins */}
          {recentCheckIns.length > 0 && (
            <div className="border-t border-gray-200 p-4 flex-shrink-0 bg-gray-50">
              <p className="text-sm font-medium text-gray-700 mb-2">
                {t('events.kiosk.recentCheckIns')} ({recentCheckIns.length})
              </p>
              <div className="flex gap-2 overflow-x-auto">
                {recentCheckIns.slice(0, 6).map((item, idx) => (
                  <div key={idx} className="flex-shrink-0 bg-green-50 rounded-lg p-2 border border-green-200">
                    <p className="text-xs font-medium text-green-900 truncate max-w-[120px]">
                      {item.name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Success Modal */}
      {successData && (
        <SuccessModal
          name={successData.name}
          photo={successData.photo}
          onClose={() => setSuccessData(null)}
        />
      )}

      {/* Onsite RSVP Modal */}
      {onsiteRSVPData && (
        <OnsiteRSVPModal
          data={onsiteRSVPData}
          onConfirm={async () => {
            // Step 1: RSVP
            await eventsAPI.registerRSVP(onsiteRSVPData.event_id, {
              member_id: onsiteRSVPData.member_id,
              session_id: onsiteRSVPData.session_id
            });
            // Step 2: Check-in
            const response = await eventsAPI.checkIn(onsiteRSVPData.event_id, {
              member_id: onsiteRSVPData.member_id,
              session_id: onsiteRSVPData.session_id
            });
            setOnsiteRSVPData(null);
            setSuccessData({
              name: response.data.member_name,
              photo: response.data.member_photo
            });
            toast.success(t('events.kiosk.onsiteRSVPSuccess'));
          }}
          onClose={() => setOnsiteRSVPData(null)}
        />
      )}

      {/* Quick Add Form */}
      {showQuickAdd && (
        <QuickAddForm
          eventId={selectedEvent?.id}
          sessionId={selectedEvent?.event_type === 'series' ? selectedSession : null}
          onSuccess={(member) => {
            setShowQuickAdd(false);
            setSuccessData({ name: member.full_name, photo: member.photo_base64 });
            addToRecentCheckIns(member.full_name, member.photo_base64);
          }}
          onClose={() => setShowQuickAdd(false)}
        />
      )}
    </div>
  );
}

export default KioskMode;
