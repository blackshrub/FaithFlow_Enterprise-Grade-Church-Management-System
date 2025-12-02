import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
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
  ArrowLeft, Sparkles, Loader2, BookOpen, MessageSquare, User, HelpCircle,
  RefreshCw, Check, X, Edit, Eye, ChevronDown, ChevronUp, GraduationCap,
  FolderTree, Tag, Calendar, Image
} from 'lucide-react';
import {
  useExploreAIConfig,
  useExploreGenerationQueue,
  useGenerateExploreContent,
  useAcceptGeneratedContent,
  useRejectGeneratedContent,
  useRegenerateExploreContent
} from '../../hooks/useExplore';
import { useToast } from '../../hooks/use-toast';

const contentTypeConfig = {
  // Daily Content
  devotion: { label: 'Daily Devotion', icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50', apiType: 'daily_devotion' },
  verse: { label: 'Verse of the Day', icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-50', apiType: 'verse_of_the_day' },
  figure: { label: 'Bible Figure', icon: User, color: 'text-purple-600', bgColor: 'bg-purple-50', apiType: 'bible_figure' },
  quiz: { label: 'Daily Quiz', icon: HelpCircle, color: 'text-orange-600', bgColor: 'bg-orange-50', apiType: 'daily_quiz' },
  // Self-Paced Content
  bible_study: { label: 'Bible Study', icon: GraduationCap, color: 'text-indigo-600', bgColor: 'bg-indigo-50', apiType: 'bible_study' },
  devotion_plan: { label: 'Devotion Plan', icon: Calendar, color: 'text-rose-600', bgColor: 'bg-rose-50', apiType: 'devotion_plan' },
  // Topical Content
  topical_category: { label: 'Topical Category', icon: FolderTree, color: 'text-teal-600', bgColor: 'bg-teal-50', apiType: 'topical_category' },
  topical_verse: { label: 'Topical Verse', icon: Tag, color: 'text-cyan-600', bgColor: 'bg-cyan-50', apiType: 'topical_verse' },
  // Visual Content
  shareable_image: { label: 'Shareable Image', icon: Image, color: 'text-pink-600', bgColor: 'bg-pink-50', apiType: 'shareable_image' },
};

const statusConfig = {
  pending: { label: 'Pending', color: 'bg-gray-500' },
  generating: { label: 'Generating', color: 'bg-blue-500' },
  completed: { label: 'Completed', color: 'bg-green-500' },
  failed: { label: 'Failed', color: 'bg-red-500' },
};

export default function AIGenerationHub() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [contentType, setContentType] = useState('devotion');
  const [model, setModel] = useState('claude-sonnet-4-5-20250929');
  const [customPrompt, setCustomPrompt] = useState('');
  const [generateBothLanguages, setGenerateBothLanguages] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [expandedJob, setExpandedJob] = useState(null);
  const [jobToReject, setJobToReject] = useState(null);
  const [jobToRegenerate, setJobToRegenerate] = useState(null);

  // Fetch generation queue (with multi-tenant cache isolation)
  const { data: generationQueue, isLoading: queueLoading } = useExploreGenerationQueue();

  // Fetch AI configuration (with multi-tenant cache isolation)
  const { data: aiConfig } = useExploreAIConfig();

  // Mutations with multi-tenant cache isolation
  const generateMutation = useGenerateExploreContent();
  const acceptMutation = useAcceptGeneratedContent();
  const rejectMutation = useRejectGeneratedContent();
  const regenerateMutation = useRegenerateExploreContent();

  const handleGenerate = () => {
    const config = contentTypeConfig[contentType];
    generateMutation.mutate({
      content_type: config?.apiType || contentType,
      model,
      custom_prompt: customPrompt || undefined,
      generate_both_languages: generateBothLanguages,
    }, {
      onSuccess: () => setCustomPrompt('')
    });
  };

  const handlePreview = (job) => {
    setPreviewData(job);
    setShowPreview(true);
  };

  const handleAccept = (jobId, edits = null) => {
    acceptMutation.mutate({ jobId, edits }, {
      onSuccess: () => {
        setShowPreview(false);
        setPreviewData(null);
      }
    });
  };

  const handleReject = (jobId) => {
    setJobToReject(jobId);
  };

  const confirmReject = () => {
    if (jobToReject) {
      rejectMutation.mutate(jobToReject, {
        onSuccess: () => {
          setShowPreview(false);
          setPreviewData(null);
          setJobToReject(null);
        },
        onError: () => setJobToReject(null)
      });
    }
  };

  const handleRegenerate = (jobId) => {
    setJobToRegenerate(jobId);
  };

  const confirmRegenerate = () => {
    if (jobToRegenerate) {
      regenerateMutation.mutate(jobToRegenerate, {
        onSuccess: () => {
          setShowPreview(false);
          setPreviewData(null);
          setJobToRegenerate(null);
        },
        onError: () => setJobToRegenerate(null)
      });
    }
  };

  const handleEditAndSave = (jobId) => {
    // Navigate to appropriate editor with pre-filled data
    const job = generationQueue?.jobs?.find(j => j.id === jobId);
    if (job) {
      // Convert API content type to route slug
      const apiTypeToSlug = {
        'daily_devotion': 'devotion',
        'verse_of_the_day': 'verse',
        'bible_figure': 'figure',
        'daily_quiz': 'quiz',
        'bible_study': 'bible-study',
        'devotion_plan': 'devotion-plan',
        'topical_category': 'topical/category',
        'topical_verse': 'topical/verses',
      };
      const routeSlug = apiTypeToSlug[job.content_type] || job.content_type;
      navigate(`/content-center/${routeSlug}/new?aiData=${encodeURIComponent(JSON.stringify(job.generated_content))}`);
    }
  };

  const getDefaultPrompt = (type) => {
    const prompts = {
      devotion: 'Generate an inspiring daily devotion with a Bible verse, reflection, prayer, and thought-provoking questions.',
      verse: 'Generate a verse of the day with deep commentary, practical application, and thematic insights.',
      figure: 'Generate a comprehensive Bible figure profile with biography, timeline, life lessons, and scriptural references.',
      quiz: 'Generate an engaging Bible quiz with 5-10 questions of varying difficulty, including explanations.',
    };
    return prompts[type] || '';
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/content-center"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-600" />
            AI Generation Hub
          </h1>
          <p className="text-gray-600 mt-1">
            Generate high-quality spiritual content using AI
          </p>
        </div>
      </div>

      {/* AI Configuration Status */}
      {aiConfig && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  AI Provider: {aiConfig.provider || 'Anthropic Claude'}
                </p>
                <p className="text-xs text-gray-600">
                  Model: {model} • Credits: {aiConfig.credits_remaining || 'Unlimited'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Generation Form */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Generate New Content</CardTitle>
              <CardDescription>Configure AI parameters and generate content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Content Type */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Content Type
                </label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contentTypeConfig).map(([type, config]) => {
                      const Icon = config.icon;
                      return (
                        <SelectItem key={type} value={type}>
                          <div className="flex items-center gap-2">
                            <Icon className={`h-4 w-4 ${config.color}`} />
                            {config.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* AI Model */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  AI Model
                </label>
                <Select value={model} onValueChange={setModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="claude-sonnet-4-5-20250929">Claude Sonnet 4.5 (Recommended)</SelectItem>
                    <SelectItem value="claude-opus-4-5-20251101">Claude Opus 4.5 (Highest quality)</SelectItem>
                    <SelectItem value="claude-sonnet-4-20250514">Claude Sonnet 4</SelectItem>
                    <SelectItem value="claude-opus-4-20250514">Claude Opus 4</SelectItem>
                    <SelectItem value="claude-3-7-sonnet-20250219">Claude 3.7 Sonnet (Legacy)</SelectItem>
                    <SelectItem value="claude-3-5-haiku-20241022">Claude 3.5 Haiku (Fastest)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Language Options */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Languages
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={generateBothLanguages}
                    onChange={(e) => setGenerateBothLanguages(e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">
                    Generate both English and Indonesian
                  </span>
                </div>
              </div>

              {/* Custom Prompt */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Custom Instructions (Optional)
                </label>
                <Textarea
                  placeholder={getDefaultPrompt(contentType)}
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Leave empty to use default prompt for {contentTypeConfig[contentType]?.label}
                </p>
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generateMutation.isPending}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Content
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Generation Queue */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Generation Queue</CardTitle>
              <CardDescription>
                Monitor and manage AI-generated content
              </CardDescription>
            </CardHeader>
            <CardContent>
              {queueLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : !generationQueue?.jobs || generationQueue.jobs.length === 0 ? (
                <div className="text-center py-12">
                  <Sparkles className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No generation jobs yet</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Start generating content using the form
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {generationQueue.jobs.map((job) => {
                    const config = contentTypeConfig[job.content_type] || {};
                    const Icon = config.icon || BookOpen;
                    const statusCfg = statusConfig[job.status] || statusConfig.pending;
                    const isExpanded = expandedJob === job.id;

                    return (
                      <div key={job.id} className="border rounded-lg p-4 space-y-3">
                        {/* Job Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${config.color}`} />
                            <div>
                              <p className="font-medium text-gray-900">
                                {config.label}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(job.created_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={`${statusCfg.color} text-white`}>
                              {statusCfg.label}
                            </Badge>
                            {job.status === 'generating' && (
                              <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                            )}
                          </div>
                        </div>

                        {/* Custom Prompt (if any) */}
                        {job.custom_prompt && (
                          <div className="bg-gray-50 rounded p-2">
                            <p className="text-xs font-medium text-gray-700 mb-1">
                              Custom Instructions:
                            </p>
                            <p className="text-xs text-gray-600 line-clamp-2">
                              {job.custom_prompt}
                            </p>
                          </div>
                        )}

                        {/* Actions */}
                        {job.status === 'completed' && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePreview(job)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Preview
                            </Button>
                            <Button
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                              onClick={() => handleAccept(job.id)}
                              disabled={acceptMutation.isPending}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Accept & Publish
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditAndSave(job.id)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit First
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRegenerate(job.id)}
                              disabled={regenerateMutation.isPending}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Regenerate
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleReject(job.id)}
                              disabled={rejectMutation.isPending}
                            >
                              <X className="h-4 w-4 mr-1 text-red-600" />
                            </Button>
                          </div>
                        )}

                        {job.status === 'failed' && (
                          <div className="space-y-2">
                            <p className="text-sm text-red-600">
                              {job.error_message || 'Generation failed'}
                            </p>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRegenerate(job.id)}
                            >
                              <RefreshCw className="h-4 w-4 mr-1" />
                              Retry
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Preview Generated Content</DialogTitle>
            <DialogDescription>
              Review the AI-generated content before publishing
            </DialogDescription>
          </DialogHeader>

          {previewData && (
            <div className="space-y-4 mt-4">
              <Tabs defaultValue="en">
                <TabsList>
                  <TabsTrigger value="en">English</TabsTrigger>
                  <TabsTrigger value="id">Indonesian</TabsTrigger>
                </TabsList>

                <TabsContent value="en" className="space-y-4 mt-4">
                  {previewData.content_type === 'devotion' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Title</label>
                        <p className="text-lg font-semibold mt-1">
                          {previewData.generated_content?.title?.en}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Bible Reference</label>
                        <p className="mt-1">{previewData.generated_content?.bible_reference}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Content</label>
                        <div className="mt-1 prose max-w-none">
                          {previewData.generated_content?.content?.en}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Prayer</label>
                        <div className="mt-1 italic text-gray-700">
                          {previewData.generated_content?.prayer?.en}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Reflection Questions</label>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                          {previewData.generated_content?.reflection_questions?.en?.map((q, idx) => (
                            <li key={idx}>{q}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  {previewData.content_type === 'verse' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Bible Reference</label>
                        <p className="text-lg font-semibold mt-1">
                          {previewData.generated_content?.bible_reference}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Verse Text</label>
                        <p className="mt-1 italic text-gray-700">
                          {previewData.generated_content?.verse_text?.en}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Commentary</label>
                        <div className="mt-1 prose max-w-none">
                          {previewData.generated_content?.commentary?.en}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Application</label>
                        <div className="mt-1">
                          {previewData.generated_content?.application?.en}
                        </div>
                      </div>
                    </>
                  )}

                  {previewData.content_type === 'figure' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Name</label>
                        <p className="text-2xl font-bold mt-1">
                          {previewData.generated_content?.name?.en}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Title</label>
                        <p className="text-lg font-semibold mt-1">
                          {previewData.generated_content?.title?.en}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Summary</label>
                        <p className="mt-1">{previewData.generated_content?.summary?.en}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Biography</label>
                        <div className="mt-1 prose max-w-none">
                          {previewData.generated_content?.biography?.en}
                        </div>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Life Lessons</label>
                        <ul className="mt-1 list-disc list-inside space-y-1">
                          {previewData.generated_content?.life_lessons?.en?.map((lesson, idx) => (
                            <li key={idx}>{lesson}</li>
                          ))}
                        </ul>
                      </div>
                    </>
                  )}

                  {previewData.content_type === 'quiz' && (
                    <>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Title</label>
                        <p className="text-lg font-semibold mt-1">
                          {previewData.generated_content?.title?.en}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">Questions</label>
                        <div className="mt-2 space-y-4">
                          {previewData.generated_content?.questions?.map((q, idx) => (
                            <div key={idx} className="border rounded-lg p-3">
                              <p className="font-medium">Q{idx + 1}: {q.question?.en}</p>
                              <ul className="mt-2 space-y-1 ml-4">
                                {q.options?.en?.map((opt, optIdx) => (
                                  <li
                                    key={optIdx}
                                    className={optIdx === q.correct_answer ? 'text-green-600 font-semibold' : ''}
                                  >
                                    {String.fromCharCode(65 + optIdx)}. {opt}
                                    {optIdx === q.correct_answer && ' ✓'}
                                  </li>
                                ))}
                              </ul>
                              <p className="text-sm text-gray-600 mt-2 italic">
                                {q.explanation?.en}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </TabsContent>

                <TabsContent value="id" className="space-y-4 mt-4">
                  {/* Indonesian version - similar structure */}
                  <p className="text-sm text-gray-500">
                    Indonesian content preview (structure same as English)
                  </p>
                </TabsContent>
              </Tabs>

              {/* Preview Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                >
                  Close
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleEditAndSave(previewData.id)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Before Saving
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => handleAccept(previewData.id)}
                  disabled={acceptMutation.isPending}
                >
                  {acceptMutation.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-2" />
                  )}
                  Accept & Publish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject Confirmation Dialog */}
      <AlertDialog open={!!jobToReject} onOpenChange={(open) => !open && setJobToReject(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('explore.ai.reject')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('explore.confirmations.discardGenerated')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rejectMutation.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={rejectMutation.isPending}
              onClick={confirmReject}
              className="bg-red-600 hover:bg-red-700"
            >
              {t('explore.ai.reject')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Regenerate Confirmation Dialog */}
      <AlertDialog open={!!jobToRegenerate} onOpenChange={(open) => !open && setJobToRegenerate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('explore.ai.regenerate')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('explore.confirmations.regenerate')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={regenerateMutation.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={regenerateMutation.isPending}
              onClick={confirmRegenerate}
            >
              {t('explore.ai.regenerate')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
