/**
 * Kiosk Settings Page - Admin Configuration
 * 
 * Placed in Settings page as a new section
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Info } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { useToast } from '../../hooks/use-toast';
import kioskApi from '../../services/kioskApi';
import { useMemberStatuses } from '../../hooks/useSettings';

const KioskSettingsTab = () => {
  const { t } = useTranslation('kiosk');
  const { toast } = useToast();
  const { data: memberStatuses = [] } = useMemberStatuses();
  
  const [settings, setSettings] = useState({
    enable_kiosk: true,
    enable_event_registration: true,
    enable_prayer: true,
    enable_counseling: true,
    enable_groups: true,
    enable_profile_update: true,
    home_title: '',
    home_subtitle: '',
    previsitor_status_id: '',
    timeout_minutes: 2,
    otp_digits: 4,
    otp_resend_cooldown: 60
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    loadSettings();
  }, []);
  
  const loadSettings = async () => {
    try {
      const data = await kioskApi.getKioskSettings();
      if (data) {
        setSettings(prev => ({ ...prev, ...data }));
      }
    } catch (error) {
      console.error('Failed to load kiosk settings:', error);
    } finally {
      setLoading(false);
    }
  };
  
  const handleSave = async () => {
    setSaving(true);
    try {
      await kioskApi.updateKioskSettings(settings);
      toast({
        title: 'Success',
        description: t('settings.saved_toast')
      });
    } catch (error) {
      console.error('Save error:', error);
      toast({
        title: 'Error',
        description: 'Failed to save settings',
        variant: 'destructive'
      });
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="p-6 text-center">Loading...</div>;
  }
  
  return (
    <div className="space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t('settings.title')}</h2>
        <p className="text-gray-600">{t('settings.description')}</p>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Settings */}
        <div className="lg:col-span-2 space-y-6">
          {/* Service Toggles */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.services_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="enable_kiosk">{t('settings.enable_home_label')}</Label>
                <Switch
                  id="enable_kiosk"
                  checked={settings.enable_kiosk}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_kiosk: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable_event_registration">{t('settings.enable_event_registration_label')}</Label>
                <Switch
                  id="enable_event_registration"
                  checked={settings.enable_event_registration}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_event_registration: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable_prayer">{t('settings.enable_prayer_label')}</Label>
                <Switch
                  id="enable_prayer"
                  checked={settings.enable_prayer}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_prayer: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable_counseling">{t('settings.enable_counseling_label')}</Label>
                <Switch
                  id="enable_counseling"
                  checked={settings.enable_counseling}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_counseling: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable_groups">{t('settings.enable_groups_label')}</Label>
                <Switch
                  id="enable_groups"
                  checked={settings.enable_groups}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_groups: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <Label htmlFor="enable_profile_update">{t('settings.enable_profile_update_label')}</Label>
                <Switch
                  id="enable_profile_update"
                  checked={settings.enable_profile_update}
                  onCheckedChange={(checked) => setSettings({ ...settings, enable_profile_update: checked })}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Pre-Visitor Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.previsitor_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>{t('settings.previsitor_status_label')}</Label>
                <Select
                  value={settings.previsitor_status_id}
                  onValueChange={(value) => setSettings({ ...settings, previsitor_status_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select default status" />
                  </SelectTrigger>
                  <SelectContent>
                    {memberStatuses.map(status => (
                      <SelectItem key={status.id} value={status.id}>
                        {status.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
          
          {/* Timeout Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.timeout_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>{t('settings.timeout_label')}</Label>
                <Input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={settings.timeout_minutes}
                  onChange={(e) => setSettings({ ...settings, timeout_minutes: parseFloat(e.target.value) })}
                />
                <p className="text-sm text-gray-500">{t('settings.timeout_help')}</p>
              </div>
            </CardContent>
          </Card>
          
          {/* OTP Settings */}
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.otp_title')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('settings.otp_digits_label')}</Label>
                <Input
                  type="number"
                  min="4"
                  max="6"
                  value={settings.otp_digits}
                  onChange={(e) => setSettings({ ...settings, otp_digits: parseInt(e.target.value) })}
                  disabled
                />
                <p className="text-sm text-gray-500">Fixed at 4 digits</p>
              </div>
              
              <div className="space-y-2">
                <Label>{t('settings.otp_resend_label')}</Label>
                <Input
                  type="number"
                  min="30"
                  max="300"
                  value={settings.otp_resend_cooldown}
                  onChange={(e) => setSettings({ ...settings, otp_resend_cooldown: parseInt(e.target.value) })}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Save Button */}
          <Button
            onClick={handleSave}
            disabled={saving}
            className="w-full h-12"
          >
            {saving ? 'Saving...' : t('settings.save_button')}
          </Button>
        </div>
        
        {/* Right Column - Info */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5" />
                {t('settings.preview_title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{t('settings.preview_text')}</p>
              
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-blue-600" />
                  <span className="font-medium">Kiosk URL:</span>
                </div>
                <code className="block bg-gray-100 p-3 rounded text-sm break-all">
                  {window.location.origin}/kiosk
                </code>
              </div>
              
              <div className="mt-6">
                <p className="font-medium mb-2">Enabled Services:</p>
                <ul className="space-y-1 text-sm">
                  {settings.enable_event_registration && <li>✅ Event Registration</li>}
                  {settings.enable_prayer && <li>✅ Prayer Request</li>}
                  {settings.enable_counseling && <li>✅ Counseling</li>}
                  {settings.enable_groups && <li>✅ Join Group</li>}
                  {settings.enable_profile_update && <li>✅ Profile Update</li>}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default KioskSettingsTab;
