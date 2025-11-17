import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function StepSimulation({ wizardData, updateWizardData, simulateImport, nextStep, prevStep }) {
  const { t } = useTranslation();

  useEffect(() => {
    // Auto-run simulation when step loads
    if (!wizardData.simulationResults) {
      runSimulation();
    }
  }, []);

  const runSimulation = async () => {
    try {
      const result = await simulateImport.mutateAsync({
        file_content: wizardData.fileContent,
        file_type: wizardData.fileType,
        field_mappings: JSON.stringify(wizardData.fieldMappings),
        value_mappings: JSON.stringify(wizardData.valueMappings),
        date_format: wizardData.dateFormat,
      });
      
      updateWizardData({ simulationResults: result });
    } catch (error) {
      console.error('Simulation error:', error);
    }
  };

  const { simulationResults } = wizardData;

  if (simulateImport.isPending) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">{t('importExport.validatingData')}</p>
            <p className="text-sm text-gray-500 mt-2">{t('importExport.pleaseWait')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!simulationResults) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <p className="text-gray-600">{t('importExport.simulationFailed')}</p>
            <Button onClick={runSimulation} className="mt-4">
              {t('importExport.tryAgain')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.validationResults')}</CardTitle>
        <CardDescription>{t('importExport.reviewBeforeImport')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">{t('importExport.totalRecords')}</p>
                <p className="text-3xl font-bold text-blue-600">{simulationResults.total_records}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">{t('importExport.validRecords')}</p>
                <p className="text-3xl font-bold text-green-600">{simulationResults.valid_records}</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">{t('importExport.invalidRecords')}</p>
                <p className="text-3xl font-bold text-red-600">{simulationResults.invalid_records}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Status Alert */}
        {simulationResults.ready_to_import ? (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t('importExport.allRecordsValid')}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('importExport.fixErrorsBeforeImport')}
            </AlertDescription>
          </Alert>
        )}

        {/* Sample Valid Data Preview */}
        {simulationResults.sample_valid && simulationResults.sample_valid.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3">{t('importExport.sampleValidData')}</h3>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>First Name</TableHead>
                    <TableHead>Last Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Gender</TableHead>
                    <TableHead>Demographic</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {simulationResults.sample_valid.slice(0, 5).map((row, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{row.first_name}</TableCell>
                      <TableCell>{row.last_name}</TableCell>
                      <TableCell>{row.phone_whatsapp}</TableCell>
                      <TableCell>{row.email || '-'}</TableCell>
                      <TableCell>
                        {row.gender && <Badge>{row.gender}</Badge>}
                      </TableCell>
                      <TableCell>
                        {row.demographic_category && (
                          <Badge variant="secondary">{row.demographic_category}</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Errors List */}
        {simulationResults.errors && simulationResults.errors.length > 0 && (
          <div>
            <h3 className="font-semibold mb-3 text-red-600">
              {t('importExport.errors')} ({simulationResults.errors.length})
            </h3>
            <div className="border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto bg-red-50">
              <ul className="space-y-1">
                {simulationResults.errors.map((error, idx) => (
                  <li key={idx} className="text-sm text-red-700">
                    • {error}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('importExport.previous')}
          </Button>
          <Button
            onClick={nextStep}
            disabled={!simulationResults.ready_to_import}
          >
            {t('importExport.proceedToImport')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
