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
import { Checkbox } from '../../components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, Save, Eye, Loader2, BookOpen, Tags, Sparkles
} from 'lucide-react';
import { useExploreContent, useExploreContentList, useCreateExploreContent, useUpdateExploreContent, useGenerateExploreContent } from '../../hooks/useExplore';
import { useToast } from '../../hooks/use-toast';

// Bible book list
const BIBLE_BOOKS = [
  // Old Testament
  'Genesis', 'Exodus', 'Leviticus', 'Numbers', 'Deuteronomy',
  'Joshua', 'Judges', 'Ruth', '1 Samuel', '2 Samuel',
  '1 Kings', '2 Kings', '1 Chronicles', '2 Chronicles',
  'Ezra', 'Nehemiah', 'Esther', 'Job', 'Psalms', 'Proverbs',
  'Ecclesiastes', 'Song of Solomon', 'Isaiah', 'Jeremiah',
  'Lamentations', 'Ezekiel', 'Daniel', 'Hosea', 'Joel',
  'Amos', 'Obadiah', 'Jonah', 'Micah', 'Nahum', 'Habakkuk',
  'Zephaniah', 'Haggai', 'Zechariah', 'Malachi',
  // New Testament
  'Matthew', 'Mark', 'Luke', 'John', 'Acts',
  'Romans', '1 Corinthians', '2 Corinthians', 'Galatians',
  'Ephesians', 'Philippians', 'Colossians',
  '1 Thessalonians', '2 Thessalonians', '1 Timothy', '2 Timothy',
  'Titus', 'Philemon', 'Hebrews', 'James',
  '1 Peter', '2 Peter', '1 John', '2 John', '3 John',
  'Jude', 'Revelation'
];

const TRANSLATIONS = [
  { value: 'NIV', label: 'NIV - New International Version' },
  { value: 'ESV', label: 'ESV - English Standard Version' },
  { value: 'NLT', label: 'NLT - New Living Translation' },
  { value: 'NKJV', label: 'NKJV - New King James Version' },
  { value: 'TB', label: 'TB - Terjemahan Baru (Indonesian)' },
];

