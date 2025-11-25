import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  ArrowLeft, TrendingUp, Users, Eye, CheckCircle, Award, Calendar,
  Loader2, BarChart3, BookOpen, MessageSquare, User as UserIcon, HelpCircle
} from 'lucide-react';
import exploreService from '../../services/exploreService';

const contentTypeConfig = {
  devotion: { label: 'Devotions', icon: BookOpen, color: 'text-blue-600', bgColor: 'bg-blue-50' },
  verse: { label: 'Verses', icon: MessageSquare, color: 'text-green-600', bgColor: 'bg-green-50' },
  figure: { label: 'Figures', icon: UserIcon, color: 'text-purple-600', bgColor: 'bg-purple-50' },
  quiz: { label: 'Quizzes', icon: HelpCircle, color: 'text-orange-600', bgColor: 'bg-orange-50' },
};

export default function AnalyticsDashboard() {
  const { t } = useTranslation();
  const [timeRange, setTimeRange] = useState('30');
  const [contentType, setContentType] = useState('all');

  // Fetch analytics data
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['explore', 'analytics', timeRange, contentType],
    queryFn: () => exploreService.getAnalytics({
      days: parseInt(timeRange),
      content_type: contentType === 'all' ? undefined : contentType,
    }),
    staleTime: 60000,
  });

  // Fetch top performing content
  const { data: topContent } = useQuery({
    queryKey: ['explore', 'top-content', timeRange],
    queryFn: () => exploreService.getTopContent({ days: parseInt(timeRange) }),
    staleTime: 60000,
  });

  const statCards = [
    {
      title: 'Total Views',
      value: analytics?.total_views || 0,
      change: analytics?.views_change || 0,
      icon: Eye,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Completions',
      value: analytics?.total_completions || 0,
      change: analytics?.completions_change || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Active Users',
      value: analytics?.active_users || 0,
      change: analytics?.users_change || 0,
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Avg. Completion Rate',
      value: `${analytics?.avg_completion_rate || 0}%`,
      change: analytics?.completion_rate_change || 0,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Active Streaks',
      value: analytics?.active_streaks || 0,
      change: analytics?.streaks_change || 0,
      icon: Award,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
    {
      title: 'Avg. Engagement Time',
      value: `${analytics?.avg_engagement_minutes || 0}m`,
      change: analytics?.engagement_change || 0,
      icon: Calendar,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
  ];

  const formatChange = (change) => {
    if (!change) return null;
    const isPositive = change > 0;
    return (
      <span className={`text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? '+' : ''}{change}% vs previous period
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/explore"
            className="text-sm text-blue-600 hover:underline mb-2 inline-block"
          >
            <ArrowLeft className="h-4 w-4 inline mr-1" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900">
            Explore Analytics
          </h1>
          <p className="text-gray-600 mt-1">
            Track engagement and content performance
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select time range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Last 7 days</SelectItem>
                  <SelectItem value="30">Last 30 days</SelectItem>
                  <SelectItem value="90">Last 90 days</SelectItem>
                  <SelectItem value="365">Last year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Content Type</label>
              <Select value={contentType} onValueChange={setContentType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select content type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Content</SelectItem>
                  <SelectItem value="devotion">Devotions</SelectItem>
                  <SelectItem value="verse">Verses</SelectItem>
                  <SelectItem value="figure">Figures</SelectItem>
                  <SelectItem value="quiz">Quizzes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {statCards.map((stat, index) => (
              <Card key={index}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-600">
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                      <stat.icon className={`h-5 w-5 ${stat.color}`} />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-gray-900">
                    {stat.value}
                  </div>
                  {stat.change !== undefined && (
                    <div className="mt-1">
                      {formatChange(stat.change)}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Content Performance by Type */}
          <Card>
            <CardHeader>
              <CardTitle>Performance by Content Type</CardTitle>
              <CardDescription>Compare engagement across different content types</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.by_content_type?.map((type, index) => {
                  const config = contentTypeConfig[type.content_type] || {};
                  const Icon = config.icon || BookOpen;
                  const maxValue = Math.max(...(analytics.by_content_type?.map(t => t.views) || [1]));
                  const percentage = (type.views / maxValue) * 100;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          <span className="font-medium text-gray-900">{config.label}</span>
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-600">{type.views} views</span>
                          <span className="text-gray-600">{type.completions} completed</span>
                          <span className="font-semibold text-gray-900">{type.completion_rate}%</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${config.color.replace('text-', 'bg-')}`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Top Performing Content */}
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Content</CardTitle>
              <CardDescription>Most viewed and completed content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topContent?.content?.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No data available</p>
                ) : (
                  topContent?.content?.slice(0, 10).map((item, index) => {
                    const config = contentTypeConfig[item.content_type] || {};
                    const Icon = config.icon || BookOpen;

                    return (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full ${config.bgColor} flex items-center justify-center`}>
                            <span className="text-sm font-bold text-gray-700">{index + 1}</span>
                          </div>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                          <div>
                            <p className="font-medium text-gray-900">
                              {item.title?.en || item.name?.en || 'Untitled'}
                            </p>
                            <p className="text-sm text-gray-500">{config.label}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{item.views}</p>
                            <p className="text-gray-500">views</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-gray-900">{item.completions}</p>
                            <p className="text-gray-500">completed</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-green-600">{item.completion_rate}%</p>
                            <p className="text-gray-500">rate</p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* User Engagement Trends */}
          <Card>
            <CardHeader>
              <CardTitle>User Engagement Trends</CardTitle>
              <CardDescription>Daily active users and engagement over time</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics?.daily_engagement?.length > 0 ? (
                <div className="space-y-4">
                  {/* Simple bar chart representation */}
                  <div className="flex items-end justify-between gap-2 h-48">
                    {analytics.daily_engagement.slice(-14).map((day, index) => {
                      const maxUsers = Math.max(...analytics.daily_engagement.map(d => d.active_users));
                      const height = (day.active_users / maxUsers) * 100;

                      return (
                        <div key={index} className="flex-1 flex flex-col items-center gap-2">
                          <div className="w-full bg-blue-500 rounded-t" style={{ height: `${height}%` }} />
                          <span className="text-xs text-gray-500 rotate-45 origin-top-left">
                            {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-600">
                    <span>Daily Active Users (Last 14 days)</span>
                    <span className="font-semibold">{analytics.daily_engagement[analytics.daily_engagement.length - 1]?.active_users || 0} today</span>
                  </div>
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No engagement data available</p>
              )}
            </CardContent>
          </Card>

          {/* Streak Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Streak Distribution</CardTitle>
              <CardDescription>How many users maintain daily streaks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analytics?.streak_distribution?.map((streak, index) => {
                  const maxCount = Math.max(...(analytics.streak_distribution?.map(s => s.count) || [1]));
                  const percentage = (streak.count / maxCount) * 100;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-gray-700">
                          {streak.range}
                        </span>
                        <span className="text-sm text-gray-600">{streak.count} users</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full bg-orange-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                }) || (
                  <p className="text-center text-gray-500 py-4">No streak data available</p>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
