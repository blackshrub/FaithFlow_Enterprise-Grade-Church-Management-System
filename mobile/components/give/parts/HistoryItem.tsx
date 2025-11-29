/**
 * HistoryItem - Memoized Giving History Item
 *
 * Displays a single giving transaction in the history list.
 */

import React, { memo, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { CheckCircle, Clock, XCircle } from 'lucide-react-native';

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
      <View style={styles.content}>
        <View style={[styles.statusIcon, { backgroundColor: statusConfig.color }]}>
          <MemoIcon icon={statusConfig.icon} size={18} color="#FFF" />
        </View>
        <View style={styles.info}>
          <Text style={styles.fundName}>{transaction.fund_name}</Text>
          <Text style={styles.date}>{formattedDate}</Text>
        </View>
        <Text style={styles.amount}>{formattedAmount}</Text>
      </View>
    </PremiumCard3>
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  fundName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  date: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
});

export default HistoryItem;
