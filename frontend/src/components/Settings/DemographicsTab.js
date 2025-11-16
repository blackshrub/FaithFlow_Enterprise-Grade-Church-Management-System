import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import {
  useDemographics,
  useCreateDemographic,
  useUpdateDemographic,
  useDeleteDemographic,
} from '../../hooks/useSettings';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Plus, Edit, Trash2, Loader2, Users } from 'lucide-react';
import { Switch } from '../ui/switch';

const initialFormData = {
  name: '',
  min_age: 0,
  max_age: 100,
  description: '',
  order: 0,
  is_active: true,
};

export default function DemographicsTab() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedDemographic, setSelectedDemographic] = useState(null);
  const [formData, setFormData] = useState(initialFormData);

  const { data: demographics = [], isLoading, error } = useDemographics();
  const createDemographic = useCreateDemographic();
  const updateDemographic = useUpdateDemographic();
  const deleteDemographic = useDeleteDemographic();

  const handleCreateDemographic = async (e) => {
    e.preventDefault();
    createDemographic.mutate(
      { ...formData, church_id: church.id },
      {
        onSuccess: () => {
          setIsCreateDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleUpdateDemographic = async (e) => {
    e.preventDefault();
    updateDemographic.mutate(
      { id: selectedDemographic.id, data: formData },
      {
        onSuccess: () => {
          setIsEditDialogOpen(false);
          resetForm();
        },
      }
    );
  };

  const handleDeleteDemographic = async (demographicId) => {
    if (!window.confirm(t('settings.confirmDeleteDemographic'))) {
      return;
    }
    deleteDemographic.mutate(demographicId);
  };

  const openEditDialog = (demographic) => {
    setSelectedDemographic(demographic);
    setFormData({
      name: demographic.name || '',
      min_age: demographic.min_age || 0,
      max_age: demographic.max_age || 100,
      description: demographic.description || '',
      order: demographic.order || 0,
      is_active: demographic.is_active ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedDemographic(null);
  };

  const DemographicForm = ({ onSubmit, isPending }) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>{t('settings.demographicName')} *</Label>
        <Input
          placeholder={t('settings.demographicPlaceholder')}
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>{t('settings.minAge')} *</Label>
          <Input
            type="number"
            min="0"
            max="150"
            value={formData.min_age}
            onChange={(e) => setFormData({ ...formData, min_age: parseInt(e.target.value) || 0 })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label>{t('settings.maxAge')} *</Label>
          <Input
            type="number"
            min="0"
            max="150"
            value={formData.max_age}
            onChange={(e) => setFormData({ ...formData, max_age: parseInt(e.target.value) || 100 })}
            required
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>{t('settings.demographicDescription')}</Label>
        <Textarea
          placeholder={t('settings.descriptionPlaceholder')}
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>
      <div className="space-y-2">
        <Label>{t('settings.order')}</Label>
        <Input
          type="number"
          value={formData.order}
          onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
        />
      </div>
      <div className="flex items-center space-x-2">
        <Switch
          checked={formData.is_active}
          onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
        />
        <Label>{t('settings.isActive')}</Label>
      </div>
      <DialogFooter>
        <Button 
          type="button" 
          variant="outline" 
          onClick={() => {
            setIsCreateDialogOpen(false);
            setIsEditDialogOpen(false);
          }}
          disabled={isPending}
        >
          {t('common.cancel')}
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('common.loading')}
            </>
          ) : (
            selectedDemographic ? t('common.update') : t('common.create')
          )}
        </Button>
      </DialogFooter>
    </form>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t('settings.demographics')}</h2>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              {t('settings.addDemographic')}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('settings.createDemographic')}</DialogTitle>
            </DialogHeader>
            <DemographicForm onSubmit={handleCreateDemographic} isPending={createDemographic.isPending} />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.demographicsList')}</CardTitle>
          <CardDescription>
            {t('settings.demographicTotal', { count: demographics.length })}
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
          ) : demographics.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p>{t('settings.noDemographics')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('settings.demographicName')}</TableHead>
                  <TableHead>{t('settings.ageRange')}</TableHead>
                  <TableHead>{t('settings.demographicDescription')}</TableHead>
                  <TableHead>{t('settings.order')}</TableHead>
                  <TableHead>{t('settings.isActive')}</TableHead>
                  <TableHead className="text-right">{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {demographics.map((demographic) => (
                  <TableRow key={demographic.id}>
                    <TableCell className="font-medium">{demographic.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t('settings.ageRangeDisplay', { 
                          min: demographic.min_age, 
                          max: demographic.max_age 
                        })}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {demographic.description || t('common.na')}
                    </TableCell>
                    <TableCell>{demographic.order}</TableCell>
                    <TableCell>
                      {demographic.is_active ? (
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
                          onClick={() => openEditDialog(demographic)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteDemographic(demographic.id)}
                          disabled={deleteDemographic.isPending}
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
            <DialogTitle>{t('settings.editDemographic')}</DialogTitle>
            <DialogDescription>{t('settings.updateDemographic')}</DialogDescription>
          </DialogHeader>
          <DemographicForm onSubmit={handleUpdateDemographic} isPending={updateDemographic.isPending} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
