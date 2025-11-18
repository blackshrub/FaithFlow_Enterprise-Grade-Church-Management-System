import React from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { useDepreciationSchedule } from '../../hooks/useAccounting';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';

export default function DepreciationSchedule() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: scheduleData, isLoading } = useDepreciationSchedule(id);

  const asset = scheduleData?.asset;
  const schedule = scheduleData?.schedule || [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.fixedAsset.depreciationSchedule')}</h1>
          {asset && <p className="text-gray-600">{asset.asset_code} - {asset.name}</p>}
        </div>
        <Button variant="outline" onClick={() => navigate('/accounting/assets')}>
          {t('accounting.common.back')}
        </Button>
      </div>

      {asset && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('accounting.fixedAsset.cost')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold"><CurrencyDisplay amount={asset.cost} /></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('accounting.fixedAsset.usefulLifeMonths')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{asset.useful_life_months}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('accounting.fixedAsset.salvageValue')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold"><CurrencyDisplay amount={asset.salvage_value} /></p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">{t('accounting.fixedAsset.monthlyDepreciation')}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                <CurrencyDisplay amount={(asset.cost - asset.salvage_value) / asset.useful_life_months} />
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('accounting.fixedAsset.depreciationSchedule')}</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('accounting.common.loading')}</div>
          ) : schedule.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('accounting.common.noData')}</p>
              <p className="text-sm mt-2">Run monthly depreciation to see schedule</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.fiscalPeriod.month')}/{t('accounting.fiscalPeriod.year')}</TableHead>
                  <TableHead className="text-right">{t('accounting.fixedAsset.depreciationAmount')}</TableHead>
                  <TableHead className="text-right">{t('accounting.fixedAsset.accumulatedDepreciation')}</TableHead>
                  <TableHead className="text-right">{t('accounting.fixedAsset.bookValue')}</TableHead>
                  <TableHead>{t('accounting.journal.journalNumber')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map((entry, idx) => (
                  <TableRow key={idx}>
                    <TableCell>{entry.period_month}/{entry.period_year}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={entry.depreciation_amount} />
                    </TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={entry.accumulated_depreciation} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <CurrencyDisplay amount={entry.book_value} />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{entry.journal_id || '-'}</TableCell>
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
