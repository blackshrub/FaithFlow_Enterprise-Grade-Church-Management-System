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
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          {t('app.welcomeTo')} <span className="text-blue-600">{t('app.name')}</span>
        </h1>
        <p className="text-gray-600 mt-1">
          {t('dashboard.welcome', { name: user?.full_name, church: church?.name })}
        </p>
        <p className="text-sm text-gray-500 mt-1">
          {t('app.empoweringYourChurch')}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">{t('common.loading')}</p>
        </div>
      ) : (
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
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.quickActions')}</CardTitle>
          <CardDescription>
            {t('dashboard.commonTasks')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors">
              <Users className="h-6 w-6 text-blue-600 mb-2" />
              <h3 className="font-semibold">{t('dashboard.addNewMember')}</h3>
              <p className="text-sm text-gray-600">{t('dashboard.registerMember')}</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors">
              <Calendar className="h-6 w-6 text-green-600 mb-2" />
              <h3 className="font-semibold">{t('dashboard.createEvent')}</h3>
              <p className="text-sm text-gray-600">{t('dashboard.scheduleEvent')}</p>
            </button>
            <button className="p-4 border rounded-lg hover:bg-gray-50 text-left transition-colors">
              <Heart className="h-6 w-6 text-pink-600 mb-2" />
              <h3 className="font-semibold">{t('dashboard.viewPrayerRequests')}</h3>
              <p className="text-sm text-gray-600">{t('dashboard.managePrayerRequests')}</p>
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t('dashboard.recentActivity')}</CardTitle>
          <CardDescription>
            {t('dashboard.latestUpdates')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>{t('dashboard.noActivity')}</p>
            <p className="text-sm mt-1">{t('dashboard.activityWillAppear')}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
