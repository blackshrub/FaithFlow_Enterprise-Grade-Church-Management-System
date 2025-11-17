import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUploadPhotos } from '../../../hooks/useImportExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { Badge } from '../../ui/badge';
import { Upload, Image, ChevronRight, ChevronLeft, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export default function StepPhotoUpload({ wizardData, updateWizardData, nextStep, prevStep }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploadResults, setUploadResults] = useState(wizardData.photoMatchResults || null);
  const uploadPhotos = useUploadPhotos();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Upload and process photos immediately
      const result = await uploadPhotos.mutateAsync(file);
      setUploadResults(result);
      
      // Store results in wizard data
      updateWizardData({ 
        photoArchive: file,
        photoMatchResults: result
      });
    } catch (error) {
      console.error('Upload error:', error);
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
          
          {wizardData.photoArchive ? (
            <div>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <p className="font-semibold text-gray-900">{wizardData.photoArchive.name}</p>
              <p className="text-sm text-gray-500 mt-1">{t('importExport.photosWillBeMatched')}</p>
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

        <Alert>
          <AlertDescription>
            <strong>{t('importExport.optional')}:</strong> {t('importExport.skipPhotoUpload')}
          </AlertDescription>
        </Alert>

        <div className="flex justify-between pt-4">
          <Button variant="outline" onClick={prevStep}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            {t('importExport.previous')}
          </Button>
          <Button onClick={nextStep}>
            {wizardData.photoArchive ? t('importExport.continueWithPhotos') : t('importExport.skipPhotos')}
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
