import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Calendar, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/hooks/useEvents';
import { useEventCategories } from '@/hooks/useSettings';
import EventForm from '@/components/Events/EventForm';
import EventCard from '@/components/Events/EventCard';
import EventFilters from '@/components/Events/EventFilters';

function Events() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [filters, setFilters] = useState({
    event_type: null,
    is_active: null,
  });

  const { data: events = [], isLoading, error } = useEvents(filters);
  const { data: categories = [] } = useEventCategories();

  // Create category lookup map
  const categoryMap = React.useMemo(() => {
    const map = {};
    categories.forEach(cat => {
      map[cat.id] = cat;
    });
    return map;
  }, [categories]);

  const handleCreate = () => {
    setEditingEvent(null);
    setIsFormOpen(true);
  };

  const handleEdit = (event) => {
    setEditingEvent(event);
    setIsFormOpen(true);
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingEvent(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('events.title')}</h1>
          <p className="text-gray-600 mt-1">{t('events.subtitle')}</p>
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
          <h1 className="text-3xl font-bold text-gray-900">{t('events.title')}</h1>
          <p className="text-gray-600 mt-1">{t('events.subtitle')}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-red-500">{t('events.event.loadError')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('events.title')}</h1>
          <p className="text-gray-600 mt-1">{t('events.subtitle')}</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          {t('events.event.createEvent')}
        </Button>
      </div>

      {/* Filters */}
      <EventFilters filters={filters} onFiltersChange={setFilters} />

      {/* Events List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <h2 className="text-lg font-semibold text-gray-900">
                {t('events.event.eventsList')}
              </h2>
            </div>
            <span className="text-sm text-gray-500">
              {t('events.event.eventsTotal', { count: events.length })}
            </span>
          </div>
        </div>

        {events.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {t('events.event.noEvents')}
            </h3>
            <p className="text-gray-500 mb-6">{t('events.event.createFirstEvent')}</p>
            <Button onClick={handleCreate}>
              <Plus className="h-4 w-4 mr-2" />
              {t('events.event.createEvent')}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {events.map((event) => (
              <EventCard
                key={event.id}
                event={event}
                onEdit={handleEdit}
              />
            ))}
          </div>
        )}
      </div>

      {/* Event Form Modal */}
      {isFormOpen && (
        <EventForm
          event={editingEvent}
          onClose={handleFormClose}
        />
      )}
    </div>
  );
}

export default Events;
