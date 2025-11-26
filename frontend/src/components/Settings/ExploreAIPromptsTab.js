import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import {
  Loader2,
  Save,
  Plus,
  Pencil,
  Trash2,
  Wand2,
  Copy,
  Check,
  AlertCircle,
  BookOpen,
  MessageSquare,
  HelpCircle,
  User,
  FileText,
} from 'lucide-react';
import api from '../../services/api';

// Content types that support AI prompts
const CONTENT_TYPES = [
  { value: 'daily_devotion', label: 'Daily Devotion', icon: BookOpen },
  { value: 'verse_commentary', label: 'Verse Commentary', icon: MessageSquare },
  { value: 'bible_figure', label: 'Bible Figure', icon: User },
  { value: 'quiz_questions', label: 'Quiz Questions', icon: HelpCircle },
  { value: 'bible_study', label: 'Bible Study', icon: FileText },
  { value: 'topical_verse', label: 'Topical Verse', icon: BookOpen },
  { value: 'devotion_plan', label: 'Devotion Plan', icon: FileText },
];

const LANGUAGES = [
  { value: 'en', label: 'English' },
  { value: 'id', label: 'Indonesian' },
];

// Default prompts for reference
const DEFAULT_PROMPTS = {
  daily_devotion: {
    en: `You are a Christian devotional writer creating inspiring daily devotions.

Create a daily devotion with the following characteristics:
- Length: 300-500 words
- Tone: Warm, encouraging, relatable
- Style: Conversational yet reverent
- Focus: Practical application of biblical truth to daily life

Main verse: $main_verse
Theme: $theme
Target audience: $audience

Structure:
1. Opening: Brief story or relatable scenario
2. Scripture exploration: Unpack the meaning of the main verse
3. Application: How does this apply to daily life?
4. Closing prayer or reflection prompt

Please write in markdown format with clear sections. Be authentic and avoid clichés.`,
    variables: ['main_verse', 'theme', 'audience'],
  },
  verse_commentary: {
    en: `You are a biblical scholar providing accessible commentary on Scripture.

Write a brief commentary on the following verse:
Verse: $verse_text
Reference: $verse_reference

Guidelines:
- Length: 100-150 words
- Explain the context (historical, cultural, literary)
- Highlight the key message
- Provide one practical application
- Write for a general Christian audience
- Avoid technical jargon

Be clear, concise, and encouraging.`,
    variables: ['verse_text', 'verse_reference'],
  },
  bible_figure: {
    en: `You are a biblical historian writing engaging profiles of biblical figures.

Create a profile for: $figure_name

Include:
1. Summary (100 words): Who they were, their role
2. Full Story (400-600 words): Their journey, key events, challenges
3. Key Lessons (3-5 bullet points): What we can learn
4. Key Verses: List 3-5 important scripture references

Guidelines:
- Write engagingly but accurately
- Highlight their humanity (strengths AND weaknesses)
- Draw practical lessons for modern readers
- Use markdown formatting
- Cite scripture references clearly

Make it inspiring and educational.`,
    variables: ['figure_name'],
  },
  quiz_questions: {
    en: `You are a Christian educator creating engaging Bible knowledge quizzes.

Generate $num_questions multiple-choice questions about: $topic

For each question:
- Provide 4 options (A, B, C, D)
- Mark the correct answer
- Provide a brief explanation (50 words)
- Include scripture reference if applicable
- Vary difficulty: $difficulty

Guidelines:
- Make questions clear and unambiguous
- Avoid trick questions
- Test understanding, not just memorization
- Include context in questions when needed
- Make explanations educational

Format as JSON array.`,
    variables: ['num_questions', 'topic', 'difficulty'],
  },
  bible_study: {
    en: `You are a Christian educator creating in-depth Bible studies.

Create a Bible study on: $topic
Main passage: $passage

Structure:
1. Introduction (100 words): Overview and why this matters
2. Context (150 words): Historical, cultural, and literary background
3. Verse-by-verse Analysis (400-600 words): Deep dive into the passage
4. Key Themes (3-5 bullet points): Main theological concepts
5. Application Questions (3-5 questions): For personal reflection or group discussion
6. Prayer: Closing prayer related to the study

Guidelines:
- Write for small group or personal study
- Balance scholarship with accessibility
- Encourage deeper thinking
- Provide practical application
- Use markdown formatting with clear sections

Make it transformative.`,
    variables: ['topic', 'passage'],
  },
  topical_verse: {
    en: `You are a biblical scholar curating verses by topic for daily encouragement.

Topic: $topic
Category: $category

Provide a verse collection with the following:
1. Main Verse: Select the most impactful verse for this topic
2. Supporting Verses: 3-5 additional related verses
3. Reflection (100-150 words): Brief meditation on how these verses connect
4. Prayer Points: 2-3 specific prayer applications
5. Practical Application: One actionable step for today

For each verse include:
- Full verse text
- Scripture reference (Book Chapter:Verse)
- Brief context note (1 sentence)

Guidelines:
- Select verses from different parts of Scripture (OT/NT variety)
- Choose translations that are accessible
- Focus on verses that speak directly to the topic
- Include both comfort and challenge
- Make connections between the verses clear

Output in JSON format with structured fields.`,
    variables: ['topic', 'category'],
  },
  devotion_plan: {
    en: `You are a Christian devotional planner creating multi-day spiritual growth plans.

Plan Title: $title
Theme: $theme
Duration: $duration days
Target Audience: $audience

Create a devotion plan with the following structure:

Overview:
- Title and description (50 words)
- Main scripture passage for the plan
- Expected outcomes (3 bullet points)

For each day, provide:
1. Day Title: Engaging subtitle
2. Main Verse: Key scripture for the day
3. Reading: Bible passage to read (2-5 chapters)
4. Devotional Content (200-300 words):
   - Opening hook
   - Scripture exploration
   - Life application
5. Reflection Questions: 2-3 thought-provoking questions
6. Prayer Prompt: Specific prayer focus
7. Action Step: One practical application

Guidelines:
- Build progressively through the plan
- Each day should stand alone but connect to the whole
- Vary the types of scripture (narrative, poetry, teaching, prophecy)
- Balance challenge with encouragement
- Include personal stories or illustrations
- Make it practical for busy people

Output as JSON with structured fields for each day.`,
    variables: ['title', 'theme', 'duration', 'audience'],
  },
};

