import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import {
  ArrowLeft, Loader2, Newspaper, AlertTriangle, Cloud, RefreshCw,
  CheckCircle, XCircle, ExternalLink, FileText, Globe, Zap
} from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../hooks/useAuth';

// Category display configuration
const CATEGORY_CONFIG = {
  disaster: { label: 'Disaster', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
  crisis: { label: 'Crisis', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
  celebration: { label: 'Celebration', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  national: { label: 'National', color: 'bg-blue-100 text-blue-700', icon: Globe },
  general: { label: 'General', color: 'bg-gray-100 text-gray-700', icon: Newspaper },
};

export default function NewsContextDashboard() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { sessionChurchId, user } = useAuth();
  const isSuperAdmin = user?.role === 'super_admin';

  const [timeRange, setTimeRange] = useState('30');
  const [processedFilter, setProcessedFilter] = useState('all');

  // Fetch news context stats
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['news-context-stats', sessionChurchId, timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/explore/admin/news-contexts/stats/summary?days=${timeRange}`);
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Fetch news contexts list
  const { data: contextsData, isLoading: contextsLoading } = useQuery({
    queryKey: ['news-contexts', sessionChurchId, processedFilter],
    queryFn: async () => {
      const params = processedFilter !== 'all' ? `?processed=${processedFilter === 'processed'}` : '';
      const response = await api.get(`/api/explore/admin/news-contexts${params}`);
      return response.data.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  // Trigger news fetch mutation
  const triggerFetchMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/explore/admin/news-contexts/trigger');
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['news-contexts'] });
      queryClient.invalidateQueries({ queryKey: ['news-context-stats'] });
      toast({
        title: t('newsContext.fetchTriggered', 'News Fetch Triggered'),
        description: `${data.data?.significant_events_count || 0} events, ${data.data?.disaster_alerts_count || 0} alerts found`,
      });
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: t('common.error', 'Error'),
        description: error.response?.data?.detail || 'Failed to trigger news fetch',
      });
    },
  });

  // Mark as reviewed mutation
  const reviewMutation = useMutation({
    mutationFn: async (contextId) => {
      const response = await api.patch(`/api/explore/admin/news-contexts/${contextId}/review`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news-contexts'] });
      toast({
        title: t('common.success', 'Success'),
        description: t('newsContext.markedReviewed', 'Context marked as reviewed'),
      });
    },
  });

  const statCards = [
    {
      title: t('newsContext.totalContexts', 'Total Contexts'),
      value: stats?.total_contexts || 0,
      icon: Newspaper,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('newsContext.processed', 'Processed'),
      value: stats?.processed || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('newsContext.disasterAlerts', 'Disaster Alerts'),
      value: stats?.total_disaster_alerts || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: t('newsContext.contentGenerated', 'Content Generated'),
      value: stats?.total_content_generated || 0,
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/explore/dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('newsContext.title', 'News Context Monitor')}</h1>
            <p className="text-gray-500">{t('newsContext.subtitle', 'Monitor national news for contextual content generation')}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">{t('common.last7Days', 'Last 7 days')}</SelectItem>
              <SelectItem value="30">{t('common.last30Days', 'Last 30 days')}</SelectItem>
              <SelectItem value="90">{t('common.last90Days', 'Last 90 days')}</SelectItem>
            </SelectContent>
          </Select>
          {isSuperAdmin && (
            <Button
              onClick={() => triggerFetchMutation.mutate()}
              disabled={triggerFetchMutation.isPending}
            >
              {triggerFetchMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              {t('newsContext.triggerFetch', 'Fetch Now')}
            </Button>
          )}
        </div>
      </div>

      {statsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {statCards.map((stat) => (
              <Card key={stat.title}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${stat.bgColor}`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Events by Category */}
          {stats?.events_by_category && Object.keys(stats.events_by_category).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  {t('newsContext.eventsByCategory', 'Events by Category')}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {Object.entries(stats.events_by_category).map(([category, count]) => {
                    const config = CATEGORY_CONFIG[category] || CATEGORY_CONFIG.general;
                    return (
                      <div key={category} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50">
                        <Badge className={config.color}>{config.label}</Badge>
                        <span className="text-lg font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contexts List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('newsContext.contextsList', 'News Contexts')}</CardTitle>
                  <CardDescription>{t('newsContext.contextsDesc', 'Daily news context snapshots')}</CardDescription>
                </div>
                <Select value={processedFilter} onValueChange={setProcessedFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                    <SelectItem value="processed">{t('newsContext.processed', 'Processed')}</SelectItem>
                    <SelectItem value="unprocessed">{t('newsContext.unprocessed', 'Unprocessed')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {contextsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : contextsData?.contexts?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('newsContext.date', 'Date')}</TableHead>
                      <TableHead>{t('newsContext.events', 'Events')}</TableHead>
                      <TableHead>{t('newsContext.alerts', 'Alerts')}</TableHead>
                      <TableHead>{t('newsContext.contentGenerated', 'Content')}</TableHead>
                      <TableHead>{t('newsContext.status', 'Status')}</TableHead>
                      <TableHead>{t('common.actions', 'Actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contextsData.contexts.map((context) => (
                      <TableRow key={context.id}>
                        <TableCell className="font-medium">
                          {new Date(context.date || context.created_at).toLocaleDateString('id-ID', {
                            weekday: 'short',
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{context.significant_events?.length || 0}</span>
                            {context.significant_events?.length > 0 && (
                              <div className="flex gap-1">
                                {[...new Set(context.significant_events.map(e => e.category))].slice(0, 3).map((cat) => {
                                  const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.general;
                                  return (
                                    <Badge key={cat} variant="outline" className={`text-xs ${config.color}`}>
                                      {cat}
                                    </Badge>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {context.disaster_alerts?.length > 0 ? (
                              <>
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                                <span className="text-red-600 font-medium">{context.disaster_alerts.length}</span>
                              </>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {context.contextual_content_ids?.length || 0}
                        </TableCell>
                        <TableCell>
                          {context.processed ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Processed
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700">
                              <Cloud className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!context.admin_reviewed && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => reviewMutation.mutate(context.id)}
                                disabled={reviewMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                {t('newsContext.markReviewed', 'Mark Reviewed')}
                              </Button>
                            )}
                            {context.admin_reviewed && (
                              <Badge variant="outline" className="text-gray-500">
                                Reviewed
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Newspaper className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('newsContext.noContexts', 'No news contexts found')}</p>
                  {isSuperAdmin && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => triggerFetchMutation.mutate()}
                      disabled={triggerFetchMutation.isPending}
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      {t('newsContext.triggerFirstFetch', 'Fetch News Now')}
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* How It Works */}
          <Card>
            <CardHeader>
              <CardTitle>{t('newsContext.howItWorks', 'How It Works')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex gap-4">
                  <div className="p-2 h-fit rounded-lg bg-blue-50">
                    <Cloud className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('newsContext.step1Title', '1. RSS Monitoring')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('newsContext.step1Desc', 'Fetches news from Kompas, Detik, CNN Indonesia and BMKG disaster alerts twice daily (6:30 AM & 2:00 PM)')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-2 h-fit rounded-lg bg-purple-50">
                    <Zap className="h-6 w-6 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('newsContext.step2Title', '2. AI Analysis')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('newsContext.step2Desc', 'Analyzes significance and spiritual relevance of news events using keyword matching and categorization')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="p-2 h-fit rounded-lg bg-green-50">
                    <FileText className="h-6 w-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold">{t('newsContext.step3Title', '3. Content Generation')}</h4>
                    <p className="text-sm text-gray-600">
                      {t('newsContext.step3Desc', 'When significant events are detected, contextual devotions and verses are generated for your congregation')}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
