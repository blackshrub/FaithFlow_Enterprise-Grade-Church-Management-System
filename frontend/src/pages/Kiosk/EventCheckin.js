/**
 * Event Check-In Kiosk (Staff Only)
 *
 * Flow:
 * 1. PIN entry (6-digit)
 * 2. Select event
 * 3. Camera always-on with parallel QR + Face detection
 * 4. Auto check-in with 3-second cancel option
 *
 * Face Recognition Features:
 * - Uses @vladmandic/human for fast browser-based face DETECTION (knows when face is present)
 * - Sends detected face images to backend DeepFace (FaceNet512) for accurate MATCHING
 * - DeepFace provides much higher accuracy than browser-based solutions
 * - Silent photo capture for progressive learning (backend regenerates embeddings)
 * - Auto-confirm with "Not you? Cancel" button (3 seconds)
 *
 * NO INACTIVITY TIMEOUT for this page
 *
 * Uses TanStack Query for data fetching
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  ClipboardCheck,
  QrCode,
  Search,
  UserCheck,
  Camera as CameraIcon,
  Check,
  ArrowLeft,
  Loader2,
  X,
  ScanFace,
  AlertCircle,
} from 'lucide-react';
import { useDeferredSearch } from '../../hooks/useDeferredSearch';
import { motion, AnimatePresence } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import OTPInput from '../../components/Kiosk/OTPInput';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import MemberAvatar from '../../components/MemberAvatar';
import { useKioskEvents, useVerifyPIN, useKioskChurch } from '../../hooks/useKiosk';
import api, { publicFaceRecognitionAPI } from '../../services/api';
import kioskApi from '../../services/kioskApi';
import QrScanner from 'qr-scanner';
import { faceRecognitionService } from '../../services/faceRecognitionService';

// Constants
const CANCEL_COUNTDOWN_SECONDS = 3;
const NO_FACE_TIMEOUT_MS = 3000; // 3 seconds before showing "unrecognized" message

const EventCheckinKiosk = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const faceDetectionIntervalRef = useRef(null);
  const noFaceTimeoutRef = useRef(null);
  const cancelCountdownRef = useRef(null);

  // Get church context
  const { churchId } = useKioskChurch();

  const [step, setStep] = useState('pin'); // pin, select_event, scan_or_search, confirming, success
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [staff, setStaff] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  const [mode, setMode] = useState('scan'); // scan or search

  // React 19 deferred search - search as you type
  const { searchValue: searchTerm, setSearchValue: setSearchTerm, deferredValue: deferredSearch, isSearchPending } = useDeferredSearch();
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [checkinInProgress, setCheckinInProgress] = useState(false);
  const [lastCheckedIn, setLastCheckedIn] = useState(null);
  const [checkinError, setCheckinError] = useState('');
  const [recentCheckins, setRecentCheckins] = useState([]);

  // Face recognition state
  const [faceReady, setFaceReady] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceError, setFaceError] = useState(null);
  const [showUnrecognized, setShowUnrecognized] = useState(false);
  const [faceStatus, setFaceStatus] = useState(''); // idle, detecting, matched, unknown

  // Confirmation modal state
  const [confirmingMember, setConfirmingMember] = useState(null);
  const [confirmingDescriptor, setConfirmingDescriptor] = useState(null);
  const [cancelCountdown, setCancelCountdown] = useState(CANCEL_COUNTDOWN_SECONDS);

  // Camera state
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  // Fetch events using TanStack Query
  const {
    data: events = [],
    isLoading: eventsLoading,
  } = useKioskEvents(churchId, {
    enabled: step === 'select_event' && !!churchId,
  });

  // PIN verification mutation
  const pinMutation = useVerifyPIN();

  // Initialize face recognition when component mounts
  useEffect(() => {
    const initFace = async () => {
      setFaceLoading(true);
      try {
        const ready = await faceRecognitionService.initialize();
        setFaceReady(ready);
        if (!ready) {
          setFaceError('Face recognition initialization failed');
        }
      } catch (error) {
        console.error('Face init error:', error);
        setFaceError(error.message);
      } finally {
        setFaceLoading(false);
      }
    };
    initFace();

    return () => {
      faceRecognitionService.dispose();
    };
  }, []);

  // Note: Face descriptors are now matched on the backend using DeepFace
  // No need to load them client-side anymore

  // Start camera when entering scan_or_search step (always-on camera)
  useEffect(() => {
    if (step === 'scan_or_search' && mode === 'scan' && !cameraActive) {
      startCamera();
    }

    return () => {
      if (step !== 'scan_or_search' || mode !== 'scan') {
        stopCamera();
      }
    };
  }, [step, mode]);

  // Start camera and detection
  const startCamera = async () => {
    if (!videoRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 640, height: 480 }
      });
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraActive(true);
      setCameraError(null);

      // Start QR scanner
      startQRScanner();

      // Start face detection loop
      startFaceDetection();

    } catch (error) {
      console.error('Camera start error:', error);
      setCameraError('Unable to access camera. Please check permissions.');
    }
  };

  // Stop camera and all detection
  const stopCamera = () => {
    // Stop QR scanner
    if (qrScannerRef.current) {
      qrScannerRef.current.stop();
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
    }

    // Stop face detection
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current);
      faceDetectionIntervalRef.current = null;
    }

    // Stop no-face timeout
    if (noFaceTimeoutRef.current) {
      clearTimeout(noFaceTimeoutRef.current);
      noFaceTimeoutRef.current = null;
    }

    // Stop video stream
    if (videoRef.current?.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setCameraActive(false);
    setFaceStatus('idle');
    setShowUnrecognized(false);
  };

  // Start QR scanner on video element
  const startQRScanner = () => {
    if (!videoRef.current || qrScannerRef.current) return;

    qrScannerRef.current = new QrScanner(
      videoRef.current,
      result => handleQRScanned(result.data),
      {
        highlightScanRegion: false, // We'll handle our own overlay
        highlightCodeOutline: true,
      }
    );

    qrScannerRef.current.start();
  };

  // Start face detection loop (parallel with QR)
  // Uses browser-based detection for speed, then sends to backend DeepFace for accurate matching
  const startFaceDetection = () => {
    if (!faceReady || faceDetectionIntervalRef.current) return;

    let consecutiveNoFace = 0;
    const NO_FACE_THRESHOLD = 15; // ~3 seconds at 5 FPS
    let isMatchingInProgress = false; // Prevent overlapping backend calls

    faceDetectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || step === 'confirming' || checkinInProgress || isMatchingInProgress) return;

      try {
        // Use browser-based detection to know if a face is present (fast)
        const detection = await faceRecognitionService.detectFace(videoRef.current);

        if (detection) {
          consecutiveNoFace = 0;
          setShowUnrecognized(false);

          // Clear no-face timeout
          if (noFaceTimeoutRef.current) {
            clearTimeout(noFaceTimeoutRef.current);
            noFaceTimeoutRef.current = null;
          }

          // Face detected - now send to backend DeepFace for accurate matching
          isMatchingInProgress = true;
          setFaceStatus('detecting');

          try {
            // Capture frame as base64
            const frameBase64 = faceRecognitionService.captureFrame(videoRef.current);
            if (!frameBase64) {
              isMatchingInProgress = false;
              return;
            }

            // Send to backend for DeepFace matching
            const response = await publicFaceRecognitionAPI.matchFace(frameBase64, churchId);
            const matchResult = response.data;

            if (matchResult.found) {
              setFaceStatus('matched');
              console.log(`[EventCheckin] DeepFace match: ${matchResult.member_name} (distance: ${matchResult.distance?.toFixed(4)}, confidence: ${matchResult.confidence})`);

              // Create match object compatible with handleFaceMatch
              const match = {
                member: {
                  memberId: matchResult.member_id,
                  memberName: matchResult.member_name,
                  photoUrl: matchResult.photo_url,
                },
                distance: matchResult.distance,
                confidence: matchResult.confidence,
              };

              // Initiate check-in with confirmation modal
              handleFaceMatch(match, null); // No descriptor needed for backend matching
            } else {
              setFaceStatus('unknown');
              console.log('[EventCheckin] DeepFace: No match found');
            }
          } catch (backendError) {
            console.error('Backend face matching error:', backendError);
            setFaceStatus('unknown');
          } finally {
            isMatchingInProgress = false;
          }
        } else {
          consecutiveNoFace++;
          setFaceStatus('detecting');

          // Show unrecognized after threshold
          if (consecutiveNoFace >= NO_FACE_THRESHOLD) {
            if (!noFaceTimeoutRef.current) {
              noFaceTimeoutRef.current = setTimeout(() => {
                setShowUnrecognized(true);
              }, 0);
            }
          }
        }
      } catch (error) {
        console.error('Face detection error:', error);
      }
    }, 200); // 5 FPS for browser detection, backend calls throttled by isMatchingInProgress
  };

  // Handle QR code scanned
  const handleQRScanned = async (qrData) => {
    if (checkinInProgress || step === 'confirming') return;

    // Pause QR scanner temporarily
    if (qrScannerRef.current) {
      qrScannerRef.current.pause();
    }

    try {
      // Parse QR data
      let memberId = qrData;
      let memberName = 'Member';

      try {
        const parsed = JSON.parse(qrData);
        memberId = parsed.member_id || parsed.memberId || qrData;
        memberName = parsed.member_name || parsed.name || 'Member';
      } catch {
        memberId = qrData;
      }

      // Perform check-in directly for QR (no confirmation modal needed - they scanned their QR)
      await performCheckin(memberId, memberName, qrData);
    } catch (error) {
      console.error('QR scan error:', error);
      setCheckinError('Invalid QR code');
      setTimeout(() => setCheckinError(''), 3000);
    } finally {
      // Resume QR scanner
      if (qrScannerRef.current) {
        qrScannerRef.current.start();
      }
    }
  };

  // Handle face match - show confirmation modal
  const handleFaceMatch = (match, descriptor) => {
    if (checkinInProgress || step === 'confirming') return;

    // Pause detection during confirmation
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current);
      faceDetectionIntervalRef.current = null;
    }
    if (qrScannerRef.current) {
      qrScannerRef.current.pause();
    }

    setConfirmingMember(match.member);
    // Descriptor may be null when using backend DeepFace matching
    setConfirmingDescriptor(descriptor ? Array.from(descriptor) : null);
    setCancelCountdown(CANCEL_COUNTDOWN_SECONDS);
    setStep('confirming');

    // Start auto-confirm countdown
    startAutoConfirmCountdown(match.member, descriptor);
  };

  // Start auto-confirm countdown
  const startAutoConfirmCountdown = (member, descriptor) => {
    let countdown = CANCEL_COUNTDOWN_SECONDS;

    cancelCountdownRef.current = setInterval(() => {
      countdown--;
      setCancelCountdown(countdown);

      if (countdown <= 0) {
        clearInterval(cancelCountdownRef.current);
        cancelCountdownRef.current = null;
        // Auto-confirm
        confirmFaceCheckin(member, descriptor);
      }
    }, 1000);
  };

  // Cancel face check-in
  const cancelFaceCheckin = () => {
    if (cancelCountdownRef.current) {
      clearInterval(cancelCountdownRef.current);
      cancelCountdownRef.current = null;
    }

    setConfirmingMember(null);
    setConfirmingDescriptor(null);
    setCancelCountdown(CANCEL_COUNTDOWN_SECONDS);
    setStep('scan_or_search');

    // Resume detection
    setTimeout(() => {
      if (qrScannerRef.current) {
        qrScannerRef.current.start();
      }
      startFaceDetection();
    }, 500);
  };

  // Confirm face check-in
  const confirmFaceCheckin = async (member = confirmingMember, descriptor = confirmingDescriptor) => {
    if (cancelCountdownRef.current) {
      clearInterval(cancelCountdownRef.current);
      cancelCountdownRef.current = null;
    }

    if (!member) return;

    await performCheckin(
      member.memberId,
      member.memberName,
      null, // no QR code
      descriptor,
      true // is face check-in
    );
  };

  // Check-in API call
  const performCheckin = useCallback(async (memberId, memberName, qrCode = null, descriptor = null, isFaceCheckin = false) => {
    if (checkinInProgress) return;

    setCheckinInProgress(true);
    setCheckinError('');

    try {
      let response;

      if (isFaceCheckin) {
        // Use face check-in endpoint
        response = await kioskApi.faceCheckin({
          member_id: memberId,
          event_id: selectedEvent.id,
          church_id: churchId,
          confidence: 'high',
          source: 'kiosk_face'
        });
      } else {
        // Use regular check-in endpoint
        response = await api.post(`/events/${selectedEvent.id}/check-in`, {
          member_id: memberId,
          qr_code: qrCode,
          source: 'kiosk'
        });
        response = response.data;
      }

      if (response) {
        // Success - add to recent checkins and show success
        setLastCheckedIn({ name: memberName, time: new Date(), memberId });
        setRecentCheckins(prev => [
          { name: memberName, time: new Date() },
          ...prev.slice(0, 9)
        ]);

        // Silent photo capture for progressive learning (if face check-in)
        if (isFaceCheckin && videoRef.current) {
          silentPhotoCapture(memberId);
        }

        setConfirmingMember(null);
        setConfirmingDescriptor(null);
        setStep('success');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      const errorMessage = error.response?.data?.detail || t('errors.generic');
      setCheckinError(errorMessage);

      // Reset to scan_or_search on error
      setConfirmingMember(null);
      setConfirmingDescriptor(null);
      setStep('scan_or_search');

      // Auto-clear error after 3 seconds
      setTimeout(() => setCheckinError(''), 3000);
    } finally {
      setCheckinInProgress(false);
    }
  }, [selectedEvent, churchId, checkinInProgress, t]);

  // Silent photo capture for progressive face learning
  // Note: With DeepFace backend, we capture the photo but the backend
  // will regenerate the embedding using DeepFace instead of using browser-generated ones
  const silentPhotoCapture = async (memberId) => {
    try {
      const photoBase64 = faceRecognitionService.captureFrame(videoRef.current);
      if (photoBase64) {
        await kioskApi.saveFacePhoto(
          memberId,
          photoBase64,
          null, // Descriptor is now generated by backend DeepFace
          churchId
        );
        console.log('[EventCheckin] Silent face photo captured');
      }
    } catch (error) {
      // Silent failure - don't interrupt flow
      console.error('Silent photo capture failed:', error);
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

  // Auto-search as user types (using deferred value) - searches by name or phone
  useEffect(() => {
    const performSearch = async () => {
      if (!deferredSearch.trim() || deferredSearch.length < 3) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        // Use searchMembers which returns multiple results and supports name search
        const members = await kioskApi.searchMembers(deferredSearch, churchId);
        setSearchResults(members || []);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    performSearch();
  }, [deferredSearch, churchId]);

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
        <motion.div className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 w-full box-border" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <div className="text-center space-y-3 sm:space-y-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 lg:w-24 lg:h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
              <ClipboardCheck className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 text-blue-600" />
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold">{t('pin.title')}</h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">{t('pin.description')}</p>
          </div>

          <div className="space-y-4 sm:space-y-6 py-2">
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
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">{t('event_checkin.select_event')}</h2>
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

  // STEP: Confirming (Face Match Confirmation Modal)
  if (step === 'confirming' && confirmingMember) {
    return (
      <KioskLayout showBack={false} showHome={false}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8 lg:p-12 max-w-xl mx-auto w-full"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center space-y-4 sm:space-y-6">
            {/* Member Info */}
            <div className="flex flex-col items-center space-y-4">
              {confirmingMember.photoUrl ? (
                <img
                  src={confirmingMember.photoUrl}
                  alt={confirmingMember.memberName}
                  className="w-24 h-24 sm:w-32 sm:h-32 rounded-full object-cover border-4 border-blue-500"
                />
              ) : (
                <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full bg-blue-100 flex items-center justify-center border-4 border-blue-500">
                  <ScanFace className="w-12 h-12 sm:w-16 sm:h-16 text-blue-600" />
                </div>
              )}
              <div>
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
                  {confirmingMember.memberName}
                </h2>
                <p className="text-base sm:text-lg text-gray-600 mt-1">
                  {t('event_checkin.checking_in_to') || 'Checking in to'}: {selectedEvent?.name}
                </p>
              </div>
            </div>

            {/* Auto-confirm countdown indicator */}
            <div className="relative">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: CANCEL_COUNTDOWN_SECONDS, ease: 'linear' }}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {t('event_checkin.auto_confirm_in') || 'Auto-confirming in'} {cancelCountdown}s
              </p>
            </div>

            {/* Cancel Button */}
            <Button
              variant="outline"
              onClick={cancelFaceCheckin}
              className="w-full h-14 sm:h-16 text-lg sm:text-xl rounded-xl border-2 border-red-300 text-red-600 hover:bg-red-50"
            >
              <X className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              {t('event_checkin.not_you_cancel') || "Not you? Cancel"} ({cancelCountdown})
            </Button>

            {/* Confirm Now Button (optional - for immediate check-in) */}
            <Button
              onClick={() => confirmFaceCheckin()}
              disabled={checkinInProgress}
              className="w-full h-14 sm:h-16 text-lg sm:text-xl rounded-xl bg-green-600 hover:bg-green-700"
            >
              {checkinInProgress ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                <Check className="mr-2 h-5 w-5 sm:h-6 sm:w-6" />
              )}
              {t('event_checkin.confirm_now') || 'Confirm Now'}
            </Button>
          </div>
        </motion.div>
      </KioskLayout>
    );
  }

  // STEP: Scan or Search (Always-On Camera)
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
              className="h-12 sm:h-14 lg:h-16 px-4 sm:px-6 lg:px-8 text-sm sm:text-base lg:text-xl rounded-xl"
            >
              <ScanFace className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              {t('event_checkin.scan_face_qr') || 'Face / QR'}
            </Button>
            <Button
              variant={mode === 'search' ? 'default' : 'outline'}
              onClick={() => setMode('search')}
              className="h-12 sm:h-14 lg:h-16 px-4 sm:px-6 lg:px-8 text-sm sm:text-base lg:text-xl rounded-xl"
            >
              <Search className="mr-1 sm:mr-2 h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6" />
              {t('event_checkin.search')}
            </Button>
          </div>

          {/* Scan Mode (Always-On Camera) */}
          {mode === 'scan' && (
            <motion.div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="space-y-3 sm:space-y-4">
                {/* Camera View */}
                <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black aspect-video">
                  <video
                    ref={videoRef}
                    className="w-full h-full object-cover mirror"
                    style={{ transform: 'scaleX(-1)' }}
                    playsInline
                    muted
                  />

                  {/* Camera Overlay */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* QR scan region indicator */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-48 h-48 sm:w-64 sm:h-64 border-2 border-blue-500 rounded-2xl opacity-50" />
                    </div>

                    {/* Face status indicator */}
                    <div className="absolute top-3 left-3 right-3 flex justify-between items-center">
                      {/* Face recognition status */}
                      <div className={`px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 ${
                        faceStatus === 'matched' ? 'bg-green-500 text-white' :
                        faceStatus === 'detecting' ? 'bg-blue-500 text-white' :
                        faceStatus === 'unknown' ? 'bg-yellow-500 text-white' :
                        'bg-gray-800 bg-opacity-60 text-white'
                      }`}>
                        <ScanFace className="w-4 h-4" />
                        {faceStatus === 'matched' ? 'Face Recognized' :
                         faceStatus === 'detecting' ? 'Detecting...' :
                         faceStatus === 'unknown' ? 'Unknown Face' :
                         'Face Detection'}
                      </div>

                      {/* QR indicator */}
                      <div className="px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 bg-gray-800 bg-opacity-60 text-white">
                        <QrCode className="w-4 h-4" />
                        QR Ready
                      </div>
                    </div>
                  </div>

                  {/* Camera Error */}
                  {cameraError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80">
                      <div className="text-center text-white p-4">
                        <AlertCircle className="w-12 h-12 mx-auto mb-2 text-red-400" />
                        <p>{cameraError}</p>
                        <Button
                          onClick={startCamera}
                          className="mt-4"
                        >
                          Retry
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Face Loading */}
                  {faceLoading && (
                    <div className="absolute bottom-3 left-3 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2 bg-gray-800 bg-opacity-60 text-white">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Loading face recognition...
                    </div>
                  )}
                </div>

                {/* Instructions */}
                <div className="text-center">
                  <p className="text-sm sm:text-base lg:text-lg text-gray-600">
                    {t('event_checkin.face_qr_hint') || 'Look at the camera or show your QR code to check in'}
                  </p>
                </div>

                {/* Unrecognized Message */}
                <AnimatePresence>
                  {showUnrecognized && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 flex items-center gap-3"
                    >
                      <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0" />
                      <div>
                        <p className="font-medium text-yellow-800">
                          {t('event_checkin.face_not_recognized') || "Face not recognized"}
                        </p>
                        <p className="text-sm text-yellow-700">
                          {t('event_checkin.try_qr_or_search') || 'Try showing your QR code or use manual search'}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Search Mode */}
          {mode === 'search' && (
            <motion.div className="bg-white rounded-2xl sm:rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl space-y-4 sm:space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div className="relative">
                {(isSearchPending || isSearching) ? (
                  <Loader2 className="absolute left-4 top-1/2 transform -translate-y-1/2 text-blue-500 h-5 w-5 sm:h-6 sm:w-6 animate-spin" />
                ) : (
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 sm:h-6 sm:w-6" />
                )}
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('event_checkin.search_placeholder')}
                  className="h-12 sm:h-14 lg:h-16 text-sm sm:text-base lg:text-xl pl-12 sm:pl-14 pr-4 rounded-xl"
                  autoFocus
                />
                {searchTerm.length > 0 && searchTerm.length < 3 && (
                  <p className="text-xs sm:text-sm text-gray-500 mt-2">{t('event_checkin.min_chars') || 'Type at least 3 characters'}</p>
                )}
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
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 lg:space-y-8 text-center w-full box-border"
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
            <h2 className="text-2xl sm:text-3xl lg:text-5xl font-bold text-gray-900">{t('event_checkin.success_title')}</h2>
            <p className="text-lg sm:text-2xl lg:text-3xl text-blue-600 font-bold">{lastCheckedIn?.name}</p>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">{t('event_checkin.success_text')}</p>
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
              {t('event_checkin.check_another')}
            </Button>
          </div>
        </motion.div>
      </KioskLayout>
    );
  }

  return null;
};

export default EventCheckinKiosk;
