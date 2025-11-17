import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { CheckCircle, AlertCircle, Loader2, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react';
import StepDuplicateResolution from './StepDuplicateResolution';

export default function StepSimulation({ wizardData, updateWizardData, simulateImport, nextStep, prevStep }) {
  const { t } = useTranslation();
  const [simulating, setSimulating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);

  const runSimulation = async () => {
    setSimulating(true);
    try {
      const result = await simulateImport.mutateAsync({
        file_content: wizardData.fileContent,
        file_type: wizardData.fileType,
        field_mappings: JSON.stringify(wizardData.fieldMappings),
        value_mappings: JSON.stringify(wizardData.valueMappings),
        default_values: JSON.stringify(wizardData.defaultValues || {}),
        date_format: wizardData.dateFormat,
      });
      
      updateWizardData({ simulationResults: result });
      setSimulationComplete(true);
    } catch (error) {
      console.error('Simulation error:', error);
    } finally {
      setSimulating(false);
    }
  };

  useEffect(() => {
    if (!wizardData.simulationResults && !simulating) {
      runSimulation();
    }
  }, []);

  if (simulating) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">{t('importExport.simulatingImport')}</h3>
            <p className="text-gray-600">{t('importExport.validatingData')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (simulationComplete && wizardData.simulationResults) {
    const { simulationResults } = wizardData;
    const hasErrors = simulationResults.errors && simulationResults.errors.length > 0;
    const hasDuplicates = simulationResults.duplicate_conflicts && simulationResults.duplicate_conflicts.length > 0;

    // Show duplicate resolution if needed
    if (hasDuplicates && !wizardData.duplicateResolutions) {
      return <StepDuplicateResolution wizardData={wizardData} updateWizardData={updateWizardData} nextStep={nextStep} prevStep={prevStep} />;
    }

    return (
      <Card>
        <CardHeader>
          <CardTitle>{t('importExport.simulationComplete')}</CardTitle>
          <CardDescription>
            {hasErrors 
              ? t('importExport.simulationFoundErrors') 
              : t('importExport.simulationSuccessful')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Success Alert */}
          {!hasErrors && !hasDuplicates && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t('importExport.readyToImport', { count: simulationResults.valid_records })}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Duplicate Alert */}
          {hasDuplicates && !hasErrors && (
            <Alert className="border-orange-500 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                {t('importExport.duplicatePhoneWarning', { count: simulationResults.duplicate_conflicts.length })}
              </AlertDescription>
            </Alert>
          )}

          {/* Results Summary */}
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">{t('importExport.totalRecords')}</p>
                  <p className="text-3xl font-bold">{simulationResults.total_records}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">{t('importExport.validRecords')}</p>
                  <p className="text-3xl font-bold text-green-600">{simulationResults.valid_records}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-red-500">
              <CardContent className="pt-6">
                <div className="text-center">
                  <p className="text-sm text-gray-600">{t('importExport.invalidRecords')}</p>
                  <p className="text-3xl font-bold text-red-600">{simulationResults.invalid_records || 0}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Errors */}
          {hasErrors && (
            <div>
              <h3 className="font-semibold mb-3 text-red-600">
                {t('importExport.validationErrors')} ({simulationResults.errors.length})
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

          {/* Warnings */}
          {hasWarnings && (
            <div>
              <h3 className="font-semibold mb-3 text-yellow-600">
                {t('importExport.warnings')} ({simulationResults.warnings.length})
              </h3>
              <div className="border border-yellow-200 rounded-lg p-4 max-h-64 overflow-y-auto bg-yellow-50">
                <ul className="space-y-1">
                  {simulationResults.warnings.map((warning, idx) => (
                    <li key={idx} className="text-sm text-yellow-700">
                      • {warning}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={prevStep}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              {t('importExport.previous')}
            </Button>
            <Button 
              onClick={() => {
                setSimulationComplete(false);
                runSimulation();
              }} 
              variant="outline"
              className="mr-auto ml-4"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              {t('importExport.rerunSimulation')}
            </Button>
            <Button 
              onClick={nextStep} 
              disabled={hasErrors}
            >
              {t('importExport.proceedToImport')}
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
