import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Grid3x3 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { useSeatLayouts } from '@/hooks/useSeatLayouts';
import SeatLayoutEditor from '@/components/SeatLayouts/SeatLayoutEditor';
import SeatLayoutCard from '@/components/SeatLayouts/SeatLayoutCard';
import { seatLayoutsAPI } from '@/services/api';

function SeatLayouts() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { data: layouts = [], isLoading, error } = useSeatLayouts();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingLayout, setEditingLayout] = useState(null);

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id) => seatLayoutsAPI.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seatLayouts'] });
      toast.success(t('events.seatLayout.deleteSuccess'));
    },
    onError: (error) => {
      toast.error(t('events.seatLayout.deleteError'));
      console.error('Delete error:', error);
    },
  });

  const handleCreate = () => {
    setEditingLayout(null);
    setIsEditorOpen(true);
  };

  const handleEdit = (layout) => {
    setEditingLayout(layout);
    setIsEditorOpen(true);
  };

  const handleDelete = async (layout) => {
    if (window.confirm(t('events.seatLayout.confirmDelete'))) {
      deleteMutation.mutate(layout.id);
    }
  };

  const handleEditorClose = () => {
    setIsEditorOpen(false);
    setEditingLayout(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('events.seatLayout.title')}</h1>
          <p className="text-gray-600 mt-1">{t('events.seatLayout.subtitle')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500">{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('events.seatLayout.title')}</h1>
          <p className="text-gray-600 mt-1">{t('events.seatLayout.subtitle')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-500">{t('events.seatLayout.loadError')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('events.seatLayout.title')}</h1>
          <p className="text-gray-600 mt-1">{t('events.seatLayout.subtitle')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('events.seatLayout.createLayout')}
        </Button>
      </div>

      {/* Layouts List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Grid3x3 className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">
                {t('events.seatLayout.layoutsList')}
              </h2>
            </div>
            <span className="text-sm text-gray-500">
              {t('events.seatLayout.layoutsTotal', { count: layouts.length })}
            </span>
          </div>
        </div>

        {layouts.length === 0 ? (
          <div className="p-12 text-center">
            <Grid3x3 className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('events.seatLayout.noLayouts')}
            </h3>
            <p className="text-gray-500 mb-6">{t('events.seatLayout.createFirstLayout')}</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('events.seatLayout.createLayout')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {layouts.map((layout) => (
              <SeatLayoutCard
                key={layout.id}
                layout={layout}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {isEditorOpen && (
        <SeatLayoutEditor
          layout={editingLayout}
          onClose={handleEditorClose}
        />
      )}
    </div>
  );
}

export default SeatLayouts;