export default function ExploreAIPromptsTab() {
  const { t } = useTranslation();
  const { isSuperAdmin } = useAuth();
  const { toast } = useToast();

  const [prompts, setPrompts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState(null);
  const [copied, setCopied] = useState(null);

  // Filter states
  const [filterContentType, setFilterContentType] = useState('all');
  const [filterLanguage, setFilterLanguage] = useState('all');

  // Form state
  const [formData, setFormData] = useState({
    prompt_id: '',
    content_type: '',
    language: 'en',
    version: '1.0.0',
    template: '',
    variables: [],
    active: true,
  });

  // Fetch prompts on mount
  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    try {
      setLoading(true);
      const response = await api.get('/explore/admin/ai/prompts');
      setPrompts(response.data.prompts || []);
    } catch (error) {
      console.error('Error fetching prompts:', error);
      toast({
        title: 'Error',
        description: 'Failed to load AI prompts',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (prompt = null) => {
    if (prompt) {
      setEditingPrompt(prompt);
      setFormData({
        prompt_id: prompt.prompt_id,
        content_type: prompt.content_type,
        language: prompt.language,
        version: prompt.version,
        template: prompt.template,
        variables: prompt.variables || [],
        active: prompt.active ?? true,
      });
    } else {
      setEditingPrompt(null);
      setFormData({
        prompt_id: '',
        content_type: '',
        language: 'en',
        version: '1.0.0',
        template: '',
        variables: [],
        active: true,
      });
    }
    setDialogOpen(true);
  };

  const handleSavePrompt = async () => {
    if (!formData.content_type || !formData.template) {
      toast({
        title: 'Validation Error',
        description: 'Content type and template are required',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Generate prompt_id if new
      const promptData = {
        ...formData,
        prompt_id: formData.prompt_id || `${formData.content_type}_${formData.language}_v${formData.version.replace(/\./g, '_')}`,
      };

      // Extract variables from template
      const variableMatches = promptData.template.match(/\$(\w+)/g) || [];
      promptData.variables = [...new Set(variableMatches.map(v => v.replace('$', '')))];

      await api.post('/explore/admin/ai/prompts', promptData);

      toast({
        title: 'Success',
        description: editingPrompt ? 'Prompt updated successfully' : 'Prompt created successfully',
      });

      setDialogOpen(false);
      fetchPrompts();
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'Failed to save prompt',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLoadDefault = (contentType) => {
    const defaultPrompt = DEFAULT_PROMPTS[contentType];
    if (defaultPrompt) {
      setFormData(prev => ({
        ...prev,
        template: defaultPrompt.en,
        variables: defaultPrompt.variables,
      }));
    }
  };

  const handleCopyTemplate = async (template) => {
    try {
      await navigator.clipboard.writeText(template);
      setCopied(template);
      setTimeout(() => setCopied(null), 2000);
      toast({
        title: 'Copied',
        description: 'Template copied to clipboard',
      });
    } catch (error) {
      console.error('Error copying:', error);
    }
  };

  // Filter prompts
  const filteredPrompts = prompts.filter(prompt => {
    if (filterContentType !== 'all' && prompt.content_type !== filterContentType) return false;
    if (filterLanguage !== 'all' && prompt.language !== filterLanguage) return false;
    return true;
  });

  // Non-super admin view
  if (!isSuperAdmin) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            Access Restricted
          </CardTitle>
          <CardDescription>
            AI Prompt configuration is only available to Super Administrators.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-purple-600" />
              <CardTitle>AI Prompt Configuration</CardTitle>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Prompt
            </Button>
          </div>
          <CardDescription>
            Configure AI prompts used to generate Explore content. Each content type can have multiple prompts for different languages.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label className="text-xs text-gray-500 mb-1">Content Type</Label>
              <Select value={filterContentType} onValueChange={setFilterContentType}>
                <SelectTrigger>
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {CONTENT_TYPES.map(type => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <Label className="text-xs text-gray-500 mb-1">Language</Label>
              <Select value={filterLanguage} onValueChange={setFilterLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="All Languages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Languages</SelectItem>
                  {LANGUAGES.map(lang => (
                    <SelectItem key={lang.value} value={lang.value}>
                      {lang.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Prompts Table */}
      <Card>
        <CardContent className="pt-6">
          {filteredPrompts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Wand2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No prompts configured yet</p>
              <p className="text-sm">Click "Add Prompt" to create your first AI prompt template</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Content Type</TableHead>
                  <TableHead>Language</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Variables</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPrompts.map((prompt, index) => {
                  const typeConfig = CONTENT_TYPES.find(t => t.value === prompt.content_type);
                  const TypeIcon = typeConfig?.icon || FileText;

                  return (
                    <TableRow key={prompt.prompt_id || index}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <TypeIcon className="h-4 w-4 text-gray-500" />
                          <span>{typeConfig?.label || prompt.content_type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {LANGUAGES.find(l => l.value === prompt.language)?.label || prompt.language}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                          v{prompt.version}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(prompt.variables || []).slice(0, 3).map(variable => (
                            <Badge key={variable} variant="secondary" className="text-xs">
                              ${variable}
                            </Badge>
                          ))}
                          {(prompt.variables || []).length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{prompt.variables.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={prompt.active ? 'default' : 'secondary'}>
                          {prompt.active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCopyTemplate(prompt.template)}
                          >
                            {copied === prompt.template ? (
                              <Check className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(prompt)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Default Prompts Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Default Prompt Templates</CardTitle>
          <CardDescription>
            Reference templates for each content type. Click to use as a starting point.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {CONTENT_TYPES.map(type => {
              const Icon = type.icon;
              const defaultPrompt = DEFAULT_PROMPTS[type.value];

              return (
                <div
                  key={type.value}
                  className="border rounded-lg p-4 hover:border-purple-300 cursor-pointer transition-colors"
                  onClick={() => {
                    setFormData(prev => ({
                      ...prev,
                      content_type: type.value,
                      template: defaultPrompt?.en || '',
                      variables: defaultPrompt?.variables || [],
                    }));
                    setDialogOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className="h-5 w-5 text-purple-600" />
                    <span className="font-medium">{type.label}</span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {defaultPrompt?.en?.substring(0, 100)}...
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {(defaultPrompt?.variables || []).map(v => (
                      <Badge key={v} variant="outline" className="text-xs">
                        ${v}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Edit/Create Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPrompt ? 'Edit Prompt' : 'Create New Prompt'}
            </DialogTitle>
            <DialogDescription>
              Configure an AI prompt template for generating Explore content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Content Type & Language */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Content Type *</Label>
                <Select
                  value={formData.content_type}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, content_type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTENT_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language *</Label>
                <Select
                  value={formData.language}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select language" />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map(lang => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Version */}
            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                placeholder="1.0.0"
              />
              <p className="text-xs text-gray-500">Semantic versioning (e.g., 1.0.0, 1.1.0)</p>
            </div>

            {/* Template */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Prompt Template *</Label>
                {formData.content_type && DEFAULT_PROMPTS[formData.content_type] && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadDefault(formData.content_type)}
                  >
                    <Wand2 className="h-3 w-3 mr-1" />
                    Load Default
                  </Button>
                )}
              </div>
              <Textarea
                value={formData.template}
                onChange={(e) => setFormData(prev => ({ ...prev, template: e.target.value }))}
                placeholder="Enter your AI prompt template here. Use $variable_name for dynamic values."
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-gray-500">
                Use $variable_name syntax for dynamic values (e.g., $main_verse, $theme)
              </p>
            </div>

            {/* Detected Variables */}
            {formData.template && (
              <div className="space-y-2">
                <Label>Detected Variables</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                  {(() => {
                    const matches = formData.template.match(/\$(\w+)/g) || [];
                    const uniqueVars = [...new Set(matches.map(v => v.replace('$', '')))];

                    if (uniqueVars.length === 0) {
                      return <span className="text-sm text-gray-500">No variables detected</span>;
                    }

                    return uniqueVars.map(variable => (
                      <Badge key={variable} variant="secondary">
                        ${variable}
                      </Badge>
                    ));
                  })()}
                </div>
              </div>
            )}

            {/* Active Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active</Label>
                <p className="text-sm text-gray-500">
                  Only active prompts will be used for content generation
                </p>
              </div>
              <Switch
                checked={formData.active}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePrompt} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Prompt
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
