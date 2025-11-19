import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEvaluateAllRules } from '../../hooks/useStatusAutomation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsAPI } from '../../services/api';
import { queryKeys } from '../../lib/react-query';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2, PlayCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';

export default function AutomationSettingsTab() {
  const { church } = useAuth();
  const queryClient = useQueryClient();
  const evaluateAll = useEvaluateAllRules();

  // Fetch church settings
  const { data: churchSettings, isLoading } = useQuery({
    queryKey: queryKeys.settings.churchSettings(church?.id),
    queryFn: () => settingsAPI.getChurchSettings().then(res => res.data),
    enabled: !!church?.id,
  });

  const [settings, setSettings] = useState({
    enabled: false,
    schedule: '00:00',
    lastRun: null,
  });

  useEffect(() => {
    if (churchSettings) {
      setSettings({
        enabled: churchSettings.status_automation_enabled || false,
        schedule: churchSettings.status_automation_schedule || '00:00',
        lastRun: churchSettings.last_status_automation_run || null,
      });
    }
  }, [churchSettings]);

  const updateSettings = useMutation({
    mutationFn: (data) => settingsAPI.updateChurchSettings(data).then(res => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.churchSettings(church?.id) });
      toast.success('Automation settings updated successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.detail || 'Failed to update settings');
    },
  });

  const handleRunNow = () => {
    if (window.confirm('Run status automation now for all members?')) {
      evaluateAll.mutate();
    }
  };

  const handleSave = () => {
    updateSettings.mutate({
      status_automation_enabled: settings.enabled,
      status_automation_schedule: settings.schedule,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Automation Settings</h2>
        <p className="text-sm text-gray-500">Configure automatic member status updates</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Automation Status</CardTitle>
          <CardDescription>
            Current automation configuration and status
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Automation Status</p>
                <p className="text-sm text-gray-500">Automatic status updates</p>
              </div>
            </div>
            <Badge variant={settings.enabled ? 'default' : 'secondary'}>
              {settings.enabled ? 'Enabled' : 'Disabled'}
            </Badge>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => setSettings({ ...settings, enabled })}
              />
              <div className="flex-1">
                <Label>Enable Automatic Status Updates</Label>
                <p className="text-xs text-gray-500 mt-1">
                  When enabled, member statuses will be automatically updated daily at midnight UTC
                </p>
              </div>
            </div>

            {settings.lastRun && (
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium text-green-900">Last Run</p>
                    <p className="text-sm text-green-700">
                      {new Date(settings.lastRun).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="space-y-2">
                <p className="text-sm font-medium text-blue-900">Automation Schedule</p>
                <p className="text-sm text-blue-700">
                  Automation runs <strong>once daily at midnight (00:00 UTC)</strong> for all churches with automation enabled.
                </p>
                <p className="text-xs text-blue-600">
                  💡 Tip: Use the "Run Now" button below to test rules immediately or run automation on-demand.
                </p>
              </div>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleSave}>
                Save Settings
              </Button>
              <Button variant="outline" onClick={handleRunNow} disabled={evaluateAll.isPending}>
                {evaluateAll.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <PlayCircle className="h-4 w-4 mr-2" />
                    Run Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h4 className="font-medium">1. Rules Evaluation</h4>
            <p className="text-sm text-gray-600">
              The system evaluates all enabled rules against each active member.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">2. Status Updates</h4>
            <p className="text-sm text-gray-600">
              If a member matches a rule's conditions, their status is automatically updated.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">3. Conflict Detection</h4>
            <p className="text-sm text-gray-600">
              If multiple rules match with different target statuses, the system creates a conflict for manual review.
            </p>
          </div>
          <div className="space-y-2">
            <h4 className="font-medium">4. History Logging</h4>
            <p className="text-sm text-gray-600">
              All status changes are logged with timestamps and attribution for audit trail.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
