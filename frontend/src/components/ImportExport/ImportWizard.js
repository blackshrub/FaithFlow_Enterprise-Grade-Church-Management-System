import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useParseFile, useSimulateImport, useImportMembers } from '../../hooks/useImportExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { Upload, ChevronRight, ChevronLeft, Check, AlertCircle, Loader2 } from 'lucide-react';
import StepFileUpload from './ImportSteps/StepFileUpload';
import StepFieldMapping from './ImportSteps/StepFieldMapping';
import StepValueMapping from './ImportSteps/StepValueMapping';
import StepSimulation from './ImportSteps/StepSimulation';
import StepResults from './ImportSteps/StepResults';

const STEPS = [
  { id: 1, name: 'Upload File', key: 'upload' },
  { id: 2, name: 'Map Fields', key: 'mapping' },
  { id: 3, name: 'Map Values', key: 'values' },
  { id: 4, name: 'Simulate & Validate', key: 'simulate' },
  { id: 5, name: 'Import', key: 'import' },
];

export default function ImportWizard() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    file: null,
    fileContent: '',
    fileType: '',
    headers: [],
    sampleData: [],
    totalRecords: 0,
    fieldMappings: {},
    valueMappings: {},
    defaultValues: {},
    dateFormat: 'DD-MM-YYYY',
    simulationResults: null,
    importResults: null,
  });

  const parseFile = useParseFile();
  const simulateImport = useSimulateImport();
  const importMembers = useImportMembers();

  const updateWizardData = (updates) => {
    setWizardData(prev => ({ ...prev, ...updates }));
  };

  const nextStep = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const resetWizard = () => {
    setCurrentStep(1);
    setWizardData({
      file: null,
      fileContent: '',
      fileType: '',
      headers: [],
      sampleData: [],
      totalRecords: 0,
      fieldMappings: {},
      valueMappings: {},
      dateFormat: 'DD-MM-YYYY',
      simulationResults: null,
      importResults: null,
    });
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center mb-4">
            <div>
              <CardTitle>{t('importExport.importWizard')}</CardTitle>
              <CardDescription>
                {t('importExport.step')} {currentStep} {t('importExport.of')} {STEPS.length}: {STEPS[currentStep - 1].name}
              </CardDescription>
            </div>
            {currentStep > 1 && currentStep < 5 && (
              <Button variant="outline" onClick={resetWizard} size="sm">
                {t('importExport.startOver')}
              </Button>
            )}
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </CardHeader>
      </Card>

      {/* Step Content */}
      <div className="min-h-[500px]">
        {currentStep === 1 && (
          <StepFileUpload
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            parseFile={parseFile}
            nextStep={nextStep}
          />
        )}
        
        {currentStep === 2 && (
          <StepFieldMapping
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        )}
        
        {currentStep === 3 && (
          <StepValueMapping
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        )}
        
        {currentStep === 4 && (
          <StepSimulation
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            simulateImport={simulateImport}
            nextStep={nextStep}
            prevStep={prevStep}
          />
        )}
        
        {currentStep === 5 && (
          <StepResults
            wizardData={wizardData}
            updateWizardData={updateWizardData}
            importMembers={importMembers}
            resetWizard={resetWizard}
          />
        )}
      </div>

      {/* Step Navigation */}
      {currentStep < 5 && currentStep > 1 && wizardData.headers.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={prevStep}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-2" />
                {t('importExport.previous')}
              </Button>
              <Button
                onClick={nextStep}
                disabled={currentStep === STEPS.length}
              >
                {t('importExport.next')}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
