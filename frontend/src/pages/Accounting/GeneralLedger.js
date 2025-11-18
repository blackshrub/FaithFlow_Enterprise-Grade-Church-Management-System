import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { useGeneralLedger } from '../../hooks/useAccounting';
import AccountSelector from '../../components/Accounting/AccountSelector';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import PaginationControls from '../../components/Accounting/PaginationControls';

export default function GeneralLedger() {
  const { t } = useTranslation();

  const [params, setParams] = useState({
    account_id: null,
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const { data: ledgerData, refetch } = useGeneralLedger(params.start_date && params.end_date ? params : null);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.reports.generalLedger')}</h1>
        <p className="text-gray-600">{t('accounting.reports.generalLedgerTooltip')}</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <AccountSelector
              label={t('accounting.reports.selectAccount')}
              value={params.account_id || ''}
              onChange={(value) => setParams({...params, account_id: value})}
              placeholder={t('common.all')}
            />

            <div>
              <Label>{t('accounting.reports.startDate')}</Label>
              <Input
                type="date"
                value={params.start_date}
                onChange={(e) => setParams({...params, start_date: e.target.value})}
              />
            </div>

            <div>
              <Label>{t('accounting.reports.endDate')}</Label>
              <Input
                type="date"
                value={params.end_date}
                onChange={(e) => setParams({...params, end_date: e.target.value})}
              />
            </div>
          </div>

          <div className="mt-4">
            <Button onClick={() => refetch()}>
              {t('accounting.reports.generateReport')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {ledgerData && (
        <Card>
          <CardHeader>
            <CardTitle>
              {t('accounting.reports.generalLedger')}
              <span className="text-sm text-gray-600 ml-2">
                ({params.start_date} - {params.end_date})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.journal.journalDate')}</TableHead>
                  <TableHead>{t('accounting.journal.journalNumber')}</TableHead>
                  <TableHead>{t('accounting.journal.description')}</TableHead>
                  <TableHead className="text-right">{t('accounting.coa.debit')}</TableHead>
                  <TableHead className="text-right">{t('accounting.coa.credit')}</TableHead>
                  <TableHead className="text-right">{t('accounting.bank.balance')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ledgerData.journals?.map((journal) => 
                  journal.lines?.map((line, lineIdx) => (
                    <TableRow key={`${journal.id}-${lineIdx}`}>
                      <TableCell>{new Date(journal.date).toLocaleDateString('id-ID')}</TableCell>
                      <TableCell className="font-mono text-sm">{journal.journal_number}</TableCell>
                      <TableCell>{line.description}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={line.debit} />
                      </TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={line.credit} />
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
