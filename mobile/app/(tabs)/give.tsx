/**
 * Give/Offering Screen
 *
 * Features:
 * - Fund selection with progress bars to goal
 * - Quick amount buttons
 * - Payment method selection
 * - Giving history with filters
 * - Skeleton loading
 * - Pull-to-refresh
 * - Complete bilingual support (EN/ID)
 */

import React, { useState, useCallback } from 'react';
import { ScrollView, RefreshControl, Share, Alert, Linking } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { MotiView } from 'moti';
import {
  View,
  VStack,
  HStack,
  Text,
  Heading,
  Card,
  Button,
  ButtonText,
  Icon,
  Badge,
  BadgeText,
  Pressable,
  Input,
  InputField,
  Skeleton,
  SkeletonText,
} from '@gluestack-ui/themed';
import {
  DollarSign,
  Heart,
  TrendingUp,
  Calendar,
  CreditCard,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  RefreshCw,
  History as HistoryIcon,
} from 'lucide-react-native';

import {
  useFunds,
  usePaymentConfig,
  useCreateGiving,
  useGivingHistory,
  useGivingSummary,
} from '@/hooks/useGiving';
import type { Fund, PaymentMethodType } from '@/types/giving';
import { colors, borderRadius, shadows, spacing } from '@/constants/theme';

// Quick amount buttons (in local currency - IDR)
const QUICK_AMOUNTS = [50000, 100000, 250000, 500000];

