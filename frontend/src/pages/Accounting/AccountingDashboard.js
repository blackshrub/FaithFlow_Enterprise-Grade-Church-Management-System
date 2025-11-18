import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calculator, BookOpen, Plus, TrendingUp, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { useJournals } from '../../hooks/useAccounting';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import StatusBadge from '../../components/Accounting/StatusBadge';

export default function AccountingDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Get recent journals
  const { data: journalsData } = useJournals({ limit: 5, offset: 0 });
  const recentJournals = journalsData?.data || [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.dashboard')}</h1>
        <p className="text-gray-600">{t('accounting.subtitle')}</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/accounting/journals/new')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('accounting.journal.createJournal')}
            </CardTitle>
            <BookOpen className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600">
              {t('accounting.journal.journalTooltip')}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/accounting/quick-entry')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('accounting.quickEntry.title')}
            </CardTitle>
            <Plus className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600">
              {t('accounting.quickEntry.autoGenerateJournal')}
            </p>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/accounting/reports')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              {t('accounting.reports.title')}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-gray-600">
              {t('accounting.reports.subtitle')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('accounting.coa.asset')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={0} />
            </div>
            <p className="text-xs text-gray-600 mt-1">{t('accounting.coa.assetExplanation')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('accounting.coa.liability')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={0} />
            </div>
            <p className="text-xs text-gray-600 mt-1">{t('accounting.coa.liabilityExplanation')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('accounting.coa.equity')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={0} />
            </div>
            <p className="text-xs text-gray-600 mt-1">{t('accounting.coa.equityExplanation')}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              {t('accounting.yearEnd.netIncome')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              <CurrencyDisplay amount={0} />
            </div>
            <p className="text-xs text-gray-600 mt-1">{t('dashboard.thisMonth')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Recent Journals */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
            <Button variant="outline" size="sm" onClick={() => navigate('/accounting/journals')}>
              {t('accounting.common.view')} {t('accounting.journal.title')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentJournals.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('dashboard.noActivity')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentJournals.map((journal) => (
                <div key={journal.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm text-gray-600">{journal.journal_number}</span>
                      <StatusBadge status={journal.status} />
                    </div>
                    <p className="text-sm mt-1">{journal.description}</p>
                    <p className="text-xs text-gray-500">{new Date(journal.date).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div className="text-right">
                    <CurrencyDisplay amount={journal.total_debit} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
