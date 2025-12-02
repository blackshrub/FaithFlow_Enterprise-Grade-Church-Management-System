/**
 * Community Editor Page
 *
 * Create and edit communities (formerly "Groups").
 */
import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCommunity, useCreateCommunity, useUpdateCommunity } from '../../hooks/useCommunities';
import { CommunityForm } from '../../components/Communities/CommunityForm';
import { CommunityCoverUploader } from '../../components/Communities/CommunityCoverUploader';
import { useToast } from '../../hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

export default function CommunityEditorPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: community, isLoading } = useCommunity(id);
  const createMutation = useCreateCommunity();
  const updateMutation = useUpdateCommunity();

  // i18n fallback (communities.* -> groups.*)
  const tWithFallback = (key) => {
    const communityKey = key.replace('groups.', 'communities.');
    const translated = t(communityKey);
    return translated === communityKey ? t(key) : translated;
  };

  const handleSubmit = async (values) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: { ...values } });
        toast({
          title: t('common.success'),
          description: tWithFallback('communities.messages.updateSuccess') || t('groups.messages.updateSuccess'),
        });
      } else {
        await createMutation.mutateAsync(values);
        toast({
          title: t('common.success'),
          description: tWithFallback('communities.messages.createSuccess') || t('groups.messages.createSuccess'),
        });
      }
      navigate('/communities');
    } catch (error) {
      toast({
        title: t('common.error'),
        description: tWithFallback('communities.messages.saveError') || t('groups.messages.saveError'),
        variant: 'destructive',
      });
    }
  };

  if (isEdit && isLoading) {
    return <div className="text-sm text-muted-foreground">{t('common.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {isEdit
              ? tWithFallback('communities.editor.editTitle') || t('groups.editor.editTitle')
              : tWithFallback('communities.editor.createTitle') || t('groups.editor.createTitle')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {tWithFallback('communities.editor.subtitle') || t('groups.editor.subtitle')}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2">
          <CommunityForm
            initialData={community}
            onSubmit={handleSubmit}
            onCancel={() => navigate('/communities')}
            isSaving={createMutation.isPending || updateMutation.isPending}
          />
        </div>
        <div className="lg:col-span-1 space-y-4">
          {isEdit && (
            <CommunityCoverUploader
              community={community}
              onUpload={async (file) => {
                try {
                  const { uploadCommunityCover } = await import('../../services/communitiesApi');
                  await uploadCommunityCover(id, file);
                  // Invalidate community query so cover_image is refreshed
                  queryClient.invalidateQueries({ queryKey: ['community'], exact: false });
                } catch (error) {
                  console.error('Failed to upload cover image', error);
                  toast({
                    title: t('common.error'),
                    description: tWithFallback('communities.messages.saveError') || t('groups.messages.saveError'),
                    variant: 'destructive',
                  });
                }
              }}
              onRemove={async () => {
                try {
                  const { updateCommunity } = await import('../../services/communitiesApi');
                  await updateCommunity(id, { cover_image: null });
                  queryClient.invalidateQueries({ queryKey: ['community'], exact: false });
                  toast({
                    description: tWithFallback('communities.messages.coverRemoved') || t('groups.messages.coverRemoved') || 'Cover image removed',
                  });
                } catch (error) {
                  console.error('Failed to remove cover image', error);
                  toast({
                    title: t('common.error'),
                    description: tWithFallback('communities.messages.saveError') || t('groups.messages.saveError'),
                    variant: 'destructive',
                  });
                }
              }}
              isUploading={false}
            />
          )}
        </div>
      </div>
    </div>
  );
}
