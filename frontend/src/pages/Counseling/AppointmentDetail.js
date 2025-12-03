import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Ban, Calendar, User, Clock, Phone, MapPin, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Textarea } from '../../components/ui/textarea';
import { Label } from '../../components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import { useToast } from '../../hooks/use-toast';
import {
  useAppointment,
  useApproveAppointment,
  useRejectAppointment,
  useCancelAppointment,
  useCompleteAppointment
} from '../../hooks/useCounseling';
import { format, parseISO } from 'date-fns';
import MemberAvatar from '../../components/MemberAvatar';

const AppointmentDetailPage = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [isCompleteDialogOpen, setIsCompleteDialogOpen] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');

  const { data: appointment, isLoading } = useAppointment(appointmentId);
  const approveMutation = useApproveAppointment();
  const rejectMutation = useRejectAppointment();
  const cancelMutation = useCancelAppointment();
  const completeMutation = useCompleteAppointment();

  const handleApprove = async () => {
    try {
      await approveMutation.mutateAsync({ id: appointmentId, admin_notes: adminNotes });
      toast({ title: t('counseling.success_appointment_approved') });
      setIsApproveDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide a reason for rejection',
        variant: 'destructive'
      });
      return;
    }
    try {
      await rejectMutation.mutateAsync({ id: appointmentId, reason: rejectReason });
      toast({ title: t('counseling.success_appointment_rejected') });
      setIsRejectDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleCancel = async () => {
    try {
      await cancelMutation.mutateAsync({ id: appointmentId, reason: cancelReason });
      toast({ title: t('counseling.success_appointment_canceled') });
      setIsCancelDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const handleComplete = async () => {
    if (!outcomeNotes.trim()) {
      toast({
        title: 'Error',
        description: 'Please provide outcome notes',
        variant: 'destructive'
      });
      return;
    }
    try {
      await completeMutation.mutateAsync({ id: appointmentId, outcome_notes: outcomeNotes });
      toast({ title: t('counseling.success_appointment_completed') });
      setIsCompleteDialogOpen(false);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.detail || 'An error occurred',
        variant: 'destructive'
      });
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'crisis': return 'destructive';
      case 'high': return 'destructive';
      case 'normal': return 'secondary';
      case 'low': return 'outline';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'completed': return 'outline';
      case 'rejected': return 'destructive';
      case 'canceled': return 'outline';
      default: return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="p-6">
        <div className="text-center py-8 text-gray-500">Appointment Not Found</div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/counseling/appointments')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t('counseling.appointment_details')}</h1>
            <p className="text-gray-500 mt-1">
              {format(parseISO(appointment.date), 'EEEE, MMMM dd, yyyy')} at {appointment.start_time}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {appointment.status === 'pending' && (
            <>
              <Button variant="default" onClick={() => setIsApproveDialogOpen(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('counseling.approve')}
              </Button>
              <Button variant="destructive" onClick={() => setIsRejectDialogOpen(true)}>
                <XCircle className="mr-2 h-4 w-4" />
                {t('counseling.reject')}
              </Button>
            </>
          )}
          {(appointment.status === 'approved' || appointment.status === 'pending') && (
            <>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(true)}>
                <Ban className="mr-2 h-4 w-4" />
                {t('counseling.cancel')}
              </Button>
              <Button variant="default" onClick={() => setIsCompleteDialogOpen(true)}>
                <CheckCircle className="mr-2 h-4 w-4" />
                {t('counseling.complete')}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Status and Urgency */}
      <div className="flex gap-2">
        <Badge variant={getStatusColor(appointment.status)} className="text-sm">
          {t(`counseling.status_${appointment.status}`)}
        </Badge>
        <Badge variant={getUrgencyColor(appointment.urgency)} className="text-sm">
          {t(`counseling.urgency_${appointment.urgency}`)}
        </Badge>
        <Badge variant="outline" className="text-sm">
          {t(`counseling.type_${appointment.type}`)}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Member Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                {t('counseling.member')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Name</div>
                <div className="flex items-center gap-3 mt-1">
                  <MemberAvatar
                    member={appointment.member_info}
                    size="md"
                  />
                  <div className="font-medium text-lg">{appointment.member_info?.full_name}</div>
                </div>
              </div>
              {appointment.member_info?.email && (
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium">{appointment.member_info.email}</div>
                </div>
              )}
              {appointment.contact_phone && (
                <div>
                  <div className="text-sm text-gray-500">Contact Phone</div>
                  <div className="font-medium">{appointment.contact_phone}</div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Appointment Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Appointment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">Date</div>
                <div className="font-medium">{format(parseISO(appointment.date), 'EEEE, MMMM dd, yyyy')}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Time</div>
                <div className="font-medium">{appointment.start_time} - {appointment.end_time}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t('counseling.counselor')}</div>
                <div className="flex items-center gap-2 mt-1">
                  {appointment.counselor_info && (
                    <MemberAvatar 
                      name={appointment.counselor_info.display_name}
                      size="sm"
                    />
                  )}
                  <div className="font-medium">{appointment.counselor_info?.display_name || 'To Be Assigned'}</div>
                </div>
              </div>
              {appointment.counselor_info?.whatsapp_number && (
                <div>
                  <div className="text-sm text-gray-500">Counselor WhatsApp</div>
                  <div className="font-medium">{appointment.counselor_info.whatsapp_number}</div>
                </div>
              )}
              {appointment.preferred_channel && (
                <div>
                  <div className="text-sm text-gray-500">{t('counseling.preferred_channel')}</div>
                  <div className="font-medium">{t(`counseling.channel_${appointment.preferred_channel}`)}</div>
                </div>
              )}
              {appointment.preferred_location && (
                <div>
                  <div className="text-sm text-gray-500">{t('counseling.preferred_location')}</div>
                  <div className="font-medium">{appointment.preferred_location}</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Request Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Request Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="text-sm text-gray-500">{t('counseling.topic')}</div>
                <div className="font-medium text-lg">{appointment.topic}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">{t('counseling.description')}</div>
                <div className="text-gray-700 whitespace-pre-wrap">{appointment.description}</div>
              </div>
              <div>
                <div className="text-sm text-gray-500">Created</div>
                <div className="text-sm">
                  {format(parseISO(appointment.created_at), 'MMM dd, yyyy HH:mm')}
                  {appointment.created_by_member ? ' (by member)' : ' (by staff)'}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Admin Notes */}
          {appointment.admin_notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t('counseling.admin_notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 whitespace-pre-wrap">{appointment.admin_notes}</div>
              </CardContent>
            </Card>
          )}

          {/* Rejection Reason */}
          {appointment.rejected_reason && (
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Rejection Reason</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 whitespace-pre-wrap">{appointment.rejected_reason}</div>
              </CardContent>
            </Card>
          )}

          {/* Outcome Notes */}
          {appointment.outcome_notes && (
            <Card>
              <CardHeader>
                <CardTitle>{t('counseling.outcome_notes')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-gray-700 whitespace-pre-wrap">{appointment.outcome_notes}</div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Approve Dialog */}
      <Dialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counseling.confirm_approve')}</DialogTitle>
            <DialogDescription>
              This will approve the appointment and notify the member.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="approve-admin-notes">{t('counseling.admin_notes')} (Optional)</Label>
            <Textarea
              id="approve-admin-notes"
              name="approve-admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add any notes or instructions..."
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsApproveDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={approveMutation.isPending}>
              {t('counseling.approve')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counseling.confirm_reject')}</DialogTitle>
            <DialogDescription>
              This will reject the appointment and free the time slot.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-reason">{t('counseling.reason')} *</Label>
            <Textarea
              id="reject-reason"
              name="reject-reason"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Please provide a reason for rejection..."
              rows={3}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRejectDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectMutation.isPending}>
              {t('counseling.reject')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counseling.confirm_cancel')}</DialogTitle>
            <DialogDescription>
              This will cancel the appointment.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{t('counseling.reason')} (Optional)</Label>
            <Textarea
              id="cancel-reason"
              name="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation..."
              rows={2}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleCancel} disabled={cancelMutation.isPending}>
              {t('counseling.cancel')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Dialog */}
      <Dialog open={isCompleteDialogOpen} onOpenChange={setIsCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('counseling.confirm_complete')}</DialogTitle>
            <DialogDescription>
              Mark this appointment as completed and add outcome notes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="complete-outcome-notes">{t('counseling.outcome_notes')} *</Label>
            <Textarea
              id="complete-outcome-notes"
              name="complete-outcome-notes"
              value={outcomeNotes}
              onChange={(e) => setOutcomeNotes(e.target.value)}
              placeholder="Summary of the session and outcomes..."
              rows={4}
              required
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCompleteDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleComplete} disabled={completeMutation.isPending}>
              {t('counseling.complete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AppointmentDetailPage;
