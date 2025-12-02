import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  useMemberStatuses,
  useCreateMemberStatus,
  useUpdateMemberStatus,
  useDeleteMemberStatus,
  useReorderMemberStatuses,
} from '../../hooks/useSettings';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Plus, Edit, Trash2, Loader2, Settings, GripVertical } from 'lucide-react';
import { Switch } from '../ui/switch';

const initialFormData = {
  name: '',
  description: '',
  order: 0,
  is_active: true,
  is_default_for_new: false,
};

export default function MemberStatusesTab() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [localStatuses, setLocalStatuses] = useState(null);
  const dragNode = useRef(null);

  const { data: statuses = [], isLoading, error } = useMemberStatuses();
  const createStatus = useCreateMemberStatus();
  const updateStatus = useUpdateMemberStatus();
  const deleteStatus = useDeleteMemberStatus();
  const reorderStatuses = useReorderMemberStatuses();

  // Use local statuses during drag, otherwise use server data
  const displayStatuses = localStatuses || statuses;

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
    if (!window.confirm(t('settings.confirmDeleteStatus'))) {
      return;
    }
    deleteStatus.mutate(statusId);
  };

  const openEditDialog = (status) => {
    setSelectedStatus(status);
    setFormData({
      name: status.name || '',
      description: status.description || '',
      order: status.display_order || status.order || 0,
      is_active: status.is_active ?? true,
      is_default_for_new: status.is_default_for_new ?? false,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedStatus(null);
  };

  // Drag handlers
  const handleDragStart = (e, index) => {
    dragNode.current = e.target;
    setDraggedIndex(index);

    // Set drag image
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());

    // Delay adding dragging class for better UX
    setTimeout(() => {
      if (dragNode.current) {
        dragNode.current.classList.add('opacity-50');
      }
    }, 0);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = (e) => {
    // Only clear if leaving the item completely
    if (!e.currentTarget.contains(e.relatedTarget)) {
      // Keep dragOverIndex for visual feedback
    }
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();

    if (draggedIndex === null || draggedIndex === targetIndex) {
      resetDragState();
      return;
    }

    // Reorder the list
    const newStatuses = [...(localStatuses || statuses)];
    const [draggedItem] = newStatuses.splice(draggedIndex, 1);
    newStatuses.splice(targetIndex, 0, draggedItem);

    // Update local state immediately for visual feedback
    setLocalStatuses(newStatuses);

    // Send to backend
    const statusIds = newStatuses.map(s => s.id);
    reorderStatuses.mutate(statusIds, {
      onSuccess: () => {
        setLocalStatuses(null); // Use server data
      },
      onError: () => {
        setLocalStatuses(null); // Revert to server data
      }
    });

    resetDragState();
  };

  const handleDragEnd = () => {
    if (dragNode.current) {
      dragNode.current.classList.remove('opacity-50');
    }
    resetDragState();
  };

  const resetDragState = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
    dragNode.current = null;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t('settings.memberStatuses')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('settings.dragToReorder', 'Drag rows to reorder')}</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('settings.addStatus')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('settings.createStatus')}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStatus} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-name">{t('settings.statusName')} *</Label>
                <Input
                  id="status-name"
                  placeholder={t('settings.statusPlaceholder')}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-description">{t('settings.statusDescription')}</Label>
                <Textarea
                  id="status-description"
                  placeholder={t('settings.descriptionPlaceholder')}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="status-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="status-active">{t('settings.isActive')}</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="status-default"
                  checked={formData.is_default_for_new}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default_for_new: checked })}
                />
                <div className="flex-1">
                  <Label htmlFor="status-default">{t('settings.defaultForNewVisitors')}</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    {t('settings.defaultForNewVisitorsDesc')}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={createStatus.isPending}
                >
                  {t('common.cancel')}
                </Button>
                <Button type="submit" disabled={createStatus.isPending}>
                  {createStatus.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {t('common.loading')}
                    </>
                  ) : (
                    t('common.create')
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.statusesList')}</CardTitle>
          <CardDescription>
            {t('settings.statusTotal', { count: statuses.length })}
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
              <p>{t('settings.loadError')}</p>
            </div>
          ) : displayStatuses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>{t('settings.noStatuses')}</p>
            </div>
          ) : (
            <div className="space-y-1">
              {displayStatuses.map((status, index) => (
                <div
                  key={status.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnter={(e) => handleDragEnter(e, index)}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-4 p-3 border rounded-lg bg-white
                    transition-all duration-150 cursor-grab active:cursor-grabbing
                    ${draggedIndex === index ? 'opacity-50 scale-[0.98]' : ''}
                    ${dragOverIndex === index && draggedIndex !== index
                      ? 'border-blue-500 border-2 bg-blue-50'
                      : 'hover:bg-gray-50 border-gray-200'}
                  `}
                >
                  <div className="flex items-center gap-2 text-gray-400">
                    <GripVertical className="h-5 w-5 flex-shrink-0" />
                    <span className="text-xs font-mono w-6">#{index + 1}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{status.name}</span>
                      {status.is_default_for_new && (
                        <Badge variant="default" className="bg-blue-600 text-xs">Default</Badge>
                      )}
                    </div>
                    {status.description && (
                      <p className="text-sm text-gray-500 truncate">{status.description}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {status.is_active ? (
                      <Badge variant="default" className="bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditDialog(status);
                      }}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteStatus(status.id);
                      }}
                      disabled={deleteStatus.isPending || status.is_system}
                      title={status.is_system ? t('settings.cannotDeleteSystemStatus') : ''}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {reorderStatuses.isPending && (
            <div className="mt-4 text-center text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
              Saving order...
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('settings.editStatus')}</DialogTitle>
            <DialogDescription>{t('settings.updateStatus')}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status-name">{t('settings.statusName')} *</Label>
              <Input
                id="edit-status-name"
                placeholder={t('settings.statusPlaceholder')}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status-description">{t('settings.statusDescription')}</Label>
              <Textarea
                id="edit-status-description"
                placeholder={t('settings.descriptionPlaceholder')}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-status-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-status-active">{t('settings.isActive')}</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-status-default"
                checked={formData.is_default_for_new}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default_for_new: checked })}
              />
              <div className="flex-1">
                <Label htmlFor="edit-status-default">{t('settings.defaultForNewVisitors')}</Label>
                <p className="text-xs text-gray-500 mt-1">
                  {t('settings.defaultForNewVisitorsDesc')}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={updateStatus.isPending}
              >
                {t('common.cancel')}
              </Button>
              <Button type="submit" disabled={updateStatus.isPending}>
                {updateStatus.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('common.update')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
