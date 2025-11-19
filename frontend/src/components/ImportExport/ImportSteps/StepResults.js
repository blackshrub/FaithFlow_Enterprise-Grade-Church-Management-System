import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { CheckCircle, AlertCircle, Loader2, RefreshCw } from 'lucide-react';

export default function StepResults({ wizardData, updateWizardData, importMembers, resetWizard }) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);

  const executeImport = async () => {
    setImporting(true);
    try {
      const result = await importMembers.mutateAsync({
        file_content: wizardData.fileContent,
        file_type: wizardData.fileType,
        field_mappings: JSON.stringify(wizardData.fieldMappings),
        value_mappings: JSON.stringify(wizardData.valueMappings),
        default_values: JSON.stringify(wizardData.defaultValues || {}),
        duplicate_resolutions: JSON.stringify(wizardData.duplicateResolutions || {}),
        custom_fields: JSON.stringify(wizardData.customFields || []),
        date_format: wizardData.dateFormat,
      });
      
      updateWizardData({ importResults: result });
      setImportComplete(true);
    } catch (error) {
      console.error('Import error:', error);
    } finally {
      setImporting(false);
    }
  };

  // IMPORTANT: All hooks must be at the top, before any conditional returns
  // Auto-execute import when component first mounts
  React.useEffect(() => {
    if (!importing && !importComplete) {
      executeImport();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (importing) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('importExport.importing')}</h3>
            <p className="text-gray-600">{t('importExport.pleaseDoNotClose')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (importComplete && wizardData.importResults) {
    const { importResults } = wizardData;
    const hasErrors = importResults.failed > 0;

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('importExport.importComplete')}</CardTitle>
          <CardDescription>
            {hasErrors ? t('importExport.completedWithErrors') : t('importExport.completedSuccessfully')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success Alert */}
          {!hasErrors && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t('importExport.successfullyImported', { count: importResults.imported })}
              </AlertDescription>
            </Alert>
          )}

          {/* Results Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">{t('importExport.totalRecords')}</p>
                  <p className="text-3xl font-bold">{importResults.total_records}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">{t('importExport.imported')}</p>
                  <p className="text-3xl font-bold text-green-600">{importResults.imported}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">{t('importExport.failed')}</p>
                  <p className="text-3xl font-bold text-red-600">{importResults.failed}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {hasErrors && (
            <div>
              <h3 className="font-semibold mb-3 text-red-600">
                {t('importExport.importErrors')} ({importResults.errors.length})
              </h3>
              <div className="border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto bg-red-50">
                <ul className="space-y-1">
                  {importResults.errors.map((error, idx) => (
                    <li key={idx} className="text-sm text-red-700">
                      • {error}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-center gap-4 pt-4">
            <Button onClick={resetWizard} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              {t('importExport.importAnother')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Initial confirmation screen - preparing import
  return (
    <Card>
      <CardContent className="py-12">
        <div className="text-center">
          <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold mb-2">{t('importExport.preparingImport')}</h3>
        </div>
      </CardContent>
    </Card>
  );
}
