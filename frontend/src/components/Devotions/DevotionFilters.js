import React from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

function DevotionFilters({ filters, onFiltersChange }) {
  const { t } = useTranslation();

  const hasActiveFilters = filters.status_filter || filters.date_from || filters.date_to;

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value === filters[key] ? null : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      status_filter: null,
      date_from: null,
      date_to: null,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">{t('devotions.filters.filterByStatus')}</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            {t('common.cancel')}
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-4">
        {/* Status Filters */}
        <div className="flex gap-2">
          {['draft', 'published', 'scheduled'].map((status) => (
            <button
              key={status}
              onClick={() => handleFilterChange('status_filter', status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filters.status_filter === status
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {t(`devotions.status.${status}`)}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="flex gap-2 items-center">
          <div className="space-y-1">
            <Label className="text-xs">{t('devotions.filters.from')}</Label>
            <Input
              type="date"
              value={filters.date_from || ''}
              onChange={(e) => onFiltersChange({ ...filters, date_from: e.target.value })}
              className="h-9"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t('devotions.filters.to')}</Label>
            <Input
              type="date"
              value={filters.date_to || ''}
              onChange={(e) => onFiltersChange({ ...filters, date_to: e.target.value })}
              className="h-9"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default DevotionFilters;
