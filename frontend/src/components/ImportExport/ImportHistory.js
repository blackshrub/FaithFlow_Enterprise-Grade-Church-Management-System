import React from 'react';
import { useTranslation } from 'react-i18next';
import { useImportLogs } from '../../hooks/useImportExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Loader2, History, CheckCircle, XCircle } from 'lucide-react';

export default function ImportHistory() {
  const { t } = useTranslation();
  const { data: logs = [], isLoading } = useImportLogs();

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">{t('common.loading')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.importHistory')}</CardTitle>
        <CardDescription>{t('importExport.importHistoryDesc')}</CardDescription>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <History className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('importExport.noImportHistory')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('importExport.dateTime')}</TableHead>
                  <TableHead>{t('importExport.fileName')}</TableHead>
                  <TableHead>{t('importExport.fileType')}</TableHead>
                  <TableHead>{t('importExport.totalRecords')}</TableHead>
                  <TableHead>{t('importExport.successful')}</TableHead>
                  <TableHead>{t('importExport.failed')}</TableHead>
                  <TableHead>{t('importExport.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      {new Date(log.created_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="font-medium">{log.file_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{log.file_type.toUpperCase()}</Badge>
                    </TableCell>
                    <TableCell>{log.total_records}</TableCell>
                    <TableCell className="text-green-600 font-semibold">
                      {log.successful_records}
                    </TableCell>
                    <TableCell className="text-red-600 font-semibold">
                      {log.failed_records}
                    </TableCell>
                    <TableCell>
                      {log.status === 'completed' ? (
                        <Badge className="bg-green-100 text-green-800">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {t('importExport.completed')}
                        </Badge>
                      ) : (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" />
                          {t('importExport.failed')}
                        </Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
