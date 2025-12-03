/**
 * Communities List Page
 *
 * Main page for viewing and managing communities (formerly "Groups").
 * Uses the new communities API and hooks.
 */
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useCommunities, useDeleteCommunity } from '../../hooks/useCommunities';
import { CommunityTable } from '../../components/Communities/CommunityTable';
import { useChurchSettings } from '../../hooks/useSettings';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useNavigate } from 'react-router-dom';
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

export default function CommunitiesListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: churchSettings } = useChurchSettings();
  const [search, setSearch] = React.useState('');
  const [category, setCategory] = React.useState('all');
  const [openFilter, setOpenFilter] = React.useState('all');
  const [communityToDelete, setCommunityToDelete] = React.useState(null);

  const deleteCommunityMutation = useDeleteCommunity();

  const { data, isLoading } = useCommunities({
    search: search || undefined,
    category: category !== 'all' ? category : undefined,
    is_open_for_join:
      openFilter === 'open' ? true : openFilter === 'closed' ? false : undefined,
  });

  const communities = data?.data || [];

  // i18n fallback keys (uses 'communities.*' with fallback to 'groups.*')
  const tWithFallback = (key) => {
    const communityKey = key.replace('groups.', 'communities.');
    const translated = t(communityKey);
    // If not found, fall back to groups translation
    return translated === communityKey ? t(key) : translated;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {tWithFallback('communities.title') || t('groups.title')}
          </h1>
          <p className="text-muted-foreground text-sm">
            {tWithFallback('communities.subtitle') || t('groups.subtitle')}
          </p>
        </div>
        <Button onClick={() => navigate('/communities/new')}>
          {tWithFallback('communities.actions.create') || t('groups.actions.create')}
        </Button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 md:items-center">
        <div className="flex-1">
          <Input
            id="communities-search"
            name="communities-search"
            aria-label={tWithFallback('communities.filters.searchPlaceholder') || t('groups.filters.searchPlaceholder')}
            placeholder={tWithFallback('communities.filters.searchPlaceholder') || t('groups.filters.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Select value={category} onValueChange={setCategory} name="communities-category">
            <SelectTrigger className="w-[180px]" id="communities-category" aria-label={tWithFallback('communities.filters.categoryPlaceholder') || t('groups.filters.categoryPlaceholder')}>
              <SelectValue placeholder={tWithFallback('communities.filters.categoryPlaceholder') || t('groups.filters.categoryPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tWithFallback('communities.filters.allCategories') || t('groups.filters.allCategories')}</SelectItem>
              <SelectItem value="cell_group">
                {churchSettings?.group_categories?.cell_group || tWithFallback('communities.categories.cellGroup') || t('groups.categories.cellGroup')}
              </SelectItem>
              <SelectItem value="ministry_team">
                {churchSettings?.group_categories?.ministry_team || tWithFallback('communities.categories.ministryTeam') || t('groups.categories.ministryTeam')}
              </SelectItem>
              <SelectItem value="activity">
                {churchSettings?.group_categories?.activity || tWithFallback('communities.categories.activityGroup') || t('groups.categories.activityGroup')}
              </SelectItem>
              <SelectItem value="support_group">
                {churchSettings?.group_categories?.support_group || tWithFallback('communities.categories.supportGroup') || t('groups.categories.supportGroup')}
              </SelectItem>
            </SelectContent>
          </Select>

          <Select value={openFilter} onValueChange={setOpenFilter} name="communities-open-status">
            <SelectTrigger className="w-[180px]" id="communities-open-status" aria-label={tWithFallback('communities.filters.openStatusPlaceholder') || t('groups.filters.openStatusPlaceholder')}>
              <SelectValue placeholder={tWithFallback('communities.filters.openStatusPlaceholder') || t('groups.filters.openStatusPlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{tWithFallback('communities.filters.openStatus.all') || t('groups.filters.openStatus.all')}</SelectItem>
              <SelectItem value="open">{tWithFallback('communities.filters.openStatus.open') || t('groups.filters.openStatus.open')}</SelectItem>
              <SelectItem value="closed">{tWithFallback('communities.filters.openStatus.closed') || t('groups.filters.openStatus.closed')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <CommunityTable
        communities={communities}
        isLoading={isLoading}
        onEdit={(community) => navigate(`/communities/${community.id}/edit`)}
        onViewMembers={(community) => navigate(`/communities/${community.id}/members`)}
        onDelete={(community) => setCommunityToDelete(community)}
        churchSettings={churchSettings}
      />

      <AlertDialog open={!!communityToDelete} onOpenChange={(open) => !open && setCommunityToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{tWithFallback('communities.delete.confirmTitle') || t('groups.delete.confirmTitle') || 'Delete community?'}</AlertDialogTitle>
            <AlertDialogDescription>
              {tWithFallback('communities.delete.confirmDescription', {
                communityName: communityToDelete?.name ?? '',
              }) ||
                t('groups.delete.confirmDescription', {
                  groupName: communityToDelete?.name ?? '',
                }) ||
                'This action cannot be undone. The community will be deleted if there are no active members.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteCommunityMutation.isPending}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteCommunityMutation.isPending}
              onClick={async () => {
                if (!communityToDelete) return;
                try {
                  await deleteCommunityMutation.mutateAsync(communityToDelete.id);
                  toast({
                    title: t('common.success'),
                    description: tWithFallback('communities.messages.deleteSuccess') || t('groups.messages.deleteSuccess'),
                  });
                  setCommunityToDelete(null);
                } catch (error) {
                  console.error('Community Delete Error:', error);
                  const message =
                    error?.response?.data?.detail?.message ||
                    error?.response?.data?.detail ||
                    tWithFallback('communities.messages.deleteError') || t('groups.messages.deleteError');
                  toast({
                    title: t('common.error'),
                    description: message,
                    variant: 'destructive',
                  });
                  setCommunityToDelete(null);
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
