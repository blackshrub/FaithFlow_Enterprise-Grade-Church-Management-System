/**
 * MemberManagement Component
 *
 * Community member management UI with:
 * - View member profile
 * - Promote/Demote roles (admin, co-leader, member)
 * - Kick member from community
 * - Ban member (optional)
 * - View member activity
 * - Message member directly
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  View,
  Pressable,
  Alert,
  ScrollView,
} from 'react-native';
import BottomSheet, { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { FlashList } from '@shopify/flash-list';
import {
  User,
  Shield,
  ShieldCheck,
  ShieldOff,
  Crown,
  UserX,
  Ban,
  MessageCircle,
  MoreVertical,
  Check,
  ChevronRight,
  Search,
  X,
  Users,
  Star,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { Badge, BadgeText } from '@/components/ui/badge';
import { colors, spacing, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export type MemberRole = 'leader' | 'co_leader' | 'admin' | 'member';

export interface CommunityMember {
  id: string;
  member_id: string;
  user_id?: string;
  name: string;
  email?: string;
  phone?: string;
  avatar_url?: string;
  role: MemberRole;
  joined_at: string;
  last_active?: string;
  message_count?: number;
  is_online?: boolean;
}

interface MemberManagementProps {
  visible: boolean;
  onClose: () => void;
  member: CommunityMember | null;
  currentUserRole: MemberRole;
  onPromote: (memberId: string, newRole: MemberRole) => void;
  onDemote: (memberId: string, newRole: MemberRole) => void;
  onKick: (memberId: string) => void;
  onBan?: (memberId: string) => void;
  onMessage?: (memberId: string) => void;
  communityName?: string;
}

interface MemberListProps {
  members: CommunityMember[];
  currentUserRole: MemberRole;
  currentUserId: string;
  onMemberPress: (member: CommunityMember) => void;
  searchQuery?: string;
}

interface RolePickerProps {
  visible: boolean;
  onClose: () => void;
  currentRole: MemberRole;
  onRoleSelect: (role: MemberRole) => void;
  canPromoteToLeader?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const ROLE_CONFIG: Record<
  MemberRole,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  leader: {
    label: 'Leader',
    color: '#F59E0B',
    bgColor: '#FEF3C7',
    icon: Crown,
  },
  co_leader: {
    label: 'Co-Leader',
    color: '#8B5CF6',
    bgColor: '#EDE9FE',
    icon: ShieldCheck,
  },
  admin: {
    label: 'Admin',
    color: '#3B82F6',
    bgColor: '#DBEAFE',
    icon: Shield,
  },
  member: {
    label: 'Member',
    color: colors.gray[600],
    bgColor: colors.gray[100],
    icon: User,
  },
};

const ROLE_HIERARCHY: MemberRole[] = ['leader', 'co_leader', 'admin', 'member'];

function canManageMember(
  currentUserRole: MemberRole,
  targetRole: MemberRole
): boolean {
  const currentIndex = ROLE_HIERARCHY.indexOf(currentUserRole);
  const targetIndex = ROLE_HIERARCHY.indexOf(targetRole);
  return currentIndex < targetIndex;
}

// =============================================================================
// ROLE BADGE
// =============================================================================

export function RoleBadge({ role }: { role: MemberRole }) {
  const config = ROLE_CONFIG[role];

  return (
    <Badge size="sm" style={{ backgroundColor: config.bgColor }}>
      <Icon as={config.icon} size="2xs" style={{ color: config.color }} />
      <BadgeText style={{ color: config.color, marginLeft: 4, fontSize: 10 }}>
        {config.label}
      </BadgeText>
    </Badge>
  );
}

// =============================================================================
// MEMBER CARD
// =============================================================================

interface MemberCardProps {
  member: CommunityMember;
  onPress: () => void;
  showManageButton?: boolean;
  isCurrentUser?: boolean;
}

export function MemberCard({
  member,
  onPress,
  showManageButton = true,
  isCurrentUser = false,
}: MemberCardProps) {
  const roleConfig = ROLE_CONFIG[member.role];

  return (
    <Pressable
      onPress={onPress}
      className="py-3 px-4 bg-white"
      style={({ pressed }) => pressed && { backgroundColor: colors.gray[50] }}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`${member.name}, ${ROLE_CONFIG[member.role].label}${isCurrentUser ? ', You' : ''}${showManageButton ? ', tap to manage' : ''}`}
    >
      <HStack space="md" className="items-center">
        {/* Avatar with online indicator */}
        <View className="relative">
          <Avatar size="md" style={{ backgroundColor: roleConfig.bgColor }}>
            {member.avatar_url ? (
              <AvatarImage source={{ uri: member.avatar_url }} />
            ) : (
              <AvatarFallbackText style={{ color: roleConfig.color }}>
                {member.name.substring(0, 2).toUpperCase()}
              </AvatarFallbackText>
            )}
          </Avatar>
          {member.is_online && (
            <View
              className="absolute bottom-0 right-0"
              style={{
                width: 12,
                height: 12,
                borderRadius: 6,
                backgroundColor: '#22C55E',
                borderWidth: 2,
                borderColor: '#FFFFFF',
              }}
            />
          )}
        </View>

        {/* Member Info */}
        <VStack className="flex-1">
          <HStack space="sm" className="items-center">
            <Text className="text-base font-semibold flex-1" style={{ color: colors.gray[900] }} numberOfLines={1}>
              {member.name}
              {isCurrentUser && (
                <Text className="text-sm font-normal" style={{ color: colors.gray[500] }}> (You)</Text>
              )}
            </Text>
            {member.role !== 'member' && <RoleBadge role={member.role} />}
          </HStack>
          <HStack space="sm" className="items-center mt-0.5">
            <Text className="text-xs" style={{ color: colors.gray[500] }}>
              Joined {new Date(member.joined_at).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            {member.message_count !== undefined && (
              <>
                <Text className="text-xs" style={{ color: colors.gray[400] }}>•</Text>
                <Text className="text-xs" style={{ color: colors.gray[500] }}>
                  {member.message_count} messages
                </Text>
              </>
            )}
          </HStack>
        </VStack>

        {/* Action button */}
        {showManageButton && !isCurrentUser && (
          <View className="p-2">
            <Icon as={MoreVertical} size="md" style={{ color: colors.gray[400] }} />
          </View>
        )}
      </HStack>
    </Pressable>
  );
}

