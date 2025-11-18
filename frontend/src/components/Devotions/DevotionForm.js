import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Save, Upload, Trash2, Plus, Volume2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCreateDevotion, useUpdateDevotion } from '@/hooks/useDevotions';
import { useMutation } from '@tanstack/react-query';
import { devotionsAPI } from '@/services/api';
import { useAuth } from '@/context/AuthContext';
import TiptapEditor from './TiptapEditor';
import VersePicker from './VersePicker';

function DevotionForm({ devotion, onClose }) {
  const { t } = useTranslation();
  const { church, user } = useAuth();
  const isEdit = !!devotion;

  const createMutation = useCreateDevotion();
  const updateMutation = useUpdateDevotion();

  const [formData, setFormData] = useState({
    date: devotion?.date ? new Date(devotion.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    title: devotion?.title || '',
    cover_image_url: devotion?.cover_image_url || '',
    content: devotion?.content || '',
    verses: devotion?.verses || [],
    status: devotion?.status || 'draft',
    publish_at: devotion?.publish_at ? new Date(devotion.publish_at).toISOString().split('T')[0] : '',
    publish_time: devotion?.publish_at ? new Date(devotion.publish_at).toISOString().split('T')[1].substring(0, 5) : '',
  });

  const [imagePreview, setImagePreview] = useState(devotion?.cover_image_url || '');
  const [generatingAudio, setGeneratingAudio] = useState(false);

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t('devotions.validation.imageTooLarge'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result;
      setFormData({ ...formData, cover_image_url: base64 });
      setImagePreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setFormData({ ...formData, cover_image_url: '' });
    setImagePreview('');
  };

  const handleGenerateAudio = async () => {
    if (!devotion?.id) {
      toast.error('Please save the devotion first');
      return;
    }

    setGeneratingAudio(true);
    try {
      const response = await devotionsAPI.generateAudio(devotion.id);
      toast.success(t('devotions.actions.audioGenerated'));
      // Update form data with new audio URL
      setFormData({ ...formData, tts_audio_url: response.data.audio_url });
    } catch (error) {
      toast.error(t('devotions.actions.audioGenerationFailed'));
    } finally {
      setGeneratingAudio(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title) {
      toast.error(t('devotions.validation.titleRequired'));
      return;
    }
    if (!formData.content) {
      toast.error(t('devotions.validation.contentRequired'));
      return;
    }
    if (!formData.date) {
      toast.error(t('devotions.validation.dateRequired'));
      return;
    }

    try {
      const devotionData = {
        date: `${formData.date}T00:00:00Z`,
        title: formData.title,
        cover_image_url: formData.cover_image_url,
        content: formData.content,
        verses: formData.verses,
        status: formData.status,
      };

      if (formData.status === 'scheduled' && formData.publish_at) {
        devotionData.publish_at = `${formData.publish_at}T${formData.publish_time || '00:00'}:00Z`;
      }

      if (isEdit) {
        await updateMutation.mutateAsync({ id: devotion.id, data: devotionData });
        toast.success(t('devotions.messages.updateSuccess'));
      } else {
        await createMutation.mutateAsync({ ...devotionData, church_id: church.id });
        toast.success(t('devotions.messages.createSuccess'));
      }

      onClose();
    } catch (error) {
      toast.error(
        isEdit
          ? t('devotions.messages.updateError')
          : t('devotions.messages.createError')
      );
      console.error('Save error:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-gray-900">
            {isEdit ? t('devotions.editDevotion') : t('devotions.createDevotion')}
          </h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Date and Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="date">{t('devotions.form.date')} *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleChange('date', e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>{t('devotions.status.draft')}</Label>
                <select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="draft">{t('devotions.status.draft')}</option>
                  <option value="published">{t('devotions.status.published')}</option>
                  <option value="scheduled">{t('devotions.status.scheduled')}</option>
                </select>
              </div>
            </div>

            {/* Scheduled Publishing */}
            {formData.status === 'scheduled' && (
              <div className="bg-blue-50 rounded-lg p-4 space-y-4">
                <h3 className="font-medium text-gray-900">{t('devotions.schedule.schedulePublishing')}</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('devotions.schedule.publishDate')}</Label>
                    <Input
                      type="date"
                      value={formData.publish_at}
                      onChange={(e) => handleChange('publish_at', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t('devotions.schedule.publishTime')}</Label>
                    <Input
                      type="time"
                      value={formData.publish_time}
                      onChange={(e) => handleChange('publish_time', e.target.value)}
                    />
                  </div>
                </div>
                <p className="text-xs text-blue-600">{t('devotions.schedule.autoPublish')}</p>
              </div>
            )}

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">{t('devotions.form.title')} *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange('title', e.target.value)}
                placeholder={t('devotions.form.titlePlaceholder')}
                required
              />
            </div>

            {/* Cover Image */}
            <div className="space-y-2">
              <Label>{t('devotions.form.coverImage')}</Label>
              {imagePreview ? (
                <div className="relative">
                  <img
                    src={imagePreview}
                    alt="Cover preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={removeImage}
                    className="absolute top-2 right-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                  <Upload className="h-8 w-8 text-gray-400 mb-2" />
                  <span className="text-sm text-gray-500">{t('devotions.form.uploadImage')}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* Content Editor */}
            <div className="space-y-2">
              <Label>{t('devotions.form.content')} *</Label>
              <TiptapEditor
                content={formData.content}
                onChange={(html) => handleChange('content', html)}
              />
            </div>

            {/* Bible Verses */}
            <div className="space-y-2">
              <Label>{t('devotions.form.verses')}</Label>
              <VersePicker
                verses={formData.verses}
                onVersesChange={(verses) => handleChange('verses', verses)}
              />
            </div>

            {/* TTS Audio */}
            {isEdit && (
              <div className="space-y-2">
                <Label>{t('devotions.actions.generateAudio')}</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleGenerateAudio}
                    disabled={generatingAudio}
                  >
                    {generatingAudio ? (
                      t('devotions.actions.generatingAudio')
                    ) : (
                      <>
                        <Volume2 className="h-4 w-4 mr-2" />
                        {t('devotions.actions.generateAudio')}
                      </>
                    )}
                  </Button>
                  {(devotion?.tts_audio_url || formData.tts_audio_url) && (
                    <audio controls className="flex-1">
                      <source src={devotion?.tts_audio_url || formData.tts_audio_url} type="audio/mp3" />
                    </audio>
                  )}
                </div>
              </div>
            )}
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

export default DevotionForm;
