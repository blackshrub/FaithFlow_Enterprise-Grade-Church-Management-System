import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Zap, Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useCreateBudget, useActivateBudget } from '../../hooks/useAccounting';
import AccountSelector from '../../components/Accounting/AccountSelector';
import ResponsibilityCenterSelector from '../../components/Accounting/ResponsibilityCenterSelector';
import CurrencyInput from '../../components/Accounting/CurrencyInput';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import FileUpload from '../../components/Accounting/FileUpload';
import { useToast } from '../../hooks/use-toast';

export default function BudgetForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    fiscal_year: new Date().getFullYear(),
    lines: [
      { account_id: '', responsibility_center_id: null, annual_amount: 0, monthly_amounts: {} }
    ],
    attachments: []
  });

  const createMutation = useCreateBudget();
  const activateMutation = useActivateBudget();

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [...formData.lines, { account_id: '', responsibility_center_id: null, annual_amount: 0, monthly_amounts: {} }]
    });
  };

  const handleRemoveLine = (index) => {
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const handleAutoDistribute = () => {
    const newLines = formData.lines.map(line => {
      const monthlyAmount = line.annual_amount / 12;
      const monthly_amounts = {};
      for (let i = 1; i <= 12; i++) {
        monthly_amounts[i.toString().padStart(2, '0')] = monthlyAmount;
      }
      return { ...line, monthly_amounts };
    });
    setFormData({ ...formData, lines: newLines });
    toast({
      title: t('accounting.common.success'),
      description: t('accounting.budget.distributeTooltip')
    });
  };

  const handleSaveDraft = async () => {
    try {
      const response = await createMutation.mutateAsync({ ...formData, status: 'draft' });
      toast({
        title: t('accounting.common.success'),
        description: `Budget ${formData.name} created`
      });
      navigate('/accounting/budgets');
    } catch (error) {
      const errorCode = error.response?.data?.detail?.error_code;
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: errorCode ? t(`errors.${errorCode}`) : error.message
      });
    }
  };

  const calculateMonthlyTotal = (line) => {
    if (!line.monthly_amounts) return 0;
    return Object.values(line.monthly_amounts).reduce((sum, val) => sum + (parseFloat(val) || 0), 0);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.common.create')} {t('accounting.budget.title')}</h1>
          <p className="text-gray-600">{t('accounting.budget.subtitle')}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/accounting/budgets')}>
          {t('accounting.common.back')}
        </Button>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">{t('accounting.budget.activateTooltip')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.budget.budgetName')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('accounting.budget.budgetName')} *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Budget 2025"
                required
              />
            </div>
            <div>
              <Label>{t('accounting.budget.fiscalYear')} *</Label>
              <Input
                type="number"
                min="2000"
                max="2100"
                value={formData.fiscal_year}
                onChange={(e) => setFormData({...formData, fiscal_year: parseInt(e.target.value)})}
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('accounting.budget.title')} Lines</CardTitle>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handleAutoDistribute}>
                <Zap className="w-4 h-4 mr-2" />
                {t('accounting.budget.autoDistribute')}
              </Button>
              <Button variant="outline" size="sm" onClick={handleAddLine}>
                <Plus className="w-4 h-4 mr-2" />
                {t('accounting.journal.addLine')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.lines.map((line, index) => {
            const monthlyTotal = calculateMonthlyTotal(line);
            const isMonthlyValid = monthlyTotal === line.annual_amount;

            return (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Line {index + 1}</span>
                  {formData.lines.length > 1 && (
                    <Button variant="ghost" size="sm" onClick={() => handleRemoveLine(index)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <AccountSelector
                    label={t('accounting.coa.accountName')}
                    value={line.account_id}
                    onChange={(value) => handleLineChange(index, 'account_id', value)}
                    filterByType={['Income', 'Expense']}
                    required
                  />

                  <ResponsibilityCenterSelector
                    label={t('accounting.quickEntry.responsibilityCenter')}
                    value={line.responsibility_center_id || ''}
                    onChange={(value) => handleLineChange(index, 'responsibility_center_id', value)}
                  />
                </div>

                <CurrencyInput
                  label={t('accounting.budget.annualAmount')}
                  value={line.annual_amount}
                  onChange={(value) => handleLineChange(index, 'annual_amount', value)}
                  required
                />

                {Object.keys(line.monthly_amounts).length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">{t('accounting.budget.monthlyAmounts')}</span>
                      <span className={`text-sm ${isMonthlyValid ? 'text-green-600' : 'text-red-600'}`}>
                        Total: <CurrencyDisplay amount={monthlyTotal} /> 
                        {isMonthlyValid ? ' ✓' : ' ✗'}
                      </span>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      {Object.entries(line.monthly_amounts).map(([month, amount]) => (
                        <div key={month} className="text-xs">
                          <span className="text-gray-600">{month}:</span> {' '}
                          <CurrencyDisplay amount={amount} showSymbol={false} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.files.attachedFiles')} ({t('accounting.common.optional')})</CardTitle>
        </CardHeader>
        <CardContent>
          <FileUpload
            referenceType="budget"
            referenceId={null}
            onUploadSuccess={(file) => setFormData({
              ...formData,
              attachments: [...formData.attachments, file.id]
            })}
            multiple={true}
          />
        </CardContent>
      </Card>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={() => navigate('/accounting/budgets')}>
          {t('accounting.common.cancel')}
        </Button>
        <Button onClick={handleSaveDraft} disabled={createMutation.isLoading}>
          {createMutation.isLoading ? t('accounting.common.loading') : t('accounting.journal.saveAsDraft')}
        </Button>
      </div>
    </div>
  );
}
