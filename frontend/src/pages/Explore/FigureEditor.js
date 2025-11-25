import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import {
  ArrowLeft, Save, Eye, Loader2, X, Plus
} from 'lucide-react';
import exploreService from '../../services/exploreService';
import { useToast } from '../../hooks/use-toast';

export default function FigureEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    name: { en: '', id: '' },
    title: { en: '', id: '' },
    testament: 'old_testament',
    summary: { en: '', id: '' },
    biography: { en: '', id: '' },
    timeline: [],
    life_lessons: { en: [], id: [] },
    related_scriptures: [],
    image_url: '',
    published: false,
    scheduled_date: '',
  });

  const [activeLanguage, setActiveLanguage] = useState('en');
  const [newTimelineEvent, setNewTimelineEvent] = useState({ year: '', event: { en: '', id: '' } });
  const [newLifeLesson, setNewLifeLesson] = useState({ en: '', id: '' });
  const [newScripture, setNewScripture] = useState('');

  // Fetch existing figure if editing
  const { data: figure, isLoading } = useQuery({
    queryKey: ['explore', 'figure', id],
    queryFn: () => exploreService.getContent('figure', id),
    enabled: isEditMode,
    onSuccess: (data) => {
      setFormData({
        name: data.name || { en: '', id: '' },
        title: data.title || { en: '', id: '' },
        testament: data.testament || 'old_testament',
        summary: data.summary || { en: '', id: '' },
        biography: data.biography || { en: '', id: '' },
        timeline: data.timeline || [],
        life_lessons: data.life_lessons || { en: [], id: [] },
        related_scriptures: data.related_scriptures || [],
        image_url: data.image_url || '',
        published: data.published || false,
        scheduled_date: data.scheduled_date || '',
      });
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isEditMode) {
        return exploreService.updateContent('figure', id, data);
      } else {
        return exploreService.createContent('figure', data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['explore', 'content', 'figure']);
      toast({
        title: 'Success',
        description: isEditMode ? 'Bible figure updated successfully' : 'Bible figure created successfully',
      });
      navigate('/explore/content/figure');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save Bible figure',
        variant: 'destructive',
      });
    },
  });

  const handleInputChange = (field, value, language = null) => {
    if (language) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [language]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleAddTimelineEvent = () => {
    if (newTimelineEvent.event.en.trim() || newTimelineEvent.event.id.trim()) {
      setFormData(prev => ({
        ...prev,
        timeline: [...prev.timeline, newTimelineEvent]
      }));
      setNewTimelineEvent({ year: '', event: { en: '', id: '' } });
    }
  };

  const handleRemoveTimelineEvent = (index) => {
    setFormData(prev => ({
      ...prev,
      timeline: prev.timeline.filter((_, i) => i !== index)
    }));
  };

  const handleAddLifeLesson = () => {
    if (newLifeLesson.en.trim() || newLifeLesson.id.trim()) {
      setFormData(prev => ({
        ...prev,
        life_lessons: {
          en: [...prev.life_lessons.en, newLifeLesson.en],
          id: [...prev.life_lessons.id, newLifeLesson.id],
        }
      }));
      setNewLifeLesson({ en: '', id: '' });
    }
  };

  const handleRemoveLifeLesson = (index) => {
    setFormData(prev => ({
      ...prev,
      life_lessons: {
        en: prev.life_lessons.en.filter((_, i) => i !== index),
        id: prev.life_lessons.id.filter((_, i) => i !== index),
      }
    }));
  };

  const handleAddScripture = () => {
    if (newScripture.trim()) {
      setFormData(prev => ({
        ...prev,
        related_scriptures: [...prev.related_scriptures, newScripture]
      }));
      setNewScripture('');
    }
  };

  const handleRemoveScripture = (index) => {
    setFormData(prev => ({
      ...prev,
      related_scriptures: prev.related_scriptures.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name.en.trim()) {
      toast({
        title: 'Validation Error',
        description: 'English name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.summary.en.trim()) {
      toast({
        title: 'Validation Error',
        description: 'English summary is required',
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/explore/content/figure"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Bible Figures
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Bible Figure' : 'Create New Bible Figure'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/public/explore/figure/${id}`, '_blank')}
            disabled={!isEditMode}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Enter the figure's name and basic details</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="name-en">Name (English) *</Label>
                  <Input
                    id="name-en"
                    value={formData.name.en}
                    onChange={(e) => handleInputChange('name', e.target.value, 'en')}
                    placeholder="e.g., Moses"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="title-en">Title (English)</Label>
                  <Input
                    id="title-en"
                    value={formData.title.en}
                    onChange={(e) => handleInputChange('title', e.target.value, 'en')}
                    placeholder="e.g., The Lawgiver, Prophet of God"
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="name-id">Nama (Indonesian)</Label>
                  <Input
                    id="name-id"
                    value={formData.name.id}
                    onChange={(e) => handleInputChange('name', e.target.value, 'id')}
                    placeholder="misal: Musa"
                  />
                </div>

                <div>
                  <Label htmlFor="title-id">Gelar (Indonesian)</Label>
                  <Input
                    id="title-id"
                    value={formData.title.id}
                    onChange={(e) => handleInputChange('title', e.target.value, 'id')}
                    placeholder="misal: Pembawa Hukum, Nabi Allah"
                  />
                </div>
              </TabsContent>
            </Tabs>

            <div className="mt-4">
              <Label htmlFor="testament">Testament</Label>
              <Select
                value={formData.testament}
                onValueChange={(value) => handleInputChange('testament', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select testament" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="old_testament">Old Testament</SelectItem>
                  <SelectItem value="new_testament">New Testament</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Summary & Biography */}
        <Card>
          <CardHeader>
            <CardTitle>Summary & Biography</CardTitle>
            <CardDescription>Provide a brief summary and detailed biography</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="summary-en">Summary (English) *</Label>
                  <Textarea
                    id="summary-en"
                    value={formData.summary.en}
                    onChange={(e) => handleInputChange('summary', e.target.value, 'en')}
                    placeholder="Brief one-paragraph summary"
                    rows={3}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="biography-en">Biography (English)</Label>
                  <Textarea
                    id="biography-en"
                    value={formData.biography.en}
                    onChange={(e) => handleInputChange('biography', e.target.value, 'en')}
                    placeholder="Detailed biography and life story"
                    rows={10}
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="summary-id">Ringkasan (Indonesian)</Label>
                  <Textarea
                    id="summary-id"
                    value={formData.summary.id}
                    onChange={(e) => handleInputChange('summary', e.target.value, 'id')}
                    placeholder="Ringkasan singkat satu paragraf"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="biography-id">Biografi (Indonesian)</Label>
                  <Textarea
                    id="biography-id"
                    value={formData.biography.id}
                    onChange={(e) => handleInputChange('biography', e.target.value, 'id')}
                    placeholder="Biografi dan kisah hidup lengkap"
                    rows={10}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Timeline */}
        <Card>
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
            <CardDescription>Add key events in this person's life</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing timeline events */}
            {formData.timeline.length > 0 && (
              <div className="space-y-2">
                {formData.timeline.map((event, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        {event.year && `${event.year} - `}
                        {event.event.en}
                      </p>
                      {event.event.id && (
                        <p className="text-sm text-gray-600 mt-1">{event.event.id}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveTimelineEvent(index)}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new timeline event */}
            <div className="space-y-2 p-4 border rounded-lg">
              <Label>Add Timeline Event</Label>
              <Input
                value={newTimelineEvent.year}
                onChange={(e) => setNewTimelineEvent(prev => ({ ...prev, year: e.target.value }))}
                placeholder="Year or timeframe (optional)"
              />
              <Input
                value={newTimelineEvent.event.en}
                onChange={(e) => setNewTimelineEvent(prev => ({
                  ...prev,
                  event: { ...prev.event, en: e.target.value }
                }))}
                placeholder="Event description (English)"
              />
              <Input
                value={newTimelineEvent.event.id}
                onChange={(e) => setNewTimelineEvent(prev => ({
                  ...prev,
                  event: { ...prev.event, id: e.target.value }
                }))}
                placeholder="Deskripsi peristiwa (Indonesian)"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddTimelineEvent}
                disabled={!newTimelineEvent.event.en.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Event
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Life Lessons */}
        <Card>
          <CardHeader>
            <CardTitle>Life Lessons</CardTitle>
            <CardDescription>What can we learn from this person's life?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing lessons */}
            {formData.life_lessons.en.length > 0 && (
              <div className="space-y-2">
                {formData.life_lessons.en.map((lesson, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{lesson}</p>
                      {formData.life_lessons.id[index] && (
                        <p className="text-sm text-gray-600 mt-1">
                          {formData.life_lessons.id[index]}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveLifeLesson(index)}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new lesson */}
            <div className="space-y-2 p-4 border rounded-lg">
              <Label>Add Life Lesson</Label>
              <Textarea
                value={newLifeLesson.en}
                onChange={(e) => setNewLifeLesson(prev => ({ ...prev, en: e.target.value }))}
                placeholder="Lesson in English"
                rows={2}
              />
              <Textarea
                value={newLifeLesson.id}
                onChange={(e) => setNewLifeLesson(prev => ({ ...prev, id: e.target.value }))}
                placeholder="Pelajaran dalam bahasa Indonesia"
                rows={2}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddLifeLesson}
                disabled={!newLifeLesson.en.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Lesson
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Related Scriptures */}
        <Card>
          <CardHeader>
            <CardTitle>Related Scriptures</CardTitle>
            <CardDescription>Add Bible references related to this person</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing scriptures */}
            {formData.related_scriptures.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.related_scriptures.map((scripture, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full"
                  >
                    <span className="text-sm">{scripture}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveScripture(index)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new scripture */}
            <div className="flex gap-2">
              <Input
                value={newScripture}
                onChange={(e) => setNewScripture(e.target.value)}
                placeholder="e.g., Exodus 3:1-15"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddScripture();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddScripture}
                disabled={!newScripture.trim()}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Image */}
        <Card>
          <CardHeader>
            <CardTitle>Featured Image</CardTitle>
            <CardDescription>Add an image for this Bible figure</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="image-url">Image URL</Label>
              <Input
                id="image-url"
                value={formData.image_url}
                onChange={(e) => handleInputChange('image_url', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
              {formData.image_url && (
                <div className="mt-2">
                  <img
                    src={formData.image_url}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Publishing Options */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>Control when and how this figure is published</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="published">Published</Label>
                <p className="text-sm text-gray-500">Make this figure visible to users</p>
              </div>
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => handleInputChange('published', checked)}
              />
            </div>

            <div>
              <Label htmlFor="scheduled-date">Scheduled Date (for daily feature)</Label>
              <Input
                id="scheduled-date"
                type="date"
                value={formData.scheduled_date}
                onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/explore/content/figure')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? 'Update Figure' : 'Create Figure'}
          </Button>
        </div>
      </form>
    </div>
  );
}
