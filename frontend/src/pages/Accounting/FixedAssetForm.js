import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useCreateAsset } from '../../hooks/useAccounting';
import AccountSelector from '../../components/Accounting/AccountSelector';
import CurrencyInput from '../../components/Accounting/CurrencyInput';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import FileUpload from '../../components/Accounting/FileUpload';
import { useToast } from '../../hooks/use-toast';

export default function FixedAssetForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    asset_code: '',
    name: '',
    acquisition_date: new Date().toISOString().split('T')[0],
    cost: 0,
    useful_life_months: 60,
    salvage_value: 0,
    depreciation_method: 'straight_line',
    asset_account_id: '',
    depreciation_expense_account_id: '',
    accumulated_depreciation_account_id: '',
    is_active: true,
    attachments: []
  });

  const createMutation = useCreateAsset();

  // Calculate monthly depreciation preview
  const monthlyDepreciation = (formData.cost - formData.salvage_value) / formData.useful_life_months;

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await createMutation.mutateAsync(formData);
      toast({
        title: t('accounting.common.success'),
        description: `Asset ${formData.asset_code} created`
      });
      navigate('/accounting/assets');
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.common.create')} {t('accounting.fixedAsset.title')}</h1>
          <p className="text-gray-600">{t('accounting.fixedAsset.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/accounting/assets')}>
          {t('accounting.common.back')}
        </Button>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">{t('accounting.fixedAsset.depreciationTooltip')}</p>
              <p className="text-sm text-blue-700 mt-1">{t('accounting.fixedAsset.straightLineTooltip')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>{t('accounting.fixedAsset.assetName')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>{t('accounting.fixedAsset.assetCode')} *</Label>
                <Input
                  value={formData.asset_code}
                  onChange={(e) => setFormData({...formData, asset_code: e.target.value.toUpperCase()})}
                  placeholder="VEH-001"
                  required
                />
              </div>

              <div>
                <Label>{t('accounting.fixedAsset.assetName')} *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Church Van"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>{t('accounting.fixedAsset.acquisitionDate')} *</Label>
                <Input
                  type="date"
                  value={formData.acquisition_date}
                  onChange={(e) => setFormData({...formData, acquisition_date: e.target.value})}
                  required
                />
              </div>

              <CurrencyInput
                label={t('accounting.fixedAsset.cost')}
                value={formData.cost}
                onChange={(value) => setFormData({...formData, cost: value})}
                required
              />

              <div>
                <Label>{t('accounting.fixedAsset.usefulLifeMonths')} *</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.useful_life_months}
                  onChange={(e) => setFormData({...formData, useful_life_months: parseInt(e.target.value)})}
                  required
                />
              </div>
            </div>

            <CurrencyInput
              label={t('accounting.fixedAsset.salvageValue')}
              value={formData.salvage_value}
              onChange={(value) => setFormData({...formData, salvage_value: value})}
            />

            <div>
              <Label>{t('accounting.fixedAsset.depreciationMethod')}</Label>
              <Select value={formData.depreciation_method} onValueChange={(value) => setFormData({...formData, depreciation_method: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="straight_line">{t('accounting.fixedAsset.straightLine')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('accounting.coa.title')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <AccountSelector
              label={t('accounting.fixedAsset.assetAccount')}
              value={formData.asset_account_id}
              onChange={(value) => setFormData({...formData, asset_account_id: value})}
              filterByType="Asset"
              required
            />

            <AccountSelector
              label={t('accounting.fixedAsset.depreciationExpenseAccount')}
              value={formData.depreciation_expense_account_id}
              onChange={(value) => setFormData({...formData, depreciation_expense_account_id: value})}
              filterByType="Expense"
              required
            />

            <AccountSelector
              label={t('accounting.fixedAsset.accumulatedDepreciationAccount')}
              value={formData.accumulated_depreciation_account_id}
              onChange={(value) => setFormData({...formData, accumulated_depreciation_account_id: value})}
              filterByType="Asset"
              required
            />
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="font-medium text-green-900">{t('accounting.fixedAsset.monthlyDepreciation')}:</span>
              <span className="text-xl font-bold text-green-900">
                <CurrencyDisplay amount={monthlyDepreciation} />
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t('accounting.files.attachedFiles')} ({t('accounting.common.optional')})</CardTitle>
          </CardHeader>
          <CardContent>
            <FileUpload
              referenceType="asset"
              referenceId={null}
              onUploadSuccess={(file) => setFormData({
                ...formData,
                attachments: [...formData.attachments, file.id]
              })}
              multiple={true}
            />
            <p className="text-xs text-gray-500 mt-2">Upload purchase documents, invoices, etc.</p>
          </CardContent>
        </Card>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={() => navigate('/accounting/assets')}>
            {t('accounting.common.cancel')}
          </Button>
          <Button type="submit" disabled={createMutation.isLoading}>
            {createMutation.isLoading ? t('accounting.common.loading') : t('accounting.common.save')}
          </Button>
        </div>
      </form>
    </div>
  );
}
