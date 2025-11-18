import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Scale, TrendingUp, PieChart, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useGeneralLedger, useTrialBalance, useIncomeStatement, useBalanceSheet } from '../../hooks/useAccounting';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';

export default function Reports() {
  const { t } = useTranslation();
  const [activeReport, setActiveReport] = useState(null);
  const [reportParams, setReportParams] = useState({
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0],
    as_of_date: new Date().toISOString().split('T')[0]
  });

  const reports = [
    { id: 'general-ledger', icon: BookOpen, title: t('accounting.reports.generalLedger'), color: 'blue', route: '/accounting/reports/general-ledger' },
    { id: 'trial-balance', icon: Scale, title: t('accounting.reports.trialBalance'), color: 'green' },
    { id: 'income-statement', icon: TrendingUp, title: t('accounting.reports.incomeStatement'), color: 'purple' },
    { id: 'balance-sheet', icon: PieChart, title: t('accounting.reports.balanceSheet'), color: 'orange' },
  ];

  const { data: trialBalanceData, refetch: refetchTB } = useTrialBalance(
    activeReport === 'trial-balance' ? reportParams.as_of_date : null
  );

  const { data: incomeStatementData, refetch: refetchIS } = useIncomeStatement(
    activeReport === 'income-statement' ? reportParams.start_date : null,
    activeReport === 'income-statement' ? reportParams.end_date : null
  );

  const { data: balanceSheetData, refetch: refetchBS } = useBalanceSheet(
    activeReport === 'balance-sheet' ? reportParams.as_of_date : null
  );

  const renderReportMenu = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {reports.map((report) => {
        const Icon = report.icon;
        return (
          <Card 
            key={report.id}
            className={`cursor-pointer hover:shadow-lg transition-shadow border-${report.color}-200`}
            onClick={() => setActiveReport(report.id)}
          >
            <CardHeader>
              <Icon className={`w-12 h-12 text-${report.color}-600 mb-2`} />
              <CardTitle className="text-lg">{report.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" size="sm" className="w-full">
                {t('accounting.reports.generateReport')}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const renderTrialBalance = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setActiveReport(null)}>
          {t('accounting.common.back')}
        </Button>
        <div className="flex items-center space-x-2">
          <Label>{t('accounting.reports.asOfDate')}</Label>
          <Input
            type="date"
            value={reportParams.as_of_date}
            onChange={(e) => setReportParams({...reportParams, as_of_date: e.target.value})}
            className="w-48"
          />
          <Button onClick={() => refetchTB()}>
            {t('accounting.reports.generateReport')}
          </Button>
        </div>
      </div>

      {trialBalanceData && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>{t('accounting.reports.trialBalance')}</CardTitle>
              {trialBalanceData.is_balanced && (
                <span className="text-green-600 font-medium">✓ {t('accounting.journal.balanced')}</span>
              )}
            </div>
            <p className="text-sm text-gray-600">
              {t('accounting.reports.asOfDate')}: {reportParams.as_of_date}
            </p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.coa.accountCode')}</TableHead>
                  <TableHead>{t('accounting.coa.accountName')}</TableHead>
                  <TableHead className="text-right">{t('accounting.coa.debit')}</TableHead>
                  <TableHead className="text-right">{t('accounting.coa.credit')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalanceData.trial_balance?.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{row.account_code}</TableCell>
                    <TableCell>{row.account_name}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={row.debit} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={row.credit} />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-gray-50">
                  <TableCell colSpan={2}>{t('accounting.pagination.total')}</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={trialBalanceData.total_debit} />
                  </TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={trialBalanceData.total_credit} />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderIncomeStatement = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setActiveReport(null)}>
          {t('accounting.common.back')}
        </Button>
        <div className="flex items-center space-x-2">
          <Label>{t('accounting.reports.startDate')}</Label>
          <Input
            type="date"
            value={reportParams.start_date}
            onChange={(e) => setReportParams({...reportParams, start_date: e.target.value})}
            className="w-48"
          />
          <Label>{t('accounting.reports.endDate')}</Label>
          <Input
            type="date"
            value={reportParams.end_date}
            onChange={(e) => setReportParams({...reportParams, end_date: e.target.value})}
            className="w-48"
          />
          <Button onClick={() => refetchIS()}>
            {t('accounting.reports.generateReport')}
          </Button>
        </div>
      </div>

      {incomeStatementData && (
        <Card>
          <CardHeader>
            <CardTitle>{t('accounting.reports.incomeStatement')}</CardTitle>
            <p className="text-sm text-gray-600">
              {reportParams.start_date} - {reportParams.end_date}
            </p>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-bold text-lg mb-2">{t('accounting.coa.income')}</h3>
              <Table>
                <TableBody>
                  {incomeStatementData.income?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.account_code} - {row.account_name}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={row.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>{t('accounting.reports.totalIncome')}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={incomeStatementData.total_income} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div>
              <h3 className="font-bold text-lg mb-2">{t('accounting.coa.expense')}</h3>
              <Table>
                <TableBody>
                  {incomeStatementData.expenses?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.account_code} - {row.account_name}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={row.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>{t('accounting.reports.totalExpenses')}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={incomeStatementData.total_expenses} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div className="pt-4 border-t">
              <div className="flex items-center justify-between text-xl font-bold">
                <span>{t('accounting.yearEnd.netIncome')}</span>
                <span className={incomeStatementData.net_income >= 0 ? 'text-green-600' : 'text-red-600'}>
                  <CurrencyDisplay amount={incomeStatementData.net_income} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderBalanceSheet = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => setActiveReport(null)}>
          {t('accounting.common.back')}
        </Button>
        <div className="flex items-center space-x-2">
          <Label>{t('accounting.reports.asOfDate')}</Label>
          <Input
            type="date"
            value={reportParams.as_of_date}
            onChange={(e) => setReportParams({...reportParams, as_of_date: e.target.value})}
            className="w-48"
          />
          <Button onClick={() => refetchBS()}>
            {t('accounting.reports.generateReport')}
          </Button>
        </div>
      </div>

      {balanceSheetData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{t('accounting.coa.asset')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {balanceSheetData.assets?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.account_code} - {row.account_name}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={row.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-gray-50">
                    <TableCell>Total {t('accounting.coa.asset')}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={balanceSheetData.total_assets} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('accounting.coa.liability')} & {t('accounting.coa.equity')}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableBody>
                  {balanceSheetData.liabilities?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.account_code} - {row.account_name}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={row.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Total {t('accounting.coa.liability')}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={balanceSheetData.total_liabilities} />
                    </TableCell>
                  </TableRow>
                  
                  <TableRow><TableCell colSpan={2} className="h-4"></TableCell></TableRow>
                  
                  {balanceSheetData.equity?.map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.account_code} - {row.account_name}</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={row.amount} />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold">
                    <TableCell>Total {t('accounting.coa.equity')}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={balanceSheetData.total_equity} />
                    </TableCell>
                  </TableRow>
                  
                  <TableRow className="font-bold bg-gray-100">
                    <TableCell>Total {t('accounting.coa.liability')} & {t('accounting.coa.equity')}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={balanceSheetData.total_liabilities + balanceSheetData.total_equity} />
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              
              {balanceSheetData.is_balanced && (
                <p className="text-green-600 text-sm mt-4">✓ {t('accounting.journal.balanced')}</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.reports.title')}</h1>
        <p className="text-gray-600">{t('accounting.reports.subtitle')}</p>
      </div>

      {!activeReport && renderReportMenu()}
      {activeReport === 'trial-balance' && renderTrialBalance()}
      {activeReport === 'income-statement' && renderIncomeStatement()}
      {activeReport === 'balance-sheet' && renderBalanceSheet()}
    </div>
  );
}
