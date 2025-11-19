import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  useMemberStatuses,
  useCreateMemberStatus,
  useUpdateMemberStatus,
  useDeleteMemberStatus,
} from '../../hooks/useSettings';
import { useReorderMemberStatuses } from '../../hooks/useStatusAutomation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Plus, Edit, Trash2, Loader2, Settings, GripVertical, Shield } from 'lucide-react';
import { Switch } from '../ui/switch';
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

const initialFormData = {
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
        <Badge
          style={{
            backgroundColor: status.color,
            color: '#fff',
          }}
        >
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(status)}
          >
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

export default function MemberStatusesTabNew() {
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
    if (!window.confirm('Are you sure you want to delete this status?')) {
      return;
    }
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
    setFormData(initialFormData);
    setSelectedStatus(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">Member Statuses</h2>
          <p className="text-sm text-gray-500">Manage member status categories with colors and ordering</p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Status
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Status</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreateStatus} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="status-name">Name *</Label>
                <Input
                  id="status-name"
                  placeholder="e.g., Full Member"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-description">Description</Label>
                <Textarea
                  id="status-description"
                  placeholder="Describe this status"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status-color">Color</Label>
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
                  <Badge style={{ backgroundColor: formData.color, color: '#fff' }}>
                    Preview
                  </Badge>
                  <span className="text-xs text-gray-500">Badge preview</span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="status-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="status-active">Active</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="status-default"
                  checked={formData.is_default}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
                />
                <div className="flex-1">
                  <Label htmlFor="status-default">Default for New Members</Label>
                  <p className="text-xs text-gray-500 mt-1">
                    This status will be assigned to new members by default
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
                  Cancel
                </Button>
                <Button type="submit" disabled={createStatus.isPending}>
                  {createStatus.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Statuses List</CardTitle>
          <CardDescription>
            {statuses.length} status(es) • Drag to reorder (system statuses cannot be moved)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-500">Loading...</p>
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              <p>Failed to load statuses</p>
            </div>
          ) : statuses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Settings className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>No statuses yet</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Preview</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <SortableContext items={statuses.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                    {statuses.map((status) => (
                      <SortableRow
                        key={status.id}
                        status={status}
                        onEdit={openEditDialog}
                        onDelete={handleDeleteStatus}
                        isDeleting={deleteStatus.isPending}
                      />
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
            <DialogTitle>Edit Status</DialogTitle>
            <DialogDescription>
              {selectedStatus?.is_system && (
                <span className="text-amber-600">System status - name cannot be changed</span>
              )}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateStatus} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-status-name">Name *</Label>
              <Input
                id="edit-status-name"
                placeholder="e.g., Full Member"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={selectedStatus?.is_system}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status-description">Description</Label>
              <Textarea
                id="edit-status-description"
                placeholder="Describe this status"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="edit-status-color"
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
                <Badge style={{ backgroundColor: formData.color, color: '#fff' }}>
                  Preview
                </Badge>
                <span className="text-xs text-gray-500">Badge preview</span>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-status-active"
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label htmlFor="edit-status-active">Active</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="edit-status-default"
                checked={formData.is_default}
                onCheckedChange={(checked) => setFormData({ ...formData, is_default: checked })}
              />
              <div className="flex-1">
                <Label htmlFor="edit-status-default">Default for New Members</Label>
                <p className="text-xs text-gray-500 mt-1">
                  This status will be assigned to new members by default
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
                Cancel
              </Button>
              <Button type="submit" disabled={updateStatus.isPending}>
                {updateStatus.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
