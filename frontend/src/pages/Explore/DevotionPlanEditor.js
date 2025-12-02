import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Switch } from '../../components/ui/switch';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Save, Loader2, Calendar, GripVertical, Plus, Trash2,
  BookOpen, Image, Clock, X, Search, Check
} from 'lucide-react';
import { useExploreContent, useExploreContentList, useCreateExploreContent, useUpdateExploreContent } from '../../hooks/useExplore';
import { useToast } from '../../hooks/use-toast';

// Difficulty levels
const DIFFICULTY_OPTIONS = [
  { value: 'beginner', label: 'Beginner', description: 'For new believers' },
  { value: 'intermediate', label: 'Intermediate', description: 'For growing Christians' },
  { value: 'advanced', label: 'Advanced', description: 'For mature believers' },
];

// Duration presets
const DURATION_PRESETS = [
  { value: 7, label: '7 Days - One Week' },
  { value: 14, label: '14 Days - Two Weeks' },
  { value: 21, label: '21 Days - Three Weeks' },
  { value: 30, label: '30 Days - One Month' },
  { value: 40, label: '40 Days - Lent/Fasting' },
  { value: 52, label: '52 Days - Full Year Weekly' },
  { value: 0, label: 'Custom Duration' },
];

// Common categories
const CATEGORY_OPTIONS = [
  'Prayer', 'Faith', 'Worship', 'Family', 'Relationships',
  'Spiritual Growth', 'Peace', 'Anxiety', 'Hope', 'Love',
  'Forgiveness', 'Leadership', 'Service', 'Stewardship', 'Evangelism',
  'Healing', 'Wisdom', 'Character', 'Identity', 'Purpose',
];

