import React, { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { useUploadFeaturedImage } from '../../hooks/useArticles';
import { useToast } from '../../hooks/use-toast';

const FeaturedImageUpload = ({ articleId, currentImage, onUploadSuccess }) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const uploadMutation = useUploadFeaturedImage();

  const handleFileSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size
    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: "destructive",
        title: t('articles.validation.imageTooLarge'),
        description: t('articles.validation.imageTooLarge')
      });
      return;
    }

    // Validate type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: t('articles.validation.invalidImageType')
      });
      return;
    }

    try {
      const response = await uploadMutation.mutateAsync({ id: articleId, file });
      
      toast({
        title: t('common.success'),
        description: t('articles.messages.imageUploadSuccess')
      });
      
      if (onUploadSuccess) {
        onUploadSuccess(response.data.image_url);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: t('common.error'),
        description: error.message
      });
    }
    
    e.target.value = '';
  }, [articleId, uploadMutation, toast, t, onUploadSuccess]);

  return (
    <div className="space-y-3">
      <Label>{t('articles.featuredImage')}</Label>
      
      {currentImage ? (
        <div className="relative">
          <img
            src={currentImage}
            alt="Featured"
            className="w-full h-48 object-cover rounded-lg border"
          />
          <Button
            variant="destructive"
            size="sm"
            className="absolute top-2 right-2"
            onClick={() => onUploadSuccess?.(null)}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <label className="block">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 transition-colors">
            <ImageIcon className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-sm text-gray-600">{t('common.upload')}</p>
            <p className="text-xs text-gray-500 mt-1">Max 5MB • JPG, PNG, WEBP</p>
          </div>
        </label>
      )}
    </div>
  );
};

export default FeaturedImageUpload;
