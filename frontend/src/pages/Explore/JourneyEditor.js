import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  ArrowLeft, Save, Eye, Loader2, Plus, Trash2, GripVertical,
  ChevronUp, ChevronDown, Map, Calendar, BookOpen, ChevronRight
} from 'lucide-react';
import { useJourney, useCreateJourney, useUpdateJourney } from '../../hooks/useExplore';
import { useToast } from '../../hooks/use-toast';

// Journey category options
const categoryOptions = [
  { value: 'life_transition', label: 'Life Transitions' },
  { value: 'spiritual_growth', label: 'Spiritual Growth' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'emotional_health', label: 'Emotional Health' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'foundation', label: 'Faith Foundation' },
];

// Icon options
const iconOptions = [
  { value: 'heart', label: 'Heart' },
  { value: 'sprout', label: 'Sprout' },
  { value: 'cloud-sun', label: 'Cloud Sun' },
  { value: 'briefcase', label: 'Briefcase' },
  { value: 'heart-handshake', label: 'Heart Handshake' },
  { value: 'flame', label: 'Flame' },
  { value: 'users', label: 'Users' },
  { value: 'crown', label: 'Crown' },
  { value: 'book', label: 'Book' },
  { value: 'compass', label: 'Compass' },
];

// Color options
const colorOptions = [
  { value: '#8B5CF6', label: 'Purple' },
  { value: '#10B981', label: 'Green' },
  { value: '#0EA5E9', label: 'Sky Blue' },
  { value: '#F59E0B', label: 'Amber' },
  { value: '#EC4899', label: 'Pink' },
  { value: '#EF4444', label: 'Red' },
  { value: '#06B6D4', label: 'Cyan' },
  { value: '#6366F1', label: 'Indigo' },
];

// Empty day template
const createEmptyDay = (dayNumber) => ({
  day_number: dayNumber,
  title: { en: '', id: '' },
  focus: { en: '', id: '' },
  main_scripture: { book: '', chapter: 1, verses: '' },
  devotion_content: { en: '', id: '' },
  reflection_questions: { en: [], id: [] },
  application: { en: '', id: '' },
  prayer_prompt: { en: '', id: '' },
  estimated_minutes: 10,
});

// Empty week template
const createEmptyWeek = (weekNumber) => ({
  week_number: weekNumber,
  title: { en: '', id: '' },
  description: { en: '', id: '' },
  focus_theme: '',
  days: [createEmptyDay(1)],
  completion_message: { en: '', id: '' },
});

