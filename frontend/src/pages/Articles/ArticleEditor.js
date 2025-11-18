import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, Send, Eye, Copy } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useArticle, useCreateArticle, useUpdateArticle, useGeneratePreviewLink, useDuplicateArticle } from '../../hooks/useArticles';
import RichTextEditor from '../../components/Articles/RichTextEditor';
import CategorySelector from '../../components/Articles/CategorySelector';
import TagSelector from '../../components/Articles/TagSelector';
import FeaturedImageUpload from '../../components/Articles/FeaturedImageUpload';
import SchedulingPanel from '../../components/Articles/SchedulingPanel';
import PreviewLinkModal from '../../components/Articles/PreviewLinkModal';
import ReadingTimeDisplay from '../../components/Articles/ReadingTimeDisplay';
import { useToast } from '../../hooks/use-toast';

export default function ArticleEditor() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    content: '',
    excerpt: '',
    featured_image: null,
    category_ids: [],
    tag_ids: [],
    status: 'draft',
    allow_comments: true
  });

  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const { data: existingArticle } = useArticle(id);
  const createMutation = useCreateArticle();
  const updateMutation = useUpdateArticle();
  const previewMutation = useGeneratePreviewLink();
  const duplicateMutation = useDuplicateArticle();

  useEffect(() => {
    if (existingArticle) {
      setFormData({
        title: existingArticle.title || '',
        slug: existingArticle.slug || '',
        content: existingArticle.content || '',
        excerpt: existingArticle.excerpt || '',
        featured_image: existingArticle.featured_image,
        category_ids: existingArticle.category_ids || [],
        tag_ids: existingArticle.tag_ids || [],
        status: existingArticle.status || 'draft',
        allow_comments: existingArticle.allow_comments !== false
      });
    }
  }, [existingArticle]);

  // Calculate word count
  useEffect(() => {
    const text = formData.content.replace(/<[^>]*>/g, '');
    const words = text.trim().split(/\s+/).filter(w => w.length > 0);
    setWordCount(words.length);
  }, [formData.content]);

  const readingTime = Math.max(1, Math.round(wordCount / 200));

  const handleSave = async (publish = false) => {
    if (!formData.title) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('articles.validation.titleRequired')
      });
      return;
    }

    if (publish && !formData.content) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('articles.validation.contentRequired')
      });
      return;
    }

    const payload = {
      ...formData,
      status: publish ? 'published' : 'draft',
      publish_date: publish ? new Date().toISOString() : null
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }

      toast({
        title: t('common.success'),
        description: publish ? t('articles.messages.publishSuccess') : t('articles.messages.updateSuccess')
      });

      navigate('/articles');
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    }
  };

  const handleGeneratePreview = async () => {
    if (!id) {
      toast({
        variant="destructive",
        title: t('common.error'),
        description: "Please save article first"
      });
      return;
    }

    try {
      const response = await previewMutation.mutateAsync(id);
      setPreviewUrl(response.data.preview_url);
      setShowPreviewModal(true);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    }
  };

  const handleDuplicate = async () => {
    if (!id) return;

    try {
      await duplicateMutation.mutateAsync(id);
      toast({
        title: t('common.success'),
        description: t('articles.messages.duplicateSuccess')
      });
      navigate('/articles');
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Sticky Action Bar */}
      <div className="sticky top-0 z-10 bg-white border-b pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">
            {isEdit ? t('articles.editArticle') : t('articles.addNew')}
          </h1>
          <div className="flex items-center space-x-2">
            {isEdit && (
              <>
                <Button variant="outline" onClick={handleDuplicate}>
                  <Copy className="w-4 h-4 mr-2" />
                  {t('articles.duplicate')}
                </Button>
                <Button variant="outline" onClick={handleGeneratePreview}>
                  <Eye className="w-4 h-4 mr-2" />
                  {t('articles.preview')}
                </Button>
              </>
            )}
            <Button variant="outline" onClick={() => handleSave(false)}>
              <Save className="w-4 h-4 mr-2" />
              {t('articles.saveDraft')}
            </Button>
            <Button onClick={() => handleSave(true)}>
              <Send className="w-4 h-4 mr-2" />
              {t('articles.publish')}
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div>
                <Label>{t('articles.articleTitle')} *</Label>
                <Input
                  value={formData.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setFormData({
                      ...formData,
                      title: newTitle,
                      slug: newTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
                    });
                  }}
                  placeholder="Enter article title..."
                  className="text-lg font-medium"
                />
              </div>

              <div>
                <Label>{t('articles.slug')}</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="article-slug"
                />
                <p className="text-xs text-gray-500 mt-1">{t('articles.slugAutoGenerated')}</p>
              </div>

              <div>
                <Label>{t('articles.content')} *</Label>
                <RichTextEditor
                  value={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                  placeholder="Start writing..."
                />
                <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                  <span>{t('articles.editor.wordCount')}: {wordCount}</span>
                  <ReadingTimeDisplay readingTime={readingTime} />
                </div>
              </div>

              <div>
                <Label>{t('articles.excerpt')}</Label>
                <Textarea
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  placeholder="Short excerpt..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <FeaturedImageUpload
            articleId={id}
            currentImage={formData.featured_image}
            onUploadSuccess={(url) => setFormData({ ...formData, featured_image: url })}
          />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('articles.categories')}</CardTitle>
            </CardHeader>
            <CardContent>
              <CategorySelector
                value={formData.category_ids}
                onChange={(ids) => setFormData({ ...formData, category_ids: ids })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('articles.tags')}</CardTitle>
            </CardHeader>
            <CardContent>
              <TagSelector
                value={formData.tag_ids}
                onChange={(ids) => setFormData({ ...formData, tag_ids: ids })}
              />
            </CardContent>
          </Card>

          {isEdit && existingArticle && (
            <SchedulingPanel article={existingArticle} onSuccess={() => window.location.reload()} />
          )}
        </div>
      </div>

      {/* Preview Modal */}
      <PreviewLinkModal
        open={showPreviewModal}
        onOpenChange={setShowPreviewModal}
        previewUrl={previewUrl}
      />
    </div>
  );
}
