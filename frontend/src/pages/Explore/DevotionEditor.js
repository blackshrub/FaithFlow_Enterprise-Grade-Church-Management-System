import React, { useState, useEffect } from 'react';
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
  ArrowLeft, Save, Calendar, Eye, Loader2, Upload, X, AlertCircle
} from 'lucide-react';
import exploreService from '../../services/exploreService';
import { useToast } from '../../hooks/use-toast';

export default function DevotionEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    title: { en: '', id: '' },
    content: { en: '', id: '' },
    prayer: { en: '', id: '' },
    reflection_questions: { en: [], id: [] },
    bible_reference: '',
    verse_text: '',
    image_url: '',
    author: '',
    published: false,
    scheduled_date: '',
  });

  const [currentReflectionQuestion, setCurrentReflectionQuestion] = useState({ en: '', id: '' });
  const [activeLanguage, setActiveLanguage] = useState('en');

  // Fetch existing devotion if editing
  const { data: devotion, isLoading } = useQuery({
    queryKey: ['explore', 'devotion', id],
    queryFn: () => exploreService.getContent('devotion', id),
    enabled: isEditMode,
    onSuccess: (data) => {
      setFormData({
        title: data.title || { en: '', id: '' },
        content: data.content || { en: '', id: '' },
        prayer: data.prayer || { en: '', id: '' },
        reflection_questions: data.reflection_questions || { en: [], id: [] },
        bible_reference: data.bible_reference || '',
        verse_text: data.verse_text || '',
        image_url: data.image_url || '',
        author: data.author || '',
        published: data.published || false,
        scheduled_date: data.scheduled_date || '',
      });
    },
  });

  // Save mutation
  const saveMutation = useMutation({
    mutationFn: (data) => {
      if (isEditMode) {
        return exploreService.updateContent('devotion', id, data);
      } else {
        return exploreService.createContent('devotion', data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['explore', 'content', 'devotion']);
      toast({
        title: 'Success',
        description: isEditMode ? 'Devotion updated successfully' : 'Devotion created successfully',
      });
      navigate('/content-center/devotion');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save devotion',
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

  const handleAddReflectionQuestion = () => {
    if (currentReflectionQuestion.en.trim() || currentReflectionQuestion.id.trim()) {
      setFormData(prev => ({
        ...prev,
        reflection_questions: {
          en: [...prev.reflection_questions.en, currentReflectionQuestion.en],
          id: [...prev.reflection_questions.id, currentReflectionQuestion.id],
        }
      }));
      setCurrentReflectionQuestion({ en: '', id: '' });
    }
  };

  const handleRemoveReflectionQuestion = (index) => {
    setFormData(prev => ({
      ...prev,
      reflection_questions: {
        en: prev.reflection_questions.en.filter((_, i) => i !== index),
        id: prev.reflection_questions.id.filter((_, i) => i !== index),
      }
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.title.en.trim()) {
      toast({
        title: 'Validation Error',
        description: 'English title is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.content.en.trim()) {
      toast({
        title: 'Validation Error',
        description: 'English content is required',
        variant: 'destructive',
      });
      return;
    }

    saveMutation.mutate(formData);
  };

  const handleSaveAndSchedule = () => {
    if (!formData.scheduled_date) {
      toast({
        title: 'Validation Error',
        description: 'Please select a scheduled date',
        variant: 'destructive',
      });
      return;
    }
    handleSubmit(new Event('submit'));
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
            to="/content-center/devotion"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Devotions
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Devotion' : 'Create New Devotion'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/public/explore/devotion/${id}`, '_blank')}
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
        {/* Main Content */}
        <Card>
          <CardHeader>
            <CardTitle>Content</CardTitle>
            <CardDescription>Enter the devotion content in both languages</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="title-en">Title (English) *</Label>
                  <Input
                    id="title-en"
                    value={formData.title.en}
                    onChange={(e) => handleInputChange('title', e.target.value, 'en')}
                    placeholder="Enter devotion title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="content-en">Content (English) *</Label>
                  <Textarea
                    id="content-en"
                    value={formData.content.en}
                    onChange={(e) => handleInputChange('content', e.target.value, 'en')}
                    placeholder="Enter devotion content"
                    rows={12}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="prayer-en">Prayer (English)</Label>
                  <Textarea
                    id="prayer-en"
                    value={formData.prayer.en}
                    onChange={(e) => handleInputChange('prayer', e.target.value, 'en')}
                    placeholder="Enter closing prayer"
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="title-id">Judul (Indonesian)</Label>
                  <Input
                    id="title-id"
                    value={formData.title.id}
                    onChange={(e) => handleInputChange('title', e.target.value, 'id')}
                    placeholder="Masukkan judul renungan"
                  />
                </div>

                <div>
                  <Label htmlFor="content-id">Konten (Indonesian)</Label>
                  <Textarea
                    id="content-id"
                    value={formData.content.id}
                    onChange={(e) => handleInputChange('content', e.target.value, 'id')}
                    placeholder="Masukkan konten renungan"
                    rows={12}
                  />
                </div>

                <div>
                  <Label htmlFor="prayer-id">Doa (Indonesian)</Label>
                  <Textarea
                    id="prayer-id"
                    value={formData.prayer.id}
                    onChange={(e) => handleInputChange('prayer', e.target.value, 'id')}
                    placeholder="Masukkan doa penutup"
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Bible Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Bible Reference</CardTitle>
            <CardDescription>Add scripture reference for this devotion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="bible-reference">Reference</Label>
              <Input
                id="bible-reference"
                value={formData.bible_reference}
                onChange={(e) => handleInputChange('bible_reference', e.target.value)}
                placeholder="e.g., John 3:16 or Psalm 23:1-6"
              />
            </div>

            <div>
              <Label htmlFor="verse-text">Verse Text</Label>
              <Textarea
                id="verse-text"
                value={formData.verse_text}
                onChange={(e) => handleInputChange('verse_text', e.target.value)}
                placeholder="Enter the actual verse text"
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Reflection Questions */}
        <Card>
          <CardHeader>
            <CardTitle>Reflection Questions</CardTitle>
            <CardDescription>Add questions to help readers reflect on the devotion</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Existing questions */}
            {formData.reflection_questions.en.length > 0 && (
              <div className="space-y-2">
                {formData.reflection_questions.en.map((question, index) => (
                  <div key={index} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{question}</p>
                      {formData.reflection_questions.id[index] && (
                        <p className="text-sm text-gray-600 mt-1">
                          {formData.reflection_questions.id[index]}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveReflectionQuestion(index)}
                    >
                      <X className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {/* Add new question */}
            <div className="space-y-2 p-4 border rounded-lg">
              <Label>Add New Question</Label>
              <Input
                value={currentReflectionQuestion.en}
                onChange={(e) => setCurrentReflectionQuestion(prev => ({ ...prev, en: e.target.value }))}
                placeholder="Question in English"
              />
              <Input
                value={currentReflectionQuestion.id}
                onChange={(e) => setCurrentReflectionQuestion(prev => ({ ...prev, id: e.target.value }))}
                placeholder="Pertanyaan dalam bahasa Indonesia"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handleAddReflectionQuestion}
                disabled={!currentReflectionQuestion.en.trim() && !currentReflectionQuestion.id.trim()}
              >
                Add Question
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Media & Metadata */}
        <Card>
          <CardHeader>
            <CardTitle>Media & Metadata</CardTitle>
            <CardDescription>Add image and author information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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

            <div>
              <Label htmlFor="author">Author</Label>
              <Input
                id="author"
                value={formData.author}
                onChange={(e) => handleInputChange('author', e.target.value)}
                placeholder="Author name"
              />
            </div>
          </CardContent>
        </Card>

        {/* Publishing Options */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>Control when and how this devotion is published</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="published">Published</Label>
                <p className="text-sm text-gray-500">Make this devotion visible to users</p>
              </div>
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => handleInputChange('published', checked)}
              />
            </div>

            <div>
              <Label htmlFor="scheduled-date">Scheduled Date</Label>
              <div className="flex gap-2">
                <Input
                  id="scheduled-date"
                  type="date"
                  value={formData.scheduled_date}
                  onChange={(e) => handleInputChange('scheduled_date', e.target.value)}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleSaveAndSchedule}
                  disabled={saveMutation.isPending || !formData.scheduled_date}
                >
                  <Calendar className="h-4 w-4 mr-2" />
                  Schedule
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/content-center/devotion')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? 'Update Devotion' : 'Create Devotion'}
          </Button>
        </div>
      </form>
    </div>
  );
}
