import React from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Armchair } from 'lucide-react';
import { Button } from '@/components/ui/button';

function SeatLayoutCard({ layout, onEdit, onDelete }) {
  const { t } = useTranslation();

  const seatStats = React.useMemo(() => {
    const seatMap = layout.seat_map || {};
    const stats = {
      total: 0,
      available: 0,
      unavailable: 0,
      noSeat: 0,
    };

    Object.values(seatMap).forEach((status) => {
      stats.total++;
      if (status === 'available') stats.available++;
      else if (status === 'unavailable') stats.unavailable++;
      else if (status === 'no_seat') stats.noSeat++;
    });

    return stats;
  }, [layout.seat_map]);

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">{layout.name}</h3>
            {layout.description && (
              <p className="text-sm text-gray-500 mt-1">{layout.description}</p>
            )}
          </div>
          <div className="flex gap-1 ml-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(layout)}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(layout)}
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
      </div>

      {/* Seat Stats */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('events.seatLayout.rows')}:</span>
          <span className="font-medium text-gray-900">{layout.rows}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('events.seatLayout.columns')}:</span>
          <span className="font-medium text-gray-900">{layout.columns}</span>
        </div>
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">{t('events.seatLayout.totalSeats')}:</span>
          <span className="font-medium text-gray-900">{seatStats.total}</span>
        </div>
      </div>

      {/* Visual Stats */}
      <div className="p-4 pt-0 grid grid-cols-3 gap-2 text-xs">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-gray-600">{seatStats.available}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-red-500"></div>
          <span className="text-gray-600">{seatStats.unavailable}</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-gray-300"></div>
          <span className="text-gray-600">{seatStats.noSeat}</span>
        </div>
      </div>
    </div>
  );
}

export default SeatLayoutCard;
