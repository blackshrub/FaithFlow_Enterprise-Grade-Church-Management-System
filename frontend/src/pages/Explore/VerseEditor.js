import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import {
  ArrowLeft, Save, Calendar, Eye, Loader2
} from 'lucide-react';
import exploreService from '../../services/exploreService';
import { useToast } from '../../hooks/use-toast';

export default function VerseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    reference: '',
    text: { en: '', id: '' },
    commentary: { en: '', id: '' },
    application: { en: '', id: '' },
    theme: { en: '', id: '' },
    image_url: '',
    published: false,
    scheduled_date: '',
  });

  const [activeLanguage, setActiveLanguage] = useState('en');

  // Fetch existing verse if editing
  const { data: verse, isLoading } = useQuery({
    queryKey: ['explore', 'verse', id],
    queryFn: () => exploreService.getContent('verse', id),
    enabled: isEditMode,
    onSuccess: (data) => {
      setFormData({
        reference: data.reference || '',
        text: data.text || { en: '', id: '' },
        commentary: data.commentary || { en: '', id: '' },
        application: data.application || { en: '', id: '' },
        theme: data.theme || { en: '', id: '' },
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
        return exploreService.updateContent('verse', id, data);
      } else {
        return exploreService.createContent('verse', data);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['explore', 'content', 'verse']);
      toast({
        title: 'Success',
        description: isEditMode ? 'Verse updated successfully' : 'Verse created successfully',
      });
      navigate('/content-center/verse');
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to save verse',
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

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.reference.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Bible reference is required',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.text.en.trim()) {
      toast({
        title: 'Validation Error',
        description: 'English verse text is required',
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
            to="/content-center/verse"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Verses
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Verse of the Day' : 'Create New Verse of the Day'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/public/explore/verse/${id}`, '_blank')}
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
        {/* Bible Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Bible Reference</CardTitle>
            <CardDescription>Enter the scripture reference</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="reference">Reference *</Label>
              <Input
                id="reference"
                value={formData.reference}
                onChange={(e) => handleInputChange('reference', e.target.value)}
                placeholder="e.g., John 3:16 or Psalm 23:1"
                required
              />
            </div>
          </CardContent>
        </Card>

        {/* Verse Text */}
        <Card>
          <CardHeader>
            <CardTitle>Verse Text</CardTitle>
            <CardDescription>Enter the verse text in both languages</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="text-en">Verse Text (English) *</Label>
                  <Textarea
                    id="text-en"
                    value={formData.text.en}
                    onChange={(e) => handleInputChange('text', e.target.value, 'en')}
                    placeholder="Enter the verse text"
                    rows={4}
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="text-id">Teks Ayat (Indonesian)</Label>
                  <Textarea
                    id="text-id"
                    value={formData.text.id}
                    onChange={(e) => handleInputChange('text', e.target.value, 'id')}
                    placeholder="Masukkan teks ayat"
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Commentary */}
        <Card>
          <CardHeader>
            <CardTitle>Commentary</CardTitle>
            <CardDescription>Provide explanation and context for the verse</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="commentary-en">Commentary (English)</Label>
                  <Textarea
                    id="commentary-en"
                    value={formData.commentary.en}
                    onChange={(e) => handleInputChange('commentary', e.target.value, 'en')}
                    placeholder="Explain the meaning and context of this verse"
                    rows={6}
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="commentary-id">Komentar (Indonesian)</Label>
                  <Textarea
                    id="commentary-id"
                    value={formData.commentary.id}
                    onChange={(e) => handleInputChange('commentary', e.target.value, 'id')}
                    placeholder="Jelaskan arti dan konteks ayat ini"
                    rows={6}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Application */}
        <Card>
          <CardHeader>
            <CardTitle>Application</CardTitle>
            <CardDescription>How can readers apply this verse to their lives?</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="application-en">Application (English)</Label>
                  <Textarea
                    id="application-en"
                    value={formData.application.en}
                    onChange={(e) => handleInputChange('application', e.target.value, 'en')}
                    placeholder="Provide practical application points"
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="application-id">Aplikasi (Indonesian)</Label>
                  <Textarea
                    id="application-id"
                    value={formData.application.id}
                    onChange={(e) => handleInputChange('application', e.target.value, 'id')}
                    placeholder="Berikan poin-poin aplikasi praktis"
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardHeader>
            <CardTitle>Theme</CardTitle>
            <CardDescription>What is the main theme of this verse?</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="theme-en">Theme (English)</Label>
                  <Input
                    id="theme-en"
                    value={formData.theme.en}
                    onChange={(e) => handleInputChange('theme', e.target.value, 'en')}
                    placeholder="e.g., Faith, Love, Hope, Perseverance"
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="theme-id">Tema (Indonesian)</Label>
                  <Input
                    id="theme-id"
                    value={formData.theme.id}
                    onChange={(e) => handleInputChange('theme', e.target.value, 'id')}
                    placeholder="misal: Iman, Kasih, Pengharapan, Ketekunan"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Media */}
        <Card>
          <CardHeader>
            <CardTitle>Featured Image</CardTitle>
            <CardDescription>Add a background image for the verse card</CardDescription>
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
            <CardDescription>Control when and how this verse is published</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="published">Published</Label>
                <p className="text-sm text-gray-500">Make this verse visible to users</p>
              </div>
              <Switch
                id="published"
                checked={formData.published}
                onCheckedChange={(checked) => handleInputChange('published', checked)}
              />
            </div>

            <div>
              <Label htmlFor="scheduled-date">Scheduled Date</Label>
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
            onClick={() => navigate('/content-center/verse')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? 'Update Verse' : 'Create Verse'}
          </Button>
        </div>
      </form>
    </div>
  );
}
