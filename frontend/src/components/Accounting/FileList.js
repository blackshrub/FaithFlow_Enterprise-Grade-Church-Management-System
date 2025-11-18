import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFilesByReference, useDeleteFile } from '../../hooks/useAccounting';
import { Download, FileText, Trash2, Image } from 'lucide-react';
import { Button } from '../ui/button';
import { useToast } from '../../hooks/use-toast';
import * as accountingApi from '../../services/accountingApi';

const FileList = ({ referenceType, referenceId }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: files, isLoading } = useFilesByReference(referenceType, referenceId);
  const deleteFileMutation = useDeleteFile();

  const handleDownload = async (fileId, filename) => {
    try {
      const response = await accountingApi.downloadFile(fileId);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: error.message
      });
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm(t('accounting.files.deleteFile') + '?')) return;
    
    try {
      await deleteFileMutation.mutateAsync(fileId);
      toast({
        title: t('accounting.common.success'),
        description: t('accounting.files.deleteFile')
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('accounting.common.error'),
        description: error.message
      });
    }
  };

  if (isLoading) return <div className="text-sm text-gray-500">{t('accounting.common.loading')}</div>;

  if (!files || files.length === 0) {
    return <div className="text-sm text-gray-500">{t('accounting.files.noFiles')}</div>;
  }

  return (
    <div className="space-y-2">
      {files.map((file) => {
        const isImage = file.mime_type?.startsWith('image/');
        const isPDF = file.mime_type === 'application/pdf';
        
        return (
          <div key={file.id} className="flex items-center justify-between p-2 border rounded-lg">
            <div className="flex items-center space-x-3">
              {isImage && <Image className="w-4 h-4 text-blue-500" />}
              {isPDF && <FileText className="w-4 h-4 text-red-500" />}
              {!isImage && !isPDF && <FileText className="w-4 h-4 text-gray-500" />}
              <div>
                <p className="text-sm font-medium">{file.original_filename}</p>
                <p className="text-xs text-gray-500">
                  {(file.file_size / 1024).toFixed(1)} KB
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDownload(file.id, file.original_filename)}
              >
                <Download className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(file.id)}
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default FileList;
