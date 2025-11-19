import React from 'react';
import { useTranslation } from 'react-i18next';
import { useJoinRequests, useApproveJoinRequest, useRejectJoinRequest } from '../../hooks/useGroups';
import { JoinRequestsTable } from '../../components/Groups/JoinRequestsTable';
import { useToast } from '../../hooks/use-toast';

export default function JoinRequestsPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: requests, isLoading } = useJoinRequests({ status: 'pending' });
  const approveMutation = useApproveJoinRequest();
  const rejectMutation = useRejectJoinRequest();

  const handleApprove = async (request) => {
    try {
      await approveMutation.mutateAsync(request.id);
      toast({
        title: t('common.success'),
        description: t('groups.joinRequests.messages.approveSuccess'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('groups.joinRequests.messages.approveError'),
        variant: 'destructive',
      });
    }
  };

  const handleReject = async (request) => {
    try {
      await rejectMutation.mutateAsync(request.id);
      toast({
        title: t('common.success'),
        description: t('groups.joinRequests.messages.rejectSuccess'),
      });
    } catch (error) {
      toast({
        title: t('common.error'),
        description: t('groups.joinRequests.messages.rejectError'),
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">
          {t('groups.joinRequests.title')}
        </h1>
        <p className="text-muted-foreground text-sm">
          {t('groups.joinRequests.subtitle')}
        </p>
      </div>

      <JoinRequestsTable
        requests={requests || []}
        isLoading={isLoading}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}
