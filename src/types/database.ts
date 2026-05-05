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

export interface CustomerWithBalance extends Customer {
  total_debit: number;
  total_credit: number;
  balance: number;
}

export interface Product {
  id: string;
  name: string;
  category: "cement" | "steel";
  unit: string;
  is_active: boolean;
  created_at: string;
}

// Customer Bank Accounts (حسابات العملاء البنكية)
// Stores a customer's own bank accounts so transactions can record
// which account the customer paid FROM (as opposed to bank_id which
// records which COMPANY account received the payment).
export interface CustomerBankAccount {
  id: string;
  customer_id: string;
  bank_name: string;
  account_number: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DailyCement {
  id: string;
  entry_date: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  price_per_ton: number;
  total_amount: number; // generated: quantity * price_per_ton
  amount_paid: number;
  remaining_balance: number; // generated: total + transport_in - tanzeel - amount_paid
  transport_cost: number; // = نولون out per ton (paid to driver)
  transport_in: number; // = نولون in (flat fee collected from customer)
  tanzeel: number; // = discount given to customer
  bank_id: string | null; // company bank that received amount_paid
  customer_bank_id: string | null; // customer's bank account the payment came FROM
  driver_name: string | null;
  notes: string | null;
  cost_per_ton: number | null;
  total_profit: number | null; // generated: (total + transport_in) - cogs - transport_out_total - tanzeel
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
  bank: Pick<Bank, "id" | "name"> | null;
  customer_bank: Pick<CustomerBankAccount, "id" | "bank_name"> | null;
}

export interface DailyCementInsert {
  entry_date: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  price_per_ton: number;
  amount_paid: number;
  transport_cost: number; // نولون out per ton
  transport_in?: number; // نولون in flat fee (default 0)
  tanzeel?: number; // discount (default 0)
  bank_id?: string | null;
  customer_bank_id?: string | null;
  driver_name?: string | null;
  notes?: string;
  cost_per_ton?: number | null;
  created_by: string;
}

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
  bank_id: string | null;          // company bank (destination of payment)
  customer_bank_id: string | null; // customer's bank (source of payment)
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

// Customer Reservations (محجوز العملاء)
// A reservation is a money-balance ledger between a customer (account holder)
// and a related "partner customer" (e.g. family member / linked client).
// credit  → reservation deposit (increases balance)
// debit   → withdrawal/delivery (decreases balance)
export interface CustomerReservation {
  id: string;
  customer_id: string;
  partner_customer_id: string;
  product_id: string | null;
  entry_date: string;
  description: string | null;
  credit: number;
  debit: number;
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

export interface CustomerReservationWithRelations extends CustomerReservation {
  partner_customer: Pick<Customer, "id" | "name">;
  product: Pick<Product, "id" | "name"> | null;
  creator: Pick<Profile, "id" | "full_name">;
}

export interface CustomerReservationInsert {
  customer_id: string;
  partner_customer_id: string;
  product_id?: string | null;
  entry_date: string;
  description?: string | null;
  credit: number;
  debit: number;
  notes?: string | null;
  created_by: string;
}

// Suppliers (الموردين)
// Mirrors Customer/CustomerTransaction but with INVERTED balance sign:
//   balance = credit - debit
//   negative → we still owe the supplier
//   positive → supplier holds our credit
export interface Supplier {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SupplierWithBalance extends Supplier {
  total_debit: number;
  total_credit: number;
  balance: number;
}

export interface SupplierTransaction {
  id: string;
  supplier_id: string;
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

export interface SupplierTransactionWithCreator extends SupplierTransaction {
  creator: Pick<Profile, "id" | "full_name">;
}

// Action Requests (طلبات التعديل والحذف)
export type ActionType = "edit" | "delete";
export type EntityType = "bank" | "bank_transaction" | "customer" | "customer_transaction";

export interface ActionRequest {
  id: string;
  action: ActionType;
  entity: EntityType;
  entity_id: string;
  proposed_changes: Record<string, unknown> | null;
  reason: string;
  status: CorrectionStatus;
  requested_by: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
}

export interface ActionRequestWithRelations extends ActionRequest {
  requester: Pick<Profile, "id" | "full_name">;
  reviewer: Pick<Profile, "id" | "full_name"> | null;
}
