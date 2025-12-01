/**
 * Give/Offering Screen - Complete Redesign
 *
 * Design Philosophy: "Generosity made beautiful"
 *
 * Styling Strategy:
 * - NativeWind (className) for all layout and styling
 * - Gluestack for Button components (if needed)
 * - Inline style for: dynamic values, shadows, custom colors from Colors object
 *
 * Features:
 * - 4 Fixed Offering Types (Tithe, Weekly, Mission, Other)
 * - Full-bleed gradient header with giving stats
 * - AnimatePresence for Other Purpose text input
 * - Multi-tenant payment gateway integration
 * - Bank transfer fallback when payment disabled
 * - Premium animations and haptic feedback
 */

import React, { useState, useCallback, useRef, useMemo, memo } from 'react';
import {
  ScrollView,
  RefreshControl,
  Alert,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { withPremiumMotionV10 } from '@/hoc';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  SlideInRight,
  SlideInLeft,
  SlideOutLeft,
  SlideOutRight,
  LinearTransition,
} from 'react-native-reanimated';
import { useTodayHeaderMotion, todayListItemMotion } from '@/components/motion/today-motion';
import {
  View,
  Text,
  Pressable,
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
  Globe,
  Wallet,
  QrCode,
  Banknote,
  CreditCard,
  Store,
  Check,
  TrendingUp,
  Calendar,
  PenLine,
  HandHeart,
  Coins,
  Info,
  AlertCircle,
} from 'lucide-react-native';

import {
  usePaymentConfig,
  useCreateGiving,
  useGivingHistory,
  useGivingSummary,
} from '@/hooks/useGiving';
import type { PaymentMethodType } from '@/types/giving';
import { PremiumCard3 } from '@/components/ui/premium-card';

// Premium monochrome palette with accent
const Colors = {
  gradient: {
    start: '#1a1a2e',
    mid: '#16213e',
    end: '#0f3460',
  },
  accent: {
    gold: '#D4AF37',
    goldLight: '#F4E5BC',
    goldDark: '#B8962E',
  },
  neutral: {
    50: '#FAFAFA',
    100: '#F5F5F5',
    200: '#E5E5E5',
    300: '#D4D4D4',
    400: '#A3A3A3',
    500: '#737373',
    600: '#525252',
    700: '#404040',
    800: '#262626',
    900: '#171717',
  },
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  white: '#FFFFFF',
};

// Offering Types - Fixed 4 categories
type OfferingType = 'tithe' | 'weekly' | 'mission' | 'other';

interface OfferingTypeConfig {
  id: OfferingType;
  icon: any;
  gradient: [string, string];
  labelKey: string;
  subtitleKey: string;
}

const OFFERING_TYPES: OfferingTypeConfig[] = [
  {
    id: 'tithe',
    icon: Coins,
    gradient: ['#EC4899', '#BE185D'],
    labelKey: 'give.tithe',
    subtitleKey: 'give.titheSubtitle',
  },
  {
    id: 'weekly',
    icon: HandHeart,
    gradient: ['#8B5CF6', '#6D28D9'],
    labelKey: 'give.weeklyOffering',
    subtitleKey: 'give.weeklySubtitle',
  },
  {
    id: 'mission',
    icon: Globe,
    gradient: ['#0EA5E9', '#0369A1'],
    labelKey: 'give.mission',
    subtitleKey: 'give.missionSubtitle',
  },
  {
    id: 'other',
    icon: PenLine,
    gradient: ['#F59E0B', '#B45309'],
    labelKey: 'give.other',
    subtitleKey: 'give.otherSubtitle',
  },
];

// Quick amounts
const QUICK_AMOUNTS = [
  { amount: 50000, label: 'Rp 50.000' },
  { amount: 100000, label: 'Rp 100.000' },
  { amount: 250000, label: 'Rp 250.000' },
  { amount: 500000, label: 'Rp 500.000' },
  { amount: 1000000, label: 'Rp 1.000.000' },
  { amount: 2500000, label: 'Rp 2.500.000' },
];

// Payment method info
const PAYMENT_INFO: Record<string, { icon: any; name: string; description: string }> = {
  va: {
    icon: Banknote,
    name: 'Bank Transfer',
    description: 'ATM, Mobile Banking, or Internet Banking',
  },
  qris: {
    icon: QrCode,
    name: 'QRIS',
    description: 'Scan with any banking or e-wallet app',
  },
  ewallet: {
    icon: Wallet,
    name: 'E-Wallet',
    description: 'GoPay, OVO, DANA, or ShopeePay',
  },
  credit_card: {
    icon: CreditCard,
    name: 'Card Payment',
    description: 'Visa, Mastercard, or JCB',
  },
  convenience_store: {
    icon: Store,
    name: 'Convenience Store',
    description: 'Indomaret, Alfamart, or Alfamidi',
  },
  bank_transfer: {
    icon: Banknote,
    name: 'Manual Transfer',
    description: 'Direct bank transfer',
  },
};

