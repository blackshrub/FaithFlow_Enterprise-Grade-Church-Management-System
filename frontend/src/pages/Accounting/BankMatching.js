import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useBankTransactions, useJournals } from '../../hooks/useAccounting';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import { useToast } from '../../hooks/use-toast';
import * as accountingApi from '../../services/accountingApi';

export default function BankMatching() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [selectedJournal, setSelectedJournal] = useState(null);

  // Get unreconciled bank transactions
  const { data: transactionsData, refetch: refetchTransactions } = useBankTransactions({ 
    limit: 50, 
    offset: 0,
    is_reconciled: false 
  });

  // Get approved journals (potential matches)
  const { data: journalsData } = useJournals({ 
    limit: 50, 
    offset: 0,
    status: 'approved' 
  });

  const unmatchedTransactions = transactionsData?.data || [];
  const unmatchedJournals = journalsData?.data || [];

  const handleMatch = async () => {
    if (!selectedTransaction || !selectedJournal) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: "Please select both transaction and journal"
      });
      return;
    }

    try {
      await accountingApi.matchBankTransaction(selectedTransaction.id, selectedJournal.id);
      
      toast({
        title: t('accounting.common.success'),
        description: t('accounting.bank.matchSuccess')
      });

      setSelectedTransaction(null);
      setSelectedJournal(null);
      refetchTransactions();
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: error.message
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.bank.reconcile')}</h1>
        <p className="text-gray-600">{t('accounting.bank.reconciliationTooltip')}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Unmatched Bank Transactions */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('accounting.bank.bankTransactions')} ({unmatchedTransactions.length})
            </CardTitle>
            <p className="text-sm text-gray-600">{t('accounting.bank.unreconciled')}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {unmatchedTransactions.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-500" />
                <p>{t('accounting.bank.reconciled')}</p>
              </div>
            ) : (
              unmatchedTransactions.map((txn) => (
                <div
                  key={txn.id}
                  onClick={() => setSelectedTransaction(txn)}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedTransaction?.id === txn.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-sm">{txn.description}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(txn.transaction_date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${txn.type === 'debit' ? 'text-red-600' : 'text-green-600'}`}>
                        <CurrencyDisplay amount={txn.amount} />
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {txn.type}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Right Column: Unmatched Journals */}
        <Card>
          <CardHeader>
            <CardTitle>
              {t('accounting.journal.title')} ({unmatchedJournals.length})
            </CardTitle>
            <p className="text-sm text-gray-600">{t('accounting.journal.approved')}</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {unmatchedJournals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>{t('accounting.common.noData')}</p>
              </div>
            ) : (
              unmatchedJournals.map((journal) => (
                <div
                  key={journal.id}
                  onClick={() => setSelectedJournal(journal)}
                  className={`p-3 border rounded cursor-pointer transition-colors ${
                    selectedJournal?.id === journal.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-mono text-xs text-gray-600">{journal.journal_number}</p>
                      <p className="font-medium text-sm">{journal.description}</p>
                      <p className="text-xs text-gray-600">
                        {new Date(journal.date).toLocaleDateString('id-ID')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">
                        <CurrencyDisplay amount={journal.total_debit} />
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Match Button */}
      {selectedTransaction && selectedJournal && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div>
                  <p className="text-sm text-gray-600">Transaction</p>
                  <p className="font-medium">{selectedTransaction.description}</p>
                  <CurrencyDisplay amount={selectedTransaction.amount} />
                </div>
                <ArrowRight className="w-6 h-6 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Journal</p>
                  <p className="font-medium">{selectedJournal.journal_number}</p>
                  <CurrencyDisplay amount={selectedJournal.total_debit} />
                </div>
              </div>
              <Button onClick={handleMatch}>
                <CheckCircle className="w-4 h-4 mr-2" />
                {t('accounting.bank.matchJournal')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
