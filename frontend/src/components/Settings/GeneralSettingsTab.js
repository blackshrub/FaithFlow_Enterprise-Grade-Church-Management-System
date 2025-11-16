import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChurchSettings, useUpdateChurchSettings } from '../../hooks/useSettings';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Loader2, Save } from 'lucide-react';

export default function GeneralSettingsTab() {
  const { t } = useTranslation();
  const { data: settings, isLoading } = useChurchSettings();
  const updateSettings = useUpdateChurchSettings();
  
  const [formData, setFormData] = useState({
    date_format: 'DD-MM-YYYY',
    time_format: '24h',
    currency: 'USD',
    timezone: 'UTC',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        date_format: settings.date_format || 'DD-MM-YYYY',
        time_format: settings.time_format || '24h',
        currency: settings.currency || 'USD',
        timezone: settings.timezone || 'UTC',
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="text-center py-8">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
        <p className="text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">{t('settings.generalSettings')}</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t('settings.displayPreferences')}</CardTitle>
          <CardDescription>
            {t('settings.displayPreferencesDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>{t('settings.dateFormat')}</Label>
            <Select 
              value={formData.date_format} 
              onValueChange={(value) => setFormData({ ...formData, date_format: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD-MM-YYYY">DD-MM-YYYY (31-12-2025)</SelectItem>
                <SelectItem value="MM-DD-YYYY">MM-DD-YYYY (12-31-2025)</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD (2025-12-31)</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500">{t('settings.dateFormatDesc')}</p>
          </div>

          <div className="space-y-2">
            <Label>{t('settings.timeFormat')}</Label>
            <Select 
              value={formData.time_format} 
              onValueChange={(value) => setFormData({ ...formData, time_format: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="12h">12-hour (1:30 PM)</SelectItem>
                <SelectItem value="24h">24-hour (13:30)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('settings.currency')}</Label>
            <Select 
              value={formData.currency} 
              onValueChange={(value) => setFormData({ ...formData, currency: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD ($)</SelectItem>
                <SelectItem value="IDR">IDR (Rp)</SelectItem>
                <SelectItem value="EUR">EUR (€)</SelectItem>
                <SelectItem value="GBP">GBP (£)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t('settings.timezone')}</Label>
            <Select 
              value={formData.timezone} 
              onValueChange={(value) => setFormData({ ...formData, timezone: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UTC">UTC</SelectItem>
                <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                <SelectItem value="America/New_York">America/New York (EST)</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="pt-4">
            <Button 
              onClick={handleSave} 
              disabled={updateSettings.isPending}
              className="w-full sm:w-auto"
            >
              {updateSettings.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t('common.loading')}
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
