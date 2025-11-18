import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X } from 'lucide-react';
import { Button } from '../ui/button';
import { useUploadFile } from '../../hooks/useAccounting';
import { useToast } from '../../hooks/use-toast';

const FileUpload = ({ referenceType, referenceId, onUploadSuccess, multiple = false }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const uploadFileMutation = useUploadFile();

  const handleFileSelect = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    
    for (const file of files) {
      // Validate size
      if (file.size > 10 * 1024 * 1024) {
        toast({
          variant: "destructive",
          title: t('accounting.files.uploadError'),
          description: t('errors.FILE_SIZE_EXCEEDED')
        });
        continue;
      }

      try {
        await uploadFileMutation.mutateAsync({
          file,
          referenceType,
          referenceId
        });
        
        toast({
          title: t('accounting.files.uploadSuccess'),
          description: file.name
        });
        
        if (onUploadSuccess) {
          onUploadSuccess();
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: t('accounting.files.uploadError'),
          description: error.response?.data?.detail?.message || error.message
        });
      }
    }
    
    // Reset input
    e.target.value = '';
  }, [referenceType, referenceId, uploadFileMutation, toast, t, onUploadSuccess]);

  return (
    <div className="space-y-2">
      <label className="block">
        <input
          type="file"
          multiple={multiple}
          onChange={handleFileSelect}
          className="hidden"
          accept="image/*,.pdf,.xlsx,.xls,.csv"
        />
        <Button type="button" variant="outline" size="sm" asChild>
          <span className="cursor-pointer">
            <Upload className="w-4 h-4 mr-2" />
            {t('accounting.files.uploadFile')}
          </span>
        </Button>
      </label>
      <p className="text-xs text-gray-500">
        {t('accounting.files.maxSize')} • {t('accounting.files.allowedFormats')}
      </p>
    </div>
  );
};

export default FileUpload;
