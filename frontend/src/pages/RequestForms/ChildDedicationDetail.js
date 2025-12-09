import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Baby,
  ArrowLeft,
  Phone,
  Calendar,
  User,
  MessageCircle,
  Check,
  CalendarDays,
  ImageIcon,
  Trash2,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../../components/ui/dialog';
import { useRequest, useMarkContacted, useMarkScheduled, useMarkCompleted, useDeleteRequest } from '../../hooks/useRequestForms';
import { useToast } from '../../hooks/use-toast';
import RequestStatusBadge from './components/RequestStatusBadge';
import LinkedMemberCard from './components/LinkedMemberCard';
import MemberAvatar from '../../components/MemberAvatar';
import { format, parseISO, differenceInMonths, differenceInYears } from 'date-fns';

const ChildDedicationDetail = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isIndonesian = i18n.language === 'id';

  const [notesDialog, setNotesDialog] = useState({ open: false, type: null });
  const [notes, setNotes] = useState('');
  const [scheduleData, setScheduleData] = useState({ date: '', notes: '' });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: request, isLoading, error } = useRequest(id);
  const markContactedMutation = useMarkContacted();
  const markScheduledMutation = useMarkScheduled();
  const markCompletedMutation = useMarkCompleted();
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

  const handleMarkScheduled = async () => {
    if (!scheduleData.date) {
      toast({
        title: t('common.error', 'Error'),
        description: t('requestForms.dateRequired', 'Please select a date'),
        variant: 'destructive',
      });
      return;
    }
    try {
      await markScheduledMutation.mutateAsync({
        id,
        scheduledDate: scheduleData.date,
        notes: scheduleData.notes || undefined,
      });
      setNotesDialog({ open: false, type: null });
      setScheduleData({ date: '', notes: '' });
      toast({ title: t('requestForms.markedScheduled', 'Dedication scheduled') });
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
      navigate('/request-forms/child-dedication');
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: error.response?.data?.detail || t('requestForms.failedToDelete', 'Failed to delete'),
        variant: 'destructive',
      });
    }
  };

  const getChildAge = (birthDate) => {
    if (!birthDate) return null;
    const birth = parseISO(birthDate);
    const years = differenceInYears(new Date(), birth);
    const months = differenceInMonths(new Date(), birth) % 12;

    if (years > 0) {
      return isIndonesian
        ? `${years} tahun ${months} bulan`
        : `${years} year${years > 1 ? 's' : ''} ${months} month${months !== 1 ? 's' : ''}`;
    }
    return isIndonesian ? `${months} bulan` : `${months} month${months !== 1 ? 's' : ''}`;
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

  const dedicationData = request.child_dedication_data || {};
  const father = dedicationData.father || {};
  const mother = dedicationData.mother || {};
  const child = dedicationData.child || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/request-forms/child-dedication')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <MemberAvatar name={child.name || 'Child'} photo={child.photo_url} size="lg" />
            <div>
              <h1 className="text-2xl font-bold">{child.name || t('requestForms.child', 'Child')}</h1>
              <div className="flex items-center gap-2 mt-1">
                <RequestStatusBadge status={request.status} isIndonesian={isIndonesian} />
                {child.birth_date && (
                  <Badge variant="outline" className="bg-pink-50 text-pink-700">
                    {getChildAge(child.birth_date)}
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
          {(request.status === 'contacted' || request.status === 'new') && (
            <Button
              variant="outline"
              onClick={() => setNotesDialog({ open: true, type: 'scheduled' })}
              disabled={markScheduledMutation.isPending}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              {t('requestForms.scheduleDedication', 'Schedule Dedication')}
            </Button>
          )}
          {request.status === 'scheduled' && (
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
          {/* Child Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Baby className="h-5 w-5 text-pink-500" />
                {t('requestForms.childInfo', 'Child Information')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-6">
                {/* Child Photo */}
                <div className="flex-shrink-0">
                  {child.photo_url ? (
                    <img
                      src={child.photo_url}
                      alt={child.name}
                      className="w-32 h-32 rounded-xl object-cover border-2 border-pink-100"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center border-2 border-gray-200">
                      <ImageIcon className="h-8 w-8 text-gray-400" />
                    </div>
                  )}
                </div>

                {/* Child Details */}
                <div className="flex-1 space-y-3">
                  <div>
                    <p className="text-sm text-gray-500">{t('requestForms.childName', "Child's Name")}</p>
                    <p className="font-medium text-lg">{child.name || '-'}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500">{t('requestForms.birthDate', 'Birth Date')}</p>
                      <p className="font-medium">
                        {child.birth_date ? format(parseISO(child.birth_date), 'MMMM dd, yyyy') : '-'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('requestForms.age', 'Age')}</p>
                      <p className="font-medium">{getChildAge(child.birth_date) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{t('requestForms.gender', 'Gender')}</p>
                      <p className="font-medium capitalize">{child.gender || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Parents Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Father */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  {t('requestForms.father', 'Father')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <MemberAvatar name={father.name} photo={father.photo_url} size="md" />
                  <div>
                    <p className="font-medium">{father.name || '-'}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone className="h-3 w-3" />
                      <span>{father.phone || '-'}</span>
                    </div>
                  </div>
                </div>
                {father.is_baptized !== undefined && (
                  <Badge variant={father.is_baptized ? 'default' : 'secondary'} className="text-xs">
                    {father.is_baptized
                      ? t('requestForms.baptized', 'Baptized')
                      : t('requestForms.notBaptized', 'Not Baptized')}
                  </Badge>
                )}
              </CardContent>
            </Card>

            {/* Mother */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-pink-500" />
                  {t('requestForms.mother', 'Mother')}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <MemberAvatar name={mother.name} photo={mother.photo_url} size="md" />
                  <div>
                    <p className="font-medium">{mother.name || '-'}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Phone className="h-3 w-3" />
                      <span>{mother.phone || '-'}</span>
                    </div>
                  </div>
                </div>
                {mother.is_baptized !== undefined && (
                  <Badge variant={mother.is_baptized ? 'default' : 'secondary'} className="text-xs">
                    {mother.is_baptized
                      ? t('requestForms.baptized', 'Baptized')
                      : t('requestForms.notBaptized', 'Not Baptized')}
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes */}
          {request.notes && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">{t('requestForms.notes', 'Notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 whitespace-pre-wrap">{request.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Submitted By */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">{t('requestForms.submittedBy', 'Submitted By')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <MemberAvatar name={request.full_name} photo={request.member_photo} size="md" />
                <div>
                  <p className="font-medium">{request.full_name}</p>
                  <p className="text-sm text-gray-500">{request.phone}</p>
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {format(parseISO(request.created_at), 'MMM dd, yyyy HH:mm')}
              </p>
            </CardContent>
          </Card>

          {/* Schedule Info */}
          {dedicationData.scheduled_date && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-green-600" />
                  {t('requestForms.scheduledDate', 'Scheduled Date')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium text-green-700">
                  {format(parseISO(dedicationData.scheduled_date), 'EEEE, MMMM dd, yyyy')}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('requestForms.timeline', 'Timeline')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-full bg-blue-100">
                    <div className="h-2 w-2 rounded-full bg-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{t('requestForms.submitted', 'Submitted')}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(request.created_at), 'MMM dd, yyyy HH:mm')}
                    </p>
                  </div>
                </div>

                {(request.status === 'contacted' || request.status === 'scheduled' || request.status === 'completed') && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-yellow-100">
                      <div className="h-2 w-2 rounded-full bg-yellow-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('requestForms.contacted', 'Contacted')}</p>
                    </div>
                  </div>
                )}

                {(request.status === 'scheduled' || request.status === 'completed') && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-purple-100">
                      <div className="h-2 w-2 rounded-full bg-purple-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('requestForms.scheduled', 'Scheduled')}</p>
                      {dedicationData.scheduled_date && (
                        <p className="text-xs text-gray-500">
                          {format(parseISO(dedicationData.scheduled_date), 'MMM dd, yyyy')}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {request.status === 'completed' && (
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 rounded-full bg-green-100">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('requestForms.completed', 'Dedicated')}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Notes Dialog */}
      <Dialog open={notesDialog.open && notesDialog.type !== 'scheduled'} onOpenChange={(open) => !open && setNotesDialog({ open: false, type: null })}>
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

      {/* Schedule Dialog */}
      <Dialog open={notesDialog.open && notesDialog.type === 'scheduled'} onOpenChange={(open) => !open && setNotesDialog({ open: false, type: null })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('requestForms.scheduleDedication', 'Schedule Dedication')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('requestForms.dedicationDate', 'Dedication Date')} *</Label>
              <Input
                type="date"
                value={scheduleData.date}
                onChange={(e) => setScheduleData((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('requestForms.notes', 'Notes')}</Label>
              <Textarea
                placeholder={t('requestForms.notesPlaceholder', 'Add notes (optional)...')}
                value={scheduleData.notes}
                onChange={(e) => setScheduleData((prev) => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNotesDialog({ open: false, type: null })}>
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleMarkScheduled} disabled={markScheduledMutation.isPending}>
              {t('requestForms.schedule', 'Schedule')}
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

export default ChildDedicationDetail;
