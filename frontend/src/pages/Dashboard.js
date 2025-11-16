import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { membersAPI } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Users, Calendar, Heart, DollarSign, BookOpen, Award } from 'lucide-react';

export default function Dashboard() {
  const { user, church } = useAuth();
  const [stats, setStats] = useState({
    totalMembers: 0,
    upcomingEvents: 0,
    prayerRequests: 0,
    totalDonations: 0,
    activeGroups: 0,
    publishedContent: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      // Fetch member stats
      const memberResponse = await membersAPI.getStats();
      setStats(prev => ({
        ...prev,
        totalMembers: memberResponse.data.total_members || 0
      }));
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

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
