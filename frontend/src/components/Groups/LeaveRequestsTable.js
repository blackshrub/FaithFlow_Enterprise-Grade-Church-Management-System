import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import MemberAvatar from '../MemberAvatar';

export function LeaveRequestsTable({
  requests,
  isLoading,
  onApprove,
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

  if (!requests?.length) {
    return (
      <div className="text-center text-sm text-muted-foreground py-8">
        {t('groups.leaveRequests.emptyStates.noRequests')}
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t('groups.leaveRequests.table.member')}</TableHead>
          <TableHead>{t('groups.leaveRequests.table.group')}</TableHead>
          <TableHead>{t('groups.leaveRequests.table.joinedAt')}</TableHead>
          <TableHead>{t('groups.leaveRequests.table.reason')}</TableHead>
          <TableHead className="w-[140px] text-right">{t('groups.leaveRequests.table.actions')}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.map((r) => (
          <TableRow key={r.id}>
            <TableCell>
              <div className="flex items-center space-x-2">
                <MemberAvatar
                  name={r.member?.full_name}
                  photoBase64={r.member?.photo_base64}
                />
                <div>
                  <div className="font-medium">{r.member?.full_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.member?.phone_whatsapp}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>{r.group?.name}</TableCell>
            <TableCell>
              {r.joined_at ? new Date(r.joined_at).toLocaleDateString() : '-'}
            </TableCell>
            <TableCell className="max-w-xs truncate" title={r.leave_reason || ''}>
              {r.leave_reason || '-'}
            </TableCell>
            <TableCell className="text-right">
              <Button size="sm" onClick={() => onApprove(r)}>
                {t('groups.leaveRequests.actions.approve')}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
