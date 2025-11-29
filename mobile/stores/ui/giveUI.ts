/**
 * Give UI State Store
 *
 * Manages temporary UI state for GiveScreen:
 * - Current step
 * - Selected offering type
 * - Amount and notes
 * - Payment method
 * - History view toggle
 *
 * Business logic stays in useGiving hooks.
 */

import { create } from 'zustand';
import { useShallow } from 'zustand/react/shallow';

// =============================================================================
// TYPES
// =============================================================================

export type GiveStep = 'choose' | 'amount' | 'payment' | 'review';
export type OfferingType = 'tithe' | 'weekly' | 'mission' | 'other';
export type HistoryFilter = 'all' | 'success' | 'pending' | 'failed';
export type PaymentMethodType = 'va' | 'qris' | 'ewallet' | 'credit_card' | 'convenience_store' | 'bank_transfer';

const STEP_ORDER: GiveStep[] = ['choose', 'amount', 'payment', 'review'];

export interface GiveUIState {
  // Step state
  step: GiveStep;
  prevStep: GiveStep;

  // Form state
  selectedType: OfferingType | null;
  otherPurpose: string;
  amount: string;
  notes: string;
  selectedMethod: PaymentMethodType | null;
  isAnonymous: boolean;

  // History state
  showHistory: boolean;
  historyFilter: HistoryFilter;

  // UI state
  refreshing: boolean;

  // Actions
  setStep: (step: GiveStep) => void;
  goBack: () => void;
  setSelectedType: (type: OfferingType | null) => void;
  setOtherPurpose: (purpose: string) => void;
  setAmount: (amount: string) => void;
  setNotes: (notes: string) => void;
  setSelectedMethod: (method: PaymentMethodType | null) => void;
  setIsAnonymous: (anonymous: boolean) => void;
  setShowHistory: (show: boolean) => void;
  setHistoryFilter: (filter: HistoryFilter) => void;
  setRefreshing: (refreshing: boolean) => void;
  resetForm: () => void;
  reset: () => void;
}

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialFormState = {
  selectedType: null as OfferingType | null,
  otherPurpose: '',
  amount: '',
  notes: '',
  selectedMethod: null as PaymentMethodType | null,
  isAnonymous: false,
};

const initialState = {
  step: 'choose' as GiveStep,
  prevStep: 'choose' as GiveStep,
  ...initialFormState,
  showHistory: false,
  historyFilter: 'all' as HistoryFilter,
  refreshing: false,
};

// =============================================================================
// STORE
// =============================================================================

export const useGiveUIStore = create<GiveUIState>((set, get) => ({
  ...initialState,

  setStep: (step: GiveStep) => {
    const { step: currentStep } = get();
    set({ prevStep: currentStep, step });
  },

  goBack: () => {
    const { step, showHistory } = get();
    if (showHistory) {
      set({ showHistory: false });
      return;
    }
    const currentIndex = STEP_ORDER.indexOf(step);
    if (currentIndex > 0) {
      set({ prevStep: step, step: STEP_ORDER[currentIndex - 1] });
    }
  },

  setSelectedType: (type: OfferingType | null) => {
    set({ selectedType: type });
  },

  setOtherPurpose: (purpose: string) => {
    set({ otherPurpose: purpose });
  },

  setAmount: (amount: string) => {
    // Clean amount - only digits
    const cleaned = amount.replace(/[^0-9]/g, '');
    set({ amount: cleaned });
  },

  setNotes: (notes: string) => {
    set({ notes });
  },

  setSelectedMethod: (method: PaymentMethodType | null) => {
    set({ selectedMethod: method });
  },

  setIsAnonymous: (anonymous: boolean) => {
    set({ isAnonymous: anonymous });
  },

  setShowHistory: (show: boolean) => {
    set({ showHistory: show });
  },

  setHistoryFilter: (filter: HistoryFilter) => {
    set({ historyFilter: filter });
  },

  setRefreshing: (refreshing: boolean) => {
    set({ refreshing });
  },

  resetForm: () => {
    set({
      ...initialFormState,
      step: 'choose',
      prevStep: 'choose',
    });
  },

  reset: () => {
    set(initialState);
  },
}));

// =============================================================================
// SELECTORS (for optimized re-renders)
// =============================================================================

export const useGiveStep = () =>
  useGiveUIStore(
    useShallow((state) => ({
      step: state.step,
      prevStep: state.prevStep,
      setStep: state.setStep,
      goBack: state.goBack,
    }))
  );

export const useGiveForm = () =>
  useGiveUIStore(
    useShallow((state) => ({
      selectedType: state.selectedType,
      otherPurpose: state.otherPurpose,
      amount: state.amount,
      notes: state.notes,
      selectedMethod: state.selectedMethod,
      isAnonymous: state.isAnonymous,
      setSelectedType: state.setSelectedType,
      setOtherPurpose: state.setOtherPurpose,
      setAmount: state.setAmount,
      setNotes: state.setNotes,
      setSelectedMethod: state.setSelectedMethod,
      setIsAnonymous: state.setIsAnonymous,
    }))
  );

export const useGiveHistory = () =>
  useGiveUIStore(
    useShallow((state) => ({
      showHistory: state.showHistory,
      historyFilter: state.historyFilter,
      setShowHistory: state.setShowHistory,
      setHistoryFilter: state.setHistoryFilter,
    }))
  );

export default useGiveUIStore;
