import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Clock, Users, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useAppointments } from '../../hooks/useCounseling';
import { format, parseISO, isAfter, startOfDay } from 'date-fns';
import MemberAvatar from '../../components/MemberAvatar';

const CounselingDashboard = () => {
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

  const getUrgencyLabel = (urgency) => {
    const labels = {
      crisis: 'Crisis',
      high: 'High',
      normal: 'Normal',
      low: 'Low'
    };
    return labels[urgency] || urgency;
  };

  const getStatusLabel = (status) => {
    const labels = {
      approved: 'Approved',
      pending: 'Pending',
      completed: 'Completed',
      rejected: 'Rejected',
      canceled: 'Canceled'
    };
    return labels[status] || status;
  };

  const getTypeLabel = (type) => {
    const labels = {
      counseling: 'Counseling',
      prayer: 'Prayer',
      pastoral_visit: 'Pastoral Visit'
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Counseling & Prayer</h1>
          <p className="text-gray-500 mt-1">Dashboard</p>
        </div>
        <Button onClick={() => navigate('/counseling/appointments/new')}>
          Create Appointment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Upcoming Appointments
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.upcoming}</div>
            <p className="text-xs text-muted-foreground">
              Next 7 Days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Approvals
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting Review
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
              Needs Attention
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
              Immediate Action Required
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Approvals */}
      {stats.pending > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Pending Approvals</span>
              <Button variant="ghost" size="sm" onClick={() => navigate('/counseling/appointments?status=pending')}>
                View All
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
                      <MemberAvatar 
                        name={appointment.member_name}
                        size="sm"
                      />
                      <span className="font-medium">{appointment.member_name}</span>
                      <Badge variant={getUrgencyColor(appointment.urgency)}>
                        {getUrgencyLabel(appointment.urgency)}
                      </Badge>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {appointment.topic} • {format(parseISO(appointment.date), 'MMM dd, yyyy')} at {appointment.start_time}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      Approve
                    </Button>
                    <Button size="sm" variant="ghost">
                      Reject
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
            <span>Upcoming Appointments</span>
            <Button variant="ghost" size="sm" onClick={() => navigate('/counseling/appointments')}>
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : upcomingAppointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No Appointments Found
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
                        {getStatusLabel(appointment.status)}
                      </Badge>
                      <Badge variant="outline">
                        {getTypeLabel(appointment.type)}
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
