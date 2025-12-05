import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import {
  ArrowLeft, Heart, Loader2, TrendingUp, Users, AlertTriangle,
  MessageSquare, Clock, CheckCircle, XCircle, Activity, BarChart3
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';

// Theme display configuration
const THEME_CONFIG = {
  health: { label: 'Health & Healing', color: 'bg-red-100 text-red-700' },
  anxiety: { label: 'Peace & Anxiety', color: 'bg-purple-100 text-purple-700' },
  grief: { label: 'Grief & Loss', color: 'bg-blue-100 text-blue-700' },
  financial: { label: 'Financial', color: 'bg-green-100 text-green-700' },
  relationships: { label: 'Relationships', color: 'bg-pink-100 text-pink-700' },
  guidance: { label: 'Guidance', color: 'bg-indigo-100 text-indigo-700' },
  faith_struggle: { label: 'Faith Struggle', color: 'bg-amber-100 text-amber-700' },
  gratitude: { label: 'Gratitude', color: 'bg-emerald-100 text-emerald-700' },
};

// Urgency badge colors
const URGENCY_COLORS = {
  crisis: 'bg-red-500 text-white',
  high: 'bg-orange-500 text-white',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
};

// Sentiment colors
const SENTIMENT_COLORS = {
  improved: 'bg-green-100 text-green-700',
  same: 'bg-yellow-100 text-yellow-700',
  worse: 'bg-red-100 text-red-700',
  resolved: 'bg-blue-100 text-blue-700',
};

export default function PrayerAnalytics() {
  const { t } = useTranslation();
  const { sessionChurchId } = useAuth();
  const [timeRange, setTimeRange] = useState('30');
  const [followUpFilter, setFollowUpFilter] = useState('all');

  // Fetch prayer analytics summary
  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['prayer-analytics', sessionChurchId, timeRange],
    queryFn: async () => {
      const response = await api.get(`/api/prayer-requests/analytics/summary?days=${timeRange}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  // Fetch follow-ups
  const { data: followUps, isLoading: followUpsLoading } = useQuery({
    queryKey: ['prayer-followups', sessionChurchId, followUpFilter],
    queryFn: async () => {
      const params = followUpFilter !== 'all' ? `?status=${followUpFilter}` : '';
      const response = await api.get(`/api/prayer-requests/analytics/follow-ups${params}`);
      return response.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const statCards = [
    {
      title: t('prayerAnalytics.totalRequests', 'Total Requests'),
      value: analytics?.total_requests || 0,
      icon: Heart,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
    {
      title: t('prayerAnalytics.newRequests', 'New Requests'),
      value: analytics?.by_status?.new || 0,
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('prayerAnalytics.prayedFor', 'Prayed For'),
      value: analytics?.by_status?.prayed || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('prayerAnalytics.highUrgency', 'High Urgency'),
      value: (analytics?.by_urgency?.high || 0) + (analytics?.by_urgency?.crisis || 0),
      icon: AlertTriangle,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  const followUpStats = [
    {
      title: t('prayerAnalytics.followUpsScheduled', 'Scheduled'),
      value: analytics?.followup_stats?.total_scheduled || 0,
      icon: Clock,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: t('prayerAnalytics.followUpsSent', 'Sent'),
      value: analytics?.followup_stats?.sent || 0,
      icon: Activity,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('prayerAnalytics.followUpsResponded', 'Responded'),
      value: analytics?.followup_stats?.responded || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/prayer-requests">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{t('prayerAnalytics.title', 'Prayer Intelligence Analytics')}</h1>
            <p className="text-gray-500">{t('prayerAnalytics.subtitle', 'Monitor prayer themes, follow-ups, and congregation needs')}</p>
          </div>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">{t('common.last7Days', 'Last 7 days')}</SelectItem>
            <SelectItem value="30">{t('common.last30Days', 'Last 30 days')}</SelectItem>
            <SelectItem value="90">{t('common.last90Days', 'Last 90 days')}</SelectItem>
            <SelectItem value="365">{t('common.lastYear', 'Last year')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {analyticsLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Overview Stats */}
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

          {/* Top Themes & Categories Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Prayer Themes (AI-detected) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  {t('prayerAnalytics.topThemes', 'Top Prayer Themes (AI-Detected)')}
                </CardTitle>
                <CardDescription>{t('prayerAnalytics.themesDesc', 'Most common themes identified by Prayer Intelligence')}</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.top_themes?.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.top_themes.map((theme, idx) => {
                      const config = THEME_CONFIG[theme.theme] || { label: theme.theme, color: 'bg-gray-100 text-gray-700' };
                      const maxCount = analytics.top_themes[0]?.count || 1;
                      const percentage = Math.round((theme.count / maxCount) * 100);
                      return (
                        <div key={theme.theme} className="flex items-center gap-3">
                          <span className="text-sm text-gray-400 w-6">{idx + 1}</span>
                          <Badge className={config.color}>{config.label}</Badge>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{theme.count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">{t('prayerAnalytics.noThemes', 'No themes detected yet')}</p>
                )}
              </CardContent>
            </Card>

            {/* Categories Distribution */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {t('prayerAnalytics.byCategory', 'By Category')}
                </CardTitle>
                <CardDescription>{t('prayerAnalytics.categoriesDesc', 'Prayer requests by user-selected category')}</CardDescription>
              </CardHeader>
              <CardContent>
                {analytics?.by_category?.length > 0 ? (
                  <div className="space-y-3">
                    {analytics.by_category.slice(0, 8).map((cat, idx) => {
                      const maxCount = analytics.by_category[0]?.count || 1;
                      const percentage = Math.round((cat.count / maxCount) * 100);
                      return (
                        <div key={cat.category} className="flex items-center gap-3">
                          <span className="text-sm text-gray-400 w-6">{idx + 1}</span>
                          <span className="text-sm font-medium w-24 truncate capitalize">{t(`prayerRequests.categories.${cat.category}`, cat.category)}</span>
                          <div className="flex-1">
                            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                          <span className="text-sm font-medium w-12 text-right">{cat.count}</span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">{t('prayerAnalytics.noCategories', 'No data yet')}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Urgency Distribution */}
          {Object.keys(analytics?.by_urgency || {}).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  {t('prayerAnalytics.urgencyLevels', 'Urgency Levels')}
                </CardTitle>
                <CardDescription>{t('prayerAnalytics.urgencyDesc', 'Detected urgency in prayer requests')}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-3">
                  {['crisis', 'high', 'normal', 'low'].map((level) => {
                    const count = analytics?.by_urgency?.[level] || 0;
                    if (count === 0) return null;
                    return (
                      <div key={level} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50">
                        <Badge className={URGENCY_COLORS[level]}>{level.toUpperCase()}</Badge>
                        <span className="text-lg font-semibold">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Follow-up Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {t('prayerAnalytics.followUpTracking', '14-Day Follow-Up Tracking')}
              </CardTitle>
              <CardDescription>{t('prayerAnalytics.followUpDesc', 'Automatic check-ins scheduled 14 days after prayer submission')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Follow-up Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {followUpStats.map((stat) => (
                  <div key={stat.title} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl">
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">{stat.title}</p>
                      <p className="text-xl font-bold">{stat.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Response Sentiments */}
              {Object.keys(analytics?.followup_stats?.response_sentiments || {}).length > 0 && (
                <div>
                  <h4 className="font-medium mb-3">{t('prayerAnalytics.responseSentiments', 'Response Sentiments')}</h4>
                  <div className="flex flex-wrap gap-3">
                    {Object.entries(analytics?.followup_stats?.response_sentiments || {}).map(([sentiment, count]) => (
                      <div key={sentiment} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-50">
                        <Badge className={SENTIMENT_COLORS[sentiment] || 'bg-gray-100 text-gray-700'}>{sentiment}</Badge>
                        <span className="text-lg font-semibold">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Follow-ups List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{t('prayerAnalytics.followUpsList', 'Follow-Up Queue')}</CardTitle>
                  <CardDescription>{t('prayerAnalytics.followUpsListDesc', 'Pending and recent prayer follow-ups')}</CardDescription>
                </div>
                <Select value={followUpFilter} onValueChange={setFollowUpFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('common.all', 'All')}</SelectItem>
                    <SelectItem value="pending">{t('prayerAnalytics.pending', 'Pending')}</SelectItem>
                    <SelectItem value="sent">{t('prayerAnalytics.sent', 'Sent')}</SelectItem>
                    <SelectItem value="responded">{t('prayerAnalytics.responded', 'Responded')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {followUpsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                </div>
              ) : followUps?.data?.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('prayerAnalytics.member', 'Member')}</TableHead>
                      <TableHead>{t('prayerAnalytics.themes', 'Themes')}</TableHead>
                      <TableHead>{t('prayerAnalytics.submittedAt', 'Submitted')}</TableHead>
                      <TableHead>{t('prayerAnalytics.dueAt', 'Follow-up Due')}</TableHead>
                      <TableHead>{t('prayerAnalytics.status', 'Status')}</TableHead>
                      <TableHead>{t('prayerAnalytics.sentiment', 'Sentiment')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {followUps.data.map((followup) => (
                      <TableRow key={followup.id}>
                        <TableCell className="font-medium">
                          {followup.member?.full_name || 'Anonymous'}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {followup.prayer_themes?.slice(0, 2).map((theme) => {
                              const config = THEME_CONFIG[theme] || { label: theme, color: 'bg-gray-100 text-gray-700' };
                              return (
                                <Badge key={theme} variant="outline" className={`text-xs ${config.color}`}>
                                  {config.label}
                                </Badge>
                              );
                            })}
                            {followup.prayer_themes?.length > 2 && (
                              <Badge variant="outline" className="text-xs">+{followup.prayer_themes.length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(followup.submitted_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(followup.follow_up_due_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {followup.user_responded ? (
                            <Badge className="bg-green-100 text-green-700">Responded</Badge>
                          ) : followup.follow_up_sent ? (
                            <Badge className="bg-blue-100 text-blue-700">Sent</Badge>
                          ) : new Date(followup.follow_up_due_at) <= new Date() ? (
                            <Badge className="bg-amber-100 text-amber-700">Due</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-600">Scheduled</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {followup.response_sentiment ? (
                            <Badge className={SENTIMENT_COLORS[followup.response_sentiment] || 'bg-gray-100 text-gray-700'}>
                              {followup.response_sentiment}
                            </Badge>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>{t('prayerAnalytics.noFollowUps', 'No follow-ups in this category')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
