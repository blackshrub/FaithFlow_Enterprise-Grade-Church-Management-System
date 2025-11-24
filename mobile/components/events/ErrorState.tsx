/**
 * Error State Component
 *
 * Displays user-friendly error messages with retry functionality
 * Used when event queries fail
 */

import React from 'react';
import { View } from 'react-native';
import { AlertCircle, RefreshCw } from 'lucide-react-native';
import { MotiView } from 'moti';

import { Text } from '@/components/ui/text';
import { Heading } from '@/components/ui/heading';
import { VStack } from '@/components/ui/vstack';
import { Icon } from '@/components/ui/icon';
import { Button, ButtonText, ButtonIcon } from '@/components/ui/button';
import { colors } from '@/constants/theme';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retrying?: boolean;
}

export function ErrorState({
  title = 'Unable to Load Events',
  message = 'Something went wrong while fetching events. Please try again.',
  onRetry,
  retrying = false,
}: ErrorStateProps) {
  return (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        type: 'timing',
        duration: 300,
      }}
      className="flex-1 items-center justify-center px-8"
    >
      <VStack space="lg" className="items-center max-w-sm">
        {/* Error Icon */}
        <MotiView
          from={{ rotate: '0deg' }}
          animate={{ rotate: '10deg' }}
          transition={{
            type: 'timing',
            duration: 200,
            loop: true,
          }}
        >
          <View
            className="w-20 h-20 rounded-full items-center justify-center"
            style={{ backgroundColor: colors.error[50] }}
          >
            <Icon as={AlertCircle} size="2xl" className="text-error-600" />
          </View>
        </MotiView>

        {/* Error Message */}
        <VStack space="sm" className="items-center">
          <Heading size="xl" className="text-gray-900 font-bold text-center">
            {title}
          </Heading>
          <Text className="text-gray-500 text-center leading-relaxed">{message}</Text>
        </VStack>

        {/* Retry Button */}
        {onRetry && (
          <Button
            onPress={onRetry}
            size="lg"
            disabled={retrying}
            className="min-w-[180px]"
            style={{
              backgroundColor: retrying ? colors.gray[300] : colors.primary[500],
            }}
          >
            <ButtonIcon as={RefreshCw} className={retrying ? 'animate-spin' : ''} />
            <ButtonText className="font-semibold">
              {retrying ? 'Retrying...' : 'Try Again'}
            </ButtonText>
          </Button>
        )}
      </VStack>
    </MotiView>
  );
}
