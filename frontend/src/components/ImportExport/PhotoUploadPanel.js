import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUploadPhotos } from '../../hooks/useImportExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Upload, Image, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function PhotoUploadPanel() {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploadResults, setUploadResults] = useState(null);
  const uploadPhotos = useUploadPhotos();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadPhotos.mutateAsync(file);
      setUploadResults(result);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('importExport.uploadPhotos')}</CardTitle>
          <CardDescription>{t('importExport.uploadPhotosDesc')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Upload Area */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept=".zip,.rar"
              onChange={handleFileSelect}
              className="hidden"
            />
            
            {uploadPhotos.isPending ? (
              <div>
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">{t('importExport.processingPhotos')}</p>
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

          {/* Instructions */}
          <Alert>
            <AlertDescription>
              <strong>{t('importExport.howItWorks')}:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1">
                <li>{t('importExport.photoStep1')}</li>
                <li>{t('importExport.photoStep2')}</li>
                <li>{t('importExport.photoStep3')}</li>
                <li>{t('importExport.photoStep4')}</li>
              </ol>
            </AlertDescription>
          </Alert>

          <Alert variant="info">
            <AlertDescription>
              <strong>{t('importExport.acceptedPhotoFormats')}:</strong> JPG, JPEG, PNG, GIF, BMP, WEBP
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Upload Results */}
      {uploadResults && (
        <Card>
          <CardHeader>
            <CardTitle>{t('importExport.uploadResults')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-600">{t('importExport.totalFiles')}</p>
                  <p className="text-2xl font-bold">{uploadResults.summary.total_files}</p>
                </CardContent>
              </Card>
              <Card className="border-green-500">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-600">{t('importExport.matched')}</p>
                  <p className="text-2xl font-bold text-green-600">{uploadResults.summary.matched_count}</p>
                </CardContent>
              </Card>
              <Card className="border-orange-500">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-600">{t('importExport.unmatchedFiles')}</p>
                  <p className="text-2xl font-bold text-orange-600">{uploadResults.summary.unmatched_files_count}</p>
                </CardContent>
              </Card>
              <Card className="border-red-500">
                <CardContent className="pt-6 text-center">
                  <p className="text-sm text-gray-600">{t('importExport.unmatchedMembers')}</p>
                  <p className="text-2xl font-bold text-red-600">{uploadResults.summary.unmatched_members_count}</p>
                </CardContent>
              </Card>
            </div>

            {/* Matched Files */}
            {uploadResults.matched.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-green-600">
                  <CheckCircle className="inline h-4 w-4 mr-1" />
                  {t('importExport.matchedPhotos')} ({uploadResults.matched.length})
                </h3>
                <div className="max-h-48 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('importExport.filename')}</TableHead>
                        <TableHead>{t('importExport.memberID')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {uploadResults.matched.map((match, idx) => (
                        <TableRow key={idx}>
                          <TableCell>{match.filename}</TableCell>
                          <TableCell><Badge variant="secondary">{match.member_id}</Badge></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Unmatched Files */}
            {uploadResults.unmatched_files.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-orange-600">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  {t('importExport.unmatchedFiles')} ({uploadResults.unmatched_files.length})
                </h3>
                <div className="border border-orange-200 rounded-lg p-4 max-h-48 overflow-y-auto bg-orange-50">
                  <ul className="space-y-1">
                    {uploadResults.unmatched_files.map((file, idx) => (
                      <li key={idx} className="text-sm text-orange-700">
                        • {file.filename} - {file.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {/* Unmatched Members */}
            {uploadResults.unmatched_members.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-red-600">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  {t('importExport.membersWithoutPhotos')} ({uploadResults.unmatched_members.length})
                </h3>
                <div className="border border-red-200 rounded-lg p-4 max-h-48 overflow-y-auto bg-red-50">
                  <ul className="space-y-1">
                    {uploadResults.unmatched_members.map((member, idx) => (
                      <li key={idx} className="text-sm text-red-700">
                        • {member.member_name} - Looking for: {member.filename}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
