/**
 * ReadReceipts Component
 *
 * WhatsApp-style read receipts for group chats.
 * Features:
 * - Single check (sent)
 * - Double check (delivered)
 * - Blue double check (read)
 * - Expandable list of readers
 * - Timestamp for each read
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, Pressable, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import { Check, CheckCheck, Eye, Clock } from 'lucide-react-native';
import { Image } from 'expo-image';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { colors, spacing, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface ReadReceiptUser {
  id: string;
  name: string;
  avatar_url?: string;
  read_at: string;
}

interface MessageStatusIndicatorProps {
  status: MessageStatus;
  isOwnMessage?: boolean;
  size?: 'sm' | 'md';
  showLabel?: boolean;
}

interface ReadReceiptListProps {
  visible: boolean;
  onClose: () => void;
  messageId: string;
  readers: ReadReceiptUser[];
  totalMembers: number;
  sentAt: string;
  deliveredAt?: string;
}

interface ReadReceiptSummaryProps {
  readers: ReadReceiptUser[];
  totalMembers: number;
  onPress?: () => void;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatReadTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// =============================================================================
// MESSAGE STATUS INDICATOR (Checkmarks)
// =============================================================================

export function MessageStatusIndicator({
  status,
  isOwnMessage = true,
  size = 'sm',
  showLabel = false,
}: MessageStatusIndicatorProps) {
  if (!isOwnMessage) return null;

  const iconSize = size === 'sm' ? 14 : 18;

  const getStatusConfig = useCallback(() => {
    switch (status) {
      case 'sending':
        return {
          icon: Clock,
          color: colors.gray[400],
          label: 'Sending',
        };
      case 'sent':
        return {
          icon: Check,
          color: colors.gray[400],
          label: 'Sent',
        };
      case 'delivered':
        return {
          icon: CheckCheck,
          color: colors.gray[400],
          label: 'Delivered',
        };
      case 'read':
        return {
          icon: CheckCheck,
          color: colors.primary[500], // Blue for read
          label: 'Read',
        };
      case 'failed':
        return {
          icon: Clock,
          color: colors.error[500],
          label: 'Failed',
        };
      default:
        return {
          icon: Clock,
          color: colors.gray[400],
          label: 'Unknown',
        };
    }
  }, [status]);

  const config = getStatusConfig();

  return (
    <HStack space="xs" style={styles.statusContainer}>
      <Icon
        as={config.icon}
        size={size === 'sm' ? 'xs' : 'sm'}
        style={{ color: config.color }}
      />
      {showLabel && (
        <Text style={[styles.statusLabel, { color: config.color }]}>
          {config.label}
        </Text>
      )}
    </HStack>
  );
}

// =============================================================================
// READ RECEIPT SUMMARY (Shown below message)
// =============================================================================

export function ReadReceiptSummary({
  readers,
  totalMembers,
  onPress,
}: ReadReceiptSummaryProps) {
  if (readers.length === 0) return null;

  const displayReaders = readers.slice(0, 3);
  const remainingCount = readers.length - 3;

  return (
    <Pressable onPress={onPress} style={styles.summaryContainer}>
      <HStack space="xs" style={{ alignItems: 'center' }}>
        <Icon as={Eye} size="xs" style={{ color: colors.gray[500] }} />
        <HStack style={styles.avatarStack}>
          {displayReaders.map((reader, index) => (
            <View
              key={reader.id}
              style={[
                styles.miniAvatar,
                { marginLeft: index > 0 ? -8 : 0, zIndex: 3 - index },
              ]}
            >
              {reader.avatar_url ? (
                <Image
                  source={{ uri: reader.avatar_url }}
                  style={styles.miniAvatarImage}
                />
              ) : (
                <View style={styles.miniAvatarFallback}>
                  <Text style={styles.miniAvatarText}>
                    {reader.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </HStack>
        <Text style={styles.summaryText}>
          {readers.length === 1
            ? readers[0].name
            : remainingCount > 0
            ? `${displayReaders.map((r) => r.name.split(' ')[0]).join(', ')} +${remainingCount}`
            : displayReaders.map((r) => r.name.split(' ')[0]).join(', ')}
        </Text>
        <Text style={styles.summaryCount}>
          ({readers.length}/{totalMembers})
        </Text>
      </HStack>
    </Pressable>
  );
}

// =============================================================================
// READ RECEIPT LIST (Bottom Sheet)
// =============================================================================

export function ReadReceiptList({
  visible,
  onClose,
  messageId,
  readers,
  totalMembers,
  sentAt,
  deliveredAt,
}: ReadReceiptListProps) {
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['50%', '80%'], []);

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

  const renderReader = useCallback(
    ({ item }: { item: ReadReceiptUser }) => (
      <HStack space="md" style={styles.readerItem}>
        <Avatar size="md">
          {item.avatar_url ? (
            <AvatarImage source={{ uri: item.avatar_url }} />
          ) : (
            <AvatarFallbackText>{item.name}</AvatarFallbackText>
          )}
        </Avatar>
        <VStack style={{ flex: 1 }}>
          <Text style={styles.readerName}>{item.name}</Text>
          <Text style={styles.readerTime}>Read {formatReadTime(item.read_at)}</Text>
        </VStack>
        <Icon as={CheckCheck} size="sm" style={{ color: colors.primary[500] }} />
      </HStack>
    ),
    []
  );

  const unreadCount = totalMembers - readers.length;
  const unreadMembers = useMemo(() => {
    // In a real app, you'd have a list of all members to show who hasn't read
    return [];
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleIndicatorStyle={{ backgroundColor: colors.gray[300] }}
      backgroundStyle={{ backgroundColor: colors.white }}
    >
      <VStack style={styles.sheetContent}>
        {/* Header */}
        <VStack space="xs" style={styles.sheetHeader}>
          <Heading size="lg">Message Info</Heading>
          <HStack space="lg">
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <Icon as={Check} size="xs" style={{ color: colors.gray[500] }} />
              <Text style={styles.infoText}>Sent {formatTime(sentAt)}</Text>
            </HStack>
            {deliveredAt && (
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Icon as={CheckCheck} size="xs" style={{ color: colors.gray[500] }} />
                <Text style={styles.infoText}>Delivered {formatTime(deliveredAt)}</Text>
              </HStack>
            )}
          </HStack>
        </VStack>

        {/* Read By Section */}
        <VStack style={styles.section}>
          <HStack style={styles.sectionHeader}>
            <HStack space="xs" style={{ alignItems: 'center' }}>
              <Icon as={CheckCheck} size="sm" style={{ color: colors.primary[500] }} />
              <Text style={styles.sectionTitle}>Read by</Text>
            </HStack>
            <Text style={styles.sectionCount}>{readers.length}</Text>
          </HStack>

          {readers.length > 0 ? (
            <BottomSheetFlatList
              data={readers}
              keyExtractor={(item: ReadReceiptUser) => item.id}
              renderItem={renderReader}
              contentContainerStyle={styles.listContent}
            />
          ) : (
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>No one has read this message yet</Text>
            </View>
          )}
        </VStack>

        {/* Unread Section */}
        {unreadCount > 0 && (
          <VStack style={styles.section}>
            <HStack style={styles.sectionHeader}>
              <HStack space="xs" style={{ alignItems: 'center' }}>
                <Icon as={CheckCheck} size="sm" style={{ color: colors.gray[400] }} />
                <Text style={styles.sectionTitle}>Not read yet</Text>
              </HStack>
              <Text style={styles.sectionCount}>{unreadCount}</Text>
            </HStack>
            <View style={styles.emptySection}>
              <Text style={styles.emptyText}>
                {unreadCount} member{unreadCount > 1 ? 's' : ''} haven't read this message
              </Text>
            </View>
          </VStack>
        )}
      </VStack>
    </BottomSheet>
  );
}

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  statusContainer: {
    alignItems: 'center',
    marginLeft: spacing.xs,
  },
  statusLabel: {
    fontSize: 10,
  },
  summaryContainer: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  avatarStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  miniAvatar: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  miniAvatarImage: {
    width: '100%',
    height: '100%',
  },
  miniAvatarFallback: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniAvatarText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.primary[600],
  },
  summaryText: {
    fontSize: 11,
    color: colors.gray[600],
  },
  summaryCount: {
    fontSize: 11,
    color: colors.gray[400],
  },
  sheetContent: {
    flex: 1,
  },
  sheetHeader: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray[100],
  },
  infoText: {
    fontSize: 13,
    color: colors.gray[500],
  },
  section: {
    flex: 1,
  },
  sectionHeader: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.gray[50],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[700],
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.gray[500],
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  readerItem: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  readerName: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.gray[900],
  },
  readerTime: {
    fontSize: 13,
    color: colors.gray[500],
  },
  emptySection: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: colors.gray[500],
    textAlign: 'center',
  },
});

export default MessageStatusIndicator;
