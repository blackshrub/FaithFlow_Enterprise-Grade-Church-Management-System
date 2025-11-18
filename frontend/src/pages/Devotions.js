import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, BookOpen, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDevotions } from '@/hooks/useDevotions';
import DevotionForm from '@/components/Devotions/DevotionForm';
import DevotionCard from '@/components/Devotions/DevotionCard';
import DevotionFilters from '@/components/Devotions/DevotionFilters';

function Devotions() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingDevotion, setEditingDevotion] = useState(null);
  const [selectedDevotions, setSelectedDevotions] = useState([]);
  const [filters, setFilters] = useState({
    status_filter: null,
    date_from: null,
    date_to: null,
  });

  const { data: devotions = [], isLoading, error } = useDevotions(filters);

  const handleCreate = () => {
    setEditingDevotion(null);
    setIsFormOpen(true);
  };

  const handleEdit = (devotion) => {
    setEditingDevotion(devotion);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingDevotion(null);
  };

  const toggleSelection = (devotionId) => {
    setSelectedDevotions(prev =>
      prev.includes(devotionId)
        ? prev.filter(id => id !== devotionId)
        : [...prev, devotionId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedDevotions.length === devotions.length) {
      setSelectedDevotions([]);
    } else {
      setSelectedDevotions(devotions.map(d => d.id));
    }
  };

  const handleBulkAction = async (action) => {
    if (selectedDevotions.length === 0) {
      toast.error('Please select at least one devotion');
      return;
    }

    if (action === 'delete' && !window.confirm(t('devotions.messages.confirmDelete'))) {
      return;
    }

    try {
      await devotionsAPI.bulkAction(action, selectedDevotions);
      toast.success(`${selectedDevotions.length} devotions ${action}ed`);
      setSelectedDevotions([]);
      window.location.reload();
    } catch (error) {
      toast.error(`Failed to ${action} devotions`);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('devotions.title')}</h1>
          <p className="text-gray-600 mt-1">{t('devotions.subtitle')}</p>
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
          <h1 className="text-3xl font-bold text-gray-900">{t('devotions.title')}</h1>
          <p className="text-gray-600 mt-1">{t('devotions.subtitle')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-500">{t('devotions.messages.loadError')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('devotions.title')}</h1>
          <p className="text-gray-600 mt-1">{t('devotions.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          {selectedDevotions.length > 0 && (
            <>
              <Button variant="outline" onClick={() => handleBulkAction('publish')}>
                {t('devotions.actions.publish')} ({selectedDevotions.length})
              </Button>
              <Button variant="outline" onClick={() => handleBulkAction('unpublish')}>
                {t('devotions.actions.unpublish')} ({selectedDevotions.length})
              </Button>
              <Button variant="destructive" onClick={() => handleBulkAction('delete')}>
                {t('common.delete')} ({selectedDevotions.length})
              </Button>
            </>
          )}
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            {t('devotions.createDevotion')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <DevotionFilters filters={filters} onFiltersChange={setFilters} />

      {/* Devotions List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-gray-400" />
                <h2 className="text-lg font-semibold text-gray-900">
                  {t('devotions.devotionsList')}
                </h2>
              </div>
              {devotions.length > 0 && (
                <input
                  type="checkbox"
                  checked={selectedDevotions.length === devotions.length && devotions.length > 0}
                  onChange={toggleSelectAll}
                  className="w-5 h-5"
                  title="Select all"
                />
              )}
            </div>
            <span className="text-sm text-gray-500">
              {t('devotions.devotionsTotal', { count: devotions.length })}
            </span>
          </div>
        </div>

        {devotions.length === 0 ? (
          <div className="p-12 text-center">
            <BookOpen className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('devotions.noDevotions')}
            </h3>
            <p className="text-gray-500 mb-6">{t('devotions.createFirstDevotion')}</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('devotions.createDevotion')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {devotions.map((devotion) => (
              <DevotionCard
                key={devotion.id}
                devotion={devotion}
                onEdit={handleEdit}
                isSelected={selectedDevotions.includes(devotion.id)}
                onToggleSelect={() => toggleSelection(devotion.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Devotion Form Modal */}
      {isFormOpen && (
        <DevotionForm
          devotion={editingDevotion}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}

export default Devotions;
