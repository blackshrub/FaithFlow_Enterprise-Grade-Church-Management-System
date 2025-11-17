import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, User, Calendar, Armchair, QrCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCancelRSVP } from '@/hooks/useRSVP';
import { useQuery } from '@tanstack/react-query';
import { membersAPI } from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

function RSVPList({ event, rsvpData, isLoading, selectedSession }) {
  const { t } = useTranslation();
  const cancelMutation = useCancelRSVP();

  // Fetch all members to display names
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await membersAPI.list();
      return response.data;
    },
  });

  // Create member lookup map
  const memberMap = useMemo(() => {
    const map = {};
    members.forEach(member => {
      map[member.id] = member;
    });
    return map;
  }, [members]);

  const handleCancel = async (rsvp) => {
    if (window.confirm(t('events.rsvp.confirmCancel'))) {
      try {
        await cancelMutation.mutateAsync({
          eventId: event.id,
          memberId: rsvp.member_id,
          sessionId: rsvp.session_id,
        });
        toast.success(t('events.rsvp.cancelSuccess'));
      } catch (error) {
        toast.error(t('events.rsvp.cancelError'));
        console.error('Cancel RSVP error:', error);
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'MMM dd, yyyy HH:mm');
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  const rsvps = rsvpData?.rsvps || [];

  if (rsvps.length === 0) {
    return (
      <div className="text-center py-12">
        <User className="h-16 w-16 mx-auto text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('events.rsvp.noRSVPs')}
        </h3>
        <p className="text-gray-500">
          {selectedSession
            ? t('events.rsvp.noRSVPsForSession')
            : t('events.rsvp.registerFirst')}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">{t('events.rsvp.rsvpList')}</h3>

      <div className="space-y-3">
        {rsvps.map((rsvp, index) => {
          const member = memberMap[rsvp.member_id];
          
          return (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-4">
                {/* QR Code */}
                {rsvp.qr_code && (
                  <div className="flex-shrink-0">
                    <img 
                      src={rsvp.qr_code} 
                      alt="QR Code" 
                      className="w-24 h-24 border border-gray-300 rounded"
                    />
                  </div>
                )}
                
                {/* RSVP Details */}
                <div className="flex-1 space-y-2">
                  {/* Member Info */}
                  <div className="flex items-center gap-2">
                    <User className="h-5 w-5 text-gray-400" />
                    <div>
                      <span className="font-medium text-gray-900">
                        {member ? member.full_name : `Member ID: ${rsvp.member_id}`}
                      </span>
                      {member?.phone && (
                        <p className="text-xs text-gray-500">{member.phone}</p>
                      )}
                    </div>
                  </div>

                  {/* Confirmation Code */}
                  {rsvp.confirmation_code && (
                    <div className="flex items-center gap-2">
                      <QrCode className="h-4 w-4 text-blue-500" />
                      <span className="font-mono text-sm font-medium text-blue-600">
                        {rsvp.confirmation_code}
                      </span>
                    </div>
                  )}

                {/* Session Info */}
                {rsvp.session_id && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="h-4 w-4" />
                    <span>{t('events.event.sessionName')}: {rsvp.session_id}</span>
                  </div>
                )}

                {/* Seat Info */}
                {rsvp.seat && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Armchair className="h-4 w-4" />
                    <span>{t('events.rsvp.seatNumber', { seat: rsvp.seat })}</span>
                  </div>
                )}

                {/* Timestamp */}
                {rsvp.timestamp && (
                  <p className="text-xs text-gray-500">
                    {t('events.rsvp.registeredOn', { date: formatDate(rsvp.timestamp) })}
                  </p>
                )}

                {/* Status */}
                {rsvp.status && (
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      rsvp.status === 'confirmed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {rsvp.status}
                  </span>
                )}
              </div>

              {/* Actions */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancel(rsvp)}
                disabled={cancelMutation.isPending}
              >
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default RSVPList;
