import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  useMemberStatuses,
  useCreateMemberStatus,
  useUpdateMemberStatus,
  useDeleteMemberStatus,
} from '../../hooks/useSettings';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Plus, Edit, Trash2, Loader2, Settings } from 'lucide-react';
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

  const { data: statuses = [], isLoading, error } = useMemberStatuses();
  const createStatus = useCreateMemberStatus();
  const updateStatus = useUpdateMemberStatus();
  const deleteStatus = useDeleteMemberStatus();

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
      order: status.order || 0,
      is_active: status.is_active ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedStatus(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t('settings.memberStatuses')}</h2>
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
              <div className="space-y-2">
                <Label htmlFor="status-order">{t('settings.order')}</Label>
                <Input
                  id="status-order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
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
                <Label htmlFor="status-default">{t('settings.defaultForNewVisitors')}</Label>
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
          ) : statuses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>{t('settings.noStatuses')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.statusName')}</TableHead>
                  <TableHead>{t('settings.statusDescription')}</TableHead>
                  <TableHead>{t('settings.order')}</TableHead>
                  <TableHead>{t('settings.isActive')}</TableHead>
                  <TableHead className="text-right">{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status) => (
                  <TableRow key={status.id}>
                    <TableCell className="font-medium">{status.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {status.description || t('common.na')}
                    </TableCell>
                    <TableCell>{status.order}</TableCell>
                    <TableCell>
                      {status.is_active ? (
                        <Badge variant="default">Active</Badge>
                      ) : (
                        <Badge variant="secondary">Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditDialog(status)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteStatus(status.id)}
                          disabled={deleteStatus.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
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
            <div className="space-y-2">
              <Label htmlFor="edit-status-order">{t('settings.order')}</Label>
              <Input
                id="edit-status-order"
                type="number"
                value={formData.order}
                onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
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
