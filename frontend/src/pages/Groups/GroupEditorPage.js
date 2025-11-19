import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGroup, useCreateGroup, useUpdateGroup } from '../../hooks/useGroups';
import { GroupForm } from '../../components/Groups/GroupForm';
import { CoverImageUploader } from '../../components/Groups/CoverImageUploader';
import { useToast } from '../../hooks/use-toast';

export default function GroupEditorPage() {
  const { id } = useParams();
  const isEdit = !!id;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const { data: group, isLoading } = useGroup(id);
  const createMutation = useCreateGroup();
  const updateMutation = useUpdateGroup();

  const handleSubmit = async (values) => {
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id, data: { ...values } });
        toast({
          title: t('common.success'),
          description: t('groups.messages.updateSuccess'),
        });
      } else {
        await createMutation.mutateAsync(values);
        toast({
          title: t('common.success'),
          description: t('groups.messages.createSuccess'),
        });
      }
      navigate('/groups');
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('groups.messages.saveError'),
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
            {isEdit ? t('groups.editor.editTitle') : t('groups.editor.createTitle')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('groups.editor.subtitle')}
          </p>
        </div>
      </div>

      <GroupForm
        initialData={group}
        onSubmit={handleSubmit}
        onCancel={() => navigate('/groups')}
        isSaving={createMutation.isLoading || updateMutation.isLoading}
      />
    </div>
  );
}
