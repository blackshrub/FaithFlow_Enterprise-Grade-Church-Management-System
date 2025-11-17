import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Users, Calendar, MapPin, Trash2, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteEvent } from '@/hooks/useEvents';
import { toast } from 'sonner';
import { format } from 'date-fns';
import RSVPManager from './RSVPManager';
import SessionsModal from './SessionsModal';

function EventCard({ event, onEdit }) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteEvent();
  const [showRSVPManager, setShowRSVPManager] = useState(false);
  const [showSessionsModal, setShowSessionsModal] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(t('events.event.confirmDelete'))) {
      try {
        await deleteMutation.mutateAsync(event.id);
        toast.success(t('events.event.deleteSuccess'));
      } catch (error) {
        toast.error(t('events.event.deleteError'));
      }
    }
  };

  const formatEventDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getEventStatus = () => {
    if (!event.is_active) return 'ended';
    const now = new Date();
    const eventDate = event.event_date ? new Date(event.event_date) : null;
    if (eventDate && eventDate > now) return 'upcoming';
    return 'active';
  };

  const status = getEventStatus();
  const statusColors = {
    active: 'bg-green-100 text-green-800',
    upcoming: 'bg-blue-100 text-blue-800',
    ended: 'bg-gray-100 text-gray-800',
  };

  const rsvpCount = event.rsvp_list?.length || 0;
  const attendanceCount = event.attendance_list?.length || 0;
  
  // Calculate capacity info with progress
  const getCapacityInfo = () => {
    // For events with seat_capacity defined (manual capacity)
    if (event.seat_capacity) {
      const remaining = event.seat_capacity - rsvpCount;
      const percentage = Math.round((rsvpCount / event.seat_capacity) * 100);
      return {
        total: event.seat_capacity,
        current: rsvpCount,
        remaining,
        percentage,
        source: 'manual'
      };
    }
    // For events with seat layout (will need to fetch layout details separately)
    // For now, we can estimate from seat_layout_id presence
    return null;
  };
  
  const capacityInfo = getCapacityInfo();

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
      {/* Event Photo */}
      <div className="h-48 bg-gradient-to-br from-blue-500 to-purple-600 overflow-hidden relative flex-shrink-0">
        {event.event_photo ? (
          <img
            src={event.event_photo}
            alt={event.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.parentElement.innerHTML = `
                <div class="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
                  <svg class="h-20 w-20 text-white opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              `;
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg
              className="h-20 w-20 text-white opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-gray-900 line-clamp-2">{event.name}</h3>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${statusColors[status]}`}
              >
                {t(`events.event.${status}`)}
              </span>
              <span className="px-2 py-1 rounded text-xs font-medium bg-purple-100 text-purple-800">
                {t(`events.event.${event.event_type}Event`)}
              </span>
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(event)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        {/* Description */}
        {event.description && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{event.description}</p>
        )}

        {/* Details */}
        <div className="space-y-2 text-sm flex-1">
          {event.event_type === 'single' && event.event_date && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>{formatEventDate(event.event_date)}</span>
            </div>
          )}

          {event.event_type === 'series' && (
            <div className="flex items-center gap-2 text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>
                {event.sessions?.length || 0} {t('events.event.sessions')}
              </span>
            </div>
          )}

          {event.location && (
            <div className="flex items-center gap-2 text-gray-600">
              <MapPin className="h-4 w-4" />
              <span className="line-clamp-1">{event.location}</span>
            </div>
          )}

          {event.requires_rsvp && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span>{t('events.event.rsvpCount', { count: rsvpCount })}</span>
            </div>
          )}

          {attendanceCount > 0 && (
            <div className="flex items-center gap-2 text-gray-600">
              <Users className="h-4 w-4" />
              <span>{t('events.event.attendanceCount', { count: attendanceCount })}</span>
            </div>
          )}
        </div>

        {/* Capacity Progress Bar */}
        {event.requires_rsvp && capacityInfo && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-2">
              {/* Capacity Label and Numbers */}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">{t('events.event.capacity')}</span>
                <span className="text-gray-600">
                  {t('events.event.capacityProgress', { 
                    count: capacityInfo.current, 
                    total: capacityInfo.total 
                  })}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="relative w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-300 ${
                    capacityInfo.percentage >= 100
                      ? 'bg-red-500'
                      : capacityInfo.percentage >= 80
                      ? 'bg-yellow-500'
                      : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.min(capacityInfo.percentage, 100)}%` }}
                />
              </div>

              {/* Percentage and Status */}
              <div className="flex items-center justify-between text-xs">
                <span className={`font-medium ${
                  capacityInfo.percentage >= 100
                    ? 'text-red-600'
                    : capacityInfo.percentage >= 80
                    ? 'text-yellow-600'
                    : 'text-green-600'
                }`}>
                  {t('events.event.capacityPercentage', { percentage: capacityInfo.percentage })}
                </span>
                {capacityInfo.remaining > 0 ? (
                  <span className="text-gray-500">
                    {t('events.event.capacityRemaining', { remaining: capacityInfo.remaining })}
                  </span>
                ) : (
                  <span className="text-red-600 font-medium">
                    {t('events.event.capacityFull')}
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Footer Actions - Always at bottom */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2 flex-shrink-0">
          {event.event_type === 'series' && event.sessions?.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setShowSessionsModal(true)}
            >
              <List className="h-4 w-4 mr-1" />
              {t('events.event.viewSessions')}
            </Button>
          )}
          {event.requires_rsvp && (
            <Button 
              variant="outline" 
              size="sm" 
              className="flex-1"
              onClick={() => setShowRSVPManager(true)}
            >
              {t('events.event.viewRSVPs')}
            </Button>
          )}
          <Button variant="outline" size="sm" className="flex-1">
            {t('events.event.viewAttendance')}
          </Button>
        </div>
      </div>

      {/* RSVP Manager Modal */}
      {showRSVPManager && (
        <RSVPManager event={event} onClose={() => setShowRSVPManager(false)} />
      )}

      {/* Sessions Modal */}
      {showSessionsModal && (
        <SessionsModal event={event} onClose={() => setShowSessionsModal(false)} />
      )}
      {/* Sessions Modal */}
      {showSessionsModal && (
        <SessionsModal event={event} onClose={() => setShowSessionsModal(false)} />
      )}
    </div>
  );
}

export default EventCard;
