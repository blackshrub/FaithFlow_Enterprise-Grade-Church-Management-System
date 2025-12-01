/**
 * HistoryItem - Memoized Giving History Item
 *
 * Displays a single giving transaction in the history list.
 *
 * Styling: NativeWind-first with inline style for dynamic colors
 */

import React, { memo, useMemo } from 'react';
import { View } from 'react-native';
import { CheckCircle, Clock, XCircle } from 'lucide-react-native';

import { Text } from '@/components/ui/text';
import { MemoIcon } from '@/components/ui/MemoIcon';
import { PremiumCard3 } from '@/components/ui/premium-card';

// =============================================================================
// TYPES
// =============================================================================

export interface GivingTransaction {
  _id: string;
  fund_name: string;
  amount: number;
  payment_status: string;
  created_at: string;
}

export interface HistoryItemProps {
  transaction: GivingTransaction;
  formatCurrency: (amount: number) => string;
}

// =============================================================================
// COLORS
// =============================================================================

const Colors = {
  neutral: {
    500: '#737373',
    900: '#171717',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const HistoryItem = memo(function HistoryItem({
  transaction,
  formatCurrency,
}: HistoryItemProps) {
  const isSuccess = transaction.payment_status === 'success';
  const isPending = ['pending', 'processing'].includes(transaction.payment_status);

  const statusConfig = useMemo(() => {
    if (isSuccess) {
      return { icon: CheckCircle, color: Colors.success };
    }
    if (isPending) {
      return { icon: Clock, color: Colors.warning };
    }
    return { icon: XCircle, color: Colors.error };
  }, [isSuccess, isPending]);

  const formattedDate = useMemo(() => {
    return new Date(transaction.created_at).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }, [transaction.created_at]);

  const formattedAmount = useMemo(
    () => formatCurrency(transaction.amount),
    [transaction.amount, formatCurrency]
  );

  return (
    <PremiumCard3 selected={false}>
      <View className="flex-row items-center gap-3.5">
        <View
          className="w-10 h-10 rounded-[10px] items-center justify-center"
          style={{ backgroundColor: statusConfig.color }}
        >
          <MemoIcon icon={statusConfig.icon} size={18} color="#FFF" />
        </View>
        <View className="flex-1">
          <Text
            className="text-[15px] font-semibold"
            style={{ color: Colors.neutral[900] }}
          >
            {transaction.fund_name}
          </Text>
          <Text
            className="text-[13px] mt-0.5"
            style={{ color: Colors.neutral[500] }}
          >
            {formattedDate}
          </Text>
        </View>
        <Text
          className="text-base font-bold"
          style={{ color: Colors.neutral[900] }}
        >
          {formattedAmount}
        </Text>
      </View>
    </PremiumCard3>
  );
});

export default HistoryItem;
