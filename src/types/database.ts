export type UserRole = "admin" | "cashier";
export type CorrectionStatus = "pending" | "approved" | "rejected";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  category: "cement" | "steel";
  unit: string;
  is_active: boolean;
  created_at: string;
}

export interface DailyCement {
  id: string;
  entry_date: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  price_per_ton: number;
  total_amount: number; // generated
  amount_paid: number;
  remaining_balance: number; // generated
  transport_cost: number;
  notes: string | null;
  cost_per_ton: number | null;
  profit_per_ton: number | null; // generated
  total_profit: number | null; // generated
  is_corrected: boolean;
  correction_of_id: string | null;
  corrected_by_entry_id: string | null;
  correction_reason: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  row_number: number;
}

export interface DailyCementWithRelations extends DailyCement {
  customer: Pick<Customer, "id" | "name">;
  product: Pick<Product, "id" | "name">;
  creator: Pick<Profile, "id" | "full_name">;
}

export interface DailyCementInsert {
  entry_date: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  price_per_ton: number;
  amount_paid: number;
  transport_cost: number;
  notes?: string;
  cost_per_ton?: number | null;
  created_by: string;
}

// Daily Inventory / جدول البونات (Stock Tracking per Product)
export interface DailyInventory {
  id: string;
  entry_date: string;
  product_id: string;
  previous_balance: number;
  added: number;
  cost_price: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DailyInventoryWithProduct extends DailyInventory {
  product: Pick<Product, "id" | "name">;
}

// Computed inventory row (sold/remaining calculated from daily_cement)
export interface InventoryRow {
  product: Pick<Product, "id" | "name">;
  previous_balance: number;
  added: number;
  sold: number; // computed from daily_cement
  net_remaining: number; // previous_balance + added - sold
  cost_price: number;
  remaining_cost: number; // net_remaining * cost_price
  inventory_id: string | null;
}

// Daily Deposits / الايداعات
export interface DailyDeposit {
  id: string;
  entry_date: string;
  amount: number;
  description: string | null;
  created_by: string;
  created_at: string;
  row_number: number;
}

export interface DailyDepositWithCreator extends DailyDeposit {
  creator: Pick<Profile, "id" | "full_name">;
}

export interface DailyDepositInsert {
  entry_date: string;
  amount: number;
  description?: string;
  created_by: string;
}

// Cash Balance (رصيد نقدي)
// Formula: closing = opening_balance + total_sales - total_deposits
export interface DailyCashBalance {
  id: string;
  balance_date: string;
  opening_balance: number;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

// Cashier Daily Ledger / يومية الكاشير
export interface DailyCashier {
  id: string;
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
  created_by: string;
  created_at: string;
  row_number: number;
  is_corrected: boolean;
  correction_of_id: string | null;
  corrected_by_entry_id: string | null;
  correction_reason: string | null;
}

export interface DailyCashierWithCreator extends DailyCashier {
  creator: Pick<Profile, "id" | "full_name">;
}

export interface DailyCashierInsert {
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
  created_by: string;
}

export interface CorrectionRequest {
  id: string;
  entry_id: string;
  proposed_changes: Record<string, unknown>;
  reason: string;
  status: CorrectionStatus;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  new_entry_id: string | null;
  created_at: string;
}

export interface CorrectionRequestWithRelations extends CorrectionRequest {
  entry: DailyCementWithRelations;
  requester: Pick<Profile, "id" | "full_name">;
  reviewer: Pick<Profile, "id" | "full_name"> | null;
}

// Bank Accounts (حسابات البنوك)
export interface Bank {
  id: string;
  name: string;
  account_number: string | null;
  balance: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BankTransaction {
  id: string;
  bank_id: string;
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
  notes: string | null;
  created_by: string;
  created_at: string;
  row_number: number;
  is_corrected: boolean;
  correction_of_id: string | null;
  corrected_by_entry_id: string | null;
  correction_reason: string | null;
}

export interface BankTransactionWithCreator extends BankTransaction {
  creator: Pick<Profile, "id" | "full_name">;
}

// Customer Transactions (كشف حساب العميل)
export interface CustomerTransaction {
  id: string;
  customer_id: string;
  entry_date: string;
  description: string;
  quantity: number | null;
  price: number | null;
  debit: number;
  credit: number;
  notes: string | null;
  source_type: string | null;
  source_id: string | null;
  created_by: string;
  created_at: string;
  row_number: number;
  is_corrected: boolean;
  correction_of_id: string | null;
  corrected_by_entry_id: string | null;
  correction_reason: string | null;
}

export interface CustomerTransactionWithCreator extends CustomerTransaction {
  creator: Pick<Profile, "id" | "full_name">;
}
