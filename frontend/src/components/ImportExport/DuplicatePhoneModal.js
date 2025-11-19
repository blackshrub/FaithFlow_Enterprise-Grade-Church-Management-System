import React from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { AlertTriangle, XCircle } from 'lucide-react';

export default function DuplicatePhoneModal({ isOpen, onClose, duplicateData }) {
  const { t } = useTranslation();

  if (!duplicateData) return null;

  const { internal_duplicates = [], external_duplicates = [] } = duplicateData;
  const hasInternal = internal_duplicates.length > 0;
  const hasExternal = external_duplicates.length > 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-6 w-6 text-red-500" />
            <DialogTitle className="text-xl">
              {t('importExport.duplicatePhoneNumbers')}
            </DialogTitle>
          </div>
          <DialogDescription>
            {t('importExport.duplicatePhoneDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Alert Summary */}
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {hasInternal && hasExternal && (
                <>
                  {t('importExport.foundDuplicates', {
                    internal: internal_duplicates.length,
                    external: external_duplicates.length,
                  })}
                </>
              )}
              {hasInternal && !hasExternal && (
                <>
                  {t('importExport.foundInternalDuplicates', {
                    count: internal_duplicates.length,
                  })}
                </>
              )}
              {!hasInternal && hasExternal && (
                <>
                  {t('importExport.foundExternalDuplicates', {
                    count: external_duplicates.length,
                  })}
                </>
              )}
            </AlertDescription>
          </Alert>

          {/* Internal Duplicates (within CSV) */}
          {hasInternal && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="destructive">{internal_duplicates.length}</Badge>
                <h3 className="font-semibold text-lg">
                  {t('importExport.duplicatesWithinFile')}
                </h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('importExport.phoneNumber')}</TableHead>
                      <TableHead>{t('importExport.firstOccurrence')}</TableHead>
                      <TableHead>{t('importExport.duplicateOccurrence')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {internal_duplicates.map((dup, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">{dup.phone}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{dup.first_occurrence.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {t('importExport.rowNumber', { row: dup.first_occurrence.row })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{dup.duplicate_occurrence.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {t('importExport.rowNumber', { row: dup.duplicate_occurrence.row })}
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* External Duplicates (in database) */}
          {hasExternal && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="destructive">{external_duplicates.length}</Badge>
                <h3 className="font-semibold text-lg">
                  {t('importExport.duplicatesWithDatabase')}
                </h3>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('importExport.phoneNumber')}</TableHead>
                      <TableHead>{t('importExport.csvRecord')}</TableHead>
                      <TableHead>{t('importExport.existingMember')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {external_duplicates.map((dup, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-mono">{dup.phone}</TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{dup.csv_record.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {t('importExport.rowNumber', { row: dup.csv_record.row })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{dup.existing_member.full_name}</div>
                            {dup.existing_member.email && (
                              <div className="text-sm text-muted-foreground">
                                {dup.existing_member.email}
                              </div>
                            )}
                            {dup.existing_member.address && (
                              <div className="text-sm text-muted-foreground">
                                {dup.existing_member.address}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Instructions */}
          <Alert>
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold">{t('importExport.howToResolve')}:</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  <li>{t('importExport.cancelImport')}</li>
                  <li>{t('importExport.fixDuplicatesInCSV')}</li>
                  <li>{t('importExport.reuploadFile')}</li>
                </ol>
              </div>
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="destructive">
            <XCircle className="h-4 w-4 mr-2" />
            {t('importExport.cancelImport')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
