import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, CheckCircle, XCircle, Info } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { useChartOfAccounts, useCreateBeginningBalance, usePostBeginningBalance } from '../../hooks/useAccounting';
import CurrencyInput from '../../components/Accounting/CurrencyInput';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import { useToast } from '../../hooks/use-toast';

export default function BeginningBalance() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [entries, setEntries] = useState({});

  const { data: accounts } = useChartOfAccounts();
  const createMutation = useCreateBeginningBalance();
  const postMutation = usePostBeginningBalance();

  const assetAccounts = accounts?.filter(a => a.account_type === 'Asset') || [];
  const liabilityAccounts = accounts?.filter(a => a.account_type === 'Liability') || [];
  const equityAccounts = accounts?.filter(a => a.account_type === 'Equity') || [];

  const handleEntryChange = (accountId, amount) => {
    setEntries({
      ...entries,
      [accountId]: parseFloat(amount) || 0
    });
  };

  // Calculate totals
  const calculateTotals = () => {
    let totalDebit = 0;
    let totalCredit = 0;

    assetAccounts.forEach(acc => {
      totalDebit += entries[acc.id] || 0;
    });

    liabilityAccounts.forEach(acc => {
      totalCredit += entries[acc.id] || 0;
    });

    equityAccounts.forEach(acc => {
      totalCredit += entries[acc.id] || 0;
    });

    return { totalDebit, totalCredit };
  };

  const { totalDebit, totalCredit } = calculateTotals();
  const isBalanced = totalDebit === totalCredit && totalDebit > 0;

  const handlePost = async () => {
    if (!isBalanced) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: t('accounting.beginningBalance.unbalancedMessage')
      });
      return;
    }

    // Build entries array
    const entriesArray = [];
    
    assetAccounts.forEach(acc => {
      if (entries[acc.id]) {
        entriesArray.push({
          account_id: acc.id,
          amount: entries[acc.id],
          balance_type: 'debit'
        });
      }
    });

    liabilityAccounts.forEach(acc => {
      if (entries[acc.id]) {
        entriesArray.push({
          account_id: acc.id,
          amount: entries[acc.id],
          balance_type: 'credit'
        });
      }
    });

    equityAccounts.forEach(acc => {
      if (entries[acc.id]) {
        entriesArray.push({
          account_id: acc.id,
          amount: entries[acc.id],
          balance_type: 'credit'
        });
      }
    });

    try {
      // Create beginning balance
      const createResponse = await createMutation.mutateAsync({
        effective_date: effectiveDate,
        entries: entriesArray
      });

      // Post it to generate journal
      const postResponse = await postMutation.mutateAsync(createResponse.data.id);

      toast({
        title: t('accounting.common.success'),
        description: t('accounting.beginningBalance.postSuccess', { 
          journalNumber: postResponse.data.journal_number 
        })
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

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t('accounting.beginningBalance.step1')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{t('accounting.coa.assetExplanation')}</p>
        {assetAccounts.map(account => (
          <div key={account.id} className="grid grid-cols-2 gap-4 items-center">
            <div>
              <span className="font-mono text-sm text-gray-600">{account.code}</span>
              <span className="ml-2">{account.name}</span>
            </div>
            <CurrencyInput
              value={entries[account.id] || 0}
              onChange={(value) => handleEntryChange(account.id, value)}
            />
          </div>
        ))}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <span className="font-medium">{t('accounting.beginningBalance.totalDebit')}:</span>
            <span className="text-lg font-bold"><CurrencyDisplay amount={totalDebit} /></span>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t('accounting.beginningBalance.step2')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{t('accounting.coa.liabilityExplanation')}</p>
        {liabilityAccounts.map(account => (
          <div key={account.id} className="grid grid-cols-2 gap-4 items-center">
            <div>
              <span className="font-mono text-sm text-gray-600">{account.code}</span>
              <span className="ml-2">{account.name}</span>
            </div>
            <CurrencyInput
              value={entries[account.id] || 0}
              onChange={(value) => handleEntryChange(account.id, value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t('accounting.beginningBalance.step3')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-gray-600">{t('accounting.coa.equityExplanation')}</p>
        {equityAccounts.map(account => (
          <div key={account.id} className="grid grid-cols-2 gap-4 items-center">
            <div>
              <span className="font-mono text-sm text-gray-600">{account.code}</span>
              <span className="ml-2">{account.name}</span>
            </div>
            <CurrencyInput
              value={entries[account.id] || 0}
              onChange={(value) => handleEntryChange(account.id, value)}
            />
          </div>
        ))}
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle>{t('accounting.beginningBalance.step4')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Balance Summary */}
        <div className={`p-4 rounded-lg ${isBalanced ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <div className="flex items-center space-x-3 mb-4">
            {isBalanced ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <XCircle className="w-6 h-6 text-red-600" />
            )}
            <div>
              <p className="font-medium">
                {isBalanced ? t('accounting.journal.balanced') : t('accounting.beginningBalance.unbalancedMessage')}
              </p>
              {!isBalanced && (
                <p className="text-sm text-red-600">
                  {t('accounting.beginningBalance.unbalancedDetail', { debit: totalDebit, credit: totalCredit })}
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">{t('accounting.beginningBalance.totalDebit')}</p>
              <p className="text-2xl font-bold"><CurrencyDisplay amount={totalDebit} /></p>
            </div>
            <div>
              <p className="text-sm text-gray-600">{t('accounting.beginningBalance.totalCredit')}</p>
              <p className="text-2xl font-bold"><CurrencyDisplay amount={totalCredit} /></p>
            </div>
          </div>
        </div>

        {/* Effective Date */}
        <div>
          <Label>{t('accounting.beginningBalance.effectiveDate')} *</Label>
          <Input
            type="date"
            value={effectiveDate}
            onChange={(e) => setEffectiveDate(e.target.value)}
          />
        </div>

        {/* Help */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-start space-x-3">
              <Info className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-900">{t('accounting.beginningBalance.whyMustBeBalanced')}</p>
                <p className="text-sm text-blue-700 mt-1">{t('accounting.beginningBalance.balancedExplanation')}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.beginningBalance.title')}</h1>
        <p className="text-gray-600">{t('accounting.beginningBalance.subtitle')}</p>
      </div>

      {/* Steps Indicator */}
      <div className="flex items-center justify-center space-x-4">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              s === step ? 'bg-blue-600 text-white' : s < step ? 'bg-green-600 text-white' : 'bg-gray-200'
            }`}>
              {s < step ? <CheckCircle className="w-5 h-5" /> : s}
            </div>
            {s < 4 && <ChevronRight className="w-5 h-5 text-gray-400 mx-2" />}
          </div>
        ))}
      </div>

      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}
      {step === 4 && renderStep4()}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => step > 1 ? setStep(step - 1) : navigate('/accounting')}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          {step > 1 ? t('accounting.common.previous') : t('accounting.common.back')}
        </Button>

        {step < 4 ? (
          <Button onClick={() => setStep(step + 1)}>
            {t('accounting.common.next')}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        ) : (
          <Button onClick={handlePost} disabled={!isBalanced}>
            {t('accounting.beginningBalance.post')}
          </Button>
        )}
      </div>
    </div>
  );
}
