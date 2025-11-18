import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Upload, Trash2, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useCreateEvent, useUpdateEvent } from '@/hooks/useEvents';
import { useSeatLayouts } from '@/hooks/useSeatLayouts';
import { useEventCategories } from '@/hooks/useSettings';
import { useAuth } from '@/context/AuthContext';
import SessionManager from './SessionManager';

function EventForm({ event, onClose }) {
  const { t } = useTranslation();
  const { church } = useAuth();
  const isEdit = !!event;

  const createMutation = useCreateEvent();
  const updateMutation = useUpdateEvent();
  const { data: layouts = [] } = useSeatLayouts();
  const { data: categories = [] } = useEventCategories();

  // Form state
  const [formData, setFormData] = useState({
    name: event?.name || '',
    description: event?.description || '',
    event_type: event?.event_type || 'single',
    event_category_id: event?.event_category_id || '',
    location: event?.location || '',
    event_photo: event?.event_photo || '',
    requires_rsvp: event?.requires_rsvp ?? false,
    enable_seat_selection: event?.enable_seat_selection ?? false,
    seat_layout_id: event?.seat_layout_id || '',
    seat_capacity: event?.seat_capacity || '',
    event_date: event?.event_date ? event.event_date.split('T')[0] : '',
    event_time: event?.event_date ? event.event_date.split('T')[1]?.substring(0, 5) : '',
    event_end_date: event?.event_end_date ? event.event_end_date.split('T')[0] : '',
    event_end_time: event?.event_end_date ? event.event_end_date.split('T')[1]?.substring(0, 5) : '',
    reservation_start: event?.reservation_start ? event.reservation_start.split('T')[0] : '',
    reservation_start_time: event?.reservation_start ? event.reservation_start.split('T')[1]?.substring(0, 5) : '',
    reservation_end: event?.reservation_end ? event.reservation_end.split('T')[0] : '',
    reservation_end_time: event?.reservation_end ? event.reservation_end.split('T')[1]?.substring(0, 5) : '',
    is_active: event?.is_active ?? true,
  });

  const [sessions, setSessions] = useState(event?.sessions || []);
  const [photoPreview, setPhotoPreview] = useState(event?.event_photo || '');

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setFormData({ ...formData, event_photo: base64 });
      setPhotoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const removePhoto = () => {
    setFormData({ ...formData, event_photo: '' });
    setPhotoPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (formData.event_type === 'single' && !formData.event_date) {
      toast.error(t('events.event.eventDateRequired'));
      return;
    }

    if (formData.event_type === 'series' && sessions.length === 0) {
      toast.error(t('events.event.atLeastOneSession'));
      return;
    }

    if (formData.enable_seat_selection && !formData.seat_layout_id) {
      toast.error('Seat layout is required when seat selection is enabled');
      return;
    }

    try {
      // Prepare data
      const eventData = {
        name: formData.name,
        description: formData.description,
        event_type: formData.event_type,
        event_category_id: formData.event_category_id || null,
        location: formData.location,
        event_photo: formData.event_photo,
        requires_rsvp: formData.requires_rsvp,
        enable_seat_selection: formData.enable_seat_selection,
        seat_layout_id: formData.seat_layout_id || null,
        seat_capacity: formData.seat_capacity ? parseInt(formData.seat_capacity) : null,
        is_active: formData.is_active,
      };

      // Add reservation period if set
      if (formData.reservation_start) {
        eventData.reservation_start = `${formData.reservation_start}T${formData.reservation_start_time || '00:00'}:00`;
      }
      if (formData.reservation_end) {
        eventData.reservation_end = `${formData.reservation_end}T${formData.reservation_end_time || '23:59'}:00`;
      }

      // Add event-type specific fields
      if (formData.event_type === 'single') {
        eventData.event_date = `${formData.event_date}T${formData.event_time || '00:00'}:00`;
        if (formData.event_end_date) {
          eventData.event_end_date = `${formData.event_end_date}T${formData.event_end_time || '23:59'}:00`;
        }
      } else {
        eventData.sessions = sessions.map(session => ({
          name: session.name,
          date: `${session.date}T${session.time || '00:00'}:00`,
          end_date: session.end_date ? `${session.end_date}T${session.end_time || '23:59'}:00` : null,
        }));
      }

      if (isEdit) {
        await updateMutation.mutateAsync({ id: event.id, data: eventData });
        toast.success(t('events.event.updateSuccess'));
      } else {
        await createMutation.mutateAsync({ ...eventData, church_id: church.id });
        toast.success(t('events.event.createSuccess'));
      }

      onClose();
    } catch (error) {
      toast.error(
        isEdit
          ? t('events.event.updateError')
          : t('events.event.createError')
      );
      console.error('Save error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? t('events.event.editEvent') : t('events.event.createEvent')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Event Type */}
            <div className="space-y-2">
              <Label>{t('events.event.eventType')} *</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="single"
                    checked={formData.event_type === 'single'}
                    onChange={(e) => handleChange('event_type', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>{t('events.event.singleEvent')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value="series"
                    checked={formData.event_type === 'series'}
                    onChange={(e) => handleChange('event_type', e.target.value)}
                    className="w-4 h-4"
                  />
                  <span>{t('events.event.seriesEvent')}</span>
                </label>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="name">{t('events.event.eventName')} *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>

              {/* Event Category */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="category">{t('settings.eventCategory')}</Label>
                <select
                  id="category"
                  value={formData.event_category_id}
                  onChange={(e) => handleChange('event_category_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="">{t('settings.eventCategory')} ({t('common.optional') || 'Optional'})</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">{t('events.event.description')}</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleChange('description', e.target.value)}
                  rows={3}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="location">{t('events.event.location')}</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => handleChange('location', e.target.value)}
                />
              </div>
            </div>

            {/* Single Event Date/Time */}
            {formData.event_type === 'single' && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">{t('events.event.eventDate')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="event_date">{t('events.event.eventDate')} *</Label>
                    <Input
                      id="event_date"
                      type="date"
                      value={formData.event_date}
                      onChange={(e) => handleChange('event_date', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_time">{t('events.event.eventTime')}</Label>
                    <Input
                      id="event_time"
                      type="time"
                      value={formData.event_time}
                      onChange={(e) => handleChange('event_time', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_end_date">{t('events.event.endDate')}</Label>
                    <Input
                      id="event_end_date"
                      type="date"
                      value={formData.event_end_date}
                      onChange={(e) => handleChange('event_end_date', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="event_end_time">{t('events.event.endTime')}</Label>
                    <Input
                      id="event_end_time"
                      type="time"
                      value={formData.event_end_time}
                      onChange={(e) => handleChange('event_end_time', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Series Event Sessions */}
            {formData.event_type === 'series' && (
              <SessionManager sessions={sessions} onSessionsChange={setSessions} />
            )}

            {/* RSVP Options */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h3 className="font-medium text-gray-900">{t('events.event.rsvpRequired')}</h3>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="requires_rsvp"
                  checked={formData.requires_rsvp}
                  onChange={(e) => handleChange('requires_rsvp', e.target.checked)}
                  className="w-4 h-4"
                />
                <Label htmlFor="requires_rsvp" className="cursor-pointer">
                  {t('events.event.rsvpYes')}
                </Label>
              </div>

              {/* Seat Selection - Only for Single Events */}
              {formData.requires_rsvp && formData.event_type === 'single' && (
                <div className="space-y-4 pl-6 border-l-2 border-gray-300">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="enable_seat_selection"
                      checked={formData.enable_seat_selection}
                      onChange={(e) => handleChange('enable_seat_selection', e.target.checked)}
                      className="w-4 h-4"
                    />
                    <Label htmlFor="enable_seat_selection" className="cursor-pointer">
                      {t('events.event.enableSeatSelection')}
                    </Label>
                  </div>
                  <p className="text-xs text-gray-500">{t('events.event.seatSelectionDesc')}</p>

                  {formData.enable_seat_selection && (
                    <div className="space-y-2">
                      <Label htmlFor="seat_layout_id">
                        {t('events.event.selectLayout')} *
                      </Label>
                      <select
                        id="seat_layout_id"
                        value={formData.seat_layout_id}
                        onChange={(e) => handleChange('seat_layout_id', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        required={formData.enable_seat_selection}
                      >
                        <option value="">Select layout...</option>
                        {layouts.map((layout) => (
                          <option key={layout.id} value={layout.id}>
                            {layout.name} ({layout.rows}x{layout.columns})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {!formData.enable_seat_selection && (
                    <div className="space-y-2">
                      <Label htmlFor="seat_capacity">
                        {t('events.event.seatCapacity')}
                      </Label>
                      <Input
                        id="seat_capacity"
                        type="number"
                        min="1"
                        value={formData.seat_capacity}
                        onChange={(e) => handleChange('seat_capacity', e.target.value)}
                        placeholder={t('events.event.seatCapacityPlaceholder')}
                      />
                      <p className="text-xs text-gray-500">{t('events.event.seatCapacityDesc')}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Seat Capacity - For Series Events */}
              {formData.requires_rsvp && formData.event_type === 'series' && (
                <div className="space-y-2 pl-6 border-l-2 border-gray-300">
                  <Label htmlFor="seat_capacity_series">
                    {t('events.event.seatCapacity')}
                  </Label>
                  <Input
                    id="seat_capacity_series"
                    type="number"
                    min="1"
                    value={formData.seat_capacity}
                    onChange={(e) => handleChange('seat_capacity', e.target.value)}
                    placeholder={t('events.event.seatCapacityPlaceholder')}
                  />
                  <p className="text-xs text-gray-500">
                    {t('events.event.seatCapacityDescSeries')}
                  </p>
                </div>
              )}
            </div>

            {/* Reservation Period */}
            {formData.requires_rsvp && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">{t('events.event.reservationPeriod')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reservation_start">{t('events.event.reservationStart')}</Label>
                    <Input
                      id="reservation_start"
                      type="date"
                      value={formData.reservation_start}
                      onChange={(e) => handleChange('reservation_start', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservation_start_time">Time</Label>
                    <Input
                      id="reservation_start_time"
                      type="time"
                      value={formData.reservation_start_time}
                      onChange={(e) => handleChange('reservation_start_time', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservation_end">{t('events.event.reservationEnd')}</Label>
                    <Input
                      id="reservation_end"
                      type="date"
                      value={formData.reservation_end}
                      onChange={(e) => handleChange('reservation_end', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reservation_end_time">Time</Label>
                    <Input
                      id="reservation_end_time"
                      type="time"
                      value={formData.reservation_end_time}
                      onChange={(e) => handleChange('reservation_end_time', e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Event Photo */}
            <div className="space-y-2">
              <Label>{t('events.event.eventPhoto')}</Label>
              {photoPreview ? (
                <div className="relative">
                  <img
                    src={photoPreview}
                    alt="Event preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removePhoto}
                    className="absolute top-2 right-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">{t('events.event.uploadPhoto')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
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

export default EventForm;