export default function TopicalVerseEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();

  const isEditMode = id && id !== 'new';

  // Form state
  const [formData, setFormData] = useState({
    verse: {
      book: 'John',
      chapter: 3,
      verse_start: 16,
      verse_end: null,
      translation: 'NIV',
    },
    category_ids: [],
    commentary: { en: '', id: '' },
    application: { en: '', id: '' },
    status: 'published',
  });

  const [activeLanguage, setActiveLanguage] = useState('en');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all categories for selection (with multi-tenant cache isolation)
  const { data: categoriesData } = useExploreContentList('topical_category', { limit: 100, status: 'published' });
  const categories = categoriesData?.items || categoriesData || [];

  // Fetch existing verse if editing (with multi-tenant cache isolation)
  const { data: verse, isLoading } = useExploreContent('topical_verse', isEditMode ? id : null);

  // Create and update mutations with multi-tenant cache isolation
  const createMutation = useCreateExploreContent('topical_verse');
  const updateMutation = useUpdateExploreContent('topical_verse');
  const saveMutation = isEditMode ? updateMutation : createMutation;

  // AI generation mutation
  const generateMutation = useGenerateExploreContent();

  // Populate form when data loads
  useEffect(() => {
    if (verse && isEditMode) {
      setFormData({
        verse: verse.verse || {
          book: 'John',
          chapter: 3,
          verse_start: 16,
          verse_end: null,
          translation: 'NIV',
        },
        category_ids: verse.category_ids || [],
        commentary: verse.commentary || { en: '', id: '' },
        application: verse.application || { en: '', id: '' },
        status: verse.status || 'published',
      });
    }
  }, [verse, isEditMode]);

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

  const handleVerseChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      verse: {
        ...prev.verse,
        [field]: value
      }
    }));
  };

  const toggleCategory = (categoryId) => {
    setFormData(prev => ({
      ...prev,
      category_ids: prev.category_ids.includes(categoryId)
        ? prev.category_ids.filter(id => id !== categoryId)
        : [...prev.category_ids, categoryId]
    }));
  };

  const handleGenerateCommentary = async () => {
    if (!formData.verse.book || !formData.verse.chapter || !formData.verse.verse_start) {
      toast({
        title: 'Error',
        description: 'Please enter a valid Bible reference first',
        variant: 'destructive',
      });
      return;
    }

    setIsGenerating(true);
    const reference = `${formData.verse.book} ${formData.verse.chapter}:${formData.verse.verse_start}${formData.verse.verse_end ? `-${formData.verse.verse_end}` : ''}`;

    generateMutation.mutate({
      content_type: 'topical_verse',
      reference,
      translation: formData.verse.translation,
    }, {
      onSuccess: (result) => {
        if (result?.commentary) {
          setFormData(prev => ({
            ...prev,
            commentary: result.commentary,
            application: result.application || prev.application,
          }));
          toast({
            title: 'Generated!',
            description: 'Commentary has been generated by AI',
          });
        }
        setIsGenerating(false);
      },
      onError: (error) => {
        toast({
          title: 'Generation Failed',
          description: error.message || 'Could not generate commentary',
          variant: 'destructive',
        });
        setIsGenerating(false);
      }
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!formData.verse.book || !formData.verse.chapter || !formData.verse.verse_start) {
      toast({
        title: 'Validation Error',
        description: 'Bible reference is required',
        variant: 'destructive',
      });
      return;
    }

    if (formData.category_ids.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Please select at least one category',
        variant: 'destructive',
      });
      return;
    }

    if (isEditMode) {
      updateMutation.mutate({ contentId: id, data: formData }, {
        onSuccess: () => navigate('/content-center/topical/verses')
      });
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => navigate('/content-center/topical/verses')
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  const verseReference = `${formData.verse.book} ${formData.verse.chapter}:${formData.verse.verse_start}${formData.verse.verse_end ? `-${formData.verse.verse_end}` : ''}`;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/content-center/topical/verses"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Topical Verses
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            {isEditMode ? 'Edit Topical Verse' : 'Add Topical Verse'}
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
        {/* Bible Reference */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Bible Reference
            </CardTitle>
            <CardDescription>Enter the scripture reference</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="col-span-2">
                <Label>Book</Label>
                <Select
                  value={formData.verse.book}
                  onValueChange={(value) => handleVerseChange('book', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select book" />
                  </SelectTrigger>
                  <SelectContent>
                    {BIBLE_BOOKS.map((book) => (
                      <SelectItem key={book} value={book}>
                        {book}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Chapter</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.verse.chapter}
                  onChange={(e) => handleVerseChange('chapter', parseInt(e.target.value) || 1)}
                />
              </div>

              <div>
                <Label>Verse Start</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.verse.verse_start}
                  onChange={(e) => handleVerseChange('verse_start', parseInt(e.target.value) || 1)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Verse End (optional)</Label>
                <Input
                  type="number"
                  min={formData.verse.verse_start}
                  value={formData.verse.verse_end || ''}
                  onChange={(e) => handleVerseChange('verse_end', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="For verse ranges"
                />
              </div>

              <div>
                <Label>Translation</Label>
                <Select
                  value={formData.verse.translation}
                  onValueChange={(value) => handleVerseChange('translation', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TRANSLATIONS.map((trans) => (
                      <SelectItem key={trans.value} value={trans.value}>
                        {trans.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-500">Reference Preview:</p>
              <p className="font-semibold text-lg">{verseReference}</p>
            </div>
          </CardContent>
        </Card>

        {/* Categories */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="h-5 w-5" />
              Categories
            </CardTitle>
            <CardDescription>Select one or more topical categories for this verse</CardDescription>
          </CardHeader>
          <CardContent>
            {categories.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No categories found.</p>
                <Link to="/content-center/topical/category/new" className="text-blue-600 hover:underline">
                  Create a category first
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {categories.map((category) => (
                  <div
                    key={category.id}
                    onClick={() => toggleCategory(category.id)}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      formData.category_ids.includes(category.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
                        style={{ backgroundColor: category.color || '#3B82F6' }}
                      >
                        <span className="text-xs">{(category.name?.en || category.name)?.[0] || '?'}</span>
                      </div>
                      <div>
                        <p className="font-medium text-sm">{category.name?.en || category.name || 'Unnamed'}</p>
                      </div>
                      <div className="ml-auto">
                        <Checkbox
                          checked={formData.category_ids.includes(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {formData.category_ids.length > 0 && (
              <p className="mt-4 text-sm text-gray-500">
                {formData.category_ids.length} categor{formData.category_ids.length === 1 ? 'y' : 'ies'} selected
              </p>
            )}
          </CardContent>
        </Card>

        {/* Commentary & Application */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Commentary & Application</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateCommentary}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Generate with AI
              </Button>
            </CardTitle>
            <CardDescription>Provide theological explanation and practical application</CardDescription>
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
                    placeholder="Explain the meaning, context, and significance of this verse"
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="application-en">Application (English)</Label>
                  <Textarea
                    id="application-en"
                    value={formData.application.en}
                    onChange={(e) => handleInputChange('application', e.target.value, 'en')}
                    placeholder="How can readers apply this verse to their daily lives?"
                    rows={4}
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
                    placeholder="Jelaskan arti, konteks, dan signifikansi ayat ini"
                    rows={6}
                  />
                </div>
                <div>
                  <Label htmlFor="application-id">Aplikasi (Indonesian)</Label>
                  <Textarea
                    id="application-id"
                    value={formData.application.id}
                    onChange={(e) => handleInputChange('application', e.target.value, 'id')}
                    placeholder="Bagaimana pembaca dapat menerapkan ayat ini dalam kehidupan sehari-hari?"
                    rows={4}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Publishing */}
        <Card>
          <CardHeader>
            <CardTitle>Publishing</CardTitle>
            <CardDescription>Control visibility of this verse</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="status">Published</Label>
                <p className="text-sm text-gray-500">Make this verse visible to users</p>
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
            onClick={() => navigate('/content-center/topical/verses')}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={saveMutation.isPending}>
            {saveMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditMode ? 'Update Verse' : 'Add Verse'}
          </Button>
        </div>
      </form>
    </div>
  );
}
