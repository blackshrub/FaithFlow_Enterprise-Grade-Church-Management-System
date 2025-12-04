import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Progress } from '../../components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Search, Users, Brain, BookOpen, Target, TrendingUp,
  Calendar, Award, Heart, Loader2, ChevronRight, User,
  BarChart3, PieChart, Activity, Sparkles, Filter
} from 'lucide-react';
import {
  useProfileAnalytics, useProfileAggregates, useTopEngagers,
  useGrowthIndicators
} from '../../hooks/useExplore';

// Growth level styling
const growthLevelStyles = {
  beginner: { bg: 'bg-green-100', text: 'text-green-800', label: 'Beginner' },
  growing: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Growing' },
  established: { bg: 'bg-purple-100', text: 'text-purple-800', label: 'Established' },
  mature: { bg: 'bg-amber-100', text: 'text-amber-800', label: 'Mature' },
  leader: { bg: 'bg-indigo-100', text: 'text-indigo-800', label: 'Leader' },
};

// Life situation icons
const lifeSituationIcons = {
  student: '🎓',
  working_professional: '💼',
  parent: '👨‍👩‍👧',
  retired: '🏖️',
  new_believer: '🌱',
  returning_to_faith: '🔄',
  seeking: '🔍',
  grief: '💔',
  career_transition: '🔀',
};

