import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  useEventCategories,
  useCreateEventCategory,
  useUpdateEventCategory,
  useDeleteEventCategory,
} from '../../hooks/useSettings';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Plus, Edit, Trash2, Loader2, Tag, Shield } from 'lucide-react';
import { Switch } from '../ui/switch';

const initialFormData = {
  name: '',
  description: '',
  color: '#3C5AFF',
  icon: 'Calendar',
  order: 0,
  is_active: true,
};

export default function EventCategoriesTab() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: categories = [], isLoading, error } = useEventCategories();
  const createCategory = useCreateEventCategory();
  const updateCategory = useUpdateEventCategory();
  const deleteCategory = useDeleteEventCategory();

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    if (!church?.id) return;
    createCategory.mutate(
      { ...formData, church_id: church.id },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    updateCategory.mutate(
      { id: selectedCategory.id, data: formData },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleDeleteCategory = async (categoryId, isSystem) => {
    if (isSystem) {
      alert(t('settings.cannotDeleteSystem'));
      return;
    }
    
    if (!window.confirm(t('settings.confirmDeleteStatus'))) {
      return;
    }

    deleteCategory.mutate(categoryId);
  };

  const openEditDialog = (category) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      color: category.color || '#3C5AFF',
      icon: category.icon || 'Calendar',
      order: category.order || 0,
      is_active: category.is_active ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedCategory(null);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-500">{t('settings.loadError')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">{t('settings.eventCategories')}</h2>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t('settings.addCategory')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <form onSubmit={handleCreateCategory}>
              <DialogHeader>
                <DialogTitle>{t('settings.addCategory')}</DialogTitle>
                <DialogDescription>
                  {t('settings.createCategoryDesc') || t('settings.addCategory')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">{t('settings.categoryName')}</Label>
                  <Input
                    id="category-name"
                    name="category_name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-description">{t('settings.categoryDescription')}</Label>
                  <Textarea
                    id="category-description"
                    name="category_description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-color">{t('settings.categoryColor')}</Label>
                  <Input
                    id="category-color"
                    name="category_color"
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-order">{t('settings.order')}</Label>
                  <Input
                    id="category-order"
                    name="category_order"
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="category-active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                  <Label htmlFor="category-active">{t('settings.isActive')}</Label>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createCategory.isPending}>
                  {createCategory.isPending ? t('common.loading') : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.categoriesList')}</CardTitle>
          <CardDescription>
            {t('settings.categoryTotal', { count: categories.length })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.categoryName')}</TableHead>
                <TableHead>{t('settings.categoryDescription')}</TableHead>
                <TableHead>{t('settings.categoryColor')}</TableHead>
                <TableHead>{t('settings.order')}</TableHead>
                <TableHead>{t('common.status') || t('settings.status')}</TableHead>
                <TableHead className="text-right">{t('members.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                    {t('settings.noCategories')}
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {category.is_system && (
                          <Shield className="h-4 w-4 text-blue-600" title={t('settings.systemCategory')} />
                        )}
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">
                      {category.description || '-'}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-6 h-6 rounded"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="text-xs text-gray-500">{category.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>{category.order}</TableCell>
                    <TableCell>
                      {category.is_active ? (
                        <Badge variant="success">{t('settings.isActive')}</Badge>
                      ) : (
                        <Badge variant="secondary">{t('common.inactive') || 'Inactive'}</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(category)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!category.is_system && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteCategory(category.id, category.is_system)}
                            disabled={deleteCategory.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <form onSubmit={handleUpdateCategory}>
            <DialogHeader>
              <DialogTitle>{t('settings.editCategory')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-category-name">{t('settings.categoryName')}</Label>
                <Input
                  id="edit-category-name"
                  name="edit_category_name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={selectedCategory?.is_system}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-description">{t('settings.categoryDescription')}</Label>
                <Textarea
                  id="edit-category-description"
                  name="edit_category_description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-color">{t('settings.categoryColor')}</Label>
                <Input
                  id="edit-category-color"
                  name="edit_category_color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-order">{t('settings.order')}</Label>
                <Input
                  id="edit-category-order"
                  name="edit_category_order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit-category-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="edit-category-active">{t('settings.isActive')}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateCategory.isPending}>
                {updateCategory.isPending ? t('common.loading') : t('common.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
