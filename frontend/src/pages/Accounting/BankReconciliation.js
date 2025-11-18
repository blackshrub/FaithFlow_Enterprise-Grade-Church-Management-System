import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Upload, Landmark } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { Badge } from '../../components/ui/badge';
import { useBankAccounts, useBankTransactions, useImportBankTransactions } from '../../hooks/useAccounting';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import PaginationControls from '../../components/Accounting/PaginationControls';
import { useToast } from '../../hooks/use-toast';

export default function BankReconciliation() {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [selectedBankAccount, setSelectedBankAccount] = useState(null);
  const [importFile, setImportFile] = useState(null);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [reconciledFilter, setReconciledFilter] = useState(null);

  const { data: bankAccounts, isLoading: loadingAccounts } = useBankAccounts();
  const { data: transactionsData, isLoading: loadingTransactions } = useBankTransactions({
    ...pagination,
    bank_account_id: selectedBankAccount,
    is_reconciled: reconciledFilter
  });

  const importMutation = useImportBankTransactions();

  const transactions = transactionsData?.data || [];
  const paginationInfo = transactionsData?.pagination;

  const handleImport = async () => {
    if (!importFile || !selectedBankAccount) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: "Please select bank account and file"
      });
      return;
    }

    try {
      const response = await importMutation.mutateAsync({ 
        bankAccountId: selectedBankAccount, 
        file: importFile 
      });
      
      toast({
        title: t('accounting.common.success'),
        description: t('accounting.bank.importSuccess', { 
          count: response.data.success_count 
        })
      });
      
      setShowImportDialog(false);
      setImportFile(null);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: error.response?.data?.detail?.message || error.message
      });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.bank.title')}</h1>
        <p className="text-gray-600">{t('accounting.bank.subtitle')}</p>
      </div>

      <Tabs defaultValue="accounts" className="w-full">
        <TabsList>
          <TabsTrigger value="accounts">{t('accounting.bank.bankAccounts')}</TabsTrigger>
          <TabsTrigger value="transactions">{t('accounting.bank.bankTransactions')}</TabsTrigger>
          <TabsTrigger value="reconcile">{t('accounting.bank.reconcile')}</TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('accounting.bank.bankAccounts')}</CardTitle>
                <Button size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  {t('accounting.common.create')}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loadingAccounts ? (
                <div className="text-center py-8">{t('accounting.common.loading')}</div>
              ) : !bankAccounts || bankAccounts.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Landmark className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <p>{t('accounting.common.noData')}</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('accounting.bank.bankName')}</TableHead>
                      <TableHead>{t('accounting.bank.accountNumber')}</TableHead>
                      <TableHead>{t('accounting.bank.linkedAccount')}</TableHead>
                      <TableHead>{t('common.status')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bankAccounts.map((account) => (
                      <TableRow key={account.id}>
                        <TableCell className="font-medium">{account.bank_name}</TableCell>
                        <TableCell className="font-mono">{account.account_number}</TableCell>
                        <TableCell>{account.linked_coa_id}</TableCell>
                        <TableCell>
                          <Badge className={account.is_active ? "bg-green-100 text-green-800" : ""}>
                            {account.is_active ? t('common.active') : t('common.inactive')}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="transactions">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{t('accounting.bank.bankTransactions')}</CardTitle>
                <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Upload className="w-4 h-4 mr-2" />
                      {t('accounting.bank.importCSV')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('accounting.bank.importTransactions')}</DialogTitle>
                      <DialogDescription>
                        {t('accounting.bank.csvFormat')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label>{t('accounting.bank.bankAccounts')}</Label>
                        <select
                          className="w-full p-2 border rounded"
                          value={selectedBankAccount || ''}
                          onChange={(e) => setSelectedBankAccount(e.target.value)}
                        >
                          <option value="">{t('accounting.common.select')}</option>
                          {bankAccounts?.map(acc => (
                            <option key={acc.id} value={acc.id}>
                              {acc.bank_name} - {acc.account_number}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <Label>{t('accounting.files.uploadFile')}</Label>
                        <Input
                          type="file"
                          accept=".csv"
                          onChange={(e) => setImportFile(e.target.files[0])}
                        />
                      </div>
                      <div className="flex justify-end space-x-2">
                        <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                          {t('accounting.common.cancel')}
                        </Button>
                        <Button onClick={handleImport} disabled={importMutation.isLoading}>
                          {importMutation.isLoading ? t('accounting.common.loading') : t('accounting.common.upload')}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-4 flex items-center space-x-4">
                <div>
                  <Label>{t('accounting.bank.bankAccounts')}</Label>
                  <select
                    className="p-2 border rounded"
                    value={selectedBankAccount || ''}
                    onChange={(e) => setSelectedBankAccount(e.target.value)}
                  >
                    <option value="">{t('common.all')}</option>
                    {bankAccounts?.map(acc => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bank_name} - {acc.account_number}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>{t('accounting.common.status')}</Label>
                  <select
                    className="p-2 border rounded"
                    value={reconciledFilter === null ? 'all' : reconciledFilter.toString()}
                    onChange={(e) => setReconciledFilter(
                      e.target.value === 'all' ? null : e.target.value === 'true'
                    )}
                  >
                    <option value="all">{t('common.all')}</option>
                    <option value="true">{t('accounting.bank.reconciled')}</option>
                    <option value="false">{t('accounting.bank.unreconciled')}</option>
                  </select>
                </div>
              </div>

              {loadingTransactions ? (
                <div className="text-center py-8">{t('accounting.common.loading')}</div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>{t('accounting.common.noData')}</p>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('accounting.bank.transactionDate')}</TableHead>
                        <TableHead>{t('accounting.journal.description')}</TableHead>
                        <TableHead>{t('accounting.bank.transactionType')}</TableHead>
                        <TableHead className="text-right">{t('accounting.currency.amount')}</TableHead>
                        <TableHead className="text-right">{t('accounting.bank.balance')}</TableHead>
                        <TableHead>{t('common.status')}</TableHead>
                        <TableHead>{t('members.actions')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((txn) => (
                        <TableRow key={txn.id}>
                          <TableCell>{new Date(txn.transaction_date).toLocaleDateString('id-ID')}</TableCell>
                          <TableCell>{txn.description}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={txn.type === 'debit' ? 'text-red-600' : 'text-green-600'}>
                              {txn.type}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay amount={txn.amount} />
                          </TableCell>
                          <TableCell className="text-right">
                            <CurrencyDisplay amount={txn.balance} />
                          </TableCell>
                          <TableCell>
                            {txn.is_reconciled ? (
                              <Badge className="bg-green-100 text-green-800">
                                {t('accounting.bank.reconciled')}
                              </Badge>
                            ) : (
                              <Badge variant="outline">
                                {t('accounting.bank.unreconciled')}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            {!txn.is_reconciled && (
                              <Button variant="ghost" size="sm">
                                {t('accounting.bank.matchJournal')}
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {paginationInfo && (
                    <PaginationControls 
                      pagination={paginationInfo} 
                      onPageChange={setPagination} 
                    />
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reconcile">
          <Card>
            <CardHeader>
              <CardTitle>{t('accounting.bank.reconcile')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <p>{t('accounting.bank.reconciliationTooltip')}</p>
                <p className="text-sm mt-2">Coming soon: Two-column matching interface</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
