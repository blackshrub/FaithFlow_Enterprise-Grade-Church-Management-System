import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

export function CoverImageUploader({ group, onUpload, isUploading }) {
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

  return (
    <div className="space-y-2">
      <div className="w-full h-40 rounded-md border overflow-hidden bg-muted flex items-center justify-center">
        {group === undefined ? (
          <Skeleton className="w-full h-full" />
        ) : group?.cover_image ? (
          <img
            src={group.cover_image}
            alt={group.name}
            className="w-full h-full object-cover"
          />
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
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            className="hidden"
            onChange={handleChange}
          />
          <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={isUploading}>
            {isUploading ? t('common.loading') : t('groups.form.uploadCover') || 'Upload Cover'}
          </Button>
        </div>
      </div>
    </div>
  );
}
