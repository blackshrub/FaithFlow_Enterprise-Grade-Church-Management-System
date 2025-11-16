import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { DialogFooter } from '../ui/dialog';
import { Loader2 } from 'lucide-react';

export default function DemographicForm({ formData, setFormData, onSubmit, isPending, onCancel, isEdit = false }) {
  const { t } = useTranslation();

  return (
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
          onClick={onCancel}
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
            isEdit ? t('common.update') : t('common.create')
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}
