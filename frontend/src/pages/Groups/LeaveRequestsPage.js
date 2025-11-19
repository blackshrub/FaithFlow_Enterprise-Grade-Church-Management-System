import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLeaveRequests, useApproveLeaveRequest } from '../../hooks/useGroups';
import { LeaveRequestsTable } from '../../components/Groups/LeaveRequestsTable';
import { useToast } from '../../hooks/use-toast';

export default function LeaveRequestsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: requests, isLoading } = useLeaveRequests();
  const approveMutation = useApproveLeaveRequest();

  const handleApprove = async (membership) => {
    try {
      await approveMutation.mutateAsync(membership.id);
      toast({
        title: t('common.success'),
        description: t('groups.leaveRequests.messages.approveSuccess'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('groups.leaveRequests.messages.approveError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('groups.leaveRequests.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('groups.leaveRequests.subtitle')}
        </p>
      </div>

      <LeaveRequestsTable
        requests={requests || []}
        isLoading={isLoading}
        onApprove={handleApprove}
      />
    </div>
  );
}
