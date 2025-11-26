import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Textarea } from '../../components/ui/textarea';
import { Switch } from '../../components/ui/switch';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../../components/ui/tabs';
import {
  ArrowLeft, Save, Loader2, Settings as SettingsIcon, Globe, Bell,
  Users, Sparkles, Calendar, Shield, Info
} from 'lucide-react';
import exploreService from '../../services/exploreService';
import { useToast } from '../../hooks/use-toast';
import { useAuth } from '../../context/AuthContext';

export default function ChurchSettings() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  const isSuperAdmin = user?.role === 'super_admin';

  const [formData, setFormData] = useState({
    // Feature Settings
    enabled: true,
    visible_to_members: true,
    require_authentication: false,

    // Content Settings
    default_language: 'en',
    languages_enabled: ['en', 'id'],
    content_adoption_mode: 'automatic', // automatic, manual, custom
    auto_adopt_new_content: true,

    // Scheduling Settings
    schedule_timezone: 'UTC',
    daily_content_time: '06:00',
    weekend_schedule_enabled: true,

    // AI Generation Settings (Church-level)
    ai_generation_enabled: true,
    ai_model_preference: 'claude-3-5-sonnet-20241022',
    ai_auto_publish: false,
    ai_review_required: true,

    // Engagement Settings
    streaks_enabled: true,
    celebrations_enabled: true,
    progress_tracking_enabled: true,
    leaderboard_enabled: false,

    // Notification Settings
    daily_reminder_enabled: true,
    daily_reminder_time: '07:00',
    streak_reminder_enabled: true,
    new_content_notification: false,

    // Advanced Settings
    cache_duration_minutes: 60,
    analytics_enabled: true,
    custom_branding_enabled: false,
    custom_welcome_message: '',
  });

  // Fetch church settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['explore', 'church-settings'],
    queryFn: () => isSuperAdmin
      ? exploreService.getPlatformSettings()
      : exploreService.getChurchSettings(),
    staleTime: 60000,
  });

  // Update form when settings load
  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        ...settings,
      }));
    }
  }, [settings]);

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: (data) => isSuperAdmin
      ? exploreService.updatePlatformSettings(data)
      : exploreService.updateChurchSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['explore', 'church-settings']);
      toast({
        title: 'Settings Saved',
        description: 'Explore settings have been updated successfully',
      });
    },
    onError: (error) => {
      toast({
        title: 'Save Failed',
        description: error.message || 'Failed to save settings',
        variant: 'destructive',
      });
    },
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleArrayToggle = (field, value) => {
    setFormData(prev => {
      const array = prev[field] || [];
      const newArray = array.includes(value)
        ? array.filter(item => item !== value)
        : [...array, value];
      return { ...prev, [field]: newArray };
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <SettingsIcon className="h-8 w-8 text-gray-700" />
            {isSuperAdmin ? 'Platform Settings' : 'Church Settings'}
          </h1>
          <p className="text-gray-600 mt-1">
            Configure Explore feature settings {isSuperAdmin ? 'for the platform' : 'for your church'}
          </p>
        </div>
        <Button
          onClick={handleSubmit}
          disabled={saveMutation.isPending}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {saveMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Settings
            </>
          )}
        </Button>
      </div>

      {isSuperAdmin && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Super Admin Mode
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  These settings apply platform-wide. Individual churches can override some settings.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="general" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="general">
              <SettingsIcon className="h-4 w-4 mr-2" />
              General
            </TabsTrigger>
            <TabsTrigger value="content">
              <Globe className="h-4 w-4 mr-2" />
              Content
            </TabsTrigger>
            <TabsTrigger value="scheduling">
              <Calendar className="h-4 w-4 mr-2" />
              Scheduling
            </TabsTrigger>
            <TabsTrigger value="ai">
              <Sparkles className="h-4 w-4 mr-2" />
              AI
            </TabsTrigger>
            <TabsTrigger value="engagement">
              <Users className="h-4 w-4 mr-2" />
              Engagement
            </TabsTrigger>
            <TabsTrigger value="notifications">
              <Bell className="h-4 w-4 mr-2" />
              Notifications
            </TabsTrigger>
          </TabsList>

          {/* General Settings */}
          <TabsContent value="general" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Feature Status</CardTitle>
                <CardDescription>Control Explore feature availability</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Explore Feature</Label>
                    <p className="text-sm text-gray-500">
                      Make Explore feature available to users
                    </p>
                  </div>
                  <Switch
                    checked={formData.enabled}
                    onCheckedChange={(checked) => handleChange('enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Visible to Members</Label>
                    <p className="text-sm text-gray-500">
                      Show Explore tab in mobile app
                    </p>
                  </div>
                  <Switch
                    checked={formData.visible_to_members}
                    onCheckedChange={(checked) => handleChange('visible_to_members', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Require Authentication</Label>
                    <p className="text-sm text-gray-500">
                      Users must log in to access content
                    </p>
                  </div>
                  <Switch
                    checked={formData.require_authentication}
                    onCheckedChange={(checked) => handleChange('require_authentication', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Custom Branding</CardTitle>
                <CardDescription>Personalize the Explore experience</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable Custom Branding</Label>
                    <p className="text-sm text-gray-500">
                      Use custom welcome message and colors
                    </p>
                  </div>
                  <Switch
                    checked={formData.custom_branding_enabled}
                    onCheckedChange={(checked) => handleChange('custom_branding_enabled', checked)}
                  />
                </div>

                {formData.custom_branding_enabled && (
                  <div className="space-y-2">
                    <Label>Welcome Message</Label>
                    <Textarea
                      placeholder="Enter a custom welcome message for your church members..."
                      value={formData.custom_welcome_message}
                      onChange={(e) => handleChange('custom_welcome_message', e.target.value)}
                      rows={3}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Content Settings */}
          <TabsContent value="content" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Language Settings</CardTitle>
                <CardDescription>Configure available languages</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Default Language</Label>
                  <Select
                    value={formData.default_language}
                    onValueChange={(value) => handleChange('default_language', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="id">Indonesian</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Enabled Languages</Label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.languages_enabled?.includes('en')}
                        onChange={() => handleArrayToggle('languages_enabled', 'en')}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">English</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={formData.languages_enabled?.includes('id')}
                        onChange={() => handleArrayToggle('languages_enabled', 'id')}
                        className="rounded border-gray-300"
                      />
                      <span className="text-sm">Indonesian (Bahasa Indonesia)</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Content Adoption</CardTitle>
                <CardDescription>
                  {isSuperAdmin
                    ? 'Default adoption mode for churches'
                    : 'How your church adopts platform content'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Adoption Mode</Label>
                  <Select
                    value={formData.content_adoption_mode}
                    onValueChange={(value) => handleChange('content_adoption_mode', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="automatic">Automatic - Use all platform content</SelectItem>
                      <SelectItem value="manual">Manual - Curate content individually</SelectItem>
                      <SelectItem value="custom">Custom - Create own content only</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500">
                    {formData.content_adoption_mode === 'automatic' &&
                      'All platform content is automatically available to your church'}
                    {formData.content_adoption_mode === 'manual' &&
                      'You choose which platform content to adopt'}
                    {formData.content_adoption_mode === 'custom' &&
                      'Only your church-created content is used'}
                  </p>
                </div>

                {formData.content_adoption_mode !== 'custom' && (
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Auto-Adopt New Content</Label>
                      <p className="text-sm text-gray-500">
                        Automatically adopt newly published platform content
                      </p>
                    </div>
                    <Switch
                      checked={formData.auto_adopt_new_content}
                      onCheckedChange={(checked) => handleChange('auto_adopt_new_content', checked)}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Scheduling Settings */}
          <TabsContent value="scheduling" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Scheduling Preferences</CardTitle>
                <CardDescription>Configure content scheduling defaults</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Timezone</Label>
                  <Select
                    value={formData.schedule_timezone}
                    onValueChange={(value) => handleChange('schedule_timezone', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC (Coordinated Universal Time)</SelectItem>
                      <SelectItem value="America/New_York">EST (Eastern Time)</SelectItem>
                      <SelectItem value="America/Chicago">CST (Central Time)</SelectItem>
                      <SelectItem value="America/Denver">MST (Mountain Time)</SelectItem>
                      <SelectItem value="America/Los_Angeles">PST (Pacific Time)</SelectItem>
                      <SelectItem value="Asia/Jakarta">WIB (Jakarta)</SelectItem>
                      <SelectItem value="Asia/Singapore">SGT (Singapore)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Daily Content Time</Label>
                  <Input
                    type="time"
                    value={formData.daily_content_time}
                    onChange={(e) => handleChange('daily_content_time', e.target.value)}
                  />
                  <p className="text-xs text-gray-500">
                    When daily content becomes available to users
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Weekend Schedule</Label>
                    <p className="text-sm text-gray-500">
                      Enable content on Saturdays and Sundays
                    </p>
                  </div>
                  <Switch
                    checked={formData.weekend_schedule_enabled}
                    onCheckedChange={(checked) => handleChange('weekend_schedule_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Content Generation</CardTitle>
                <CardDescription>
                  {isSuperAdmin
                    ? 'Platform-wide AI generation settings'
                    : 'AI settings for your church'}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Enable AI Generation</Label>
                    <p className="text-sm text-gray-500">
                      Allow AI-powered content creation
                    </p>
                  </div>
                  <Switch
                    checked={formData.ai_generation_enabled}
                    onCheckedChange={(checked) => handleChange('ai_generation_enabled', checked)}
                  />
                </div>

                {formData.ai_generation_enabled && (
                  <>
                    <div className="space-y-2">
                      <Label>Preferred AI Model</Label>
                      <Select
                        value={formData.ai_model_preference}
                        onValueChange={(value) => handleChange('ai_model_preference', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="claude-3-5-sonnet-20241022">
                            Claude 3.5 Sonnet (Recommended)
                          </SelectItem>
                          <SelectItem value="claude-3-opus-20240229">
                            Claude 3 Opus (Most Capable)
                          </SelectItem>
                          <SelectItem value="claude-3-haiku-20240307">
                            Claude 3 Haiku (Fastest)
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Auto-Publish AI Content</Label>
                        <p className="text-sm text-gray-500">
                          Automatically publish approved AI-generated content
                        </p>
                      </div>
                      <Switch
                        checked={formData.ai_auto_publish}
                        onCheckedChange={(checked) => handleChange('ai_auto_publish', checked)}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Review Required</Label>
                        <p className="text-sm text-gray-500">
                          Require manual review before AI content is published
                        </p>
                      </div>
                      <Switch
                        checked={formData.ai_review_required}
                        onCheckedChange={(checked) => handleChange('ai_review_required', checked)}
                      />
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Engagement Settings */}
          <TabsContent value="engagement" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>User Engagement Features</CardTitle>
                <CardDescription>Enable gamification and tracking</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily Streaks</Label>
                    <p className="text-sm text-gray-500">
                      Track consecutive days of engagement
                    </p>
                  </div>
                  <Switch
                    checked={formData.streaks_enabled}
                    onCheckedChange={(checked) => handleChange('streaks_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Celebrations</Label>
                    <p className="text-sm text-gray-500">
                      Show animations for milestones and achievements
                    </p>
                  </div>
                  <Switch
                    checked={formData.celebrations_enabled}
                    onCheckedChange={(checked) => handleChange('celebrations_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Progress Tracking</Label>
                    <p className="text-sm text-gray-500">
                      Track user progress through content
                    </p>
                  </div>
                  <Switch
                    checked={formData.progress_tracking_enabled}
                    onCheckedChange={(checked) => handleChange('progress_tracking_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Leaderboard</Label>
                    <p className="text-sm text-gray-500">
                      Show church-wide engagement leaderboard
                    </p>
                  </div>
                  <Switch
                    checked={formData.leaderboard_enabled}
                    onCheckedChange={(checked) => handleChange('leaderboard_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analytics Collection</Label>
                    <p className="text-sm text-gray-500">
                      Collect usage analytics and insights
                    </p>
                  </div>
                  <Switch
                    checked={formData.analytics_enabled}
                    onCheckedChange={(checked) => handleChange('analytics_enabled', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notification Settings */}
          <TabsContent value="notifications" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Configure user notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Daily Reminder</Label>
                    <p className="text-sm text-gray-500">
                      Send daily reminder to engage with content
                    </p>
                  </div>
                  <Switch
                    checked={formData.daily_reminder_enabled}
                    onCheckedChange={(checked) => handleChange('daily_reminder_enabled', checked)}
                  />
                </div>

                {formData.daily_reminder_enabled && (
                  <div className="space-y-2 ml-6">
                    <Label>Reminder Time</Label>
                    <Input
                      type="time"
                      value={formData.daily_reminder_time}
                      onChange={(e) => handleChange('daily_reminder_time', e.target.value)}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Streak Reminder</Label>
                    <p className="text-sm text-gray-500">
                      Remind users when their streak is at risk
                    </p>
                  </div>
                  <Switch
                    checked={formData.streak_reminder_enabled}
                    onCheckedChange={(checked) => handleChange('streak_reminder_enabled', checked)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>New Content Notification</Label>
                    <p className="text-sm text-gray-500">
                      Notify when new content is published
                    </p>
                  </div>
                  <Switch
                    checked={formData.new_content_notification}
                    onCheckedChange={(checked) => handleChange('new_content_notification', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      WhatsApp Notifications
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      All notifications are sent via WhatsApp as per FaithFlow's communication system.
                      Users can manage their notification preferences in their profile settings.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Sticky Save Button at Bottom */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {saveMutation.isSuccess ? (
                <span className="text-green-600">✓ Settings saved successfully</span>
              ) : (
                'Make changes to configure Explore feature'
              )}
            </p>
            <Button
              type="submit"
              disabled={saveMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save All Settings
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
