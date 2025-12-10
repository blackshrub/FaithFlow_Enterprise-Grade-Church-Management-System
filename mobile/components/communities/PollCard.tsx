/**
 * Poll Card Component
 *
 * Displays a poll within a chat message:
 * - Question display
 * - Voting options with progress bars
 * - Vote counts and percentages
 * - Expired state handling
 * - Interactive voting
 */

import React, { useMemo, useCallback, useEffect } from 'react';
import {
  View,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeIn,
  FadeInUp,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import {
  BarChart3,
  Check,
  Clock,
  Users,
  Eye,
  EyeOff,
  CheckCircle2,
} from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { VStack } from '@/components/ui/vstack';
import { HStack } from '@/components/ui/hstack';
import { Icon } from '@/components/ui/icon';
import { Badge, BadgeText } from '@/components/ui/badge';

import { useVotePoll } from '@/hooks/useCommunities';
import { colors, spacing, borderRadius } from '@/constants/theme';

// =============================================================================
// TYPES
// =============================================================================

export interface PollOption {
  id: string;
  text: string;
  vote_count: number;
  voters?: string[]; // member IDs who voted (if not anonymous)
}

export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  total_votes: number;
  allow_multiple?: boolean;
  allow_multiple_answers?: boolean; // CommunityPoll compatibility
  is_anonymous: boolean;
  expires_at?: string;
  closes_at?: string; // CommunityPoll compatibility
  created_by?: {
    id: string;
    name: string;
  };
  created_by_member_id?: string; // CommunityPoll compatibility
  created_at: string;
  is_closed?: boolean; // CommunityPoll compatibility
}

interface PollCardProps {
  poll: Poll;
  messageId: string;
  currentMemberId?: string;
  myVotes?: string[]; // IDs of options I voted for
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function formatTimeRemaining(expiresAt: string): string {
  const now = new Date();
  const expiry = new Date(expiresAt);
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Ended';

  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays}d left`;
  } else if (diffHours > 0) {
    return `${diffHours}h left`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes}m left`;
  }
}

// =============================================================================
// ANIMATED PROGRESS BAR
// =============================================================================

interface AnimatedProgressBarProps {
  percentage: number;
  backgroundColor: string;
}

