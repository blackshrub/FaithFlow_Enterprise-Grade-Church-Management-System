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
import { Switch } from '../../components/ui/switch';
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
  ArrowLeft, Save, Eye, Loader2, Plus, Trash2, GripVertical, ChevronUp, ChevronDown, BookOpen
} from 'lucide-react';
import { useExploreContent, useCreateExploreContent, useUpdateExploreContent } from '../../hooks/useExplore';
import { useToast } from '../../hooks/use-toast';

export default function BibleStudyEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    title: { en: '', id: '' },
    subtitle: { en: '', id: '' },
    description: { en: '', id: '' },
    introduction: { en: '', id: '' },
    target_audience: { en: '', id: '' },
    author: { en: '', id: '' },
    author_title: { en: '', id: '' },
    main_passage: {
      book: '',
      chapter: 1,
      verse_start: 1,
      verse_end: null,
      translation: 'NIV',
    },
    lessons: [],
    categories: [],
    category: '',
    difficulty: 'beginner',
    cover_image_url: '',
    estimated_duration_minutes: 15,
    status: 'draft',
    scope: 'global',
  });

  const [activeLanguage, setActiveLanguage] = useState('en');
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [lessonToDelete, setLessonToDelete] = useState(null);

  // Categories list
  const categoryOptions = [
    { value: 'old_testament', label: 'Old Testament' },
    { value: 'new_testament', label: 'New Testament' },
    { value: 'topical', label: 'Topical' },
    { value: 'prayer', label: 'Prayer' },
    { value: 'faith', label: 'Faith' },
    { value: 'leadership', label: 'Leadership' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'spiritual_growth', label: 'Spiritual Growth' },
  ];

  // Fetch existing study if editing (with multi-tenant cache isolation)
  const { data: study, isLoading } = useExploreContent('bible_study', isEditMode ? id : null);

  // Create and update mutations with multi-tenant cache isolation
  const createMutation = useCreateExploreContent('bible_study');
  const updateMutation = useUpdateExploreContent('bible_study');

  // Hydrate form when data loads
  useEffect(() => {
    if (study) {
      setFormData({
        title: study.title || { en: '', id: '' },
        subtitle: study.subtitle || { en: '', id: '' },
        description: study.description || { en: '', id: '' },
        introduction: study.introduction || { en: '', id: '' },
        target_audience: study.target_audience || { en: '', id: '' },
        author: study.author || { en: '', id: '' },
        author_title: study.author_title || { en: '', id: '' },
        main_passage: study.main_passage || {
          book: '',
          chapter: 1,
          verse_start: 1,
          verse_end: null,
          translation: 'NIV',
        },
        lessons: study.lessons || [],
        categories: study.categories || [],
        category: study.category || '',
        difficulty: study.difficulty || 'beginner',
        cover_image_url: study.cover_image_url || '',
        estimated_duration_minutes: study.estimated_duration_minutes || 15,
        status: study.status || 'draft',
        scope: study.scope || 'global',
      });
    }
  }, [study]);

  // Helper to process data before saving
  const processFormData = (data) => ({
    ...data,
    lesson_count: data.lessons.length,
    estimated_duration_minutes: data.lessons.reduce((sum, lesson) => sum + (lesson.duration_minutes || 10), 0),
  });

  // For backwards compatibility with existing code that uses saveMutation.isPending
  const saveMutation = isEditMode ? updateMutation : createMutation;

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

  const handlePassageChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      main_passage: {
        ...prev.main_passage,
        [field]: value
      }
    }));
  };

  // Lesson management
  const addLesson = () => {
    const newLesson = {
      id: `lesson_${Date.now()}`,
      title: { en: '', id: '' },
      content: { en: '', id: '' },
      summary: { en: '', id: '' },
      scripture_references: [],
      discussion_questions: { en: [], id: [] },
      application: { en: '', id: '' },
      key_takeaways: [],
      prayer: { en: '', id: '' },
      duration_minutes: 10,
      order: formData.lessons.length,
    };
    setFormData(prev => ({
      ...prev,
      lessons: [...prev.lessons, newLesson]
    }));
    setExpandedLesson(formData.lessons.length);
  };

  const updateLesson = (index, field, value, language = null) => {
    setFormData(prev => {
      const lessons = [...prev.lessons];
      if (language) {
        lessons[index] = {
          ...lessons[index],
          [field]: {
            ...lessons[index][field],
            [language]: value
          }
        };
      } else {
        lessons[index] = {
          ...lessons[index],
          [field]: value
        };
      }
      return { ...prev, lessons };
    });
  };

  const removeLesson = (index) => {
    setLessonToDelete(index);
  };

  const confirmDeleteLesson = () => {
    if (lessonToDelete !== null) {
      setFormData(prev => ({
        ...prev,
        lessons: prev.lessons.filter((_, i) => i !== lessonToDelete).map((lesson, i) => ({ ...lesson, order: i }))
      }));
      setExpandedLesson(null);
      setLessonToDelete(null);
    }
  };

  const moveLesson = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= formData.lessons.length) return;

    setFormData(prev => {
      const lessons = [...prev.lessons];
      const temp = lessons[index];
      lessons[index] = lessons[newIndex];
      lessons[newIndex] = temp;
      // Update order numbers
      return {
        ...prev,
        lessons: lessons.map((lesson, i) => ({ ...lesson, order: i }))
      };
    });
    setExpandedLesson(newIndex);
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

    if (formData.lessons.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one lesson is required',
        variant: 'destructive',
      });
      return;
    }

    const processedData = processFormData(formData);
    if (isEditMode) {
      updateMutation.mutate({ contentId: id, data: processedData }, {
        onSuccess: () => navigate('/content-center/bible-study')
      });
    } else {
      createMutation.mutate(processedData, {
        onSuccess: () => navigate('/content-center/bible-study')
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
          <Link to="/content-center/bible-study">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? 'Edit Bible Study' : 'Create Bible Study'}
            </h1>
            <p className="text-gray-600">
              Create a multi-lesson Bible study course
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => window.open(`/public/explore/bible_study/${id}`, '_blank')}
            disabled={!isEditMode}
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
              <CardDescription>Study title, description, and overview</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <TabsContent value="en" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Title (English) *</Label>
                  <Input
                    value={formData.title.en}
                    onChange={(e) => handleInputChange('title', e.target.value, 'en')}
                    placeholder="e.g., The Armor of God: Standing Firm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle (English)</Label>
                  <Input
                    value={formData.subtitle.en}
                    onChange={(e) => handleInputChange('subtitle', e.target.value, 'en')}
                    placeholder="e.g., A 7-Day Journey Through Ephesians 6"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (English) *</Label>
                  <Textarea
                    value={formData.description.en}
                    onChange={(e) => handleInputChange('description', e.target.value, 'en')}
                    placeholder="Brief description of what this study covers..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Introduction (English)</Label>
                  <Textarea
                    value={formData.introduction.en}
                    onChange={(e) => handleInputChange('introduction', e.target.value, 'en')}
                    placeholder="What users will learn from this study..."
                    rows={4}
                  />
                </div>
              </TabsContent>

              <TabsContent value="id" className="mt-0 space-y-4">
                <div className="space-y-2">
                  <Label>Title (Indonesian)</Label>
                  <Input
                    value={formData.title.id}
                    onChange={(e) => handleInputChange('title', e.target.value, 'id')}
                    placeholder="e.g., Perlengkapan Senjata Allah"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subtitle (Indonesian)</Label>
                  <Input
                    value={formData.subtitle.id}
                    onChange={(e) => handleInputChange('subtitle', e.target.value, 'id')}
                    placeholder="e.g., Perjalanan 7 Hari Melalui Efesus 6"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description (Indonesian)</Label>
                  <Textarea
                    value={formData.description.id}
                    onChange={(e) => handleInputChange('description', e.target.value, 'id')}
                    placeholder="Deskripsi singkat tentang studi ini..."
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Introduction (Indonesian)</Label>
                  <Textarea
                    value={formData.introduction.id}
                    onChange={(e) => handleInputChange('introduction', e.target.value, 'id')}
                    placeholder="Apa yang akan dipelajari pengguna..."
                    rows={4}
                  />
                </div>
              </TabsContent>
            </CardContent>
          </Card>
        </Tabs>

        {/* Study Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Study Settings</CardTitle>
            <CardDescription>Category, difficulty, and main passage</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            </div>

            <div className="space-y-2">
              <Label>Main Bible Passage</Label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <Input
                  value={formData.main_passage.book}
                  onChange={(e) => handlePassageChange('book', e.target.value)}
                  placeholder="Book (e.g., Ephesians)"
                />
                <Input
                  type="number"
                  value={formData.main_passage.chapter}
                  onChange={(e) => handlePassageChange('chapter', parseInt(e.target.value) || 1)}
                  placeholder="Chapter"
                  min={1}
                />
                <Input
                  type="number"
                  value={formData.main_passage.verse_start}
                  onChange={(e) => handlePassageChange('verse_start', parseInt(e.target.value) || 1)}
                  placeholder="Start verse"
                  min={1}
                />
                <Input
                  type="number"
                  value={formData.main_passage.verse_end || ''}
                  onChange={(e) => handlePassageChange('verse_end', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="End verse"
                  min={1}
                />
                <Select
                  value={formData.main_passage.translation}
                  onValueChange={(value) => handlePassageChange('translation', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NIV">NIV</SelectItem>
                    <SelectItem value="ESV">ESV</SelectItem>
                    <SelectItem value="NLT">NLT</SelectItem>
                    <SelectItem value="NKJV">NKJV</SelectItem>
                    <SelectItem value="TB">TB (Indonesian)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input
                value={formData.cover_image_url}
                onChange={(e) => handleInputChange('cover_image_url', e.target.value)}
                placeholder="https://..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Author Name</Label>
                <Input
                  value={formData.author[activeLanguage]}
                  onChange={(e) => handleInputChange('author', e.target.value, activeLanguage)}
                  placeholder="e.g., Pastor John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label>Author Title</Label>
                <Input
                  value={formData.author_title[activeLanguage]}
                  onChange={(e) => handleInputChange('author_title', e.target.value, activeLanguage)}
                  placeholder="e.g., Senior Pastor"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lessons */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Lessons ({formData.lessons.length})
                </CardTitle>
                <CardDescription>Add lessons for this Bible study course</CardDescription>
              </div>
              <Button type="button" onClick={addLesson}>
                <Plus className="h-4 w-4 mr-2" />
                Add Lesson
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.lessons.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>No lessons yet</p>
                <Button type="button" variant="link" onClick={addLesson}>
                  Add your first lesson
                </Button>
              </div>
            ) : (
              formData.lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="border rounded-lg overflow-hidden"
                >
                  {/* Lesson Header */}
                  <div
                    className="flex items-center gap-3 p-4 bg-gray-50 cursor-pointer hover:bg-gray-100"
                    onClick={() => setExpandedLesson(expandedLesson === index ? null : index)}
                  >
                    <GripVertical className="h-5 w-5 text-gray-400" />
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); moveLesson(index, -1); }}
                        disabled={index === 0}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={(e) => { e.stopPropagation(); moveLesson(index, 1); }}
                        disabled={index === formData.lessons.length - 1}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-gray-600 mr-2">Lesson {index + 1}:</span>
                      <span className="font-semibold">
                        {lesson.title[activeLanguage] || lesson.title.en || 'Untitled'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {lesson.duration_minutes} min
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={(e) => { e.stopPropagation(); removeLesson(index); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Lesson Content (Expanded) */}
                  {expandedLesson === index && (
                    <div className="p-4 space-y-4 border-t">
                      <Tabs value={activeLanguage} onValueChange={setActiveLanguage}>
                        <TabsList className="mb-4">
                          <TabsTrigger value="en">English</TabsTrigger>
                          <TabsTrigger value="id">Indonesian</TabsTrigger>
                        </TabsList>

                        <TabsContent value="en" className="space-y-4">
                          <div className="space-y-2">
                            <Label>Lesson Title (English) *</Label>
                            <Input
                              value={lesson.title.en}
                              onChange={(e) => updateLesson(index, 'title', e.target.value, 'en')}
                              placeholder="e.g., The Belt of Truth"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Lesson Content (English) *</Label>
                            <Textarea
                              value={lesson.content.en}
                              onChange={(e) => updateLesson(index, 'content', e.target.value, 'en')}
                              placeholder="Main lesson content (Markdown supported)..."
                              rows={8}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Summary (English)</Label>
                            <Textarea
                              value={lesson.summary?.en || ''}
                              onChange={(e) => updateLesson(index, 'summary', e.target.value, 'en')}
                              placeholder="Brief summary of this lesson..."
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Application (English)</Label>
                            <Textarea
                              value={lesson.application?.en || ''}
                              onChange={(e) => updateLesson(index, 'application', e.target.value, 'en')}
                              placeholder="How to apply this lesson..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Prayer (English)</Label>
                            <Textarea
                              value={lesson.prayer?.en || ''}
                              onChange={(e) => updateLesson(index, 'prayer', e.target.value, 'en')}
                              placeholder="Closing prayer for this lesson..."
                              rows={3}
                            />
                          </div>
                        </TabsContent>

                        <TabsContent value="id" className="space-y-4">
                          <div className="space-y-2">
                            <Label>Lesson Title (Indonesian)</Label>
                            <Input
                              value={lesson.title.id}
                              onChange={(e) => updateLesson(index, 'title', e.target.value, 'id')}
                              placeholder="e.g., Ikat Pinggang Kebenaran"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Lesson Content (Indonesian)</Label>
                            <Textarea
                              value={lesson.content.id}
                              onChange={(e) => updateLesson(index, 'content', e.target.value, 'id')}
                              placeholder="Konten pelajaran utama (Markdown didukung)..."
                              rows={8}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Summary (Indonesian)</Label>
                            <Textarea
                              value={lesson.summary?.id || ''}
                              onChange={(e) => updateLesson(index, 'summary', e.target.value, 'id')}
                              placeholder="Ringkasan singkat pelajaran ini..."
                              rows={2}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Application (Indonesian)</Label>
                            <Textarea
                              value={lesson.application?.id || ''}
                              onChange={(e) => updateLesson(index, 'application', e.target.value, 'id')}
                              placeholder="Bagaimana menerapkan pelajaran ini..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Prayer (Indonesian)</Label>
                            <Textarea
                              value={lesson.prayer?.id || ''}
                              onChange={(e) => updateLesson(index, 'prayer', e.target.value, 'id')}
                              placeholder="Doa penutup untuk pelajaran ini..."
                              rows={3}
                            />
                          </div>
                        </TabsContent>
                      </Tabs>

                      <div className="space-y-2">
                        <Label>Duration (minutes)</Label>
                        <Input
                          type="number"
                          value={lesson.duration_minutes}
                          onChange={(e) => updateLesson(index, 'duration_minutes', parseInt(e.target.value) || 10)}
                          min={1}
                          max={120}
                          className="w-32"
                        />
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
          <Link to="/content-center/bible-study">
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
            {isEditMode ? 'Update Study' : 'Create Study'}
          </Button>
        </div>
      </form>

      {/* Delete Lesson Confirmation Dialog */}
      <AlertDialog open={lessonToDelete !== null} onOpenChange={(open) => !open && setLessonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('explore.actions.delete')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('explore.confirmations.deleteContent')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteLesson}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('explore.actions.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
