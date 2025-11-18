import React from 'react';
import { useTranslation } from 'react-i18next';
import { Calendar } from 'lucide-react';
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
import { 
  useFiscalPeriods, 
  useClosePeriod, 
  useLockPeriod, 
  useUnlockPeriod 
} from '../../hooks/useAccounting';
import PeriodStatusBadge from '../../components/Accounting/PeriodStatusBadge';
import { useToast } from '../../hooks/use-toast';

export default function FiscalPeriods() {
  const { t } = useTranslation();
  const { toast } = useToast();

  const currentYear = new Date().getFullYear();
  const { data: periods, isLoading } = useFiscalPeriods({ year: currentYear });

  const closeMutation = useClosePeriod();
  const lockMutation = useLockPeriod();
  const unlockMutation = useUnlockPeriod();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handleClose = async (month, year) => {
    if (!window.confirm(t('accounting.fiscalPeriod.closeConfirm'))) return;

    try {
      await closeMutation.mutateAsync({ month, year });
      toast({
        title: t('accounting.common.success'),
        description: `Period ${month}/${year} closed`
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

  const handleLock = async (month, year) => {
    if (!window.confirm(t('accounting.fiscalPeriod.lockConfirm'))) return;

    try {
      await lockMutation.mutateAsync({ month, year });
      toast({
        title: t('accounting.common.success'),
        description: `Period ${month}/${year} locked`
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

  const handleUnlock = async (month, year) => {
    if (!window.confirm(t('accounting.fiscalPeriod.unlockConfirm'))) return;

    try {
      await unlockMutation.mutateAsync({ month, year });
      toast({
        title: t('accounting.common.success'),
        description: `Period ${month}/${year} unlocked`
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
      <div>
        <h1 className="text-3xl font-bold">{t('accounting.fiscalPeriod.title')}</h1>
        <p className="text-gray-600">{t('accounting.fiscalPeriod.subtitle')}</p>
      </div>

      {/* Info Card */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <p className="font-medium text-blue-900">{t('accounting.fiscalPeriod.whyLock')}</p>
              <p className="text-sm text-blue-700 mt-1">{t('accounting.fiscalPeriod.lockExplanation')}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Periods Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('accounting.fiscalPeriod.title')} {currentYear}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('accounting.common.loading')}</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.fiscalPeriod.month')}</TableHead>
                  <TableHead>{t('accounting.fiscalPeriod.year')}</TableHead>
                  <TableHead>{t('accounting.fiscalPeriod.status')}</TableHead>
                  <TableHead>{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthNames.map((monthName, index) => {
                  const month = index + 1;
                  const period = periods?.find(p => p.month === month);
                  const status = period?.status || 'open';
                  
                  return (
                    <TableRow key={month}>
                      <TableCell>{monthName}</TableCell>
                      <TableCell>{currentYear}</TableCell>
                      <TableCell>
                        <PeriodStatusBadge status={status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {status === 'open' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleClose(month, currentYear)}
                            >
                              {t('accounting.fiscalPeriod.closePeriod')}
                            </Button>
                          )}
                          {status === 'closed' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleLock(month, currentYear)}
                            >
                              {t('accounting.fiscalPeriod.lockPeriod')}
                            </Button>
                          )}
                          {status === 'locked' && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleUnlock(month, currentYear)}
                            >
                              {t('accounting.fiscalPeriod.unlockPeriod')}
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
