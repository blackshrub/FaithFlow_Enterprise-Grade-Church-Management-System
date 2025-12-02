import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

// Member Statuses
import {
  useMemberStatuses,
  useCreateMemberStatus,
  useUpdateMemberStatus,
  useDeleteMemberStatus,
  useReorderMemberStatuses,
  useChurchSettings,
  useUpdateChurchSettings,
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
import { Plus, Edit, Trash2, Loader2, Settings, GripVertical, Shield, Users, Calendar, Tag, Save } from 'lucide-react';
import { Switch } from '../ui/switch';
import { useToast } from '../../hooks/use-toast';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// ==================== MEMBER STATUSES SECTION ====================

const initialStatusFormData = {
  name: '',
  description: '',
  color: '#3B82F6',
  display_order: 0,
  is_active: true,
  is_default: false,
};

function SortableRow({ status, onEdit, onDelete, isDeleting }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: status.id,
    disabled: status.is_system,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <TableRow ref={setNodeRef} style={style} {...attributes}>
      <TableCell>
        {!status.is_system && (
          <div {...listeners} className="cursor-move">
            <GripVertical className="h-4 w-4 text-gray-400" />
          </div>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div
            className="w-4 h-4 rounded-full border-2 border-gray-200"
            style={{ backgroundColor: status.color }}
          />
          <span className="font-medium">{status.name}</span>
          {status.is_system && (
            <Badge variant="outline" className="ml-2">
              <Shield className="h-3 w-3 mr-1" />
              System
            </Badge>
          )}
        </div>
      </TableCell>
      <TableCell className="text-sm text-gray-600">
        {status.description || '-'}
      </TableCell>
      <TableCell>
        <Badge style={{ backgroundColor: status.color, color: '#fff' }}>
          {status.name}
        </Badge>
      </TableCell>
      <TableCell>
        {status.is_active ? (
          <Badge variant="default">Active</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
      </TableCell>
      <TableCell>
        {status.is_default ? (
          <Badge variant="default" className="bg-blue-600">Default</Badge>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={() => onEdit(status)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => onDelete(status.id)}
            disabled={isDeleting || status.is_system}
            title={status.is_system ? 'System status cannot be deleted' : 'Delete status'}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

function MemberStatusesSection() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [formData, setFormData] = useState(initialStatusFormData);

  const { data: statuses = [], isLoading, error } = useMemberStatuses();
  const createStatus = useCreateMemberStatus();
  const updateStatus = useUpdateMemberStatus();
  const deleteStatus = useDeleteMemberStatus();
  const reorderStatuses = useReorderMemberStatuses();

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      const oldIndex = statuses.findIndex((s) => s.id === active.id);
      const newIndex = statuses.findIndex((s) => s.id === over.id);
      const newOrder = arrayMove(statuses, oldIndex, newIndex);
      const statusIds = newOrder.map((s) => s.id);
      reorderStatuses.mutate(statusIds);
    }
  };

  const handleCreateStatus = async (e) => {
    e.preventDefault();
    createStatus.mutate(
      { ...formData, church_id: church.id },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    updateStatus.mutate(
      { id: selectedStatus.id, data: formData },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleDeleteStatus = async (statusId) => {
    if (!window.confirm('Are you sure you want to delete this status?')) return;
    deleteStatus.mutate(statusId);
  };

  const openEditDialog = (status) => {
    setSelectedStatus(status);
    setFormData({
      name: status.name || '',
      description: status.description || '',
      color: status.color || '#3B82F6',
      display_order: status.display_order || 0,
      is_active: status.is_active ?? true,
      is_default: status.is_default ?? false,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialStatusFormData);
    setSelectedStatus(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold">{t('settings.memberStatuses') || 'Member Statuses'}</h3>
          <p className="text-sm text-gray-500">{t('settings.memberStatusesDesc') || 'Manage member status categories with colors and ordering'}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('settings.addStatus') || 'Add Status'}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('settings.createStatus') || 'Create Status'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStatus} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-name">{t('settings.statusName') || 'Name'} *</Label>
                <Input
                  id="status-name"
                  placeholder="e.g., Full Member"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-description">{t('settings.statusDescription') || 'Description'}</Label>
                <Textarea
                  id="status-description"
                  placeholder="Describe this status"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-color">{t('settings.statusColor') || 'Color'}</Label>
                <div className="flex gap-2">
                  <Input
                    id="status-color"
                    type="text"
                    placeholder="#3B82F6"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="flex-1"
                  />
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10 cursor-pointer"
                  />
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Badge style={{ backgroundColor: formData.color, color: '#fff' }}>Preview</Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="status-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="status-active">{t('settings.isActive') || 'Active'}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="status-default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <div className="flex-1">
                  <Label htmlFor="status-default">{t('settings.defaultStatus') || 'Default for New Members'}</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.defaultStatusDesc') || 'This status will be assigned to new members by default'}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)} disabled={createStatus.isPending}>
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createStatus.isPending}>
                  {createStatus.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('common.loading')}</> : t('common.create')}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.statusesList') || 'Statuses List'}</CardTitle>
          <CardDescription>
            {statuses.length} {t('settings.statusCount') || 'status(es)'} • {t('settings.dragToReorder') || 'Drag to reorder'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">{t('common.loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>{t('settings.loadError') || 'Failed to load statuses'}</p>
            </div>
          ) : statuses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>{t('settings.noStatuses') || 'No statuses yet'}</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>{t('settings.statusName') || 'Name'}</TableHead>
                    <TableHead>{t('settings.statusDescription') || 'Description'}</TableHead>
                    <TableHead>{t('settings.preview') || 'Preview'}</TableHead>
                    <TableHead>{t('common.status') || 'Status'}</TableHead>
                    <TableHead>{t('settings.default') || 'Default'}</TableHead>
                    <TableHead className="text-right">{t('members.actions') || 'Actions'}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    {statuses.map((status) => (
                      <SortableRow key={status.id} status={status} onEdit={openEditDialog} onDelete={handleDeleteStatus} isDeleting={deleteStatus.isPending} />
                    ))}
                  </SortableContext>
                </TableBody>
              </Table>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.editStatus') || 'Edit Status'}</DialogTitle>
            <DialogDescription>
              {selectedStatus?.is_system && <span className="text-amber-600">{t('settings.systemStatusWarning') || 'System status - name cannot be changed'}</span>}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status-name">{t('settings.statusName') || 'Name'} *</Label>
              <Input
                id="edit-status-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={selectedStatus?.is_system}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status-description">{t('settings.statusDescription') || 'Description'}</Label>
              <Textarea
                id="edit-status-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status-color">{t('settings.statusColor') || 'Color'}</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-status-color"
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="flex-1"
                />
                <Input type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} className="w-16 h-10 cursor-pointer" />
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Badge style={{ backgroundColor: formData.color, color: '#fff' }}>Preview</Badge>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="edit-status-active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
              <Label htmlFor="edit-status-active">{t('settings.isActive') || 'Active'}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="edit-status-default" checked={formData.is_default} onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })} />
              <div className="flex-1">
                <Label htmlFor="edit-status-default">{t('settings.defaultStatus') || 'Default for New Members'}</Label>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} disabled={updateStatus.isPending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateStatus.isPending}>
                {updateStatus.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{t('common.loading')}</> : t('common.update')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ==================== COMMUNITY CATEGORIES SECTION ====================

function CommunityCategoriesSection() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: settings, isLoading, isSuccess } = useChurchSettings();
  const updateSettings = useUpdateChurchSettings();

  const [formData, setFormData] = useState({
    group_categories: {
      cell_group: 'Cell Group / Small Group',
      ministry_team: 'Ministry Team',
      activity: 'Activity Group',
      support_group: 'Support Group',
    },
  });

  useEffect(() => {
    if (isSuccess && settings) {
      setFormData({
        group_categories: settings.group_categories || {
          cell_group: 'Cell Group / Small Group',
          ministry_team: 'Ministry Team',
          activity: 'Activity Group',
          support_group: 'Support Group',
        },
      });
    }
  }, [isSuccess, settings]);

  const handleSave = () => {
    updateSettings.mutate(formData, {
      onSuccess: () => {
        toast({
          title: t('settings.settingsSaved') || 'Settings saved successfully',
          variant: 'default',
        });
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error.response?.data?.detail || 'Failed to save settings',
          variant: 'destructive',
        });
      },
    });
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">{t('settings.communityCategoriesTitle') || 'Community Categories'}</h3>
        <p className="text-sm text-gray-500">{t('settings.communityCategoriesDesc') || 'Configure labels for each community category type.'}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.categoryLabels') || 'Category Labels'}</CardTitle>
          <CardDescription>{t('settings.categoryLabelsDesc') || 'Customize display names for each community type'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {['cell_group', 'ministry_team', 'activity', 'support_group'].map((code) => (
            <div key={code} className="flex items-center gap-4">
              <div className="w-40">
                <Label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{code.replace('_', ' ')}</Label>
              </div>
              <div className="flex-1">
                <Input
                  type="text"
                  value={formData.group_categories[code] || ''}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      group_categories: {
                        ...formData.group_categories,
                        [code]: e.target.value,
                      },
                    })
                  }
                />
              </div>
            </div>
          ))}
          <div className="pt-4">
            <Button onClick={handleSave} disabled={updateSettings.isPending}>
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ==================== EVENT CATEGORIES SECTION ====================

