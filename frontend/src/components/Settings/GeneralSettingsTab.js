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
    default_language: 'en',
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        date_format: settings.date_format || 'DD-MM-YYYY',
        time_format: settings.time_format || '24h',
        currency: settings.currency || 'USD',
        timezone: settings.timezone || 'UTC',
        default_language: settings.default_language || 'en',
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
                <SelectItem value="USD">USD ($) - US Dollar</SelectItem>
                <SelectItem value="IDR">IDR (Rp) - Indonesian Rupiah</SelectItem>
                <SelectItem value="EUR">EUR (€) - Euro</SelectItem>
                <SelectItem value="GBP">GBP (£) - British Pound</SelectItem>
                <SelectItem value="JPY">JPY (¥) - Japanese Yen</SelectItem>
                <SelectItem value="CNY">CNY (¥) - Chinese Yuan</SelectItem>
                <SelectItem value="KRW">KRW (₩) - South Korean Won</SelectItem>
                <SelectItem value="SGD">SGD (S$) - Singapore Dollar</SelectItem>
                <SelectItem value="MYR">MYR (RM) - Malaysian Ringgit</SelectItem>
                <SelectItem value="THB">THB (฿) - Thai Baht</SelectItem>
                <SelectItem value="PHP">PHP (₱) - Philippine Peso</SelectItem>
                <SelectItem value="INR">INR (₹) - Indian Rupee</SelectItem>
                <SelectItem value="AUD">AUD (A$) - Australian Dollar</SelectItem>
                <SelectItem value="CAD">CAD (C$) - Canadian Dollar</SelectItem>
                <SelectItem value="NZD">NZD (NZ$) - New Zealand Dollar</SelectItem>
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
              <SelectContent className="max-h-[300px]">
                <SelectItem value="UTC">UTC - Coordinated Universal Time</SelectItem>
                <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB) - UTC+7</SelectItem>
                <SelectItem value="Asia/Makassar">Asia/Makassar (WITA) - UTC+8</SelectItem>
                <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT) - UTC+9</SelectItem>
                <SelectItem value="Asia/Singapore">Asia/Singapore (SGT) - UTC+8</SelectItem>
                <SelectItem value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (MYT) - UTC+8</SelectItem>
                <SelectItem value="Asia/Bangkok">Asia/Bangkok (ICT) - UTC+7</SelectItem>
                <SelectItem value="Asia/Manila">Asia/Manila (PHT) - UTC+8</SelectItem>
                <SelectItem value="Asia/Seoul">Asia/Seoul (KST) - UTC+9</SelectItem>
                <SelectItem value="Asia/Tokyo">Asia/Tokyo (JST) - UTC+9</SelectItem>
                <SelectItem value="Asia/Hong_Kong">Asia/Hong Kong (HKT) - UTC+8</SelectItem>
                <SelectItem value="Asia/Shanghai">Asia/Shanghai (CST) - UTC+8</SelectItem>
                <SelectItem value="Asia/Dubai">Asia/Dubai (GST) - UTC+4</SelectItem>
                <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST) - UTC+5:30</SelectItem>
                <SelectItem value="Australia/Sydney">Australia/Sydney (AEDT) - UTC+11</SelectItem>
                <SelectItem value="Pacific/Auckland">Pacific/Auckland (NZDT) - UTC+13</SelectItem>
                <SelectItem value="America/New_York">America/New York (EST) - UTC-5</SelectItem>
                <SelectItem value="America/Chicago">America/Chicago (CST) - UTC-6</SelectItem>
                <SelectItem value="America/Denver">America/Denver (MST) - UTC-7</SelectItem>
                <SelectItem value="America/Los_Angeles">America/Los Angeles (PST) - UTC-8</SelectItem>
                <SelectItem value="America/Toronto">America/Toronto (EST) - UTC-5</SelectItem>
                <SelectItem value="America/Sao_Paulo">America/Sao Paulo (BRT) - UTC-3</SelectItem>
                <SelectItem value="Europe/London">Europe/London (GMT) - UTC+0</SelectItem>
                <SelectItem value="Europe/Paris">Europe/Paris (CET) - UTC+1</SelectItem>
                <SelectItem value="Europe/Berlin">Europe/Berlin (CET) - UTC+1</SelectItem>
                <SelectItem value="Europe/Rome">Europe/Rome (CET) - UTC+1</SelectItem>
                <SelectItem value="Europe/Moscow">Europe/Moscow (MSK) - UTC+3</SelectItem>
                <SelectItem value="Africa/Cairo">Africa/Cairo (EET) - UTC+2</SelectItem>
                <SelectItem value="Africa/Johannesburg">Africa/Johannesburg (SAST) - UTC+2</SelectItem>
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
