import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Save, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useRegisterRSVP } from '@/hooks/useRSVP';
import { useQuery } from '@tanstack/react-query';
import { membersAPI } from '@/services/api';
import { toast } from 'sonner';
import SeatSelector from './SeatSelector';

function RSVPForm({ event, selectedSession, onSuccess, onCancel }) {
  const { t } = useTranslation();
  const registerMutation = useRegisterRSVP();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [sessionId, setSessionId] = useState(selectedSession || '');

  // Fetch members for search
  const { data: members = [] } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const response = await membersAPI.list();
      return response.data;
    },
  });

  const filteredMembers = members.filter((member) =>
    member.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!selectedMember) {
      toast.error(t('events.rsvp.memberRequired'));
      return;
    }

    if (event.event_type === 'series' && !sessionId) {
      toast.error(t('events.rsvp.sessionRequired'));
      return;
    }

    if (event.enable_seat_selection && !selectedSeat) {
      toast.error(t('events.rsvp.seatRequired'));
      return;
    }

    try {
      await registerMutation.mutateAsync({
        eventId: event.id,
        memberId: selectedMember.id,
        sessionId: event.event_type === 'series' ? sessionId : null,
        seat: selectedSeat,
      });
      toast.success(t('events.rsvp.registerSuccess'));
      onSuccess();
    } catch (error) {
      toast.error(t('events.rsvp.registerError'));
      console.error('Register RSVP error:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">{t('events.rsvp.registerRSVP')}</h3>

      {/* Member Selection */}
      <div className="space-y-2">
        <Label htmlFor="member-search">{t('events.rsvp.selectMember')} *</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            id="member-search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t('events.rsvp.searchMember')}
            className="pl-10"
          />
        </div>

        {/* Selected Member Display */}
        {selectedMember && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-gray-900">{selectedMember.full_name}</p>
                <p className="text-sm text-gray-600">{selectedMember.phone}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMember(null)}
              >
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        )}

        {/* Member Search Results */}
        {!selectedMember && searchQuery && (
          <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
            {filteredMembers.length === 0 ? (
              <p className="text-center py-4 text-gray-500 text-sm">
                {t('members.noMembers')}
              </p>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredMembers.slice(0, 10).map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelectedMember(member);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <p className="font-medium text-gray-900">{member.full_name}</p>
                    <p className="text-sm text-gray-600">{member.phone || t('common.na')}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Session Selection for Series Events */}
      {event.event_type === 'series' && (
        <div className="space-y-2">
          <Label htmlFor="session">{t('events.rsvp.selectSession')} *</Label>
          <select
            id="session"
            value={sessionId}
            onChange={(e) => setSessionId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            required
          >
            <option value="">{t('events.rsvp.selectSession')}</option>
            {event.sessions?.map((session, idx) => (
              <option key={idx} value={session.name}>
                {session.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Seat Selection */}
      {event.enable_seat_selection && event.seat_layout_id && (
        <SeatSelector
          eventId={event.id}
          sessionId={event.event_type === 'series' ? sessionId : null}
          layoutId={event.seat_layout_id}
          selectedSeat={selectedSeat}
          onSeatSelect={setSelectedSeat}
        />
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={registerMutation.isPending}
          className="flex-1"
        >
          {registerMutation.isPending ? (
            t('common.loading')
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              {t('events.rsvp.registerRSVP')}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

export default RSVPForm;
