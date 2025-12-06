import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { eventsAPI, membersAPI } from '@/services/api';
import { format } from 'date-fns';

function AttendanceModal({ event, onClose }) {
  const { t } = useTranslation();

  const { data: attendanceData, isLoading } = useQuery({
    queryKey: ['attendance', event.id],
    queryFn: async () => {
      const response = await eventsAPI.getAttendance(event.id);
      return response.data;
    },
  });

  // Fetch members for lookup (high limit for church-wide lookup)
  const { data: members = [] } = useQuery({
    queryKey: ['members', 'full-list'],
    queryFn: async () => {
      const response = await membersAPI.list({ limit: 2000 });
      return response.data;
    },
  });

  const memberMap = React.useMemo(() => {
    const map = {};
    members.forEach(member => {
      map[member.id] = member;
    });
    return map;
  }, [members]);

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                <h2 className="text-2xl font-bold text-gray-900">
                  {t('events.event.attendance')}
                </h2>
              </div>
              <p className="text-gray-600">{event.name}</p>
              {!isLoading && attendanceData && (
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-gray-500">
                    {t('events.event.totalAttendance')}: {attendanceData.total_attendance}
                  </span>
                  {event.requires_rsvp && (
                    <span className="text-gray-500">
                      {t('events.event.attendanceRate')}: {attendanceData.attendance_rate}
                    </span>
                  )}
                </div>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="text-center py-12">
              <p className="text-gray-500">{t('common.loading')}</p>
            </div>
          ) : attendanceData?.attendance?.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {t('events.attendance.noAttendance')}
              </h3>
              <p className="text-gray-500">{t('events.attendance.noOneCheckedIn')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {attendanceData.attendance.map((record, index) => {
                const member = memberMap[record.member_id];
                return (
                  <div
                    key={index}
                    className="bg-white border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="bg-green-100 rounded-full p-2">
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {member ? member.full_name : record.member_name || record.member_id}
                          </p>
                          {member?.phone && (
                            <p className="text-xs text-gray-500">{member.phone}</p>
                          )}
                          {record.session_id && (
                            <p className="text-xs text-gray-600 mt-1">
                              Session: {record.session_id}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-500">
                          {t('events.attendance.checkedInAt')}
                        </p>
                        <p className="text-sm font-medium text-gray-900">
                          {formatTime(record.check_in_time)}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </div>
  );
}

export default AttendanceModal;
