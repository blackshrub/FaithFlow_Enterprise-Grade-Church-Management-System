import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Progress } from '../ui/progress';
import {
  ScanFace,
  Loader2,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Play,
  Users,
  Trash2,
  Server
} from 'lucide-react';
import { useMembersNeedingFaceDescriptors, useMembersWithPhotos } from '../../hooks/useImportExport';
import { faceRecognitionAPI, importExportAPI } from '../../services/api';

/**
 * Face Recognition Migration Component
 *
 * Uses InsightFace backend with ArcFace model for face descriptor generation.
 * ArcFace provides 512D embeddings with state-of-the-art accuracy (better than FaceNet512).
 * Uses ONNX Runtime - no TensorFlow dependency.
 *
 * Features:
 * - Generate face descriptors for members without them
 * - Regenerate all descriptors (clear and re-run)
 * - Backend processing (no browser resource usage)
 */
export default function FaceRecognitionMigration() {
  const { t } = useTranslation();
  const { data, isLoading, refetch } = useMembersNeedingFaceDescriptors();
  const { data: allMembersData, refetch: refetchAll } = useMembersWithPhotos();

  // Processing state
  const [processing, setProcessing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [progress, setProgress] = useState({ total: 0, message: '' });
  const [complete, setComplete] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);
  const previousDescriptorCount = useRef(0);

  // Auto-poll stats while processing is happening in background
  useEffect(() => {
    if (isPolling) {
      // Start polling every 3 seconds
      pollingIntervalRef.current = setInterval(() => {
        refetch();
        refetchAll();
      }, 3000);

      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
        }
      };
    }
  }, [isPolling, refetch, refetchAll]);

  // Stop polling when processing is complete (no more needing descriptors and count stable)
  useEffect(() => {
    if (isPolling && data?.stats) {
      const currentCount = data.stats.total_with_descriptors;

      // If we have descriptors and the count hasn't changed in last poll, processing is done
      if (data.stats.needing_descriptors === 0 && currentCount === previousDescriptorCount.current && currentCount > 0) {
        console.log('[Migration] Processing complete - stopping polling');
        setIsPolling(false);
        setProcessing(false);
        setComplete(true);
      }

      previousDescriptorCount.current = currentCount;
    }
  }, [isPolling, data?.stats]);

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

  // Start migration - only process members without face descriptors
  const startMigration = useCallback(async () => {
    if (membersToProcess.length === 0) {
      setError('No members with photos to process');
      return;
    }

    setProcessing(true);
    setComplete(false);
    setError(null);
    setResult(null);
    setProgress({ total: membersToProcess.length, message: 'Starting backend face recognition...' });

    try {
      // Get member IDs to process
      const memberIds = membersToProcess.map(m => m.id);

      console.log(`[Migration] Starting InsightFace regeneration for ${memberIds.length} members...`);
      setProgress({ total: memberIds.length, message: 'Processing with InsightFace (ArcFace)...' });

      // Call backend regenerate API (only for specified members, don't clear existing)
      const response = await faceRecognitionAPI.regenerateDescriptors(memberIds, false);
      const regenerateResult = response.data;

      console.log('[Migration] Backend result:', regenerateResult);

      setResult(regenerateResult);
      // Don't set complete here - let polling detect when it's done
      // Start polling to watch progress
      setIsPolling(true);

      // Refresh data to update stats
      refetch();
      refetchAll();
    } catch (err) {
      console.error('[Migration] Error:', err);
      setError(err.response?.data?.detail || err.message || 'Migration failed');
      setProcessing(false);
    }
    // Don't setProcessing(false) here - let polling handle it
  }, [membersToProcess, refetch, refetchAll]);

  // Regenerate all face descriptors (clear and re-run with DeepFace)
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
    setResult(null);
    setProgress({ total: allMembersWithPhotos.length, message: 'Clearing existing descriptors...' });

    try {
      // Step 1: Clear all existing face descriptors
      console.log('[Regenerate] Clearing all face descriptors...');
      await importExportAPI.clearFaceDescriptors();
      console.log('[Regenerate] Face descriptors cleared');
      setClearing(false);

      // Step 2: Regenerate using InsightFace backend (all members with photos)
      setProgress({ total: allMembersWithPhotos.length, message: 'Processing with InsightFace (ArcFace)...' });

      console.log(`[Regenerate] Starting InsightFace regeneration for ${allMembersWithPhotos.length} members...`);

      // Call backend regenerate API (all members, already cleared)
      const response = await faceRecognitionAPI.regenerateDescriptors(null, false);
      const regenerateResult = response.data;

      console.log('[Regenerate] Backend result:', regenerateResult);

      setResult(regenerateResult);
      // Don't set complete here - let polling detect when it's done
      // Start polling to watch progress
      setIsPolling(true);

      // Refresh data to update stats
      refetch();
      refetchAll();
    } catch (err) {
      console.error('[Regenerate] Error:', err);
      setError(err.response?.data?.detail || err.message || 'Regeneration failed');
      setClearing(false);
      setProcessing(false);
    }
    // Don't setProcessing(false) or setClearing(false) here - let polling handle it
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

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ScanFace className="h-6 w-6" />
            {t('importExport.faceRecognitionMigration') || 'Face Recognition Migration'}
          </CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Server className="h-4 w-4 text-blue-500" />
            {t('importExport.faceRecognitionMigrationDesc') ||
              'Generate face descriptors using InsightFace (ArcFace) backend for highly accurate face check-in.'}
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

          {/* InsightFace Info Banner */}
          <Alert className="mb-6 border-blue-500 bg-blue-50">
            <Server className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>InsightFace Backend:</strong> Uses ArcFace model (buffalo_l) with 512D embeddings for state-of-the-art face recognition accuracy.
              Processing happens on the server using ONNX Runtime.
            </AlertDescription>
          </Alert>

          {/* Status Messages */}
          {stats.needing_descriptors === 0 && !processing && (
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
              <div className="py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                  <span className="font-medium">
                    {clearing ? 'Clearing existing descriptors...' : 'Processing with InsightFace (ArcFace)...'}
                  </span>
                </div>
                <Progress
                  value={stats.total_with_photos > 0 ? (stats.total_with_descriptors / stats.total_with_photos) * 100 : 0}
                  className="h-3"
                />
                <p className="text-sm text-gray-500 mt-2">
                  {stats.total_with_descriptors} / {stats.total_with_photos} members processed
                  ({stats.total_with_photos > 0 ? Math.round((stats.total_with_descriptors / stats.total_with_photos) * 100) : 0}%)
                  {isPolling && <span className="ml-2 text-blue-500">(auto-refreshing every 3s)</span>}
                </p>
              </div>
            </div>
          )}

          {/* Complete Message */}
          {complete && (
            <Alert className="mb-6 border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <p className="font-medium mb-2">Migration complete!</p>
                <p>
                  {stats.total_with_descriptors} members now have face descriptors.
                  Face check-in is ready to use!
                </p>
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
                    `This will clear ALL ${stats.total_with_descriptors} existing face descriptors and regenerate from photos using InsightFace.`}
                </p>
                <p className="text-sm mb-4">
                  {t('importExport.regenerateWarningDesc') ||
                    'This is recommended when switching from browser-based face recognition to InsightFace backend.'}
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

            {/* Regenerate All button - always visible when there are descriptors or photos */}
            {(stats.total_with_descriptors > 0 || stats.total_with_photos > 0) && !processing && (
              <Button
                variant="destructive"
                onClick={() => setShowRegenerateConfirm(true)}
                className="flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                {t('importExport.regenerateAll') || 'Regenerate All (InsightFace)'}
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
              {t('importExport.membersPreviewDesc') || 'Preview of members that will have face descriptors generated using InsightFace.'}
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
