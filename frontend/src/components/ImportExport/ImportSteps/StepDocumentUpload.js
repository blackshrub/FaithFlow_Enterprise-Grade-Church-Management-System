import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { importExportAPI } from '../../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Upload, FileText, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function StepDocumentUpload({ wizardData, updateWizardData, nextStep, prevStep }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploadResults, setUploadResults] = useState(wizardData.documentSimulation || null);
  const [processing, setProcessing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProcessing(true);
      setProgressPercent(10);
      setUploadProgress(t('importExport.uploading'));
      
      // Simulate progress during upload
      const progressInterval = setInterval(() => {
        setProgressPercent(prev => {
          if (prev < 25) return prev + 3;
          if (prev < 50) return prev + 2;
          if (prev < 75) return prev + 1;
          return prev;
        });
      }, 200);
      
      // Find which field contains document filename
      const documentFieldMapping = Object.entries(wizardData.fieldMappings).find(
        ([source, target]) => target === 'personal_document'
      );
      const documentSourceField = documentFieldMapping ? documentFieldMapping[0] : 'personal_document';
      
      setProgressPercent(30);
      setUploadProgress(t('importExport.extracting'));
      
      // Simulate matching against ALL CSV/SQL data (not just sample!)
      const result = await importExportAPI.simulateDocumentMatching(
        file,
        JSON.stringify(wizardData.allData || wizardData.sampleData),  // Use ALL data
        documentSourceField
      );
      
      clearInterval(progressInterval);
      setProgressPercent(80);
      setUploadProgress(t('importExport.matching'));
      
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setProgressPercent(95);
      setUploadProgress(t('importExport.almostReady'));
      
      setUploadResults(result.data);
      
      await new Promise(resolve => setTimeout(resolve, 300));
      setProgressPercent(100);
      
      // Store file and results in wizard (not uploaded to DB yet!)
      updateWizardData({ 
        documentArchive: file,
        documentSimulation: result.data,
        documentExtractedFiles: result.data.matched || []  // Store for later import
      });
      
      setUploadProgress('');
    } catch (error) {
      console.error('Document simulation error:', error);
      setUploadProgress(t('importExport.error'));
    } finally {
      setProcessing(false);
      setProgressPercent(0);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.uploadDocumentsOptional')}</CardTitle>
        <CardDescription>{t('importExport.uploadDocumentsWizardDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.rar"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {processing ? (
            <div>
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-gray-600 font-semibold">{uploadProgress}</p>
              <div className="w-64 mx-auto mt-4">
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-600 transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                {progressPercent}% - {t('importExport.pleaseWait')}
              </p>
            </div>
          ) : uploadResults ? (
            <div>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="font-semibold text-gray-900">{wizardData.documentArchive?.name}</p>
              <p className="text-sm text-green-600 mt-1">
                {t('importExport.documentsMatched', { count: uploadResults.summary?.matched_count || 0 })}
              </p>
              {uploadResults.summary?.unmatched_files_count > 0 && (
                <p className="text-sm text-orange-600">
                  {t('importExport.unmatchedFiles')}: {uploadResults.summary.unmatched_files_count}
                </p>
              )}
              <Button
                onClick={() => {
                  fileInputRef.current?.click();
                  setUploadResults(null);
                }}
                variant="outline"
                className="mt-4"
              >
                {t('importExport.chooseAnother')}
              </Button>
            </div>
          ) : (
            <div>
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">{t('importExport.uploadDocumentArchive')}</p>
              <p className="text-sm text-gray-500 mb-4">{t('importExport.supportedDocumentFormats')}</p>
              <Button onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                {t('importExport.chooseArchive')}
              </Button>
            </div>
          )}
        </div>

        {/* Results Summary */}
        {uploadResults && (
          <div className="grid grid-cols-3 gap-4">
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-600">{t('importExport.totalFiles')}</p>
                <p className="text-2xl font-bold">{uploadResults.summary?.total_files || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-green-500">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-600">{t('importExport.matched')}</p>
                <p className="text-2xl font-bold text-green-600">{uploadResults.summary?.matched_count || 0}</p>
              </CardContent>
            </Card>
            <Card className="border-orange-500">
              <CardContent className="pt-6 text-center">
                <p className="text-sm text-gray-600">{t('importExport.unmatchedFiles')}</p>
                <p className="text-2xl font-bold text-orange-600">{uploadResults.summary?.unmatched_files_count || 0}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Matched/Unmatched Details */}
        {uploadResults && uploadResults.summary?.matched_count > 0 && (
          <Alert className="border-green-500 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              {t('importExport.documentsMatched', { count: uploadResults.summary.matched_count })}
            </AlertDescription>
          </Alert>
        )}
        
        {uploadResults && uploadResults.summary?.unmatched_files_count > 0 && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {t('importExport.someFilesUnmatched', { count: uploadResults.summary.unmatched_files_count })}
            </AlertDescription>
          </Alert>
        )}

        <Alert>
          <AlertDescription>
            <strong>{t('importExport.howItWorks')}:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>{t('importExport.documentStep1')}</li>
              <li>{t('importExport.documentStep2')}</li>
              <li>{t('importExport.documentStep3')}</li>
              <li>{t('importExport.documentStep4')}</li>
            </ol>
          </AlertDescription>
        </Alert>

        <Alert variant="info">
          <AlertDescription>
            <strong>{t('importExport.acceptedDocumentFormats')}:</strong> PDF, DOC, DOCX, TXT, JPG (images)
          </AlertDescription>
        </Alert>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('importExport.previous')}
          </Button>
          <Button onClick={nextStep} disabled={processing}>
            {uploadResults 
              ? t('importExport.continueWithDocuments') 
              : t('importExport.skipDocuments')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
