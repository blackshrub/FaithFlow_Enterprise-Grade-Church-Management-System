import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Calendar as CalendarIcon, List, ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useEvents } from '@/hooks/useEvents';
import { useEventCategories } from '@/hooks/useSettings';
import EventForm from '@/components/Events/EventForm';
import EventCard from '@/components/Events/EventCard';
import EventFilters from '@/components/Events/EventFilters';
import { 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  addDays, 
  addMonths, 
  subMonths, 
  format, 
  isSameMonth, 
  isSameDay, 
  parseISO,
  isToday
} from 'date-fns';

function Events() {
  const { t } = useTranslation();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [view, setView] = useState('list'); // 'list' or 'calendar'
  const [currentMonth, setCurrentMonth] = useState(new Date());
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

  // Calendar logic
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    let day = calendarStart;
    
    while (day <= calendarEnd) {
      days.push(day);
      day = addDays(day, 1);
    }
    
    return days;
  };

  const calendarDays = generateCalendarDays();

  // Get events for a specific day
  const getEventsForDay = (day) => {
    return events.filter(event => {
      if (!event.event_date) return false;
      const eventDate = parseISO(event.event_date.split('T')[0]);
      return isSameDay(eventDate, day);
    });
  };

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const goToToday = () => setCurrentMonth(new Date());

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
        <div className="flex gap-2">
          {/* View Toggle */}
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="list" className="flex items-center gap-2">
                <List className="h-4 w-4" />
                List
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                Calendar
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={handleCreate} data-testid="add-event-button">
            <Plus className="h-4 w-4 mr-2" />
            {t('events.event.createEvent')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <EventFilters filters={filters} onFiltersChange={setFilters} />

      {/* List View */}
      {view === 'list' && (
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-gray-400" />
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
              <CalendarIcon className="h-16 w-16 mx-auto text-gray-300 mb-4" />
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
                  category={categoryMap[event.event_category_id]}
                  onEdit={handleEdit}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Calendar View */}
      {view === 'calendar' && (
        <div className="bg-white rounded-lg shadow">
          {/* Calendar Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {format(currentMonth, 'MMMM yyyy')}
                </h2>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={prevMonth}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={goToToday}>
                    Today
                  </Button>
                  <Button variant="outline" size="sm" onClick={nextMonth}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <span className="text-sm text-gray-500">
                {events.length} events total
              </span>
            </div>
          </div>

          {/* Calendar Grid */}
          <div className="p-6">
            {/* Weekday Headers */}
            <div className="grid grid-cols-7 gap-2 mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
                <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Days */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day, idx) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isDayToday = isToday(day);

                return (
                  <div
                    key={idx}
                    className={`min-h-[120px] border rounded-lg p-2 ${
                      !isCurrentMonth ? 'bg-gray-50' : 'bg-white'
                    } ${
                      isDayToday ? 'border-blue-500 border-2' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-sm font-medium ${
                        !isCurrentMonth ? 'text-gray-400' : isDayToday ? 'text-blue-600' : 'text-gray-700'
                      }`}>
                        {format(day, 'd')}
                      </span>
                      {isDayToday && (
                        <Badge variant="default" className="text-xs py-0 h-5">
                          Today
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((event) => {
                        const category = categoryMap[event.event_category_id];
                        return (
                          <div
                            key={event.id}
                            onClick={() => handleEdit(event)}
                            className="text-xs p-1.5 rounded cursor-pointer hover:opacity-80 transition-opacity"
                            style={{
                              backgroundColor: category?.color || '#3B82F6',
                              color: 'white'
                            }}
                            title={`${event.event_name} - ${event.start_time || ''}`}
                          >
                            <div className="font-medium truncate">
                              {event.event_name}
                            </div>
                            {event.start_time && (
                              <div className="text-xs opacity-90">
                                {event.start_time}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {dayEvents.length > 3 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{dayEvents.length - 3} more
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

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
