/**
 * AttendeeCard - Displays a single attendee in the group registration list
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { User, Phone, X, Star } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';

const AttendeeCard = ({
  attendee,
  onRemove,
  isPrimary = false,
  showRemove = true,
  disabled = false
}) => {
  const { t } = useTranslation('kiosk');

  // Mask phone number for display (e.g., +628****5678)
  const maskPhone = (phone) => {
    if (!phone) return null;
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 8) return phone;
    return `+${cleaned.slice(0, 3)}****${cleaned.slice(-4)}`;
  };

  return (
    <motion.div
      className={`
        relative flex items-center gap-3 p-4 rounded-xl border-2
        ${isPrimary ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}
        ${disabled ? 'opacity-60' : ''}
      `}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      layout
    >
      {/* Avatar / Icon */}
      <div className={`
        flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center overflow-hidden
        ${isPrimary ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}
      `}>
        {(attendee.photo || attendee.photo_url || attendee.photo_thumbnail_url) ? (
          <img
            src={attendee.photo || attendee.photo_url || attendee.photo_thumbnail_url}
            alt={attendee.member_name || attendee.full_name}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <User size={24} />
        )}
      </div>

      {/* Name and Phone */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-900 truncate">
            {attendee.member_name || attendee.full_name}
          </span>
          {isPrimary && (
            <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
              <Star size={12} className="mr-1" />
              {t('group_registration.primary_badge', 'You')}
            </Badge>
          )}
          {attendee.isNew && (
            <Badge variant="outline" className="text-xs text-green-600 border-green-300">
              {t('group_registration.new_guest', 'New')}
            </Badge>
          )}
        </div>
        {attendee.phone && (
          <div className="flex items-center gap-1 text-sm text-gray-500 mt-0.5">
            <Phone size={14} />
            <span>{maskPhone(attendee.phone)}</span>
          </div>
        )}
      </div>

      {/* Remove Button */}
      {showRemove && !isPrimary && !disabled && onRemove && (
        <Button
          variant="ghost"
          size="icon"
          className="flex-shrink-0 h-8 w-8 text-gray-400 hover:text-red-500 hover:bg-red-50"
          onClick={() => onRemove(attendee)}
        >
          <X size={18} />
        </Button>
      )}
    </motion.div>
  );
};

export default AttendeeCard;
