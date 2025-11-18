import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useTags, useCreateTag, useUpdateTag, useDeleteTag } from '../../hooks/useArticles';
import { useToast } from '../../hooks/use-toast';

export default function Tags() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  const { data: tags, isLoading } = useTags();
  const createMutation = useCreateTag();
  const updateMutation = useUpdateTag();
  const deleteMutation = useDeleteTag();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingTag) {
        await updateMutation.mutateAsync({ id: editingTag.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      toast({ title: t('common.success') });
      setShowModal(false);
      setFormData({ name: '' });
      setEditingTag(null);
    } catch (error) {
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('articles.tags.deleteTag') + '?')) return;
    try {
      await deleteMutation.mutateAsync(id);
      toast({ title: t('common.success') });
    } catch (error) {
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('articles.tagsManagement.title')}</h1>
        <Button onClick={() => { setEditingTag(null); setFormData({ name: '' }); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('articles.tagsManagement.createTag')}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{tags?.length || 0} {t('articles.tagsManagement.title')}</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div>{t('common.loading')}</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('articles.tags.tagName')}</TableHead>
                  <TableHead>{t('articles.tags.tagSlug')}</TableHead>
                  <TableHead>{t('articles.tags.articleCount')}</TableHead>
                  <TableHead>{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tags?.map((tag) => (
                  <TableRow key={tag.id}>
                    <TableCell>{tag.name}</TableCell>
                    <TableCell className="font-mono text-sm">{tag.slug}</TableCell>
                    <TableCell>{tag.article_count || 0}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingTag(tag); setFormData({ name: tag.name }); setShowModal(true); }}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(tag.id)}>
                        {t('common.delete')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingTag ? t('articles.tags.editTag') : t('articles.tags.createTag')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('articles.tags.tagName')} *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setShowModal(false)}>{t('common.cancel')}</Button>
              <Button type="submit">{t('common.save')}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
