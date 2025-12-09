import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Heart, Phone, Calendar, ArrowLeft, MoreHorizontal, Check, MessageCircle, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '../../components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useRequestsListByType, useMarkContacted, useMarkCompleted, useDeleteRequest } from '../../hooks/useRequestForms';
import { useToast } from '../../hooks/use-toast';
import RequestFilters from './components/RequestFilters';
import RequestStatusBadge from './components/RequestStatusBadge';
import MemberAvatar from '../../components/MemberAvatar';
import { format, parseISO } from 'date-fns';

const AcceptJesusList = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isIndonesian = i18n.language === 'id';

  const [filters, setFilters] = useState({
    search: '',
    status: 'all',
  });

  const { data: response, isLoading, error } = useRequestsListByType('accept_jesus', {
    search: filters.search || undefined,
    status: filters.status !== 'all' ? filters.status : undefined,
  });

  const markContactedMutation = useMarkContacted();
  const markCompletedMutation = useMarkCompleted();
  const deleteRequestMutation = useDeleteRequest();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);

  const requests = response?.data || [];

  const handleMarkContacted = async (e, id) => {
    e.stopPropagation();
    try {
      await markContactedMutation.mutateAsync({ id });
      toast({ title: t('requestForms.markedContacted', 'Marked as contacted') });
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: error.response?.data?.detail || t('requestForms.failedToUpdate', 'Failed to update'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkCompleted = async (e, id) => {
    e.stopPropagation();
    try {
      await markCompletedMutation.mutateAsync({ id });
      toast({ title: t('requestForms.markedCompleted', 'Marked as completed') });
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: error.response?.data?.detail || t('requestForms.failedToUpdate', 'Failed to update'),
        variant: 'destructive',
      });
    }
  };

  const handleDeleteClick = (e, request) => {
    e.stopPropagation();
    setRequestToDelete(request);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!requestToDelete) return;
    try {
      await deleteRequestMutation.mutateAsync({ id: requestToDelete.id, hardDelete: true });
      setDeleteDialogOpen(false);
      setRequestToDelete(null);
      toast({ title: t('requestForms.deleted', 'Request deleted') });
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: error.response?.data?.detail || t('requestForms.failedToDelete', 'Failed to delete'),
        variant: 'destructive',
      });
    }
  };

  const getCommitmentTypeLabel = (type) => {
    const labels = {
      first_time: isIndonesian ? 'Pertama Kali' : 'First Time',
      recommitment: isIndonesian ? 'Komitmen Ulang' : 'Recommitment',
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/request-forms')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-50">
              <Heart className="h-5 w-5 text-rose-500" />
            </div>
            <h1 className="text-2xl font-bold">
              {isIndonesian ? 'Terima Yesus' : 'Accept Jesus'}
            </h1>
          </div>
          <p className="text-gray-500 mt-1">
            {t('requestForms.acceptJesusSubtitle', 'Salvation decisions and recommitments')}
          </p>
        </div>
      </div>

      {/* Filters */}
      <RequestFilters
        search={filters.search}
        onSearchChange={(value) => setFilters((prev) => ({ ...prev, search: value }))}
        status={filters.status}
        onStatusChange={(value) => setFilters((prev) => ({ ...prev, status: value }))}
        onClearFilters={() => setFilters({ search: '', status: 'all' })}
      />

      {/* List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {t('requestForms.requests', 'Requests')} ({requests.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              {t('common.loading', 'Loading...')}
            </div>
          ) : error ? (
            <div className="text-center py-8 text-red-500">
              {t('common.errorLoading', 'Error loading data')}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('requestForms.noRequests', 'No requests found')}
            </div>
          ) : (
            <div className="space-y-3">
              {requests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/request-forms/accept-jesus/${request.id}`)}
                >
                  <div className="flex items-center gap-3">
                    <MemberAvatar
                      name={request.full_name}
                      photo={request.member_photo}
                      size="md"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{request.full_name}</span>
                        <RequestStatusBadge status={request.status} isIndonesian={isIndonesian} />
                        {request.accept_jesus_data?.commitment_type && (
                          <Badge variant="outline" className="text-xs">
                            {getCommitmentTypeLabel(request.accept_jesus_data.commitment_type)}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
                        {request.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {request.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(request.created_at), 'MMM dd, yyyy')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {request.status === 'new' && (
                        <DropdownMenuItem onClick={(e) => handleMarkContacted(e, request.id)}>
                          <MessageCircle className="h-4 w-4 mr-2" />
                          {t('requestForms.markContacted', 'Mark as Contacted')}
                        </DropdownMenuItem>
                      )}
                      {(request.status === 'contacted' || request.status === 'new') && (
                        <DropdownMenuItem onClick={(e) => handleMarkCompleted(e, request.id)}>
                          <Check className="h-4 w-4 mr-2" />
                          {t('requestForms.markCompleted', 'Mark as Completed')}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={(e) => handleDeleteClick(e, request)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {t('common.delete', 'Delete')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('requestForms.deleteRequest', 'Delete Request')}</DialogTitle>
            <DialogDescription>
              {t('requestForms.deleteConfirmation', 'Are you sure you want to delete this request? This action cannot be undone.')}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setRequestToDelete(null);
              }}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={deleteRequestMutation.isPending}
            >
              {deleteRequestMutation.isPending
                ? t('common.deleting', 'Deleting...')
                : t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcceptJesusList;
