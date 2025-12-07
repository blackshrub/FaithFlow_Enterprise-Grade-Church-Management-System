/**
 * Community Settings Screen
 *
 * Leader configuration panel for community management:
 * - General settings (name, description, avatar)
 * - Privacy settings (visibility, join approval)
 * - Messaging settings (who can post, media sharing)
 * - Announcement settings (who can announce, allow replies)
 * - Member management (view/remove members, manage leaders)
 * - Danger zone (archive/delete community)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Pressable,
  ScrollView,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Animated, { LinearTransition } from 'react-native-reanimated';
import {
  ArrowLeft,
  Settings,
  Camera,
  Users,
  Lock,
  Unlock,
  MessageCircle,
  Megaphone,
  Shield,
  UserPlus,
  UserMinus,
  Trash2,
  Archive,
  ChevronRight,
  Check,
  CheckCheck,
  AlertTriangle,
  Globe,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Video,
  FileText,
  Crown,
  BarChart3,
  Calendar,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge, BadgeText } from '@/components/ui/badge';
import { Button, ButtonText, ButtonIcon, ButtonSpinner } from '@/components/ui/button';
import { Divider } from '@/components/ui/divider';

import { useCommunity, useUpdateCommunitySettings, useDeleteCommunity, useArchiveCommunity } from '@/hooks/useCommunities';
import { useAuthStore } from '@/stores/auth';
import { colors, spacing, borderRadius, shadows } from '@/constants/theme';
import type { CommunitySettings } from '@/types/communities';

// =============================================================================
// SETTING SECTION COMPONENT
// =============================================================================

interface SettingSectionProps {
  title: string;
  icon: LucideIcon;
  iconColor?: string;
  children: React.ReactNode;
}

function SettingSection({ title, icon, iconColor, children }: SettingSectionProps) {
  return (
    <View className="mb-6">
      <HStack space="sm" className="items-center mb-3 px-4">
        <Icon as={icon} size="sm" style={{ color: iconColor || colors.gray[600] }} />
        <Text className="text-gray-600 font-semibold text-sm uppercase tracking-wide">
          {title}
        </Text>
      </HStack>
      <View
        className="mx-4 rounded-xl bg-white overflow-hidden"
        style={shadows.sm}
      >
        {children}
      </View>
    </View>
  );
}

// =============================================================================
// SETTING ROW COMPONENT
// =============================================================================

interface SettingRowProps {
  label: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  value?: string | React.ReactNode;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
  disabled?: boolean;
}

function SettingRow({
  label,
  description,
  icon,
  iconColor,
  value,
  onPress,
  showChevron = true,
  isLast = false,
  disabled = false,
}: SettingRowProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress || disabled}
      className={`px-4 py-3 active:bg-gray-50 ${!isLast ? 'border-b border-gray-100' : ''}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <HStack space="md" className="items-center">
        {icon && (
          <View
            className="w-9 h-9 rounded-lg items-center justify-center"
            style={{ backgroundColor: `${iconColor || colors.gray[500]}15` }}
          >
            <Icon as={icon} size="sm" style={{ color: iconColor || colors.gray[500] }} />
          </View>
        )}
        <VStack className="flex-1">
          <Text className="text-gray-900 font-medium">{label}</Text>
          {description && (
            <Text className="text-gray-500 text-sm">{description}</Text>
          )}
        </VStack>
        {value && (
          typeof value === 'string' ? (
            <Text className="text-gray-500 text-sm">{value}</Text>
          ) : value
        )}
        {onPress && showChevron && (
          <Icon as={ChevronRight} size="sm" className="text-gray-400" />
        )}
      </HStack>
    </Pressable>
  );
}

// =============================================================================
// TOGGLE ROW COMPONENT
// =============================================================================

interface ToggleRowProps {
  label: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  isLast?: boolean;
  disabled?: boolean;
}

function ToggleRow({
  label,
  description,
  icon,
  iconColor,
  value,
  onValueChange,
  isLast = false,
  disabled = false,
}: ToggleRowProps) {
  return (
    <View
      className={`px-4 py-3 ${!isLast ? 'border-b border-gray-100' : ''}`}
      style={{ opacity: disabled ? 0.5 : 1 }}
    >
      <HStack space="md" className="items-center">
        {icon && (
          <View
            className="w-9 h-9 rounded-lg items-center justify-center"
            style={{ backgroundColor: `${iconColor || colors.gray[500]}15` }}
          >
            <Icon as={icon} size="sm" style={{ color: iconColor || colors.gray[500] }} />
          </View>
        )}
        <VStack className="flex-1">
          <Text className="text-gray-900 font-medium">{label}</Text>
          {description && (
            <Text className="text-gray-500 text-sm">{description}</Text>
          )}
        </VStack>
        <Switch
          value={value}
          onValueChange={(newValue) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onValueChange(newValue);
          }}
          trackColor={{ false: colors.gray[300], true: colors.primary[500] }}
          thumbColor="white"
          disabled={disabled}
        />
      </HStack>
    </View>
  );
}

// =============================================================================
// SELECT ROW COMPONENT
// =============================================================================

interface SelectOption {
  value: string;
  label: string;
}

interface SelectRowProps {
  label: string;
  description?: string;
  icon?: LucideIcon;
  iconColor?: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  isLast?: boolean;
  disabled?: boolean;
}

function SelectRow({
  label,
  description,
  icon,
  iconColor,
  value,
  options,
  onValueChange,
  isLast = false,
  disabled = false,
}: SelectRowProps) {
  const [expanded, setExpanded] = useState(false);
  const currentOption = options.find((opt) => opt.value === value);

  return (
    <View className={!isLast ? 'border-b border-gray-100' : ''}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setExpanded(!expanded);
        }}
        className="px-4 py-3 active:bg-gray-50"
        disabled={disabled}
        style={{ opacity: disabled ? 0.5 : 1 }}
      >
        <HStack space="md" className="items-center">
          {icon && (
            <View
              className="w-9 h-9 rounded-lg items-center justify-center"
              style={{ backgroundColor: `${iconColor || colors.gray[500]}15` }}
            >
              <Icon as={icon} size="sm" style={{ color: iconColor || colors.gray[500] }} />
            </View>
          )}
          <VStack className="flex-1">
            <Text className="text-gray-900 font-medium">{label}</Text>
            {description && (
              <Text className="text-gray-500 text-sm">{description}</Text>
            )}
          </VStack>
          <Text className="text-primary-600 font-medium">{currentOption?.label}</Text>
        </HStack>
      </Pressable>

      {/* Layout animation only to avoid opacity conflict with nested FadeIn */}
      {expanded && (
        <Animated.View layout={LinearTransition.springify()}>
          <View className="bg-gray-50 px-4 py-2">
          {options.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onValueChange(option.value);
                setExpanded(false);
              }}
              className="py-2.5 flex-row items-center justify-between"
            >
              <Text
                className={`${
                  option.value === value ? 'text-primary-600 font-medium' : 'text-gray-700'
                }`}
              >
                {option.label}
              </Text>
              {option.value === value && (
                <Icon as={Check} size="sm" style={{ color: colors.primary[600] }} />
              )}
            </Pressable>
          ))}
          </View>
        </Animated.View>
      )}
    </View>
  );
}

