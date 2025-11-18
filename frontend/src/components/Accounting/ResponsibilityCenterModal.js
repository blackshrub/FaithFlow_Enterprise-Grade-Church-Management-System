import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useCreateResponsibilityCenter, useUpdateResponsibilityCenter } from '../../hooks/useAccounting';
import { useToast } from '../../hooks/use-toast';

const ResponsibilityCenterModal = ({ open, onOpenChange, center = null, onSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = !!center;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'ministry',
    is_active: true
  });

  const createMutation = useCreateResponsibilityCenter();
  const updateMutation = useUpdateResponsibilityCenter();

  useEffect(() => {
    if (center) {
      setFormData({
        code: center.code || '',
        name: center.name || '',
        type: center.type || 'ministry',
        is_active: center.is_active !== false
      });
    }
  }, [center]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: center.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }

      toast({
        title: t('accounting.common.success'),
        description: isEdit 
          ? `${formData.name} updated` 
          : `${formData.name} created`
      });

      onSuccess?.();
      onOpenChange(false);

      if (!isEdit) {
        setFormData({
          code: '',
          name: '',
          type: 'ministry',
          is_active: true
        });
      }
    } catch (error) {
      const errorCode = error.response?.data?.detail?.error_code;
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: errorCode ? t(`errors.${errorCode}`) : error.message
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('accounting.responsibilityCenter.edit') : t('accounting.responsibilityCenter.create')}
          </DialogTitle>
          <DialogDescription>
            {t('accounting.responsibilityCenter.tooltip')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('accounting.responsibilityCenter.code')} *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="MIN-001"
                required
                disabled={isEdit}
              />
            </div>

            <div>
              <Label>{t('accounting.responsibilityCenter.name')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Ministry of Worship"
                required
              />
            </div>
          </div>

          <div>
            <Label>{t('accounting.responsibilityCenter.type')} *</Label>
            <Select 
              value={formData.type} 
              onValueChange={(value) => setFormData({...formData, type: value})}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="department">{t('accounting.responsibilityCenter.department')}</SelectItem>
                <SelectItem value="ministry">{t('accounting.responsibilityCenter.ministry')}</SelectItem>
                <SelectItem value="project">{t('accounting.responsibilityCenter.project')}</SelectItem>
                <SelectItem value="campus">{t('accounting.responsibilityCenter.campus')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="rc_is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="rc_is_active">{t('common.active')}</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('accounting.common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isLoading || updateMutation.isLoading}
            >
              {createMutation.isLoading || updateMutation.isLoading 
                ? t('accounting.common.loading') 
                : t('accounting.common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ResponsibilityCenterModal;
