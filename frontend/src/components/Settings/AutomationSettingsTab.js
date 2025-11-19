import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useEvaluateAllRules } from '../../hooks/useStatusAutomation';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Loader2, PlayCircle, Clock, CheckCircle2 } from 'lucide-react';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';

export default function AutomationSettingsTab() {
  const { church } = useAuth();
  const evaluateAll = useEvaluateAllRules();
  const [settings, setSettings] = useState({
    enabled: false,
    schedule: '00:00',
    lastRun: null,
  });

  const handleRunNow = () => {
    if (window.confirm('Run status automation now for all members?')) {
      evaluateAll.mutate();
    }
  };

  const handleSave = () => {
    // TODO: Implement save to church settings API
    console.log('Saving settings:', settings);
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
                  When enabled, member statuses will be automatically updated based on rules
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schedule">Daily Schedule (24h format)</Label>
              <Input
                id="schedule"
                type="time"
                value={settings.schedule}
                onChange={(e) => setSettings({ ...settings, schedule: e.target.value })}
                disabled={!settings.enabled}
              />
              <p className="text-xs text-gray-500">
                Automation will run daily at this time
              </p>
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
