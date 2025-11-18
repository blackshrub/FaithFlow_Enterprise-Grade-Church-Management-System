import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingDown, Info } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useCreateWeeklyGiving, useCreateOutgoingMoney } from '../../hooks/useAccounting';
import AccountSelector from '../../components/Accounting/AccountSelector';
import ResponsibilityCenterSelector from '../../components/Accounting/ResponsibilityCenterSelector';
import CurrencyInput from '../../components/Accounting/CurrencyInput';
import FileUpload from '../../components/Accounting/FileUpload';
import { useToast } from '../../hooks/use-toast';

export default function QuickEntry() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Weekly Giving State
  const [givingData, setGivingData] = useState({
    date: new Date().toISOString().split('T')[0],
    service_name: '',
    giving_type: 'Persembahan Umum',
    amount: 0,
    from_account_id: '',
    to_account_id: '',
    file_ids: []
  });

  // Outgoing Money State
  const [expenseData, setExpenseData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: 0,
    from_account_id: '',
    to_account_id: '',
    responsibility_center_id: null,
    file_ids: []
  });

  const givingMutation = useCreateWeeklyGiving();
  const expenseMutation = useCreateOutgoingMoney();

  const handleGivingSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await givingMutation.mutateAsync(givingData);
      toast({
        title: t('accounting.common.success'),
        description: t('accounting.quickEntry.givingSuccess', { 
          journalNumber: response.data.journal_number 
        })
      });
      
      // Reset form
      setGivingData({
        date: new Date().toISOString().split('T')[0],
        service_name: '',
        giving_type: 'Persembahan Umum',
        amount: 0,
        from_account_id: '',
        to_account_id: '',
        file_ids: []
      });
    } catch (error) {
      const errorCode = error.response?.data?.detail?.error_code;
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: errorCode ? t(`errors.${errorCode}`) : error.message
      });
    }
  };

  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await expenseMutation.mutateAsync(expenseData);
      toast({
        title: t('accounting.common.success'),
        description: t('accounting.quickEntry.expenseSuccess', { 
          journalNumber: response.data.journal_number 
        })
      });
      
      // Reset form
      setExpenseData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: 0,
        from_account_id: '',
        to_account_id: '',
        responsibility_center_id: null,
        file_ids: []
      });
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
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.quickEntry.title')}</h1>
        <p className="text-gray-600">{t('accounting.quickEntry.subtitle')}</p>
      </div>

      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">{t('accounting.quickEntry.autoGenerateJournal')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="giving" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="giving">
            <DollarSign className="w-4 h-4 mr-2" />
            {t('accounting.quickEntry.weeklyGiving')}
          </TabsTrigger>
          <TabsTrigger value="expense">
            <TrendingDown className="w-4 h-4 mr-2" />
            {t('accounting.quickEntry.outgoingMoney')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="giving">
          <Card>
            <CardHeader>
              <CardTitle>{t('accounting.quickEntry.weeklyGiving')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleGivingSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('accounting.journal.journalDate')} *</Label>
                    <Input
                      type="date"
                      value={givingData.date}
                      onChange={(e) => setGivingData({...givingData, date: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <Label>{t('accounting.quickEntry.serviceName')} *</Label>
                    <Input
                      value={givingData.service_name}
                      onChange={(e) => setGivingData({...givingData, service_name: e.target.value})}
                      placeholder="Ibadah Minggu Pagi"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('accounting.quickEntry.givingType')} *</Label>
                  <Input
                    value={givingData.giving_type}
                    onChange={(e) => setGivingData({...givingData, giving_type: e.target.value})}
                    placeholder={t('accounting.quickEntry.generalOffering')}
                    required
                  />
                </div>

                <CurrencyInput
                  label={t('accounting.quickEntry.amount')}
                  value={givingData.amount}
                  onChange={(value) => setGivingData({...givingData, amount: value})}
                  required
                />

                <AccountSelector
                  label={t('accounting.quickEntry.fromAccount')}
                  value={givingData.from_account_id}
                  onChange={(value) => setGivingData({...givingData, from_account_id: value})}
                  filterByType="Asset"
                  required
                  placeholder="Kas / Bank"
                />

                <AccountSelector
                  label={t('accounting.quickEntry.toAccount')}
                  value={givingData.to_account_id}
                  onChange={(value) => setGivingData({...givingData, to_account_id: value})}
                  filterByType="Income"
                  required
                  placeholder="Persembahan"
                />

                <div className="pt-2">
                  <Label>{t('accounting.files.attachDocument')} ({t('accounting.common.optional')})</Label>
                  <FileUpload
                    referenceType="quick_entry"
                    referenceId={null}
                    onUploadSuccess={(file) => setGivingData({
                      ...givingData, 
                      file_ids: [...givingData.file_ids, file.id]
                    })}
                    multiple={true}
                  />
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={givingMutation.isLoading}>
                    {givingMutation.isLoading ? t('accounting.common.loading') : t('accounting.quickEntry.saveGiving')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expense">
          <Card>
            <CardHeader>
              <CardTitle>{t('accounting.quickEntry.outgoingMoney')}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleExpenseSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>{t('accounting.journal.journalDate')} *</Label>
                    <Input
                      type="date"
                      value={expenseData.date}
                      onChange={(e) => setExpenseData({...expenseData, date: e.target.value})}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label>{t('accounting.journal.description')} *</Label>
                  <Input
                    value={expenseData.description}
                    onChange={(e) => setExpenseData({...expenseData, description: e.target.value})}
                    placeholder="Bayar listrik bulan Januari"
                    required
                  />
                </div>

                <CurrencyInput
                  label={t('accounting.quickEntry.amount')}
                  value={expenseData.amount}
                  onChange={(value) => setExpenseData({...expenseData, amount: value})}
                  required
                />

                <AccountSelector
                  label={t('accounting.quickEntry.fromAccount')}
                  value={expenseData.from_account_id}
                  onChange={(value) => setExpenseData({...expenseData, from_account_id: value})}
                  filterByType="Asset"
                  required
                  placeholder="Kas / Bank"
                />

                <AccountSelector
                  label={t('accounting.quickEntry.toAccount')}
                  value={expenseData.to_account_id}
                  onChange={(value) => setExpenseData({...expenseData, to_account_id: value})}
                  filterByType="Expense"
                  required
                  placeholder="Beban"
                />

                <ResponsibilityCenterSelector
                  label={t('accounting.quickEntry.responsibilityCenter')}
                  value={expenseData.responsibility_center_id || ''}
                  onChange={(value) => setExpenseData({...expenseData, responsibility_center_id: value})}
                />

                <div className="pt-4">
                  <Button type="submit" className="w-full" disabled={expenseMutation.isLoading}>
                    {expenseMutation.isLoading ? t('accounting.common.loading') : t('accounting.quickEntry.saveExpense')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
