import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { X, Upload } from 'lucide-react';

export function CoverImageUploader({ group, onUpload, onRemove, isUploading }) {
  const { t } = useTranslation();
  const fileInputRef = React.useRef(null);

  const handleClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onUpload(file);
    e.target.value = '';
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    }
  };

  // Ensure cover_image has proper data URL prefix
  const getCoverImageSrc = () => {
    if (!group?.cover_image) return null;
    
    // If already has data URL prefix, use as-is
    if (group.cover_image.startsWith('data:')) {
      return group.cover_image;
    }
    
    // Otherwise, add the prefix (assume JPEG)
    return `data:image/jpeg;base64,${group.cover_image}`;
  };

  const coverImageSrc = getCoverImageSrc();

  return (
    <div className="space-y-2">
      <div className="w-full h-40 rounded-md border overflow-hidden bg-muted flex items-center justify-center relative">
        {group === undefined ? (
          <Skeleton className="w-full h-full" />
        ) : coverImageSrc ? (
          <>
            <img
              src={coverImageSrc}
              alt={group.name || 'Cover image'}
              className="w-full h-full object-cover"
            />
            {onRemove && (
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2"
                onClick={handleRemove}
                disabled={isUploading}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </>
        ) : (
          <div className="text-sm text-muted-foreground text-center px-4">
            {t('groups.form.noCoverImage') || 'No cover image yet.'}
          </div>
        )}
      </div>

      <div className="flex justify-between items-center">
        <div className="text-xs text-muted-foreground">
          {t('groups.form.coverImageHelper') ||
            'Recommended size: 1200x600px. JPG/PNG/WebP, max 3MB.'}
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleChange}
          />
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={handleClick} 
            disabled={isUploading}
          >
            {isUploading ? (
              t('common.loading')
            ) : coverImageSrc ? (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('groups.form.changeCover')}
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                {t('groups.form.uploadCover')}
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
