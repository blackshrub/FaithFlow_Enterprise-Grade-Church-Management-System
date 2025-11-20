import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Filter, Calendar, User, AlertCircle } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { useAppointments, useCounselors } from '../../hooks/useCounseling';
import { format, parseISO } from 'date-fns';
import AppointmentDetailPage from './AppointmentDetail';

const AppointmentsListPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { appointmentId } = useParams();
  const [filters, setFilters] = useState({
    status: 'all',
    counselor_id: 'all',
    urgency: 'all',
    date_from: '',
    date_to: ''
  });

  const { data: appointments = [], isLoading } = useAppointments(
    // Convert "all" back to empty string for API
    {
      ...filters,
      status: filters.status === 'all' ? '' : filters.status,
      counselor_id: filters.counselor_id === 'all' ? '' : filters.counselor_id,
      urgency: filters.urgency === 'all' ? '' : filters.urgency,
    }
  );
  const { data: counselors = [] } = useCounselors();

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

  // If appointmentId in URL, show detail page
  if (appointmentId) {
    return <AppointmentDetailPage />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">{t('counseling.appointments')}</h1>
          <p className="text-gray-500 mt-1">Manage Counseling and Prayer Appointments</p>
        </div>
        <Button onClick={() => navigate('/counseling/appointments/new')}>
          <Plus className="mr-2 h-4 w-4" />
          {t('counseling.create_appointment')}
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>{t('counseling.status')}</Label>
              <Select
                value={filters.status}
                onValueChange={(value) => setFilters({ ...filters, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">{t('counseling.status_pending')}</SelectItem>
                  <SelectItem value="approved">{t('counseling.status_approved')}</SelectItem>
                  <SelectItem value="rejected">{t('counseling.status_rejected')}</SelectItem>
                  <SelectItem value="canceled">{t('counseling.status_canceled')}</SelectItem>
                  <SelectItem value="completed">{t('counseling.status_completed')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('counseling.counselor')}</Label>
              <Select
                value={filters.counselor_id}
                onValueChange={(value) => setFilters({ ...filters, counselor_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Counselors" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Counselors</SelectItem>
                  {counselors.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.display_name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t('counseling.urgency')}</Label>
              <Select
                value={filters.urgency}
                onValueChange={(value) => setFilters({ ...filters, urgency: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="low">{t('counseling.urgency_low')}</SelectItem>
                  <SelectItem value="normal">{t('counseling.urgency_normal')}</SelectItem>
                  <SelectItem value="high">{t('counseling.urgency_high')}</SelectItem>
                  <SelectItem value="crisis">{t('counseling.urgency_crisis')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Date From</Label>
              <Input
                type="date"
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>Date To</Label>
              <Input
                type="date"
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </div>
          </div>

          {(filters.status !== 'all' || filters.counselor_id !== 'all' || filters.urgency !== 'all' || filters.date_from || filters.date_to) && (
            <div className="mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ status: 'all', counselor_id: 'all', urgency: 'all', date_from: '', date_to: '' })}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointments Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">Loading...</div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('counseling.no_appointments')}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>{t('counseling.member')}</TableHead>
                  <TableHead>{t('counseling.counselor')}</TableHead>
                  <TableHead>{t('counseling.type')}</TableHead>
                  <TableHead>{t('counseling.topic')}</TableHead>
                  <TableHead>{t('counseling.urgency')}</TableHead>
                  <TableHead>{t('counseling.status')}</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appointments.map((appointment) => (
                  <TableRow
                    key={appointment.id}
                    className="cursor-pointer hover:bg-gray-50"
                    onClick={() => navigate(`/counseling/appointments/${appointment.id}`)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">
                            {format(parseISO(appointment.date), 'MMM dd, yyyy')}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.start_time} - {appointment.end_time}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{appointment.member_name}</div>
                          {appointment.member_phone && (
                            <div className="text-sm text-gray-500">{appointment.member_phone}</div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{appointment.counselor_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{t(`counseling.type_${appointment.type}`)}</Badge>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">{appointment.topic}</TableCell>
                    <TableCell>
                      <Badge variant={getUrgencyColor(appointment.urgency)}>
                        {t(`counseling.urgency_${appointment.urgency}`)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusColor(appointment.status)}>
                        {t(`counseling.status_${appointment.status}`)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/counseling/appointments/${appointment.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{appointments.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'pending').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {appointments.filter(a => a.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AppointmentsListPage;