export default function ProfileAnalytics() {
  const { t } = useTranslation();

  const [searchQuery, setSearchQuery] = useState('');
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedProfile, setSelectedProfile] = useState(null);

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useProfileAnalytics(timeRange);
  const { data: aggregates, isLoading: aggregatesLoading } = useProfileAggregates();
  const { data: topEngagers, isLoading: engagersLoading } = useTopEngagers(10);
  const { data: growthData, isLoading: growthLoading } = useGrowthIndicators(timeRange);

  const isLoading = analyticsLoading || aggregatesLoading;

  // Filter top engagers by search
  const filteredEngagers = (topEngagers?.users || []).filter(user => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.name?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Brain className="h-6 w-6" />
            Spiritual Profile Analytics
          </h1>
          <p className="text-gray-600">
            Insights into your congregation's spiritual journey and growth patterns
          </p>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
            <SelectItem value="90d">Last 90 days</SelectItem>
            <SelectItem value="all">All time</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {aggregates?.total_profiles || 0}
                    </div>
                    <p className="text-sm text-gray-500">Active Profiles</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <Target className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {aggregates?.onboarding_completed || 0}%
                    </div>
                    <p className="text-sm text-gray-500">Onboarding Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Activity className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {aggregates?.avg_engagement_score?.toFixed(1) || 0}
                    </div>
                    <p className="text-sm text-gray-500">Avg Engagement</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <Award className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900">
                      {aggregates?.avg_streak || 0}
                    </div>
                    <p className="text-sm text-gray-500">Avg Streak Days</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Charts */}
            <div className="lg:col-span-2 space-y-6">
              {/* Growth Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Spiritual Growth Distribution
                  </CardTitle>
                  <CardDescription>
                    Members categorized by spiritual maturity level
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(growthLevelStyles).map(([level, style]) => {
                      const count = aggregates?.growth_distribution?.[level] || 0;
                      const total = aggregates?.total_profiles || 1;
                      const percentage = ((count / total) * 100).toFixed(1);

                      return (
                        <div key={level} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`${style.bg} ${style.text}`}>
                                {style.label}
                              </Badge>
                              <span className="text-sm text-gray-600">
                                {count} members
                              </span>
                            </div>
                            <span className="text-sm font-medium">{percentage}%</span>
                          </div>
                          <Progress value={parseFloat(percentage)} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Interest Topics */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5" />
                    Top Interest Topics
                  </CardTitle>
                  <CardDescription>
                    Most popular content topics among your members
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {(analytics?.top_topics || []).slice(0, 8).map((topic, index) => (
                      <div
                        key={topic.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                      >
                        <span className="text-lg font-semibold text-gray-400">
                          #{index + 1}
                        </span>
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{topic.name}</div>
                          <div className="text-sm text-gray-500">
                            {topic.interested_count} interested
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-blue-600">
                            {topic.engagement_rate}%
                          </div>
                          <div className="text-xs text-gray-400">engagement</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Life Situations */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Life Situations
                  </CardTitle>
                  <CardDescription>
                    Current life circumstances of your congregation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    {(analytics?.life_situations || []).map((situation) => (
                      <div
                        key={situation.id}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-full"
                      >
                        <span className="text-lg">
                          {lifeSituationIcons[situation.id] || '📍'}
                        </span>
                        <span className="font-medium">{situation.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {situation.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Content Engagement */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Content Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <div className="text-3xl font-bold text-blue-600">
                        {analytics?.content_engagement?.devotions_read || 0}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Devotions Read</div>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <div className="text-3xl font-bold text-green-600">
                        {analytics?.content_engagement?.quizzes_completed || 0}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Quizzes Completed</div>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <div className="text-3xl font-bold text-purple-600">
                        {analytics?.content_engagement?.studies_in_progress || 0}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">Studies In Progress</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Top Engagers */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Top Engagers
                    </CardTitle>
                  </div>
                  <div className="relative mt-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search members..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  {engagersLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredEngagers.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No members found
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredEngagers.map((user, index) => {
                        const levelStyle = growthLevelStyles[user.growth_level] || growthLevelStyles.beginner;

                        return (
                          <div
                            key={user.id}
                            className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedProfile(user)}
                          >
                            <div className="flex-shrink-0 w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              {index < 3 ? (
                                <span className="text-lg">
                                  {index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉'}
                                </span>
                              ) : (
                                <span className="text-sm font-medium text-gray-500">
                                  {index + 1}
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {user.name || 'Anonymous'}
                              </div>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Badge className={`${levelStyle.bg} ${levelStyle.text} text-xs`}>
                                  {levelStyle.label}
                                </Badge>
                                <span className="text-xs text-gray-400">
                                  🔥 {user.streak || 0} day streak
                                </span>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-blue-600">
                                {user.engagement_score?.toFixed(0) || 0}
                              </div>
                              <div className="text-xs text-gray-400">score</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Growth Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Growth Trends
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {growthLoading ? (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-green-100 rounded">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          </div>
                          <span className="text-sm font-medium">New Profiles</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-green-600">
                            +{growthData?.new_profiles || 0}
                          </div>
                          <div className="text-xs text-gray-500">this period</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-blue-100 rounded">
                            <Activity className="h-4 w-4 text-blue-600" />
                          </div>
                          <span className="text-sm font-medium">Active Users</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-blue-600">
                            {growthData?.active_users || 0}
                          </div>
                          <div className="text-xs text-gray-500">engaged users</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-purple-100 rounded">
                            <Target className="h-4 w-4 text-purple-600" />
                          </div>
                          <span className="text-sm font-medium">Journey Enrollments</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-purple-600">
                            +{growthData?.journey_enrollments || 0}
                          </div>
                          <div className="text-xs text-gray-500">new enrollments</div>
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 bg-amber-100 rounded">
                            <Award className="h-4 w-4 text-amber-600" />
                          </div>
                          <span className="text-sm font-medium">Completions</span>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-amber-600">
                            {growthData?.journey_completions || 0}
                          </div>
                          <div className="text-xs text-gray-500">journeys finished</div>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Insights */}
              <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-indigo-900">
                    <Sparkles className="h-5 w-5" />
                    Quick Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(analytics?.insights || [
                    'Most engaged time: Morning (6-9 AM)',
                    'Top content: Daily Devotions',
                    'Growing topic: Anxiety & Peace',
                    'Suggested focus: New believer journey',
                  ]).map((insight, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2" />
                      <p className="text-sm text-indigo-800">{insight}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        </>
      )}

      {/* Profile Detail Modal - Simplified inline for now */}
      {selectedProfile && (
        <Card className="fixed inset-y-4 right-4 w-96 z-50 shadow-2xl overflow-auto">
          <CardHeader className="border-b sticky top-0 bg-white z-10">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Member Profile
              </CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedProfile(null)}
              >
                &times;
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-6 space-y-4">
            <div className="text-center pb-4 border-b">
              <div className="w-16 h-16 bg-blue-100 rounded-full mx-auto flex items-center justify-center mb-3">
                <span className="text-2xl font-semibold text-blue-600">
                  {selectedProfile.name?.charAt(0) || '?'}
                </span>
              </div>
              <h3 className="font-semibold text-lg">{selectedProfile.name || 'Anonymous'}</h3>
              <p className="text-sm text-gray-500">{selectedProfile.email}</p>
              <div className="mt-2">
                <Badge className={`${
                  growthLevelStyles[selectedProfile.growth_level]?.bg || 'bg-gray-100'
                } ${
                  growthLevelStyles[selectedProfile.growth_level]?.text || 'text-gray-800'
                }`}>
                  {growthLevelStyles[selectedProfile.growth_level]?.label || 'Unknown'}
                </Badge>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Engagement Score</span>
                <span className="font-semibold">
                  {selectedProfile.engagement_score?.toFixed(1) || 0}
                </span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Current Streak</span>
                <span className="font-semibold">🔥 {selectedProfile.streak || 0} days</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Total Devotions</span>
                <span className="font-semibold">{selectedProfile.devotions_read || 0}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Quizzes Completed</span>
                <span className="font-semibold">{selectedProfile.quizzes_completed || 0}</span>
              </div>
            </div>

            {selectedProfile.interests?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Interests</h4>
                <div className="flex flex-wrap gap-1">
                  {selectedProfile.interests.map((interest) => (
                    <Badge key={interest} variant="outline">
                      {interest}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {selectedProfile.active_journeys?.length > 0 && (
              <div>
                <h4 className="font-medium text-gray-700 mb-2">Active Journeys</h4>
                <div className="space-y-2">
                  {selectedProfile.active_journeys.map((journey) => (
                    <div key={journey.id} className="p-2 bg-blue-50 rounded-lg text-sm">
                      <div className="font-medium">{journey.title}</div>
                      <div className="text-gray-500">
                        Week {journey.current_week}, Day {journey.current_day}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
