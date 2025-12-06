/**
 * Event Check-In Kiosk (Staff Only)
 *
 * Flow:
 * 1. PIN entry (6-digit)
 * 2. Select event
 * 3. Camera always-on with parallel QR + Face detection
 * 4. Auto check-in with 1-second animation delay
 *
 * Face Recognition Features:
 * - Uses @vladmandic/human for fast browser-based face DETECTION (knows when face is present)
 * - Sends detected face images to backend DeepFace (FaceNet512) for accurate MATCHING
 * - DeepFace provides much higher accuracy than browser-based solutions
 * - Silent photo capture for progressive learning (backend regenerates embeddings)
 * - 1-second delay with spinner before check-in (prevents accidental triggers)
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
  UserPlus,
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
import { Label } from '../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import Webcam from 'react-webcam';
import api, { publicFaceRecognitionAPI } from '../../services/api';
import kioskApi from '../../services/kioskApi';
import QrScanner from 'qr-scanner';
import { faceRecognitionService } from '../../services/faceRecognitionService';

// Constants
const CANCEL_COUNTDOWN_SECONDS = 3;
const HOLD_COUNTDOWN_SECONDS = 1; // Quick 1-second confirmation delay (was 3)
const NO_FACE_TIMEOUT_MS = 3000; // 3 seconds before showing "unrecognized" message

// CSS animation for perimeter progress
// Perimeter of 92x92 rect with rx=12: ~(92*4) - (4*12) + (2*PI*12) ≈ 368
const perimeterProgressStyle = `
@keyframes perimeterProgress {
  from {
    stroke-dashoffset: 368;
  }
  to {
    stroke-dashoffset: 0;
  }
}
`;

const EventCheckinKiosk = () => {
  const navigate = useNavigate();
  const { t } = useTranslation('kiosk');
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const faceDetectionIntervalRef = useRef(null);
  const noFaceTimeoutRef = useRef(null);
  const cancelCountdownRef = useRef(null);
  const cameraStartingRef = useRef(false);  // Prevent double starts
  const successTimeoutRef = useRef(null);   // Auto-dismiss success overlay

  // Get church context
  const { churchId } = useKioskChurch();

  const [step, setStep] = useState('pin'); // pin, select_event, checkin (unified), confirming
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState('');
  const [staff, setStaff] = useState(null);

  const [selectedEvent, setSelectedEvent] = useState(null);
  // Removed mode state - now showing camera + search side-by-side

  // React 19 deferred search - search as you type
  const { searchValue: searchTerm, setSearchValue: setSearchTerm, deferredValue: deferredSearch, isSearchPending } = useDeferredSearch();
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [checkinInProgress, setCheckinInProgress] = useState(false);
  const [lastCheckedIn, setLastCheckedIn] = useState(null);
  const [checkinError, setCheckinError] = useState('');
  const [recentCheckins, setRecentCheckins] = useState([]);
  const [successMember, setSuccessMember] = useState(null); // For success overlay (auto-dismiss)
  const [showQuickAdd, setShowQuickAdd] = useState(false); // Quick add new visitor form
  const [quickAddData, setQuickAddData] = useState({
    full_name: '',
    gender: '',
    date_of_birth: '',
    phone_whatsapp: '',
    photo_base64: null
  }); // Quick add form data
  const [quickAddLoading, setQuickAddLoading] = useState(false); // Quick add submission loading
  const [quickAddShowCamera, setQuickAddShowCamera] = useState(false); // Show camera for photo capture
  const [quickAddCountdown, setQuickAddCountdown] = useState(0); // Photo countdown
  const quickAddWebcamRef = useRef(null); // Webcam ref for quick add

  // Face recognition state
  const [faceReady, setFaceReady] = useState(false);
  const [faceLoading, setFaceLoading] = useState(false);
  const [faceError, setFaceError] = useState(null);
  const [showUnrecognized, setShowUnrecognized] = useState(false);
  const [faceStatus, setFaceStatus] = useState(''); // idle, detecting, matched, unknown, holding

  // Hold-to-confirm state (inline countdown on camera view)
  const [holdingMember, setHoldingMember] = useState(null); // Member being held for confirmation
  const [holdCountdown, setHoldCountdown] = useState(HOLD_COUNTDOWN_SECONDS);
  const holdIntervalRef = useRef(null);
  const holdingMemberIdRef = useRef(null); // Track which member we're holding for

  // Confirmation modal state (legacy - kept for QR fallback)
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

  // Start camera when entering checkin step (always-on camera with side-by-side layout)
  useEffect(() => {
    // Camera is always on in checkin step (side-by-side with search)
    const shouldHaveCamera = step === 'checkin';

    if (shouldHaveCamera) {
      startCamera();
    } else {
      // Stop camera when leaving checkin step
      stopCamera();
    }

    // Cleanup: always stop camera on unmount
    return () => {
      stopCamera();
    };
  }, [step]);  // Camera always on in checkin step

  // Start camera and detection
  const startCamera = async () => {
    // Prevent multiple simultaneous start attempts
    if (!videoRef.current || cameraStartingRef.current || cameraActive) {
      console.log('[EventCheckin] startCamera skipped:', {
        hasVideo: !!videoRef.current,
        starting: cameraStartingRef.current,
        active: cameraActive
      });
      return;
    }

    cameraStartingRef.current = true;

    try {
      // Stop any existing QR scanner first
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }

      // Stop any existing stream
      if (videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }

      // Clear any existing detection interval
      if (faceDetectionIntervalRef.current) {
        clearInterval(faceDetectionIntervalRef.current);
        faceDetectionIntervalRef.current = null;
      }

      setCameraError(null);

      // Create QR scanner - it handles getUserMedia internally
      // Use 'user' (front camera) for face recognition on kiosk devices
      qrScannerRef.current = new QrScanner(
        videoRef.current,
        result => handleQRScanned(result.data),
        {
          highlightScanRegion: false,
          highlightCodeOutline: true,
          preferredCamera: 'user',  // Front camera for face recognition
        }
      );

      // Start QR scanner and wait for camera to initialize
      await qrScannerRef.current.start();
      console.log('[EventCheckin] QR Scanner started, camera active');

      setCameraActive(true);

      // Start face detection loop after camera is ready
      startFaceDetection();

    } catch (error) {
      console.error('Camera start error:', error);
      setCameraError('Unable to access camera. Please check permissions.');
      setCameraActive(false);
    } finally {
      cameraStartingRef.current = false;
    }
  };

  // Stop camera and all detection
  const stopCamera = () => {
    // Reset starting ref to allow restart
    cameraStartingRef.current = false;

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

    // Stop hold countdown
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHoldingMember(null);
    setHoldCountdown(HOLD_COUNTDOWN_SECONDS);
    holdingMemberIdRef.current = null;

    // Stop no-face timeout
    if (noFaceTimeoutRef.current) {
      clearTimeout(noFaceTimeoutRef.current);
      noFaceTimeoutRef.current = null;
    }

    // Stop success timeout
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
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
    setSuccessMember(null);
  };

  // Start hold countdown for a matched member
  const startHoldCountdown = (member) => {
    // Clear any existing countdown
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
    }

    setHoldingMember(member);
    holdingMemberIdRef.current = member.memberId;
    setHoldCountdown(HOLD_COUNTDOWN_SECONDS);
    setFaceStatus('holding');

    console.log(`[EventCheckin] Starting hold countdown for ${member.memberName}`);

    let countdown = HOLD_COUNTDOWN_SECONDS;

    holdIntervalRef.current = setInterval(() => {
      countdown--;
      setHoldCountdown(countdown);

      if (countdown <= 0) {
        // Countdown complete - auto check-in
        clearInterval(holdIntervalRef.current);
        holdIntervalRef.current = null;
        console.log(`[EventCheckin] Hold complete - auto checking in ${member.memberName}`);
        performHoldCheckin(member);
      }
    }, 1000);
  };

  // Reset hold countdown (face left or different person)
  const resetHoldCountdown = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
    setHoldingMember(null);
    holdingMemberIdRef.current = null;
    setHoldCountdown(HOLD_COUNTDOWN_SECONDS);
  };

  // Perform check-in after hold countdown completes
  const performHoldCheckin = async (member) => {
    // Pause face detection during check-in
    if (faceDetectionIntervalRef.current) {
      clearInterval(faceDetectionIntervalRef.current);
      faceDetectionIntervalRef.current = null;
    }

    // Perform the actual check-in
    await performCheckin(
      member.memberId,
      member.memberName,
      null, // no QR code
      null, // no descriptor needed for backend matching
      true  // is face check-in
    );

    // Reset hold state
    resetHoldCountdown();
  };

  // Start face detection loop (parallel with QR)
  // Uses browser-based detection for speed, then sends to backend DeepFace for accurate matching
  // Flow: Match → 1-second delay with spinner → auto check-in
  //
  // Optimizations for crowd/movement tolerance:
  // - Extended grace period for brief detection gaps (movement, blinking, slight head turns)
  // - Sticky match caching - skip backend calls if same person already matched
  // - Faster detection interval (150ms = ~6.7 FPS)
  const startFaceDetection = () => {
    if (!faceReady || faceDetectionIntervalRef.current) return;

    let consecutiveNoFace = 0;
    let consecutiveMissedMatch = 0; // Grace period counter for holding state
    const NO_FACE_THRESHOLD = 20; // ~3 seconds at 6.7 FPS
    const GRACE_PERIOD_FRAMES = 8; // Allow 8 missed matches before resetting (~1.2 seconds) - tolerant of movement
    let isMatchingInProgress = false; // Prevent overlapping backend calls

    // Sticky match caching - skip redundant backend calls
    let lastMatchedMemberId = null;
    let lastMatchTime = 0;
    let consecutiveMatchConfirmations = 0;
    const MATCH_CACHE_DURATION_MS = 1500; // Trust cached match for 1.5 seconds
    const CONFIRMATIONS_NEEDED = 2; // Need 2 matches before considering it "confirmed"

    faceDetectionIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || step === 'confirming' || checkinInProgress || successMember) return;

      // Skip if a backend call is already in progress
      if (isMatchingInProgress) return;

      try {
        // Use browser-based detection to know if a face is present (fast)
        const detection = await faceRecognitionService.detectFace(videoRef.current);

        if (detection && !detection.filteredOut) {
          consecutiveNoFace = 0;
          setShowUnrecognized(false);

          // Clear no-face timeout
          if (noFaceTimeoutRef.current) {
            clearTimeout(noFaceTimeoutRef.current);
            noFaceTimeoutRef.current = null;
          }

          // Sticky match optimization: if we already matched someone recently and
          // they're still in holding state, skip backend call (trust the match)
          const now = Date.now();
          if (holdingMemberIdRef.current && lastMatchedMemberId === holdingMemberIdRef.current) {
            if ((now - lastMatchTime) < MATCH_CACHE_DURATION_MS) {
              // Same person still in frame, cache is fresh - skip backend call
              consecutiveMissedMatch = 0; // Reset grace period
              return;
            }
            // Cache expired, need to re-verify
          }

          // Face detected - now send to backend DeepFace for accurate matching
          isMatchingInProgress = true;

          // Only update status if not currently holding (to avoid flickering)
          if (!holdingMemberIdRef.current) {
            setFaceStatus('detecting');
          }

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
              // Reset grace period counter on successful match
              consecutiveMissedMatch = 0;

              const matchedMemberId = matchResult.member_id;

              // Update sticky cache
              lastMatchedMemberId = matchedMemberId;
              lastMatchTime = now;

              // Track consecutive confirmations for same person
              if (holdingMemberIdRef.current === matchedMemberId) {
                consecutiveMatchConfirmations++;
              } else {
                consecutiveMatchConfirmations = 1;
              }

              console.log(`[EventCheckin] DeepFace match: ${matchResult.member_name} (distance: ${matchResult.distance?.toFixed(4)}, confirmations: ${consecutiveMatchConfirmations})`);

              // Check if this is the same person we're already holding for
              if (holdingMemberIdRef.current === matchedMemberId) {
                // Same person - countdown continues (do nothing, let interval run)
              } else if (holdingMemberIdRef.current) {
                // Different person - reset and start new countdown
                console.log(`[EventCheckin] Different member detected, resetting countdown`);
                resetHoldCountdown();

                const member = {
                  memberId: matchResult.member_id,
                  memberName: matchResult.member_name,
                  photoUrl: matchResult.photo_url,
                };
                startHoldCountdown(member);
              } else {
                // Not holding anyone yet - start countdown for this person
                const member = {
                  memberId: matchResult.member_id,
                  memberName: matchResult.member_name,
                  photoUrl: matchResult.photo_url,
                };
                startHoldCountdown(member);
              }
            } else {
              // No match found
              if (holdingMemberIdRef.current) {
                // Grace period: allow missed matches before resetting (movement tolerance)
                consecutiveMissedMatch++;

                if (consecutiveMissedMatch >= GRACE_PERIOD_FRAMES) {
                  console.log(`[EventCheckin] Grace period exceeded (${consecutiveMissedMatch} misses), resetting`);
                  resetHoldCountdown();
                  lastMatchedMemberId = null;
                  consecutiveMissedMatch = 0;
                  consecutiveMatchConfirmations = 0;
                }
                // Don't update status while in grace period - keeps UI stable
              } else {
                setFaceStatus('unknown');
              }
            }
          } catch (backendError) {
            console.error('Backend face matching error:', backendError);
            // On error during holding, use grace period too
            if (holdingMemberIdRef.current) {
              consecutiveMissedMatch++;
              if (consecutiveMissedMatch >= GRACE_PERIOD_FRAMES) {
                resetHoldCountdown();
                lastMatchedMemberId = null;
                consecutiveMissedMatch = 0;
              }
            }
            // Don't change status on transient errors
          } finally {
            isMatchingInProgress = false;
          }
        } else {
          // No face detected at all (or filtered out - off-center/too small)
          consecutiveNoFace++;

          // If we were holding someone, use grace period before resetting
          if (holdingMemberIdRef.current) {
            consecutiveMissedMatch++;

            if (consecutiveMissedMatch >= GRACE_PERIOD_FRAMES) {
              console.log(`[EventCheckin] No face detected, grace period exceeded, resetting`);
              resetHoldCountdown();
              lastMatchedMemberId = null;
              consecutiveMissedMatch = 0;
              consecutiveMatchConfirmations = 0;
            }
            // Keep UI stable during grace period
          } else {
            setFaceStatus('detecting');
          }

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
    }, 150); // ~6.7 FPS for faster detection response
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

    // Reset camera state so useEffect can restart it
    setCameraActive(false);
    setStep('checkin');
    // useEffect will handle restarting camera when step changes
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

      // Always use kiosk face-checkin endpoint (it's public and handles all check-in types)
      // The source param indicates how the check-in was done
      const source = isFaceCheckin ? 'kiosk_face' : (qrCode ? 'kiosk_qr' : 'kiosk_manual');
      response = await kioskApi.faceCheckin({
        member_id: memberId,
        event_id: selectedEvent.id,
        church_id: churchId,
        confidence: isFaceCheckin ? 'high' : 'manual',
        source: source
      });

      if (response) {
        const isAlreadyCheckedIn = response.already_checked_in === true;

        setLastCheckedIn({ name: memberName, time: new Date(), memberId });

        // Only add to recent checkins if NOT already checked in
        // Also prevent duplicates in the list
        if (!isAlreadyCheckedIn) {
          setRecentCheckins(prev => {
            // Check if this member is already in recent checkins
            const alreadyInList = prev.some(item => item.memberId === memberId);
            if (alreadyInList) {
              return prev; // Don't add duplicate
            }
            return [
              { name: memberName, time: new Date(), memberId },
              ...prev.slice(0, 9)
            ];
          });

          // Silent photo capture for progressive learning (if face check-in and new check-in)
          if (isFaceCheckin && videoRef.current) {
            silentPhotoCapture(memberId);
          }
        }

        setConfirmingMember(null);
        setConfirmingDescriptor(null);

        // Only clear search field for NEW check-ins (not for "already checked in")
        // This prevents interrupting staff who are searching for others while being detected
        if (!isAlreadyCheckedIn) {
          setSearchTerm('');
          setSearchResults([]);
        }

        // Show success overlay with alreadyCheckedIn flag for different styling
        setSuccessMember({ name: memberName, memberId, alreadyCheckedIn: isAlreadyCheckedIn });

        // Clear any existing timeout
        if (successTimeoutRef.current) {
          clearTimeout(successTimeoutRef.current);
        }

        // Auto-dismiss success overlay after 3 seconds (2 seconds for already checked in)
        const dismissTime = isAlreadyCheckedIn ? 2000 : 3000;
        successTimeoutRef.current = setTimeout(() => {
          setSuccessMember(null);
          successTimeoutRef.current = null;
          // Restart face detection after success
          if (step === 'checkin' && faceReady) {
            startFaceDetection();
          }
        }, dismissTime);

        // Stay on checkin step - keep camera running
        setStep('checkin');
      }
    } catch (error) {
      console.error('Check-in error:', error);
      // Extract error message - handle Pydantic validation errors (array of {type, loc, msg, input, url})
      let errorMessage = t('errors.generic');
      const detail = error.response?.data?.detail;
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail) && detail.length > 0) {
        // Pydantic validation error format
        errorMessage = detail[0].msg || detail[0].message || t('errors.generic');
      }
      setCheckinError(errorMessage);

      // Reset to checkin on error
      setConfirmingMember(null);
      setConfirmingDescriptor(null);
      setStep('checkin');

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

  // Handle quick add new visitor
  const handleQuickAddSubmit = async (e) => {
    e.preventDefault();
    if (!quickAddData.full_name.trim() || !quickAddData.gender) return;

    setQuickAddLoading(true);
    try {
      // Create new pre-visitor using public kiosk API
      const result = await kioskApi.createPreVisitor({
        full_name: quickAddData.full_name.trim(),
        gender: quickAddData.gender,
        date_of_birth: quickAddData.date_of_birth || null,
        phone_whatsapp: quickAddData.phone_whatsapp || null,
        photo_base64: quickAddData.photo_base64 || null,
        church_id: churchId,
        status: 'Pre-Visitor' // Kiosk visitors are pre-visitors
      });

      if (result?.member) {
        // Auto check-in the new visitor
        await performCheckin(result.member.id, result.member.full_name);

        // Reset form and close modal
        resetQuickAddForm();
      }
    } catch (error) {
      console.error('Quick add error:', error);
      setCheckinError(error.response?.data?.detail || t('errors.generic'));
      setTimeout(() => setCheckinError(''), 3000);
    } finally {
      setQuickAddLoading(false);
    }
  };

  // Reset quick add form
  const resetQuickAddForm = () => {
    setQuickAddData({
      full_name: '',
      gender: '',
      date_of_birth: '',
      phone_whatsapp: '',
      photo_base64: null
    });
    setQuickAddShowCamera(false);
    setQuickAddCountdown(0);
    setShowQuickAdd(false);
  };

  // Capture photo for quick add (with 3s countdown)
  const captureQuickAddPhoto = () => {
    setQuickAddCountdown(3);

    const countdownInterval = setInterval(() => {
      setQuickAddCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          // Capture photo
          if (quickAddWebcamRef.current) {
            const imageSrc = quickAddWebcamRef.current.getScreenshot();
            // Un-mirror the front camera photo
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              ctx.translate(canvas.width, 0);
              ctx.scale(-1, 1);
              ctx.drawImage(img, 0, 0);
              const unMirroredImage = canvas.toDataURL('image/jpeg');
              setQuickAddData(prev => ({ ...prev, photo_base64: unMirroredImage }));
            };
            img.src = imageSrc;
          }
          setQuickAddShowCamera(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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
                    setStep('checkin');
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

  // STEP: Check-in (Side-by-Side Camera + Search)
  if (step === 'checkin') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('select_event')}>
        {/* Inject perimeter progress animation CSS */}
        <style>{perimeterProgressStyle}</style>

        {/* Success Overlay - Full-screen for NEW check-in, small toast for already checked in */}
        <AnimatePresence>
          {successMember && !successMember.alreadyCheckedIn && (
            <motion.div
              className="fixed inset-0 flex flex-col items-center justify-center z-50 bg-green-600 cursor-pointer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              onClick={() => setSuccessMember(null)}
            >
              {/* Success icon */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
                className="w-24 h-24 sm:w-32 sm:h-32 bg-white rounded-full flex items-center justify-center mb-6"
              >
                <Check className="w-14 h-14 sm:w-20 sm:h-20 text-green-600" />
              </motion.div>
              {/* Member name */}
              <h3 className="text-3xl sm:text-5xl font-bold text-white mb-3">
                {successMember.name}
              </h3>
              <p className="text-xl sm:text-2xl text-green-100">
                {t('event_checkin.checked_in') || 'Checked in!'}
              </p>
              {/* Auto-dismiss indicator */}
              <div className="mt-8 w-64 rounded-full h-2 overflow-hidden bg-green-700">
                <motion.div
                  className="h-full bg-white"
                  initial={{ width: '100%' }}
                  animate={{ width: '0%' }}
                  transition={{ duration: 3, ease: 'linear' }}
                />
              </div>
              {/* Tap to close hint */}
              <p className="mt-6 text-green-200 text-sm sm:text-base">
                {t('event_checkin.tap_to_close') || 'Tap anywhere to close'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Small Toast for Already Checked In - Non-blocking but tappable */}
        <AnimatePresence>
          {successMember && successMember.alreadyCheckedIn && (
            <motion.div
              className="fixed top-4 left-4 right-4 z-50 flex justify-center"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -50 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="bg-blue-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3 max-w-md cursor-pointer hover:bg-blue-700 transition-colors"
                onClick={() => setSuccessMember(null)}
              >
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center flex-shrink-0">
                  <Check className="w-6 h-6 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg truncate">{successMember.name}</p>
                  <p className="text-blue-100 text-sm">
                    {t('event_checkin.already_checked_in') || 'Already checked in'}
                  </p>
                </div>
                {/* Progress bar + X icon */}
                <div className="flex items-center gap-2">
                  <div className="w-12 h-1.5 rounded-full overflow-hidden bg-blue-700">
                    <motion.div
                      className="h-full bg-white"
                      initial={{ width: '100%' }}
                      animate={{ width: '0%' }}
                      transition={{ duration: 2, ease: 'linear' }}
                    />
                  </div>
                  <X className="w-5 h-5 text-blue-200" />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Quick Add New Visitor Modal - Tablet-First Horizontal Layout */}
        <AnimatePresence>
          {showQuickAdd && (
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-2 sm:p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
              >
                {/* Header */}
                <div className="p-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white z-10">
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      {t('event_checkin.new_visitor') || 'New Visitor'}
                    </h2>
                    <p className="text-sm text-gray-600">
                      Quick add & check-in
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={resetQuickAddForm}>
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {/* Form - Horizontal Layout on Tablet */}
                <form onSubmit={handleQuickAddSubmit} className="p-4">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* LEFT: Photo Capture - Fixed width on tablet */}
                    <div className="md:w-56 flex-shrink-0">
                      <Label className="text-sm font-medium mb-2 block">
                        {t('new_profile.photo_label') || 'Photo'}
                      </Label>
                      {!quickAddShowCamera && !quickAddData.photo_base64 && (
                        <div
                          onClick={() => setQuickAddShowCamera(true)}
                          className="w-full md:w-52 h-52 border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                        >
                          <CameraIcon className="h-12 w-12 text-gray-400 mb-2" />
                          <span className="text-sm text-gray-500 text-center px-2">
                            {t('new_profile.photo_take') || 'Take Photo'}
                          </span>
                        </div>
                      )}
                      {quickAddShowCamera && (
                        <div className="space-y-2">
                          <div className="relative rounded-xl overflow-hidden w-full md:w-52 h-52">
                            <Webcam
                              ref={quickAddWebcamRef}
                              screenshotFormat="image/jpeg"
                              className="w-full h-full object-cover rounded-xl"
                              videoConstraints={{ facingMode: 'user', width: 320, height: 320 }}
                              style={{ transform: 'scaleX(-1)' }}
                            />
                            {quickAddCountdown > 0 && (
                              <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
                                <div className="text-5xl font-bold text-white">{quickAddCountdown}</div>
                              </div>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => { setQuickAddShowCamera(false); setQuickAddCountdown(0); }}
                              className="flex-1"
                              disabled={quickAddCountdown > 0}
                            >
                              {t('button.cancel') || 'Cancel'}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              onClick={captureQuickAddPhoto}
                              className="flex-1"
                              disabled={quickAddCountdown > 0}
                            >
                              {quickAddCountdown > 0 ? '...' : t('button.capture') || 'Capture'}
                            </Button>
                          </div>
                        </div>
                      )}
                      {quickAddData.photo_base64 && (
                        <div className="space-y-2">
                          <img
                            src={quickAddData.photo_base64}
                            alt="Preview"
                            className="w-full md:w-52 h-52 rounded-xl object-cover border-4 border-blue-200"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setQuickAddShowCamera(true)}
                            className="w-full"
                          >
                            {t('new_profile.photo_change') || 'Retake'}
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* RIGHT: Form Fields - 2 columns on tablet */}
                    <div className="flex-1 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Full Name - full width */}
                        <div className="md:col-span-2">
                          <Label htmlFor="visitor_name" className="text-sm font-medium">
                            {t('new_profile.name_label') || 'Full Name'} *
                          </Label>
                          <Input
                            id="visitor_name"
                            value={quickAddData.full_name}
                            onChange={(e) => setQuickAddData({ ...quickAddData, full_name: e.target.value })}
                            placeholder="Enter visitor name"
                            className="h-11 mt-1"
                            autoFocus
                            required
                          />
                        </div>

                        {/* Gender */}
                        <div>
                          <Label className="text-sm font-medium">
                            {t('new_profile.gender_label') || 'Gender'} *
                          </Label>
                          <Select
                            value={quickAddData.gender}
                            onValueChange={(value) => setQuickAddData({ ...quickAddData, gender: value })}
                          >
                            <SelectTrigger className="h-11 mt-1">
                              <SelectValue placeholder="Select gender" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Male">{t('new_profile.gender_male') || 'Male'}</SelectItem>
                              <SelectItem value="Female">{t('new_profile.gender_female') || 'Female'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Date of Birth */}
                        <div>
                          <Label htmlFor="visitor_dob" className="text-sm font-medium">
                            {t('new_profile.birthdate_label') || 'Date of Birth'}
                          </Label>
                          <Input
                            id="visitor_dob"
                            type="date"
                            value={quickAddData.date_of_birth}
                            onChange={(e) => setQuickAddData({ ...quickAddData, date_of_birth: e.target.value })}
                            className="h-11 mt-1"
                          />
                        </div>

                        {/* Phone Number - full width */}
                        <div className="md:col-span-2">
                          <Label htmlFor="visitor_phone" className="text-sm font-medium">
                            {t('phone.label') || 'Phone Number'}
                          </Label>
                          <Input
                            id="visitor_phone"
                            value={quickAddData.phone_whatsapp}
                            onChange={(e) => setQuickAddData({ ...quickAddData, phone_whatsapp: e.target.value })}
                            placeholder="08xxxxxxxxxx"
                            className="h-11 mt-1"
                          />
                        </div>
                      </div>

                      {/* Buttons */}
                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={resetQuickAddForm}
                          className="flex-1 h-11"
                        >
                          {t('button.cancel') || 'Cancel'}
                        </Button>
                        <Button
                          type="submit"
                          disabled={quickAddLoading || !quickAddData.full_name.trim() || !quickAddData.gender}
                          className="flex-1 h-11 bg-green-600 hover:bg-green-700"
                        >
                          {quickAddLoading ? (
                            <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          ) : (
                            <UserPlus className="w-5 h-5 mr-2" />
                          )}
                          {quickAddLoading ? 'Adding...' : 'Add & Check In'}
                        </Button>
                      </div>
                    </div>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="space-y-3 sm:space-y-4 w-full max-w-full overflow-x-hidden">
          {/* Header */}
          <div className="text-center px-2">
            <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1">Check-In: {selectedEvent?.name}</h2>
            {checkinError && (
              <motion.p
                className="text-sm sm:text-base text-red-600 mt-1"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              >
                {checkinError}
              </motion.p>
            )}
          </div>

          {/* Side-by-Side Layout: Camera (left) + Search (right) */}
          <div className="flex flex-col lg:flex-row lg:items-stretch gap-3 sm:gap-4">
            {/* LEFT: Camera View (Face + QR) */}
            <div className="lg:w-3/5 bg-white rounded-2xl p-3 sm:p-4 shadow-xl">
              <div className="flex items-center gap-2 mb-2">
                <ScanFace className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-800">{t('event_checkin.scan_face_qr') || 'Face / QR'}</span>
              </div>

              {/* Camera View - mirrored for natural selfie experience */}
              <div className="relative rounded-xl overflow-hidden bg-black aspect-video" style={{ transform: 'scaleX(-1)' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                />

                {/* Camera Overlay - also mirrored back so text is readable */}
                <div className="absolute inset-0 pointer-events-none" style={{ transform: 'scaleX(-1)' }}>
                  {/* Capture zone - rounded SQUARE for face AND QR code scanning */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    {/* Dark overlay outside capture zone */}
                    <div className="absolute inset-0 bg-black bg-opacity-50" />

                    {/* Capture zone frame - SQUARE based on 70% of height */}
                    <div
                      className="relative z-10 flex flex-col items-center aspect-square"
                      style={{ height: '70%' }}
                    >
                      {/* Rounded square frame with perimeter progress animation */}
                      <div className="relative w-full h-full">
                        {/* SVG for animated border - THICK 8px stroke */}
                        <svg
                          className="absolute inset-0 w-full h-full"
                          viewBox="0 0 100 100"
                          preserveAspectRatio="xMidYMid meet"
                        >
                          {/* Background border (always visible, dimmer) - 8px thick */}
                          <rect
                            x="4"
                            y="4"
                            width="92"
                            height="92"
                            rx="12"
                            ry="12"
                            fill="transparent"
                            stroke={holdingMember ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.8)"}
                            strokeWidth="8"
                          />

                          {/* Animated progress border (visible during hold countdown) - 8px thick */}
                          {holdingMember && (
                            <rect
                              x="4"
                              y="4"
                              width="92"
                              height="92"
                              rx="12"
                              ry="12"
                              fill="transparent"
                              stroke="#22c55e"
                              strokeWidth="8"
                              strokeDasharray="368"
                              strokeDashoffset="368"
                              strokeLinecap="round"
                              style={{
                                animation: `perimeterProgress ${HOLD_COUNTDOWN_SECONDS}s linear forwards`,
                              }}
                            />
                          )}
                        </svg>

                        {/* Inner content - transparent cutout */}
                        <div
                          className="absolute"
                          style={{
                            top: '8%',
                            left: '8%',
                            right: '8%',
                            bottom: '8%',
                            borderRadius: '10%',
                            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
                            background: 'transparent'
                          }}
                        />
                      </div>

                      {/* Instruction text */}
                      <p className="absolute -bottom-10 left-1/2 transform -translate-x-1/2 text-white text-xs sm:text-sm font-medium bg-black bg-opacity-70 px-3 py-1.5 rounded-full whitespace-nowrap">
                        {holdingMember
                          ? (t('event_checkin.hold_still') || 'Hold still...')
                          : (t('event_checkin.position_face') || 'Position face or QR here')}
                      </p>
                    </div>
                  </div>

                  {/* Hold-to-confirm overlay - shows member info in center when face matched */}
                  {holdingMember && (
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center z-10"
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2 }}
                    >
                      {/* Member card - floating in center */}
                      <div className="bg-black bg-opacity-80 backdrop-blur-sm rounded-2xl p-4 text-center shadow-2xl border border-green-500/50">
                        {/* Member photo */}
                        {holdingMember.photoUrl ? (
                          <img
                            src={holdingMember.photoUrl}
                            alt={holdingMember.memberName}
                            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border-2 border-green-500 mx-auto mb-2"
                          />
                        ) : (
                          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-500 mx-auto mb-2">
                            <UserCheck className="w-7 h-7 sm:w-8 sm:h-8 text-green-400" />
                          </div>
                        )}
                        {/* Member name */}
                        <h3 className="text-base sm:text-lg font-bold text-white mb-1">
                          {holdingMember.memberName}
                        </h3>
                        {/* Status message */}
                        <p className="text-xs sm:text-sm text-green-400 font-medium">
                          {t('event_checkin.checking_in') || 'Checking in...'}
                        </p>
                      </div>
                    </motion.div>
                  )}

                  {/* Face status indicator */}
                  <div className="absolute top-2 left-2 right-2 flex justify-between items-center">
                    {/* Face recognition status */}
                    <div className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 ${
                      faceStatus === 'holding' ? 'bg-green-500 text-white' :
                      faceStatus === 'matched' ? 'bg-green-500 text-white' :
                      faceStatus === 'detecting' ? 'bg-blue-500 text-white' :
                      faceStatus === 'unknown' ? 'bg-yellow-500 text-white' :
                      'bg-gray-800 bg-opacity-60 text-white'
                    }`}>
                      <ScanFace className="w-3 h-3" />
                      {faceStatus === 'holding' ? 'Checking in...' :
                       faceStatus === 'matched' ? 'Recognized' :
                       faceStatus === 'detecting' ? 'Detecting...' :
                       faceStatus === 'unknown' ? 'Unknown' :
                       'Ready'}
                    </div>

                    {/* QR indicator */}
                    <div className="px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 bg-gray-800 bg-opacity-60 text-white">
                      <QrCode className="w-3 h-3" />
                      QR
                    </div>
                  </div>
                </div>

                {/* Camera Error */}
                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-80 rounded-xl">
                    <div className="text-center text-white p-4">
                      <AlertCircle className="w-10 h-10 mx-auto mb-2 text-red-400" />
                      <p className="text-sm">{cameraError}</p>
                      <Button
                        onClick={startCamera}
                        className="mt-3"
                        size="sm"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                )}

                {/* Face Loading */}
                {faceLoading && (
                  <div className="absolute bottom-2 left-2 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1.5 bg-gray-800 bg-opacity-60 text-white">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading...
                  </div>
                )}
              </div>

              {/* Unrecognized Message */}
              <AnimatePresence>
                {showUnrecognized && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-2 bg-yellow-50 border border-yellow-200 rounded-lg p-2 flex items-center gap-2"
                  >
                    <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
                    <p className="text-xs sm:text-sm text-yellow-800">
                      {t('event_checkin.face_not_recognized') || "Face not recognized"} - use search
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* RIGHT: Manual Search */}
            <div className="lg:w-2/5 bg-white rounded-2xl p-3 sm:p-4 shadow-xl flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Search className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold text-gray-800">{t('event_checkin.search') || 'Manual Search'}</span>
                </div>
                {/* New Visitor Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowQuickAdd(true)}
                  className="h-8 px-3 text-xs rounded-lg border-green-300 text-green-700 hover:bg-green-50"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  {t('event_checkin.new_visitor') || 'New Visitor'}
                </Button>
              </div>

              {/* Search Input */}
              <div className="relative mb-3">
                {(isSearchPending || isSearching) ? (
                  <Loader2 className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-500 h-4 w-4 animate-spin" />
                ) : (
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                )}
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={t('event_checkin.search_placeholder') || 'Name or phone...'}
                  className="h-10 sm:h-12 text-sm pl-10 pr-3 rounded-lg"
                />
              </div>

              {/* Search hint */}
              {searchTerm.length > 0 && searchTerm.length < 3 && (
                <p className="text-xs text-gray-500 mb-2">{t('event_checkin.min_chars') || 'Type at least 3 characters'}</p>
              )}

              {/* Search Results - scrollable, uses remaining space */}
              <div className="flex-1 overflow-y-auto space-y-2" style={{ maxHeight: 'calc(100vh - 380px)', minHeight: '200px' }}>
                {searchResults.length > 0 ? (
                  searchResults.map(member => (
                    <button
                      key={member.id}
                      onClick={() => handleMemberCheckin(member)}
                      disabled={checkinInProgress}
                      className="w-full bg-blue-50 rounded-lg p-2.5 sm:p-3 flex items-center gap-2 hover:bg-blue-100 transition-all disabled:opacity-50"
                    >
                      <MemberAvatar member={member} size="sm" />
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-sm sm:text-base font-semibold truncate">{member.full_name}</p>
                        <p className="text-xs sm:text-sm text-gray-600 truncate">{member.phone_whatsapp}</p>
                      </div>
                      {checkinInProgress ? (
                        <Loader2 className="w-5 h-5 text-green-600 animate-spin flex-shrink-0" />
                      ) : (
                        <UserCheck className="w-5 h-5 text-green-600 flex-shrink-0" />
                      )}
                    </button>
                  ))
                ) : searchTerm.length >= 3 && !isSearching ? (
                  <p className="text-center text-gray-500 text-sm py-4">
                    {t('event_checkin.no_results') || 'No members found'}
                  </p>
                ) : (
                  <p className="text-center text-gray-400 text-xs py-4">
                    Search by name or phone number
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Recent Check-ins */}
          {recentCheckins.length > 0 && (
            <div className="bg-white rounded-xl p-2.5 sm:p-3 shadow">
              <p className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Recent ({recentCheckins.length})</p>
              <div className="flex gap-1.5 overflow-x-auto">
                {recentCheckins.slice(0, 8).map((item, idx) => (
                  <div key={idx} className="flex-shrink-0 bg-green-50 rounded-md px-2 py-1 border border-green-200">
                    <p className="text-[10px] sm:text-xs font-medium text-green-900 truncate max-w-[70px] sm:max-w-[100px]">
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

  return null;
};

export default EventCheckinKiosk;
