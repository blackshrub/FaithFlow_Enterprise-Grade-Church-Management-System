/**
 * Give/Offering Screen - Complete Redesign
 *
 * Design Philosophy: "Generosity made beautiful"
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
  Dimensions,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { withPremiumMotionV10 } from '@/hoc';
import { spacing, radius } from '@/constants/spacing';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
          style={[
            styles.headerGradient,
            { paddingTop: insets.top + 16 }, // Match Events header (topInset + 16)
            showBackButton && { paddingBottom: 12 },
          ]}
        >
          <Animated.View style={headerEnterStyle}>
            {/* Compact header row on main view */}
            {!showBackButton ? (
              <View style={styles.headerContent}>
                {/* Title row with history button - stagger index 0 */}
                <Animated.View key={`title-${focusKey}`} entering={todayListItemMotion(0)} style={styles.titleRow}>
                  <View style={styles.titleWrap}>
                    <Text style={styles.headerTitle}>{t('give.title')}</Text>
                    <Text style={styles.headerSubtitle}>{t('give.subtitle')}</Text>
                  </View>
                  <Pressable
                    onPress={() => setShowHistory(true)}
                    style={styles.historyBtn}
                  >
                    <History size={20} color={Colors.white} />
                  </Pressable>
                </Animated.View>

                {/* Stats cards - stagger index 1 */}
                <Animated.View key={`stats-${focusKey}`} entering={todayListItemMotion(1)} style={styles.statsRow}>
                  <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                      <TrendingUp size={16} color={Colors.accent.gold} />
                    </View>
                    <View style={styles.statTextWrap}>
                      <Text style={styles.statValue}>
                        {formatCurrency(stats.totalGiven)}
                      </Text>
                      <Text style={styles.statLabel}>{t('give.totalGiven')}</Text>
                    </View>
                  </View>
                  <View style={styles.statCard}>
                    <View style={styles.statIconWrap}>
                      <Calendar size={16} color={Colors.accent.gold} />
                    </View>
                    <View style={styles.statTextWrap}>
                      <Text style={styles.statValue}>{stats.totalTransactions}</Text>
                      <Text style={styles.statLabel}>{t('give.transactions')}</Text>
                    </View>
                  </View>
                </Animated.View>
              </View>
            ) : (
              /* Compact header with centered title for steps 2-4 */
              <View style={styles.compactHeader}>
                <Pressable onPress={showHistory ? () => setShowHistory(false) : goBack} style={styles.backBtn}>
                  <ArrowLeft size={24} color={Colors.white} />
                </Pressable>
                <View style={styles.compactTitleWrap}>
                  <Text style={styles.compactTitle}>
                    {showHistory ? t('give.historyTitle') : t('give.title')}
                  </Text>
                  <Text style={styles.compactSubtitle}>
                    {showHistory ? t('give.historySubtitle') : t('give.subtitle')}
                  </Text>
                </View>
                <Pressable
                  onPress={() => setShowHistory(!showHistory)}
                  style={[styles.historyBtn, showHistory && styles.historyBtnActive]}
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
      <View style={styles.stepIndicator}>
        {STEPS.map((s, index) => (
          <React.Fragment key={s}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  index <= currentIndex && styles.stepDotActive,
                  index < currentIndex && styles.stepDotComplete,
                ]}
              >
                {index < currentIndex ? (
                  <Check size={12} color={Colors.white} strokeWidth={3} />
                ) : (
                  <Text style={[
                    styles.stepNumber,
                    index <= currentIndex && styles.stepNumberActive,
                  ]}>
                    {index + 1}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                index <= currentIndex && styles.stepLabelActive,
              ]}>
                {stepLabels[index]}
              </Text>
            </View>
            {index < STEPS.length - 1 && (
              <View style={[
                styles.stepLine,
                index < currentIndex && styles.stepLineActive,
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  // Render Choose Step - 4 Fixed Offering Types
  const renderChooseStep = () => (
    <View style={styles.stepContent}>
      {/* Intro text */}
      <Animated.View key={`intro-${focusKey}`} entering={todayListItemMotion(0)}>
        <View style={styles.introBox}>
          <Info size={18} color={Colors.gradient.end} />
          <Text style={styles.introText}>{t('give.introText')}</Text>
        </View>
      </Animated.View>

      <Animated.View key={`section-title-${focusKey}`} entering={todayListItemMotion(1)}>
        <Text style={styles.sectionTitle}>{t('give.selectType')}</Text>
        <Text style={styles.sectionDesc}>{t('give.selectTypeDesc')}</Text>
      </Animated.View>

      {/* Offering type cards */}
      <View style={styles.typeGrid}>
        {OFFERING_TYPES.map((type, index) => {
          const isSelected = selectedType === type.id;
          const IconComponent = type.icon;

          return (
            <Animated.View key={`${type.id}-${focusKey}`} entering={todayListItemMotion(index + 2)} style={styles.typeCardContainer}>
              <PremiumCard3
                  selected={isSelected}
                  onPress={() => handleTypeSelect(type.id)}
                >
                  <LinearGradient
                    colors={type.gradient}
                    style={styles.typeIconGradient}
                  >
                    <IconComponent size={22} color="#FFF" />
                  </LinearGradient>

                  <Text
                    style={[styles.typeLabel, isSelected && styles.typeLabelSelected]}
                  >
                    {t(type.labelKey as any)}
                  </Text>

                  <Text
                    numberOfLines={2}
                    style={styles.typeSubtitle}
                  >
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
          style={styles.otherPurposeMargin}
        >
          <View style={styles.otherPurposeContainer}>
            <Text style={styles.otherPurposeLabel}>{t('give.otherPurposeLabel')}</Text>
            <View style={styles.otherPurposeInputWrap}>
              <PenLine size={18} color={Colors.neutral[400]} style={styles.otherPurposeIcon} />
              <TextInput
                ref={otherPurposeInputRef}
                style={styles.otherPurposeInput}
                value={otherPurpose}
                onChangeText={setOtherPurpose}
                placeholder={t('give.otherPlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
                multiline
                maxLength={100}
              />
            </View>
            <Text style={styles.charCount}>{otherPurpose.length}/100</Text>
          </View>
        </Animated.View>
      )}

      {/* Continue button */}
      <Animated.View key={`continue-${focusKey}`} entering={todayListItemMotion(6)}>
        <Pressable
          onPress={handleProceedToAmount}
          disabled={!selectedType || (selectedType === 'other' && !otherPurpose.trim())}
          style={[
            styles.continueBtn,
            (!selectedType || (selectedType === 'other' && !otherPurpose.trim())) && styles.continueBtnDisabled,
          ]}
        >
          <LinearGradient
            colors={
              selectedType && (selectedType !== 'other' || otherPurpose.trim())
                ? [Colors.gradient.start, Colors.gradient.end]
                : [Colors.neutral[300], Colors.neutral[400]]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGradient}
          >
            <Text style={styles.continueBtnText}>{t('give.continue')}</Text>
            <ChevronRight size={20} color={Colors.white} />
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
      <View style={styles.stepContent}>
        {/* Selected type pill */}
        <Animated.View entering={todayListItemMotion(0)}>
          <View style={styles.selectedPill}>
            <LinearGradient
              colors={typeConfig.gradient}
              style={styles.selectedPillIcon}
            >
              <Icon size={16} color={Colors.white} />
            </LinearGradient>
            <Text style={styles.selectedPillText}>
              {selectedType === 'other' ? otherPurpose : t(typeConfig.labelKey as any)}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={todayListItemMotion(1)}>
          <Text style={styles.sectionTitle}>{t('give.enterAmount')}</Text>
          <Text style={styles.sectionDesc}>{t('give.enterAmountDesc')}</Text>
        </Animated.View>

        {/* Amount input */}
        <Animated.View entering={todayListItemMotion(2)}>
          <View style={styles.amountInputWrap}>
            <Text style={styles.currencyLabel}>Rp</Text>
            <TextInput
              style={styles.amountInput}
              value={amount ? parseInt(amount).toLocaleString('id-ID') : ''}
              onChangeText={handleCustomAmount}
              placeholder="0"
              placeholderTextColor={Colors.neutral[400]}
              keyboardType="numeric"
            />
          </View>
        </Animated.View>

        {/* Quick amounts */}
        <View style={styles.quickGrid}>
          {QUICK_AMOUNTS.map((item, index) => (
            <Animated.View key={item.amount} entering={todayListItemMotion(index + 3)} style={styles.quickAmountWrap}>
              <PremiumCard3
                selected={amount === item.amount.toString()}
                onPress={() => handleAmountSelect(item.amount)}
                innerStyle={{ paddingVertical: 14, paddingHorizontal: 8 }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color:
                      amount === item.amount.toString()
                        ? Colors.gradient.end
                        : Colors.neutral[700],
                    textAlign: 'center',
                  }}
                >
                  {item.label}
                </Text>
              </PremiumCard3>
            </Animated.View>
          ))}
        </View>

        <Animated.View entering={todayListItemMotion(9)}>
          <Text style={styles.minNote}>
            {t('give.minimum')}: {formatCurrency(paymentConfig?.minimum_amount || 10000)}
          </Text>
        </Animated.View>

        {/* Notes input */}
        <Animated.View entering={todayListItemMotion(10)}>
          <View style={styles.notesContainer}>
            <PremiumCard3 selected={false}>
              <Text style={styles.notesLabel}>{t('give.notes')}</Text>
              <TextInput
                style={styles.notesInputInCard}
                value={notes}
                onChangeText={setNotes}
                placeholder={t('give.notesPlaceholder')}
                placeholderTextColor={Colors.neutral[400]}
                multiline
                maxLength={200}
              />
            </PremiumCard3>
          </View>
        </Animated.View>

        {/* Spacer for sticky button */}
        <View style={styles.bottomSpacer} />
      </View>
    );
  };

  // Render sticky footer button for amount step
  const renderAmountStepFooter = () => {
    if (step !== 'amount' || showHistory) return null;

    return (
      <View style={[styles.stickyFooter, { paddingBottom: insets.bottom + 80 }]}>
        <Pressable
          onPress={handleProceedToPayment}
          disabled={!amount}
          style={[styles.continueBtn, !amount && styles.continueBtnDisabled]}
        >
          <LinearGradient
            colors={amount ? [Colors.gradient.start, Colors.gradient.end] : [Colors.neutral[300], Colors.neutral[400]]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueBtnGradient}
          >
            <Text style={styles.continueBtnText}>{t('give.continue')}</Text>
            <ChevronRight size={20} color={Colors.white} />
          </LinearGradient>
        </Pressable>
      </View>
    );
  };

  // Render Payment Step
  const renderPaymentStep = () => {
    if (!selectedType || !amount) return null;

    return (
      <View style={styles.stepContent}>
        {/* Amount banner */}
        <Animated.View entering={todayListItemMotion(0)}>
          <View style={styles.amountBanner}>
            <Text style={styles.amountBannerLabel}>{t('give.amount')}</Text>
            <Text style={styles.amountBannerValue}>
              {formatCurrency(parseFloat(amount))}
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={todayListItemMotion(1)}>
          <Text style={styles.sectionTitle}>{t('give.paymentMethod')}</Text>
          <Text style={styles.sectionDesc}>{t('give.paymentMethodDesc')}</Text>
        </Animated.View>

        {configLoading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : isPaymentEnabled && availableMethods.length > 0 ? (
          <View style={styles.methodsGap}>
            {availableMethods.map((method, index) => {
              const info = PAYMENT_INFO[method] || PAYMENT_INFO.bank_transfer;
              const MethodIcon = info.icon;

              return (
                <Animated.View key={method} entering={todayListItemMotion(index + 2)}>
                  <PremiumCard3
                    selected={selectedMethod === method}
                    onPress={() => handleMethodSelect(method)}
                  >
                    <View style={styles.methodRow}>
                      <View style={styles.methodIconWrap}>
                        <MethodIcon size={24} color={Colors.gradient.end} />
                      </View>
                      <View style={styles.methodFlex}>
                        <Text style={styles.methodName}>
                          {info.name}
                        </Text>
                        <Text style={styles.methodDesc}>
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
            <View style={styles.offlineBox}>
              <View style={styles.offlineHeader}>
                <AlertCircle size={20} color={Colors.warning} />
                <Text style={styles.offlineTitle}>{t('give.manualTransfer')}</Text>
              </View>
              <Text style={styles.offlineDesc}>{t('give.manualTransferDesc')}</Text>

              {paymentConfig?.manual_bank_accounts?.map((account, index) => (
                <View key={index} style={styles.bankCard}>
                  <Text style={styles.bankName}>{account.bank_name}</Text>
                  <Text style={styles.bankHolder}>{account.account_holder}</Text>
                  <View style={styles.bankRow}>
                    <Text style={styles.bankNumber}>{account.account_number}</Text>
                    <Pressable
                      onPress={() => handleCopyAccount(account.account_number)}
                      style={styles.copyBtn}
                    >
                      <Copy size={16} color={Colors.gradient.end} />
                      <Text style={styles.copyText}>{t('common.copy')}</Text>
                    </Pressable>
                  </View>
                </View>
              ))}

              {/* Skip to direct transfer confirmation */}
              <Pressable
                onPress={() => handleMethodSelect('bank_transfer')}
                style={styles.confirmTransferBtn}
              >
                <Text style={styles.confirmTransferText}>{t('give.confirmTransfer')}</Text>
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
      <View style={styles.stepContent}>
        <Animated.View entering={todayListItemMotion(0)}>
          <Text style={styles.sectionTitle}>{t('give.reviewTitle')}</Text>
          <Text style={styles.sectionDesc}>{t('give.reviewDesc')}</Text>
        </Animated.View>

        {/* Summary card */}
        <Animated.View entering={todayListItemMotion(1)} style={styles.animatedSectionMargin}>
          <PremiumCard3 selected={false}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('give.purpose')}</Text>
              <View style={styles.summaryValue}>
                <LinearGradient
                  colors={typeConfig.gradient}
                  style={styles.summaryIcon}
                >
                  <TypeIcon size={14} color={Colors.white} />
                </LinearGradient>
                <Text style={styles.summaryText} numberOfLines={1}>
                  {selectedType === 'other' ? otherPurpose : t(typeConfig.labelKey as any)}
                </Text>
              </View>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('give.amount')}</Text>
              <Text style={styles.summaryAmount}>
                {formatCurrency(parseFloat(amount))}
              </Text>
            </View>

            <View style={styles.summaryDivider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>{t('give.paymentMethod')}</Text>
              <View style={styles.summaryValue}>
                <PaymentIcon size={16} color={Colors.gradient.end} />
                <Text style={styles.summaryText}>{paymentInfo.name}</Text>
              </View>
            </View>

            {notes ? (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>{t('give.notes')}</Text>
                  <Text style={[styles.summaryText, { flex: 1, textAlign: 'right' }]} numberOfLines={2}>
                    {notes}
                  </Text>
                </View>
              </>
            ) : null}
          </PremiumCard3>
        </Animated.View>

        {/* Anonymous toggle */}
        <Animated.View entering={todayListItemMotion(2)} style={styles.animatedSectionMargin}>
          <PremiumCard3
            selected={isAnonymous}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            <View style={styles.methodRow}>
              <View style={[styles.checkbox, isAnonymous && styles.checkboxActive]}>
                {isAnonymous && <Check size={14} color={Colors.white} strokeWidth={3} />}
              </View>
              <View style={styles.methodFlex}>
                <Text style={styles.anonymousTitle}>{t('give.anonymous')}</Text>
                <Text style={styles.anonymousDesc}>{t('give.anonymousDesc')}</Text>
              </View>
            </View>
          </PremiumCard3>
        </Animated.View>

        {/* Submit button */}
        <Animated.View entering={todayListItemMotion(3)}>
          <Pressable
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
          >
            <LinearGradient
              colors={[Colors.accent.goldDark, Colors.accent.gold]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitBtnGradient}
            >
              <Heart size={22} color={Colors.gradient.start} fill={Colors.gradient.start} />
              <Text style={styles.submitBtnText}>
                {isSubmitting ? t('give.processing') : t('give.completeGiving')}
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>

        <Animated.View entering={todayListItemMotion(4)}>
          <Text style={styles.secureNote}>🔒 {t('give.securePayment')}</Text>
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
      <View style={styles.stepContent}>
        {/* Filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
        >
          {filters.map((f) => (
            <Pressable
              key={f.key}
              onPress={() => setHistoryFilter(f.key)}
              style={[
                styles.filterPill,
                historyFilter === f.key && styles.filterPillActive,
              ]}
            >
              <Text style={[
                styles.filterText,
                historyFilter === f.key && styles.filterTextActive,
              ]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* History list */}
        {historyLoading ? (
          <View style={styles.loadingWrap}>
            <Text style={styles.loadingText}>{t('common.loading')}</Text>
          </View>
        ) : !history || history.length === 0 ? (
          <View style={styles.emptyWrap}>
            <History size={48} color={Colors.neutral[300]} />
            <Text style={styles.emptyTitle}>{t('give.noHistory')}</Text>
            <Text style={styles.emptyText}>{t('give.noHistoryDesc')}</Text>
          </View>
        ) : (
          <View style={styles.reviewGap}>
            {history.map((tx) => {
              const isSuccess = tx.payment_status === 'success';
              const isPending = ['pending', 'processing'].includes(tx.payment_status);

              return (
                <View key={tx._id}>
                  <PremiumCard3 selected={false}>
                    <View style={styles.methodRow}>
                      <View
                        style={[
                          styles.historyIconWrap,
                          isSuccess
                            ? styles.historyIconSuccess
                            : isPending
                            ? styles.historyIconPending
                            : styles.historyIconError,
                        ]}
                      >
                        {isSuccess ? (
                          <CheckCircle size={18} color="#FFF" />
                        ) : isPending ? (
                          <Clock size={18} color="#FFF" />
                        ) : (
                          <XCircle size={18} color="#FFF" />
                        )}
                      </View>

                      <View style={styles.methodFlex}>
                        <Text style={styles.historyFund}>{tx.fund_name}</Text>
                        <Text style={styles.historyDate}>
                          {new Date(tx.created_at).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </Text>
                      </View>

                      <Text style={styles.historyAmount}>
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
          style={styles.newGiftBtn}
        >
          <Heart size={18} color={Colors.gradient.end} />
          <Text style={styles.newGiftText}>{t('give.makeNewGift')}</Text>
        </Pressable>
      </View>
    );
  };

  return (
    <Animated.View style={styles.container}>
      {renderHeader()}

      {/* Step indicator (when not on choose step or history) */}
      {!showHistory && step !== 'choose' && renderStepIndicator()}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.content}
      >
        <Animated.ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          keyboardShouldPersistTaps="handled"
        >
          {showHistory ? (
            renderHistory()
          ) : (
            <>
              {step === 'choose' && (
                <Animated.View
                  key="choose"
                  entering={SlideInLeft.duration(260)}
                  exiting={SlideOutLeft.duration(200)}
                >
                  {renderChooseStep()}
                </Animated.View>
              )}
              {step === 'amount' && (
                <Animated.View
                  key="amount"
                  entering={SlideInRight.duration(260)}
                  exiting={SlideOutRight.duration(200)}
                >
                  {renderAmountStep()}
                </Animated.View>
              )}
              {step === 'payment' && (
                <Animated.View
                  key="payment"
                  entering={SlideInRight.duration(260)}
                  exiting={SlideOutRight.duration(200)}
                >
                  {renderPaymentStep()}
                </Animated.View>
              )}
              {step === 'review' && (
                <Animated.View
                  key="review"
                  entering={SlideInRight.duration(260)}
                  exiting={SlideOutRight.duration(200)}
                >
                  {renderReviewStep()}
                </Animated.View>
              )}
            </>
          )}

          <View style={styles.bottomSpacerLarge} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.neutral[50],
  },
  // Header
  headerGradient: {
    paddingBottom: spacing.m, // Match Events header padding
    overflow: 'hidden',
  },
  compactHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.ml,
    paddingVertical: spacing.sm,
  },
  compactTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  compactTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.white,
    textAlign: 'center',
  },
  compactSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
    textAlign: 'center',
    marginTop: 2,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyBtnActive: {
    backgroundColor: Colors.white,
  },
  headerContent: {
    paddingHorizontal: spacing.ml, // Match Events header (20px)
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.m, // Match Events header (16px)
  },
  titleWrap: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28, // Match Events header
    fontWeight: '700',
    color: Colors.white,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 15, // Match Events header
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    // No marginBottom - headerGradient paddingBottom handles spacing
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: radius.card,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(212,175,55,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  statTextWrap: {
    flex: 1,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.white,
  },
  statLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 1,
  },
  // Step indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    paddingHorizontal: spacing.ml,
    backgroundColor: Colors.white,
    borderBottomWidth: 1,
    borderBottomColor: Colors.neutral[200],
  },
  stepItem: {
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.neutral[200],
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  stepDotActive: {
    backgroundColor: Colors.gradient.end,
  },
  stepDotComplete: {
    backgroundColor: Colors.success,
  },
  stepNumber: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.neutral[500],
  },
  stepNumberActive: {
    color: Colors.white,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.neutral[400],
  },
  stepLabelActive: {
    color: Colors.neutral[700],
  },
  stepLine: {
    width: 40,
    height: 2,
    backgroundColor: Colors.neutral[200],
    marginHorizontal: 8,
    marginBottom: 18,
  },
  stepLineActive: {
    backgroundColor: Colors.success,
  },
  // Content
  content: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.ml,
    paddingTop: spacing.l,
  },
  stepContent: {
    paddingTop: spacing.m,
  },
  stickyFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.neutral[50],
    paddingHorizontal: spacing.ml,
    paddingTop: spacing.m,
    borderTopWidth: 1,
    borderTopColor: Colors.neutral[200],
  },
  // Intro box
  introBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: Colors.neutral[100],
    borderRadius: radius.card,
    padding: spacing.m,
    marginBottom: spacing.l,
  },
  introText: {
    flex: 1,
    fontSize: 14,
    color: Colors.neutral[600],
    lineHeight: 22,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.neutral[900],
    letterSpacing: -0.3,
  },
  sectionDesc: {
    fontSize: 15,
    color: Colors.neutral[500],
    marginTop: 4,
    marginBottom: 28,
  },
  // Type cards - Premium 2x2 grid layout
  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -spacing.xs,
    marginBottom: spacing.l, // Space before continue button
    overflow: 'visible', // Allow shadows to render outside
  },
  // Other purpose input
  otherPurposeContainer: {
    backgroundColor: Colors.white,
    borderRadius: radius.card,
    padding: spacing.m,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  otherPurposeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: spacing.s,
  },
  otherPurposeInputWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.s,
    backgroundColor: Colors.neutral[50],
    borderRadius: radius.m,
    padding: spacing.sm,
  },
  otherPurposeIcon: {
    marginTop: 2,
  },
  otherPurposeInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.neutral[900],
    minHeight: 60,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 12,
    color: Colors.neutral[400],
    textAlign: 'right',
    marginTop: 8,
  },
  // Amount step
  selectedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: Colors.white,
    borderRadius: spacing.ml,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingRight: spacing.m,
    marginBottom: spacing.m,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  selectedPillIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  selectedPillText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: radius.card,
    paddingHorizontal: spacing.ml,
    marginBottom: spacing.l,
    borderWidth: 2,
    borderColor: Colors.neutral[200],
  },
  currencyLabel: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.neutral[400],
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 32,
    fontWeight: '700',
    color: Colors.neutral[900],
    paddingVertical: spacing.ml,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -5,
    marginBottom: spacing.m,
    overflow: 'visible',
  },
  quickAmountWrap: {
    width: (SCREEN_WIDTH - 40 - 30) / 3,
    margin: 5,
  },
  minNote: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginBottom: spacing.m,
  },
  notesContainer: {
    marginBottom: spacing.l,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginBottom: spacing.s,
  },
  notesInputInCard: {
    backgroundColor: Colors.neutral[50],
    borderRadius: radius.m,
    padding: spacing.sm,
    fontSize: 15,
    color: Colors.neutral[900],
    minHeight: 70,
    textAlignVertical: 'top',
  },
  continueBtn: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  continueBtnDisabled: {
    opacity: 0.6,
  },
  continueBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
  },
  continueBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.white,
  },
  // Payment step
  amountBanner: {
    backgroundColor: Colors.gradient.start,
    borderRadius: radius.card,
    padding: spacing.ml,
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  amountBannerLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.7)',
  },
  amountBannerValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.white,
    marginTop: 4,
  },
  offlineBox: {
    backgroundColor: Colors.neutral[100],
    borderRadius: radius.card,
    padding: spacing.ml,
  },
  offlineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.s,
    marginBottom: spacing.s,
  },
  offlineTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  offlineDesc: {
    fontSize: 14,
    color: Colors.neutral[600],
    marginBottom: spacing.m,
  },
  bankCard: {
    backgroundColor: Colors.white,
    borderRadius: radius.m,
    padding: spacing.m,
    marginBottom: spacing.s,
  },
  bankName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  bankHolder: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
    marginBottom: 8,
  },
  bankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.neutral[800],
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.s,
    backgroundColor: Colors.neutral[100],
    borderRadius: radius.s,
  },
  copyText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.gradient.end,
  },
  confirmTransferBtn: {
    backgroundColor: Colors.gradient.end,
    borderRadius: radius.m,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginTop: spacing.s,
  },
  confirmTransferText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.white,
  },
  // Review step
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.neutral[500],
  },
  summaryValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    maxWidth: '60%',
  },
  summaryIcon: {
    width: 26,
    height: 26,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  summaryAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  summaryDivider: {
    height: 1,
    backgroundColor: Colors.neutral[100],
    marginVertical: 16,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Colors.gradient.end,
    borderColor: Colors.gradient.end,
  },
  anonymousTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[800],
  },
  anonymousDesc: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  submitBtn: {
    marginTop: 24,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: Colors.accent.gold,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 20,
  },
  submitBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.gradient.start,
  },
  secureNote: {
    fontSize: 13,
    color: Colors.neutral[500],
    textAlign: 'center',
    marginTop: 16,
  },
  // History
  filterScroll: {
    marginBottom: 20,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.white,
    marginRight: 10,
    borderWidth: 1,
    borderColor: Colors.neutral[200],
  },
  filterPillActive: {
    backgroundColor: Colors.gradient.end,
    borderColor: Colors.gradient.end,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.neutral[600],
  },
  filterTextActive: {
    color: Colors.white,
  },
  historyFund: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.neutral[900],
  },
  historyDate: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  newGiftBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: Colors.neutral[100],
    borderRadius: 14,
    paddingVertical: 16,
    marginTop: 20,
  },
  newGiftText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.gradient.end,
  },
  // Loading & Empty
  loadingWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: Colors.neutral[500],
  },
  emptyWrap: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.neutral[700],
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: Colors.neutral[500],
    marginTop: 4,
  },
  // New consolidated styles for performance
  typeCardContainer: {
    width: '50%',
    padding: 6,
  },
  typeIconGradient: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  typeLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.neutral[800],
  },
  typeLabelSelected: {
    color: Colors.gradient.end,
  },
  typeSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: Colors.neutral[500],
  },
  otherPurposeMargin: {
    marginTop: 16,
  },
  bottomSpacer: {
    height: 80,
  },
  bottomSpacerLarge: {
    height: 120,
  },
  methodsGap: {
    gap: 14,
  },
  methodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  methodIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: Colors.neutral[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.neutral[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  methodRadioSelected: {
    borderColor: Colors.gradient.end,
    backgroundColor: Colors.gradient.end,
  },
  methodFlex: {
    flex: 1,
  },
  methodName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.neutral[900],
  },
  methodDesc: {
    fontSize: 13,
    color: Colors.neutral[500],
    marginTop: 2,
  },
  animatedSectionMargin: {
    marginBottom: 20,
  },
  bankInfoRow: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'center',
  },
  reviewGap: {
    gap: 12,
  },
  historyIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyIconSuccess: {
    backgroundColor: Colors.success,
  },
  historyIconPending: {
    backgroundColor: Colors.warning,
  },
  historyIconError: {
    backgroundColor: Colors.error,
  },
});
