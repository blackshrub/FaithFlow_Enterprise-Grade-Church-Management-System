import React, { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Upload, FileText, Loader2 } from 'lucide-react';

export default function StepFileUpload({ wizardData, updateWizardData, parseFile, nextStep }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const fileContent = event.target?.result;
      
      // Parse file using API
      try {
        const result = await parseFile.mutateAsync(file);
        
        updateWizardData({
          file,
          fileContent,
          fileType: result.file_type,
          headers: result.headers,
          sampleData: result.sample_data,
          totalRecords: result.total_records,
        });
        
        // Auto-advance to Step 2 (Map Fields)
        nextStep();
      } catch (error) {
        console.error('Parse error:', error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.uploadFile')}</CardTitle>
        <CardDescription>{t('importExport.uploadFileDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-blue-500 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.sql"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {parseFile.isPending ? (
            <div>
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600">{t('importExport.parsingFile')}</p>
            </div>
          ) : wizardData.file ? (
            <div>
              <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="font-semibold text-gray-900">{wizardData.file.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {wizardData.totalRecords} {t('importExport.recordsFound')}
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="mt-4"
              >
                {t('importExport.chooseAnother')}
              </Button>
            </div>
          ) : (
            <div>
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">{t('importExport.dragDrop')}</p>
              <p className="text-sm text-gray-500 mb-4">{t('importExport.supportedFormats')}</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {t('importExport.chooseFile')}
              </Button>
            </div>
          )}
        </div>

        <Alert>
          <AlertDescription>
            <strong>{t('importExport.supportedFiles')}:</strong>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>CSV</strong>: {t('importExport.csvDesc')}</li>
              <li><strong>JSON</strong>: {t('importExport.jsonDesc')}</li>
              <li><strong>SQL</strong>: {t('importExport.sqlDesc')}</li>
            </ul>
          </AlertDescription>
        </Alert>

        <Alert>
          <AlertDescription>
            <strong>{t('importExport.requiredFields')}:</strong> First Name, Last Name, WhatsApp Number
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}