// =============================================================================
// ROLE PICKER SHEET
// =============================================================================

export function RolePickerSheet({
  visible,
  onClose,
  currentRole,
  onRoleSelect,
  canPromoteToLeader = false,
}: RolePickerProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['45%'], []);

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const roles = canPromoteToLeader
    ? ROLE_HIERARCHY
    : ROLE_HIERARCHY.filter((r) => r !== 'leader');

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
      handleIndicatorStyle={{ backgroundColor: colors.gray[300], width: 40 }}
    >
      <View className="flex-1 px-5 pt-2">
        <HStack space="sm" className="items-center mb-4">
          <Icon as={Shield} size="lg" style={{ color: colors.primary[600] }} />
          <Heading size="lg" className="text-gray-900 font-bold">
            Change Role
          </Heading>
        </HStack>

        <VStack space="sm">
          {roles.map((role) => {
            const config = ROLE_CONFIG[role];
            const isSelected = currentRole === role;

            return (
              <Pressable
                key={role}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onRoleSelect(role);
                  onClose();
                }}
                className="flex-row items-center p-4 mb-2"
                style={[
                  { backgroundColor: colors.gray[50], borderRadius: borderRadius.xl },
                  isSelected && {
                    backgroundColor: colors.primary[50],
                    borderWidth: 2,
                    borderColor: colors.primary[500],
                  },
                ]}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`${config.label}${isSelected ? ', selected' : ''}`}
              >
                <View
                  className="items-center justify-center"
                  style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: config.bgColor }}
                >
                  <Icon as={config.icon} size="md" style={{ color: config.color }} />
                </View>
                <VStack className="flex-1 ml-3">
                  <Text className="text-base font-semibold" style={{ color: colors.gray[900] }}>{config.label}</Text>
                  <Text className="text-[13px] mt-0.5" style={{ color: colors.gray[500] }}>
                    {role === 'leader' && 'Full control over the community'}
                    {role === 'co_leader' && 'Can manage members and settings'}
                    {role === 'admin' && 'Can moderate messages and members'}
                    {role === 'member' && 'Regular community member'}
                  </Text>
                </VStack>
                {isSelected && (
                  <View
                    className="items-center justify-center"
                    style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary[500] }}
                  >
                    <Icon as={Check} size="sm" style={{ color: '#FFFFFF' }} />
                  </View>
                )}
              </Pressable>
            );
          })}
        </VStack>
      </View>
    </BottomSheet>
  );
}

// =============================================================================
// MEMBER MANAGEMENT SHEET
// =============================================================================

