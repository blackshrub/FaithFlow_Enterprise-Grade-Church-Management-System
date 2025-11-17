import React, { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useUploadDocuments } from '../../hooks/useImportExport';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function DocumentUploadPanel() {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [uploadResults, setUploadResults] = useState(null);
  const uploadDocuments = useUploadDocuments();

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const result = await uploadDocuments.mutateAsync(file);
      setUploadResults(result);
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{t('importExport.uploadDocuments')}</CardTitle>
          <CardDescription>{t('importExport.uploadDocumentsDesc')}</CardDescription>
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
            
            {uploadDocuments.isPending ? (
              <div>
                <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">{t('importExport.processingDocuments')}</p>
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
              <strong>{t('importExport.acceptedDocumentFormats')}:</strong> PDF, DOC, DOCX, TXT, JPG, JPEG, PNG, GIF, BMP
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {uploadResults && (
        <Card>
          <CardHeader>
            <CardTitle>{t('importExport.uploadResults')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
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

            {uploadResults.matched.length > 0 && (
              <Alert className="border-green-500 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {t('importExport.documentsMatchedSuccess', { count: uploadResults.matched.length })}
                </AlertDescription>
              </Alert>
            )}

            {uploadResults.unmatched_files.length > 0 && (
              <div>
                <h3 className="font-semibold mb-3 text-orange-600">
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
          </CardContent>
        </Card>
      )}
    </div>
  );
}