const initialEventCategoryFormData = {
  name: '',
  description: '',
  color: '#3C5AFF',
  icon: 'Calendar',
  order: 0,
  is_active: true,
};

function EventCategoriesSection() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [formData, setFormData] = useState(initialEventCategoryFormData);

  const { data: categories = [], isLoading, error } = useEventCategories();
  const createCategory = useCreateEventCategory();
  const updateCategory = useUpdateEventCategory();
  const deleteCategory = useDeleteEventCategory();

  const handleCreateCategory = async (e) => {
    e.preventDefault();
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
    if (!window.confirm(t('settings.confirmDeleteCategory') || 'Are you sure you want to delete this category?')) return;
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
    setFormData(initialEventCategoryFormData);
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
        <div>
          <h3 className="text-lg font-semibold">{t('settings.eventCategories')}</h3>
          <p className="text-sm text-gray-500">{t('settings.eventCategoriesDesc') || 'Manage event categories'}</p>
        </div>
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
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="category-name">{t('settings.categoryName')}</Label>
                  <Input id="category-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-description">{t('settings.categoryDescription')}</Label>
                  <Textarea id="category-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-color">{t('settings.categoryColor')}</Label>
                  <Input id="category-color" type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category-order">{t('settings.order')}</Label>
                  <Input id="category-order" type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="category-active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
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
          <CardDescription>{t('settings.categoryTotal', { count: categories.length })}</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('settings.categoryName')}</TableHead>
                <TableHead>{t('settings.categoryDescription')}</TableHead>
                <TableHead>{t('settings.categoryColor')}</TableHead>
                <TableHead>{t('settings.order')}</TableHead>
                <TableHead>{t('common.status')}</TableHead>
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
                        {category.is_system && <Shield className="h-4 w-4 text-blue-600" title={t('settings.systemCategory')} />}
                        <span className="font-medium">{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-600 text-sm">{category.description || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded" style={{ backgroundColor: category.color }} />
                        <span className="text-xs text-gray-500">{category.color}</span>
                      </div>
                    </TableCell>
                    <TableCell>{category.order}</TableCell>
                    <TableCell>
                      {category.is_active ? <Badge variant="success">{t('settings.isActive')}</Badge> : <Badge variant="secondary">{t('common.inactive') || 'Inactive'}</Badge>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(category)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        {!category.is_system && (
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteCategory(category.id, category.is_system)} disabled={deleteCategory.isPending}>
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
                <Input id="edit-category-name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required disabled={selectedCategory?.is_system} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-description">{t('settings.categoryDescription')}</Label>
                <Textarea id="edit-category-description" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} rows={2} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-color">{t('settings.categoryColor')}</Label>
                <Input id="edit-category-color" type="color" value={formData.color} onChange={(e) => setFormData({ ...formData, color: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-category-order">{t('settings.order')}</Label>
                <Input id="edit-category-order" type="number" value={formData.order} onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })} />
              </div>
              <div className="flex items-center space-x-2">
                <Switch id="edit-category-active" checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
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

// ==================== MAIN CATEGORIES TAB ====================

export default function CategoriesTab() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('member-statuses');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('settings.categories') || 'Categories'}</h2>
        <p className="text-sm text-gray-500">{t('settings.categoriesDesc') || 'Manage all category types used across the application'}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
          <TabsList className="inline-flex w-max md:w-full md:max-w-md md:grid md:grid-cols-3 gap-1">
            <TabsTrigger value="member-statuses" className="flex items-center gap-1 whitespace-nowrap">
              <Users className="h-4 w-4 hidden sm:block" />
              {t('settings.memberStatuses') || 'Statuses'}
            </TabsTrigger>
            <TabsTrigger value="community" className="flex items-center gap-1 whitespace-nowrap">
              <Tag className="h-4 w-4 hidden sm:block" />
              {t('settings.communityCategories') || 'Community'}
            </TabsTrigger>
            <TabsTrigger value="events" className="flex items-center gap-1 whitespace-nowrap">
              <Calendar className="h-4 w-4 hidden sm:block" />
              {t('settings.eventCategories') || 'Events'}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="member-statuses" className="mt-6">
          <MemberStatusesSection />
        </TabsContent>

        <TabsContent value="community" className="mt-6">
          <CommunityCategoriesSection />
        </TabsContent>

        <TabsContent value="events" className="mt-6">
          <EventCategoriesSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
