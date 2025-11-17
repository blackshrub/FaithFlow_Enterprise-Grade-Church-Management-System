import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Clock, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';

function SessionsModal({ event, onClose }) {
  const { t } = useTranslation();

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'EEEE, MMMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'HH:mm');
    } catch {
      return '';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-6 w-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('events.event.sessions')}
                </h2>
              </div>
              <p className="text-gray-600">{event.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {t('events.event.sessionsTotal', { count: event.sessions?.length || 0 })}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            {event.sessions?.map((session, index) => {
              // Count RSVPs for this session
              const sessionRSVPs = event.rsvp_list?.filter(
                (r) => r.session_id === session.name
              ).length || 0;
              const sessionAttendance = event.attendance_list?.filter(
                (a) => a.session_id === session.name
              ).length || 0;

              return (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 text-lg mb-3">
                        {session.name}
                      </h3>

                      <div className="space-y-2">
                        {/* Date */}
                        <div className="flex items-center gap-2 text-gray-600">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm">{formatDate(session.date)}</span>
                        </div>

                        {/* Time */}
                        {formatTime(session.date) && (
                          <div className="flex items-center gap-2 text-gray-600">
                            <Clock className="h-4 w-4" />
                            <span className="text-sm">
                              {formatTime(session.date)}
                              {session.end_date && ` - ${formatTime(session.end_date)}`}
                            </span>
                          </div>
                        )}

                        {/* RSVP Stats */}
                        {event.requires_rsvp && (sessionRSVPs > 0 || sessionAttendance > 0) && (
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                            {sessionRSVPs > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-600">
                                  {sessionRSVPs} {sessionRSVPs === 1 ? 'RSVP' : 'RSVPs'}
                                </span>
                              </div>
                            )}
                            {sessionAttendance > 0 && (
                              <div className="flex items-center gap-1">
                                <Users className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium text-green-600">
                                  {sessionAttendance} {t('events.event.attended')}
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Session Number Badge */}
                    <div className="bg-blue-100 text-blue-800 rounded-full w-8 h-8 flex items-center justify-center font-bold text-sm">
                      {index + 1}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </div>
  );
}

export default SessionsModal;
