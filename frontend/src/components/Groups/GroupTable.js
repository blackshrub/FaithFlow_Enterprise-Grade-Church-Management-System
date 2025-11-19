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
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('groups.table.name')}</TableHead>
          <TableHead>{t('groups.table.category')}</TableHead>
          <TableHead>{t('groups.table.leader')}</TableHead>
          <TableHead>{t('groups.table.membersCount')}</TableHead>
          <TableHead>{t('groups.table.openForJoin')}</TableHead>
          <TableHead className="w-[160px] text-right">{t('groups.table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {groups.map((group) => (
          <TableRow key={group.id}>
            <TableCell className="font-medium">{group.name}</TableCell>
            <TableCell>
              <Badge variant="outline">
                {t(categoryLabelKey[group.category] || group.category)}
              </Badge>
            </TableCell>
            <TableCell>{group.leader_name}</TableCell>
            <TableCell>{group.members_count ?? 0}</TableCell>
            <TableCell>
              {group.is_open_for_join ? (
                <Badge variant="success">{t('groups.status.open')}</Badge>
              ) : (
                <Badge variant="secondary">{t('groups.status.closed')}</Badge>
              )}
            </TableCell>
            <TableCell className="text-right space-x-2">
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
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
