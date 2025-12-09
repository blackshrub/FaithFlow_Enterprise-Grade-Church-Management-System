import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Gem,
  ArrowLeft,
  Phone,
  Calendar,
  User,
  MessageCircle,
  Check,
  CalendarDays,
  MapPin,
  Heart,
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
import MemberAvatar from '../../components/MemberAvatar';
import { format, parseISO } from 'date-fns';

const HolyMatrimonyDetail = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const isIndonesian = i18n.language === 'id';

  const [notesDialog, setNotesDialog] = useState({ open: false, type: null });
  const [notes, setNotes] = useState('');
  const [scheduleData, setScheduleData] = useState({ date: '', location: '', notes: '' });
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
        location: scheduleData.location || undefined,
        notes: scheduleData.notes || undefined,
      });
      setNotesDialog({ open: false, type: null });
      setScheduleData({ date: '', location: '', notes: '' });
      toast({ title: t('requestForms.markedScheduled', 'Wedding scheduled') });
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
      navigate('/request-forms/holy-matrimony');
    } catch (error) {
      toast({
        title: t('common.error', 'Error'),
        description: error.response?.data?.detail || t('requestForms.failedToDelete', 'Failed to delete'),
        variant: 'destructive',
      });
    }
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

  const matrimonyData = request.holy_matrimony_data || {};
  const personA = matrimonyData.person_a || {};
  const personB = matrimonyData.person_b || {};

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/request-forms/holy-matrimony')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-3">
              <MemberAvatar name={personA.name || 'Person A'} photo={personA.photo_url} size="lg" className="ring-2 ring-white" />
              <MemberAvatar name={personB.name || 'Person B'} photo={personB.photo_url} size="lg" className="ring-2 ring-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {personA.name || 'Person A'}{' '}
                <Heart className="inline h-5 w-5 text-rose-500 mx-1" />{' '}
                {personB.name || 'Person B'}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <RequestStatusBadge status={request.status} isIndonesian={isIndonesian} />
                {matrimonyData.both_baptized && (
                  <Badge variant="default" className="bg-green-100 text-green-800">
                    {t('requestForms.bothBaptized', 'Both Baptized')}
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
              {t('requestForms.scheduleWedding', 'Schedule Wedding')}
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
          {/* Couple Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Person A */}
            <Card className="border-blue-200">
              <CardHeader className="pb-3 bg-blue-50 rounded-t-lg">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-blue-500" />
                  {isIndonesian ? 'Mempelai Pria' : 'Groom'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                  <MemberAvatar name={personA.name || 'Person A'} photo={personA.photo_url} size="lg" />
                  <div>
                    <p className="font-medium text-lg">{personA.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <span>{personA.phone || '-'}</span>
                </div>
                <Badge variant={personA.is_baptized ? 'default' : 'secondary'} className="text-xs">
                  {personA.is_baptized
                    ? t('requestForms.baptized', 'Baptized')
                    : t('requestForms.notBaptized', 'Not Baptized')}
                </Badge>
              </CardContent>
            </Card>

            {/* Person B */}
            <Card className="border-pink-200">
              <CardHeader className="pb-3 bg-pink-50 rounded-t-lg">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <User className="h-4 w-4 text-pink-500" />
                  {isIndonesian ? 'Mempelai Wanita' : 'Bride'}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="flex items-center gap-3">
                  <MemberAvatar name={personB.name || 'Person B'} photo={personB.photo_url} size="lg" />
                  <div>
                    <p className="font-medium text-lg">{personB.name || '-'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-3 w-3 text-gray-400" />
                  <span>{personB.phone || '-'}</span>
                </div>
                <Badge variant={personB.is_baptized ? 'default' : 'secondary'} className="text-xs">
                  {personB.is_baptized
                    ? t('requestForms.baptized', 'Baptized')
                    : t('requestForms.notBaptized', 'Not Baptized')}
                </Badge>
              </CardContent>
            </Card>
          </div>

          {/* Wedding Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Gem className="h-5 w-5 text-amber-500" />
                {t('requestForms.weddingDetails', 'Wedding Details')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {matrimonyData.planned_wedding_date && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-amber-50">
                    <CalendarDays className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('requestForms.plannedDate', 'Planned Wedding Date')}
                    </p>
                    <p className="font-medium">
                      {format(parseISO(matrimonyData.planned_wedding_date), 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {matrimonyData.scheduled_date && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-50">
                    <Calendar className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('requestForms.confirmedDate', 'Confirmed Wedding Date')}
                    </p>
                    <p className="font-medium text-green-700">
                      {format(parseISO(matrimonyData.scheduled_date), 'EEEE, MMMM dd, yyyy')}
                    </p>
                  </div>
                </div>
              )}

              {matrimonyData.wedding_location && (
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100">
                    <MapPin className="h-4 w-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">
                      {t('requestForms.weddingLocation', 'Wedding Location')}
                    </p>
                    <p className="font-medium">{matrimonyData.wedding_location}</p>
                  </div>
                </div>
              )}

              {/* Baptism Status */}
              <div className="pt-4 border-t">
                <p className="text-sm text-gray-500 mb-3">
                  {t('requestForms.baptismStatus', 'Baptism Status')}
                </p>
                <div className="flex gap-4">
                  <Badge
                    variant={personA.is_baptized ? 'default' : 'secondary'}
                    className={personA.is_baptized ? 'bg-green-100 text-green-800' : ''}
                  >
                    {personA.name?.split(' ')[0] || 'Groom'}: {personA.is_baptized ? '✓' : '✗'}
                  </Badge>
                  <Badge
                    variant={personB.is_baptized ? 'default' : 'secondary'}
                    className={personB.is_baptized ? 'bg-green-100 text-green-800' : ''}
                  >
                    {personB.name?.split(' ')[0] || 'Bride'}: {personB.is_baptized ? '✓' : '✗'}
                  </Badge>
                </div>
                {!matrimonyData.both_baptized && (
                  <p className="text-sm text-amber-600 mt-2">
                    {t('requestForms.baptismRequired', 'Note: Both partners should be baptized for holy matrimony.')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

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
                      <p className="text-sm font-medium">{t('requestForms.scheduled', 'Wedding Scheduled')}</p>
                      {matrimonyData.scheduled_date && (
                        <p className="text-xs text-gray-500">
                          {format(parseISO(matrimonyData.scheduled_date), 'MMM dd, yyyy')}
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
                      <p className="text-sm font-medium">{t('requestForms.completed', 'Married')}</p>
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
            <DialogTitle>{t('requestForms.scheduleWedding', 'Schedule Wedding')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>{t('requestForms.weddingDate', 'Wedding Date')} *</Label>
              <Input
                type="date"
                value={scheduleData.date}
                onChange={(e) => setScheduleData((prev) => ({ ...prev, date: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('requestForms.location', 'Location')}</Label>
              <Input
                placeholder={t('requestForms.locationPlaceholder', 'e.g., Main Sanctuary')}
                value={scheduleData.location}
                onChange={(e) => setScheduleData((prev) => ({ ...prev, location: e.target.value }))}
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

export default HolyMatrimonyDetail;
