import React from 'react';
import { useTranslation } from 'react-i18next';
import { X, History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { devotionsAPI } from '@/services/api';
import { toast } from 'sonner';
import { format } from 'date-fns';

function VersionHistoryModal({ devotion, onClose }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const restoreMutation = useMutation({
    mutationFn: (versionIndex) => devotionsAPI.restoreVersion(devotion.id, versionIndex),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['devotions'] });
      toast.success(t('devotions.history.restoreSuccess'));
      onClose();
    },
    onError: () => {
      toast.error(t('devotions.history.restoreError'));
    },
  });

  const handleRestore = (index) => {
    if (window.confirm(t('devotions.history.confirmRestore'))) {
      restoreMutation.mutate(index);
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <History className="h-6 w-6 text-blue-500" />
            <h2 className="text-2xl font-bold text-gray-900">{t('devotions.history.title')}</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {!devotion.version_history || devotion.version_history.length === 0 ? (
            <div className="text-center py-12">
              <History className="h-16 w-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">{t('devotions.history.noHistory')}</p>
            </div>
          ) : (
            <div className="space-y-4">
              {devotion.version_history.map((version, index) => (
                <div
                  key={index}
                  className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-2">{version.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {t('devotions.history.editedAt', { date: formatDate(version.timestamp) })}
                      </p>
                      {version.verses && version.verses.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {version.verses.length} {t('devotions.form.verses')}
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRestore(index)}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      {t('devotions.history.restoreThisVersion')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-end">
          <Button onClick={onClose}>{t('common.close')}</Button>
        </div>
      </div>
    </div>
  );
}

export default VersionHistoryModal;
