import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Network, List as ListIcon } from 'lucide-react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { useChartOfAccounts, useSeedDefaultCOA, useDeleteCOA } from '../../hooks/useAccounting';
import AccountTypeBadge from '../../components/Accounting/AccountTypeBadge';
import COAModal from '../../components/Accounting/COAModal';
import { Badge } from '../../components/ui/badge';
import { useToast } from '../../hooks/use-toast';

export default function ChartOfAccounts() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState('list'); // 'list' or 'tree'
  const [showModal, setShowModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(null);

  const { data: accounts, isLoading, refetch } = useChartOfAccounts({
    search,
    account_type: (typeFilter && typeFilter !== 'all') ? typeFilter : undefined
  });

  const seedMutation = useSeedDefaultCOA();
  const deleteMutation = useDeleteCOA();

  const handleSeedDefault = async () => {
    if (!window.confirm(t('accounting.coa.seedDefaultConfirm'))) return;

    try {
      const response = await seedMutation.mutateAsync();
      toast({
        title: t('accounting.common.success'),
        description: t('accounting.coa.seedSuccess', { count: 53 })
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.coa.title')}</h1>
          <p className="text-gray-600">{t('accounting.coa.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handleSeedDefault} disabled={accounts?.length > 0}>
            <Plus className="w-4 h-4 mr-2" />
            {t('accounting.coa.seedDefault')}
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            {t('accounting.coa.createAccount')}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={t('accounting.coa.searchPlaceholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('accounting.coa.accountType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('common.all')}</SelectItem>
                <SelectItem value="Asset">{t('accounting.coa.asset')}</SelectItem>
                <SelectItem value="Liability">{t('accounting.coa.liability')}</SelectItem>
                <SelectItem value="Equity">{t('accounting.coa.equity')}</SelectItem>
                <SelectItem value="Income">{t('accounting.coa.income')}</SelectItem>
                <SelectItem value="Expense">{t('accounting.coa.expense')}</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'list' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <ListIcon className="w-4 h-4 mr-2" />
                {t('accounting.coa.listView')}
              </Button>
              <Button
                variant={viewMode === 'tree' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('tree')}
              >
                <Network className="w-4 h-4 mr-2" />
                {t('accounting.coa.treeView')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('accounting.coa.title')} ({accounts?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('accounting.common.loading')}</div>
          ) : !accounts || accounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('accounting.common.noData')}</p>
              <Button variant="outline" className="mt-4" onClick={handleSeedDefault}>
                {t('accounting.coa.seedDefault')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.coa.accountCode')}</TableHead>
                  <TableHead>{t('accounting.coa.accountName')}</TableHead>
                  <TableHead>{t('accounting.coa.accountType')}</TableHead>
                  <TableHead>{t('accounting.coa.normalBalance')}</TableHead>
                  <TableHead>{t('accounting.common.status')}</TableHead>
                  <TableHead>{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((account) => (
                  <TableRow key={account.id}>
                    <TableCell className="font-mono">{account.code}</TableCell>
                    <TableCell>
                      <span style={{ paddingLeft: `${account.level * 16}px` }}>
                        {account.name}
                      </span>
                    </TableCell>
                    <TableCell>
                      <AccountTypeBadge type={account.account_type} />
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`accounting.coa.${account.normal_balance?.toLowerCase()}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {account.is_active ? (
                        <Badge className="bg-green-100 text-green-800">
                          {t('accounting.coa.active')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">
                          {t('accounting.coa.inactive')}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm">
                        {t('accounting.common.edit')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
