import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Copy, History, BookOpen, Calendar, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeleteDevotion } from '@/hooks/useDevotions';
import { toast } from 'sonner';
import { format } from 'date-fns';
import VersionHistoryModal from './VersionHistoryModal';

function DevotionCard({ devotion, onEdit }) {
  const { t } = useTranslation();
  const deleteMutation = useDeleteDevotion();
  const [showHistory, setShowHistory] = useState(false);

  const handleDelete = async () => {
    if (window.confirm(t('devotions.messages.confirmDelete'))) {
      try {
        await deleteMutation.mutateAsync(devotion.id);
        toast.success(t('devotions.messages.deleteSuccess'));
      } catch (error) {
        toast.error(t('devotions.messages.deleteError'));
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
      return format(new Date(dateStr), 'EEEE, MMMM dd, yyyy');
    } catch {
      return dateStr;
    }
  };

  const getStatusColor = () => {
    switch (devotion.status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'draft':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow overflow-hidden flex flex-col h-full">
      {/* Cover Image */}
      <div className="h-48 bg-gradient-to-br from-purple-500 to-pink-600 overflow-hidden relative flex-shrink-0">
        {devotion.cover_image_url ? (
          <img
            src={devotion.cover_image_url}
            alt={devotion.title}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="h-20 w-20 text-white opacity-50" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-4 flex-1 flex flex-col">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">{devotion.title}</h3>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor()}`}>
                {t(`devotions.status.${devotion.status}`)}
              </span>
              {devotion.tts_audio_url && (
                <span className="flex items-center gap-1 text-xs text-purple-600">
                  <Volume2 className="h-3 w-3" />
                  Audio
                </span>
              )}
            </div>
          </div>
          <div className="flex gap-1 ml-2">
            <Button variant="ghost" size="sm" onClick={() => onEdit(devotion)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>

        <div className="space-y-2 text-sm flex-1">
          <div className="flex items-center gap-2 text-gray-600">
            <Calendar className="h-4 w-4" />
            <span>{formatDate(devotion.date)}</span>
          </div>

          {devotion.verses && devotion.verses.length > 0 && (
            <div className="text-gray-600">
              <BookOpen className="h-4 w-4 inline mr-1" />
              <span className="text-xs">
                {devotion.verses.map((v, idx) => (
                  <span key={idx}>
                    {v.book} {v.chapter}:{v.start_verse}
                    {v.end_verse && v.end_verse !== v.start_verse ? `-${v.end_verse}` : ''}
                    {idx < devotion.verses.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2 flex-shrink-0">
          {devotion.version_history && devotion.version_history.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => setShowHistory(true)}>
              <History className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Version History Modal */}
      {showHistory && (
        <VersionHistoryModal devotion={devotion} onClose={() => setShowHistory(false)} />
      )}
    </div>
  );
}

export default DevotionCard;
