import React from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import {
  BookOpen, Calendar, Users, TrendingUp, Award, Sparkles,
  FileText, MessageSquare, User, HelpCircle, Plus, Loader2
} from 'lucide-react';
import exploreService from '../../services/exploreService';

export default function ExploreDashboard() {
  const { t } = useTranslation();

  // Fetch dashboard stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['explore', 'dashboard-stats'],
    queryFn: () => exploreService.getDashboardStats(),
    staleTime: 60000, // 1 minute
  });

  const statCards = [
    {
      title: 'Total Content',
      value: stats?.total_content || 0,
      icon: BookOpen,
      description: 'All content items',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      link: '/explore/content',
    },
    {
      title: 'Scheduled Today',
      value: stats?.scheduled_today || 0,
      icon: Calendar,
      description: 'Daily content scheduled',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      link: '/explore/schedule',
    },
    {
      title: 'Total Users Engaged',
      value: stats?.total_users_engaged || 0,
      icon: Users,
      description: 'Active Explore users',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      link: '/explore/analytics',
    },
    {
      title: 'Avg. Completion Rate',
      value: `${stats?.avg_completion_rate || 0}%`,
      icon: TrendingUp,
      description: 'Content completion',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      link: '/explore/analytics',
    },
    {
      title: 'Total Streaks',
      value: stats?.total_active_streaks || 0,
      icon: Award,
      description: 'Users with active streaks',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      link: '/explore/analytics',
    },
    {
      title: 'AI Generations',
      value: stats?.ai_generations_month || 0,
      icon: Sparkles,
      description: 'This month',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      link: '/explore/ai',
    },
  ];

  const contentTypes = [
    {
      name: 'Daily Devotions',
      icon: FileText,
      count: stats?.content_by_type?.devotion || 0,
      link: '/explore/content/devotion',
      color: 'text-blue-600',
    },
    {
      name: 'Verse of the Day',
      icon: MessageSquare,
      count: stats?.content_by_type?.verse || 0,
      link: '/explore/content/verse',
      color: 'text-green-600',
    },
    {
      name: 'Bible Figures',
      icon: User,
      count: stats?.content_by_type?.figure || 0,
      link: '/explore/content/figure',
      color: 'text-purple-600',
    },
    {
      name: 'Daily Quizzes',
      icon: HelpCircle,
      count: stats?.content_by_type?.quiz || 0,
      link: '/explore/content/quiz',
      color: 'text-orange-600',
    },
    {
      name: 'Bible Studies',
      icon: BookOpen,
      count: stats?.content_by_type?.bible_study || 0,
      link: '/explore/content/bible_study',
      color: 'text-indigo-600',
    },
    {
      name: 'Topical Categories',
      icon: BookOpen,
      count: stats?.content_by_type?.topical || 0,
      link: '/explore/content/topical',
      color: 'text-teal-600',
    },
  ];

  const quickActions = [
    {
      label: 'Create Devotion',
      link: '/explore/content/devotion/new',
      icon: Plus,
      variant: 'default',
    },
    {
      label: 'Schedule Content',
      link: '/explore/schedule',
      icon: Calendar,
      variant: 'outline',
    },
    {
      label: 'Generate with AI',
      link: '/explore/ai',
      icon: Sparkles,
      variant: 'outline',
    },
    {
      label: 'View Analytics',
      link: '/explore/analytics',
      icon: TrendingUp,
      variant: 'outline',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Explore Content Management
          </h1>
          <p className="text-gray-600 mt-1">
            Manage daily spiritual content and engagement
          </p>
        </div>

        {/* Quick Actions */}
        <div className="flex items-center gap-2">
          {quickActions.map((action, index) => (
            <Link key={index} to={action.link}>
              <Button variant={action.variant} className="gap-2">
                <action.icon className="h-4 w-4" />
                {action.label}
              </Button>
            </Link>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <Link key={index} to={stat.link}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
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
                  <p className="text-sm text-gray-500 mt-1">
                    {stat.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {/* Content Types */}
      <Card>
        <CardHeader>
          <CardTitle>Content by Type</CardTitle>
          <CardDescription>Browse and manage different content types</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {contentTypes.map((type, index) => (
              <Link key={index} to={type.link}>
                <div className="p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex flex-col items-center text-center gap-2">
                    <type.icon className={`h-8 w-8 ${type.color}`} />
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{type.count}</div>
                      <div className="text-sm text-gray-600">{type.name}</div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity (Placeholder) */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest content updates and user engagement</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>Activity feed coming soon</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
