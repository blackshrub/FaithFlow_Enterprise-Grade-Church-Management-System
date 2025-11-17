import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAvailableSeats } from '@/hooks/useRSVP';
import { useSeatLayout } from '@/hooks/useSeatLayouts';
import { Armchair } from 'lucide-react';

function SeatSelector({ eventId, sessionId, layoutId, selectedSeat, onSeatSelect }) {
  const { t } = useTranslation();
  const { data: layout, isLoading: layoutLoading } = useSeatLayout(layoutId);
  const { data: availabilityData, isLoading: availabilityLoading } = useAvailableSeats(
    eventId,
    sessionId
  );

  if (layoutLoading || availabilityLoading) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!layout) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{t('events.seatLayout.loadError')}</p>
      </div>
    );
  }

  const seatMap = layout.seat_map || {};
  const takenSeats = new Set(availabilityData?.taken_seats || []);
  const availableSeats = availabilityData?.available_seats || [];

  const getSeatStatus = (seatId) => {
    if (selectedSeat === seatId) return 'selected';
    if (takenSeats.has(seatId)) return 'taken';
    if (seatMap[seatId] === 'unavailable') return 'unavailable';
    if (seatMap[seatId] === 'no_seat') return 'no_seat';
    if (seatMap[seatId] === 'available') return 'available';
    return 'no_seat';
  };

  const getSeatColor = (status) => {
    switch (status) {
      case 'selected':
        return 'bg-blue-500 hover:bg-blue-600 text-white cursor-pointer';
      case 'available':
        return 'bg-green-500 hover:bg-green-600 text-white cursor-pointer';
      case 'taken':
        return 'bg-red-500 text-white cursor-not-allowed';
      case 'unavailable':
        return 'bg-gray-400 text-white cursor-not-allowed';
      case 'no_seat':
        return 'bg-transparent cursor-default';
      default:
        return 'bg-gray-200';
    }
  };

  const handleSeatClick = (seatId, status) => {
    if (status === 'available') {
      onSeatSelect(seatId);
    } else if (status === 'selected') {
      onSeatSelect(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">{t('events.rsvp.seatSelection')}</h4>
        {selectedSeat && (
          <span className="text-sm font-medium text-blue-600">
            {t('events.rsvp.selectedSeat', { seat: selectedSeat })}
          </span>
        )}
      </div>

      {/* Seat Legend */}
      <div className="bg-gray-50 rounded-lg p-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-green-500"></div>
            <span className="text-gray-700">{t('events.rsvp.seatAvailable')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-blue-500"></div>
            <span className="text-gray-700">{t('events.rsvp.seatSelected')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-red-500"></div>
            <span className="text-gray-700">{t('events.rsvp.seatTaken')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-gray-400"></div>
            <span className="text-gray-700">{t('events.rsvp.seatUnavailable')}</span>
          </div>
        </div>
        <p className="text-xs text-gray-600 mt-2">{t('events.rsvp.clickToSelect')}</p>
      </div>

      {/* Stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-gray-600">
          {t('events.rsvp.availableSeats', { count: availableSeats.length })}
        </span>
        <span className="text-gray-600">
          {t('events.rsvp.takenSeats', { count: takenSeats.size })}
        </span>
      </div>

      {/* Stage and Seat Grid */}
      <div className="bg-gray-50 p-4 rounded-lg overflow-x-auto">
        {/* Stage - centered using flex */}
        <div className="w-full flex justify-center mb-3">
          <div className="bg-gradient-to-b from-gray-800 to-gray-700 text-white text-center py-2 rounded-lg" style={{ width: `${layout.columns * 28 + (layout.columns - 1) * 4}px` }}>
            <p className="font-bold text-sm">{t('events.seatLayout.stage')}</p>
          </div>
        </div>

        {/* Seat Grid - centered using flex */}
        <div className="w-full flex justify-center">
          <div className="inline-block">
            {Array.from({ length: layout.rows }, (_, rowIdx) => {
              const rowLetter = String.fromCharCode(65 + rowIdx);
              return (
                <div key={rowLetter} className="relative mb-1">
                  {/* Row Label - positioned absolutely outside left */}
                  <div className="absolute right-full pr-1 w-6 text-center font-semibold text-gray-700 text-xs flex items-center justify-center h-7">
                    {rowLetter}
                  </div>

                  {/* Seats - exact width based on columns */}
                  <div className="flex gap-1">
                    {Array.from({ length: layout.columns }, (_, colIdx) => {
                      const seatId = `${rowLetter}${colIdx + 1}`;
                      const status = getSeatStatus(seatId);
                      const isClickable = status === 'available' || status === 'selected';

                      return (
                        <button
                          key={seatId}
                          type="button"
                          onClick={() => isClickable && handleSeatClick(seatId, status)}
                          disabled={!isClickable}
                          className={`w-7 h-7 rounded text-xs font-medium transition-all ${
                            getSeatColor(status)
                          } ${status === 'no_seat' ? 'invisible' : ''}`}
                          title={`${seatId} - ${t(`events.rsvp.seat${status.charAt(0).toUpperCase() + status.slice(1)}`)}`}
                        >
                          {status !== 'no_seat' && (
                            <Armchair className="h-4 w-4 mx-auto" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {availableSeats.length === 0 && (
        <div className="text-center py-4">
          <p className="text-red-500 font-medium">{t('events.rsvp.noSeatsAvailable')}</p>
        </div>
      )}
    </div>
  );
}

export default SeatSelector;
