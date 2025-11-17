import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { useParseFile, useSimulateImport, useImportMembers } from '../../hooks/useImportExport';
import { useChurchSettings } from '../../hooks/useSettings';
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
  { id: 2, name: 'Upload Photos (Optional)', key: 'photos' },
  { id: 3, name: 'Upload Documents (Optional)', key: 'documents' },
  { id: 4, name: 'Map Fields', key: 'mapping' },
  { id: 5, name: 'Map Values', key: 'values' },
  { id: 6, name: 'Simulate & Validate', key: 'simulate' },
  { id: 7, name: 'Import', key: 'import' },
];

export default function ImportWizard() {
  const { t } = useTranslation();
  const { church } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  
  // Fetch church settings to get date format
  const { data: churchSettings, isLoading: loadingSettings } = useChurchSettings();
  
  const [wizardData, setWizardData] = useState({
    file: null,
    fileContent: '',
    fileType: '',
    headers: [],
    sampleData: [],
    totalRecords: 0,
    photoArchive: null,
    photoMatchResults: null,
    documentArchive: null,
    documentMatchResults: null,
    fieldMappings: {},
    valueMappings: {},
    defaultValues: {},
    dateFormat: 'DD-MM-YYYY',
    simulationResults: null,
    duplicateResolutions: {},
    importResults: null,
  });

  // Update date format when church settings load
  useEffect(() => {
    if (churchSettings?.date_format) {
      setWizardData(prev => ({ ...prev, dateFormat: churchSettings.date_format }));
    }
  }, [churchSettings]);

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
      defaultValues: {},
      dateFormat: churchSettings?.date_format || 'DD-MM-YYYY',
      simulationResults: null,
      importResults: null,
    });
  };

  const progressPercentage = (currentStep / STEPS.length) * 100;

  if (loadingSettings) {
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
    <div className="space-y-6">
      {/* Visual Timeline Stepper */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            {STEPS.map((step, index) => (
              <React.Fragment key={step.id}>
                {/* Step Circle */}
                <div className="flex flex-col items-center">
                  <div
                    className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all ${
                      step.id < currentStep
                        ? 'bg-green-500 border-green-500 text-white'
                        : step.id === currentStep
                        ? 'bg-blue-500 border-blue-500 text-white'
                        : 'bg-gray-100 border-gray-300 text-gray-400'
                    }`}
                  >
                    {step.id < currentStep ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <span className="font-semibold">{step.id}</span>
                    )}
                  </div>
                  <div className="mt-2 text-center">
                    <p
                      className={`text-sm font-medium ${
                        step.id === currentStep
                          ? 'text-blue-600'
                          : step.id < currentStep
                          ? 'text-green-600'
                          : 'text-gray-500'
                      }`}
                    >
                      {step.name}
                    </p>
                  </div>
                </div>
                
                {/* Connector Line */}
                {index < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-all ${
                      step.id < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                    style={{ maxWidth: '100px' }}
                  />
                )}
              </React.Fragment>
            ))}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