function AnimatedProgressBar({ percentage, backgroundColor }: AnimatedProgressBarProps) {
  const widthProgress = useSharedValue(0);

  useEffect(() => {
    widthProgress.value = withTiming(percentage, { duration: 500 });
  }, [percentage, widthProgress]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${widthProgress.value}%`,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          backgroundColor,
          borderRadius: borderRadius.xl,
        },
        animatedStyle,
      ]}
    />
  );
}

// =============================================================================
// POLL OPTION ROW
// =============================================================================

interface PollOptionRowProps {
  option: PollOption;
  totalVotes: number;
  isSelected: boolean;
  isExpired: boolean;
  allowMultiple: boolean;
  onVote: () => void;
  isVoting: boolean;
}

function PollOptionRow({
  option,
  totalVotes,
  isSelected,
  isExpired,
  allowMultiple,
  onVote,
  isVoting,
}: PollOptionRowProps) {
  const percentage = totalVotes > 0 ? Math.round((option.vote_count / totalVotes) * 100) : 0;
  const canVote = !isExpired;

  return (
    <Pressable
      onPress={() => {
        if (canVote && !isVoting) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onVote();
        }
      }}
      disabled={!canVote || isVoting}
      className="relative mb-2"
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Vote for ${option.text}. Currently has ${option.vote_count} votes, ${percentage} percent.${isSelected ? ' Selected.' : ''}${isExpired ? ' Poll ended.' : ''}`}
    >
      <View
        className="rounded-xl overflow-hidden"
        style={{
          backgroundColor: isSelected ? colors.primary[50] : colors.gray[100],
          borderWidth: isSelected ? 2 : 1,
          borderColor: isSelected ? colors.primary[500] : colors.gray[200],
        }}
      >
        {/* Progress bar background */}
        <AnimatedProgressBar
          percentage={percentage}
          backgroundColor={isSelected ? colors.primary[100] : colors.gray[200]}
        />

        {/* Content */}
        <HStack className="px-4 py-3 items-center relative">
          {/* Checkbox/Radio indicator */}
          <View
            className="w-6 h-6 rounded-full items-center justify-center mr-3"
            style={{
              borderWidth: 2,
              borderColor: isSelected ? colors.primary[500] : colors.gray[400],
              backgroundColor: isSelected ? colors.primary[500] : 'transparent',
            }}
          >
            {isSelected && (
              <Icon as={Check} size="xs" className="text-white" />
            )}
          </View>

          {/* Option text */}
          <Text
            className={`flex-1 ${isSelected ? 'text-primary-700 font-medium' : 'text-gray-800'}`}
          >
            {option.text}
          </Text>

          {/* Vote count & percentage */}
          {(isExpired || totalVotes > 0) && (
            <HStack space="sm" className="items-center">
              <Text className="text-gray-500 text-sm">
                {option.vote_count}
              </Text>
              <Text className="text-gray-400 text-sm font-medium">
                {percentage}%
              </Text>
            </HStack>
          )}

          {isVoting && isSelected && (
            <ActivityIndicator size="small" color={colors.primary[500]} />
          )}
        </HStack>
      </View>
    </Pressable>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function PollCard({
  poll,
  messageId,
  currentMemberId,
  myVotes = [],
}: PollCardProps) {
  const voteMutation = useVotePoll();

  const expiryDate = poll.expires_at || poll.closes_at;
  const allowMultiSelect = poll.allow_multiple ?? poll.allow_multiple_answers ?? false;

  const isExpired = useMemo(() => {
    if (poll.is_closed) return true;
    if (!expiryDate) return false;
    return new Date(expiryDate) < new Date();
  }, [expiryDate, poll.is_closed]);

  const timeRemaining = useMemo(() => {
    if (!expiryDate) return null;
    return formatTimeRemaining(expiryDate);
  }, [expiryDate]);

  const handleVote = useCallback(async (optionId: string) => {
    try {
      const isSelected = myVotes.includes(optionId);
      await voteMutation.mutateAsync({
        messageId,
        pollId: poll.id,
        optionId,
        action: isSelected ? 'remove' : 'add',
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Vote failed:', error);
    }
  }, [messageId, poll.id, myVotes, voteMutation]);

  return (
    <View
      className="rounded-xl overflow-hidden"
      style={{ backgroundColor: colors.gray[50] }}
    >
      {/* Header */}
      <View
        className="px-4 py-3"
        style={{ backgroundColor: colors.primary[50] }}
      >
        <HStack space="sm" className="items-center mb-2">
          <Icon as={BarChart3} size="sm" style={{ color: colors.primary[600] }} />
          <Text className="text-primary-600 font-semibold text-sm uppercase">
            Poll
          </Text>
          {poll.is_anonymous && (
            <Badge size="sm" action="muted" variant="outline">
              <Icon as={EyeOff} size="xs" className="text-gray-500 mr-1" />
              <BadgeText className="text-gray-500">Anonymous</BadgeText>
            </Badge>
          )}
          {allowMultiSelect && (
            <Badge size="sm" action="info" variant="outline">
              <BadgeText>Multi-select</BadgeText>
            </Badge>
          )}
        </HStack>
        <Text className="text-gray-900 font-semibold text-base">
          {poll.question}
        </Text>
      </View>

      {/* Options */}
      <View className="p-3">
        {poll.options.map((option) => (
          <PollOptionRow
            key={option.id}
            option={option}
            totalVotes={poll.total_votes}
            isSelected={myVotes.includes(option.id)}
            isExpired={isExpired}
            allowMultiple={allowMultiSelect}
            onVote={() => handleVote(option.id)}
            isVoting={voteMutation.isPending}
          />
        ))}
      </View>

      {/* Footer */}
      <View className="px-4 py-2 border-t border-gray-200">
        <HStack className="justify-between items-center">
          <HStack space="sm" className="items-center">
            <Icon as={Users} size="xs" className="text-gray-400" />
            <Text className="text-gray-500 text-sm">
              {poll.total_votes} vote{poll.total_votes !== 1 ? 's' : ''}
            </Text>
          </HStack>

          {timeRemaining && (
            <HStack space="sm" className="items-center">
              <Icon
                as={isExpired ? CheckCircle2 : Clock}
                size="xs"
                style={{ color: isExpired ? colors.success[500] : colors.gray[400] }}
              />
              <Text
                className={`text-sm ${isExpired ? 'text-success-600 font-medium' : 'text-gray-500'}`}
              >
                {timeRemaining}
              </Text>
            </HStack>
          )}
        </HStack>
      </View>
    </View>
  );
}

export default PollCard;
