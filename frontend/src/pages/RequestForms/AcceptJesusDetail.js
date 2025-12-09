import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  ArrowLeft,
  Phone,
  Mail,
  Calendar,
  Clock,
  User,
  MessageCircle,
  Check,
  BookOpen,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { useRequest, useMarkContacted, useMarkCompleted, useUpdateRequest, useDeleteRequest } from '../../hooks/useRequestForms';
import { useToast } from '../../hooks/use-toast';
import RequestStatusBadge from './components/RequestStatusBadge';
import LinkedMemberCard from './components/LinkedMemberCard';
import MemberAvatar from '../../components/MemberAvatar';
import { format, parseISO } from 'date-fns';

const AcceptJesusDetail = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isIndonesian = i18n.language === 'id';

  const [notesDialog, setNotesDialog] = useState({ open: false, type: null });
  const [notes, setNotes] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: request, isLoading, error } = useRequest(id);
  const markContactedMutation = useMarkContacted();
  const markCompletedMutation = useMarkCompleted();
  const updateRequestMutation = useUpdateRequest();
  const deleteRequestMutation = useDeleteRequest();

  const handleMarkContacted = async () => {
    try {
      await markContactedMutation.mutateAsync({ id, notes: notes || undefined });
      setNotesDialog({ open: false, type: null });
      setNotes('');
      toast({ title: t('requestForms.markedContacted', 'Marked as contacted') });
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: error.response?.data?.detail || t('requestForms.failedToUpdate', 'Failed to update'),
        variant: 'destructive',
      });
    }
  };

  const handleMarkCompleted = async () => {
    try {
      await markCompletedMutation.mutateAsync({ id, notes: notes || undefined });
      setNotesDialog({ open: false, type: null });
      setNotes('');
      toast({ title: t('requestForms.markedCompleted', 'Marked as completed') });
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: error.response?.data?.detail || t('requestForms.failedToUpdate', 'Failed to update'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteRequestMutation.mutateAsync({ id, hardDelete: true });
      setDeleteDialogOpen(false);
      toast({ title: t('requestForms.deleted', 'Request deleted') });
      navigate('/request-forms/accept-jesus');
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
      first_time: isIndonesian ? 'Pertama Kali' : 'First Time Decision',
      recommitment: isIndonesian ? 'Komitmen Ulang' : 'Recommitment',
    };
    return labels[type] || type;
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-gray-500">
          {t('common.loading', 'Loading...')}
        </div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="p-6">
        <div className="text-center py-12 text-red-500">
          {t('requestForms.notFound', 'Request not found')}
        </div>
      </div>
    );
  }

  const acceptJesusData = request.accept_jesus_data || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/request-forms/accept-jesus')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <MemberAvatar name={request.full_name} photo={request.member_photo} size="lg" />
            <div>
              <h1 className="text-2xl font-bold">{request.full_name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <RequestStatusBadge status={request.status} isIndonesian={isIndonesian} />
                {acceptJesusData.commitment_type && (
                  <Badge variant="outline" className="bg-rose-50 text-rose-700">
                    {getCommitmentTypeLabel(acceptJesusData.commitment_type)}
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          {request.status === 'new' && (
            <Button
              onClick={() => setNotesDialog({ open: true, type: 'contacted' })}
              disabled={markContactedMutation.isPending}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              {t('requestForms.markContacted', 'Mark Contacted')}
            </Button>
          )}
          {(request.status === 'new' || request.status === 'contacted') && (
            <Button
              variant="default"
              className="bg-green-600 hover:bg-green-700"
              onClick={() => setNotesDialog({ open: true, type: 'completed' })}
              disabled={markCompletedMutation.isPending}
            >
              <Check className="h-4 w-4 mr-2" />
              {t('requestForms.markCompleted', 'Mark Completed')}
            </Button>
          )}
          <Button
            variant="outline"
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleteRequestMutation.isPending}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            {t('common.delete', 'Delete')}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('requestForms.contactInfo', 'Contact Information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <Phone className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('requestForms.phone', 'Phone')}</p>
                    <p className="font-medium">{request.phone || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <Mail className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('requestForms.email', 'Email')}</p>
                    <p className="font-medium">{request.email || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <Calendar className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('requestForms.submittedOn', 'Submitted On')}</p>
                    <p className="font-medium">
                      {format(parseISO(request.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <User className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">{t('requestForms.source', 'Source')}</p>
                    <p className="font-medium capitalize">{request.source || 'kiosk'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prayer Read Confirmation */}
          {acceptJesusData.prayer_read !== undefined && (
            <Card className={acceptJesusData.prayer_read ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${acceptJesusData.prayer_read ? 'bg-green-100' : 'bg-yellow-100'}`}>
                    <BookOpen className={`h-5 w-5 ${acceptJesusData.prayer_read ? 'text-green-600' : 'text-yellow-600'}`} />
                  </div>
                  <div>
                    <p className="font-medium">
                      {acceptJesusData.prayer_read
                        ? t('requestForms.prayerConfirmed', 'Prayer Read & Confirmed')
                        : t('requestForms.prayerNotConfirmed', 'Prayer Not Yet Confirmed')}
                    </p>
                    <p className="text-sm text-gray-600">
                      {acceptJesusData.prayer_read
                        ? t('requestForms.prayerConfirmedDesc', 'The person has read and prayed the salvation prayer')
                        : t('requestForms.prayerNotConfirmedDesc', 'Follow up to confirm their decision')}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Guided Prayer Text */}
          {acceptJesusData.guided_prayer_text && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Heart className="h-5 w-5 text-rose-500" />
                  {t('requestForms.guidedPrayer', 'Guided Prayer Used')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-gray-50 rounded-lg p-4 text-gray-700 whitespace-pre-wrap leading-relaxed">
                  {acceptJesusData.guided_prayer_text}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Notes */}
          {request.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {t('requestForms.notes', 'Notes')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{request.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Linked Member */}
          {request.member_id && (
            <LinkedMemberCard
              member={{
                member_id: request.member_id,
                full_name: request.full_name,
                phone: request.phone,
                email: request.email,
                photo_url: request.member_photo,
              }}
              title={t('requestForms.linkedMember', 'Linked Member')}
              onViewMember={() => navigate(`/members?search=${request.phone}`)}
            />
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {t('requestForms.timeline', 'Timeline')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-blue-100">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">
                      {t('requestForms.submitted', 'Submitted')}
                    </p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(request.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>

                {request.status !== 'new' && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-yellow-100">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t('requestForms.contacted', 'Contacted')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.updated_at && format(parseISO(request.updated_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                )}

                {request.status === 'completed' && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-green-100">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {t('requestForms.completed', 'Completed')}
                      </p>
                      <p className="text-xs text-gray-500">
                        {request.updated_at && format(parseISO(request.updated_at), 'MMM dd, yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assigned Staff */}
          {request.assigned_to_user_id && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {t('requestForms.assignedTo', 'Assigned To')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <MemberAvatar name={request.assigned_to_name || 'Staff'} size="sm" />
                  <span className="text-sm">{request.assigned_to_name || 'Staff Member'}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialog.open} onOpenChange={(open) => !open && setNotesDialog({ open: false, type: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {notesDialog.type === 'contacted'
                ? t('requestForms.markAsContacted', 'Mark as Contacted')
                : t('requestForms.markAsCompleted', 'Mark as Completed')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Textarea
              placeholder={t('requestForms.notesPlaceholder', 'Add notes (optional)...')}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog({ open: false, type: null })}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={notesDialog.type === 'contacted' ? handleMarkContacted : handleMarkCompleted}
              disabled={markContactedMutation.isPending || markCompletedMutation.isPending}
            >
              {t('common.confirm', 'Confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('requestForms.deleteRequest', 'Delete Request')}</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-gray-600">
              {t('requestForms.deleteConfirmation', 'Are you sure you want to delete this request? This action cannot be undone.')}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteRequestMutation.isPending}
            >
              {deleteRequestMutation.isPending ? t('common.deleting', 'Deleting...') : t('common.delete', 'Delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AcceptJesusDetail;
