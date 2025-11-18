import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
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
import { useResponsibilityCenters, useDeleteResponsibilityCenter } from '../../hooks/useAccounting';
import ResponsibilityCenterModal from '../../components/Accounting/ResponsibilityCenterModal';

export default function ResponsibilityCenters() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [selectedCenter, setSelectedCenter] = useState(null);
  
  const { data: centers, isLoading, refetch } = useResponsibilityCenters();
  const deleteMutation = useDeleteResponsibilityCenter();

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.responsibilityCenter.title')}</h1>
          <p className="text-gray-600">{t('accounting.responsibilityCenter.subtitle')}</p>
        </div>
        <Button onClick={() => {
          setSelectedCenter(null);
          setShowModal(true);
        }}>
          <Plus className="w-4 h-4 mr-2" />
          {t('accounting.responsibilityCenter.create')}
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('accounting.responsibilityCenter.title')} ({centers?.length || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('accounting.common.loading')}</div>
          ) : !centers || centers.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <p>{t('accounting.common.noData')}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('accounting.responsibilityCenter.code')}</TableHead>
                  <TableHead>{t('accounting.responsibilityCenter.name')}</TableHead>
                  <TableHead>{t('accounting.responsibilityCenter.type')}</TableHead>
                  <TableHead>{t('common.status')}</TableHead>
                  <TableHead>{t('members.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {centers.map((center) => (
                  <TableRow key={center.id}>
                    <TableCell className="font-mono">{center.code}</TableCell>
                    <TableCell>{center.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {t(`accounting.responsibilityCenter.${center.type}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {center.is_active ? (
                        <Badge className="bg-green-100 text-green-800">
                          {t('common.active')}
                        </Badge>
                      ) : (
                        <Badge variant="outline">{t('common.inactive')}</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <Button variant="ghost" size="sm" onClick={() => {
                          setSelectedCenter(center);
                          setShowModal(true);
                        }}>
                          {t('accounting.common.edit')}
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={async () => {
                            if (!window.confirm(t('accounting.common.delete') + '?')) return;
                            try {
                              await deleteMutation.mutateAsync(center.id);
                              toast({
                                title: t('accounting.common.success'),
                                description: `${center.name} deleted`
                              });
                            } catch (error) {
                              toast({
                                variant: "destructive",
                                title: t('accounting.common.error'),
                                description: error.message
                              });
                            }
                          }}
                        >
                          {t('accounting.common.delete')}
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

      {/* Modal */}
      <ResponsibilityCenterModal
        open={showModal}
        onOpenChange={setShowModal}
        center={selectedCenter}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
