/**
 * Give/Offering Screen - Senior-Friendly Redesign
 *
 * Design Philosophy: "Simple, clear, and encouraging for all ages"
 *
 * UX Principles:
 * - Large, readable text (minimum 16px body, 24px+ headings)
 * - Big touch targets (minimum 48px)
 * - Clear step progress indicator
 * - Plain language (no jargon)
 * - Visible back button at every step
 * - Full currency display (Rp 100.000 not 100K)
 * - Explain every option clearly
 * - One task per screen
 * - Encouraging, friendly messages
 */

import React, { useState, useCallback, useRef } from 'react';
import {
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  FadeInDown,
} from 'react-native-reanimated';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import {
  Heart,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
  Copy,
  ChevronRight,
  History,
  Gift,
  Building2,
  Globe,
  Wallet,
  QrCode,
  Banknote,
  CreditCard,
  Store,
  Check,
  Sparkles,
} from 'lucide-react-native';

import {
  useFunds,
  usePaymentConfig,
  useCreateGiving,
  useGivingHistory,
  useGivingSummary,
} from '@/hooks/useGiving';
import type { Fund, PaymentMethodType } from '@/types/giving';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Senior-friendly color palette - high contrast, easy to read
const Colors = {
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
  },
  success: {
    50: '#ECFDF5',
    500: '#10B981',
    600: '#059669',
  },
  warning: {
    50: '#FFFBEB',
    500: '#F59E0B',
    600: '#D97706',
  },
  error: {
    50: '#FEF2F2',
    500: '#EF4444',
    600: '#DC2626',
  },
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
};

// Step definitions
const STEPS = ['choose', 'amount', 'payment', 'review'] as const;
type Step = typeof STEPS[number];

// Quick give amounts with FULL display (no abbreviations!)
const QUICK_AMOUNTS = [
  { amount: 50000, label: 'Rp 50.000' },
  { amount: 100000, label: 'Rp 100.000', popular: true },
  { amount: 250000, label: 'Rp 250.000' },
  { amount: 500000, label: 'Rp 500.000' },
  { amount: 1000000, label: 'Rp 1.000.000' },
];

// Fund category icons and friendly labels
const FUND_STYLES: Record<string, { icon: any; color: string; bgColor: string }> = {
  tithe: { icon: Heart, color: '#EC4899', bgColor: '#FDF2F8' },
  offering: { icon: Gift, color: '#8B5CF6', bgColor: '#F5F3FF' },
  mission: { icon: Globe, color: '#0EA5E9', bgColor: '#F0F9FF' },
  building: { icon: Building2, color: '#F59E0B', bgColor: '#FFFBEB' },
  special: { icon: Sparkles, color: '#10B981', bgColor: '#ECFDF5' },
  default: { icon: Heart, color: '#6366F1', bgColor: '#EEF2FF' },
};

// Payment method info with CLEAR explanations
const PAYMENT_INFO: Record<string, { icon: any; name: string; description: string }> = {
  va: {
    icon: Banknote,
    name: 'Bank Transfer',
    description: 'Pay via ATM, Mobile Banking, or Internet Banking',
  },
  qris: {
    icon: QrCode,
    name: 'Scan QR Code (QRIS)',
    description: 'Use any banking or e-wallet app to scan',
  },
  ewallet: {
    icon: Wallet,
    name: 'Digital Wallet',
    description: 'Pay using GoPay, OVO, DANA, or ShopeePay',
  },
  credit_card: {
    icon: CreditCard,
    name: 'Credit/Debit Card',
    description: 'Visa, Mastercard, or JCB',
  },
  convenience_store: {
    icon: Store,
    name: 'Pay at Store',
    description: 'Pay at Indomaret, Alfamart, or Alfamidi',
  },
  bank_transfer: {
    icon: Banknote,
    name: 'Manual Bank Transfer',
    description: 'Transfer directly to church bank account',
  },
};

