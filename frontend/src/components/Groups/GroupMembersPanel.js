import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '../ui/badge';
import MemberAvatar from '../MemberAvatar';

const statusLabelKey = {
  active: 'groups.members.statuses.active',
  pending_leave: 'groups.members.statuses.pendingLeave',
  removed: 'groups.members.statuses.removed',
};

export function GroupMembersPanel({
  members,
  isLoading,
  onAddMember,
  onRemoveMember,
}) {
  const { t } = useTranslation();

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">
          {t('groups.members.title')} ({members?.length || 0})
        </h3>
        <Button size="sm" onClick={onAddMember}>
          {t('groups.members.actions.addMember')}
        </Button>
      </div>

      {!members?.length ? (
        <div className="text-sm text-muted-foreground text-center py-8">
          {t('groups.members.emptyStates.noMembers')}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t('groups.members.table.member')}</TableHead>
              <TableHead>{t('groups.members.table.contact')}</TableHead>
              <TableHead>{t('groups.members.table.joinedAt')}</TableHead>
              <TableHead>{t('groups.members.table.status')}</TableHead>
              <TableHead className="w-[120px] text-right">{t('groups.members.table.actions')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <MemberAvatar
                      name={m.member?.full_name}
                      photoBase64={m.member?.photo_base64}
                    />
                    <div>
                      <div className="font-medium">{m.member?.full_name}</div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>{m.member?.phone_whatsapp}</TableCell>
                <TableCell>
                  {m.joined_at
                    ? new Date(m.joined_at).toLocaleDateString()
                    : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    {t(statusLabelKey[m.status] || m.status)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  {m.status === 'active' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive"
                      onClick={() => onRemoveMember(m)}
                    >
                      {t('groups.members.actions.remove')}
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
