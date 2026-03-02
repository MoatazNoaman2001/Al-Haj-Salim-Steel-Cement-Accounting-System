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

// Daily Bonds (جدول البونات)
export interface DailyBond {
  id: string;
  entry_date: string;
  customer_id: string;
  amount: number;
  bond_number: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  row_number: number;
}

export interface DailyBondWithRelations extends DailyBond {
  customer: Pick<Customer, "id" | "name">;
  creator: Pick<Profile, "id" | "full_name">;
}

export interface DailyBondInsert {
  entry_date: string;
  customer_id: string;
  amount: number;
  bond_number?: string;
  notes?: string;
  created_by: string;
}

// Cash Balance (رصيد نقدي)
export interface DailyCashBalance {
  id: string;
  balance_date: string;
  opening_balance: number;
  notes: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
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
