import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { importExportAPI } from '../../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Upload, Image, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function StepPhotoUpload({ wizardData, updateWizardData, nextStep, prevStep }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploadResults, setUploadResults] = useState(wizardData.photoSimulation || null);
  const [processing, setProcessing] = useState(false);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProcessing(true);
      
      // Find which field contains photo filename
      const photoFieldMapping = Object.entries(wizardData.fieldMappings).find(
        ([source, target]) => target === 'photo_filename'
      );
      const photoSourceField = photoFieldMapping ? photoFieldMapping[0] : 'photo_filename';
      
      // Simulate matching against CSV data (not database)
      const result = await importExportAPI.simulatePhotoMatching(
        file,
        JSON.stringify(wizardData.sampleData),
        photoSourceField
      );
      
      setUploadResults(result.data);
      
      // Store file and results in wizard (not uploaded to DB yet!)
      updateWizardData({ 
        photoArchive: file,
        photoSimulation: result.data,
        photoExtractedFiles: result.data.matched || []  // Store for later import
      });
    } catch (error) {
      console.error('Photo simulation error:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('importExport.uploadPhotosOptional')}</CardTitle>
        <CardDescription>{t('importExport.uploadPhotosWizardDesc')}</CardDescription>
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
              <p className="text-gray-600">{t('importExport.processingPhotos')}</p>
              <p className="text-sm text-gray-500">{t('importExport.pleaseWait')}</p>
            </div>
          ) : uploadResults ? (
            <div>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="font-semibold text-gray-900">{wizardData.photoArchive?.name}</p>
              <p className="text-sm text-green-600 mt-1">
                {t('importExport.photosMatched', { count: uploadResults.summary?.matched_count || 0 })}
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
              <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">{t('importExport.uploadPhotoArchive')}</p>
              <p className="text-sm text-gray-500 mb-4">{t('importExport.supportedPhotoFormats')}</p>
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

        <Alert>
          <AlertDescription>
            <strong>{t('importExport.howItWorks')}:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>{t('importExport.photoStepNew1')}</li>
              <li>{t('importExport.photoStepNew2')}</li>
              <li>{t('importExport.photoStepNew3')}</li>
              <li>{t('importExport.photoStepNew4')}</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('importExport.previous')}
          </Button>
          <Button onClick={nextStep} disabled={processing}>
            {uploadResults 
              ? t('importExport.continueWithPhotos') 
              : t('importExport.skipPhotos')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
