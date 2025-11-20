import React from 'react';
import { useTranslation } from 'react-i18next';
import { useGroups } from '../../hooks/useGroups';
import { GroupTable } from '../../components/Groups/GroupTable';
import { useChurchSettings } from '../../hooks/useSettings';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useNavigate } from 'react-router-dom';
import { useDeleteGroup } from '../../hooks/useGroups';
import { useToast } from '../../hooks/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';

export default function GroupsListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: churchSettings } = useChurchSettings();
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('all');
  const [openFilter, setOpenFilter] = React.useState('all');
  const [groupToDelete, setGroupToDelete] = React.useState(null);

  const deleteGroupMutation = useDeleteGroup();

  const { data, isLoading } = useGroups({
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
    is_open_for_join:
      openFilter === 'open' ? true : openFilter === 'closed' ? false : undefined,
  });

  const groups = data?.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {t('groups.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {t('groups.subtitle')}
          </p>
        </div>
        <Button onClick={() => navigate('/groups/new')}>
          {t('groups.actions.create')}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex-1">
          <Input
            placeholder={t('groups.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('groups.filters.categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('groups.filters.allCategories')}</SelectItem>
              <SelectItem value="cell_group">
                {churchSettings?.group_categories?.cell_group || t('groups.categories.cellGroup')}
              </SelectItem>
              <SelectItem value="ministry_team">
                {churchSettings?.group_categories?.ministry_team || t('groups.categories.ministryTeam')}
              </SelectItem>
              <SelectItem value="activity">
                {churchSettings?.group_categories?.activity || t('groups.categories.activityGroup')}
              </SelectItem>
              <SelectItem value="support_group">
                {churchSettings?.group_categories?.support_group || t('groups.categories.supportGroup')}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={openFilter} onValueChange={setOpenFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t('groups.filters.openStatusPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('groups.filters.openStatus.all')}</SelectItem>
              <SelectItem value="open">{t('groups.filters.openStatus.open')}</SelectItem>
              <SelectItem value="closed">{t('groups.filters.openStatus.closed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <GroupTable
        groups={groups}
        isLoading={isLoading}
        onEdit={(group) => navigate(`/groups/${group.id}/edit`)}
        onViewMembers={(group) => navigate(`/groups/${group.id}/members`)}
        onDelete={(group) => setGroupToDelete(group)}
        churchSettings={churchSettings}
      />

      <AlertDialog open={!!groupToDelete} onOpenChange={(open) => !open && setGroupToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('groups.delete.confirmTitle') || 'Delete group?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('groups.delete.confirmDescription', {
                groupName: groupToDelete?.name ?? '',
              }) ||
                'This action cannot be undone. The group will be deleted if there are no active members.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteGroupMutation.isLoading}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteGroupMutation.isLoading}
              onClick={async () => {
                if (!groupToDelete) return;
                try {
                  await deleteGroupMutation.mutateAsync(groupToDelete.id);
                  toast({
                    title: t('common.success'),
                    description: t('groups.messages.deleteSuccess'),
                  });
                  setGroupToDelete(null);
                } catch (error) {
                  console.error('❌ Group Delete Error:', error);
                  console.error('   Response:', error.response?.data);
                  const message =
                    error?.response?.data?.detail?.message || 
                    error?.response?.data?.detail ||
                    t('groups.messages.deleteError');
                  console.log('   Error message to show:', message);
                  toast({
                    title: t('common.error'),
                    description: message,
                    variant: 'destructive',
                  });
                  setGroupToDelete(null);
                }
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
