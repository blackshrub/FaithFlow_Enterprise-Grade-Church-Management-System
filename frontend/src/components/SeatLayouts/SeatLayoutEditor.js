import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { seatLayoutsAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';

function SeatLayoutEditor({ layout, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { church } = useAuth();
  const isEdit = !!layout;

  // Form state
  const [formData, setFormData] = useState({
    name: layout?.name || '',
    description: layout?.description || '',
    rows: layout?.rows || 10,
    columns: layout?.columns || 15,
  });

  const [seatMap, setSeatMap] = useState(layout?.seat_map || {});

  // Generate initial seat map when rows/columns change
  useEffect(() => {
    if (!isEdit || Object.keys(seatMap).length === 0) {
      generateDefaultSeatMap();
    }
  }, [formData.rows, formData.columns]);

  const generateDefaultSeatMap = () => {
    const newSeatMap = {};
    for (let row = 0; row < formData.rows; row++) {
      const rowLetter = String.fromCharCode(65 + row); // A, B, C...
      for (let col = 1; col <= formData.columns; col++) {
        const seatId = `${rowLetter}${col}`;
        newSeatMap[seatId] = seatMap[seatId] || 'available';
      }
    }
    setSeatMap(newSeatMap);
  };

  const toggleSeatState = (seatId) => {
    setSeatMap((prev) => {
      const currentState = prev[seatId] || 'available';
      const nextState =
        currentState === 'available'
          ? 'unavailable'
          : currentState === 'unavailable'
          ? 'no_seat'
          : 'available';
      return { ...prev, [seatId]: nextState };
    });
  };

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (isEdit) {
        return seatLayoutsAPI.update(layout.id, data);
      } else {
        return seatLayoutsAPI.create({ ...data, church_id: church.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seatLayouts'] });
      toast.success(
        isEdit
          ? t('events.seatLayout.updateSuccess')
          : t('events.seatLayout.createSuccess')
      );
      onClose();
    },
    onError: (error) => {
      toast.error(
        isEdit
          ? t('events.seatLayout.updateError')
          : t('events.seatLayout.createError')
      );
      console.error('Save error:', error);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate({
      ...formData,
      seat_map: seatMap,
    });
  };

  const getSeatColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-500 hover:bg-green-600';
      case 'unavailable':
        return 'bg-red-500 hover:bg-red-600';
      case 'no_seat':
        return 'bg-gray-300 hover:bg-gray-400';
      default:
        return 'bg-gray-200';
    }
  };

  const seatStats = React.useMemo(() => {
    const stats = { available: 0, unavailable: 0, noSeat: 0 };
    Object.values(seatMap).forEach((status) => {
      if (status === 'available') stats.available++;
      else if (status === 'unavailable') stats.unavailable++;
      else if (status === 'no_seat') stats.noSeat++;
    });
    return stats;
  }, [seatMap]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {isEdit
                ? t('events.seatLayout.editLayout')
                : t('events.seatLayout.createLayout')}
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {t('events.seatLayout.clickToToggle')}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="name">{t('events.seatLayout.layoutName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder={t('events.seatLayout.layoutNamePlaceholder')}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">{t('events.seatLayout.description')}</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder={t('events.seatLayout.descriptionPlaceholder')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rows">{t('events.seatLayout.rows')} *</Label>
                <Input
                  id="rows"
                  type="number"
                  min="1"
                  max="50"
                  value={formData.rows}
                  onChange={(e) =>
                    setFormData({ ...formData, rows: parseInt(e.target.value) || 1 })
                  }
                  required
                />
                <p className="text-xs text-gray-500">{t('events.seatLayout.rowsDesc')}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="columns">{t('events.seatLayout.columns')} *</Label>
                <Input
                  id="columns"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.columns}
                  onChange={(e) =>
                    setFormData({ ...formData, columns: parseInt(e.target.value) || 1 })
                  }
                  required
                />
                <p className="text-xs text-gray-500">{t('events.seatLayout.columnsDesc')}</p>
              </div>
            </div>

            {/* Seat States Legend */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">
                {t('events.seatLayout.seatStates')}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-green-500"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t('events.seatLayout.available')}
                    </p>
                    <p className="text-xs text-gray-500">{seatStats.available} seats</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-red-500"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t('events.seatLayout.unavailable')}
                    </p>
                    <p className="text-xs text-gray-500">{seatStats.unavailable} seats</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-gray-300"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {t('events.seatLayout.noSeat')}
                    </p>
                    <p className="text-xs text-gray-500">{seatStats.noSeat} positions</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Visual Grid Editor */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">
                {t('events.seatLayout.visualEditor')}
              </h3>

              <div className="bg-gray-50 p-6 rounded-lg overflow-x-auto">
                <div className="flex flex-col items-center">
                  {/* Stage - centered and matches seat grid width */}
                  <div className="bg-gradient-to-b from-gray-800 to-gray-700 text-white text-center py-3 rounded-lg mb-4" style={{ width: `${formData.columns * 36 + (formData.columns - 1) * 4}px` }}>
                    <p className="font-bold text-lg">{t('events.seatLayout.stage')}</p>
                  </div>

                  {/* Seat Grid with row labels */}
                  <div className="inline-block">
                    {Array.from({ length: formData.rows }, (_, rowIdx) => {
                      const rowLetter = String.fromCharCode(65 + rowIdx);
                      return (
                        <div key={rowLetter} className="flex items-center gap-2 mb-2">
                          {/* Row Label */}
                          <div className="w-8 text-center font-semibold text-gray-700">
                            {rowLetter}
                          </div>

                          {/* Seats */}
                          <div className="flex gap-1">
                            {Array.from({ length: formData.columns }, (_, colIdx) => {
                              const seatId = `${rowLetter}${colIdx + 1}`;
                              const seatStatus = seatMap[seatId] || 'available';
                              return (
                                <button
                                  key={seatId}
                                  type="button"
                                  onClick={() => toggleSeatState(seatId)}
                                  className={`w-8 h-8 rounded text-xs font-medium text-white transition-colors ${
                                    getSeatColor(seatStatus)
                                  }`}
                                  title={`${seatId} - ${seatStatus}`}
                                >
                                  {colIdx + 1}
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
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? (
                t('common.loading')
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEdit ? t('common.update') : t('common.create')}
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SeatLayoutEditor;
