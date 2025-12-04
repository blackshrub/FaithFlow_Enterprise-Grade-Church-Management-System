import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, Save, Loader2, Plus, Trash2, BookOpen, Calendar,
  Sparkles, Info, Music, ChevronRight
} from 'lucide-react';
import {
  useSermon, useCreateSermon, useUpdateSermon, useSermonThemes, useWeeklyContentPlan
} from '../../hooks/useExplore';
import { useToast } from '../../hooks/use-toast';

// Theme categories
const themeCategories = {
  core: [
    { id: 'faith', label: 'Faith & Trust' },
    { id: 'hope', label: 'Hope' },
    { id: 'love', label: 'Love & Compassion' },
    { id: 'peace', label: 'Peace' },
    { id: 'joy', label: 'Joy' },
    { id: 'grace', label: 'Grace & Mercy' },
  ],
  growth: [
    { id: 'prayer', label: 'Prayer' },
    { id: 'worship', label: 'Worship' },
    { id: 'scripture', label: 'Scripture Study' },
    { id: 'discipleship', label: 'Discipleship' },
    { id: 'spiritual_growth', label: 'Spiritual Growth' },
    { id: 'holy_spirit', label: 'Holy Spirit' },
  ],
  life: [
    { id: 'family', label: 'Family' },
    { id: 'marriage', label: 'Marriage' },
    { id: 'parenting', label: 'Parenting' },
    { id: 'work', label: 'Work & Calling' },
    { id: 'finances', label: 'Stewardship' },
    { id: 'relationships', label: 'Relationships' },
  ],
  challenges: [
    { id: 'suffering', label: 'Suffering & Trials' },
    { id: 'anxiety', label: 'Fear & Anxiety' },
    { id: 'forgiveness', label: 'Forgiveness' },
    { id: 'healing', label: 'Healing' },
    { id: 'grief', label: 'Grief & Loss' },
    { id: 'temptation', label: 'Temptation' },
  ],
  mission: [
    { id: 'evangelism', label: 'Evangelism' },
    { id: 'service', label: 'Service & Giving' },
    { id: 'community', label: 'Community' },
    { id: 'justice', label: 'Justice & Mercy' },
    { id: 'mission', label: 'Mission' },
  ],
};

// Integration mode options
const integrationModes = [
  {
    value: 'full',
    label: 'Full Integration',
    description: 'Sermon themes deeply influence all daily content (devotions, verses, quizzes)'
  },
  {
    value: 'partial',
    label: 'Partial Integration',
    description: 'Light thematic connection - themes inform but don\'t dominate content'
  },
  {
    value: 'disabled',
    label: 'Disabled',
    description: 'No integration - daily content is independent of sermon'
  },
];

// Empty scripture template
const createEmptyScripture = () => ({
  book: '',
  chapter: 1,
  verses: '',
});