export default function JourneyEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    slug: '',
    title: { en: '', id: '' },
    subtitle: { en: '', id: '' },
    description: { en: '', id: '' },
    target_situation: '',
    target_description: { en: '', id: '' },
    duration_weeks: 4,
    category: 'spiritual_growth',
    difficulty: 'beginner',
    icon: 'heart',
    color: '#6366F1',
    cover_image_url: '',
    tags: [],
    weeks: [createEmptyWeek(1)],
    status: 'draft',
  });

  const [activeLanguage, setActiveLanguage] = useState('en');
  const [expandedWeek, setExpandedWeek] = useState(0);
  const [expandedDay, setExpandedDay] = useState(null);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [tagInput, setTagInput] = useState('');

  // Fetch existing journey if editing
  const { data: journey, isLoading } = useJourney(isEditMode ? id : null);

  // Mutations
  const createMutation = useCreateJourney();
  const updateMutation = useUpdateJourney();

  const saveMutation = isEditMode ? updateMutation : createMutation;

  // Hydrate form when data loads
  useEffect(() => {
    if (journey) {
      setFormData({
        slug: journey.slug || '',
        title: journey.title || { en: '', id: '' },
        subtitle: journey.subtitle || { en: '', id: '' },
        description: journey.description || { en: '', id: '' },
        target_situation: journey.target_situation || '',
        target_description: journey.target_description || { en: '', id: '' },
        duration_weeks: journey.duration_weeks || 4,
        category: journey.category || 'spiritual_growth',
        difficulty: journey.difficulty || 'beginner',
        icon: journey.icon || 'heart',
        color: journey.color || '#6366F1',
        cover_image_url: journey.cover_image_url || '',
        tags: journey.tags || [],
        weeks: journey.weeks || [createEmptyWeek(1)],
        status: journey.status || 'draft',
      });
    }
  }, [journey]);

  // Generate slug from title
  const generateSlug = (title) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleInputChange = (field, value, language = null) => {
    if (language) {
      setFormData(prev => ({
        ...prev,
        [field]: {
          ...prev[field],
          [language]: value
        }
      }));
      // Auto-generate slug from English title
      if (field === 'title' && language === 'en' && !isEditMode) {
        setFormData(prev => ({
          ...prev,
          slug: generateSlug(value),
        }));
      }
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Week management
  const addWeek = () => {
    const newWeek = createEmptyWeek(formData.weeks.length + 1);
    setFormData(prev => ({
      ...prev,
      weeks: [...prev.weeks, newWeek],
      duration_weeks: prev.weeks.length + 1,
    }));
    setExpandedWeek(formData.weeks.length);
  };

  const removeWeek = (weekIndex) => {
    setItemToDelete({ type: 'week', index: weekIndex });
  };

  const confirmDelete = () => {
    if (!itemToDelete) return;

    if (itemToDelete.type === 'week') {
      setFormData(prev => ({
        ...prev,
        weeks: prev.weeks
          .filter((_, i) => i !== itemToDelete.index)
          .map((week, i) => ({ ...week, week_number: i + 1 })),
        duration_weeks: prev.weeks.length - 1,
      }));
      setExpandedWeek(null);
    } else if (itemToDelete.type === 'day') {
      const { weekIndex, dayIndex } = itemToDelete;
      setFormData(prev => ({
        ...prev,
        weeks: prev.weeks.map((week, wi) => {
          if (wi !== weekIndex) return week;
          return {
            ...week,
            days: week.days
              .filter((_, di) => di !== dayIndex)
              .map((day, di) => ({ ...day, day_number: di + 1 })),
          };
        }),
      }));
    }

    setItemToDelete(null);
  };

  const updateWeek = (weekIndex, field, value, language = null) => {
    setFormData(prev => ({
      ...prev,
      weeks: prev.weeks.map((week, i) => {
        if (i !== weekIndex) return week;
        if (language) {
          return {
            ...week,
            [field]: {
              ...week[field],
              [language]: value
            }
          };
        }
        return { ...week, [field]: value };
      }),
    }));
  };

  // Day management
  const addDay = (weekIndex) => {
    const week = formData.weeks[weekIndex];
    const newDay = createEmptyDay(week.days.length + 1);

    setFormData(prev => ({
      ...prev,
      weeks: prev.weeks.map((w, i) => {
        if (i !== weekIndex) return w;
        return { ...w, days: [...w.days, newDay] };
      }),
    }));
    setExpandedDay({ weekIndex, dayIndex: week.days.length });
  };

  const removeDay = (weekIndex, dayIndex) => {
    setItemToDelete({ type: 'day', weekIndex, dayIndex });
  };

  const updateDay = (weekIndex, dayIndex, field, value, language = null) => {
    setFormData(prev => ({
      ...prev,
      weeks: prev.weeks.map((week, wi) => {
        if (wi !== weekIndex) return week;
        return {
          ...week,
          days: week.days.map((day, di) => {
            if (di !== dayIndex) return day;
            if (language) {
              return {
                ...day,
                [field]: {
                  ...day[field],
                  [language]: value
                }
              };
            }
            return { ...day, [field]: value };
          }),
        };
      }),
    }));
  };

  const updateDayScripture = (weekIndex, dayIndex, field, value) => {
    setFormData(prev => ({
      ...prev,
      weeks: prev.weeks.map((week, wi) => {
        if (wi !== weekIndex) return week;
        return {
          ...week,
          days: week.days.map((day, di) => {
            if (di !== dayIndex) return day;
            return {
              ...day,
              main_scripture: {
                ...day.main_scripture,
                [field]: value
              }
            };
          }),
        };
      }),
    }));
  };

  // Tag management
  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tag) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  // Calculate total days
  const totalDays = formData.weeks.reduce((sum, week) => sum + week.days.length, 0);

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

    if (!formData.slug.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Slug is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.weeks.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one week is required',
        variant: 'destructive',
      });
      return;
    }

    const processedData = {
      ...formData,
      total_days: totalDays,
    };

    if (isEditMode) {
      updateMutation.mutate({ journeyId: id, data: processedData }, {
        onSuccess: () => navigate('/content-center/journey')
      });
    } else {
      createMutation.mutate(processedData, {
        onSuccess: () => navigate('/content-center/journey')
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/content-center/journey">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Life Stage Journey' : 'Create Life Stage Journey'}
            </h1>
            <p className="text-gray-600">
              Multi-week spiritual program for specific life situations
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/public/explore/journey/${formData.slug}`, '_blank')}
            disabled={!isEditMode || !formData.slug}
          >
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button onClick={handleSubmit} disabled={saveMutation.isPending}>
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
        {/* Language Tabs */}
        <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
          <TabsList>
            <TabsTrigger value="en">English</TabsTrigger>
            <TabsTrigger value="id">Indonesian</TabsTrigger>
          </TabsList>

          {/* Basic Info Card */}
          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Journey title, description, and target audience</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Slug (URL) *</Label>
                  <Input
                    value={formData.slug}
                    onChange={(e) => handleInputChange('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    placeholder="e.g., grief-recovery"
                    disabled={isEditMode}
                  />
                  <p className="text-xs text-gray-500">
                    URL: /explore/journeys/{formData.slug || 'your-slug'}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Target Situation</Label>
                  <Input
                    value={formData.target_situation}
                    onChange={(e) => handleInputChange('target_situation', e.target.value)}
                    placeholder="e.g., grief, anxiety, career_transition"
                  />
                </div>
              </div>

              <TabsContent value="en" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Title (English) *</Label>
                  <Input
                    value={formData.title.en}
                    onChange={(e) => handleInputChange('title', e.target.value, 'en')}
                    placeholder="e.g., Grief Recovery Journey"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle (English)</Label>
                  <Input
                    value={formData.subtitle.en}
                    onChange={(e) => handleInputChange('subtitle', e.target.value, 'en')}
                    placeholder="e.g., Finding hope and healing after loss"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (English) *</Label>
                  <Textarea
                    value={formData.description.en}
                    onChange={(e) => handleInputChange('description', e.target.value, 'en')}
                    placeholder="Detailed description of this journey..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Audience (English)</Label>
                  <Textarea
                    value={formData.target_description.en}
                    onChange={(e) => handleInputChange('target_description', e.target.value, 'en')}
                    placeholder="Who is this journey for..."
                    rows={2}
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Title (Indonesian)</Label>
                  <Input
                    value={formData.title.id}
                    onChange={(e) => handleInputChange('title', e.target.value, 'id')}
                    placeholder="e.g., Perjalanan Pemulihan Dukacita"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle (Indonesian)</Label>
                  <Input
                    value={formData.subtitle.id}
                    onChange={(e) => handleInputChange('subtitle', e.target.value, 'id')}
                    placeholder="e.g., Menemukan harapan dan pemulihan"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Indonesian)</Label>
                  <Textarea
                    value={formData.description.id}
                    onChange={(e) => handleInputChange('description', e.target.value, 'id')}
                    placeholder="Deskripsi perjalanan ini..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Audience (Indonesian)</Label>
                  <Textarea
                    value={formData.target_description.id}
                    onChange={(e) => handleInputChange('target_description', e.target.value, 'id')}
                    placeholder="Untuk siapa perjalanan ini..."
                    rows={2}
                  />
                </div>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        {/* Settings Card */}
        <Card>
          <CardHeader>
            <CardTitle>Journey Settings</CardTitle>
            <CardDescription>Category, difficulty, and visual appearance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => handleInputChange('category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Difficulty</Label>
                <Select
                  value={formData.difficulty}
                  onValueChange={(value) => handleInputChange('difficulty', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Icon</Label>
                <Select
                  value={formData.icon}
                  onValueChange={(value) => handleInputChange('icon', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map(icon => (
                      <SelectItem key={icon.value} value={icon.value}>
                        {icon.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Color</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => handleInputChange('color', value)}
                >
                  <SelectTrigger>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: formData.color }}
                      />
                      <SelectValue />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: color.value }}
                          />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => handleInputChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cover Image URL</Label>
                <Input
                  value={formData.cover_image_url}
                  onChange={(e) => handleInputChange('cover_image_url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex gap-2">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  placeholder="Add a tag..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addTag}>
                  Add
                </Button>
              </div>
              {formData.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-sm rounded-full"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="hover:text-red-600"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Summary stats */}
            <div className="flex gap-6 pt-4 border-t text-sm text-gray-600">
              <div>
                <span className="font-semibold">{formData.weeks.length}</span> weeks
              </div>
              <div>
                <span className="font-semibold">{totalDays}</span> days total
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weeks Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Weeks ({formData.weeks.length})
                </CardTitle>
                <CardDescription>Define the weekly structure and daily content</CardDescription>
              </div>
              <Button type="button" onClick={addWeek}>
                <Plus className="h-4 w-4 mr-2" />
                Add Week
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.weeks.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                <Map className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No weeks defined yet</p>
                <Button type="button" variant="link" onClick={addWeek}>
                  Add your first week
                </Button>
              </div>
            ) : (
              formData.weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="border rounded-lg overflow-hidden">
                  {/* Week Header */}
                  <div
                    className="flex items-center gap-3 p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedWeek(expandedWeek === weekIndex ? null : weekIndex)}
                  >
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <div className="flex-1">
                      <span className="font-medium text-gray-600 mr-2">Week {week.week_number}:</span>
                      <span className="font-semibold">
                        {week.title[activeLanguage] || week.title.en || 'Untitled Week'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {week.days.length} {week.days.length === 1 ? 'day' : 'days'}
                    </span>
                    <ChevronRight
                      className={`h-5 w-5 text-gray-400 transition-transform ${
                        expandedWeek === weekIndex ? 'rotate-90' : ''
                      }`}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); removeWeek(weekIndex); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Week Content (Expanded) */}
                  {expandedWeek === weekIndex && (
                    <div className="p-4 space-y-4 border-t">
                      {/* Week Fields */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Week Title ({activeLanguage.toUpperCase()})</Label>
                          <Input
                            value={week.title[activeLanguage]}
                            onChange={(e) => updateWeek(weekIndex, 'title', e.target.value, activeLanguage)}
                            placeholder="e.g., Understanding Grief"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Focus Theme</Label>
                          <Input
                            value={week.focus_theme}
                            onChange={(e) => updateWeek(weekIndex, 'focus_theme', e.target.value)}
                            placeholder="e.g., acknowledging_grief"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label>Week Description ({activeLanguage.toUpperCase()})</Label>
                        <Textarea
                          value={week.description[activeLanguage]}
                          onChange={(e) => updateWeek(weekIndex, 'description', e.target.value, activeLanguage)}
                          placeholder="Overview of this week..."
                          rows={2}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Completion Message ({activeLanguage.toUpperCase()})</Label>
                        <Textarea
                          value={week.completion_message[activeLanguage]}
                          onChange={(e) => updateWeek(weekIndex, 'completion_message', e.target.value, activeLanguage)}
                          placeholder="Congratulations message when week is completed..."
                          rows={2}
                        />
                      </div>

                      {/* Days Section */}
                      <div className="pt-4 border-t">
                        <div className="flex items-center justify-between mb-3">
                          <Label className="text-base font-semibold flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            Days ({week.days.length})
                          </Label>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => addDay(weekIndex)}
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Add Day
                          </Button>
                        </div>

                        <div className="space-y-2">
                          {week.days.map((day, dayIndex) => (
                            <div
                              key={dayIndex}
                              className="border rounded-lg"
                            >
                              {/* Day Header */}
                              <div
                                className="flex items-center gap-2 p-3 bg-white cursor-pointer hover:bg-gray-50"
                                onClick={() => setExpandedDay(
                                  expandedDay?.weekIndex === weekIndex && expandedDay?.dayIndex === dayIndex
                                    ? null
                                    : { weekIndex, dayIndex }
                                )}
                              >
                                <span className="text-sm font-medium text-gray-500 w-16">
                                  Day {day.day_number}
                                </span>
                                <span className="flex-1 text-sm">
                                  {day.title[activeLanguage] || day.title.en || 'Untitled'}
                                </span>
                                <span className="text-xs text-gray-400">
                                  {day.estimated_minutes} min
                                </span>
                                <ChevronRight
                                  className={`h-4 w-4 text-gray-400 transition-transform ${
                                    expandedDay?.weekIndex === weekIndex && expandedDay?.dayIndex === dayIndex
                                      ? 'rotate-90'
                                      : ''
                                  }`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={(e) => { e.stopPropagation(); removeDay(weekIndex, dayIndex); }}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>

                              {/* Day Content */}
                              {expandedDay?.weekIndex === weekIndex && expandedDay?.dayIndex === dayIndex && (
                                <div className="p-4 space-y-4 border-t bg-gray-50">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                      <Label>Day Title ({activeLanguage.toUpperCase()})</Label>
                                      <Input
                                        value={day.title[activeLanguage]}
                                        onChange={(e) => updateDay(weekIndex, dayIndex, 'title', e.target.value, activeLanguage)}
                                        placeholder="e.g., Acknowledging Your Loss"
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Focus ({activeLanguage.toUpperCase()})</Label>
                                      <Input
                                        value={day.focus[activeLanguage]}
                                        onChange={(e) => updateDay(weekIndex, dayIndex, 'focus', e.target.value, activeLanguage)}
                                        placeholder="Brief focus statement"
                                      />
                                    </div>
                                  </div>

                                  {/* Scripture Reference */}
                                  <div className="space-y-2">
                                    <Label>Main Scripture</Label>
                                    <div className="grid grid-cols-3 gap-2">
                                      <Input
                                        value={day.main_scripture.book}
                                        onChange={(e) => updateDayScripture(weekIndex, dayIndex, 'book', e.target.value)}
                                        placeholder="Book (e.g., Psalms)"
                                      />
                                      <Input
                                        type="number"
                                        value={day.main_scripture.chapter}
                                        onChange={(e) => updateDayScripture(weekIndex, dayIndex, 'chapter', parseInt(e.target.value) || 1)}
                                        placeholder="Chapter"
                                        min={1}
                                      />
                                      <Input
                                        value={day.main_scripture.verses}
                                        onChange={(e) => updateDayScripture(weekIndex, dayIndex, 'verses', e.target.value)}
                                        placeholder="Verses (e.g., 1-6)"
                                      />
                                    </div>
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Devotion Content ({activeLanguage.toUpperCase()})</Label>
                                    <Textarea
                                      value={day.devotion_content[activeLanguage]}
                                      onChange={(e) => updateDay(weekIndex, dayIndex, 'devotion_content', e.target.value, activeLanguage)}
                                      placeholder="Main devotional content (Markdown supported)..."
                                      rows={6}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Application ({activeLanguage.toUpperCase()})</Label>
                                    <Textarea
                                      value={day.application[activeLanguage]}
                                      onChange={(e) => updateDay(weekIndex, dayIndex, 'application', e.target.value, activeLanguage)}
                                      placeholder="Practical application..."
                                      rows={2}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Prayer Prompt ({activeLanguage.toUpperCase()})</Label>
                                    <Textarea
                                      value={day.prayer_prompt[activeLanguage]}
                                      onChange={(e) => updateDay(weekIndex, dayIndex, 'prayer_prompt', e.target.value, activeLanguage)}
                                      placeholder="Prayer guidance..."
                                      rows={2}
                                    />
                                  </div>

                                  <div className="space-y-2">
                                    <Label>Estimated Duration (minutes)</Label>
                                    <Input
                                      type="number"
                                      value={day.estimated_minutes}
                                      onChange={(e) => updateDay(weekIndex, dayIndex, 'estimated_minutes', parseInt(e.target.value) || 10)}
                                      min={5}
                                      max={60}
                                      className="w-24"
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-2">
          <Link to="/content-center/journey">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? 'Update Journey' : 'Create Journey'}
          </Button>
        </div>
      </form>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={itemToDelete !== null} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {itemToDelete?.type === 'week' ? 'Week' : 'Day'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. All content in this {itemToDelete?.type} will be removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
