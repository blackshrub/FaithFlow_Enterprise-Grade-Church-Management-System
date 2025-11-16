import React from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../context/AuthContext';
import { useMemberStats } from '../hooks/useMembers';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Calendar, Heart, DollarSign, BookOpen, Award, Loader2 } from 'lucide-react';

export default function Dashboard() {
  const { t } = useTranslation();
  const { user, church } = useAuth();
  
  // Use React Query to fetch member stats
  const { data: memberStats, isLoading } = useMemberStats();

  const statCards = [
    {
      title: t('dashboard.totalMembers'),
      value: memberStats?.total_members || 0,
      icon: Users,
      description: t('dashboard.activeMembers'),
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: t('dashboard.upcomingEvents'),
      value: 0,
      icon: Calendar,
      description: t('dashboard.scheduledEvents'),
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: t('dashboard.prayerRequests'),
      value: 0,
      icon: Heart,
      description: t('dashboard.activeRequests'),
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: t('dashboard.totalDonations'),
      value: `$0`,
      icon: DollarSign,
      description: t('dashboard.thisMonth'),
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: t('dashboard.activeGroups'),
      value: 0,
      icon: Users,
      description: t('dashboard.ministriesAndGroups'),
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: t('dashboard.publishedContent'),
      value: 0,
      icon: BookOpen,
      description: t('dashboard.articlesAndSermons'),
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className=\"space-y-6\">\n      {/* Header */}\n      <div>\n        <h1 className=\"text-3xl font-bold text-gray-900\">{t('dashboard.title')}</h1>\n        <p className=\"text-gray-600 mt-1\">\n          {t('dashboard.welcome', { name: user?.full_name, church: church?.name })}\n        </p>\n      </div>\n\n      {/* Stats Grid */}\n      {isLoading ? (\n        <div className=\"text-center py-12\">\n          <Loader2 className=\"h-12 w-12 animate-spin text-blue-600 mx-auto mb-4\" />\n          <p className=\"text-gray-600\">{t('common.loading')}</p>\n        </div>\n      ) : (\n        <div className=\"grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6\">\n          {statCards.map((stat, index) => {\n            const Icon = stat.icon;\n            return (\n              <Card key={index} className=\"hover:shadow-lg transition-shadow\">\n                <CardHeader className=\"flex flex-row items-center justify-between space-y-0 pb-2\">\n                  <CardTitle className=\"text-sm font-medium\">\n                    {stat.title}\n                  </CardTitle>\n                  <div className={`${stat.bgColor} p-2 rounded-lg`}>\n                    <Icon className={`h-5 w-5 ${stat.color}`} />\n                  </div>\n                </CardHeader>\n                <CardContent>\n                  <div className=\"text-2xl font-bold\">{stat.value}</div>\n                  <p className=\"text-xs text-gray-600 mt-1\">\n                    {stat.description}\n                  </p>\n                </CardContent>\n              </Card>\n            );\n          })}\n        </div>\n      )}\n\n      {/* Quick Actions */}\n      <Card>\n        <CardHeader>\n          <CardTitle>{t('dashboard.quickActions')}</CardTitle>\n          <CardDescription>\n            {t('dashboard.commonTasks')}\n          </CardDescription>\n        </CardHeader>\n        <CardContent>\n          <div className=\"grid grid-cols-1 md:grid-cols-3 gap-4\">\n            <button className=\"p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors\">\n              <Users className=\"h-6 w-6 text-blue-600 mb-2\" />\n              <h3 className=\"font-semibold\">{t('dashboard.addNewMember')}</h3>\n              <p className=\"text-sm text-gray-600\">{t('dashboard.registerMember')}</p>\n            </button>\n            <button className=\"p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors\">\n              <Calendar className=\"h-6 w-6 text-green-600 mb-2\" />\n              <h3 className=\"font-semibold\">{t('dashboard.createEvent')}</h3>\n              <p className=\"text-sm text-gray-600\">{t('dashboard.scheduleEvent')}</p>\n            </button>\n            <button className=\"p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors\">\n              <Heart className=\"h-6 w-6 text-pink-600 mb-2\" />\n              <h3 className=\"font-semibold\">{t('dashboard.viewPrayerRequests')}</h3>\n              <p className=\"text-sm text-gray-600\">{t('dashboard.managePrayerRequests')}</p>\n            </button>\n          </div>\n        </CardContent>\n      </Card>\n\n      {/* Recent Activity Placeholder */}\n      <Card>\n        <CardHeader>\n          <CardTitle>{t('dashboard.recentActivity')}</CardTitle>\n          <CardDescription>\n            {t('dashboard.latestUpdates')}\n          </CardDescription>\n        </CardHeader>\n        <CardContent>\n          <div className=\"text-center py-8 text-gray-500\">\n            <Award className=\"h-12 w-12 mx-auto mb-4 text-gray-400\" />\n            <p>{t('dashboard.noActivity')}</p>\n            <p className=\"text-sm mt-1\">{t('dashboard.activityWillAppear')}</p>\n          </div>\n        </CardContent>\n      </Card>\n    </div>\n  );\n}

  const statCards = [
    {
      title: 'Total Members',
      value: stats.totalMembers,
      icon: Users,
      description: 'Active church members',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Upcoming Events',
      value: stats.upcomingEvents,
      icon: Calendar,
      description: 'Scheduled events',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Prayer Requests',
      value: stats.prayerRequests,
      icon: Heart,
      description: 'Active requests',
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
    },
    {
      title: 'Total Donations',
      value: `$${stats.totalDonations.toLocaleString()}`,
      icon: DollarSign,
      description: 'This month',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: 'Active Groups',
      value: stats.activeGroups,
      icon: Users,
      description: 'Ministries & small groups',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Published Content',
      value: stats.publishedContent,
      icon: BookOpen,
      description: 'Articles & sermons',
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Welcome back, {user?.full_name} • {church?.name}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-gray-600 mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks you can perform
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors">
              <Users className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-semibold">Add New Member</h3>
              <p className="text-sm text-gray-600">Register a new church member</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors">
              <Calendar className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-semibold">Create Event</h3>
              <p className="text-sm text-gray-600">Schedule a new church event</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors">
              <Heart className="h-6 w-6 text-pink-600 mb-2" />
              <h3 className="font-semibold">View Prayer Requests</h3>
              <p className="text-sm text-gray-600">Manage prayer requests</p>
            </button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>
            Latest updates from your church
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No recent activity to display</p>
            <p className="text-sm mt-1">Activity will appear here as you use the system</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
