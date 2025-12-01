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
 *
 * Styling: NativeWind-first with inline style for dynamic colors
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { View, Pressable } from 'react-native';
import BottomSheet, { BottomSheetBackdrop, BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Check, CheckCheck, Eye, Clock } from 'lucide-react-native';
import { Image } from 'expo-image';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { HStack } from '@/components/ui/hstack';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { Avatar, AvatarFallbackText, AvatarImage } from '@/components/ui/avatar';
import { colors } from '@/constants/theme';

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
    <HStack space="xs" className="items-center ml-1">
      <Icon
        as={config.icon}
        size={size === 'sm' ? 'xs' : 'sm'}
        style={{ color: config.color }}
      />
      {showLabel && (
        <Text className="text-[10px]" style={{ color: config.color }}>
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
    <Pressable onPress={onPress} className="py-1 px-2">
      <HStack space="xs" className="items-center">
        <Icon as={Eye} size="xs" style={{ color: colors.gray[500] }} />
        <HStack className="flex-row items-center">
          {displayReaders.map((reader, index) => (
            <View
              key={reader.id}
              className="w-[18px] h-[18px] rounded-full border-[1.5px] border-white overflow-hidden"
              style={{ marginLeft: index > 0 ? -8 : 0, zIndex: 3 - index }}
            >
              {reader.avatar_url ? (
                <Image
                  source={{ uri: reader.avatar_url }}
                  className="w-full h-full"
                />
              ) : (
                <View className="w-full h-full items-center justify-center" style={{ backgroundColor: colors.primary[100] }}>
                  <Text className="text-[10px] font-semibold" style={{ color: colors.primary[600] }}>
                    {reader.name.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </HStack>
        <Text className="text-[11px]" style={{ color: colors.gray[600] }}>
          {readers.length === 1
            ? readers[0].name
            : remainingCount > 0
            ? `${displayReaders.map((r) => r.name.split(' ')[0]).join(', ')} +${remainingCount}`
            : displayReaders.map((r) => r.name.split(' ')[0]).join(', ')}
        </Text>
        <Text className="text-[11px]" style={{ color: colors.gray[400] }}>
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
      <HStack space="md" className="px-4 py-2 items-center">
        <Avatar size="md">
          {item.avatar_url ? (
            <AvatarImage source={{ uri: item.avatar_url }} />
          ) : (
            <AvatarFallbackText>{item.name}</AvatarFallbackText>
          )}
        </Avatar>
        <VStack className="flex-1">
          <Text className="text-[15px] font-medium text-gray-900">{item.name}</Text>
          <Text className="text-[13px] text-gray-500">Read {formatReadTime(item.read_at)}</Text>
        </VStack>
        <Icon as={CheckCheck} size="sm" style={{ color: colors.primary[500] }} />
      </HStack>
    ),
    []
  );

  const unreadCount = totalMembers - readers.length;

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
      <VStack className="flex-1">
        {/* Header */}
        <VStack space="xs" className="px-4 pb-3 border-b border-gray-100">
          <Heading size="lg">Message Info</Heading>
          <HStack space="lg">
            <HStack space="xs" className="items-center">
              <Icon as={Check} size="xs" style={{ color: colors.gray[500] }} />
              <Text className="text-[13px] text-gray-500">Sent {formatTime(sentAt)}</Text>
            </HStack>
            {deliveredAt && (
              <HStack space="xs" className="items-center">
                <Icon as={CheckCheck} size="xs" style={{ color: colors.gray[500] }} />
                <Text className="text-[13px] text-gray-500">Delivered {formatTime(deliveredAt)}</Text>
              </HStack>
            )}
          </HStack>
        </VStack>

        {/* Read By Section */}
        <VStack className="flex-1">
          <HStack className="px-4 py-3 justify-between items-center" style={{ backgroundColor: colors.gray[50] }}>
            <HStack space="xs" className="items-center">
              <Icon as={CheckCheck} size="sm" style={{ color: colors.primary[500] }} />
              <Text className="text-sm font-semibold text-gray-700">Read by</Text>
            </HStack>
            <Text className="text-sm font-semibold text-gray-500">{readers.length}</Text>
          </HStack>

          {readers.length > 0 ? (
            <BottomSheetFlatList
              data={readers}
              keyExtractor={(item: ReadReceiptUser) => item.id}
              renderItem={renderReader}
              contentContainerStyle={{ paddingVertical: 8 }}
            />
          ) : (
            <View className="p-6 items-center">
              <Text className="text-sm text-gray-500 text-center">No one has read this message yet</Text>
            </View>
          )}
        </VStack>

        {/* Unread Section */}
        {unreadCount > 0 && (
          <VStack>
            <HStack className="px-4 py-3 justify-between items-center" style={{ backgroundColor: colors.gray[50] }}>
              <HStack space="xs" className="items-center">
                <Icon as={CheckCheck} size="sm" style={{ color: colors.gray[400] }} />
                <Text className="text-sm font-semibold text-gray-700">Not read yet</Text>
              </HStack>
              <Text className="text-sm font-semibold text-gray-500">{unreadCount}</Text>
            </HStack>
            <View className="p-6 items-center">
              <Text className="text-sm text-gray-500 text-center">
                {unreadCount} member{unreadCount > 1 ? 's' : ''} haven't read this message
              </Text>
            </View>
          </VStack>
        )}
      </VStack>
    </BottomSheet>
  );
}

export default MessageStatusIndicator;
