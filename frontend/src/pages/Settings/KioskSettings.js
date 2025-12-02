/**
 * Kiosk Settings Page - Admin Configuration
 * 
 * Placed in Settings page as a new section
 */

import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Monitor, Info, User, Phone, Mail, Calendar, Heart, Droplets, Briefcase, MapPin, Building } from 'lucide-react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Label } from '../../components/ui/label';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Switch } from '../../components/ui/switch';
import { Checkbox } from '../../components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { toast } from 'sonner';
import kioskApi from '../../services/kioskApi';
import { useMemberStatuses } from '../../hooks/useSettings';

// Define all available profile fields with their metadata
const ALL_PROFILE_FIELDS = [
  { id: 'full_name', label: 'Full Name', icon: User, section: 'basic', required: true },
  { id: 'phone', label: 'Phone Number', icon: Phone, section: 'basic', required: true },
  { id: 'email', label: 'Email', icon: Mail, section: 'basic' },
  { id: 'date_of_birth', label: 'Date of Birth', icon: Calendar, section: 'personal' },
  { id: 'gender', label: 'Gender', icon: User, section: 'personal' },
  { id: 'marital_status', label: 'Marital Status', icon: Heart, section: 'personal' },
  { id: 'blood_type', label: 'Blood Type', icon: Droplets, section: 'personal' },
  { id: 'occupation', label: 'Occupation', icon: Briefcase, section: 'personal' },
  { id: 'address', label: 'Address', icon: MapPin, section: 'address' },
  { id: 'city', label: 'City', icon: Building, section: 'address' },
  { id: 'state', label: 'State/Province', icon: MapPin, section: 'address' },
  { id: 'country', label: 'Country', icon: MapPin, section: 'address' },
];

// Default fields shown on kiosk
const DEFAULT_PROFILE_FIELDS = ['full_name', 'phone', 'date_of_birth', 'address'];

const KioskSettingsTab = () => {
  const { t } = useTranslation('kiosk');
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
    default_language: 'id', // Default to Indonesian
    previsitor_status_id: '',
    timeout_minutes: 2,
    otp_digits: 4,
    otp_resend_cooldown: 60,
    profile_fields: DEFAULT_PROFILE_FIELDS
  });

  // Toggle a profile field on/off
  const toggleProfileField = (fieldId) => {
    const field = ALL_PROFILE_FIELDS.find(f => f.id === fieldId);
    // Don't allow toggling required fields off
    if (field?.required) return;

    setSettings(prev => {
      const currentFields = prev.profile_fields || DEFAULT_PROFILE_FIELDS;
      const isEnabled = currentFields.includes(fieldId);

      if (isEnabled) {
        return { ...prev, profile_fields: currentFields.filter(f => f !== fieldId) };
      } else {
        return { ...prev, profile_fields: [...currentFields, fieldId] };
      }
    });
  };

  // Check if a profile field is enabled
  const isFieldEnabled = (fieldId) => {
    const fields = settings.profile_fields || DEFAULT_PROFILE_FIELDS;
    return fields.includes(fieldId);
  };
  
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
      toast.success(t('settings.saved_toast'));
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Failed to save settings');
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
          {/* Home Page Customization */}
          <Card>
            <CardHeader>
              <CardTitle>Home Page Text</CardTitle>
              <CardDescription>Customize welcome message on kiosk home</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="home_title">Home Title</Label>
                <Input
                  id="home_title"
                  value={settings.home_title}
                  onChange={(e) => setSettings({ ...settings, home_title: e.target.value })}
                  placeholder="Welcome"
                />
                <p className="text-sm text-gray-500">Leave empty to use default translation</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="home_subtitle">Home Subtitle</Label>
                <Input
                  id="home_subtitle"
                  value={settings.home_subtitle}
                  onChange={(e) => setSettings({ ...settings, home_subtitle: e.target.value })}
                  placeholder="How can we help you today?"
                />
                <p className="text-sm text-gray-500">Leave empty to use default translation</p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="default_language">Default Language</Label>
                <Select
                  value={settings.default_language}
                  onValueChange={(value) => setSettings({ ...settings, default_language: value })}
                >
                  <SelectTrigger id="default_language">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="id">Bahasa Indonesia</SelectItem>
                    <SelectItem value="en">English</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-sm text-gray-500">Language shown when kiosk first loads</p>
              </div>
            </CardContent>
          </Card>
          
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

          {/* Profile Fields Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Profile Update Fields</CardTitle>
              <CardDescription>Select which fields members can edit in the kiosk profile update page</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Basic Info Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Basic Information</h4>
                <div className="space-y-3">
                  {ALL_PROFILE_FIELDS.filter(f => f.section === 'basic').map(field => {
                    const Icon = field.icon;
                    return (
                      <div key={field.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`field_${field.id}`}
                          checked={isFieldEnabled(field.id)}
                          onCheckedChange={() => toggleProfileField(field.id)}
                          disabled={field.required}
                        />
                        <Label
                          htmlFor={`field_${field.id}`}
                          className={`flex items-center gap-2 cursor-pointer ${field.required ? 'text-gray-500' : ''}`}
                        >
                          <Icon className="w-4 h-4" />
                          {field.label}
                          {field.required && <span className="text-xs text-gray-400">(Required)</span>}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Personal Details Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-4">Personal Details</h4>
                <div className="space-y-3">
                  {ALL_PROFILE_FIELDS.filter(f => f.section === 'personal').map(field => {
                    const Icon = field.icon;
                    return (
                      <div key={field.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`field_${field.id}`}
                          checked={isFieldEnabled(field.id)}
                          onCheckedChange={() => toggleProfileField(field.id)}
                        />
                        <Label htmlFor={`field_${field.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Icon className="w-4 h-4" />
                          {field.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Address Section */}
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 mt-4">Address</h4>
                <div className="space-y-3">
                  {ALL_PROFILE_FIELDS.filter(f => f.section === 'address').map(field => {
                    const Icon = field.icon;
                    return (
                      <div key={field.id} className="flex items-center gap-3">
                        <Checkbox
                          id={`field_${field.id}`}
                          checked={isFieldEnabled(field.id)}
                          onCheckedChange={() => toggleProfileField(field.id)}
                        />
                        <Label htmlFor={`field_${field.id}`} className="flex items-center gap-2 cursor-pointer">
                          <Icon className="w-4 h-4" />
                          {field.label}
                        </Label>
                      </div>
                    );
                  })}
                </div>
              </div>

              <p className="text-sm text-gray-500 mt-4">
                Full Name and Phone Number are always required for member identification.
              </p>
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
