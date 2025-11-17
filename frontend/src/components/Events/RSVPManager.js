import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEventRSVPs } from '@/hooks/useRSVP';
import RSVPForm from './RSVPForm';
import RSVPList from './RSVPList';

function RSVPManager({ event, onClose }) {
  const { t } = useTranslation();
  const [showForm, setShowForm] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);

  const { data: rsvpData, isLoading } = useEventRSVPs(event.id, selectedSession);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-6 w-6 text-blue-500" />
                <h2 className="text-2xl font-bold text-gray-900">{t('events.rsvp.title')}</h2>
              </div>
              <p className="text-gray-600">{event.name}</p>
              {!isLoading && (
                <p className="text-sm text-gray-500 mt-1">
                  {t('events.rsvp.totalRSVPs', { count: rsvpData?.total_rsvps || 0 })}
                </p>
              )}
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Session Filter for Series Events */}
          {event.event_type === 'series' && event.sessions?.length > 0 && (
            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                {t('events.rsvp.filterBySession')}
              </label>
              <select
                value={selectedSession || ''}
                onChange={(e) => setSelectedSession(e.target.value || null)}
                className="w-full max-w-sm px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">{t('events.rsvp.allSessions')}</option>
                {event.sessions.map((session, idx) => (
                  <option key={idx} value={session.name}>
                    {session.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {showForm ? (
            <RSVPForm
              event={event}
              selectedSession={selectedSession}
              onSuccess={() => setShowForm(false)}
              onCancel={() => setShowForm(false)}
            />
          ) : (
            <RSVPList
              event={event}
              rsvpData={rsvpData}
              isLoading={isLoading}
              selectedSession={selectedSession}
            />
          )}
        </div>

        {/* Footer */}
        {!showForm && (
          <div className="p-6 border-t border-gray-200 flex justify-between items-center">
            <Button variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
            <Button onClick={() => setShowForm(true)}>
              {t('events.rsvp.registerRSVP')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default RSVPManager;
