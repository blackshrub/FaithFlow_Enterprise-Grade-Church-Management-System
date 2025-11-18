import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../components/ui/dialog';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useArticles';
import { useToast } from '../../hooks/use-toast';

export default function Categories() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  const { data: categories, isLoading } = useCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCategory) {
        await updateMutation.mutateAsync({ id: editingCategory.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }
      toast({ title: t('common.success') });
      setShowModal(false);
      setFormData({ name: '', description: '' });
      setEditingCategory(null);
    } catch (error) {
      toast({ variant: "destructive", title: t('common.error'), description: error.message });
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm(t('articles.categories.deleteCategory') + '?')) return;
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
        <h1 className="text-3xl font-bold">{t('articles.categories.title')}</h1>
        <Button onClick={() => { setEditingCategory(null); setFormData({ name: '', description: '' }); setShowModal(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('articles.categories.createCategory')}
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>{categories?.length || 0} Categories</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? <div>{t('common.loading')}</div> : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('articles.categories.categoryName')}</TableHead>
                  <TableHead>{t('articles.categories.categorySlug')}</TableHead>
                  <TableHead>{t('articles.categories.articleCount')}</TableHead>
                  <TableHead>{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories?.map((cat) => (
                  <TableRow key={cat.id}>
                    <TableCell>{cat.name}</TableCell>
                    <TableCell className="font-mono text-sm">{cat.slug}</TableCell>
                    <TableCell>{cat.article_count || 0}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => { setEditingCategory(cat); setFormData({ name: cat.name, description: cat.description || '' }); setShowModal(true); }}>
                        {t('common.edit')}
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(cat.id)}>
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
            <DialogTitle>{editingCategory ? t('articles.categories.editCategory') : t('articles.categories.createCategory')}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>{t('articles.categories.categoryName')} *</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
            </div>
            <div>
              <Label>{t('articles.categories.categoryDescription')}</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={3} />
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
