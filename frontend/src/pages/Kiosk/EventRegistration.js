/**
 * Event Registration Kiosk Page - Group Registration
 *
 * Flow:
 * 1. Phone + OTP verification
 * 2. Select event
 * 3. Build attendee list (self + companions)
 * 4. Confirm all attendees
 * 5. Success with ticket carousel
 *
 * Features:
 * - Register self and/or companions
 * - Session storage persistence for network resilience
 * - WhatsApp ticket sending
 * - QR code tickets
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Check, AlertCircle, Loader2, RefreshCw, MapPin, Clock } from 'lucide-react';
import { motion } from 'framer-motion';
import KioskLayout from '../../components/Kiosk/KioskLayout';
import PhoneStep from '../../components/Kiosk/PhoneStep';
import ExistingMemberOTP from '../../components/Kiosk/ExistingMemberOTP';
import NewMemberRegistration from '../../components/Kiosk/NewMemberRegistration';
import AttendeeBuilder from '../../components/Kiosk/AttendeeBuilder';
import AddCompanionModal from '../../components/Kiosk/AddCompanionModal';
import TicketCarousel from '../../components/Kiosk/TicketCarousel';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { useKioskEvents, useRegisterGroup, useKioskChurch } from '../../hooks/useKiosk';
import { format, parseISO } from 'date-fns';

const EventRegistrationKiosk = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation('kiosk');

  // Get church context
  const { churchId: storedChurchId } = useKioskChurch();
  const churchId = location.state?.churchId || storedChurchId;

  // Step state
  // Steps: phone, otp_existing, otp_new, select_event, build_list, confirm, success
  const [step, setStep] = useState('phone');
  const [phone, setPhone] = useState('');
  const [member, setMember] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);

  // Group registration state
  const [attendees, setAttendees] = useState([]);
  const [includeSelf, setIncludeSelf] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [registrationResult, setRegistrationResult] = useState(null);
  const [registrationError, setRegistrationError] = useState(null);

  // Fetch events using TanStack Query
  const {
    data: events = [],
    isLoading: eventsLoading,
    isError: eventsError
  } = useKioskEvents(churchId, {
    forRegistration: true,
    enabled: step === 'select_event' && !!churchId,
  });

  // Group registration mutation
  const registerGroupMutation = useRegisterGroup();

  // Storage key for persistence
  const getStorageKey = useCallback(() => {
    return selectedEvent ? `kiosk_group_registration_${selectedEvent.id}` : null;
  }, [selectedEvent]);

  // Clear session storage on successful registration
  const clearStorage = useCallback(() => {
    const key = getStorageKey();
    if (key) {
      sessionStorage.removeItem(key);
    }
  }, [getStorageKey]);

  // Get existing RSVP member IDs for selected event
  const eventRsvpIds = selectedEvent?.rsvp_list?.map(r => r.member_id) || [];

  // Phone step handlers
  const handleMemberFound = (foundMember, foundPhone, expiresIn) => {
    setMember(foundMember);
    setPhone(foundPhone);
    setOtpExpiresIn(expiresIn || 300);
    setStep('otp_existing');
  };

  const handleMemberNotFound = (foundPhone, expiresIn) => {
    setPhone(foundPhone);
    setOtpExpiresIn(expiresIn || 300);
    setStep('otp_new');
  };

  const handleOtpVerified = (verifiedMember) => {
    setMember(verifiedMember);
    setStep('select_event');
  };

  // Event selection handler
  const handleEventSelect = (event) => {
    setSelectedEvent(event);
    setStep('build_list');
  };

  // Add companion handler
  const handleAddCompanion = (companion) => {
    setAttendees(prev => [...prev, companion]);
    setShowAddModal(false);
  };

  // Group registration handler
  const handleConfirmRegistration = async () => {
    if (!selectedEvent || !member) return;

    // Check we have at least one attendee
    const totalAttendees = (includeSelf ? 1 : 0) + attendees.filter(a => !a.isPrimary).length;
    if (totalAttendees === 0) {
      setRegistrationError(t('group_registration.no_attendees_warning', 'Please add at least one attendee'));
      return;
    }

    setRegistrationError(null);

    // Build companions list
    const companions = attendees
      .filter(a => !a.isPrimary)
      .map(a => ({
        type: a.type,
        member_id: a.type === 'existing' ? a.member_id : undefined,
        full_name: a.type === 'new' ? a.full_name : undefined,
        phone: a.type === 'new' ? a.phone : undefined,
        gender: a.type === 'new' ? a.gender : undefined,
        date_of_birth: a.type === 'new' ? a.date_of_birth : undefined,
      }));

    try {
      const result = await registerGroupMutation.mutateAsync({
        event_id: selectedEvent.id,
        church_id: churchId,
        primary_member_id: member.id,
        include_self: includeSelf,
        companions: companions
      });

      setRegistrationResult(result);
      clearStorage();
      setStep('success');
    } catch (error) {
      console.error('Group registration error:', error);
      setRegistrationError(
        error.response?.data?.detail ||
        t('errors.generic', 'Registration failed. Please try again.')
      );
    }
  };

  // Retry registration
  const handleRetry = () => {
    setRegistrationError(null);
    handleConfirmRegistration();
  };

  const handleBackToStart = () => {
    clearStorage();
    navigate('/kiosk/home');
  };

  // STEP: Phone Number
  if (step === 'phone') {
    return (
      <KioskLayout showBack showHome>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <motion.div
            className="text-center px-2"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('event_registration.title')}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('phone.title')}
            </p>
          </motion.div>

          <PhoneStep
            churchId={churchId}
            onMemberFound={handleMemberFound}
            onMemberNotFound={handleMemberNotFound}
          />
        </div>
      </KioskLayout>
    );
  }

  // STEP: New Member Registration (otp_new)
  if (step === 'otp_new') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2">
              {t('new_profile.title')}
            </h1>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('new_profile.description')}
            </p>
          </div>

          <NewMemberRegistration
            phone={phone}
            initialExpiresIn={otpExpiresIn}
            onComplete={(newMember) => {
              setMember(newMember);
              setStep('select_event');
            }}
            onError={(error) => {
              // Error handled in component
            }}
          />
        </div>
      </KioskLayout>
    );
  }

  // STEP: Existing Member OTP
  if (step === 'otp_existing') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <ExistingMemberOTP
          member={member}
          phone={phone}
          initialExpiresIn={otpExpiresIn}
          onVerified={handleOtpVerified}
          subtitle={t('existing_profile.description')}
        />
      </KioskLayout>
    );
  }

  // STEP: Select Event
  if (step === 'select_event') {
    return (
      <KioskLayout showBack showHome onBack={() => setStep('phone')}>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <div className="text-center px-2">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('event_registration.step_select_event')}
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('event_registration.select_event')}
            </p>
          </div>

          {eventsLoading ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8 lg:p-12 text-center">
              <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-blue-500" />
              <div className="text-lg sm:text-xl lg:text-2xl text-gray-600">
                {t('common.loading', 'Loading...')}
              </div>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white rounded-2xl sm:rounded-3xl shadow-lg p-6 sm:p-8 lg:p-12 text-center">
              <Calendar className="w-12 h-12 sm:w-16 sm:h-16 lg:w-20 lg:h-20 mx-auto mb-3 sm:mb-4 text-gray-300" />
              <p className="text-lg sm:text-xl lg:text-2xl text-gray-600">
                {t('event_registration.no_events')}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {events.map((event, index) => (
                <motion.button
                  key={event.id}
                  onClick={() => handleEventSelect(event)}
                  className="bg-white rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all text-left overflow-hidden"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  {/* Event Cover Image */}
                  {event.cover_image && (
                    <div className="w-full h-32 sm:h-40 lg:h-48 bg-gray-100">
                      <img
                        src={event.cover_image}
                        alt={event.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="p-4 sm:p-5 lg:p-6">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                      {event.name}
                    </h3>
                    <div className="text-sm sm:text-base lg:text-lg text-gray-600 space-y-1">
                      <p className="flex items-center gap-2">
                        <Calendar size={16} className="text-blue-500 flex-shrink-0" />
                        {event.event_date ? format(parseISO(event.event_date), 'EEEE, MMMM dd, yyyy') : t('event_registration.tba', 'TBA')}
                      </p>
                      <p className="flex items-center gap-2">
                        <Clock size={16} className="text-blue-500 flex-shrink-0" />
                        {event.start_time || t('event_registration.tba', 'TBA')}
                      </p>
                      <p className="flex items-center gap-2">
                        <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                        {event.location || t('event_registration.tba', 'TBA')}
                      </p>
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </KioskLayout>
    );
  }

  // STEP: Build Attendee List
  if (step === 'build_list') {
    const totalAttendees = (includeSelf ? 1 : 0) + attendees.filter(a => !a.isPrimary).length;

    return (
      <KioskLayout showBack showHome onBack={() => setStep('select_event')}>
        <div className="space-y-4 sm:space-y-6 lg:space-y-8 w-full max-w-full overflow-x-hidden">
          <motion.div
            className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto w-full box-border"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <AttendeeBuilder
              primaryMember={member}
              attendees={attendees}
              setAttendees={setAttendees}
              includeSelf={includeSelf}
              setIncludeSelf={setIncludeSelf}
              onAddCompanion={() => setShowAddModal(true)}
              eventId={selectedEvent?.id}
            />

            {/* Event Summary */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="bg-blue-50 rounded-xl overflow-hidden">
                {selectedEvent?.cover_image && (
                  <div className="w-full h-24 bg-gray-100">
                    <img
                      src={selectedEvent.cover_image}
                      alt={selectedEvent.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h4 className="font-semibold text-gray-900">{selectedEvent?.name}</h4>
                  <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                    <Calendar size={14} className="text-blue-500" />
                    {selectedEvent?.event_date ? format(parseISO(selectedEvent.event_date), 'EEEE, MMMM dd') : t('event_registration.tba', 'TBA')}
                  </p>
                </div>
              </div>
            </div>

            {/* Continue Button */}
            <Button
              onClick={() => setStep('confirm')}
              disabled={totalAttendees === 0}
              className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl mt-6"
            >
              {t('common.continue', 'Continue')} ({totalAttendees} {t('group_registration.attendees', 'attendee(s)')})
            </Button>
          </motion.div>
        </div>

        {/* Add Companion Modal */}
        <AddCompanionModal
          open={showAddModal}
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddCompanion}
          churchId={churchId}
          existingAttendees={attendees}
          eventRsvpIds={eventRsvpIds}
        />
      </KioskLayout>
    );
  }

  // STEP: Confirm
  if (step === 'confirm') {
    const totalAttendees = (includeSelf ? 1 : 0) + attendees.filter(a => !a.isPrimary).length;

    return (
      <KioskLayout showBack showHome onBack={() => setStep('build_list')}>
        <motion.div
          className="bg-white rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-8 lg:p-12 max-w-2xl mx-auto space-y-4 sm:space-y-6 w-full box-border mb-6"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          <div className="text-center space-y-2 sm:space-y-4">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900">
              {t('group_registration.confirm_title', 'Confirm Registration')}
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('group_registration.confirm_subtitle', 'You are registering {{count}} person(s) for:', { count: totalAttendees })}
            </p>
          </div>

          {/* Event Details */}
          <div className="bg-blue-50 rounded-xl sm:rounded-2xl overflow-hidden">
            {selectedEvent?.cover_image && (
              <div className="w-full h-32 sm:h-40 bg-gray-100">
                <img
                  src={selectedEvent.cover_image}
                  alt={selectedEvent.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-4 sm:p-6">
              <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900 mb-2">
                {selectedEvent?.name}
              </h3>
              <div className="text-sm sm:text-base lg:text-lg text-gray-700 space-y-1">
                <p className="flex items-center gap-2">
                  <Calendar size={16} className="text-blue-500 flex-shrink-0" />
                  {selectedEvent?.event_date ? format(parseISO(selectedEvent.event_date), 'EEEE, MMMM dd, yyyy') : t('event_registration.tba', 'TBA')}
                </p>
                <p className="flex items-center gap-2">
                  <Clock size={16} className="text-blue-500 flex-shrink-0" />
                  {selectedEvent?.start_time || t('event_registration.tba', 'TBA')}
                </p>
                <p className="flex items-center gap-2">
                  <MapPin size={16} className="text-blue-500 flex-shrink-0" />
                  {selectedEvent?.location || t('event_registration.tba', 'TBA')}
                </p>
              </div>
            </div>
          </div>

          {/* Attendee List */}
          <div className="space-y-2">
            <h4 className="font-semibold text-gray-700">
              {t('group_registration.attendees', 'Attendees')}:
            </h4>
            <ul className="space-y-1 text-gray-600">
              {includeSelf && (
                <li className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  {member?.full_name || member?.member_name}
                  <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                    {t('group_registration.primary_badge', 'You')}
                  </span>
                </li>
              )}
              {attendees.filter(a => !a.isPrimary).map((a, idx) => (
                <li key={a.member_id || a.tempId || idx} className="flex items-center gap-2">
                  <Check size={16} className="text-green-500" />
                  {a.member_name || a.full_name}
                  {a.isNew && (
                    <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded">
                      {t('group_registration.new_guest', 'New')}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Error Message */}
          {registrationError && (
            <Alert variant="destructive" className="bg-red-50 border-red-200">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{registrationError}</AlertDescription>
            </Alert>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              variant="outline"
              onClick={() => setStep('build_list')}
              className="flex-1 h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
              disabled={registerGroupMutation.isPending}
            >
              {t('home.back', 'Back')}
            </Button>
            <Button
              onClick={registrationError ? handleRetry : handleConfirmRegistration}
              disabled={registerGroupMutation.isPending}
              className="flex-1 h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
            >
              {registerGroupMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  {t('common.processing', 'Processing...')}
                </>
              ) : registrationError ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  {t('common.retry', 'Retry')}
                </>
              ) : (
                t('group_registration.register_all', 'Register All')
              )}
            </Button>
          </div>
        </motion.div>
      </KioskLayout>
    );
  }

  // STEP: Success with Ticket Carousel
  if (step === 'success' && registrationResult) {
    return (
      <KioskLayout showBack={false} showHome={false}>
        <div className="space-y-6 w-full max-w-full overflow-x-hidden">
          {/* Success Header */}
          <motion.div
            className="text-center"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-10 h-10 sm:w-12 sm:h-12 text-green-600" />
              </div>
            </motion.div>

            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
              {t('group_registration.success_title', 'Registration Complete!')}
            </h2>
            <p className="text-base sm:text-lg lg:text-xl text-gray-600">
              {t('group_registration.success_subtitle', 'Your tickets are ready')}
            </p>
          </motion.div>

          {/* Debug: Log tickets for troubleshooting */}
          {console.log('Registration Result:', registrationResult)}
          {console.log('Tickets:', registrationResult.tickets)}
          {console.log('Primary Member ID:', member?.id)}

          {/* Ticket Carousel */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <TicketCarousel
              tickets={registrationResult.tickets || []}
              event={{
                event_name: registrationResult.event_name,
                event_date: registrationResult.event_date,
                location: registrationResult.location,
                start_time: registrationResult.start_time
              }}
              primaryMemberId={member?.id}
            />
          </motion.div>

          {/* Done Button */}
          <motion.div
            className="px-4 max-w-sm mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              onClick={handleBackToStart}
              className="w-full h-12 sm:h-14 lg:h-16 text-base sm:text-lg lg:text-xl rounded-xl"
              size="lg"
            >
              {t('common.done', 'Done')}
            </Button>
          </motion.div>
        </div>
      </KioskLayout>
    );
  }

  return null;
};

export default EventRegistrationKiosk;
