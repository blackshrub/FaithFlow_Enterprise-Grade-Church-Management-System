import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Camera, Scan, Search, UserPlus, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEvents } from '@/hooks/useEvents';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { eventsAPI, membersAPI } from '@/services/api';
import { toast } from 'sonner';
import Webcam from 'react-webcam';
import { BrowserQRCodeReader } from '@zxing/library';

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
  const [scanMode, setScanMode] = useState('camera'); // 'camera' or 'hardware'
  const [isScanning, setIsScanning] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentCheckIns, setRecentCheckIns] = useState([]);

  const webcamRef = useRef(null);
  const codeReader = useRef(null);
  const scanInterval = useRef(null);

  // Initialize QR code reader
  useEffect(() => {
    if (scanMode === 'camera') {
      codeReader.current = new BrowserQRCodeReader();
    }
    return () => {
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
      }
    };
  }, [scanMode]);

  // Check-in mutation
  const checkInMutation = useMutation({
    mutationFn: ({ eventId, memberId, sessionId }) =>
      eventsAPI.checkIn(eventId, { member_id: memberId, session_id: sessionId }),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['attendance', variables.eventId] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      toast.success(t('events.kiosk.checkInSuccess'));
      
      // Add to recent check-ins
      const member = members.find(m => m.id === variables.memberId);
      if (member) {
        setRecentCheckIns(prev => [
          { ...member, checked_in_at: new Date() },
          ...prev.slice(0, 9)
        ]);
      }
    },
    onError: (error) => {
      const errorMsg = error.response?.data?.detail || t('events.kiosk.checkInError');
      toast.error(errorMsg);
    },
  });

  // Camera scanning logic
  const startCameraScanning = () => {
    setIsScanning(true);
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
            .catch(() => {
              // Ignore scanning errors, keep trying
            });
        }
      }
    }, 500); // Scan every 500ms
  };

  const stopCameraScanning = () => {
    setIsScanning(false);
    if (scanInterval.current) {
      clearInterval(scanInterval.current);
      scanInterval.current = null;
    }
  };

  // Hardware scanner listening
  useEffect(() => {
    if (scanMode === 'hardware' && isScanning) {
      let buffer = '';
      const handleKeyPress = (e) => {
        if (e.key === 'Enter') {
          if (buffer.length > 0) {
            handleQRCodeScanned(buffer);
            buffer = '';
          }
        } else if (e.key.length === 1) {
          buffer += e.key;
        }
      };

      window.addEventListener('keypress', handleKeyPress);
      return () => window.removeEventListener('keypress', handleKeyPress);
    }
  }, [scanMode, isScanning]);

  const handleQRCodeScanned = (qrData) => {
    stopCameraScanning();
    
    // Parse QR data: "RSVP|event_id|member_id|session|confirmation_code"
    const parts = qrData.split('|');
    if (parts.length >= 5 && parts[0] === 'RSVP') {
      const [, eventId, memberId, session, code] = parts;
      
      // Validate event matches
      if (selectedEvent && selectedEvent.id !== eventId) {
        toast.error('QR code is for a different event');
        setTimeout(() => setIsScanning(true), 2000);
        return;
      }
      
      // Check in
      checkInMutation.mutate({
        eventId: eventId,
        memberId: memberId,
        sessionId: session === 'single' ? null : session
      });
    } else {
      toast.error(t('events.kiosk.invalidQRCode'));
      setTimeout(() => setIsScanning(true), 2000);
    }
  };

  const handleManualCheckIn = (member) => {
    if (!selectedEvent) {
      toast.error('Please select an event first');
      return;
    }

    checkInMutation.mutate({
      eventId: selectedEvent.id,
      memberId: member.id,
      sessionId: selectedEvent.event_type === 'series' ? selectedSession : null
    });
    setSearchQuery('');
  };

  const filteredMembers = members.filter(member =>
    member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.phone?.includes(searchQuery)
  );

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow p-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {t('events.kiosk.title')}
          </h1>
          <p className="text-gray-600">{t('events.kiosk.subtitle')}</p>
        </div>

        {/* Event Selection */}
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('events.kiosk.selectEvent')} *</Label>
              <select
                value={selectedEvent?.id || ''}
                onChange={(e) => {
                  const event = events.find(ev => ev.id === e.target.value);
                  setSelectedEvent(event);
                  setSelectedSession('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
              >
                <option value="">{t('events.kiosk.selectEvent')}</option>
                {events.map(event => (
                  <option key={event.id} value={event.id}>
                    {event.name} - {event.event_type}
                  </option>
                ))}
              </select>
            </div>

            {selectedEvent?.event_type === 'series' && (
              <div className="space-y-2">
                <Label>{t('events.kiosk.selectSession')} *</Label>
                <select
                  value={selectedSession}
                  onChange={(e) => setSelectedSession(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('events.kiosk.selectSession')}</option>
                  {selectedEvent.sessions?.map((session, idx) => (
                    <option key={idx} value={session.name}>
                      {session.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Scan Mode Selection */}
          <div className="space-y-2">
            <Label>{t('events.kiosk.scanMode')}</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="camera"
                  checked={scanMode === 'camera'}
                  onChange={(e) => {
                    setScanMode(e.target.value);
                    stopCameraScanning();
                  }}
                  className="w-4 h-4"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Camera className="h-4 w-4" />
                    <span className="font-medium">{t('events.kiosk.cameraMode')}</span>
                  </div>
                  <p className="text-xs text-gray-500">{t('events.kiosk.cameraModeDesc')}</p>
                </div>
              </label>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  value="hardware"
                  checked={scanMode === 'hardware'}
                  onChange={(e) => {
                    setScanMode(e.target.value);
                    stopCameraScanning();
                  }}
                  className="w-4 h-4"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <Scan className="h-4 w-4" />
                    <span className="font-medium">{t('events.kiosk.hardwareMode')}</span>
                  </div>
                  <p className="text-xs text-gray-500">{t('events.kiosk.hardwareModeDesc')}</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Scanner Section */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('events.kiosk.scanQRCode')}
            </h2>

            {scanMode === 'camera' ? (
              <div className="space-y-4">
                {isScanning ? (
                  <div className="relative">
                    <Webcam
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full rounded-lg"
                      videoConstraints={{
                        facingMode: 'environment'
                      }}
                    />
                    <div className="absolute inset-0 border-4 border-green-500 rounded-lg pointer-events-none" />
                    <p className="text-center text-sm text-gray-600 mt-2">
                      {t('events.kiosk.pointCamera')}
                    </p>
                  </div>
                ) : (
                  <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-600">{t('events.kiosk.waitingForScan')}</p>
                    </div>
                  </div>
                )}

                <Button
                  onClick={isScanning ? stopCameraScanning : startCameraScanning}
                  className="w-full"
                  disabled={!selectedEvent || (selectedEvent.event_type === 'series' && !selectedSession)}
                >
                  {isScanning ? t('events.kiosk.stopScanning') : t('events.kiosk.startScanning')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <Scan className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">
                      {isScanning ? t('events.kiosk.waitingForScan') : 'Ready to scan'}
                    </p>
                    <p className="text-sm text-gray-500 mt-2">
                      {isScanning ? 'Use your barcode scanner...' : 'Click start to begin'}
                    </p>
                  </div>
                </div>

                <Button
                  onClick={() => setIsScanning(!isScanning)}
                  className="w-full"
                  disabled={!selectedEvent || (selectedEvent.event_type === 'series' && !selectedSession)}
                >
                  {isScanning ? t('events.kiosk.stopScanning') : t('events.kiosk.startScanning')}
                </Button>
              </div>
            )}
          </div>

          {/* Manual Search */}
          <div className="bg-white rounded-lg shadow p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {t('events.kiosk.manualSearch')}
            </h2>

            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('events.kiosk.searchMemberPlaceholder')}
                  className="pl-10"
                />
              </div>

              {searchQuery && (
                <div className="border border-gray-200 rounded-lg max-h-80 overflow-y-auto">
                  {filteredMembers.length === 0 ? (
                    <p className="text-center py-4 text-gray-500 text-sm">
                      {t('members.noMembers')}
                    </p>
                  ) : (
                    <div className="divide-y divide-gray-200">
                      {filteredMembers.slice(0, 10).map(member => (
                        <div
                          key={member.id}
                          className="p-4 hover:bg-gray-50 cursor-pointer flex items-center justify-between"
                          onClick={() => handleManualCheckIn(member)}
                        >
                          <div>
                            <p className="font-medium text-gray-900">{member.full_name}</p>
                            <p className="text-sm text-gray-600">{member.phone || t('common.na')}</p>
                          </div>
                          <Button
                            size="sm"
                            disabled={checkInMutation.isPending}
                          >
                            {t('events.kiosk.quickCheckIn')}
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent Check-ins */}
        {recentCheckIns.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                {t('events.kiosk.recentCheckIns')}
              </h2>
              <span className="text-sm text-gray-500">
                {t('events.kiosk.todayCheckIns', { count: recentCheckIns.length })}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentCheckIns.map((member, index) => (
                <div
                  key={index}
                  className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3"
                >
                  <CheckCircle className="h-8 w-8 text-green-600 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{member.full_name}</p>
                    <p className="text-xs text-gray-600">
                      {member.checked_in_at.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default KioskMode;
