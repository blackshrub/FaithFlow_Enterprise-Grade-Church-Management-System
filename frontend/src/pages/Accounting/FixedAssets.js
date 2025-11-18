import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Building2, Play } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import { useAssets, useRunDepreciation } from '../../hooks/useAccounting';
import CurrencyDisplay from '../../components/Accounting/CurrencyDisplay';
import TableSkeleton from '../../components/Accounting/TableSkeleton';
import { useToast } from '../../hooks/use-toast';

export default function FixedAssets() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [depreciationMonth, setDepreciationMonth] = useState(new Date().getMonth() + 1);
  const [depreciationYear, setDepreciationYear] = useState(new Date().getFullYear());
  const [showDepreciationDialog, setShowDepreciationDialog] = useState(false);

  const { data: assets, isLoading } = useAssets({ is_active: true });
  const runDepreciationMutation = useRunDepreciation();

  const handleRunDepreciation = async () => {
    if (!window.confirm(
      t('accounting.fixedAsset.runDepreciationConfirm', { 
        month: depreciationMonth, 
        year: depreciationYear 
      })
    )) return;

    try {
      const response = await runDepreciationMutation.mutateAsync({ 
        month: depreciationMonth, 
        year: depreciationYear 
      });
      
      toast({
        title: t('accounting.common.success'),
        description: t('accounting.fixedAsset.depreciationSuccess', { 
          count: response.data.created_journals?.length || 0 
        })
      });
      
      setShowDepreciationDialog(false);
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
          <h1 className="text-3xl font-bold">{t('accounting.fixedAsset.title')}</h1>
          <p className="text-gray-600">{t('accounting.fixedAsset.subtitle')}</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={showDepreciationDialog} onOpenChange={setShowDepreciationDialog}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Play className="w-4 h-4 mr-2" />
                {t('accounting.fixedAsset.runDepreciation')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('accounting.fixedAsset.runDepreciation')}</DialogTitle>
                <DialogDescription>
                  {t('accounting.fixedAsset.depreciationTooltip')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>{t('accounting.fiscalPeriod.month')}</Label>
                    <Input
                      type="number"
                      min="1"
                      max="12"
                      value={depreciationMonth}
                      onChange={(e) => setDepreciationMonth(parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label>{t('accounting.fiscalPeriod.year')}</Label>
                    <Input
                      type="number"
                      min="2000"
                      max="2100"
                      value={depreciationYear}
                      onChange={(e) => setDepreciationYear(parseInt(e.target.value))}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setShowDepreciationDialog(false)}>
                    {t('accounting.common.cancel')}
                  </Button>
                  <Button onClick={handleRunDepreciation} disabled={runDepreciationMutation.isLoading}>
                    {runDepreciationMutation.isLoading ? t('accounting.common.loading') : t('accounting.fixedAsset.runDepreciation')}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          
          <Button onClick={() => navigate('/accounting/assets/new')}>
            <Plus className="w-4 h-4 mr-2" />
            {t('accounting.common.create')}
          </Button>
        </div>
      </div>

      {/* Assets Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('accounting.fixedAsset.title')} ({assets?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={5} columns={7} />
          ) : !assets || assets.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Building2 className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>{t('accounting.common.noData')}</p>
              <p className="text-sm mt-2">{t('accounting.fixedAsset.depreciationTooltip')}</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/accounting/assets/new')}>
                <Plus className="w-4 h-4 mr-2" />
                {t('accounting.common.create')}
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.fixedAsset.assetCode')}</TableHead>
                  <TableHead>{t('accounting.fixedAsset.assetName')}</TableHead>
                  <TableHead>{t('accounting.fixedAsset.acquisitionDate')}</TableHead>
                  <TableHead className="text-right">{t('accounting.fixedAsset.cost')}</TableHead>
                  <TableHead>{t('accounting.fixedAsset.usefulLifeMonths')}</TableHead>
                  <TableHead>{t('accounting.fixedAsset.depreciationMethod')}</TableHead>
                  <TableHead>{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assets.map((asset) => (
                  <TableRow key={asset.id}>
                    <TableCell className="font-mono">{asset.asset_code}</TableCell>
                    <TableCell className="font-medium">{asset.name}</TableCell>
                    <TableCell>{new Date(asset.acquisition_date).toLocaleDateString('id-ID')}</TableCell>
                    <TableCell className="text-right">
                      <CurrencyDisplay amount={asset.cost} />
                    </TableCell>
                    <TableCell>{asset.useful_life_months} {t('accounting.common.months')}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t('accounting.fixedAsset.straightLine')}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/accounting/assets/${asset.id}`)}
                        >
                          {t('accounting.common.view')}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/accounting/assets/${asset.id}/schedule`)}
                        >
                          {t('accounting.fixedAsset.depreciationSchedule')}
                        </Button>
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
