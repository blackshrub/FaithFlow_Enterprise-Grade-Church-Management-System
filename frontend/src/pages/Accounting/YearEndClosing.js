import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, CheckCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useYearEndClosingStatus, useRunYearEndClosing, useFiscalPeriods } from '../../hooks/useAccounting';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import { useToast } from '../../hooks/use-toast';

export default function YearEndClosing() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear() - 1);
  const [retainedEarningsAccountId, setRetainedEarningsAccountId] = useState('');

  const { data: closingStatus } = useYearEndClosingStatus(selectedYear);
  const { data: periods } = useFiscalPeriods({ year: selectedYear });
  const runClosingMutation = useRunYearEndClosing();

  const isAlreadyClosed = closingStatus?.status === 'success';
  const allMonthsClosed = periods?.every(p => p.status === 'closed' || p.status === 'locked');

  const handleRunClosing = async () => {
    if (!window.confirm(
      t('accounting.yearEnd.closingConfirm', { year: selectedYear })
    )) return;

    if (!retainedEarningsAccountId) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: "Please select Retained Earnings account"
      });
      return;
    }

    try {
      const response = await runClosingMutation.mutateAsync({ 
        year: selectedYear,
        retainedEarningsAccountId 
      });
      
      toast({
        title: t('accounting.common.success'),
        description: t('accounting.yearEnd.closingSuccess', { 
          journalNumber: response.data.closing_journal_id 
        })
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
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold">{t('accounting.yearEnd.title')}</h1>
        <p className="text-gray-600 mt-2">{t('accounting.yearEnd.subtitle')}</p>
      </div>

      {/* What is Year-End Closing */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-blue-900">{t('accounting.yearEnd.whatIsYearEndClosing')}</p>
              <p className="text-sm text-blue-700 mt-1">{t('accounting.yearEnd.yearEndExplanation')}</p>
              <p className="text-sm text-blue-700 mt-2">{t('accounting.yearEnd.closingProcess')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step 1: Select Year */}
      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.yearEnd.selectYear')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>{t('accounting.budget.fiscalYear')}</Label>
            <Input
              type="number"
              min="2000"
              max="2100"
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="w-48"
            />
          </div>

          {isAlreadyClosed && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5 text-yellow-600" />
                <p className="font-medium text-yellow-900">{t('accounting.yearEnd.alreadyClosed')}</p>
              </div>
              <p className="text-sm text-yellow-700 mt-2">
                Net Income: <CurrencyDisplay amount={closingStatus.net_income} />
              </p>
              <p className="text-sm text-yellow-700">
                Journal: {closingStatus.closing_journal_id}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Step 2: Prerequisites Check */}
      {!isAlreadyClosed && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>{t('accounting.yearEnd.checkPrerequisites')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${allMonthsClosed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                  <div className="flex items-center space-x-2">
                    {allMonthsClosed ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-red-600" />
                    )}
                    <p className="font-medium">
                      {allMonthsClosed 
                        ? '✓ All 12 months are closed or locked'
                        : t('accounting.yearEnd.allMonthsMustBeClosed')}
                    </p>
                  </div>
                </div>

                {periods && periods.length > 0 && (
                  <div className="grid grid-cols-4 gap-2">
                    {periods.map((period) => (
                      <div
                        key={period.month}
                        className={`p-2 text-center rounded ${
                          period.status === 'locked' 
                            ? 'bg-green-100 text-green-800' 
                            : period.status === 'closed'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        <div className="text-xs">{period.month}</div>
                        <div className="text-xs font-medium">{period.status}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Step 3: Summary & Execute */}
          {allMonthsClosed && (
            <Card>
              <CardHeader>
                <CardTitle>{t('accounting.yearEnd.runClosing')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>{t('accounting.yearEnd.retainedEarningsAccount')}</Label>
                  <Input
                    placeholder="Select Laba Ditahan account"
                    value={retainedEarningsAccountId}
                    onChange={(e) => setRetainedEarningsAccountId(e.target.value)}
                  />
                  <p className="text-xs text-gray-500 mt-1">Account ID for Retained Earnings (3200 - Laba Ditahan)</p>
                </div>

                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-900">WARNING: This action cannot be undone!</p>
                      <p className="text-sm text-red-700 mt-1">
                        Year-end closing will create a closing journal, zero out all income and expense accounts, 
                        update retained earnings, and lock all 12 months of {selectedYear}.
                      </p>
                    </div>
                  </div>
                </div>

                <Button 
                  onClick={handleRunClosing} 
                  disabled={!retainedEarningsAccountId || runClosingMutation.isLoading}
                  className="w-full bg-red-600 hover:bg-red-700"
                  size="lg"
                >
                  {runClosingMutation.isLoading 
                    ? t('accounting.common.loading') 
                    : t('accounting.yearEnd.runClosing')}
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
