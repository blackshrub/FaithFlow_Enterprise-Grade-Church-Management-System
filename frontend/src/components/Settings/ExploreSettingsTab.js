import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChurchSettings, useUpdateChurchSettings } from '../../hooks/useSettings';
import { useToast } from '../../hooks/use-toast';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Loader2, Save, Sparkles } from 'lucide-react';

export default function ExploreSettingsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { data: settings, isLoading, isSuccess } = useChurchSettings();
  const updateSettings = useUpdateChurchSettings();

  const [formData, setFormData] = useState({
    explore_enabled: false,
    explore_features: {
      daily_devotion: true,
      verse_of_the_day: true,
      bible_figure_of_the_day: true,
      daily_quiz: true,
      bible_study: true,
      topical_verses: true,
      devotion_plans: true,
    },
    explore_allow_church_content: false,
  });

  useEffect(() => {
    if (isSuccess && settings) {
      setFormData({
        explore_enabled: settings.explore_enabled ?? false,
        explore_features: settings.explore_features ?? {
          daily_devotion: true,
          verse_of_the_day: true,
          bible_figure_of_the_day: true,
          daily_quiz: true,
          bible_study: true,
          topical_verses: true,
          devotion_plans: true,
        },
        explore_allow_church_content: settings.explore_allow_church_content ?? false,
      });
    }
  }, [isSuccess, settings]);

  const handleSave = () => {
    updateSettings.mutate(formData, {
      onSuccess: () => {
        toast({
          title: 'Explore Settings Saved',
          description: 'Explore settings have been updated successfully',
          variant: 'default'
        });
      },
      onError: (error) => {
        toast({
          title: 'Error',
          description: error?.response?.data?.detail || 'Failed to save Explore settings',
          variant: 'destructive'
        });
      }
    });
  };

  const handleFeatureToggle = (feature) => {
    setFormData(prev => ({
      ...prev,
      explore_features: {
        ...prev.explore_features,
        [feature]: !prev.explore_features[feature]
      }
    }));
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Explore Feature Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-600" />
            <CardTitle>Explore Feature</CardTitle>
          </div>
          <CardDescription>
            Enable the Explore feature for your church members. This provides daily devotions, Bible studies, quizzes, and more through the mobile app.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="text-base">Enable Explore</Label>
              <div className="text-sm text-gray-500">
                Turn on the Explore feature for your members
              </div>
            </div>
            <Switch
              checked={formData.explore_enabled}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, explore_enabled: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Content Features */}
      {formData.explore_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Content Features</CardTitle>
            <CardDescription>
              Choose which types of content are available to your members
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Devotion</Label>
                <div className="text-sm text-gray-500">Daily spiritual reflections</div>
              </div>
              <Switch
                checked={formData.explore_features.daily_devotion}
                onCheckedChange={() => handleFeatureToggle('daily_devotion')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Verse of the Day</Label>
                <div className="text-sm text-gray-500">Daily Bible verses with commentary</div>
              </div>
              <Switch
                checked={formData.explore_features.verse_of_the_day}
                onCheckedChange={() => handleFeatureToggle('verse_of_the_day')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bible Figure of the Day</Label>
                <div className="text-sm text-gray-500">Learn about biblical characters</div>
              </div>
              <Switch
                checked={formData.explore_features.bible_figure_of_the_day}
                onCheckedChange={() => handleFeatureToggle('bible_figure_of_the_day')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Quiz</Label>
                <div className="text-sm text-gray-500">Test biblical knowledge</div>
              </div>
              <Switch
                checked={formData.explore_features.daily_quiz}
                onCheckedChange={() => handleFeatureToggle('daily_quiz')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Bible Studies</Label>
                <div className="text-sm text-gray-500">In-depth study materials</div>
              </div>
              <Switch
                checked={formData.explore_features.bible_study}
                onCheckedChange={() => handleFeatureToggle('bible_study')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Topical Verses</Label>
                <div className="text-sm text-gray-500">Verses organized by topic</div>
              </div>
              <Switch
                checked={formData.explore_features.topical_verses}
                onCheckedChange={() => handleFeatureToggle('topical_verses')}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Devotion Plans</Label>
                <div className="text-sm text-gray-500">Multi-day devotional series</div>
              </div>
              <Switch
                checked={formData.explore_features.devotion_plans}
                onCheckedChange={() => handleFeatureToggle('devotion_plans')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Church-Specific Content */}
      {formData.explore_enabled && (
        <Card>
          <CardHeader>
            <CardTitle>Church-Specific Content</CardTitle>
            <CardDescription>
              Allow your church to create and manage custom content
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base">Enable Church Content</Label>
                <div className="text-sm text-gray-500">
                  Allow creating church-specific devotions and content that only your members can see
                </div>
              </div>
              <Switch
                checked={formData.explore_allow_church_content}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, explore_allow_church_content: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateSettings.isPending}
          className="min-w-32"
        >
          {updateSettings.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
