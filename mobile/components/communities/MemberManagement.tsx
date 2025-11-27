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
  StyleSheet,
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
      style={({ pressed }) => [
        styles.memberCard,
        pressed && styles.memberCardPressed,
      ]}
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
            <View style={styles.onlineIndicator} />
          )}
        </View>

        {/* Member Info */}
        <VStack className="flex-1">
          <HStack space="sm" className="items-center">
            <Text style={styles.memberName} numberOfLines={1}>
              {member.name}
              {isCurrentUser && (
                <Text style={styles.youLabel}> (You)</Text>
              )}
            </Text>
            {member.role !== 'member' && <RoleBadge role={member.role} />}
          </HStack>
          <HStack space="sm" className="items-center mt-0.5">
            <Text style={styles.memberMeta}>
              Joined {new Date(member.joined_at).toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric',
              })}
            </Text>
            {member.message_count !== undefined && (
              <>
                <Text style={styles.dotSeparator}>•</Text>
                <Text style={styles.memberMeta}>
                  {member.message_count} messages
                </Text>
              </>
            )}
          </HStack>
        </VStack>

        {/* Action button */}
        {showManageButton && !isCurrentUser && (
          <View style={styles.moreButton}>
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
      backgroundStyle={styles.sheetBackground}
      handleIndicatorStyle={styles.handleIndicator}
    >
      <View style={styles.rolePickerContainer}>
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
                style={[
                  styles.roleOption,
                  isSelected && styles.roleOptionSelected,
                ]}
              >
                <View
                  style={[
                    styles.roleIconContainer,
                    { backgroundColor: config.bgColor },
                  ]}
                >
                  <Icon as={config.icon} size="md" style={{ color: config.color }} />
                </View>
                <VStack className="flex-1 ml-3">
                  <Text style={styles.roleLabel}>{config.label}</Text>
                  <Text style={styles.roleDescription}>
                    {role === 'leader' && 'Full control over the community'}
                    {role === 'co_leader' && 'Can manage members and settings'}
                    {role === 'admin' && 'Can moderate messages and members'}
                    {role === 'member' && 'Regular community member'}
                  </Text>
                </VStack>
                {isSelected && (
                  <View style={styles.selectedCheck}>
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
        backgroundStyle={styles.sheetBackground}
        handleIndicatorStyle={styles.handleIndicator}
      >
        <View style={styles.container}>
          {/* Member Header */}
          <View style={styles.memberHeader}>
            <Avatar size="xl" style={{ backgroundColor: roleConfig.bgColor }}>
              {member.avatar_url ? (
                <AvatarImage source={{ uri: member.avatar_url }} />
              ) : (
                <AvatarFallbackText style={{ color: roleConfig.color, fontSize: 24 }}>
                  {member.name.substring(0, 2).toUpperCase()}
                </AvatarFallbackText>
              )}
            </Avatar>
            <Text style={styles.memberHeaderName}>{member.name}</Text>
            <RoleBadge role={member.role} />
            <Text style={styles.memberJoinDate}>
              Member since {new Date(member.joined_at).toLocaleDateString('en-US', {
                month: 'long',
                year: 'numeric',
              })}
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionsContainer}>
            {/* Message */}
            {onMessage && (
              <Pressable
                style={styles.actionRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  onMessage(member.member_id);
                  onClose();
                }}
              >
                <View style={styles.actionIcon}>
                  <Icon as={MessageCircle} size="md" style={{ color: colors.primary[600] }} />
                </View>
                <Text style={styles.actionText}>Send message</Text>
                <Icon as={ChevronRight} size="md" style={{ color: colors.gray[400] }} />
              </Pressable>
            )}

            {/* Change Role */}
            {canChangeRole && (
              <Pressable
                style={styles.actionRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowRolePicker(true);
                }}
              >
                <View style={styles.actionIcon}>
                  <Icon as={Shield} size="md" style={{ color: colors.secondary[600] }} />
                </View>
                <Text style={styles.actionText}>Change role</Text>
                <HStack space="sm" className="items-center">
                  <Text style={styles.currentRoleText}>{roleConfig.label}</Text>
                  <Icon as={ChevronRight} size="md" style={{ color: colors.gray[400] }} />
                </HStack>
              </Pressable>
            )}

            {/* Kick */}
            {canKick && (
              <Pressable style={styles.actionRow} onPress={handleKick}>
                <View style={[styles.actionIcon, styles.actionIconDanger]}>
                  <Icon as={UserX} size="md" style={{ color: '#EF4444' }} />
                </View>
                <Text style={styles.actionTextDanger}>Remove from community</Text>
              </Pressable>
            )}

            {/* Ban */}
            {canKick && onBan && (
              <Pressable style={styles.actionRow} onPress={handleBan}>
                <View style={[styles.actionIcon, styles.actionIconDanger]}>
                  <Icon as={Ban} size="md" style={{ color: '#EF4444' }} />
                </View>
                <Text style={styles.actionTextDanger}>Ban from community</Text>
              </Pressable>
            )}

            {/* No permissions notice */}
            {!canManage && !canChangeRole && (
              <View style={styles.noPermissionNotice}>
                <Icon as={ShieldOff} size="md" style={{ color: colors.gray[400] }} />
                <Text style={styles.noPermissionText}>
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
      <View style={styles.emptyContainer}>
        <Icon as={Users} size="3xl" style={{ color: colors.gray[300] }} />
        <Text style={styles.emptyText}>
          {searchQuery ? 'No members found' : 'No members yet'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.memberList} showsVerticalScrollIndicator={false}>
      {ROLE_HIERARCHY.map((role) => {
        const roleMembers = groupedMembers[role];
        if (roleMembers.length === 0) return null;

        const config = ROLE_CONFIG[role];

        return (
          <View key={role} style={styles.roleGroup}>
            <HStack space="sm" className="items-center mb-2 px-4">
              <Icon as={config.icon} size="sm" style={{ color: config.color }} />
              <Text style={[styles.roleGroupTitle, { color: config.color }]}>
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

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  // Sheet
  sheetBackground: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  handleIndicator: {
    backgroundColor: colors.gray[300],
    width: 40,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Member Card
  memberCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  memberCardPressed: {
    backgroundColor: colors.gray[50],
  },
  memberName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
    flex: 1,
  },
  youLabel: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray[500],
  },
  memberMeta: {
    fontSize: 12,
    color: colors.gray[500],
  },
  dotSeparator: {
    fontSize: 12,
    color: colors.gray[400],
  },
  moreButton: {
    padding: 8,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },

  // Member Header
  memberHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  memberHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.gray[900],
    marginTop: 12,
    marginBottom: 8,
  },
  memberJoinDate: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 8,
  },

  // Actions
  actionsContainer: {
    paddingTop: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  actionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.gray[100],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  actionIconDanger: {
    backgroundColor: '#FEE2E2',
  },
  actionText: {
    flex: 1,
    fontSize: 16,
    color: colors.gray[900],
  },
  actionTextDanger: {
    flex: 1,
    fontSize: 16,
    color: '#EF4444',
  },
  currentRoleText: {
    fontSize: 14,
    color: colors.gray[500],
  },

  // Role Picker
  rolePickerContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: borderRadius.xl,
    backgroundColor: colors.gray[50],
    marginBottom: 8,
  },
  roleOptionSelected: {
    backgroundColor: colors.primary[50],
    borderWidth: 2,
    borderColor: colors.primary[500],
  },
  roleIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.gray[900],
  },
  roleDescription: {
    fontSize: 13,
    color: colors.gray[500],
    marginTop: 2,
  },
  selectedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary[500],
    alignItems: 'center',
    justifyContent: 'center',
  },

  // No Permission
  noPermissionNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  noPermissionText: {
    fontSize: 14,
    color: colors.gray[500],
    marginLeft: 8,
    textAlign: 'center',
  },

  // Member List
  memberList: {
    flex: 1,
  },
  roleGroup: {
    marginBottom: 16,
  },
  roleGroupTitle: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Empty
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray[500],
    marginTop: 8,
  },
});

export default MemberManagementSheet;
