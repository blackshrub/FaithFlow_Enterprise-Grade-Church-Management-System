import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
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
import { Badge } from '../../components/ui/badge';
import { useBudget, useBudgetVariance } from '../../hooks/useAccounting';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';

export default function BudgetVariance() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const { data: budget } = useBudget(id);
  const { data: varianceData, refetch } = useBudgetVariance(id, month, year);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.budget.budgetVsActual')}</h1>
          <p className="text-gray-600">{budget?.name} - {budget?.fiscal_year}</p>
        </div>
        <Button variant="outline" onClick={() => navigate('/accounting/budgets')}>
          {t('accounting.common.back')}
        </Button>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-4">
            <div>
              <Label>{t('accounting.fiscalPeriod.month')}</Label>
              <Input
                type="number"
                min="1"
                max="12"
                value={month}
                onChange={(e) => setMonth(parseInt(e.target.value))}
                className="w-24"
              />
            </div>
            <div>
              <Label>{t('accounting.fiscalPeriod.year')}</Label>
              <Input
                type="number"
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-32"
              />
            </div>
            <Button onClick={() => refetch()} className="mt-6">
              {t('accounting.reports.generateReport')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {varianceData && (
        <Card>
          <CardHeader>
            <CardTitle>{t('accounting.budget.budgetVsActual')} - {month}/{year}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.coa.accountName')}</TableHead>
                  <TableHead className="text-right">{t('accounting.budget.budgeted')}</TableHead>
                  <TableHead className="text-right">{t('accounting.budget.actual')}</TableHead>
                  <TableHead className="text-right">{t('accounting.budget.variance')}</TableHead>
                  <TableHead className="text-right">{t('accounting.budget.variancePercentage')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {varianceData.variance_data?.map((row, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{row.account_id}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={row.budgeted_amount} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={row.actual_amount} />
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={row.variance > 0 ? 'text-red-600' : row.variance < 0 ? 'text-green-600' : ''}>
                        <CurrencyDisplay amount={row.variance} />
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {row.variance_percentage.toFixed(1)}%
                    </TableCell>
                    <TableCell>
                      {row.status === 'over' && (
                        <Badge className="bg-red-100 text-red-800">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          {t('accounting.budget.over')}
                        </Badge>
                      )}
                      {row.status === 'under' && (
                        <Badge className="bg-green-100 text-green-800">
                          <TrendingDown className="w-3 h-3 mr-1" />
                          {t('accounting.budget.under')}
                        </Badge>
                      )}
                      {row.status === 'on_track' && (
                        <Badge variant="outline">
                          <Minus className="w-3 h-3 mr-1" />
                          {t('accounting.budget.onTrack')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