export function MemberManagementSheet({
  visible,
  onClose,
  member,
  currentUserRole,
  onPromote,
  onDemote,
  onKick,
  onBan,
  onMessage,
  communityName,
}: MemberManagementProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['55%'], []);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const canManage = member
    ? canManageMember(currentUserRole, member.role)
    : false;
  const canChangeRole =
    currentUserRole === 'leader' || currentUserRole === 'co_leader';
  const canKick = canManage;

  const renderBackdrop = useCallback(
    (props: any) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  const handleRoleChange = useCallback(
    (newRole: MemberRole) => {
      if (!member) return;

      const currentIndex = ROLE_HIERARCHY.indexOf(member.role);
      const newIndex = ROLE_HIERARCHY.indexOf(newRole);

      if (newIndex < currentIndex) {
        // Promoting
        Alert.alert(
          `Promote to ${ROLE_CONFIG[newRole].label}?`,
          `${member.name} will be promoted to ${ROLE_CONFIG[newRole].label}.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Promote',
              onPress: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                onPromote(member.id, newRole);
                onClose();
              },
            },
          ]
        );
      } else if (newIndex > currentIndex) {
        // Demoting
        Alert.alert(
          `Demote to ${ROLE_CONFIG[newRole].label}?`,
          `${member.name} will be demoted to ${ROLE_CONFIG[newRole].label}.`,
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Demote',
              style: 'destructive',
              onPress: () => {
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                onDemote(member.id, newRole);
                onClose();
              },
            },
          ]
        );
      }
    },
    [member, onPromote, onDemote, onClose]
  );

  const handleKick = useCallback(() => {
    if (!member) return;

    Alert.alert(
      'Remove from community?',
      `${member.name} will be removed from ${communityName || 'this community'}. They can rejoin if the community is public.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            onKick(member.id);
            onClose();
          },
        },
      ]
    );
  }, [member, communityName, onKick, onClose]);

  const handleBan = useCallback(() => {
    if (!member || !onBan) return;

    Alert.alert(
      'Ban from community?',
      `${member.name} will be banned and cannot rejoin this community.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Ban',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            onBan(member.id);
            onClose();
          },
        },
      ]
    );
  }, [member, onBan, onClose]);

  if (!member) return null;

  const roleConfig = ROLE_CONFIG[member.role];

  return (
    <>
      <BottomSheet
        ref={bottomSheetRef}
        index={visible ? 0 : -1}
        snapPoints={snapPoints}
        enablePanDownToClose
        onClose={onClose}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: '#FFFFFF', borderTopLeftRadius: 20, borderTopRightRadius: 20 }}
        handleIndicatorStyle={{ backgroundColor: colors.gray[300], width: 40 }}
      >
        <View className="flex-1 px-5">
          {/* Member Header */}
          <View
            className="items-center py-4"
            style={{ borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}
          >
            <Avatar size="xl" style={{ backgroundColor: roleConfig.bgColor }}>
              {member.avatar_url ? (
                <AvatarImage source={{ uri: member.avatar_url }} />
              ) : (
                <AvatarFallbackText style={{ color: roleConfig.color, fontSize: 24 }}>
                  {member.name.substring(0, 2).toUpperCase()}
                </AvatarFallbackText>
              )}
            </Avatar>
            <Text className="text-xl font-bold mt-3 mb-2" style={{ color: colors.gray[900] }}>{member.name}</Text>
            <RoleBadge role={member.role} />
            <Text className="text-[13px] mt-2" style={{ color: colors.gray[500] }}>
              Member since {new Date(member.joined_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {/* Actions */}
          <View className="pt-4">
            {/* Message */}
            {onMessage && (
              <Pressable
                className="flex-row items-center py-3.5"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onMessage(member.member_id);
                  onClose();
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Send message to ${member.name}`}
              >
                <View
                  className="items-center justify-center mr-3"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray[100] }}
                >
                  <Icon as={MessageCircle} size="md" style={{ color: colors.primary[600] }} />
                </View>
                <Text className="flex-1 text-base" style={{ color: colors.gray[900] }}>Send message</Text>
                <Icon as={ChevronRight} size="md" style={{ color: colors.gray[400] }} />
              </Pressable>
            )}

            {/* Change Role */}
            {canChangeRole && (
              <Pressable
                className="flex-row items-center py-3.5"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowRolePicker(true);
                }}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Change role for ${member.name}. Current role: ${roleConfig.label}`}
              >
                <View
                  className="items-center justify-center mr-3"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: colors.gray[100] }}
                >
                  <Icon as={Shield} size="md" style={{ color: colors.secondary[600] }} />
                </View>
                <Text className="flex-1 text-base" style={{ color: colors.gray[900] }}>Change role</Text>
                <HStack space="sm" className="items-center">
                  <Text className="text-sm" style={{ color: colors.gray[500] }}>{roleConfig.label}</Text>
                  <Icon as={ChevronRight} size="md" style={{ color: colors.gray[400] }} />
                </HStack>
              </Pressable>
            )}

            {/* Kick */}
            {canKick && (
              <Pressable
                className="flex-row items-center py-3.5"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}
                onPress={handleKick}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Remove ${member.name} from community`}
              >
                <View
                  className="items-center justify-center mr-3"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2' }}
                >
                  <Icon as={UserX} size="md" style={{ color: '#EF4444' }} />
                </View>
                <Text className="flex-1 text-base" style={{ color: '#EF4444' }}>Remove from community</Text>
              </Pressable>
            )}

            {/* Ban */}
            {canKick && onBan && (
              <Pressable
                className="flex-row items-center py-3.5"
                style={{ borderBottomWidth: 1, borderBottomColor: colors.gray[100] }}
                onPress={handleBan}
                accessible
                accessibilityRole="button"
                accessibilityLabel={`Ban ${member.name} from community`}
              >
                <View
                  className="items-center justify-center mr-3"
                  style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: '#FEE2E2' }}
                >
                  <Icon as={Ban} size="md" style={{ color: '#EF4444' }} />
                </View>
                <Text className="flex-1 text-base" style={{ color: '#EF4444' }}>Ban from community</Text>
              </Pressable>
            )}

            {/* No permissions notice */}
            {!canManage && !canChangeRole && (
              <View className="flex-row items-center justify-center py-6 px-4">
                <Icon as={ShieldOff} size="md" style={{ color: colors.gray[400] }} />
                <Text className="text-sm text-center ml-2" style={{ color: colors.gray[500] }}>
                  You don't have permission to manage this member
                </Text>
              </View>
            )}
          </View>
        </View>
      </BottomSheet>

      {/* Role Picker */}
      <RolePickerSheet
        visible={showRolePicker}
        onClose={() => setShowRolePicker(false)}
        currentRole={member.role}
        onRoleSelect={handleRoleChange}
        canPromoteToLeader={currentUserRole === 'leader'}
      />
    </>
  );
}