export default function DevotionPlanEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    title: { en: '', id: '' },
    description: { en: '', id: '' },
    duration_days: 7,
    days: [], // Array of devotion IDs
    categories: [],
    difficulty: 'beginner',
    cover_image_url: '',
    status: 'draft',
  });

  const [activeLanguage, setActiveLanguage] = useState('en');
  const [showDevotionPicker, setShowDevotionPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customDuration, setCustomDuration] = useState(false);

  // Fetch all devotions for the day picker (with multi-tenant cache isolation)
  const { data: devotionsData } = useExploreContentList('daily_devotion', { limit: 200 });
  const availableDevotions = devotionsData?.items || devotionsData || [];

  // Fetch existing plan if editing (with multi-tenant cache isolation)
  const { data: plan, isLoading } = useExploreContent('devotion_plan', isEditMode ? id : null);

  // Create and update mutations with multi-tenant cache isolation
  const createMutation = useCreateExploreContent('devotion_plan');
  const updateMutation = useUpdateExploreContent('devotion_plan');
  const saveMutation = isEditMode ? updateMutation : createMutation;

  // Populate form when data loads
  useEffect(() => {
    if (plan && isEditMode) {
      setFormData({
        title: plan.title || { en: '', id: '' },
        description: plan.description || { en: '', id: '' },
        duration_days: plan.duration_days || 7,
        days: plan.days || [],
        categories: plan.categories || [],
        difficulty: plan.difficulty || 'beginner',
        cover_image_url: plan.cover_image_url || '',
        status: plan.status || 'draft',
      });

      // Check if duration is a custom value
      if (!DURATION_PRESETS.find(p => p.value === plan.duration_days)) {
        setCustomDuration(true);
      }
    }
  }, [plan, isEditMode]);

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

  const handleDurationChange = (value) => {
    const numValue = parseInt(value);
    if (numValue === 0) {
      setCustomDuration(true);
    } else {
      setCustomDuration(false);
      handleInputChange('duration_days', numValue);
    }
  };

  const toggleCategory = (category) => {
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter(c => c !== category)
        : [...prev.categories, category]
    }));
  };

  const addDevotion = (devotionId) => {
    if (!formData.days.includes(devotionId)) {
      setFormData(prev => ({
        ...prev,
        days: [...prev.days, devotionId]
      }));
    }
  };

  const removeDevotion = (index) => {
    setFormData(prev => ({
      ...prev,
      days: prev.days.filter((_, i) => i !== index)
    }));
  };

  const moveDevotion = (fromIndex, toIndex) => {
    const newDays = [...formData.days];
    const [removed] = newDays.splice(fromIndex, 1);
    newDays.splice(toIndex, 0, removed);
    setFormData(prev => ({ ...prev, days: newDays }));
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

    if (!formData.description.en.trim()) {
      toast({
        title: 'Validation Error',
        description: 'English description is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.duration_days < 1) {
      toast({
        title: 'Validation Error',
        description: 'Duration must be at least 1 day',
        variant: 'destructive',
      });
      return;
    }

    if (isEditMode) {
      updateMutation.mutate({ contentId: id, data: formData }, {
        onSuccess: () => navigate('/content-center/devotion-plan')
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => navigate('/content-center/devotion-plan')
      });
    }
  };

  // Filter devotions for picker
  const filteredDevotions = availableDevotions.filter(devotion => {
    if (!searchQuery) return true;
    const title = devotion.title?.en || devotion.title || '';
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Get devotion details by ID
  const getDevotionById = (id) => {
    return availableDevotions.find(d => d.id === id || d._id === id);
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
            to="/content-center/devotion-plan"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Devotion Plans
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Devotion Plan' : 'Create Devotion Plan'}
          </h1>
        </div>

        <div className="flex items-center gap-2">
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
        {/* Plan Title */}
        <Card>
          <CardHeader>
            <CardTitle>Plan Title</CardTitle>
            <CardDescription>A compelling title for your devotion plan</CardDescription>
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
                    placeholder="e.g., 21 Days of Prayer, Journey Through Psalms"
                    required
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
                    placeholder="misal: 21 Hari Doa, Perjalanan Melalui Mazmur"
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Plan Description */}
        <Card>
          <CardHeader>
            <CardTitle>Description</CardTitle>
            <CardDescription>Describe what users will learn and experience</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
              <TabsList className="mb-4">
                <TabsTrigger value="en">English</TabsTrigger>
                <TabsTrigger value="id">Indonesian</TabsTrigger>
              </TabsList>

              <TabsContent value="en" className="space-y-4">
                <div>
                  <Label htmlFor="description-en">Description (English) *</Label>
                  <Textarea
                    id="description-en"
                    value={formData.description.en}
                    onChange={(e) => handleInputChange('description', e.target.value, 'en')}
                    placeholder="Describe the theme, goals, and what participants will gain from this devotion plan"
                    rows={6}
                    required
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="space-y-4">
                <div>
                  <Label htmlFor="description-id">Deskripsi (Indonesian)</Label>
                  <Textarea
                    id="description-id"
                    value={formData.description.id}
                    onChange={(e) => handleInputChange('description', e.target.value, 'id')}
                    placeholder="Jelaskan tema, tujuan, dan apa yang akan peserta dapatkan dari rencana devosi ini"
                    rows={6}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Duration & Difficulty */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Duration & Difficulty
            </CardTitle>
            <CardDescription>Set the length and difficulty level of the plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <Label>Duration</Label>
                <Select
                  value={customDuration ? '0' : String(formData.duration_days)}
                  onValueChange={handleDurationChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_PRESETS.map((preset) => (
                      <SelectItem key={preset.value} value={String(preset.value)}>
                        {preset.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {customDuration && (
                  <div className="mt-2">
                    <Input
                      type="number"
                      min={1}
                      max={365}
                      value={formData.duration_days}
                      onChange={(e) => handleInputChange('duration_days', parseInt(e.target.value) || 1)}
                      placeholder="Enter number of days"
                    />
                  </div>
                )}
              </div>

              <div>
                <Label>Difficulty Level</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => handleInputChange('difficulty', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <span className="font-medium">{option.label}</span>
                          <span className="text-gray-500 ml-2">- {option.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <Calendar className="h-4 w-4 inline mr-1" />
                This plan will run for <strong>{formData.duration_days} day{formData.duration_days !== 1 ? 's' : ''}</strong>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <CardDescription>Tag this plan with relevant topics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {CATEGORY_OPTIONS.map((category) => (
                <Badge
                  key={category}
                  variant={formData.categories.includes(category) ? 'default' : 'outline'}
                  className="cursor-pointer py-2 px-3"
                  onClick={() => toggleCategory(category)}
                >
                  {formData.categories.includes(category) && (
                    <Check className="h-3 w-3 mr-1" />
                  )}
                  {category}
                </Badge>
              ))}
            </div>

            {formData.categories.length > 0 && (
              <p className="mt-4 text-sm text-gray-500">
                {formData.categories.length} categor{formData.categories.length === 1 ? 'y' : 'ies'} selected
              </p>
            )}
          </CardContent>
        </Card>

        {/* Daily Devotions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Daily Devotions ({formData.days.length}/{formData.duration_days})
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowDevotionPicker(true)}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Devotion
              </Button>
            </CardTitle>
            <CardDescription>
              Add and arrange devotions for each day of the plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            {formData.days.length === 0 ? (
              <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-lg">
                <BookOpen className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-500 mb-2">No devotions added yet</p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowDevotionPicker(true)}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Your First Devotion
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {formData.days.map((devotionId, index) => {
                  const devotion = getDevotionById(devotionId);
                  return (
                    <div
                      key={`${devotionId}-${index}`}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-200"
                    >
                      <div className="text-gray-400">
                        <GripVertical className="h-5 w-5" />
                      </div>
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600 font-bold">
                        {index + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">
                          {devotion?.title?.en || devotion?.title || 'Unknown Devotion'}
                        </p>
                        <p className="text-sm text-gray-500">Day {index + 1}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {index > 0 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveDevotion(index, index - 1)}
                          >
                            Move Up
                          </Button>
                        )}
                        {index < formData.days.length - 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => moveDevotion(index, index + 1)}
                          >
                            Move Down
                          </Button>
                        )}
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeDevotion(index)}
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {formData.days.length > 0 && formData.days.length < formData.duration_days && (
              <p className="mt-4 text-sm text-amber-600">
                You have {formData.duration_days - formData.days.length} more day{formData.duration_days - formData.days.length !== 1 ? 's' : ''} to fill
              </p>
            )}
          </CardContent>
        </Card>

        {/* Cover Image */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="h-5 w-5" />
              Cover Image
            </CardTitle>
            <CardDescription>Add a cover image for the plan card</CardDescription>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="cover-image">Image URL</Label>
              <Input
                id="cover-image"
                value={formData.cover_image_url}
                onChange={(e) => handleInputChange('cover_image_url', e.target.value)}
                placeholder="https://example.com/cover-image.jpg"
              />
              {formData.cover_image_url && (
                <div className="mt-3">
                  <img
                    src={formData.cover_image_url}
                    alt="Cover preview"
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

        {/* Publishing */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>Control visibility of this plan</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="status">Published</Label>
                <p className="text-sm text-gray-500">Make this plan visible to users</p>
              </div>
              <Switch
                id="status"
                checked={formData.status === 'published'}
                onCheckedChange={(checked) => handleInputChange('status', checked ? 'published' : 'draft')}
              />
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/content-center/devotion-plan')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? 'Update Plan' : 'Create Plan'}
          </Button>
        </div>
      </form>

      {/* Devotion Picker Modal */}
      {showDevotionPicker && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Add Devotion</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDevotionPicker(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search devotions..."
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredDevotions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No devotions found</p>
                  <Link to="/content-center/devotion/new" className="text-blue-600 hover:underline">
                    Create a devotion first
                  </Link>
                </div>
              ) : (
                filteredDevotions.map((devotion) => {
                  const isAdded = formData.days.includes(devotion.id || devotion._id);
                  return (
                    <div
                      key={devotion.id || devotion._id}
                      className={`p-4 rounded-lg border cursor-pointer transition-all ${
                        isAdded
                          ? 'bg-green-50 border-green-200'
                          : 'hover:bg-gray-50 border-gray-200'
                      }`}
                      onClick={() => !isAdded && addDevotion(devotion.id || devotion._id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{devotion.title?.en || devotion.title || 'Untitled'}</p>
                          <p className="text-sm text-gray-500 mt-1">
                            {devotion.summary?.en?.substring(0, 100) || 'No description'}...
                          </p>
                        </div>
                        {isAdded ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            <Check className="h-3 w-3 mr-1" />
                            Added
                          </Badge>
                        ) : (
                          <Button variant="outline" size="sm">
                            <Plus className="h-4 w-4 mr-1" />
                            Add
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-end">
              <Button onClick={() => setShowDevotionPicker(false)}>
                Done ({formData.days.length} selected)
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
