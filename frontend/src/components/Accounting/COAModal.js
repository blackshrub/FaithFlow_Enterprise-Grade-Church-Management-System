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
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { useCreateCOA, useUpdateCOA } from '../../hooks/useAccounting';
import AccountSelector from './AccountSelector';
import { useToast } from '../../hooks/use-toast';

const COAModal = ({ open, onOpenChange, account = null, onSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const isEdit = !!account;

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    account_type: 'Asset',
    normal_balance: 'Debit',
    parent_id: null,
    is_active: true,
    tags: []
  });

  const createMutation = useCreateCOA();
  const updateMutation = useUpdateCOA();

  useEffect(() => {
    if (account) {
      setFormData({
        code: account.code || '',
        name: account.name || '',
        description: account.description || '',
        account_type: account.account_type || 'Asset',
        normal_balance: account.normal_balance || 'Debit',
        parent_id: account.parent_id || null,
        is_active: account.is_active !== false,
        tags: account.tags || []
      });
    }
  }, [account]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: account.id, data: formData });
      } else {
        await createMutation.mutateAsync(formData);
      }

      toast({
        title: t('accounting.common.success'),
        description: isEdit 
          ? `Account ${formData.code} updated` 
          : `Account ${formData.code} created`
      });

      onSuccess?.();
      onOpenChange(false);

      // Reset form
      if (!isEdit) {
        setFormData({
          code: '',
          name: '',
          description: '',
          account_type: 'Asset',
          normal_balance: 'Debit',
          parent_id: null,
          is_active: true,
          tags: []
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

  // Auto-suggest normal balance based on account type
  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      account_type: type,
      normal_balance: ['Asset', 'Expense'].includes(type) ? 'Debit' : 'Credit'
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? t('accounting.coa.editAccount') : t('accounting.coa.createAccount')}
          </DialogTitle>
          <DialogDescription>
            {t('accounting.coa.codeTooltip')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('accounting.coa.accountCode')} *</Label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({...formData, code: e.target.value.toUpperCase()})}
                placeholder="1100"
                required
                disabled={isEdit}
              />
            </div>

            <div>
              <Label>{t('accounting.coa.accountName')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Kas"
                required
              />
            </div>
          </div>

          <div>
            <Label>{t('accounting.coa.description')}</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              placeholder={t('accounting.coa.assetExplanation')}
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('accounting.coa.accountType')} *</Label>
              <Select value={formData.account_type} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Asset">{t('accounting.coa.asset')}</SelectItem>
                  <SelectItem value="Liability">{t('accounting.coa.liability')}</SelectItem>
                  <SelectItem value="Equity">{t('accounting.coa.equity')}</SelectItem>
                  <SelectItem value="Income">{t('accounting.coa.income')}</SelectItem>
                  <SelectItem value="Expense">{t('accounting.coa.expense')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {t(`accounting.coa.${formData.account_type?.toLowerCase()}Explanation`)}
              </p>
            </div>

            <div>
              <Label>{t('accounting.coa.normalBalance')} *</Label>
              <Select 
                value={formData.normal_balance} 
                onValueChange={(value) => setFormData({...formData, normal_balance: value})}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debit">{t('accounting.coa.debit')}</SelectItem>
                  <SelectItem value="Credit">{t('accounting.coa.credit')}</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                {t('accounting.coa.normalBalanceTooltip')}
              </p>
            </div>
          </div>

          <div>
            <AccountSelector
              label={t('accounting.coa.parentAccount')}
              value={formData.parent_id || ''}
              onChange={(value) => setFormData({...formData, parent_id: value})}
              placeholder={t('accounting.common.optional')}
            />
            <p className="text-xs text-gray-500 mt-1">
              {t('accounting.coa.parentTooltip')}
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="rounded"
            />
            <Label htmlFor="is_active">{t('accounting.coa.active')}</Label>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('accounting.common.cancel')}
            </Button>
            <Button 
              type="submit" 
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending 
                ? t('accounting.common.loading') 
                : t('accounting.common.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default COAModal;
