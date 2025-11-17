import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Trash2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function SessionManager({ sessions, onSessionsChange }) {
  const { t } = useTranslation();
  const [newSession, setNewSession] = useState({
    name: '',
    date: '',
    time: '',
    end_date: '',
    end_time: '',
  });

  const addSession = () => {
    if (!newSession.name || !newSession.date) {
      return;
    }

    onSessionsChange([...sessions, { ...newSession }]);
    setNewSession({ name: '', date: '', time: '', end_date: '', end_time: '' });
  };

  const removeSession = (index) => {
    onSessionsChange(sessions.filter((_, i) => i !== index));
  };

  const updateSession = (index, field, value) => {
    const updated = sessions.map((session, i) =>
      i === index ? { ...session, [field]: value } : session
    );
    onSessionsChange(updated);
  };

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium text-gray-900">{t('events.event.sessions')} *</h3>
        <span className="text-sm text-gray-500">
          {sessions.length} {t('events.event.sessions')}
        </span>
      </div>

      {/* Existing Sessions */}
      {sessions.length > 0 && (
        <div className="space-y-3">
          {sessions.map((session, index) => (
            <div
              key={index}
              className="bg-white border border-gray-200 rounded-lg p-4 space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <Input
                      value={session.name}
                      onChange={(e) => updateSession(index, 'name', e.target.value)}
                      placeholder={t('events.event.sessionName')}
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={session.date}
                      onChange={(e) => updateSession(index, 'date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="time"
                      value={session.time || ''}
                      onChange={(e) => updateSession(index, 'time', e.target.value)}
                    />
                  </div>
                  <div>
                    <Input
                      type="date"
                      value={session.end_date || ''}
                      onChange={(e) => updateSession(index, 'end_date', e.target.value)}
                      placeholder="End date (optional)"
                    />
                  </div>
                  <div>
                    <Input
                      type="time"
                      value={session.end_time || ''}
                      onChange={(e) => updateSession(index, 'end_time', e.target.value)}
                      placeholder="End time"
                    />
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeSession(index)}
                  className="ml-2"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {sessions.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-2 text-gray-300" />
          <p className="text-sm">{t('events.event.noSessions')}</p>
          <p className="text-xs mt-1">{t('events.event.atLeastOneSession')}</p>
        </div>
      )}

      {/* Add New Session */}
      <div className="border-t border-gray-200 pt-4">
        <h4 className="text-sm font-medium text-gray-700 mb-3">
          {t('events.event.addSession')}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <Input
              value={newSession.name}
              onChange={(e) => setNewSession({ ...newSession, name: e.target.value })}
              placeholder={t('events.event.sessionName')}
            />
          </div>
          <div>
            <Input
              type="date"
              value={newSession.date}
              onChange={(e) => setNewSession({ ...newSession, date: e.target.value })}
            />
          </div>
          <div>
            <Input
              type="time"
              value={newSession.time}
              onChange={(e) => setNewSession({ ...newSession, time: e.target.value })}
              placeholder="Time"
            />
          </div>
          <div>
            <Input
              type="date"
              value={newSession.end_date}
              onChange={(e) => setNewSession({ ...newSession, end_date: e.target.value })}
              placeholder="End date (optional)"
            />
          </div>
          <div>
            <Input
              type="time"
              value={newSession.end_time}
              onChange={(e) => setNewSession({ ...newSession, end_time: e.target.value })}
              placeholder="End time"
            />
          </div>
        </div>
        <Button
          type="button"
          onClick={addSession}
          className="mt-3 w-full"
          disabled={!newSession.name || !newSession.date}
        >
          <Plus className="h-4 w-4 mr-2" />
          {t('events.event.addSession')}
        </Button>
      </div>
    </div>
  );
}

export default SessionManager;
