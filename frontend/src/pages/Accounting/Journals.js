import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Filter } from 'lucide-react';
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
import { useJournals, useApproveJournal, useDeleteJournal } from '../../hooks/useAccounting';
import StatusBadge from '../../components/Accounting/StatusBadge';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import PaginationControls from '../../components/Accounting/PaginationControls';
import { useToast } from '../../hooks/use-toast';

export default function Journals() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const { data: journalsData, isLoading } = useJournals({
    ...pagination,
    status: statusFilter || undefined,
    journal_type: typeFilter || undefined
  });

  const approveMutation = useApproveJournal();
  const deleteMutation = useDeleteJournal();

  const journals = journalsData?.data || [];
  const paginationInfo = journalsData?.pagination;

  const handleApprove = async (journalId, journalNumber) => {
    if (!window.confirm(t('accounting.journal.approveConfirm'))) return;

    try {
      await approveMutation.mutateAsync(journalId);
      toast({
        title: t('accounting.common.success'),
        description: `Journal ${journalNumber} approved`
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

  const handleDelete = async (journalId) => {
    if (!window.confirm(t('accounting.journal.deleteConfirm'))) return;

    try {
      await deleteMutation.mutateAsync(journalId);
      toast({
        title: t('accounting.common.success'),
        description: t('accounting.journal.deleteJournal')
      });
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.journal.title')}</h1>
          <p className="text-gray-600">{t('accounting.journal.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/accounting/journals/new')}>
          <Plus className="w-4 h-4 mr-2" />
          {t('accounting.journal.createJournal')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('accounting.journal.status')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('common.all')}</SelectItem>
                <SelectItem value="draft">{t('accounting.journal.draft')}</SelectItem>
                <SelectItem value="approved">{t('accounting.journal.approved')}</SelectItem>
              </SelectContent>
            </Select>

            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder={t('accounting.journal.journalType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">{t('common.all')}</SelectItem>
                <SelectItem value="general">{t('accounting.journal.general')}</SelectItem>
                <SelectItem value="quick_giving">{t('accounting.journal.quickGiving')}</SelectItem>
                <SelectItem value="quick_expense">{t('accounting.journal.quickExpense')}</SelectItem>
                <SelectItem value="depreciation">{t('accounting.journal.depreciation')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Journals Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('accounting.journal.title')} ({paginationInfo?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('accounting.common.loading')}</div>
          ) : journals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('accounting.common.noData')}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/accounting/journals/new')}>
                <Plus className="w-4 h-4 mr-2" />
                {t('accounting.journal.createJournal')}
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('accounting.journal.journalNumber')}</TableHead>
                    <TableHead>{t('accounting.journal.journalDate')}</TableHead>
                    <TableHead>{t('accounting.journal.description')}</TableHead>
                    <TableHead>{t('accounting.journal.status')}</TableHead>
                    <TableHead className="text-right">{t('accounting.journal.totalDebit')}</TableHead>
                    <TableHead>{t('members.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {journals.map((journal) => (
                    <TableRow key={journal.id}>
                      <TableCell className="font-mono text-sm">{journal.journal_number}</TableCell>
                      <TableCell>{new Date(journal.date).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell>{journal.description}</TableCell>
                      <TableCell>
                        <StatusBadge status={journal.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={journal.total_debit} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/accounting/journals/${journal.id}`)}>
                            {t('accounting.common.view')}
                          </Button>
                          {journal.status === 'draft' && (
                            <>
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleApprove(journal.id, journal.journal_number)}
                              >
                                {t('accounting.journal.approveJournal')}
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => handleDelete(journal.id)}
                              >
                                {t('accounting.common.delete')}
                              </Button>
                            </>
                          )}
                        </div>
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
    </div>
  );
}
