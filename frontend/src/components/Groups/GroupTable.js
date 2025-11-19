import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Skeleton } from '../ui/skeleton';

const categoryLabelKey = {
  cell_group: 'groups.categories.cellGroup',
  ministry_team: 'groups.categories.ministryTeam',
  activity: 'groups.categories.activityGroup',
  support_group: 'groups.categories.supportGroup',
};

export function GroupTable({
  groups,
  isLoading,
  onEdit,
  onViewMembers,
  onDelete,
  churchSettings,
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(5)].map((_, i) => (
          <Skeleton key={i} className="h-12 w-full" />
        ))}
      </div>
    );
  }

  if (!groups?.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-10">
        {t('groups.emptyStates.noGroups')}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {groups.map((group) => (
        <Card key={group.id} className="flex flex-col overflow-hidden">
          <div className="w-full h-32 bg-muted relative overflow-hidden">
            {group.cover_image ? (
              <img
                src={group.cover_image}
                alt={group.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-semibold text-muted-foreground">
                {group.name?.charAt(0) || '?'}
              </div>
            )}
          </div>

          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center justify-between gap-2">
              <span className="truncate" title={group.name}>{group.name}</span>
              <Badge variant="outline">
                {t(categoryLabelKey[group.category] || group.category)}
              </Badge>
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0 pb-2 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('groups.table.leader')}:</span>
              <span className="font-medium truncate max-w-[60%] text-right">
                {group.leader_name || t('groups.table.noLeader')}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t('groups.table.membersCount')}:</span>
              <span className="font-medium">{group.members_count ?? 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">{t('groups.table.openForJoin')}:</span>
              {group.is_open_for_join ? (
                <Badge variant="success">{t('groups.status.open')}</Badge>
              ) : (
                <Badge variant="secondary">{t('groups.status.closed')}</Badge>
              )}
            </div>
          </CardContent>

          <CardFooter className="mt-auto flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => onViewMembers(group)}>
              {t('groups.actions.viewMembers')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => onEdit(group)}>
              {t('common.edit')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive"
              onClick={() => onDelete(group)}
            >
              {t('common.delete')}
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
}
