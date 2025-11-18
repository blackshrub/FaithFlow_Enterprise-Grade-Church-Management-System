import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Info, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useCreateJournal, useUpdateJournal, useJournal } from '../../hooks/useAccounting';
import AccountSelector from '../../components/Accounting/AccountSelector';
import ResponsibilityCenterSelector from '../../components/Accounting/ResponsibilityCenterSelector';
import CurrencyInput from '../../components/Accounting/CurrencyInput';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import { useToast } from '../../hooks/use-toast';

export default function JournalForm() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    reference_number: '',
    description: '',
    lines: [
      { account_id: '', description: '', debit: 0, credit: 0, responsibility_center_id: null },
      { account_id: '', description: '', debit: 0, credit: 0, responsibility_center_id: null }
    ]
  });

  const { data: existingJournal } = useJournal(id);
  const createMutation = useCreateJournal();
  const updateMutation = useUpdateJournal();

  // Load existing journal data
  useEffect(() => {
    if (existingJournal) {
      setFormData({
        date: existingJournal.date,
        reference_number: existingJournal.reference_number || '',
        description: existingJournal.description,
        lines: existingJournal.lines || []
      });
    }
  }, [existingJournal]);

  // Calculate totals
  const totalDebit = formData.lines.reduce((sum, line) => sum + (parseFloat(line.debit) || 0), 0);
  const totalCredit = formData.lines.reduce((sum, line) => sum + (parseFloat(line.credit) || 0), 0);
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handleAddLine = () => {
    setFormData({
      ...formData,
      lines: [
        ...formData.lines,
        { account_id: '', description: '', debit: 0, credit: 0, responsibility_center_id: null }
      ]
    });
  };

  const handleRemoveLine = (index) => {
    if (formData.lines.length <= 2) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: t('accounting.journal.minimumTwoLines')
      });
      return;
    }
    const newLines = formData.lines.filter((_, i) => i !== index);
    setFormData({ ...formData, lines: newLines });
  };

  const handleLineChange = (index, field, value) => {
    const newLines = [...formData.lines];
    newLines[index][field] = value;
    setFormData({ ...formData, lines: newLines });
  };

  const handleSubmit = async (asDraft = true) => {
    // Validate
    if (!isBalanced) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: t('accounting.journal.mustBeBalanced')
      });
      return;
    }

    const payload = {
      ...formData,
      status: asDraft ? 'draft' : 'approved'
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: payload });
      } else {
        await createMutation.mutateAsync(payload);
      }
      
      toast({
        title: t('accounting.common.success'),
        description: asDraft ? 'Journal saved as draft' : 'Journal created and approved'
      });
      
      navigate('/accounting/journals');
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {isEdit ? t('accounting.journal.editJournal') : t('accounting.journal.createJournal')}
          </h1>
          <p className="text-gray-600">{t('accounting.journal.journalTooltip')}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/accounting/journals')}>
          {t('accounting.common.back')}
        </Button>
      </div>

      {/* Help Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">{t('accounting.journal.mustBeBalanced')}</p>
              <p className="text-xs text-blue-700 mt-1">{t('accounting.journal.exampleJournal')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.journal.description')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>{t('accounting.journal.journalDate')} *</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <Label>{t('accounting.journal.referenceNumber')}</Label>
              <Input
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
                placeholder="INV-001"
              />
            </div>
          </div>

          <div>
            <Label>{t('accounting.journal.description')} *</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder={t('accounting.journal.exampleJournal')}
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Journal Lines */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('accounting.journal.journalLines')}</CardTitle>
            <Button variant="outline" size="sm" onClick={handleAddLine}>
              <Plus className="w-4 h-4 mr-2" />
              {t('accounting.journal.addLine')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.lines.map((line, index) => (
            <div key={index} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Line {index + 1}</span>
                {formData.lines.length > 2 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveLine(index)}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AccountSelector
                  label={t('accounting.coa.accountName')}
                  value={line.account_id}
                  onChange={(value) => handleLineChange(index, 'account_id', value)}
                  required
                />

                <div>
                  <Label>{t('accounting.journal.description')}</Label>
                  <Input
                    value={line.description}
                    onChange={(e) => handleLineChange(index, 'description', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <CurrencyInput
                  label={t('accounting.journal.debitAmount')}
                  value={line.debit}
                  onChange={(value) => {
                    handleLineChange(index, 'debit', value);
                    handleLineChange(index, 'credit', 0);
                  }}
                />

                <CurrencyInput
                  label={t('accounting.journal.creditAmount')}
                  value={line.credit}
                  onChange={(value) => {
                    handleLineChange(index, 'credit', value);
                    handleLineChange(index, 'debit', 0);
                  }}
                />

                <ResponsibilityCenterSelector
                  label={t('accounting.quickEntry.responsibilityCenter')}
                  value={line.responsibility_center_id || ''}
                  onChange={(value) => handleLineChange(index, 'responsibility_center_id', value)}
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Balance Summary */}
      <Card className={isBalanced ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {isBalanced ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <p className="font-medium">
                  {isBalanced ? t('accounting.journal.balanced') : t('accounting.journal.unbalanced')}
                </p>
                <p className="text-sm text-gray-600">
                  {t('accounting.journal.totalDebit')}: <CurrencyDisplay amount={totalDebit} /> | {' '}
                  {t('accounting.journal.totalCredit')}: <CurrencyDisplay amount={totalCredit} />
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Button variant="outline" onClick={() => navigate('/accounting/journals')}>
                {t('accounting.common.cancel')}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => handleSubmit(true)}
                disabled={!isBalanced}
              >
                {t('accounting.journal.saveAsDraft')}
              </Button>
              <Button 
                onClick={() => handleSubmit(false)}
                disabled={!isBalanced}
              >
                {t('accounting.journal.saveAndApprove')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