// Step definitions
const STEPS = ['choose', 'amount', 'payment', 'review'] as const;
type Step = (typeof STEPS)[number];

function GiveScreen() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<Animated.ScrollView>(null);
  const otherPurposeInputRef = useRef<TextInput>(null);

  // Focus key for animations - kept static to avoid replaying on tab switch
  const focusKey = 0;

  // State
  const [step, setStep] = useState<Step>('choose');
  const [selectedType, setSelectedType] = useState<OfferingType | null>(null);
  const [otherPurpose, setOtherPurpose] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyFilter, setHistoryFilter] = useState<'all' | 'success' | 'pending' | 'failed'>('all');


  // Queries
  const { data: paymentConfig, isLoading: configLoading } = usePaymentConfig();
  const { data: history, isLoading: historyLoading, refetch: refetchHistory } = useGivingHistory(
    historyFilter === 'all' ? undefined : historyFilter
  );
  const { data: givingSummary } = useGivingSummary();
  const { mutate: createGiving, isPending: isSubmitting } = useCreateGiving();

  // Refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetchHistory();
    setRefreshing(false);
  }, [refetchHistory]);

  // Format currency
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }, []);

  // Get purpose string
  const getPurposeString = useCallback(() => {
    if (!selectedType) return '';
    if (selectedType === 'other') return otherPurpose || t('give.other');
    return t(`give.${selectedType}` as any);
  }, [selectedType, otherPurpose, t]);

  // Navigate between steps
  const goToStep = useCallback((newStep: Step) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep(newStep);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  // Go back - instant switch (V10 handles screen transitions)
  const goBack = useCallback(() => {
    const currentIndex = STEPS.indexOf(step);
    if (currentIndex > 0) {
      goToStep(STEPS[currentIndex - 1]);
    }
  }, [step, goToStep]);

  // Handle type selection
  const handleTypeSelect = useCallback((type: OfferingType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedType(type);

    // If selecting "other", scroll to show text field and focus input
    if (type === 'other') {
      // First scroll, then focus after scroll completes
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 300);
      // Focus input after scroll animation + keyboard appears
      setTimeout(() => {
        otherPurposeInputRef.current?.focus();
        // Scroll again after keyboard is up to ensure visibility
        setTimeout(() => {
          scrollRef.current?.scrollToEnd({ animated: true });
        }, 300);
      }, 500);
    }
  }, []);

  // Handle proceed to amount
  const handleProceedToAmount = useCallback(() => {
    if (!selectedType) {
      Alert.alert(t('give.error'), t('give.selectTypeRequired'));
      return;
    }

    if (selectedType === 'other' && !otherPurpose.trim()) {
      Alert.alert(t('give.error'), t('give.otherPurposeRequired'));
      return;
    }

    goToStep('amount');
  }, [selectedType, otherPurpose, t, goToStep]);

  // Handle amount selection
  const handleAmountSelect = useCallback((value: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAmount(value.toString());
  }, []);

  // Handle custom amount
  const handleCustomAmount = useCallback((text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    setAmount(cleaned);
  }, []);

  // Proceed to payment
  const handleProceedToPayment = useCallback(() => {
    const numAmount = parseFloat(amount);
    const minAmount = paymentConfig?.minimum_amount || 10000;

    if (!numAmount || numAmount < minAmount) {
      Alert.alert(
        t('give.minimumAmountTitle'),
        t('give.minimumAmountMessage', { amount: formatCurrency(minAmount) })
      );
      return;
    }
    goToStep('payment');
  }, [amount, paymentConfig, formatCurrency, goToStep, t]);

  // Handle method selection
  const handleMethodSelect = useCallback((method: PaymentMethodType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedMethod(method);
    goToStep('review');
  }, [goToStep]);

  // Submit giving
  const handleSubmit = useCallback(() => {
    if (!selectedType || !amount || !selectedMethod) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    createGiving(
      {
        fund_id: selectedType, // Using type as fund identifier
        amount: parseFloat(amount),
        payment_method: selectedMethod,
        is_anonymous: isAnonymous,
        notes: notes ? `${getPurposeString()} - ${notes}` : getPurposeString(),
      },
      {
        onSuccess: (data) => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

          // Reset form
          setSelectedType(null);
          setOtherPurpose('');
          setAmount('');
          setNotes('');
          setSelectedMethod(null);
          setIsAnonymous(false);
          setStep('choose');

          if (data.payment_url) {
            Alert.alert(
              t('give.completePaymentTitle'),
              t('give.completePaymentMessage'),
              [{ text: t('common.continue'), onPress: () => Linking.openURL(data.payment_url!) }]
            );
          } else {
            Alert.alert(
              t('give.thankYouTitle'),
              t('give.thankYouMessage'),
              [{ text: t('give.viewHistory'), onPress: () => setShowHistory(true) }]
            );
          }
        },
        onError: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert(t('give.error'), t('give.submitError'));
        },
      }
    );
  }, [selectedType, amount, selectedMethod, isAnonymous, notes, getPurposeString, createGiving, t]);

  // Copy account number
  const handleCopyAccount = useCallback(async (accountNumber: string) => {
    await Clipboard.setStringAsync(accountNumber);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert(t('common.copied'), t('give.accountCopied'));
  }, [t]);

  // Stats data
  const stats = useMemo(() => ({
    totalGiven: givingSummary?.total_given || 0,
    totalTransactions: givingSummary?.total_transactions || 0,
  }), [givingSummary]);

  // Shared header enter animation from today-motion
  const { headerEnterStyle } = useTodayHeaderMotion();

  // Is payment enabled
  const isPaymentEnabled = paymentConfig?.is_online_enabled ?? false;
  const availableMethods = paymentConfig?.available_methods || [];

  // Render header
  const renderHeader = () => {
    const showBackButton = step !== 'choose' || showHistory;

    return (
      <>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[Colors.gradient.start, Colors.gradient.mid, Colors.gradient.end]}
          className="overflow-hidden"
          style={{ paddingTop: insets.top + 16, paddingBottom: showBackButton ? 12 : 16 }}
        >
          <Animated.View style={headerEnterStyle}>
            {/* Compact header row on main view */}
            {!showBackButton ? (
              <View className="px-5">
                {/* Title row with history button - stagger index 0 */}
                <Animated.View key={`title-${focusKey}`} entering={todayListItemMotion(0)} className="flex-row justify-between items-start mb-4">
                  <View className="flex-1">
                    <Text className="text-[28px] font-bold text-white" style={{ letterSpacing: -0.5 }}>
                      {t('give.title')}
                    </Text>
                    <Text className="text-[15px] text-white/70 mt-1">
                      {t('give.subtitle')}
                    </Text>
                  </View>
                  <Pressable
                    onPress={() => setShowHistory(true)}
                    className="w-11 h-11 rounded-full bg-white/10 items-center justify-center"
                  >
                    <History size={20} color={Colors.white} />
                  </Pressable>
                </Animated.View>

                {/* Stats cards - stagger index 1 */}
                <Animated.View key={`stats-${focusKey}`} entering={todayListItemMotion(1)} className="flex-row gap-3">
                  <View className="flex-1 flex-row items-center gap-2.5 bg-white/10 rounded-[18px] py-3 px-3 border border-white/10">
                    <View className="w-9 h-9 rounded-[10px] items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}>
                      <TrendingUp size={16} color={Colors.accent.gold} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-white">
                        {formatCurrency(stats.totalGiven)}
                      </Text>
                      <Text className="text-[11px] text-white/60 mt-0.5">{t('give.totalGiven')}</Text>
                    </View>
                  </View>
                  <View className="flex-1 flex-row items-center gap-2.5 bg-white/10 rounded-[18px] py-3 px-3 border border-white/10">
                    <View className="w-9 h-9 rounded-[10px] items-center justify-center" style={{ backgroundColor: 'rgba(212,175,55,0.2)' }}>
                      <Calendar size={16} color={Colors.accent.gold} />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[15px] font-bold text-white">{stats.totalTransactions}</Text>
                      <Text className="text-[11px] text-white/60 mt-0.5">{t('give.transactions')}</Text>
                    </View>
                  </View>
                </Animated.View>
              </View>
            ) : (
              /* Compact header with centered title for steps 2-4 */
              <View className="flex-row items-center justify-between px-5 py-3">
                <Pressable onPress={showHistory ? () => setShowHistory(false) : goBack} className="w-11 h-11 rounded-full bg-white/10 items-center justify-center">
                  <ArrowLeft size={24} color={Colors.white} />
                </Pressable>
                <View className="flex-1 items-center px-3">
                  <Text className="text-xl font-bold text-white text-center">
                    {showHistory ? t('give.historyTitle') : t('give.title')}
                  </Text>
                  <Text className="text-[13px] text-white/70 text-center mt-0.5">
                    {showHistory ? t('give.historySubtitle') : t('give.subtitle')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowHistory(!showHistory)}
                  className={`w-11 h-11 rounded-full items-center justify-center ${showHistory ? 'bg-white' : 'bg-white/10'}`}
                >
                  <History size={20} color={showHistory ? Colors.gradient.start : Colors.white} />
                </Pressable>
              </View>
            )}
          </Animated.View>
        </LinearGradient>
      </>
    );
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const stepLabels = [
      t('give.stepType'),
      t('give.stepAmount'),
      t('give.stepPayment'),
      t('give.stepReview'),
    ];
    const currentIndex = STEPS.indexOf(step);

    return (
      <View className="flex-row items-center justify-center py-4 px-5 bg-white border-b border-neutral-200">
        {STEPS.map((s, index) => (
          <React.Fragment key={s}>
            <View className="items-center">
              <View
                className={`w-7 h-7 rounded-full items-center justify-center mb-1 ${
                  index < currentIndex
                    ? 'bg-emerald-500'
                    : index <= currentIndex
                    ? 'bg-[#0f3460]'
                    : 'bg-neutral-200'
                }`}
              >
                {index < currentIndex ? (
                  <Check size={12} color={Colors.white} strokeWidth={3} />
                ) : (
                  <Text className={`text-xs font-bold ${index <= currentIndex ? 'text-white' : 'text-neutral-500'}`}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text className={`text-[11px] font-medium ${index <= currentIndex ? 'text-neutral-700' : 'text-neutral-400'}`}>
                {stepLabels[index]}
              </Text>
            </View>
            {index < STEPS.length - 1 && (
              <View className={`w-10 h-0.5 mx-2 mb-[18px] ${index < currentIndex ? 'bg-emerald-500' : 'bg-neutral-200'}`} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // Render Choose Step - 4 Fixed Offering Types
  const renderChooseStep = () => (
    <View className="pt-4">
      {/* Intro text */}
      <Animated.View key={`intro-${focusKey}`} entering={todayListItemMotion(0)}>
        <View className="flex-row items-start gap-3 bg-neutral-100 rounded-[18px] p-4 mb-6">
          <Info size={18} color={Colors.gradient.end} />
          <Text className="flex-1 text-sm text-neutral-600 leading-[22px]">{t('give.introText')}</Text>
        </View>
      </Animated.View>

      <Animated.View key={`section-title-${focusKey}`} entering={todayListItemMotion(1)}>
        <Text className="text-2xl font-bold text-neutral-900" style={{ letterSpacing: -0.3 }}>
          {t('give.selectType')}
        </Text>
        <Text className="text-[15px] text-neutral-500 mt-1 mb-7">{t('give.selectTypeDesc')}</Text>
      </Animated.View>

      {/* Offering type cards - 2x2 grid */}
      <View className="flex-row flex-wrap justify-between mb-6">
        {OFFERING_TYPES.map((type, index) => {
          const isSelected = selectedType === type.id;
          const IconComponent = type.icon;

          return (
            <Animated.View
              key={`${type.id}-${focusKey}`}
              entering={todayListItemMotion(index + 2)}
              className="w-[48%] mb-3"
            >
              <PremiumCard3
                selected={isSelected}
                onPress={() => handleTypeSelect(type.id)}
              >
                {/* Icon badge with gradient background */}
                <LinearGradient
                  colors={type.gradient}
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                  }}
                >
                  <IconComponent size={26} color="#FFF" />
                </LinearGradient>

                <Text className={`text-base font-bold ${isSelected ? 'text-[#0f3460]' : 'text-neutral-800'}`}>
                  {t(type.labelKey as any)}
                </Text>

                <Text numberOfLines={2} className="text-[13px] text-neutral-500 mt-1.5 leading-[18px]">
                  {t(type.subtitleKey as any)}
                </Text>
              </PremiumCard3>
            </Animated.View>
          );
        })}
      </View>

      {/* Other Purpose Input - layout animation only to avoid opacity conflict */}
      {selectedType === 'other' && (
        <Animated.View
          layout={LinearTransition.springify()}
          className="mb-2"
        >
          <View className="bg-white rounded-[18px] p-4 border border-neutral-200">
            <Text className="text-sm font-semibold text-neutral-700 mb-2.5">{t('give.otherPurposeLabel')}</Text>
            <View className="flex-row items-start gap-2.5 bg-neutral-50 rounded-xl p-3">
              <PenLine size={18} color={Colors.neutral[400]} style={{ marginTop: 2 }} />
              <TextInput
                ref={otherPurposeInputRef}
                className="flex-1 text-[15px] text-neutral-900 min-h-[60px]"
                style={{ textAlignVertical: 'top' }}
                value={otherPurpose}
                onChangeText={setOtherPurpose}
                placeholder={t('give.otherPlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
                multiline
                maxLength={100}
              />
            </View>
            <Text className="text-xs text-neutral-400 text-right mt-2">{otherPurpose.length}/100</Text>
          </View>
        </Animated.View>
      )}

      {/* Continue button */}
      <Animated.View key={`continue-${focusKey}`} entering={todayListItemMotion(6)} className="mt-4">
        <Pressable
          onPress={handleProceedToAmount}
          disabled={!selectedType || (selectedType === 'other' && !otherPurpose.trim())}
          className={`rounded-[18px] overflow-hidden ${(!selectedType || (selectedType === 'other' && !otherPurpose.trim())) ? 'opacity-50' : ''}`}
        >
          <LinearGradient
            colors={
              selectedType && (selectedType !== 'other' || otherPurpose.trim())
                ? [Colors.gradient.start, Colors.gradient.end]
                : [Colors.neutral[300], Colors.neutral[400]]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text className="text-[17px] font-semibold text-white">{t('give.continue')}</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </Animated.View>
    </View>
  );

  // Render Amount Step
  const renderAmountStep = () => {
    if (!selectedType) return null;

    const typeConfig = OFFERING_TYPES.find(t => t.id === selectedType);
    if (!typeConfig) return null;

    const Icon = typeConfig.icon;

    return (
      <View className="pt-4">
        {/* Selected type pill */}
        <Animated.View entering={todayListItemMotion(0)}>
          <View
            className="flex-row items-center self-start bg-white rounded-[20px] py-1.5 pl-3 pr-4 mb-4"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 1 }}
          >
            <LinearGradient
              colors={typeConfig.gradient}
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 8,
              }}
            >
              <Icon size={16} color="#FFFFFF" />
            </LinearGradient>
            <Text className="text-sm font-semibold text-neutral-700">
              {selectedType === 'other' ? otherPurpose : t(typeConfig.labelKey as any)}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={todayListItemMotion(1)}>
          <Text className="text-2xl font-bold text-neutral-900" style={{ letterSpacing: -0.3 }}>
            {t('give.enterAmount')}
          </Text>
          <Text className="text-[15px] text-neutral-500 mt-1 mb-7">{t('give.enterAmountDesc')}</Text>
        </Animated.View>

        {/* Amount input */}
        <Animated.View entering={todayListItemMotion(2)}>
          <View className="flex-row items-center justify-center bg-white rounded-[18px] px-5 py-4 mb-6 border-2 border-neutral-200 min-h-[80px]">
            <Text className="text-2xl font-semibold text-neutral-400 mr-2">Rp</Text>
            <TextInput
              className="flex-1 text-[32px] font-bold text-neutral-900"
              style={{ lineHeight: 40, paddingVertical: 0 }}
              value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
              onChangeText={handleCustomAmount}
              placeholder="0"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
            />
          </View>
        </Animated.View>

        {/* Quick amounts - 3 column grid */}
        <View className="flex-row flex-wrap gap-2.5 mb-4">
          {QUICK_AMOUNTS.map((item, index) => (
            <Animated.View
              key={item.amount}
              entering={todayListItemMotion(index + 3)}
              className="w-[31%]"
            >
              <PremiumCard3
                selected={amount === item.amount.toString()}
                onPress={() => handleAmountSelect(item.amount)}
                innerStyle={{ paddingVertical: 14, paddingHorizontal: 8 }}
              >
                <Text
                  className={`text-sm font-bold text-center ${
                    amount === item.amount.toString() ? 'text-[#0f3460]' : 'text-neutral-700'
                  }`}
                >
                  {item.label}
                </Text>
              </PremiumCard3>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={todayListItemMotion(9)}>
          <Text className="text-[13px] text-neutral-500 mb-4">
            {t('give.minimum')}: {formatCurrency(paymentConfig?.minimum_amount || 10000)}
          </Text>
        </Animated.View>

        {/* Notes input */}
        <Animated.View entering={todayListItemMotion(10)}>
          <View className="mb-6">
            <PremiumCard3 selected={false}>
              <Text className="text-sm font-semibold text-neutral-700 mb-2.5">{t('give.notes')}</Text>
              <TextInput
                className="bg-neutral-50 rounded-xl p-3 text-[15px] text-neutral-900 min-h-[70px]"
                style={{ textAlignVertical: 'top' }}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('give.notesPlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
                multiline
                maxLength={200}
                onFocus={() => {
                  // Scroll down after keyboard appears to ensure notes field is visible
                  setTimeout(() => {
                    scrollRef.current?.scrollToEnd({ animated: true });
                  }, 300);
                }}
              />
            </PremiumCard3>
          </View>
        </Animated.View>

        {/* Spacer for sticky button */}
        <View className="h-20" />
      </View>
    );
  };

  // Render sticky footer button for amount step
  // Position above the tab bar (60px) plus safe area
  const TAB_BAR_HEIGHT = 60;

  const renderAmountStepFooter = () => {
    if (step !== 'amount' || showHistory) return null;

    return (
      <View
        className="absolute left-0 right-0 bg-neutral-50 px-5 py-4 border-t border-neutral-200"
        style={{ bottom: TAB_BAR_HEIGHT + insets.bottom }}
      >
        <Pressable
          onPress={handleProceedToPayment}
          disabled={!amount}
          className={`rounded-[18px] overflow-hidden ${!amount ? 'opacity-50' : ''}`}
        >
          <LinearGradient
            colors={amount ? [Colors.gradient.start, Colors.gradient.end] : [Colors.neutral[300], Colors.neutral[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 56,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
            }}
          >
            <Text className="text-[17px] font-semibold text-white">{t('give.continue')}</Text>
            <ChevronRight size={20} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  // Render Payment Step
  const renderPaymentStep = () => {
    if (!selectedType || !amount) return null;

    return (
      <View className="pt-4">
        {/* Amount banner */}
        <Animated.View entering={todayListItemMotion(0)}>
          <View className="bg-[#1a1a2e] rounded-[18px] p-5 items-center mb-6">
            <Text className="text-[13px] text-white/70">{t('give.amount')}</Text>
            <Text className="text-[28px] font-bold text-white mt-1">
              {formatCurrency(parseFloat(amount))}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={todayListItemMotion(1)}>
          <Text className="text-2xl font-bold text-neutral-900" style={{ letterSpacing: -0.3 }}>
            {t('give.paymentMethod')}
          </Text>
          <Text className="text-[15px] text-neutral-500 mt-1 mb-7">{t('give.paymentMethodDesc')}</Text>
        </Animated.View>

        {configLoading ? (
          <View className="py-[60px] items-center">
            <Text className="text-[15px] text-neutral-500">{t('common.loading')}</Text>
          </View>
        ) : isPaymentEnabled && availableMethods.length > 0 ? (
          <View className="gap-3.5">
            {availableMethods.map((method, index) => {
              const info = PAYMENT_INFO[method] || PAYMENT_INFO.bank_transfer;
              const MethodIcon = info.icon;

              return (
                <Animated.View key={method} entering={todayListItemMotion(index + 2)}>
                  <PremiumCard3
                    selected={selectedMethod === method}
                    onPress={() => handleMethodSelect(method)}
                  >
                    <View className="flex-row items-center gap-3.5">
                      <View className="w-[46px] h-[46px] rounded-xl bg-neutral-100 items-center justify-center">
                        <MethodIcon size={24} color={Colors.gradient.end} />
                      </View>
                      <View className="flex-1">
                        <Text className="text-base font-bold text-neutral-900">
                          {info.name}
                        </Text>
                        <Text className="text-[13px] text-neutral-500 mt-0.5">
                          {info.description}
                        </Text>
                      </View>
                    </View>
                  </PremiumCard3>
                </Animated.View>
              );
            })}
          </View>
        ) : (
          <Animated.View entering={todayListItemMotion(2)}>
            <View className="bg-neutral-100 rounded-[18px] p-5">
              <View className="flex-row items-center gap-2.5 mb-2.5">
                <AlertCircle size={20} color={Colors.warning} />
                <Text className="text-[17px] font-semibold text-neutral-900">{t('give.manualTransfer')}</Text>
              </View>
              <Text className="text-sm text-neutral-600 mb-4">{t('give.manualTransferDesc')}</Text>

              {paymentConfig?.manual_bank_accounts?.map((account, index) => (
                <View key={index} className="bg-white rounded-xl p-4 mb-2.5">
                  <Text className="text-[15px] font-semibold text-neutral-900">{account.bank_name}</Text>
                  <Text className="text-[13px] text-neutral-500 mt-0.5 mb-2">{account.account_holder}</Text>
                  <View className="flex-row items-center justify-between">
                    <Text className="text-[17px] font-bold text-neutral-800" style={{ letterSpacing: 1 }}>
                      {account.account_number}
                    </Text>
                    <Pressable
                      onPress={() => handleCopyAccount(account.account_number)}
                      className="flex-row items-center gap-1.5 px-3 py-2.5 bg-neutral-100 rounded-lg"
                    >
                      <Copy size={16} color="#0f3460" />
                      <Text className="text-[13px] font-semibold text-[#0f3460]">{t('common.copy')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              {/* Skip to direct transfer confirmation */}
              <Pressable
                onPress={() => handleMethodSelect('bank_transfer')}
                className="bg-[#0f3460] rounded-xl py-3 items-center mt-2.5"
              >
                <Text className="text-[15px] font-semibold text-white">{t('give.confirmTransfer')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}
      </View>
    );
  };

  // Render Review Step
  const renderReviewStep = () => {
    if (!selectedType || !amount || !selectedMethod) return null;

    const typeConfig = OFFERING_TYPES.find(t => t.id === selectedType);
    if (!typeConfig) return null;

    const TypeIcon = typeConfig.icon;
    const paymentInfo = PAYMENT_INFO[selectedMethod] || PAYMENT_INFO.bank_transfer;
    const PaymentIcon = paymentInfo.icon;

    return (
      <View className="pt-4">
        <Animated.View entering={todayListItemMotion(0)}>
          <Text className="text-2xl font-bold text-neutral-900" style={{ letterSpacing: -0.3 }}>
            {t('give.reviewTitle')}
          </Text>
          <Text className="text-[15px] text-neutral-500 mt-1 mb-7">{t('give.reviewDesc')}</Text>
        </Animated.View>

        {/* Summary card */}
        <Animated.View entering={todayListItemMotion(1)} className="mb-5">
          <PremiumCard3 selected={false}>
            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-neutral-500">{t('give.purpose')}</Text>
              <View className="flex-row items-center gap-2 max-w-[60%]">
                <LinearGradient
                  colors={typeConfig.gradient}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 7,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <TypeIcon size={14} color={Colors.white} />
                </LinearGradient>
                <Text className="text-[15px] font-semibold text-neutral-800" numberOfLines={1}>
                  {selectedType === 'other' ? otherPurpose : t(typeConfig.labelKey as any)}
                </Text>
              </View>
            </View>

            <View className="h-px bg-neutral-100 my-4" />

            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-neutral-500">{t('give.amount')}</Text>
              <Text className="text-xl font-bold text-neutral-900">
                {formatCurrency(parseFloat(amount))}
              </Text>
            </View>

            <View className="h-px bg-neutral-100 my-4" />

            <View className="flex-row justify-between items-center">
              <Text className="text-sm text-neutral-500">{t('give.paymentMethod')}</Text>
              <View className="flex-row items-center gap-2">
                <PaymentIcon size={16} color={Colors.gradient.end} />
                <Text className="text-[15px] font-semibold text-neutral-800">{paymentInfo.name}</Text>
              </View>
            </View>

            {notes ? (
              <>
                <View className="h-px bg-neutral-100 my-4" />
                <View className="flex-row justify-between items-center">
                  <Text className="text-sm text-neutral-500">{t('give.notes')}</Text>
                  <Text className="text-[15px] font-semibold text-neutral-800 flex-1 text-right" numberOfLines={2}>
                    {notes}
                  </Text>
                </View>
              </>
            ) : null}
          </PremiumCard3>
        </Animated.View>

        {/* Anonymous toggle */}
        <Animated.View entering={todayListItemMotion(2)} className="mb-5">
          <PremiumCard3
            selected={isAnonymous}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            <View className="flex-row items-center gap-3.5">
              <View
                className={`w-6 h-6 rounded-md border-2 items-center justify-center mt-0.5 ${
                  isAnonymous ? 'bg-[#0f3460] border-[#0f3460]' : 'border-neutral-300'
                }`}
              >
                {isAnonymous && <Check size={14} color={Colors.white} strokeWidth={3} />}
              </View>
              <View className="flex-1">
                <Text className="text-[15px] font-semibold text-neutral-800">{t('give.anonymous')}</Text>
                <Text className="text-[13px] text-neutral-500 mt-0.5">{t('give.anonymousDesc')}</Text>
              </View>
            </View>
          </PremiumCard3>
        </Animated.View>

        {/* Submit button */}
        <Animated.View entering={todayListItemMotion(3)}>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            className={`mt-6 rounded-2xl overflow-hidden ${isSubmitting ? 'opacity-60' : ''}`}
            style={{
              shadowColor: Colors.accent.gold,
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.3,
              shadowRadius: 12,
              elevation: 6,
            }}
          >
            <LinearGradient
              colors={[Colors.accent.goldDark, Colors.accent.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                height: 56,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <Heart size={22} color={Colors.gradient.start} fill={Colors.gradient.start} />
              <Text className="text-lg font-bold" style={{ color: Colors.gradient.start }}>
                {isSubmitting ? t('give.processing') : t('give.completeGiving')}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={todayListItemMotion(4)}>
          <Text className="text-[13px] text-neutral-500 text-center mt-4">🔒 {t('give.securePayment')}</Text>
        </Animated.View>
      </View>
    );
  };

  // Render History
  const renderHistory = () => {
    const filters = [
      { key: 'all', label: t('give.filterAll') },
      { key: 'success', label: t('give.filterSuccess') },
      { key: 'pending', label: t('give.filterPending') },
      { key: 'failed', label: t('give.filterFailed') },
    ] as const;

    return (
      <View className="pt-4">
        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mb-5 -mx-5 px-5"
        >
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setHistoryFilter(f.key)}
              className={`px-4 py-2.5 rounded-[20px] mr-2.5 border ${
                historyFilter === f.key
                  ? 'bg-[#0f3460] border-[#0f3460]'
                  : 'bg-white border-neutral-200'
              }`}
            >
              <Text className={`text-sm font-semibold ${historyFilter === f.key ? 'text-white' : 'text-neutral-600'}`}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* History list */}
        {historyLoading ? (
          <View className="py-[60px] items-center">
            <Text className="text-[15px] text-neutral-500">{t('common.loading')}</Text>
          </View>
        ) : !history || history.length === 0 ? (
          <View className="py-[60px] items-center">
            <History size={48} color={Colors.neutral[300]} />
            <Text className="text-lg font-semibold text-neutral-700 mt-4">{t('give.noHistory')}</Text>
            <Text className="text-sm text-neutral-500 mt-1">{t('give.noHistoryDesc')}</Text>
          </View>
        ) : (
          <View className="gap-3">
            {history.map((tx) => {
              const isSuccess = tx.payment_status === 'success';
              const isPending = ['pending', 'processing'].includes(tx.payment_status);

              return (
                <View key={tx._id}>
                  <PremiumCard3 selected={false}>
                    <View className="flex-row items-center gap-3.5">
                      <View
                        className={`w-10 h-10 rounded-[10px] items-center justify-center ${
                          isSuccess
                            ? 'bg-emerald-500'
                            : isPending
                            ? 'bg-amber-500'
                            : 'bg-red-500'
                        }`}
                      >
                        {isSuccess ? (
                          <CheckCircle size={18} color="#FFF" />
                        ) : isPending ? (
                          <Clock size={18} color="#FFF" />
                        ) : (
                          <XCircle size={18} color="#FFF" />
                        )}
                      </View>

                      <View className="flex-1">
                        <Text className="text-[15px] font-semibold text-neutral-900">{tx.fund_name}</Text>
                        <Text className="text-[13px] text-neutral-500 mt-0.5">
                          {new Date(tx.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>

                      <Text className="text-base font-bold text-neutral-900">
                        {formatCurrency(tx.amount)}
                      </Text>
                    </View>
                  </PremiumCard3>
                </View>
              );
            })}
          </View>
        )}

        {/* New gift button */}
        <Pressable
          onPress={() => setShowHistory(false)}
          className="flex-row items-center justify-center gap-2.5 bg-neutral-100 rounded-[14px] py-4 mt-5"
        >
          <Heart size={18} color="#0f3460" />
          <Text className="text-[15px] font-semibold text-[#0f3460]">{t('give.makeNewGift')}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Animated.View className="flex-1 bg-neutral-50">
      {renderHeader()}

      {/* Step indicator (when not on choose step or history) */}
      {!showHistory && step !== 'choose' && renderStepIndicator()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <Animated.ScrollView
          ref={scrollRef}
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {showHistory ? (
            <Animated.View
              key="history"
              entering={SlideInRight.duration(260)}
              exiting={SlideOutRight.duration(200)}
            >
              {renderHistory()}
            </Animated.View>
          ) : (
            <Animated.View
              key="giving-flow"
              entering={SlideInLeft.duration(260)}
              exiting={SlideOutLeft.duration(200)}
            >
              {step === 'choose' && (
                <Animated.View
                  key="choose"
                  entering={SlideInLeft.duration(220)}
                  exiting={SlideOutLeft.duration(180)}
                >
                  {renderChooseStep()}
                </Animated.View>
              )}
              {step === 'amount' && (
                <Animated.View
                  key="amount"
                  entering={SlideInRight.duration(220)}
                  exiting={SlideOutRight.duration(180)}
                >
                  {renderAmountStep()}
                </Animated.View>
              )}
              {step === 'payment' && (
                <Animated.View
                  key="payment"
                  entering={SlideInRight.duration(220)}
                  exiting={SlideOutRight.duration(180)}
                >
                  {renderPaymentStep()}
                </Animated.View>
              )}
              {step === 'review' && (
                <Animated.View
                  key="review"
                  entering={SlideInRight.duration(220)}
                  exiting={SlideOutRight.duration(180)}
                >
                  {renderReviewStep()}
                </Animated.View>
              )}
            </Animated.View>
          )}

          <View className="h-[120px]" />
        </Animated.ScrollView>
      </KeyboardAvoidingView>

      {/* Sticky footer for amount step */}
      {renderAmountStepFooter()}
    </Animated.View>
  );
}

// Memoize screen + Apply Premium Motion V10 Ultra HOC for production-grade transitions
const MemoizedGiveScreen = memo(GiveScreen);
MemoizedGiveScreen.displayName = 'GiveScreen';
export default withPremiumMotionV10(MemoizedGiveScreen);