// =============================================================================
// MAIN SCREEN
// =============================================================================

export default function CommunitySettingsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: communityId } = useLocalSearchParams<{ id: string }>();
  const { member } = useAuthStore();

  const { data: community, isLoading, refetch, isRefetching } = useCommunity(communityId);
  const updateSettingsMutation = useUpdateCommunitySettings();
  const deleteCommunityMutation = useDeleteCommunity();
  const archiveCommunityMutation = useArchiveCommunity();

  // Local state for editing
  const [localSettings, setLocalSettings] = useState<Partial<CommunitySettings>>({});
  const [hasChanges, setHasChanges] = useState(false);

  // Merge remote settings with local changes
  const settings = useMemo(() => ({
    ...community?.settings,
    ...localSettings,
  }), [community?.settings, localSettings]);

  // Check if user is admin/leader
  const isAdmin = community?.my_role === 'admin' || community?.my_role === 'leader';

  const updateSetting = useCallback(<K extends keyof CommunitySettings>(
    key: K,
    value: CommunitySettings[K]
  ) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const handleSaveSettings = async () => {
    if (!hasChanges) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      await updateSettingsMutation.mutateAsync({
        communityId,
        settings: localSettings,
      });

      setLocalSettings({});
      setHasChanges(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to save settings');
    }
  };

  const handleArchiveCommunity = () => {
    Alert.alert(
      'Archive Community',
      'Are you sure you want to archive this community? Members will no longer be able to send messages.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Archive',
          style: 'destructive',
          onPress: () => {
            archiveCommunityMutation.mutate(communityId, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Community has been archived.');
                router.back();
              },
              onError: (error: any) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                Alert.alert('Error', error.response?.data?.message || 'Failed to archive community');
              },
            });
          },
        },
      ]
    );
  };

  const handleDeleteCommunity = () => {
    Alert.alert(
      'Delete Community',
      'Are you sure you want to permanently delete this community? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            deleteCommunityMutation.mutate(communityId, {
              onSuccess: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                Alert.alert('Success', 'Community has been deleted.');
                router.replace('/(tabs)/groups');
              },
              onError: (error: any) => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                const message = error.response?.data?.detail?.message || error.response?.data?.message || 'Failed to delete community';
                Alert.alert('Error', message);
              },
            });
          },
        },
      ]
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <HStack className="px-4 py-3 bg-white border-b border-gray-100 items-center" space="md">
          <Skeleton className="w-10 h-10 rounded-full" isLoaded={false} />
          <Skeleton className="h-6 w-40" isLoaded={false} />
        </HStack>
        <VStack className="p-4" space="md">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" isLoaded={false} />
          ))}
        </VStack>
      </SafeAreaView>
    );
  }

  // Not authorized
  if (!isAdmin) {
    return (
      <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
        <View className="bg-white border-b border-gray-100" style={shadows.sm}>
          <HStack className="px-4 py-3 items-center" space="md">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              className="active:opacity-70"
            >
              <Icon as={ArrowLeft} size="lg" className="text-gray-800" />
            </Pressable>
            <Heading size="lg" className="text-gray-900">Settings</Heading>
          </HStack>
        </View>

        <VStack className="flex-1 items-center justify-center px-8" space="md">
          <View
            className="w-20 h-20 rounded-full items-center justify-center mb-4"
            style={{ backgroundColor: colors.error[100] }}
          >
            <Icon as={Shield} size="2xl" style={{ color: colors.error[500] }} />
          </View>
          <Text className="text-gray-900 text-center text-lg font-medium">
            Access Denied
          </Text>
          <Text className="text-gray-500 text-center">
            You need to be a leader or admin to access community settings.
          </Text>
          <Button
            variant="solid"
            action="primary"
            onPress={() => router.back()}
            className="mt-4"
          >
            <ButtonText>Go Back</ButtonText>
          </Button>
        </VStack>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header */}
      <View className="bg-white border-b border-gray-100" style={shadows.sm}>
        <HStack className="px-4 py-3 items-center justify-between">
          <HStack space="md" className="items-center">
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                if (hasChanges) {
                  Alert.alert(
                    'Unsaved Changes',
                    'You have unsaved changes. Do you want to discard them?',
                    [
                      { text: 'Keep Editing', style: 'cancel' },
                      {
                        text: 'Discard',
                        style: 'destructive',
                        onPress: () => router.back(),
                      },
                    ]
                  );
                } else {
                  router.back();
                }
              }}
              className="active:opacity-70"
            >
              <Icon as={ArrowLeft} size="lg" className="text-gray-800" />
            </Pressable>

            <View
              className="w-10 h-10 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.primary[100] }}
            >
              <Icon as={Settings} size="md" style={{ color: colors.primary[600] }} />
            </View>

            <Heading size="lg" className="text-gray-900">Settings</Heading>
          </HStack>

          {hasChanges && (
            <Button
              size="sm"
              variant="solid"
              action="primary"
              onPress={handleSaveSettings}
              disabled={updateSettingsMutation.isPending}
            >
              {updateSettingsMutation.isPending ? (
                <ButtonSpinner className="mr-2" />
              ) : null}
              <ButtonText>Save</ButtonText>
            </Button>
          )}
        </HStack>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingVertical: spacing.lg }}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={[colors.primary[500]]}
            tintColor={colors.primary[500]}
          />
        }
      >
        {/* Community Info Header */}
        <View className="items-center mb-6">
          <Avatar size="xl" className="mb-3">
            {community?.avatar_url ? (
              <AvatarImage source={{ uri: community.avatar_url }} />
            ) : (
              <AvatarFallbackText>{community?.name || 'C'}</AvatarFallbackText>
            )}
          </Avatar>
          <Heading size="xl" className="text-gray-900 text-center">
            {community?.name}
          </Heading>
          <Text className="text-gray-500 text-center">
            {community?.member_count} members
          </Text>
        </View>

        {/* Messaging Settings */}
        <SettingSection title="Messaging" icon={MessageCircle} iconColor={colors.info[500]}>
          <SelectRow
            label="Who Can Send Messages"
            description="Control who can send messages in chat"
            icon={MessageCircle}
            iconColor={colors.info[500]}
            value={settings.who_can_send_messages || 'all_members'}
            options={[
              { value: 'all_members', label: 'All Members' },
              { value: 'leaders_only', label: 'Leaders Only' },
            ]}
            onValueChange={(value) => updateSetting('who_can_send_messages', value as any)}
          />
          <ToggleRow
            label="Allow Media Sharing"
            description="Members can share images, videos & files"
            icon={ImageIcon}
            iconColor={colors.warning[500]}
            value={settings.allow_media_sharing ?? true}
            onValueChange={(value) => updateSetting('allow_media_sharing', value)}
          />
          <ToggleRow
            label="Allow Polls"
            description="Members can create polls"
            icon={BarChart3}
            iconColor={colors.secondary[500]}
            value={settings.allow_polls ?? true}
            onValueChange={(value) => updateSetting('allow_polls', value)}
          />
          <ToggleRow
            label="Allow Events"
            description="Members can create events"
            icon={Calendar}
            iconColor={colors.success[500]}
            value={settings.allow_events ?? true}
            onValueChange={(value) => updateSetting('allow_events', value)}
            isLast
          />
        </SettingSection>

        {/* Announcement Settings */}
        <SettingSection title="Announcements" icon={Megaphone} iconColor={colors.warning[500]}>
          <SelectRow
            label="Who Can Announce"
            description="Control who can post announcements"
            icon={Megaphone}
            iconColor={colors.warning[500]}
            value={settings.who_can_announce || 'leaders_only'}
            options={[
              { value: 'all_members', label: 'All Members' },
              { value: 'leaders_only', label: 'Leaders Only' },
            ]}
            onValueChange={(value) => updateSetting('who_can_announce', value as any)}
          />
          <ToggleRow
            label="Allow Replies"
            description="Members can reply to announcements"
            icon={MessageCircle}
            iconColor={colors.info[500]}
            value={settings.allow_announcement_replies ?? false}
            onValueChange={(value) => updateSetting('allow_announcement_replies', value)}
            isLast
          />
        </SettingSection>

        {/* Sub-group Settings */}
        <SettingSection title="Sub-groups" icon={Users} iconColor={colors.secondary[500]}>
          <ToggleRow
            label="Allow Members to Create"
            description="Let members create sub-groups"
            icon={Users}
            iconColor={colors.secondary[500]}
            value={settings.allow_member_create_subgroups ?? true}
            onValueChange={(value) => updateSetting('allow_member_create_subgroups', value)}
          />
          <ToggleRow
            label="Require Approval"
            description="New sub-groups need leader approval"
            icon={Shield}
            iconColor={colors.warning[500]}
            value={settings.subgroup_requires_approval ?? false}
            onValueChange={(value) => updateSetting('subgroup_requires_approval', value)}
            isLast
          />
        </SettingSection>

        {/* Privacy Settings */}
        <SettingSection title="Privacy" icon={Lock} iconColor={colors.primary[500]}>
          <ToggleRow
            label="Show Member List"
            description="Members can see who else is in the community"
            icon={Users}
            iconColor={colors.primary[500]}
            value={settings.show_member_list ?? true}
            onValueChange={(value) => updateSetting('show_member_list', value)}
          />
          <ToggleRow
            label="Show Online Status"
            description="Display when members are online"
            icon={Eye}
            iconColor={colors.success[500]}
            value={settings.show_online_status ?? true}
            onValueChange={(value) => updateSetting('show_online_status', value)}
          />
          <ToggleRow
            label="Show Read Receipts"
            description="Show when messages have been read"
            icon={CheckCheck}
            iconColor={colors.info[500]}
            value={settings.show_read_receipts ?? true}
            onValueChange={(value) => updateSetting('show_read_receipts', value)}
            isLast
          />
        </SettingSection>

        {/* Member Management */}
        <SettingSection title="Members" icon={Users} iconColor={colors.success[500]}>
          <SettingRow
            label="View All Members"
            description={`${community?.member_count} members`}
            icon={Users}
            iconColor={colors.success[500]}
            onPress={() => router.push(`/community/${communityId}/members` as any)}
          />
          <SettingRow
            label="Manage Leaders"
            description="Add or remove community leaders"
            icon={Crown}
            iconColor={colors.warning[500]}
            onPress={() => router.push(`/community/${communityId}/leaders` as any)}
          />
          <SettingRow
            label="Pending Requests"
            description="Review join requests"
            icon={UserPlus}
            iconColor={colors.info[500]}
            onPress={() => router.push(`/community/${communityId}/requests` as any)}
            isLast
          />
        </SettingSection>

        {/* Danger Zone */}
        <SettingSection title="Danger Zone" icon={AlertTriangle} iconColor={colors.error[500]}>
          <SettingRow
            label="Archive Community"
            description="Disable messaging but keep history"
            icon={Archive}
            iconColor={colors.warning[500]}
            onPress={handleArchiveCommunity}
            showChevron={false}
          />
          <SettingRow
            label="Delete Community"
            description="Permanently delete this community"
            icon={Trash2}
            iconColor={colors.error[500]}
            onPress={handleDeleteCommunity}
            showChevron={false}
            isLast
          />
        </SettingSection>

        {/* Bottom Padding */}
        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}
