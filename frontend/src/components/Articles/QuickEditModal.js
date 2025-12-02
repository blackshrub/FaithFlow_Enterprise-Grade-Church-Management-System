import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useUpdateArticle } from '../../hooks/useArticles';
import CategorySelector from './CategorySelector';
import { useToast } from '../../hooks/use-toast';

const QuickEditModal = ({ open, onOpenChange, article, onSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const updateMutation = useUpdateArticle();

  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    status: 'draft',
    category_ids: []
  });

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title || '',
        slug: article.slug || '',
        status: article.status || 'draft',
        category_ids: article.category_ids || []
      });
    }
  }, [article]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({ id: article.id, data: formData });
      
      toast({
        title: t('common.success'),
        description: t('articles.messages.updateSuccess')
      });

      if (onSuccess) onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('articles.quickEdit.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('articles.articleTitle')} *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>{t('articles.slug')}</Label>
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
            />
          </div>

          <div>
            <Label>{t('articles.status')}</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">{t('articles.draft')}</SelectItem>
                <SelectItem value="published">{t('articles.published')}</SelectItem>
                <SelectItem value="archived">{t('articles.archived')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <CategorySelector
            label={t('articles.categories')}
            value={formData.category_ids}
            onChange={(ids) => setFormData({ ...formData, category_ids: ids })}
          />

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={updateMutation.isPending}>
              {updateMutation.isPending ? t('common.loading') : t('articles.quickEdit.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuickEditModal;