export default function SermonEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Get next Sunday
  const getNextSunday = () => {
    const today = new Date();
    const daysUntilSunday = (7 - today.getDay()) % 7 || 7;
    const nextSunday = new Date(today);
    nextSunday.setDate(today.getDate() + daysUntilSunday);
    return nextSunday.toISOString().split('T')[0];
  };

  // Form state
  const [formData, setFormData] = useState({
    title: { en: '', id: '' },
    date: getNextSunday(),
    preacher: '',
    series_name: { en: '', id: '' },
    main_scripture: createEmptyScripture(),
    supporting_scriptures: [],
    primary_theme: '',
    secondary_themes: [],
    custom_themes: [],
    keywords: [],
    key_points: { en: [], id: [] },
    integration_mode: 'full',
    include_sunday_recap: false,
  });

  const [activeLanguage, setActiveLanguage] = useState('en');
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [keywordInput, setKeywordInput] = useState('');
  const [keyPointInput, setKeyPointInput] = useState('');
  const [showContentPlan, setShowContentPlan] = useState(false);

  // Fetch existing sermon if editing
  const { data: sermon, isLoading } = useSermon(isEditMode ? id : null);
  const { data: themesData } = useSermonThemes();

  // Mutations
  const createMutation = useCreateSermon();
  const updateMutation = useUpdateSermon();

  const saveMutation = isEditMode ? updateMutation : createMutation;

  // Fetch content plan when saved
  const { data: contentPlan, isLoading: planLoading } = useWeeklyContentPlan(
    isEditMode && showContentPlan ? id : null
  );

  // Hydrate form when data loads
  useEffect(() => {
    if (sermon) {
      setFormData({
        title: sermon.title || { en: '', id: '' },
        date: sermon.date || getNextSunday(),
        preacher: sermon.preacher || '',
        series_name: sermon.series_name || { en: '', id: '' },
        main_scripture: sermon.main_scripture || createEmptyScripture(),
        supporting_scriptures: sermon.supporting_scriptures || [],
        primary_theme: sermon.primary_theme || '',
        secondary_themes: sermon.secondary_themes || [],
        custom_themes: sermon.custom_themes || [],
        keywords: sermon.keywords || [],
        key_points: sermon.key_points || { en: [], id: [] },
        integration_mode: sermon.integration_mode || 'full',
        include_sunday_recap: sermon.include_sunday_recap || false,
      });
    }
  }, [sermon]);

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

  // Scripture management
  const handleScriptureChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      main_scripture: {
        ...prev.main_scripture,
        [field]: value
      }
    }));
  };

  const addSupportingScripture = () => {
    setFormData(prev => ({
      ...prev,
      supporting_scriptures: [...prev.supporting_scriptures, createEmptyScripture()]
    }));
  };

  const updateSupportingScripture = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      supporting_scriptures: prev.supporting_scriptures.map((s, i) =>
        i === index ? { ...s, [field]: value } : s
      )
    }));
  };

  const removeSupportingScripture = (index) => {
    setFormData(prev => ({
      ...prev,
      supporting_scriptures: prev.supporting_scriptures.filter((_, i) => i !== index)
    }));
  };

  // Theme management
  const toggleSecondaryTheme = (themeId) => {
    setFormData(prev => ({
      ...prev,
      secondary_themes: prev.secondary_themes.includes(themeId)
        ? prev.secondary_themes.filter(t => t !== themeId)
        : [...prev.secondary_themes, themeId]
    }));
  };

  const addCustomTheme = () => {
    if (customThemeInput.trim() && !formData.custom_themes.includes(customThemeInput.trim())) {
      setFormData(prev => ({
        ...prev,
        custom_themes: [...prev.custom_themes, customThemeInput.trim()]
      }));
      setCustomThemeInput('');
    }
  };

  const removeCustomTheme = (theme) => {
    setFormData(prev => ({
      ...prev,
      custom_themes: prev.custom_themes.filter(t => t !== theme)
    }));
  };

  // Keywords management
  const addKeyword = () => {
    if (keywordInput.trim() && !formData.keywords.includes(keywordInput.trim())) {
      setFormData(prev => ({
        ...prev,
        keywords: [...prev.keywords, keywordInput.trim()]
      }));
      setKeywordInput('');
    }
  };

  const removeKeyword = (keyword) => {
    setFormData(prev => ({
      ...prev,
      keywords: prev.keywords.filter(k => k !== keyword)
    }));
  };

  // Key points management
  const addKeyPoint = () => {
    if (keyPointInput.trim()) {
      setFormData(prev => ({
        ...prev,
        key_points: {
          ...prev.key_points,
          [activeLanguage]: [...(prev.key_points[activeLanguage] || []), keyPointInput.trim()]
        }
      }));
      setKeyPointInput('');
    }
  };

  const removeKeyPoint = (index) => {
    setFormData(prev => ({
      ...prev,
      key_points: {
        ...prev.key_points,
        [activeLanguage]: prev.key_points[activeLanguage].filter((_, i) => i !== index)
      }
    }));
  };

  // Validate date is a Sunday
  const validateSunday = (dateStr) => {
    const date = new Date(dateStr);
    return date.getDay() === 0; // 0 = Sunday
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

    if (!formData.date) {
      toast({
        title: 'Validation Error',
        description: 'Sermon date is required',
        variant: 'destructive',
      });
      return;
    }

    if (!validateSunday(formData.date)) {
      toast({
        title: 'Validation Error',
        description: 'Sermon date must be a Sunday',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.primary_theme) {
      toast({
        title: 'Validation Error',
        description: 'Please select a primary theme',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.main_scripture.book || !formData.main_scripture.verses) {
      toast({
        title: 'Validation Error',
        description: 'Main scripture reference is required',
        variant: 'destructive',
      });
      return;
    }

    if (isEditMode) {
      updateMutation.mutate({ sermonId: id, data: formData }, {
        onSuccess: () => navigate('/content-center/sermons')
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => navigate('/content-center/sermons')
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

  // Get all themes for primary selection
  const allThemes = Object.values(themeCategories).flat();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/content-center/sermons">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Sermon' : 'Add Sunday Sermon'}
            </h1>
            <p className="text-gray-600">
              Input sermon details to integrate themes into weekly Explore content
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditMode && (
            <Button
              variant="outline"
              onClick={() => setShowContentPlan(!showContentPlan)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              {showContentPlan ? 'Hide' : 'View'} Content Plan
            </Button>
          )}
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

      <form onSubmit={handleSubmit} className="grid gap-6 lg:grid-cols-3">
        {/* Main Content - 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          {/* Language Tabs */}
          <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
            <TabsList>
              <TabsTrigger value="en">English</TabsTrigger>
              <TabsTrigger value="id">Indonesian</TabsTrigger>
            </TabsList>

            {/* Basic Info Card */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Music className="h-5 w-5" />
                  Sermon Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Date (Sunday) *</Label>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => handleInputChange('date', e.target.value)}
                    />
                    {formData.date && !validateSunday(formData.date) && (
                      <p className="text-xs text-red-500">Must be a Sunday</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Preacher</Label>
                    <Input
                      value={formData.preacher}
                      onChange={(e) => handleInputChange('preacher', e.target.value)}
                      placeholder="e.g., Pastor John"
                    />
                  </div>
                </div>

                <TabsContent value="en" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Sermon Title (English) *</Label>
                    <Input
                      value={formData.title.en}
                      onChange={(e) => handleInputChange('title', e.target.value, 'en')}
                      placeholder="e.g., Finding Peace in the Storm"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Series Name (English)</Label>
                    <Input
                      value={formData.series_name.en}
                      onChange={(e) => handleInputChange('series_name', e.target.value, 'en')}
                      placeholder="e.g., Faith Over Fear"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="id" className="mt-0 space-y-4">
                  <div className="space-y-2">
                    <Label>Sermon Title (Indonesian)</Label>
                    <Input
                      value={formData.title.id}
                      onChange={(e) => handleInputChange('title', e.target.value, 'id')}
                      placeholder="e.g., Menemukan Damai di Tengah Badai"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Series Name (Indonesian)</Label>
                    <Input
                      value={formData.series_name.id}
                      onChange={(e) => handleInputChange('series_name', e.target.value, 'id')}
                      placeholder="e.g., Iman di Atas Ketakutan"
                    />
                  </div>
                </TabsContent>
              </CardContent>
            </Card>
          </Tabs>

          {/* Scripture References */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Scripture References
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Main Scripture */}
              <div className="space-y-2">
                <Label>Main Scripture *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Input
                    value={formData.main_scripture.book}
                    onChange={(e) => handleScriptureChange('book', e.target.value)}
                    placeholder="Book (e.g., Matthew)"
                  />
                  <Input
                    type="number"
                    value={formData.main_scripture.chapter}
                    onChange={(e) => handleScriptureChange('chapter', parseInt(e.target.value) || 1)}
                    placeholder="Chapter"
                    min={1}
                  />
                  <Input
                    value={formData.main_scripture.verses}
                    onChange={(e) => handleScriptureChange('verses', e.target.value)}
                    placeholder="Verses (e.g., 1-8)"
                  />
                </div>
              </div>

              {/* Supporting Scriptures */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Supporting Scriptures</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSupportingScripture}>
                    <Plus className="h-3 w-3 mr-1" />
                    Add
                  </Button>
                </div>
                {formData.supporting_scriptures.length > 0 && (
                  <div className="space-y-2">
                    {formData.supporting_scriptures.map((scripture, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <Input
                          value={scripture.book}
                          onChange={(e) => updateSupportingScripture(index, 'book', e.target.value)}
                          placeholder="Book"
                          className="flex-1"
                        />
                        <Input
                          type="number"
                          value={scripture.chapter}
                          onChange={(e) => updateSupportingScripture(index, 'chapter', parseInt(e.target.value) || 1)}
                          placeholder="Ch"
                          className="w-20"
                          min={1}
                        />
                        <Input
                          value={scripture.verses}
                          onChange={(e) => updateSupportingScripture(index, 'verses', e.target.value)}
                          placeholder="Verses"
                          className="w-24"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeSupportingScripture(index)}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Key Points */}
          <Card>
            <CardHeader>
              <CardTitle>Key Points ({activeLanguage.toUpperCase()})</CardTitle>
              <CardDescription>Main takeaways from the sermon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Input
                  value={keyPointInput}
                  onChange={(e) => setKeyPointInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyPoint())}
                  placeholder="Add a key point..."
                  className="flex-1"
                />
                <Button type="button" variant="outline" onClick={addKeyPoint}>
                  Add
                </Button>
              </div>
              {(formData.key_points[activeLanguage] || []).length > 0 && (
                <ul className="space-y-2">
                  {formData.key_points[activeLanguage].map((point, index) => (
                    <li key={index} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="flex-1">{point}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeKeyPoint(index)}
                        className="h-6 w-6 text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-6">
          {/* Themes Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Themes
              </CardTitle>
              <CardDescription>
                Select primary and secondary themes for content integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Primary Theme */}
              <div className="space-y-2">
                <Label>Primary Theme *</Label>
                <Select
                  value={formData.primary_theme}
                  onValueChange={(value) => handleInputChange('primary_theme', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select primary theme" />
                  </SelectTrigger>
                  <SelectContent>
                    {allThemes.map(theme => (
                      <SelectItem key={theme.id} value={theme.id}>
                        {theme.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Secondary Themes */}
              <div className="space-y-2">
                <Label>Secondary Themes</Label>
                <div className="max-h-48 overflow-y-auto border rounded-lg p-3 space-y-3">
                  {Object.entries(themeCategories).map(([category, themes]) => (
                    <div key={category}>
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-1">
                        {category}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {themes.map(theme => (
                          <Badge
                            key={theme.id}
                            variant={formData.secondary_themes.includes(theme.id) ? 'default' : 'outline'}
                            className={`cursor-pointer text-xs ${
                              formData.primary_theme === theme.id ? 'opacity-50' : ''
                            }`}
                            onClick={() => {
                              if (formData.primary_theme !== theme.id) {
                                toggleSecondaryTheme(theme.id);
                              }
                            }}
                          >
                            {theme.label}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom Themes */}
              <div className="space-y-2">
                <Label>Custom Themes</Label>
                <div className="flex gap-2">
                  <Input
                    value={customThemeInput}
                    onChange={(e) => setCustomThemeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTheme())}
                    placeholder="Add custom theme..."
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addCustomTheme}>
                    Add
                  </Button>
                </div>
                {formData.custom_themes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.custom_themes.map((theme) => (
                      <Badge
                        key={theme}
                        variant="secondary"
                        className="cursor-pointer"
                        onClick={() => removeCustomTheme(theme)}
                      >
                        {theme} &times;
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Keywords */}
              <div className="space-y-2">
                <Label>Keywords</Label>
                <div className="flex gap-2">
                  <Input
                    value={keywordInput}
                    onChange={(e) => setKeywordInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword())}
                    placeholder="Add keyword..."
                    className="flex-1"
                  />
                  <Button type="button" variant="outline" size="sm" onClick={addKeyword}>
                    Add
                  </Button>
                </div>
                {formData.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {formData.keywords.map((keyword) => (
                      <Badge
                        key={keyword}
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => removeKeyword(keyword)}
                      >
                        {keyword} &times;
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Integration Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Content Integration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Integration Mode</Label>
                <Select
                  value={formData.integration_mode}
                  onValueChange={(value) => handleInputChange('integration_mode', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {integrationModes.map(mode => (
                      <SelectItem key={mode.value} value={mode.value}>
                        <div>
                          <div className="font-medium">{mode.label}</div>
                          <div className="text-xs text-gray-500">{mode.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="sunday_recap"
                  checked={formData.include_sunday_recap}
                  onCheckedChange={(checked) => handleInputChange('include_sunday_recap', checked)}
                />
                <Label htmlFor="sunday_recap" className="text-sm font-normal cursor-pointer">
                  Include Sunday Recap devotion
                </Label>
              </div>

              {formData.integration_mode !== 'disabled' && (
                <div className="p-3 bg-blue-50 rounded-lg text-sm">
                  <p className="flex items-center gap-2 font-medium text-blue-800">
                    <Info className="h-4 w-4" />
                    Content Integration Active
                  </p>
                  <p className="text-blue-600 mt-1">
                    Daily devotions, verses, and quizzes will incorporate "{formData.primary_theme || 'selected theme'}" themes throughout the week.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </form>

      {/* Content Plan Preview */}
      {showContentPlan && isEditMode && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Content Plan
            </CardTitle>
            <CardDescription>
              How sermon themes will be integrated into this week's content
            </CardDescription>
          </CardHeader>
          <CardContent>
            {planLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : contentPlan ? (
              <div className="space-y-4">
                <div className="grid grid-cols-7 gap-2">
                  {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => {
                    const dayPlan = contentPlan.daily_plan?.[day.toLowerCase()];
                    return (
                      <div key={day} className="text-center">
                        <div className="text-xs font-medium text-gray-500 mb-1">{day}</div>
                        <div className={`p-2 rounded-lg border ${
                          i === 0 ? 'bg-blue-50 border-blue-200' : 'bg-white'
                        }`}>
                          <div className="text-xs">
                            {dayPlan?.theme || '-'}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <p className="text-sm text-gray-500 text-center">
                  Content will be generated based on these themes and integrated with the sermon message.
                </p>
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">
                Save the sermon first to see the content plan
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
