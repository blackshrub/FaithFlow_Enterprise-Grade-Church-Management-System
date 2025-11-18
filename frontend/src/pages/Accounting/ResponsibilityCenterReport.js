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
import ResponsibilityCenterSelector from '../../components/Accounting/ResponsibilityCenterSelector';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';

export default function ResponsibilityCenterReport() {
  const { t } = useTranslation();

  const [params, setParams] = useState({
    responsibility_center_id: '',
    start_date: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end_date: new Date().toISOString().split('T')[0]
  });

  const [reportData, setReportData] = useState(null);

  const handleGenerate = () => {
    // Simplified data - in production would call API
    setReportData({
      center_name: 'Ministry of Youth',
      expenses: [
        { account_code: '5420', account_name: 'Konsumsi', amount: 30000000 },
        { account_code: '5430', account_name: 'Acara & Program', amount: 60000000 },
        { account_code: '5520', account_name: 'Transportasi', amount: 25000000 }
      ],
      total_spending: 115000000,
      budgeted: 120000000,
      variance: -5000000
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.reports.responsibilityCenterReport')}</h1>
        <p className="text-gray-600">Spending by Ministry/Project</p>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ResponsibilityCenterSelector
              label={t('accounting.quickEntry.responsibilityCenter')}
              value={params.responsibility_center_id}
              onChange={(value) => setParams({...params, responsibility_center_id: value})}
              required
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
            <Button onClick={handleGenerate} disabled={!params.responsibility_center_id}>
              {t('accounting.reports.generateReport')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {reportData && (
        <Card>
          <CardHeader>
            <CardTitle>{reportData.center_name}</CardTitle>
            <p className="text-sm text-gray-600">{params.start_date} - {params.end_date}</p>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.coa.accountCode')}</TableHead>
                  <TableHead>{t('accounting.coa.accountName')}</TableHead>
                  <TableHead className="text-right">{t('accounting.currency.amount')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.expenses.map((expense, idx) => (
                  <TableRow key={idx}>
                    <TableCell className="font-mono">{expense.account_code}</TableCell>
                    <TableCell>{expense.account_name}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={expense.amount} />
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-gray-50">
                  <TableCell colSpan={2}>Total Spending</TableCell>
                  <TableCell className="text-right">
                    <CurrencyDisplay amount={reportData.total_spending} />
                  </TableCell>
                </TableRow>
                {reportData.budgeted && (
                  <>
                    <TableRow>
                      <TableCell colSpan={2}>Budgeted</TableCell>
                      <TableCell className="text-right">
                        <CurrencyDisplay amount={reportData.budgeted} />
                      </TableCell>
                    </TableRow>
                    <TableRow className={reportData.variance < 0 ? 'text-green-600' : 'text-red-600'}>
                      <TableCell colSpan={2}>Variance</TableCell>
                      <TableCell className="text-right font-bold">
                        <CurrencyDisplay amount={reportData.variance} />
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
