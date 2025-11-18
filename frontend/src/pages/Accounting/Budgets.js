import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, TrendingUp, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/button';
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
import { useBudgets, useActivateBudget } from '../../hooks/useAccounting';
import StatusBadge from '../../components/Accounting/StatusBadge';
import { useToast } from '../../hooks/use-toast';

export default function Budgets() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const { data: budgets, isLoading } = useBudgets();
  const activateMutation = useActivateBudget();

  const handleActivate = async (budgetId, budgetName) => {
    if (!window.confirm(`${t('accounting.budget.activate')} ${budgetName}?`)) return;

    try {
      await activateMutation.mutateAsync(budgetId);
      toast({
        title: t('accounting.common.success'),
        description: `Budget ${budgetName} activated`
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
          <h1 className="text-3xl font-bold">{t('accounting.budget.title')}</h1>
          <p className="text-gray-600">{t('accounting.budget.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/accounting/budgets/new')}>
          <Plus className="w-4 h-4 mr-2" />
          {t('accounting.common.create')} {t('accounting.budget.title')}
        </Button>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm text-blue-900">{t('accounting.budget.distributeTooltip')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Budgets Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('accounting.budget.title')} ({budgets?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('accounting.common.loading')}</div>
          ) : !budgets || budgets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>{t('accounting.common.noData')}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/accounting/budgets/new')}>
                <Plus className="w-4 h-4 mr-2" />
                {t('accounting.common.create')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.budget.budgetName')}</TableHead>
                  <TableHead>{t('accounting.budget.fiscalYear')}</TableHead>
                  <TableHead>{t('accounting.common.status')}</TableHead>
                  <TableHead>{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {budgets.map((budget) => (
                  <TableRow key={budget.id}>
                    <TableCell className="font-medium">{budget.name}</TableCell>
                    <TableCell>{budget.fiscal_year}</TableCell>
                    <TableCell>
                      <StatusBadge status={budget.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/accounting/budgets/${budget.id}`)}
                        >
                          {t('accounting.common.view')}
                        </Button>
                        {budget.status === 'draft' && (
                          <>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => navigate(`/accounting/budgets/${budget.id}/edit`)}
                            >
                              {t('accounting.common.edit')}
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleActivate(budget.id, budget.name)}
                            >
                              {t('accounting.budget.activate')}
                            </Button>
                          </>
                        )}
                        {budget.status === 'active' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => navigate(`/accounting/budgets/${budget.id}/variance`)}
                          >
                            <TrendingUp className="w-4 h-4 mr-2" />
                            {t('accounting.budget.budgetVsActual')}
                          </Button>
                        )}
                      </div>
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
