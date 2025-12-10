import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useAuth } from '../../context/AuthContext';
import {
  useDemographics,
  useCreateDemographic,
  useUpdateDemographic,
  useDeleteDemographic,
  useValidateDemographics,
  useRegenerateDemographics,
} from '../../hooks/useSettings';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Plus, Edit, Trash2, Loader2, Users, RefreshCw, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react';
import DemographicForm from './DemographicForm';

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
  const [isRegenerateDialogOpen, setIsRegenerateDialogOpen] = useState(false);
  const [selectedDemographic, setSelectedDemographic] = useState(null);
  const [formData, setFormData] = useState(initialFormData);
  const [validationResult, setValidationResult] = useState(null);

  const { data: demographics = [], isLoading, error } = useDemographics();
  const createDemographic = useCreateDemographic();
  const updateDemographic = useUpdateDemographic();
  const deleteDemographic = useDeleteDemographic();
  const validateDemographics = useValidateDemographics();
  const regenerateDemographics = useRegenerateDemographics();

  // Validate on load and when demographics change
  useEffect(() => {
    if (demographics.length > 0) {
      handleValidate(true); // silent validation
    }
  }, [demographics]);

  const handleValidate = async (silent = false) => {
    validateDemographics.mutate(undefined, {
      onSuccess: (response) => {
        setValidationResult(response.data);
        if (!silent) {
          if (response.data.valid) {
            toast.success('All demographic ranges are valid');
          } else {
            toast.error(`Found ${response.data.errors.length} validation error(s)`);
          }
        }
      },
    });
  };

  const handleCreateDemographic = async (e) => {
    e.preventDefault();

    // Client-side validation for overlaps
    const overlap = demographics.find(d =>
      d.is_active &&
      formData.is_active &&
      formData.min_age <= d.max_age &&
      formData.max_age >= d.min_age
    );

    if (overlap) {
      toast.error(`Age range overlaps with "${overlap.name}" (${overlap.min_age}-${overlap.max_age})`);
      return;
    }

    if (!church?.id) return;
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

    // Client-side validation for overlaps (exclude current demographic)
    const overlap = demographics.find(d =>
      d.id !== selectedDemographic.id &&
      d.is_active &&
      formData.is_active &&
      formData.min_age <= d.max_age &&
      formData.max_age >= d.min_age
    );

    if (overlap) {
      toast.error(`Age range overlaps with "${overlap.name}" (${overlap.min_age}-${overlap.max_age})`);
      return;
    }

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

  const handleRegenerate = () => {
    regenerateDemographics.mutate(undefined, {
      onSuccess: (response) => {
        setIsRegenerateDialogOpen(false);
        toast.success(`Updated ${response.data.updated_count} members`);
      },
    });
  };

  const openEditDialog = (demographic) => {
    setSelectedDemographic(demographic);
    // CRITICAL: Use ?? (nullish coalescing) to preserve falsy values like 0 for min_age
    setFormData({
      name: demographic.name ?? '',
      min_age: demographic.min_age ?? 0,
      max_age: demographic.max_age ?? 100,
      description: demographic.description ?? '',
      order: demographic.order ?? 0,
      is_active: demographic.is_active ?? true,
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData(initialFormData);
    setSelectedDemographic(null);
  };

  const hasValidationErrors = validationResult && !validationResult.valid;
  const hasValidationWarnings = validationResult && validationResult.warnings?.length > 0;

  return (
    <div className="space-y-6">
      {/* Validation Alerts */}
      {hasValidationErrors && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Validation Errors</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validationResult.errors.map((err, i) => (
                <li key={i}>{err.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {hasValidationWarnings && !hasValidationErrors && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Warnings</AlertTitle>
          <AlertDescription>
            <ul className="list-disc list-inside mt-2 space-y-1">
              {validationResult.warnings.map((warn, i) => (
                <li key={i}>{warn.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold">{t('settings.demographics')}</h2>
          <p className="text-sm text-gray-500">
            Define age ranges for member categories. Changes require regeneration to update existing members.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Regenerate Button */}
          <Dialog open={isRegenerateDialogOpen} onOpenChange={setIsRegenerateDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={hasValidationErrors}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Regenerate All
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Regenerate Demographics</DialogTitle>
                <DialogDescription>
                  This will recalculate the demographic category for all members based on their date of birth
                  and the current age ranges defined above.
                </DialogDescription>
              </DialogHeader>

              {hasValidationErrors ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Cannot Regenerate</AlertTitle>
                  <AlertDescription>
                    Please fix the validation errors before regenerating demographics.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-800">
                      <strong>What will happen:</strong>
                    </p>
                    <ul className="list-disc list-inside text-sm text-blue-700 mt-2">
                      <li>All members with a birth date will have their demographic recalculated</li>
                      <li>Members without a birth date will be skipped</li>
                      <li>This action cannot be undone</li>
                    </ul>
                  </div>

                  {validationResult && (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-sm">All {validationResult.total_presets} demographic ranges are valid</span>
                    </div>
                  )}
                </div>
              )}

              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsRegenerateDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleRegenerate}
                  disabled={regenerateDemographics.isPending || hasValidationErrors}
                >
                  {regenerateDemographics.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Regenerating...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Regenerate Now
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Add Demographic Button */}
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
              <DemographicForm
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleCreateDemographic}
                isPending={createDemographic.isPending}
                onCancel={() => setIsCreateDialogOpen(false)}
                isEdit={false}
                existingDemographics={demographics}
              />
            </DialogContent>
          </Dialog>
        </div>
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
                {demographics.map((demographic) => {
                  // Check if this demographic has validation errors
                  const hasError = validationResult?.errors?.some(
                    err => err.preset_id === demographic.id ||
                      err.preset_ids?.includes(demographic.id)
                  );

                  return (
                    <TableRow key={demographic.id} className={hasError ? 'bg-red-50' : ''}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {demographic.name}
                          {hasError && <AlertTriangle className="h-4 w-4 text-red-500" />}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={hasError ? 'destructive' : 'outline'}>
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
                  );
                })}
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
          <DemographicForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdateDemographic}
            isPending={updateDemographic.isPending}
            onCancel={() => setIsEditDialogOpen(false)}
            isEdit={true}
            existingDemographics={demographics.filter(d => d.id !== selectedDemographic?.id)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
