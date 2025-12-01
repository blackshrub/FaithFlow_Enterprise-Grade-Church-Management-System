import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Skeleton } from '../ui/skeleton';
import MemberAvatar from '../MemberAvatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';

export function JoinRequestsTable({
  requests,
  isLoading,
  onApprove,
  onReject,
}) {
  const { t } = useTranslation();
  const [confirmId, setConfirmId] = React.useState(null);

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
        {t('groups.joinRequests.emptyStates.noRequests')}
      </div>
    );
  }

  const pendingConfirm = requests.find((r) => r.id === confirmId);

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t('groups.joinRequests.table.member')}</TableHead>
            <TableHead>{t('groups.joinRequests.table.group')}</TableHead>
            <TableHead>{t('groups.joinRequests.table.submittedAt')}</TableHead>
            <TableHead>{t('groups.joinRequests.table.message')}</TableHead>
            <TableHead className="w-[160px] text-right">{t('groups.joinRequests.table.actions')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow key={r.id}>
              <TableCell>
                <div className="flex items-center space-x-2">
                  <MemberAvatar
                    member={r.member}
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
                {r.submitted_at
                  ? new Date(r.submitted_at).toLocaleString()
                  : '-'}
              </TableCell>
              <TableCell className="max-w-xs truncate" title={r.message || ''}>
                {r.message || '-'}
              </TableCell>
              <TableCell className="text-right space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmId(r.id)}
                >
                  {t('groups.joinRequests.actions.approve')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-destructive"
                  onClick={() => onReject(r)}
                >
                  {t('groups.joinRequests.actions.reject')}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <AlertDialog open={!!pendingConfirm} onOpenChange={() => setConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t('groups.joinRequests.confirmation.title')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          <p className="text-sm text-muted-foreground mt-2">
            {t('groups.joinRequests.confirmation.message')}
          </p>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pendingConfirm) {
                  onApprove(pendingConfirm);
                }
                setConfirmId(null);
              }}
            >
              {t('groups.joinRequests.confirmation.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
