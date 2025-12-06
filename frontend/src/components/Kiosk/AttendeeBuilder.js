/**
 * AttendeeBuilder - Manages the list of attendees for group registration
 *
 * Features:
 * - Primary member with "Include myself" toggle
 * - Add/remove companions
 * - Persists to sessionStorage for network resilience
 */

import React, { useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { UserPlus, Users, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import AttendeeCard from './AttendeeCard';

const AttendeeBuilder = ({
  primaryMember,
  attendees,
  setAttendees,
  includeSelf,
  setIncludeSelf,
  onAddCompanion,
  eventId,
  disabled = false
}) => {
  const { t } = useTranslation('kiosk');

  // Storage key for persistence
  const STORAGE_KEY = `kiosk_group_registration_${eventId}`;

  // Save to sessionStorage whenever attendees change
  useEffect(() => {
    if (eventId && attendees.length > 0) {
      const dataToSave = {
        attendees,
        includeSelf,
        savedAt: new Date().toISOString()
      };
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
    }
  }, [attendees, includeSelf, eventId, STORAGE_KEY]);

  // Restore from sessionStorage on mount
  useEffect(() => {
    if (eventId) {
      const saved = sessionStorage.getItem(STORAGE_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Only restore if data is less than 1 hour old
          const savedAt = new Date(parsed.savedAt);
          const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
          if (savedAt > hourAgo && parsed.attendees?.length > 0) {
            // Check if attendees are different from current (avoid infinite loop)
            const currentIds = attendees.map(a => a.member_id || a.tempId).sort().join(',');
            const savedIds = parsed.attendees.map(a => a.member_id || a.tempId).sort().join(',');
            if (currentIds !== savedIds) {
              setAttendees(parsed.attendees);
              setIncludeSelf(parsed.includeSelf ?? true);
              console.log('Restored group registration progress');
            }
          }
        } catch (e) {
          console.error('Error restoring saved attendees:', e);
        }
      }
    }
  }, [eventId]); // Only run on mount/eventId change

  // Clear storage (called on successful registration)
  const clearStorage = useCallback(() => {
    if (eventId) {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [eventId, STORAGE_KEY]);

  // Remove attendee
  const handleRemove = (attendee) => {
    setAttendees(prev => prev.filter(a =>
      (a.member_id || a.tempId) !== (attendee.member_id || attendee.tempId)
    ));
  };

  // Count companions (excluding primary)
  const companionCount = attendees.filter(a => !a.isPrimary).length;
  const totalCount = (includeSelf ? 1 : 0) + companionCount;

  // Check if we have any attendees
  const hasAttendees = totalCount > 0;

  return (
    <motion.div
      className="space-y-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 text-blue-600 mb-4">
          <Users size={32} />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
          {t('group_registration.title', "Who's Coming?")}
        </h2>
        <p className="text-gray-600">
          {t('group_registration.subtitle', 'Add yourself and anyone coming with you')}
        </p>
      </div>

      {/* Primary Member Toggle */}
      <div className="bg-blue-50 rounded-xl p-4 border-2 border-blue-200">
        <div className="flex items-center gap-3">
          <Checkbox
            id="include-self"
            checked={includeSelf}
            onCheckedChange={setIncludeSelf}
            disabled={disabled}
            className="h-5 w-5"
          />
          <Label
            htmlFor="include-self"
            className="flex-1 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gray-900">
                {t('group_registration.include_self', 'Include myself')}
              </span>
            </div>
            <span className="text-sm text-gray-600">
              {primaryMember?.full_name || primaryMember?.member_name}
            </span>
          </Label>
        </div>
      </div>

      {/* Companions List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">
            {t('group_registration.companion_count', '{{count}} attendee(s)', { count: totalCount })}
          </span>
        </div>

        <AnimatePresence mode="popLayout">
          {/* Show primary if included */}
          {includeSelf && primaryMember && (
            <AttendeeCard
              key="primary"
              attendee={{
                member_id: primaryMember.id,
                member_name: primaryMember.full_name || primaryMember.member_name,
                phone: primaryMember.phone_whatsapp,
                photo: primaryMember.photo_url || primaryMember.photo_thumbnail_url || primaryMember.photo
              }}
              isPrimary={true}
              showRemove={false}
              disabled={disabled}
            />
          )}

          {/* Companions */}
          {attendees.filter(a => !a.isPrimary).map((attendee) => (
            <AttendeeCard
              key={attendee.member_id || attendee.tempId}
              attendee={attendee}
              isPrimary={false}
              showRemove={true}
              onRemove={handleRemove}
              disabled={disabled}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Add Companion Button */}
      <Button
        variant="outline"
        size="lg"
        className="w-full border-dashed border-2 text-gray-600 hover:text-blue-600 hover:border-blue-400 h-14"
        onClick={onAddCompanion}
        disabled={disabled}
      >
        <UserPlus size={20} className="mr-2" />
        {t('group_registration.add_companion', 'Add Companion')}
      </Button>

      {/* Warning if no attendees */}
      {!hasAttendees && (
        <Alert variant="destructive" className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {t('group_registration.no_attendees_warning', 'Please add at least one attendee')}
          </AlertDescription>
        </Alert>
      )}
    </motion.div>
  );
};

export default AttendeeBuilder;
