import React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAppointments } from '../../hooks/useCounseling';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';

const CounselingDashboard = () => {
  const { t } = useTranslation('counseling');
  const navigate = useNavigate();
  const today = startOfDay(new Date()).toISOString().split('T')[0];
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  // Fetch appointments for next 7 days
  const { data: upcomingAppointments = [], isLoading } = useAppointments({
    date_from: today,
    date_to: nextWeekStr
  });

  // Fetch pending appointments
  const { data: pendingAppointments = [] } = useAppointments({
    status: 'pending'
  });

  // Calculate stats
  const stats = {
    upcoming: upcomingAppointments.filter(a => a.status === 'approved').length,
    pending: pendingAppointments.length,
    high_urgency: pendingAppointments.filter(a => a.urgency === 'high' || a.urgency === 'crisis').length,
    crisis: pendingAppointments.filter(a => a.urgency === 'crisis').length
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

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-gray-500 mt-1">{t('dashboard')}</p>
        </div>
        <Button onClick={() => navigate('/counseling/appointments/new')}>
          {t('create_appointment')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('upcoming_appointments')}
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('pending_approvals')}
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting review
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              High Urgency
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">{stats.high_urgency}</div>
            <p className="text-xs text-muted-foreground">
              Needs attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Crisis
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{stats.crisis}</div>
            <p className="text-xs text-muted-foreground">
              Immediate action required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {stats.pending > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{t('pending_approvals')}</span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/counseling/appointments?status=pending')}>
                {t('view_all')}
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingAppointments.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/counseling/appointments/${appointment.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{appointment.member_name}</span>
                      <Badge variant={getUrgencyColor(appointment.urgency)}>
                        {t(`urgency_${appointment.urgency}`)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {appointment.topic} • {format(parseISO(appointment.date), 'MMM dd, yyyy')} at {appointment.start_time}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      {t('approve')}
                    </Button>
                    <Button size="sm" variant="ghost">
                      {t('reject')}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Appointments */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('upcoming_appointments')}</span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/counseling/appointments')}>
              {t('view_all')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('no_appointments')}
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingAppointments.slice(0, 10).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/counseling/appointments/${appointment.id}`)}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{appointment.member_name}</span>
                      <Badge variant={getStatusColor(appointment.status)}>
                        {t(`status_${appointment.status}`)}
                      </Badge>
                      <Badge variant="outline">
                        {t(`type_${appointment.type}`)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {format(parseISO(appointment.date), 'EEEE, MMM dd, yyyy')} • {appointment.start_time} - {appointment.end_time}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">
                      with {appointment.counselor_name}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CounselingDashboard;
