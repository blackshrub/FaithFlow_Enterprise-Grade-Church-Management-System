/**
 * Giving/Offering Module Types
 *
 * Types for church giving/offering:
 * - Funds (purposes for giving)
 * - Giving transactions
 * - Payment methods
 * - Transaction history
 */

/**
 * Fund - Giving category/purpose
 */
export interface Fund {
  _id: string;
  id?: string; // Alias for _id (for compatibility)
  church_id: string;
  name: string;
  description: string;
  category: 'tithe' | 'offering' | 'mission' | 'building' | 'special' | 'other';
  goal_amount?: number;
  current_amount: number;
  is_active: boolean;
  display_order: number;
  created_at: string;
  updated_at: string;
}

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'processing' | 'success' | 'failed' | 'expired' | 'cancelled';

/**
 * Payment method types
 */
export type PaymentMethodType =
  | 'virtual_account'
  | 'bank_transfer'
  | 'qris'
  | 'credit_card'
  | 'gopay'
  | 'ovo'
  | 'dana'
  | 'e_wallet'
  | 'manual';

/**
 * Giving transaction
 */
export interface GivingTransaction {
  _id: string;
  church_id: string;
  member_id: string;
  fund_id: string;
  fund_name: string;
  amount: number;
  payment_method: PaymentMethodType;
  payment_provider?: 'ipaymu' | 'manual';
  payment_status: PaymentStatus;
  transaction_id?: string; // Provider transaction ID
  payment_url?: string;
  virtual_account?: string;
  qr_code?: string;
  payment_instructions?: string;
  is_anonymous: boolean;
  notes?: string;
  paid_at?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
}

/**
 * Giving history item with fund details
 */
export interface GivingHistoryItem extends GivingTransaction {
  fund?: Fund;
  // Alias for backwards compatibility with mock data
  status?: PaymentStatus;
}

/**
 * Giving summary statistics
 */
export interface GivingSummary {
  total_given: number;
  total_transactions: number;
  total_by_fund: {
    fund_id: string;
    fund_name: string;
    amount: number;
  }[];
  recent_transactions: GivingTransaction[];
}

/**
 * Payment configuration
 */
export interface PaymentConfig {
  is_online_enabled: boolean;
  available_methods: PaymentMethodType[];
  provider?: 'ipaymu';
  manual_bank_accounts?: {
    bank_name: string;
    account_number: string;
    account_holder: string;
  }[];
  minimum_amount: number;
}

/**
 * Create giving request
 */
export interface CreateGivingRequest {
  fund_id: string;
  amount: number;
  payment_method: PaymentMethodType;
  is_anonymous?: boolean;
  notes?: string;
}

/**
 * Create giving response
 */
export interface CreateGivingResponse {
  transaction: GivingTransaction;
  payment_url?: string;
  virtual_account?: string;
  qr_code?: string;
  instructions?: string;
}