export default function GiveScreen() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'give' | 'history'>('give');
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [notes, setNotes] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');

  // Queries
  const {
    data: funds,
    isLoading: fundsLoading,
    error: fundsError,
    refetch: refetchFunds,
  } = useFunds();

  const {
    data: paymentConfig,
    isLoading: configLoading,
    error: configError,
  } = usePaymentConfig();

  const {
    data: history,
    isLoading: historyLoading,
    error: historyError,
    refetch: refetchHistory,
  } = useGivingHistory(historyFilter === 'all' ? undefined : historyFilter);

  const {
    data: summary,
    isLoading: summaryLoading,
  } = useGivingSummary();

  const { mutate: createGiving, isPending: isSubmitting } = useCreateGiving();

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchFunds(), refetchHistory()]);
    setRefreshing(false);
  }, [refetchFunds, refetchHistory]);

  // Handle tab change
  const handleTabChange = useCallback((tab: 'give' | 'history') => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  // Handle fund selection
  const handleFundSelect = useCallback((fund: Fund) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFund(fund);
  }, []);

  // Handle quick amount
  const handleQuickAmount = useCallback((amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCustomAmount(amount.toString());
  }, []);

  // Handle payment method selection
  const handleMethodSelect = useCallback((method: PaymentMethodType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMethod(method);
  }, []);

  // Format currency
  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  }, []);

  // Calculate fund progress
  const getFundProgress = useCallback((fund: Fund) => {
    if (!fund.goal_amount) return 0;
    return Math.min((fund.current_amount / fund.goal_amount) * 100, 100);
  }, []);

  // Get fund category color
  const getFundCategoryColor = useCallback((category: Fund['category']) => {
    switch (category) {
      case 'tithe':
        return colors.primary[500];
      case 'offering':
        return colors.secondary[500];
      case 'mission':
        return colors.success[500];
      case 'building':
        return colors.warning[500];
      case 'special':
        return colors.error[500];
      default:
        return colors.muted[500];
    }
  }, []);

  // Get payment status color
  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'success':
        return colors.success[500];
      case 'pending':
      case 'processing':
        return colors.warning[500];
      case 'failed':
      case 'expired':
      case 'cancelled':
        return colors.error[500];
      default:
        return colors.muted[500];
    }
  }, []);

  // Get payment status icon
  const getStatusIcon = useCallback((status: string) => {
    switch (status) {
      case 'success':
        return CheckCircle;
      case 'pending':
      case 'processing':
        return Clock;
      case 'failed':
      case 'expired':
      case 'cancelled':
        return XCircle;
      default:
        return AlertCircle;
    }
  }, []);

  // Handle copy bank account
  const handleCopyAccount = useCallback(async (accountNumber: string) => {
    await Clipboard.setStringAsync(accountNumber);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t('common.success'), t('giving.config.accountCopied'));
  }, [t]);

  // Submit giving
  const handleSubmit = useCallback(() => {
    if (!selectedFund) {
      Alert.alert(t('common.error'), t('giving.errors.fundRequired'));
      return;
    }

    const amount = parseFloat(customAmount);
    if (!amount || isNaN(amount)) {
      Alert.alert(t('common.error'), t('giving.errors.amountRequired'));
      return;
    }

    if (amount < (paymentConfig?.minimum_amount || 10000)) {
      Alert.alert(
        t('common.error'),
        t('giving.errors.amountMinimum', { amount: formatCurrency(paymentConfig?.minimum_amount || 10000) })
      );
      return;
    }

    if (!selectedMethod) {
      Alert.alert(t('common.error'), t('giving.errors.paymentMethodRequired'));
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    createGiving(
      {
        fund_id: selectedFund._id,
        amount,
        payment_method: selectedMethod,
        is_anonymous: isAnonymous,
        notes: notes || undefined,
      },
      {
        onSuccess: (data) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Reset form
          setSelectedFund(null);
          setCustomAmount('');
          setSelectedMethod(null);
          setNotes('');
          setIsAnonymous(false);

          // Navigate to payment page or show success
          if (data.payment_url) {
            Linking.openURL(data.payment_url);
          } else {
            Alert.alert(t('giving.success.title'), t('giving.success.message'));
            setActiveTab('history');
          }
        },
        onError: (error: any) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            t('common.error'),
            error.response?.data?.detail || t('giving.errors.submitError')
          );
        },
      }
    );
  }, [
    selectedFund,
    customAmount,
    selectedMethod,
    isAnonymous,
    notes,
    paymentConfig,
    createGiving,
    formatCurrency,
    t,
  ]);

  // Render skeleton
  const renderSkeleton = () => (
    <VStack space="md" className="p-4">
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4">
          <VStack space="sm">
            <Skeleton height={20} width="60%" />
            <SkeletonText lines={2} />
            <Skeleton height={8} style={{ borderRadius: 999 }} />
          </VStack>
        </Card>
      ))}
    </VStack>
  );

  // Render empty state
  const renderEmpty = (message: string) => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
      }}
    >
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 999,
          backgroundColor: colors.muted[100],
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <Icon as={Heart} size="3xl" style={{ color: colors.muted[400] }} />
      </View>
      <Heading size="lg" className="text-center mb-2">
        {message}
      </Heading>
      <Button
        size="sm"
        variant="outline"
        onPress={onRefresh}
        style={{ marginTop: spacing.md }}
      >
        <Icon as={RefreshCw} size="sm" className="mr-2" />
        <ButtonText>{t('common.refresh')}</ButtonText>
      </Button>
    </MotiView>
  );

  // Render error state
  const renderError = (error: any) => (
    <MotiView
      from={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20 }}
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: spacing['2xl'],
        paddingHorizontal: spacing.lg,
      }}
    >
      <View
        style={{
          width: 120,
          height: 120,
          borderRadius: 999,
          backgroundColor: colors.error[50],
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: spacing.lg,
        }}
      >
        <Icon as={AlertCircle} size="3xl" style={{ color: colors.error[500] }} />
      </View>
      <Heading size="lg" className="text-center mb-2">
        {t('common.error')}
      </Heading>
      <Text className="text-center text-muted-600 mb-4">
        {error?.message || t('common.somethingWentWrong')}
      </Text>
      <Button size="md" onPress={onRefresh}>
        <Icon as={RefreshCw} size="sm" className="mr-2" />
        <ButtonText>{t('common.retry')}</ButtonText>
      </Button>
    </MotiView>
  );

  // Render fund card
  const renderFundCard = (fund: Fund) => {
    const progress = getFundProgress(fund);
    const isSelected = selectedFund?._id === fund._id;

    return (
      <Pressable key={fund._id} onPress={() => handleFundSelect(fund)}>
        <MotiView
          from={{ opacity: 0, translateY: 20 }}
          animate={{ opacity: 1, translateY: 0 }}
          transition={{ type: 'spring', damping: 15 }}
        >
          <Card
            style={{
              borderRadius: borderRadius.xl,
              ...shadows.md,
              borderWidth: isSelected ? 2 : 0,
              borderColor: isSelected ? colors.primary[500] : 'transparent',
            }}
          >
            <VStack space="sm" className="p-4">
              <HStack className="justify-between items-start">
                <VStack space="xs" style={{ flex: 1 }}>
                  <Heading size="md">{fund.name}</Heading>
                  <Text size="sm" className="text-muted-600">
                    {fund.description}
                  </Text>
                </VStack>
                <Badge
                  size="sm"
                  style={{ backgroundColor: getFundCategoryColor(fund.category) }}
                >
                  <BadgeText style={{ color: '#ffffff' }}>
                    {t(`giving.funds.${fund.category}`) || fund.category}
                  </BadgeText>
                </Badge>
              </HStack>

              {fund.goal_amount && (
                <VStack space="xs" className="mt-2">
                  <HStack className="justify-between">
                    <Text size="sm" className="text-muted-600">
                      {formatCurrency(fund.current_amount)} / {formatCurrency(fund.goal_amount)}
                    </Text>
                    <Text size="sm" className="font-semibold" style={{ color: colors.primary[600] }}>
                      {progress.toFixed(0)}%
                    </Text>
                  </HStack>
                  <View
                    style={{
                      height: 8,
                      backgroundColor: colors.muted[200],
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <MotiView
                      from={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ type: 'timing', duration: 800 }}
                      style={{
                        height: '100%',
                        backgroundColor: colors.primary[500],
                      }}
                    />
                  </View>
                </VStack>
              )}
            </VStack>
          </Card>
        </MotiView>
      </Pressable>
    );
  };

  // Render Give tab content
  const renderGiveTab = () => {
    if (fundsLoading || configLoading) return renderSkeleton();
    if (fundsError) return renderError(fundsError);
    if (!funds || funds.length === 0) return renderEmpty(t('giving.funds.loadFundsError'));

    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <VStack space="lg" className="p-4">
          {/* Summary Card */}
          {summary && !summaryLoading && (
            <MotiView
              from={{ opacity: 0, translateY: -20 }}
              animate={{ opacity: 1, translateY: 0 }}
            >
              <Card
                style={{
                  borderRadius: borderRadius.xl,
                  ...shadows.md,
                  backgroundColor: colors.primary[500],
                }}
              >
                <VStack space="sm" className="p-4">
                  <HStack className="items-center justify-between">
                    <HStack className="items-center" space="sm">
                      <View
                        style={{
                          width: 48,
                          height: 48,
                          borderRadius: 999,
                          backgroundColor: 'rgba(255, 255, 255, 0.2)',
                          justifyContent: 'center',
                          alignItems: 'center',
                        }}
                      >
                        <Icon as={Heart} size="xl" style={{ color: '#ffffff' }} />
                      </View>
                      <VStack space="xs">
                        <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                          {t('giving.history.totalGiven')}
                        </Text>
                        <Heading size="xl" style={{ color: '#ffffff' }}>
                          {formatCurrency(summary.total_given)}
                        </Heading>
                      </VStack>
                    </HStack>
                    <VStack className="items-end">
                      <Text size="2xl" className="font-bold" style={{ color: '#ffffff' }}>
                        {summary.total_transactions}
                      </Text>
                      <Text size="xs" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
                        {t('giving.history.title')}
                      </Text>
                    </VStack>
                  </HStack>
                </VStack>
              </Card>
            </MotiView>
          )}

          {/* Fund Selection */}
          <VStack space="sm">
            <Heading size="lg">{t('giving.selectFund')}</Heading>
            <VStack space="sm">
              {funds.map(renderFundCard)}
            </VStack>
          </VStack>

          {/* Amount Input */}
          {selectedFund && (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <VStack space="sm">
                <Heading size="lg">{t('giving.amount')}</Heading>

                {/* Quick Amount Buttons */}
                <HStack space="xs" className="flex-wrap">
                  {QUICK_AMOUNTS.map((amount) => (
                    <Button
                      key={amount}
                      size="sm"
                      variant={customAmount === amount.toString() ? 'solid' : 'outline'}
                      onPress={() => handleQuickAmount(amount)}
                      style={{ marginBottom: spacing.xs }}
                    >
                      <ButtonText>{formatCurrency(amount)}</ButtonText>
                    </Button>
                  ))}
                </HStack>

                {/* Custom Amount Input */}
                <Input>
                  <InputField
                    placeholder={t('giving.amountPlaceholder')}
                    keyboardType="numeric"
                    value={customAmount}
                    onChangeText={setCustomAmount}
                  />
                </Input>
                <Text size="xs" className="text-muted-600">
                  {t('giving.minimumAmount', {
                    amount: formatCurrency(paymentConfig?.minimum_amount || 10000),
                  })}
                </Text>
              </VStack>
            </MotiView>
          )}

          {/* Payment Method */}
          {selectedFund && customAmount && (
            <MotiView
              from={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <VStack space="sm">
                <Heading size="lg">{t('giving.paymentMethod')}</Heading>

                {paymentConfig?.is_online_enabled && paymentConfig.available_methods.length > 0 ? (
                  <VStack space="xs">
                    {paymentConfig.available_methods.map((method) => (
                      <Pressable key={method} onPress={() => handleMethodSelect(method)}>
                        <Card
                          style={{
                            borderRadius: borderRadius.lg,
                            borderWidth: selectedMethod === method ? 2 : 1,
                            borderColor: selectedMethod === method ? colors.primary[500] : colors.muted[200],
                          }}
                        >
                          <HStack className="items-center p-4" space="md">
                            <Icon as={CreditCard} size="lg" style={{ color: colors.primary[500] }} />
                            <Text className="font-semibold">
                              {t(`giving.paymentMethods.${method}`)}
                            </Text>
                          </HStack>
                        </Card>
                      </Pressable>
                    ))}
                  </VStack>
                ) : (
                  <Card style={{ borderRadius: borderRadius.lg, backgroundColor: colors.warning[50] }}>
                    <VStack space="sm" className="p-4">
                      <HStack className="items-center" space="sm">
                        <Icon as={AlertCircle} size="lg" style={{ color: colors.warning[600] }} />
                        <Heading size="sm" style={{ color: colors.warning[900] }}>
                          {t('giving.config.onlineDisabled')}
                        </Heading>
                      </HStack>
                      <Text style={{ color: colors.warning[900] }}>
                        {t('giving.config.onlineDisabledMessage')}
                      </Text>

                      {/* Manual Bank Accounts */}
                      {paymentConfig?.manual_bank_accounts && paymentConfig.manual_bank_accounts.length > 0 && (
                        <VStack space="xs" className="mt-2">
                          <Text className="font-semibold" style={{ color: colors.warning[900] }}>
                            {t('giving.config.bankAccounts')}:
                          </Text>
                          {paymentConfig.manual_bank_accounts.map((account, index) => (
                            <Card key={index} style={{ backgroundColor: '#ffffff' }}>
                              <VStack space="xs" className="p-3">
                                <Text className="font-bold">{account.bank_name}</Text>
                                <HStack className="justify-between items-center">
                                  <VStack>
                                    <Text size="sm" className="text-muted-600">
                                      {account.account_holder}
                                    </Text>
                                    <Text className="font-semibold">{account.account_number}</Text>
                                  </VStack>
                                  <Pressable onPress={() => handleCopyAccount(account.account_number)}>
                                    <HStack className="items-center" space="xs">
                                      <Icon as={Copy} size="sm" style={{ color: colors.primary[500] }} />
                                      <Text size="sm" style={{ color: colors.primary[500] }}>
                                        {t('common.copy')}
                                      </Text>
                                    </HStack>
                                  </Pressable>
                                </HStack>
                              </VStack>
                            </Card>
                          ))}
                        </VStack>
                      )}
                    </VStack>
                  </Card>
                )}
              </VStack>
            </MotiView>
          )}

          {/* Submit Button */}
          {selectedFund && customAmount && selectedMethod && (
            <MotiView
              from={{ opacity: 0, translateY: 20 }}
              animate={{ opacity: 1, translateY: 0 }}
            >
              <Button
                size="lg"
                onPress={handleSubmit}
                isDisabled={isSubmitting}
                style={{
                  backgroundColor: colors.primary[500],
                  borderRadius: borderRadius.xl,
                  ...shadows.lg,
                }}
              >
                <Icon as={Heart} size="lg" className="mr-2" />
                <ButtonText>
                  {isSubmitting ? t('giving.submitting') : t('giving.submitGiving')}
                </ButtonText>
              </Button>
            </MotiView>
          )}
        </VStack>
      </ScrollView>
    );
  };

  // Render History tab content
  const renderHistoryTab = () => {
    if (historyLoading) return renderSkeleton();
    if (historyError) return renderError(historyError);
    if (!history || history.length === 0) return renderEmpty(t('giving.history.noHistory'));

    return (
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <VStack space="lg" className="p-4">
          {/* Filter Tabs */}
          <HStack space="xs" className="flex-wrap">
            {(['all', 'success', 'pending', 'failed'] as const).map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={historyFilter === filter ? 'solid' : 'outline'}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setHistoryFilter(filter);
                }}
                style={{ marginBottom: spacing.xs }}
              >
                <ButtonText>
                  {t(`giving.history.filter${filter.charAt(0).toUpperCase() + filter.slice(1)}`)}
                </ButtonText>
              </Button>
            ))}
          </HStack>

          {/* History Items */}
          <VStack space="sm">
            {history.map((transaction) => {
              const StatusIcon = getStatusIcon(transaction.payment_status);

              return (
                <MotiView
                  key={transaction._id}
                  from={{ opacity: 0, translateX: -20 }}
                  animate={{ opacity: 1, translateX: 0 }}
                >
                  <Card style={{ borderRadius: borderRadius.lg, ...shadows.sm }}>
                    <VStack space="sm" className="p-4">
                      <HStack className="justify-between items-start">
                        <VStack space="xs" style={{ flex: 1 }}>
                          <Heading size="sm">{transaction.fund_name}</Heading>
                          <HStack className="items-center" space="xs">
                            <Icon
                              as={Calendar}
                              size="xs"
                              style={{ color: colors.muted[500] }}
                            />
                            <Text size="xs" className="text-muted-600">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </Text>
                          </HStack>
                        </VStack>
                        <VStack className="items-end" space="xs">
                          <Text className="font-bold text-lg">
                            {formatCurrency(transaction.amount)}
                          </Text>
                          <Badge
                            size="sm"
                            style={{
                              backgroundColor: getStatusColor(transaction.payment_status),
                            }}
                          >
                            <Icon
                              as={StatusIcon}
                              size="2xs"
                              style={{ color: '#ffffff', marginRight: 4 }}
                            />
                            <BadgeText style={{ color: '#ffffff' }}>
                              {t(`giving.payment.${transaction.payment_status}`)}
                            </BadgeText>
                          </Badge>
                        </VStack>
                      </HStack>

                      <HStack className="items-center" space="xs">
                        <Icon as={CreditCard} size="xs" style={{ color: colors.muted[500] }} />
                        <Text size="xs" className="text-muted-600">
                          {t(`giving.paymentMethods.${transaction.payment_method}`)}
                        </Text>
                      </HStack>

                      {transaction.is_anonymous && (
                        <Badge size="xs" variant="outline">
                          <BadgeText>{t('giving.history.anonymous')}</BadgeText>
                        </Badge>
                      )}
                    </VStack>
                  </Card>
                </MotiView>
              );
            })}
          </VStack>
        </VStack>
      </ScrollView>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
      {/* Header with Tabs */}
      <VStack
        space="md"
        className="pt-16 pb-4 px-4"
        style={{ backgroundColor: colors.primary[500] }}
      >
        <VStack space="xs">
          <Heading size="2xl" style={{ color: '#ffffff' }}>
            {t('giving.title')}
          </Heading>
          <Text size="sm" style={{ color: 'rgba(255, 255, 255, 0.8)' }}>
            {t('giving.subtitle')}
          </Text>
        </VStack>

        {/* Tabs */}
        <HStack space="xs">
          <Pressable
            onPress={() => handleTabChange('give')}
            style={{ flex: 1 }}
          >
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.lg,
                backgroundColor:
                  activeTab === 'give'
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'transparent',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <HStack className="items-center justify-center" space="xs">
                <Icon as={Heart} size="sm" style={{ color: '#ffffff' }} />
                <Text
                  className="font-semibold"
                  style={{
                    color: '#ffffff',
                  }}
                >
                  {t('giving.giveNow')}
                </Text>
              </HStack>
            </View>
          </Pressable>

          <Pressable
            onPress={() => handleTabChange('history')}
            style={{ flex: 1 }}
          >
            <View
              style={{
                paddingVertical: spacing.sm,
                paddingHorizontal: spacing.md,
                borderRadius: borderRadius.lg,
                backgroundColor:
                  activeTab === 'history'
                    ? 'rgba(255, 255, 255, 0.2)'
                    : 'transparent',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.3)',
              }}
            >
              <HStack className="items-center justify-center" space="xs">
                <Icon as={HistoryIcon} size="sm" style={{ color: '#ffffff' }} />
                <Text
                  className="font-semibold"
                  style={{
                    color: '#ffffff',
                  }}
                >
                  {t('giving.history.title')}
                </Text>
              </HStack>
            </View>
          </Pressable>
        </HStack>
      </VStack>

      {/* Content */}
      {activeTab === 'give' ? renderGiveTab() : renderHistoryTab()}
    </View>
  );
}
