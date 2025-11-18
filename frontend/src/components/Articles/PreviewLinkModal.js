import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useToast } from '../../hooks/use-toast';

const PreviewLinkModal = ({ open, onOpenChange, previewUrl }) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  const fullUrl = previewUrl ? `${window.location.origin}${previewUrl}` : '';

  const handleCopy = () => {
    navigator.clipboard.writeText(fullUrl);
    toast({
      title: t('common.success'),
      description: t('articles.linkCopied')
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('articles.previewLink')}</DialogTitle>
          <DialogDescription>{t('articles.sharePreview')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <Input value={fullUrl} readOnly className="flex-1" />
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <Copy className="w-4 h-4" />
            </Button>
          </div>

          <a
            href={fullUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center text-sm text-blue-600 hover:underline"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            {t('articles.preview')}
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PreviewLinkModal;