export default function GiveScreen() {
  const { t } = useTranslation();
  const scrollRef = useRef<ScrollView>(null);

  // State
  const [step, setStep] = useState<Step>('choose');
  const [selectedFund, setSelectedFund] = useState<Fund | null>(null);
  const [amount, setAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');

  // Queries
  const { data: funds, isLoading: fundsLoading, refetch: refetchFunds } = useFunds();
  const { data: paymentConfig } = usePaymentConfig();
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useGivingHistory(
    historyFilter === 'all' ? undefined : historyFilter
  );
  const { mutate: createGiving, isPending: isSubmitting } = useCreateGiving();

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([refetchFunds(), refetchHistory()]);
    setRefreshing(false);
  }, [refetchFunds, refetchHistory]);

  // Format currency - ALWAYS show full amount
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // Get fund style
  const getFundStyle = useCallback((category: string) => {
    return FUND_STYLES[category] || FUND_STYLES.default;
  }, []);

  // Get current step index
  const getCurrentStepIndex = () => STEPS.indexOf(step);

  // Navigate between steps
  const goToStep = useCallback((newStep: Step) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(newStep);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // Go back one step
  const goBack = useCallback(() => {
    const currentIndex = getCurrentStepIndex();
    if (currentIndex > 0) {
      goToStep(STEPS[currentIndex - 1]);
    }
  }, [step, goToStep]);

  // Handle fund selection
  const handleFundSelect = useCallback((fund: Fund) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedFund(fund);
    goToStep('amount');
  }, [goToStep]);

  // Handle amount selection
  const handleAmountSelect = useCallback((value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(value.toString());
  }, []);

  // Handle custom amount input
  const handleCustomAmount = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setAmount(cleaned);
  }, []);

  // Proceed to payment step
  const handleProceedToPayment = useCallback(() => {
    const numAmount = parseFloat(amount);
    const minAmount = paymentConfig?.minimum_amount || 10000;

    if (!numAmount || numAmount < minAmount) {
      Alert.alert(
        'Amount Too Small',
        `The minimum giving amount is ${formatCurrency(minAmount)}. Please enter a larger amount.`
      );
      return;
    }
    goToStep('payment');
  }, [amount, paymentConfig, formatCurrency, goToStep]);

  // Handle payment method selection
  const handleMethodSelect = useCallback((method: PaymentMethodType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMethod(method);
    goToStep('review');
  }, [goToStep]);

  // Submit giving
  const handleSubmit = useCallback(() => {
    if (!selectedFund || !amount || !selectedMethod) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    createGiving(
      {
        fund_id: selectedFund._id || selectedFund.id,
        amount: parseFloat(amount),
        payment_method: selectedMethod,
        is_anonymous: isAnonymous,
      },
      {
        onSuccess: (data) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Reset form
          setSelectedFund(null);
          setAmount('');
          setSelectedMethod(null);
          setIsAnonymous(false);
          setStep('choose');

          if (data.payment_url) {
            Alert.alert(
              'Opening Payment',
              'You will be redirected to complete your payment. Thank you for your generosity!',
              [
                {
                  text: 'Continue',
                  onPress: () => Linking.openURL(data.payment_url),
                },
              ]
            );
          } else {
            Alert.alert(
              'Thank You!',
              'Your giving has been recorded. God bless you for your generosity!',
              [{ text: 'OK', onPress: () => setShowHistory(true) }]
            );
          }
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(
            'Something Went Wrong',
            'We could not process your giving. Please try again or contact the church office for help.'
          );
        },
      }
    );
  }, [selectedFund, amount, selectedMethod, isAnonymous, createGiving]);

  // Copy bank account
  const handleCopyAccount = useCallback(async (accountNumber: string) => {
    await Clipboard.setStringAsync(accountNumber);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Copied!', 'Account number copied to clipboard');
  }, []);

  // Render step progress indicator
  const renderStepProgress = () => {
    const stepLabels = ['Choose', 'Amount', 'Payment', 'Review'];
    const currentIndex = getCurrentStepIndex();

    return (
      <View style={styles.progressContainer}>
        {STEPS.map((s, index) => (
          <React.Fragment key={s}>
            <View style={styles.progressStep}>
              <View
                style={[
                  styles.progressDot,
                  index <= currentIndex && styles.progressDotActive,
                  index < currentIndex && styles.progressDotCompleted,
                ]}
              >
                {index < currentIndex ? (
                  <Check size={14} color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.progressNumber,
                    index <= currentIndex && styles.progressNumberActive,
                  ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.progressLabel,
                index <= currentIndex && styles.progressLabelActive,
              ]}>
                {stepLabels[index]}
              </Text>
            </View>
            {index < STEPS.length - 1 && (
              <View
                style={[
                  styles.progressLine,
                  index < currentIndex && styles.progressLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // Render header with back button
  const renderHeader = (title: string) => (
    <View style={styles.header}>
      {step !== 'choose' && !showHistory ? (
        <Pressable onPress={goBack} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.gray[700]} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      ) : (
        <View style={styles.backButton} />
      )}
      <Text style={styles.headerTitle}>{title}</Text>
      <Pressable
        onPress={() => setShowHistory(!showHistory)}
        style={styles.historyToggle}
      >
        <History size={22} color={showHistory ? Colors.primary[600] : Colors.gray[500]} />
      </Pressable>
    </View>
  );

  // Render Step 1: Choose what to give to
  const renderChooseStep = () => (
    <Animated.View entering={FadeIn.duration(300)}>
      <Text style={styles.stepTitle}>What would you like to give to?</Text>
      <Text style={styles.stepDescription}>
        Choose a fund below. Your giving helps support the church's mission.
      </Text>

      {fundsLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : !funds || funds.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Heart size={64} color={Colors.gray[300]} />
          <Text style={styles.emptyTitle}>No Funds Available</Text>
          <Text style={styles.emptyText}>
            Please contact the church office for giving options.
          </Text>
        </View>
      ) : (
        <View style={styles.fundList}>
          {funds.map((fund, index) => {
            const style = getFundStyle(fund.category);
            const Icon = style.icon;
            const progress = fund.goal_amount
              ? Math.min((fund.current_amount / fund.goal_amount) * 100, 100)
              : null;

            return (
              <Animated.View
                key={fund.id || fund._id || index}
                entering={FadeInDown.delay(index * 100).duration(400)}
              >
                <Pressable
                  onPress={() => handleFundSelect(fund)}
                  style={({ pressed }) => [
                    styles.fundCard,
                    pressed && styles.fundCardPressed,
                  ]}
                >
                  <View style={[styles.fundIcon, { backgroundColor: style.bgColor }]}>
                    <Icon size={28} color={style.color} />
                  </View>
                  <View style={styles.fundContent}>
                    <Text style={styles.fundName}>{fund.name}</Text>
                    <Text style={styles.fundDescription} numberOfLines={2}>
                      {fund.description}
                    </Text>
                    {progress !== null && (
                      <View style={styles.fundProgressContainer}>
                        <View style={styles.fundProgressBar}>
                          <View
                            style={[
                              styles.fundProgressFill,
                              { width: `${progress}%`, backgroundColor: style.color },
                            ]}
                          />
                        </View>
                        <Text style={styles.fundProgressText}>
                          {formatCurrency(fund.current_amount)} of {formatCurrency(fund.goal_amount!)}
                        </Text>
                      </View>
                    )}
                  </View>
                  <ChevronRight size={24} color={Colors.gray[400]} />
                </Pressable>
              </Animated.View>
            );
          })}
        </View>
      )}
    </Animated.View>
  );

  // Render Step 2: Enter amount
  const renderAmountStep = () => {
    if (!selectedFund) return null;
    const style = getFundStyle(selectedFund.category);
    const Icon = style.icon;

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        {/* Selected fund reminder */}
        <View style={styles.selectedFundBanner}>
          <View style={[styles.selectedFundIcon, { backgroundColor: style.bgColor }]}>
            <Icon size={24} color={style.color} />
          </View>
          <View style={styles.selectedFundInfo}>
            <Text style={styles.selectedFundLabel}>Giving to:</Text>
            <Text style={styles.selectedFundName}>{selectedFund.name}</Text>
          </View>
        </View>

        <Text style={styles.stepTitle}>How much would you like to give?</Text>
        <Text style={styles.stepDescription}>
          Choose a suggested amount or enter your own.
        </Text>

        {/* Quick amount buttons - LARGE and CLEAR */}
        <View style={styles.quickAmountGrid}>
          {QUICK_AMOUNTS.map((item) => (
            <Pressable
              key={item.amount}
              onPress={() => handleAmountSelect(item.amount)}
              style={[
                styles.quickAmountButton,
                amount === item.amount.toString() && styles.quickAmountSelected,
              ]}
            >
              {item.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>Popular</Text>
                </View>
              )}
              <Text
                style={[
                  styles.quickAmountText,
                  amount === item.amount.toString() && styles.quickAmountTextSelected,
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Custom amount input */}
        <Text style={styles.inputLabel}>Or enter a different amount:</Text>
        <View style={styles.amountInputContainer}>
          <Text style={styles.currencyPrefix}>Rp</Text>
          <TextInput
            style={styles.amountInput}
            value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
            onChangeText={handleCustomAmount}
            placeholder="0"
            placeholderTextColor={Colors.gray[400]}
            keyboardType="numeric"
          />
        </View>
        <Text style={styles.minimumNote}>
          Minimum amount: {formatCurrency(paymentConfig?.minimum_amount || 10000)}
        </Text>

        {/* Continue button */}
        <Pressable
          onPress={handleProceedToPayment}
          disabled={!amount}
          style={[
            styles.primaryButton,
            !amount && styles.primaryButtonDisabled,
          ]}
        >
          <Text style={styles.primaryButtonText}>
            Continue to Payment
          </Text>
          <ChevronRight size={22} color="#FFFFFF" />
        </Pressable>
      </Animated.View>
    );
  };

  // Render Step 3: Choose payment method
  const renderPaymentStep = () => {
    if (!selectedFund || !amount) return null;

    const methods = paymentConfig?.available_methods || [];
    const isOnlineEnabled = paymentConfig?.is_online_enabled;

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        {/* Amount reminder */}
        <View style={styles.amountBanner}>
          <Text style={styles.amountBannerLabel}>Amount to give:</Text>
          <Text style={styles.amountBannerValue}>{formatCurrency(parseFloat(amount))}</Text>
        </View>

        <Text style={styles.stepTitle}>How would you like to pay?</Text>
        <Text style={styles.stepDescription}>
          Choose the payment method that works best for you.
        </Text>

        {isOnlineEnabled && methods.length > 0 ? (
          <View style={styles.paymentMethodList}>
            {methods.map((method, index) => {
              const info = PAYMENT_INFO[method] || PAYMENT_INFO.bank_transfer;
              const MethodIcon = info.icon;

              return (
                <Animated.View
                  key={method}
                  entering={FadeInDown.delay(index * 80)}
                >
                  <Pressable
                    onPress={() => handleMethodSelect(method)}
                    style={({ pressed }) => [
                      styles.paymentMethodCard,
                      pressed && styles.paymentMethodPressed,
                    ]}
                  >
                    <View style={styles.paymentMethodIcon}>
                      <MethodIcon size={28} color={Colors.primary[600]} />
                    </View>
                    <View style={styles.paymentMethodContent}>
                      <Text style={styles.paymentMethodName}>{info.name}</Text>
                      <Text style={styles.paymentMethodDesc}>{info.description}</Text>
                    </View>
                    <ChevronRight size={24} color={Colors.gray[400]} />
                  </Pressable>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <View style={styles.offlineContainer}>
            <Text style={styles.offlineTitle}>Online Payment Not Available</Text>
            <Text style={styles.offlineMessage}>
              Please transfer directly to our church bank account:
            </Text>

            {paymentConfig?.manual_bank_accounts?.map((account, index) => (
              <View key={index} style={styles.bankAccountCard}>
                <Text style={styles.bankName}>{account.bank_name}</Text>
                <Text style={styles.bankAccountHolder}>{account.account_holder}</Text>
                <View style={styles.bankAccountRow}>
                  <Text style={styles.bankAccountNumber}>{account.account_number}</Text>
                  <Pressable
                    onPress={() => handleCopyAccount(account.account_number)}
                    style={styles.copyButton}
                  >
                    <Copy size={18} color={Colors.primary[600]} />
                    <Text style={styles.copyText}>Copy</Text>
                  </Pressable>
                </View>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    );
  };

  // Render Step 4: Review and confirm
  const renderReviewStep = () => {
    if (!selectedFund || !amount || !selectedMethod) return null;

    const fundStyle = getFundStyle(selectedFund.category);
    const FundIcon = fundStyle.icon;
    const paymentInfo = PAYMENT_INFO[selectedMethod] || PAYMENT_INFO.bank_transfer;
    const PaymentIcon = paymentInfo.icon;

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        <Text style={styles.stepTitle}>Review Your Giving</Text>
        <Text style={styles.stepDescription}>
          Please check the details below before completing your giving.
        </Text>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Giving to</Text>
            <View style={styles.summaryValueRow}>
              <View style={[styles.summaryIcon, { backgroundColor: fundStyle.bgColor }]}>
                <FundIcon size={18} color={fundStyle.color} />
              </View>
              <Text style={styles.summaryValue}>{selectedFund.name}</Text>
            </View>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Amount</Text>
            <Text style={styles.summaryAmount}>{formatCurrency(parseFloat(amount))}</Text>
          </View>

          <View style={styles.summaryDivider} />

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Payment method</Text>
            <View style={styles.summaryValueRow}>
              <PaymentIcon size={18} color={Colors.primary[600]} />
              <Text style={styles.summaryValue}>{paymentInfo.name}</Text>
            </View>
          </View>
        </View>

        {/* Anonymous toggle */}
        <Pressable
          onPress={() => setIsAnonymous(!isAnonymous)}
          style={styles.anonymousToggle}
        >
          <View style={[styles.checkbox, isAnonymous && styles.checkboxChecked]}>
            {isAnonymous && <Check size={16} color="#FFFFFF" />}
          </View>
          <View style={styles.anonymousContent}>
            <Text style={styles.anonymousTitle}>Give anonymously</Text>
            <Text style={styles.anonymousDesc}>
              Your name will not be shown in giving records
            </Text>
          </View>
        </Pressable>

        {/* Submit button */}
        <Pressable
          onPress={handleSubmit}
          disabled={isSubmitting}
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
        >
          <LinearGradient
            colors={['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitButtonGradient}
          >
            <Heart size={24} color="#FFFFFF" fill="#FFFFFF" />
            <Text style={styles.submitButtonText}>
              {isSubmitting ? 'Processing...' : 'Complete Giving'}
            </Text>
          </LinearGradient>
        </Pressable>

        <Text style={styles.secureNote}>
          🔒 Your payment is secure and encrypted
        </Text>
      </Animated.View>
    );
  };

  // Render giving history
  const renderHistory = () => {
    const filterOptions = [
      { key: 'all', label: 'All' },
      { key: 'success', label: 'Completed' },
      { key: 'pending', label: 'Pending' },
      { key: 'failed', label: 'Failed' },
    ] as const;

    return (
      <Animated.View entering={FadeIn.duration(300)}>
        <Text style={styles.stepTitle}>Your Giving History</Text>

        {/* Filter tabs */}
        <View style={styles.filterRow}>
          {filterOptions.map((option) => (
            <Pressable
              key={option.key}
              onPress={() => setHistoryFilter(option.key)}
              style={[
                styles.filterTab,
                historyFilter === option.key && styles.filterTabActive,
              ]}
            >
              <Text
                style={[
                  styles.filterTabText,
                  historyFilter === option.key && styles.filterTabTextActive,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* History list */}
        {historyLoading ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : !history || history.length === 0 ? (
          <View style={styles.emptyContainer}>
            <History size={64} color={Colors.gray[300]} />
            <Text style={styles.emptyTitle}>No Giving Records</Text>
            <Text style={styles.emptyText}>
              Your giving history will appear here after you make your first gift.
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.map((transaction, index) => {
              const isSuccess = transaction.payment_status === 'success';
              const isPending = ['pending', 'processing'].includes(transaction.payment_status);

              return (
                <Animated.View
                  key={transaction._id}
                  entering={FadeInDown.delay(index * 50)}
                >
                  <View style={styles.historyItem}>
                    <View
                      style={[
                        styles.historyStatusIcon,
                        isSuccess && styles.historyStatusSuccess,
                        isPending && styles.historyStatusPending,
                        !isSuccess && !isPending && styles.historyStatusFailed,
                      ]}
                    >
                      {isSuccess ? (
                        <CheckCircle size={20} color="#FFFFFF" />
                      ) : isPending ? (
                        <Clock size={20} color="#FFFFFF" />
                      ) : (
                        <XCircle size={20} color="#FFFFFF" />
                      )}
                    </View>
                    <View style={styles.historyContent}>
                      <Text style={styles.historyFundName}>{transaction.fund_name}</Text>
                      <Text style={styles.historyDate}>
                        {new Date(transaction.created_at).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                    </View>
                    <Text style={styles.historyAmount}>
                      {formatCurrency(transaction.amount)}
                    </Text>
                  </View>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* Back to giving button */}
        <Pressable
          onPress={() => setShowHistory(false)}
          style={styles.backToGivingButton}
        >
          <Heart size={20} color={Colors.primary[600]} />
          <Text style={styles.backToGivingText}>Make a New Gift</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <SafeAreaView style={styles.safeArea} edges={['top']}>
        {/* Header */}
        {renderHeader(showHistory ? 'Giving History' : 'Give')}

        {/* Step progress (only show when not in history view and past first step) */}
        {!showHistory && step !== 'choose' && renderStepProgress()}

        {/* Content */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.contentContainer}
        >
          <ScrollView
            ref={scrollRef}
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
            }
          >
            {showHistory ? (
              renderHistory()
            ) : (
              <>
                {step === 'choose' && renderChooseStep()}
                {step === 'amount' && renderAmountStep()}
                {step === 'payment' && renderPaymentStep()}
                {step === 'review' && renderReviewStep()}
              </>
            )}

            {/* Bottom padding for scroll */}
            <View style={{ height: 120 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.gray[50],
  },
  safeArea: {
    flex: 1,
  },
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[200],
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    minWidth: 80,
  },
  backText: {
    fontSize: 16,
    color: Colors.gray[700],
    marginLeft: 4,
    fontWeight: '500',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  historyToggle: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
  },
  // Progress indicator
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: Colors.gray[100],
  },
  progressStep: {
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  progressDotActive: {
    backgroundColor: Colors.primary[500],
  },
  progressDotCompleted: {
    backgroundColor: Colors.success[500],
  },
  progressNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.gray[500],
  },
  progressNumberActive: {
    color: '#FFFFFF',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.gray[400],
  },
  progressLabelActive: {
    color: Colors.gray[700],
  },
  progressLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.gray[200],
    marginHorizontal: 8,
    marginBottom: 18,
  },
  progressLineActive: {
    backgroundColor: Colors.success[500],
  },
  // Content
  contentContainer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  // Step styling
  stepTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 16,
    color: Colors.gray[600],
    lineHeight: 24,
    marginBottom: 24,
  },
  // Fund cards
  fundList: {
    gap: 12,
  },
  fundCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  fundCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  fundIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  fundContent: {
    flex: 1,
  },
  fundName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 4,
  },
  fundDescription: {
    fontSize: 14,
    color: Colors.gray[500],
    lineHeight: 20,
  },
  fundProgressContainer: {
    marginTop: 10,
  },
  fundProgressBar: {
    height: 6,
    backgroundColor: Colors.gray[200],
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  fundProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  fundProgressText: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  // Selected fund banner
  selectedFundBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedFundIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  selectedFundInfo: {
    flex: 1,
  },
  selectedFundLabel: {
    fontSize: 13,
    color: Colors.gray[500],
  },
  selectedFundName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  // Quick amounts
  quickAmountGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  quickAmountButton: {
    width: (SCREEN_WIDTH - 40 - 24) / 3,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: Colors.gray[200],
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  quickAmountSelected: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.gray[700],
  },
  quickAmountTextSelected: {
    color: '#FFFFFF',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: -8,
    backgroundColor: Colors.warning[500],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  popularText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Amount input
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[700],
    marginBottom: 10,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.gray[200],
    marginBottom: 8,
  },
  currencyPrefix: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.gray[400],
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: Colors.gray[900],
    paddingVertical: 16,
  },
  minimumNote: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 24,
  },
  // Primary button
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[600],
    borderRadius: 14,
    paddingVertical: 18,
    gap: 8,
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: Colors.gray[300],
    shadowOpacity: 0,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Amount banner
  amountBanner: {
    backgroundColor: Colors.primary[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  amountBannerLabel: {
    fontSize: 14,
    color: Colors.primary[700],
    marginBottom: 4,
  },
  amountBannerValue: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary[700],
  },
  // Payment methods
  paymentMethodList: {
    gap: 12,
  },
  paymentMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  paymentMethodPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  paymentMethodIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: Colors.primary[50],
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  paymentMethodContent: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 4,
  },
  paymentMethodDesc: {
    fontSize: 14,
    color: Colors.gray[500],
    lineHeight: 20,
  },
  // Offline payment
  offlineContainer: {
    backgroundColor: Colors.warning[50],
    borderRadius: 14,
    padding: 20,
  },
  offlineTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 8,
  },
  offlineMessage: {
    fontSize: 15,
    color: Colors.gray[600],
    lineHeight: 22,
    marginBottom: 16,
  },
  bankAccountCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.gray[900],
    marginBottom: 4,
  },
  bankAccountHolder: {
    fontSize: 14,
    color: Colors.gray[500],
    marginBottom: 8,
  },
  bankAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankAccountNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gray[800],
    letterSpacing: 1,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: Colors.primary[50],
    borderRadius: 10,
  },
  copyText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  // Summary card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 15,
    color: Colors.gray[500],
  },
  summaryValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  summaryIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
  },
  summaryAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: Colors.gray[900],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.gray[100],
    marginVertical: 16,
  },
  // Anonymous toggle
  anonymousToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    gap: 14,
  },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.gray[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  anonymousContent: {
    flex: 1,
  },
  anonymousTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[800],
    marginBottom: 4,
  },
  anonymousDesc: {
    fontSize: 14,
    color: Colors.gray[500],
    lineHeight: 20,
  },
  // Submit button
  submitButton: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: Colors.primary[600],
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 20,
    gap: 12,
  },
  submitButtonText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  secureNote: {
    fontSize: 14,
    color: Colors.gray[500],
    textAlign: 'center',
    marginTop: 8,
  },
  // History
  filterRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  filterTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: Colors.gray[200],
  },
  filterTabActive: {
    backgroundColor: Colors.primary[500],
    borderColor: Colors.primary[500],
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gray[600],
  },
  filterTabTextActive: {
    color: '#FFFFFF',
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  historyStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  historyStatusSuccess: {
    backgroundColor: Colors.success[500],
  },
  historyStatusPending: {
    backgroundColor: Colors.warning[500],
  },
  historyStatusFailed: {
    backgroundColor: Colors.error[500],
  },
  historyContent: {
    flex: 1,
  },
  historyFundName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.gray[900],
    marginBottom: 4,
  },
  historyDate: {
    fontSize: 14,
    color: Colors.gray[500],
  },
  historyAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.gray[900],
  },
  backToGivingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary[50],
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
    gap: 10,
  },
  backToGivingText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary[600],
  },
  // Loading & Empty
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.gray[500],
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.gray[700],
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.gray[500],
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 20,
  },
});
