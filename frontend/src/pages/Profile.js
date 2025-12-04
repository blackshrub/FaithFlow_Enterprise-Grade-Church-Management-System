import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../context/AuthContext';
import { authAPI } from '../services/api';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { User, Mail, Phone, Lock, Key, Save, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

// Generate initials from full name
const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase();
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

// Generate consistent color from name
const getAvatarColor = (name) => {
  if (!name) return { bg: 'bg-gray-200', text: 'text-gray-600' };
  const colors = [
    { bg: 'bg-blue-100', text: 'text-blue-600' },
    { bg: 'bg-green-100', text: 'text-green-600' },
    { bg: 'bg-purple-100', text: 'text-purple-600' },
    { bg: 'bg-amber-100', text: 'text-amber-600' },
    { bg: 'bg-rose-100', text: 'text-rose-600' },
    { bg: 'bg-cyan-100', text: 'text-cyan-600' },
    { bg: 'bg-indigo-100', text: 'text-indigo-600' },
    { bg: 'bg-teal-100', text: 'text-teal-600' },
  ];
  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return colors[hash % colors.length];
};

export default function Profile() {
  const { t } = useTranslation();
  const { user: authUser, refreshUser } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch full user profile from API (includes phone, is_active, etc.)
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const response = await authAPI.getCurrentUser();
      return response.data;
    },
    staleTime: 30000, // 30 seconds
  });

  // Use profile data if available, fallback to auth context
  const user = profileData || authUser;

  const avatarColor = getAvatarColor(user?.full_name);

  // Personal info form state
  const [personalInfo, setPersonalInfo] = useState({
    full_name: '',
    email: '',
    phone: '',
  });

  // Security form state
  const [security, setSecurity] = useState({
    kiosk_pin: '',
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  // Password visibility toggles
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Track which fields have been modified
  const [personalInfoDirty, setPersonalInfoDirty] = useState(false);
  const [securityDirty, setSecurityDirty] = useState(false);

  // Initialize form with user data
  useEffect(() => {
    if (user) {
      setPersonalInfo({
        full_name: user.full_name ?? '',
        email: user.email ?? '',
        phone: user.phone ?? '',
      });
    }
  }, [user]);

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data) => authAPI.updateProfile(data),
    onSuccess: (response) => {
      toast.success(t('profile.updateSuccess') || 'Profile updated successfully');
      // Refresh user data in auth context
      if (refreshUser) {
        refreshUser();
      }
      // Clear password fields after successful update
      setSecurity(prev => ({
        ...prev,
        current_password: '',
        new_password: '',
        confirm_password: '',
      }));
      setPersonalInfoDirty(false);
      setSecurityDirty(false);
      queryClient.invalidateQueries(['currentUser']);
    },
    onError: (error) => {
      const message = error.response?.data?.detail || t('profile.updateError') || 'Failed to update profile';
      toast.error(message);
    },
  });

  const handlePersonalInfoChange = (field, value) => {
    setPersonalInfo(prev => ({ ...prev, [field]: value }));
    setPersonalInfoDirty(true);
  };

  const handleSecurityChange = (field, value) => {
    setSecurity(prev => ({ ...prev, [field]: value }));
    setSecurityDirty(true);
  };

  const handleSavePersonalInfo = (e) => {
    e.preventDefault();
    const updateData = {};

    // Only include fields that have changed
    if (personalInfo.full_name !== (user?.full_name ?? '')) {
      updateData.full_name = personalInfo.full_name;
    }
    if (personalInfo.email !== (user?.email ?? '')) {
      updateData.email = personalInfo.email;
    }
    if (personalInfo.phone !== (user?.phone ?? '')) {
      updateData.phone = personalInfo.phone;
    }

    if (Object.keys(updateData).length === 0) {
      toast.info(t('profile.noChanges') || 'No changes to save');
      return;
    }

    updateProfileMutation.mutate(updateData);
  };

  const handleSaveSecurity = (e) => {
    e.preventDefault();
    const updateData = {};

    // Handle PIN change
    if (security.kiosk_pin && security.kiosk_pin.length === 6) {
      updateData.kiosk_pin = security.kiosk_pin;
    } else if (security.kiosk_pin && security.kiosk_pin.length !== 6) {
      toast.error(t('profile.pinMustBe6Digits') || 'PIN must be exactly 6 digits');
      return;
    }

    // Handle password change
    if (security.new_password) {
      if (!security.current_password) {
        toast.error(t('profile.currentPasswordRequired') || 'Current password is required');
        return;
      }
      if (security.new_password !== security.confirm_password) {
        toast.error(t('profile.passwordsMustMatch') || 'New passwords do not match');
        return;
      }
      if (security.new_password.length < 6) {
        toast.error(t('profile.passwordMinLength') || 'Password must be at least 6 characters');
        return;
      }
      updateData.current_password = security.current_password;
      updateData.new_password = security.new_password;
    }

    if (Object.keys(updateData).length === 0) {
      toast.info(t('profile.noChanges') || 'No changes to save');
      return;
    }

    updateProfileMutation.mutate(updateData);
  };

  return (
    <div className="space-y-6">
      {/* Header with Avatar */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-4 flex-1">
          {/* Avatar Placeholder */}
          <div className={`w-20 h-20 rounded-full flex items-center justify-center ${avatarColor.bg} ring-4 ring-white shadow-lg`}>
            <span className={`text-2xl font-bold ${avatarColor.text}`}>
              {getInitials(user?.full_name)}
            </span>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {user?.full_name || t('profile.title') || 'My Profile'}
            </h1>
            <p className="text-gray-600 mt-1">
              {user?.email || t('profile.subtitle') || 'Manage your account settings and security'}
            </p>
            <span className={`inline-flex items-center mt-2 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${
              user?.role === 'super_admin' ? 'bg-purple-100 text-purple-800' :
              user?.role === 'admin' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {user?.role?.replace('_', ' ') || 'User'}
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Personal Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {t('profile.personalInfo') || 'Personal Information'}
            </CardTitle>
            <CardDescription>
              {t('profile.personalInfoDesc') || 'Update your personal details'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSavePersonalInfo} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name" className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  {t('profile.fullName') || 'Full Name'}
                </Label>
                <Input
                  id="full_name"
                  value={personalInfo.full_name}
                  onChange={(e) => handlePersonalInfoChange('full_name', e.target.value)}
                  placeholder={t('profile.enterFullName') || 'Enter your full name'}
                  required
                  minLength={1}
                  maxLength={200}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-gray-500" />
                  {t('profile.email') || 'Email Address'}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={personalInfo.email}
                  onChange={(e) => handlePersonalInfoChange('email', e.target.value)}
                  placeholder={t('profile.enterEmail') || 'Enter your email'}
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-2">
                  <Phone className="h-4 w-4 text-gray-500" />
                  {t('profile.phone') || 'Phone Number'}
                </Label>
                <Input
                  id="phone"
                  type="tel"
                  value={personalInfo.phone}
                  onChange={(e) => handlePersonalInfoChange('phone', e.target.value)}
                  placeholder={t('profile.enterPhone') || 'Enter your phone number'}
                  maxLength={20}
                />
              </div>

              <Button
                type="submit"
                disabled={!personalInfoDirty || updateProfileMutation.isPending}
                className="w-full"
              >
                {updateProfileMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    {t('common.saving') || 'Saving...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {t('profile.savePersonalInfo') || 'Save Personal Info'}
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              {t('profile.security') || 'Security'}
            </CardTitle>
            <CardDescription>
              {t('profile.securityDesc') || 'Update your PIN and password'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSecurity} className="space-y-4">
              {/* Kiosk PIN */}
              <div className="space-y-2">
                <Label htmlFor="kiosk_pin" className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-gray-500" />
                  {t('profile.kioskPin') || 'Kiosk PIN'}
                </Label>
                <Input
                  id="kiosk_pin"
                  type="password"
                  value={security.kiosk_pin}
                  onChange={(e) => {
                    // Only allow digits
                    const value = e.target.value.replace(/\D/g, '');
                    handleSecurityChange('kiosk_pin', value);
                  }}
                  placeholder={t('profile.enterPin') || 'Enter 6-digit PIN'}
                  maxLength={6}
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                />
                <p className="text-xs text-gray-500">
                  {t('profile.pinHelp') || 'Used for kiosk login. Must be exactly 6 digits.'}
                </p>
              </div>

              <Separator className="my-4" />

              {/* Password Change Section */}
              <div className="space-y-4">
                <h3 className="font-medium text-gray-900">
                  {t('profile.changePassword') || 'Change Password'}
                </h3>

                {/* Current Password */}
                <div className="space-y-2">
                  <Label htmlFor="current_password">
                    {t('profile.currentPassword') || 'Current Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="current_password"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={security.current_password}
                      onChange={(e) => handleSecurityChange('current_password', e.target.value)}
                      placeholder={t('profile.enterCurrentPassword') || 'Enter current password'}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="space-y-2">
                  <Label htmlFor="new_password">
                    {t('profile.newPassword') || 'New Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="new_password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={security.new_password}
                      onChange={(e) => handleSecurityChange('new_password', e.target.value)}
                      placeholder={t('profile.enterNewPassword') || 'Enter new password'}
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">
                    {t('profile.confirmPassword') || 'Confirm New Password'}
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirm_password"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={security.confirm_password}
                      onChange={(e) => handleSecurityChange('confirm_password', e.target.value)}
                      placeholder={t('profile.confirmNewPassword') || 'Confirm new password'}
                      minLength={6}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                disabled={!securityDirty || updateProfileMutation.isPending}
                className="w-full"
              >
                {updateProfileMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                    {t('common.saving') || 'Saving...'}
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    {t('profile.saveSecurity') || 'Save Security Settings'}
                  </span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Account Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>{t('profile.accountInfo') || 'Account Information'}</CardTitle>
          <CardDescription>
            {t('profile.accountInfoDesc') || 'Read-only information about your account'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label className="text-gray-500">{t('profile.role') || 'Role'}</Label>
              <p className="font-medium capitalize">
                {user?.role?.replace('_', ' ') || 'N/A'}
              </p>
            </div>
            <div>
              <Label className="text-gray-500">{t('profile.userId') || 'User ID'}</Label>
              <p className="font-mono text-sm text-gray-600 truncate" title={user?.id}>
                {user?.id || 'N/A'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
