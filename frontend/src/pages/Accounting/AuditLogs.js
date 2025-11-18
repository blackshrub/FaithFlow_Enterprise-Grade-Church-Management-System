import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Shield, Filter } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { useAuditLogs } from '../../hooks/useAccounting';
import PaginationControls from '../../components/Accounting/PaginationControls';

export default function AuditLogs() {
  const { t } = useTranslation();
  
  const [pagination, setPagination] = useState({ limit: 50, offset: 0 });
  const [filters, setFilters] = useState({
    module: '',
    action_type: ''
  });

  const { data: logsData, isLoading } = useAuditLogs({
    ...pagination,
    module: filters.module || undefined,
    action_type: filters.action_type || undefined
  });

  const logs = logsData?.data || [];
  const paginationInfo = logsData?.pagination;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('accounting.auditLog.title')}</h1>
          <p className="text-gray-600">{t('accounting.auditLog.subtitle')}</p>
        </div>
        <Shield className="w-12 h-12 text-blue-600" />
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>{t('accounting.auditLog.module')}</Label>
              <select
                className="w-full p-2 border rounded"
                value={filters.module}
                onChange={(e) => setFilters({...filters, module: e.target.value})}
              >
                <option value="">{t('common.all')}</option>
                <option value="coa">COA</option>
                <option value="journal">Journal</option>
                <option value="budget">Budget</option>
                <option value="fixed_asset">Fixed Asset</option>
                <option value="fiscal_period">Fiscal Period</option>
              </select>
            </div>
            <div>
              <Label>{t('accounting.auditLog.action')}</Label>
              <select
                className="w-full p-2 border rounded"
                value={filters.action_type}
                onChange={(e) => setFilters({...filters, action_type: e.target.value})}
              >
                <option value="">{t('common.all')}</option>
                <option value="create">{t('accounting.auditLog.created')}</option>
                <option value="update">{t('accounting.auditLog.updated')}</option>
                <option value="delete">{t('accounting.auditLog.deleted')}</option>
                <option value="approve">{t('accounting.auditLog.approved')}</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            {t('accounting.auditLog.title')} ({paginationInfo?.total || 0})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">{t('accounting.common.loading')}</div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Shield className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>{t('accounting.common.noData')}</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('accounting.auditLog.timestamp')}</TableHead>
                    <TableHead>{t('accounting.auditLog.user')}</TableHead>
                    <TableHead>{t('accounting.auditLog.module')}</TableHead>
                    <TableHead>{t('accounting.auditLog.action')}</TableHead>
                    <TableHead>{t('accounting.journal.description')}</TableHead>
                    <TableHead>{t('members.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm">
                        {new Date(log.timestamp).toLocaleString('id-ID')}
                      </TableCell>
                      <TableCell className="text-sm">{log.user_id?.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.module}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={
                          log.action_type === 'create' ? 'bg-green-100 text-green-800' :
                          log.action_type === 'update' ? 'bg-blue-100 text-blue-800' :
                          log.action_type === 'delete' ? 'bg-red-100 text-red-800' :
                          'bg-purple-100 text-purple-800'
                        }>
                          {t(`accounting.auditLog.${log.action_type}`)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">{log.description}</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          {t('accounting.auditLog.viewDetails')}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {paginationInfo && (
                <PaginationControls 
                  pagination={paginationInfo} 
                  onPageChange={setPagination} 
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
