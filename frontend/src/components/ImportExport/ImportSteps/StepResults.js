import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Alert, AlertDescription } from '../../ui/alert';
import { Progress } from '../../ui/progress';
import { CheckCircle, AlertCircle, Loader2, RefreshCw, ScanFace } from 'lucide-react';
import { faceRecognitionService } from '../../../services/faceRecognitionService';
import { importExportAPI } from '../../../services/api';

export default function StepResults({ wizardData, updateWizardData, importMembers, resetWizard }) {
  const { t } = useTranslation();
  const [importing, setImporting] = useState(false);
  const [importComplete, setImportComplete] = useState(false);
  const importStartedRef = React.useRef(false);  // Guard against double execution

  // Face descriptor generation state
  const [generatingFaceDescriptors, setGeneratingFaceDescriptors] = useState(false);
  const [faceDescriptorProgress, setFaceDescriptorProgress] = useState({ current: 0, total: 0, processed: 0, failed: 0 });
  const [faceDescriptorComplete, setFaceDescriptorComplete] = useState(false);

  const generateFaceDescriptors = async (membersWithPhotos) => {
    if (!membersWithPhotos || membersWithPhotos.length === 0) {
      console.log('[FaceDescriptor] No members with photos to process');
      setFaceDescriptorComplete(true);
      return;
    }

    console.log(`[FaceDescriptor] Processing ${membersWithPhotos.length} members with photos`);
    setGeneratingFaceDescriptors(true);
    setFaceDescriptorProgress({ current: 0, total: membersWithPhotos.length, processed: 0, failed: 0 });

    try {
      // Initialize face recognition service
      await faceRecognitionService.initialize();

      const updates = [];
      let processed = 0;
      let failed = 0;

      for (let i = 0; i < membersWithPhotos.length; i++) {
        const member = membersWithPhotos[i];
        setFaceDescriptorProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          // Get photo URL (prefer URL over base64)
          const photoUrl = member.photo_url || member.photo_base64;
          if (!photoUrl) {
            failed++;
            continue;
          }

          // Generate face descriptor
          const descriptor = await faceRecognitionService.generateDescriptorFromUrl(photoUrl);

          if (descriptor) {
            updates.push({
              member_id: member.id,
              descriptor: descriptor,
              source: 'import'
            });
            processed++;
          } else {
            console.log(`[FaceDescriptor] No face detected for ${member.full_name}`);
            failed++;
          }
        } catch (error) {
          console.error(`[FaceDescriptor] Error processing ${member.full_name}:`, error);
          failed++;
        }

        setFaceDescriptorProgress(prev => ({ ...prev, processed, failed }));
      }

      // Bulk update face descriptors
      if (updates.length > 0) {
        console.log(`[FaceDescriptor] Sending ${updates.length} descriptors to backend`);
        await importExportAPI.bulkUpdateFaceDescriptors(updates);
      }

      setFaceDescriptorProgress(prev => ({ ...prev, processed, failed }));
      console.log(`[FaceDescriptor] Complete: ${processed} processed, ${failed} failed`);
    } catch (error) {
      console.error('[FaceDescriptor] Error:', error);
    } finally {
      setGeneratingFaceDescriptors(false);
      setFaceDescriptorComplete(true);
    }
  };

  const executeImport = async () => {
    // Prevent double execution
    if (importStartedRef.current) {
      console.log('[DEBUG] Import already started, skipping');
      return;
    }

    importStartedRef.current = true;
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
        photo_session_id: wizardData.photoSimulation?.session_id || '',
        document_session_id: wizardData.documentSimulation?.session_id || '',
      });

      updateWizardData({ importResults: result });
      setImportComplete(true);

      // Start face descriptor generation if there are members with photos
      if (result.members_with_photos && result.members_with_photos.length > 0) {
        generateFaceDescriptors(result.members_with_photos);
      } else {
        setFaceDescriptorComplete(true);
      }
    } catch (error) {
      console.error('Import error:', error);
      importStartedRef.current = false;  // Reset on error so user can retry
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
    // eslint-disable-next-line
  }, []);

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

  // Show face descriptor generation progress
  if (importComplete && generatingFaceDescriptors) {
    const progressPercentage = faceDescriptorProgress.total > 0
      ? (faceDescriptorProgress.current / faceDescriptorProgress.total) * 100
      : 0;

    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <ScanFace className="h-16 w-16 text-blue-600 mx-auto animate-pulse" />
            <h3 className="text-xl font-semibold">{t('importExport.generatingFaceDescriptors') || 'Generating Face Descriptors'}</h3>
            <p className="text-gray-600">
              {t('importExport.processingMemberPhotos') || 'Processing member photos for face recognition...'}
            </p>
            <div className="max-w-md mx-auto space-y-2">
              <Progress value={progressPercentage} className="h-3" />
              <p className="text-sm text-gray-500">
                {faceDescriptorProgress.current} / {faceDescriptorProgress.total} {t('common.members') || 'members'}
              </p>
              <div className="flex justify-center gap-4 text-sm">
                <span className="text-green-600">
                  {faceDescriptorProgress.processed} {t('importExport.facesDetected') || 'faces detected'}
                </span>
                <span className="text-yellow-600">
                  {faceDescriptorProgress.failed} {t('importExport.noFaceFound') || 'no face found'}
                </span>
              </div>
            </div>
            <p className="text-xs text-gray-400">{t('importExport.pleaseDoNotClose')}</p>
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

          {/* Face Recognition Results */}
          {faceDescriptorComplete && faceDescriptorProgress.total > 0 && (
            <div className="border-t pt-6">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <ScanFace className="h-5 w-5" />
                {t('importExport.faceRecognitionResults') || 'Face Recognition Setup'}
              </h3>
              <div className="grid grid-cols-3 gap-4">
                <Card className="border-gray-300">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{t('importExport.photosProcessed') || 'Photos Processed'}</p>
                      <p className="text-2xl font-bold text-gray-700">{faceDescriptorProgress.total}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-green-400">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{t('importExport.facesDetected') || 'Faces Detected'}</p>
                      <p className="text-2xl font-bold text-green-600">{faceDescriptorProgress.processed}</p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-yellow-400">
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <p className="text-xs text-gray-500">{t('importExport.noFaceFound') || 'No Face Found'}</p>
                      <p className="text-2xl font-bold text-yellow-600">{faceDescriptorProgress.failed}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              {faceDescriptorProgress.processed > 0 && (
                <Alert className="mt-4 border-blue-500 bg-blue-50">
                  <ScanFace className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    {t('importExport.faceRecognitionEnabled') ||
                      `${faceDescriptorProgress.processed} members can now check in using face recognition at the kiosk.`}
                  </AlertDescription>
                </Alert>
              )}
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
