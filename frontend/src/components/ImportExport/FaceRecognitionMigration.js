import React, { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import {
  ScanFace,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Users,
  Trash2
} from 'lucide-react';
import { useMembersNeedingFaceDescriptors, useMembersWithPhotos } from '../../hooks/useImportExport';
import { faceRecognitionService } from '../../services/faceRecognitionService';
import { importExportAPI } from '../../services/api';

export default function FaceRecognitionMigration() {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useMembersNeedingFaceDescriptors();
  const { data: allMembersData, refetch: refetchAll } = useMembersWithPhotos();

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [initializing, setInitializing] = useState(false); // Loading face-api models
  const [clearing, setClearing] = useState(false); // Clearing existing descriptors
  const [progress, setProgress] = useState({ current: 0, total: 0, processed: 0, failed: 0 });
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  // Filter members to only include those with actual photos (not empty strings)
  const membersToProcess = useMemo(() => {
    return (data?.members || []).filter(
      m => (m.photo_url && m.photo_url.trim() !== '') || (m.photo_base64 && m.photo_base64.trim() !== '')
    );
  }, [data?.members]);

  // All members with photos (for regeneration)
  const allMembersWithPhotos = useMemo(() => {
    return (allMembersData?.members || []).filter(
      m => (m.photo_url && m.photo_url.trim() !== '') || (m.photo_base64 && m.photo_base64.trim() !== '')
    );
  }, [allMembersData?.members]);

  const startMigration = useCallback(async () => {
    if (membersToProcess.length === 0) {
      setError('No members with photos to process');
      return;
    }

    setProcessing(true);
    setInitializing(true);
    setComplete(false);
    setError(null);
    setProgress({ current: 0, total: membersToProcess.length, processed: 0, failed: 0 });

    try {
      // Initialize face recognition service (can take several seconds to load models)
      console.log('[Migration] Initializing face recognition service...');
      const initResult = await faceRecognitionService.initialize();
      if (!initResult) {
        throw new Error('Failed to initialize face recognition service. Check browser console for details.');
      }
      console.log('[Migration] Face recognition service ready');
      setInitializing(false);

      const updates = [];
      let processed = 0;
      let failed = 0;
      const failedMembers = [];

      // Process members with proper isolation to prevent descriptor contamination
      // IMPORTANT: The Human library can cache results between detections, causing
      // similar embeddings for different faces. We add delays and cache invalidation.
      const BATCH_SIZE = 50;
      const DELAY_BETWEEN_DETECTIONS = 100; // ms - allow model to reset

      for (let i = 0; i < membersToProcess.length; i++) {
        const member = membersToProcess[i];
        setProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          // Get photo URL (prefer SeaweedFS URL over base64)
          const photoUrl = member.photo_url || member.photo_base64;

          console.log(`[Migration] Processing ${i + 1}/${membersToProcess.length}: ${member.full_name}`);

          // Add small delay between detections to allow model to reset
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_DETECTIONS));
          }

          // Generate face descriptor with quality checks enabled
          const result = await faceRecognitionService.generateDescriptorFromUrl(photoUrl, {
            minWidth: 150,
            minHeight: 150,
            minConfidence: 0.6,
            minFaceSize: 80,
            returnQuality: true  // Get quality metadata
          });

          if (result?.descriptor) {
            updates.push({
              member_id: member.id,
              descriptor: result.descriptor,
              source: 'migration',
              quality: result.quality  // Store quality metadata
            });
            processed++;
            console.log(`[Migration] ✓ Face detected for ${member.full_name} (confidence: ${result.quality?.confidence?.toFixed(2) || 'N/A'})`);
          } else {
            const reason = result?.quality?.reason || 'No face detected';
            console.warn(`[Migration] ✗ ${reason} for ${member.full_name}`);
            failedMembers.push({ name: member.full_name, reason });
            failed++;
          }
        } catch (err) {
          console.error(`[Migration] ✗ Error processing ${member.full_name}:`, err.message);
          failedMembers.push({ name: member.full_name, reason: err.message });
          failed++;
        }

        setProgress(prev => ({ ...prev, processed, failed }));

        // Send batch update every BATCH_SIZE members
        if (updates.length >= BATCH_SIZE) {
          console.log(`[Migration] Sending batch of ${updates.length} descriptors...`);
          await importExportAPI.bulkUpdateFaceDescriptors(updates);
          updates.length = 0; // Clear array

          // Extra delay after batch to allow memory cleanup
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      // Send remaining updates
      if (updates.length > 0) {
        console.log(`[Migration] Sending final batch of ${updates.length} descriptors...`);
        await importExportAPI.bulkUpdateFaceDescriptors(updates);
      }

      setProgress(prev => ({ ...prev, processed, failed }));
      setComplete(true);
      console.log(`[Migration] Complete: ${processed} processed, ${failed} failed`);

      // Log first 10 failures for debugging
      if (failedMembers.length > 0) {
        console.log('[Migration] First 10 failures:', failedMembers.slice(0, 10));
      }

      // Refresh data to update stats
      refetch();
      refetchAll();
    } catch (err) {
      console.error('[Migration] Error:', err);
      setError(err.message || 'Migration failed');
    } finally {
      setProcessing(false);
      setInitializing(false);
    }
  }, [membersToProcess, refetch, refetchAll]);

  // Regenerate all face descriptors (clear and re-run)
  const regenerateAll = useCallback(async () => {
    setShowRegenerateConfirm(false);

    if (allMembersWithPhotos.length === 0) {
      setError('No members with photos to regenerate');
      return;
    }

    setClearing(true);
    setProcessing(true);
    setComplete(false);
    setError(null);

    try {
      // Step 1: Clear all existing face descriptors
      console.log('[Regenerate] Clearing all face descriptors...');
      await importExportAPI.clearFaceDescriptors();
      console.log('[Regenerate] Face descriptors cleared');

      // Note: We don't refetch here to avoid component re-render during processing
      // The allMembersWithPhotos array was already captured before regeneration started

      setClearing(false);
      setInitializing(true);

      // Step 2: Initialize face recognition service
      console.log('[Regenerate] Initializing face recognition service...');
      const initResult = await faceRecognitionService.initialize();
      if (!initResult) {
        throw new Error('Failed to initialize face recognition service');
      }
      console.log('[Regenerate] Face recognition service ready');
      setInitializing(false);

      // Step 3: Process all members with photos
      setProgress({ current: 0, total: allMembersWithPhotos.length, processed: 0, failed: 0 });

      const updates = [];
      let processed = 0;
      let failed = 0;
      const failedMembers = [];
      const BATCH_SIZE = 50;
      const DELAY_BETWEEN_DETECTIONS = 100;

      for (let i = 0; i < allMembersWithPhotos.length; i++) {
        const member = allMembersWithPhotos[i];
        setProgress(prev => ({ ...prev, current: i + 1 }));

        try {
          const photoUrl = member.photo_url || member.photo_base64;
          console.log(`[Regenerate] Processing ${i + 1}/${allMembersWithPhotos.length}: ${member.full_name}`);

          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_DETECTIONS));
          }

          const result = await faceRecognitionService.generateDescriptorFromUrl(photoUrl, {
            minWidth: 150,
            minHeight: 150,
            minConfidence: 0.6,
            minFaceSize: 80,
            returnQuality: true
          });

          if (result?.descriptor) {
            updates.push({
              member_id: member.id,
              descriptor: result.descriptor,
              source: 'regeneration',
              quality: result.quality
            });
            processed++;
            console.log(`[Regenerate] ✓ Face detected for ${member.full_name}`);
          } else {
            const reason = result?.quality?.reason || 'No face detected';
            console.warn(`[Regenerate] ✗ ${reason} for ${member.full_name}`);
            failedMembers.push({ name: member.full_name, reason });
            failed++;
          }
        } catch (err) {
          console.error(`[Regenerate] ✗ Error for ${member.full_name}:`, err.message);
          failedMembers.push({ name: member.full_name, reason: err.message });
          failed++;
        }

        setProgress(prev => ({ ...prev, processed, failed }));

        if (updates.length >= BATCH_SIZE) {
          console.log(`[Regenerate] Sending batch of ${updates.length} descriptors...`);
          await importExportAPI.bulkUpdateFaceDescriptors(updates);
          updates.length = 0;
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      if (updates.length > 0) {
        console.log(`[Regenerate] Sending final batch of ${updates.length} descriptors...`);
        await importExportAPI.bulkUpdateFaceDescriptors(updates);
      }

      setProgress(prev => ({ ...prev, processed, failed }));
      setComplete(true);
      console.log(`[Regenerate] Complete: ${processed} processed, ${failed} failed`);

      if (failedMembers.length > 0) {
        console.log('[Regenerate] First 10 failures:', failedMembers.slice(0, 10));
      }

      refetch();
      refetchAll();
    } catch (err) {
      console.error('[Regenerate] Error:', err);
      setError(err.message || 'Regeneration failed');
    } finally {
      setClearing(false);
      setProcessing(false);
      setInitializing(false);
    }
  }, [allMembersWithPhotos, refetch, refetchAll]);

  if (isLoading) {
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

  const stats = data?.stats || { total_with_photos: 0, total_with_descriptors: 0, needing_descriptors: 0 };
  const progressPercentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanFace className="h-6 w-6" />
            {t('importExport.faceRecognitionMigration') || 'Face Recognition Migration'}
          </CardTitle>
          <CardDescription>
            {t('importExport.faceRecognitionMigrationDesc') ||
              'Generate face descriptors for existing members to enable face check-in at kiosk.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <Card className="border-gray-300">
              <CardContent className="pt-4">
                <div className="text-center">
                  <Users className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">{t('importExport.membersWithPhotos') || 'Members with Photos'}</p>
                  <p className="text-2xl font-bold">{stats.total_with_photos}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-green-400">
              <CardContent className="pt-4">
                <div className="text-center">
                  <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">{t('importExport.faceRecognitionReady') || 'Face Recognition Ready'}</p>
                  <p className="text-2xl font-bold text-green-600">{stats.total_with_descriptors}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-yellow-400">
              <CardContent className="pt-4">
                <div className="text-center">
                  <AlertCircle className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-500">{t('importExport.needingMigration') || 'Needing Migration'}</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.needing_descriptors}</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Status Messages */}
          {stats.needing_descriptors === 0 && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t('importExport.allMembersMigrated') ||
                  'All members with photos have face descriptors. Face check-in is ready!'}
              </AlertDescription>
            </Alert>
          )}

          {stats.needing_descriptors > 0 && !processing && !complete && (
            <Alert className="mb-6 border-yellow-500 bg-yellow-50">
              <AlertCircle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                {t('importExport.migrationNeeded', { count: stats.needing_descriptors }) ||
                  `${stats.needing_descriptors} members have photos but no face descriptors. Run migration to enable face check-in.`}
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert className="mb-6 border-red-500 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {/* Processing Progress */}
          {processing && (
            <div className="mb-6 space-y-4">
              {initializing ? (
                /* Initializing face recognition models */
                <div className="py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    <span className="font-medium">
                      {t('importExport.loadingFaceModels') || 'Loading face recognition models...'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500">
                    {t('importExport.loadingFaceModelsDesc') || 'This may take a few seconds on first load.'}
                  </p>
                </div>
              ) : (
                /* Processing members */
                <>
                  <div className="flex items-center gap-2">
                    <ScanFace className="h-5 w-5 text-blue-600 animate-pulse" />
                    <span className="font-medium">
                      {t('importExport.processingPhotos') || 'Processing member photos...'}
                    </span>
                  </div>
                  <Progress value={progressPercentage} className="h-3" />
                  <div className="flex justify-between text-sm text-gray-500">
                    <span>{progress.current} / {progress.total} {t('common.members') || 'members'}</span>
                    <div className="flex gap-4">
                      <span className="text-green-600">{progress.processed} {t('importExport.detected') || 'detected'}</span>
                      <span className="text-yellow-600">{progress.failed} {t('importExport.noFace') || 'no face'}</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Complete Message */}
          {complete && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {t('importExport.migrationComplete', { processed: progress.processed, failed: progress.failed }) ||
                  `Migration complete! ${progress.processed} faces detected, ${progress.failed} photos had no detectable face.`}
              </AlertDescription>
            </Alert>
          )}

          {/* Clearing Progress */}
          {clearing && (
            <div className="mb-6 py-4">
              <div className="flex items-center gap-2 mb-3">
                <Loader2 className="h-5 w-5 text-red-600 animate-spin" />
                <span className="font-medium text-red-600">
                  {t('importExport.clearingDescriptors') || 'Clearing existing face descriptors...'}
                </span>
              </div>
            </div>
          )}

          {/* Regenerate Confirmation Dialog */}
          {showRegenerateConfirm && (
            <Alert className="mb-6 border-red-500 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                <p className="font-medium mb-2">
                  {t('importExport.regenerateWarning') ||
                    `This will clear ALL ${stats.total_with_descriptors} existing face descriptors and regenerate from photos.`}
                </p>
                <p className="text-sm mb-4">
                  {t('importExport.regenerateWarningDesc') ||
                    'This may take several minutes. Face check-in will be unavailable until complete.'}
                </p>
                <div className="flex gap-2">
                  <Button variant="destructive" size="sm" onClick={regenerateAll}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('importExport.confirmRegenerate') || 'Yes, Regenerate All'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowRegenerateConfirm(false)}>
                    {t('common.cancel')}
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-4">
            {stats.needing_descriptors > 0 && !processing && (
              <Button onClick={startMigration} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                {t('importExport.startMigration') || 'Start Migration'}
              </Button>
            )}

            {/* Regenerate All button - always visible when there are descriptors */}
            {stats.total_with_descriptors > 0 && !processing && (
              <Button
                variant="destructive"
                onClick={() => setShowRegenerateConfirm(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t('importExport.regenerateAll') || 'Regenerate All Descriptors'}
              </Button>
            )}

            <Button variant="outline" onClick={() => { refetch(); refetchAll(); }} disabled={processing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members Preview */}
      {membersToProcess.length > 0 && !processing && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {t('importExport.membersToProcess') || 'Members to Process'} ({membersToProcess.length})
            </CardTitle>
            <CardDescription>
              {t('importExport.membersPreviewDesc') || 'Preview of members that will have face descriptors generated.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {membersToProcess.slice(0, 20).map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 p-2 border rounded-lg"
                  >
                    {(member.photo_url || member.photo_base64) && (
                      <img
                        src={member.photo_url || member.photo_base64}
                        alt={member.full_name}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{member.full_name}</p>
                    </div>
                  </div>
                ))}
              </div>
              {membersToProcess.length > 20 && (
                <p className="text-center text-sm text-gray-500 mt-4">
                  {t('importExport.andMoreMembers', { count: membersToProcess.length - 20 }) ||
                    `...and ${membersToProcess.length - 20} more members`}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