// =============================================================================
// MEMBER LIST COMPONENT
// =============================================================================

export function MemberList({
  members,
  currentUserRole,
  currentUserId,
  onMemberPress,
  searchQuery = '',
}: MemberListProps) {
  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;

    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.name.toLowerCase().includes(query) ||
        m.email?.toLowerCase().includes(query)
    );
  }, [members, searchQuery]);

  // Group by role
  const groupedMembers = useMemo(() => {
    const groups: Record<MemberRole, CommunityMember[]> = {
      leader: [],
      co_leader: [],
      admin: [],
      member: [],
    };

    filteredMembers.forEach((m) => {
      groups[m.role].push(m);
    });

    return groups;
  }, [filteredMembers]);

  const renderMember = useCallback(
    ({ item }: { item: CommunityMember }) => {
      const isCurrentUser = item.member_id === currentUserId;
      const canManage = canManageMember(currentUserRole, item.role);

      return (
        <MemberCard
          member={item}
          onPress={() => onMemberPress(item)}
          showManageButton={canManage && !isCurrentUser}
          isCurrentUser={isCurrentUser}
        />
      );
    },
    [currentUserRole, currentUserId, onMemberPress]
  );

  if (filteredMembers.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-10">
        <Icon as={Users} size="3xl" style={{ color: colors.gray[300] }} />
        <Text className="text-sm mt-2" style={{ color: colors.gray[500] }}>
          {searchQuery ? 'No members found' : 'No members yet'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
      {ROLE_HIERARCHY.map((role) => {
        const roleMembers = groupedMembers[role];
        if (roleMembers.length === 0) return null;

        const config = ROLE_CONFIG[role];

        return (
          <View key={role} className="mb-4">
            <HStack space="sm" className="items-center mb-2 px-4">
              <Icon as={config.icon} size="sm" style={{ color: config.color }} />
              <Text
                className="text-[13px] font-semibold uppercase tracking-wide"
                style={{ color: config.color }}
              >
                {config.label}s ({roleMembers.length})
              </Text>
            </HStack>
            {roleMembers.map((member) => (
              <View key={member.id}>
                {renderMember({ item: member })}
              </View>
            ))}
          </View>
        );
      })}
    </ScrollView>
  );
}

export default MemberManagementSheet;
