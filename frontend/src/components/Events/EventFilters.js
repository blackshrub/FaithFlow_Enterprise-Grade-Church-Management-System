import React from 'react';
import { useTranslation } from 'react-i18next';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

function EventFilters({ filters, onFiltersChange }) {
  const { t } = useTranslation();

  const hasActiveFilters = filters.event_type || filters.is_active !== null;

  const handleFilterChange = (key, value) => {
    onFiltersChange({
      ...filters,
      [key]: value === filters[key] ? null : value,
    });
  };

  const clearFilters = () => {
    onFiltersChange({
      event_type: null,
      is_active: null,
    });
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="flex items-center justify-between mb-4" data-testid="filter-button">
        <div className="flex items-center gap-2">
          <Filter className="h-5 w-5 text-gray-400" />
          <h3 className="font-medium text-gray-900">{t('events.event.filterByType')}</h3>
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="h-4 w-4 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="flex flex-wrap gap-3">
        {/* Event Type Filters */}
        <div className="flex gap-2">
          <button
            onClick={() => handleFilterChange('event_type', 'single')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.event_type === 'single'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('events.event.singleEvent')}
          </button>
          <button
            onClick={() => handleFilterChange('event_type', 'series')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.event_type === 'series'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('events.event.seriesEvent')}
          </button>
        </div>

        {/* Status Filters */}
        <div className="flex gap-2">
          <button
            data-testid="filter-upcoming"
            onClick={() => handleFilterChange('is_active', true)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.is_active === true
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('events.event.activeEvents')}
          </button>
          <button
            onClick={() => handleFilterChange('is_active', false)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filters.is_active === false
                ? 'bg-gray-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t('events.event.ended')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EventFilters;
