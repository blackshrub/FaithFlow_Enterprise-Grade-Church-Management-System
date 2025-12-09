import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Heart,
  Droplets,
  Baby,
  Gem,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { useDashboardStats, useUnreadCounts } from '../../hooks/useRequestForms';
import MemberAvatar from '../../components/MemberAvatar';
import { format, parseISO } from 'date-fns';

const REQUEST_TYPE_CONFIG = {
  accept_jesus: {
    icon: Heart,
    label: 'Accept Jesus',
    labelId: 'Terima Yesus',
    color: 'text-rose-500',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    path: '/request-forms/accept-jesus',
  },
  baptism: {
    icon: Droplets,
    label: 'Baptism',
    labelId: 'Baptis',
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    path: '/request-forms/baptism',
  },
  child_dedication: {
    icon: Baby,
    label: 'Child Dedication',
    labelId: 'Penyerahan Anak',
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    path: '/request-forms/child-dedication',
  },
  holy_matrimony: {
    icon: Gem,
    label: 'Holy Matrimony',
    labelId: 'Pernikahan Kudus',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    path: '/request-forms/holy-matrimony',
  },
};

const STATUS_CONFIG = {
  new: { label: 'New', variant: 'default', color: 'bg-blue-100 text-blue-800' },
  contacted: { label: 'Contacted', variant: 'secondary', color: 'bg-yellow-100 text-yellow-800' },
  scheduled: { label: 'Scheduled', variant: 'outline', color: 'bg-purple-100 text-purple-800' },
  completed: { label: 'Completed', variant: 'success', color: 'bg-green-100 text-green-800' },
  cancelled: { label: 'Cancelled', variant: 'destructive', color: 'bg-red-100 text-red-800' },
};

const RequestFormsDashboard = () => {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const isIndonesian = i18n.language === 'id';

  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: unreadCounts, isLoading: countsLoading } = useUnreadCounts();

  const isLoading = statsLoading || countsLoading;

  // Calculate totals from unread counts
  const totalNew = unreadCounts?.total || 0;

  // Get stats data with defaults
  const dashboardStats = stats || {
    total_requests: 0,
    by_status: { new: 0, contacted: 0, scheduled: 0, completed: 0 },
    by_type: { accept_jesus: 0, baptism: 0, child_dedication: 0, holy_matrimony: 0 },
    recent_requests: [],
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">
            {t('requestForms.title', 'Request Forms')}
          </h1>
          <p className="text-gray-500 mt-1">
            {t('requestForms.subtitle', 'Manage member care requests')}
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('requestForms.stats.newRequests', 'New Requests')}
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{totalNew}</div>
            <p className="text-xs text-muted-foreground">
              {t('requestForms.stats.awaitingContact', 'Awaiting contact')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('requestForms.stats.contacted', 'Contacted')}
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {dashboardStats.by_status?.contacted || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('requestForms.stats.inProgress', 'In progress')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('requestForms.stats.scheduled', 'Scheduled')}
            </CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {dashboardStats.by_status?.scheduled || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('requestForms.stats.upcomingEvents', 'Upcoming events')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t('requestForms.stats.completed', 'Completed')}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {dashboardStats.by_status?.completed || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {t('requestForms.stats.thisMonth', 'This month')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Request Type Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(REQUEST_TYPE_CONFIG).map(([type, config]) => {
          const Icon = config.icon;
          const count = unreadCounts?.[type] || 0;
          const total = dashboardStats.by_type?.[type] || 0;

          return (
            <Card
              key={type}
              className={`cursor-pointer hover:shadow-md transition-shadow ${config.borderColor} border-2`}
              onClick={() => navigate(config.path)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>
                  {count > 0 && (
                    <Badge variant="destructive" className="rounded-full">
                      {count} new
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardTitle className="text-lg mb-1">
                  {isIndonesian ? config.labelId : config.label}
                </CardTitle>
                <CardDescription>
                  {total} {t('requestForms.totalRequests', 'total requests')}
                </CardDescription>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-3 p-0 h-auto font-medium"
                >
                  {t('requestForms.viewAll', 'View all')}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Recent Requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('requestForms.recentRequests', 'Recent Requests')}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/request-forms/accept-jesus')}
            >
              {t('requestForms.viewAll', 'View All')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-gray-500">
              {t('common.loading', 'Loading...')}
            </div>
          ) : dashboardStats.recent_requests?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {t('requestForms.noRecentRequests', 'No recent requests')}
            </div>
          ) : (
            <div className="space-y-3">
              {dashboardStats.recent_requests?.slice(0, 10).map((request) => {
                const typeConfig = REQUEST_TYPE_CONFIG[request.request_type];
                const statusConfig = STATUS_CONFIG[request.status];
                const TypeIcon = typeConfig?.icon || Heart;

                return (
                  <div
                    key={request.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      navigate(`${typeConfig?.path || '/request-forms'}/${request.id}`)
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${typeConfig?.bgColor || 'bg-gray-50'}`}>
                        <TypeIcon className={`h-4 w-4 ${typeConfig?.color || 'text-gray-500'}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{request.full_name}</span>
                          <Badge className={statusConfig?.color || ''} variant="outline">
                            {statusConfig?.label || request.status}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {isIndonesian ? typeConfig?.labelId : typeConfig?.label} •{' '}
                          {request.created_at &&
                            format(parseISO(request.created_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-gray-400" />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RequestFormsDashboard;
