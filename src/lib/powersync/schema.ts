// PowerSync local SQLite schema.
//
// Mirrors the Supabase Postgres tables used by the app. PowerSync applies this
// schema to the local database as a set of SQLite views — it is NOT a migration,
// so adding/removing columns here only affects what is visible client-side.
//
// Conventions:
//   - `id` is auto-added by PowerSync as text UUID. Do NOT redeclare it.
//   - SQLite has no boolean — booleans are column.integer (0/1).
//   - SQLite has no native timestamp — dates are column.text (ISO strings).
//   - Postgres JSONB is column.text — parse with JSON.parse on read.
//   - Postgres GENERATED columns are mirrored as regular columns here. They are
//     populated by the server on pull. For offline writes, compute them locally
//     (see src/lib/powersync/generated-columns.ts — added in Phase 2).

import { column, Schema, Table } from "@powersync/web";

const profiles = new Table(
  {
    full_name: column.text,
    role: column.text, // "admin" | "cashier"
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { by_role: ["role"] } }
);

const customers = new Table(
  {
    name: column.text,
    phone: column.text,
    address: column.text,
    notes: column.text,
    is_active: column.integer,
    created_at: column.text,
  },
  { indexes: { by_active: ["is_active"] } }
);

const products = new Table(
  {
    name: column.text,
    category: column.text, // "cement" | "steel"
    unit: column.text,
    is_active: column.integer,
    created_at: column.text,
  },
  { indexes: { by_category: ["category", "is_active"] } }
);

const daily_cement = new Table(
  {
    entry_date: column.text,
    customer_id: column.text,
    product_id: column.text,
    quantity: column.real,
    price_per_ton: column.real,
    total_amount: column.real, // GENERATED — computed client-side for offline
    amount_paid: column.real,
    remaining_balance: column.real, // GENERATED
    transport_cost: column.real,
    driver_name: column.text,
    notes: column.text,
    cost_per_ton: column.real,
    profit_per_ton: column.real, // GENERATED
    total_profit: column.real, // GENERATED
    is_corrected: column.integer,
    correction_of_id: column.text,
    corrected_by_entry_id: column.text,
    correction_reason: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
    row_number: column.integer,
  },
  {
    indexes: {
      by_date: ["entry_date"],
      by_customer: ["customer_id", "entry_date"],
      by_product: ["product_id", "entry_date"],
      by_corrected: ["is_corrected"],
    },
  }
);

const daily_inventory = new Table(
  {
    entry_date: column.text,
    product_id: column.text,
    previous_balance: column.real,
    added: column.real,
    cost_price: column.real,
    notes: column.text,
    created_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  {
    indexes: {
      by_date: ["entry_date"],
      by_product: ["product_id", "entry_date"],
    },
  }
);

const daily_deposits = new Table(
  {
    entry_date: column.text,
    amount: column.real,
    description: column.text,
    created_by: column.text,
    created_at: column.text,
    row_number: column.integer,
  },
  { indexes: { by_date: ["entry_date"] } }
);

const daily_cash_balance = new Table(
  {
    balance_date: column.text,
    opening_balance: column.real,
    notes: column.text,
    updated_by: column.text,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { by_date: ["balance_date"] } }
);

const daily_cashier = new Table(
  {
    entry_date: column.text,
    description: column.text,
    debit: column.real,
    credit: column.real,
    created_by: column.text,
    created_at: column.text,
    row_number: column.integer,
    is_corrected: column.integer,
    correction_of_id: column.text,
    corrected_by_entry_id: column.text,
    correction_reason: column.text,
  },
  { indexes: { by_date: ["entry_date"], by_corrected: ["is_corrected"] } }
);

const correction_requests = new Table(
  {
    entry_id: column.text,
    proposed_changes: column.text, // JSONB → text
    reason: column.text,
    status: column.text, // "pending" | "approved" | "rejected"
    requested_by: column.text,
    reviewed_by: column.text,
    reviewed_at: column.text,
    rejection_reason: column.text,
    new_entry_id: column.text,
    created_at: column.text,
  },
  { indexes: { by_status: ["status"], by_entry: ["entry_id"] } }
);

const action_requests = new Table(
  {
    action: column.text, // "edit" | "delete"
    entity: column.text, // "bank" | "bank_transaction" | ...
    entity_id: column.text,
    proposed_changes: column.text, // JSONB → text
    reason: column.text,
    status: column.text,
    requested_by: column.text,
    reviewed_by: column.text,
    reviewed_at: column.text,
    rejection_reason: column.text,
    created_at: column.text,
  },
  { indexes: { by_status: ["status"], by_entity: ["entity", "entity_id"] } }
);

const banks = new Table(
  {
    name: column.text,
    account_number: column.text,
    balance: column.real,
    is_active: column.integer,
    created_at: column.text,
    updated_at: column.text,
  },
  { indexes: { by_active: ["is_active"] } }
);

const bank_transactions = new Table(
  {
    bank_id: column.text,
    entry_date: column.text,
    description: column.text,
    debit: column.real,
    credit: column.real,
    notes: column.text,
    created_by: column.text,
    created_at: column.text,
    row_number: column.integer,
    is_corrected: column.integer,
    correction_of_id: column.text,
    corrected_by_entry_id: column.text,
    correction_reason: column.text,
  },
  {
    indexes: {
      by_bank: ["bank_id", "entry_date"],
      by_date: ["entry_date"],
    },
  }
);

const customer_transactions = new Table(
  {
    customer_id: column.text,
    entry_date: column.text,
    description: column.text,
    quantity: column.real,
    price: column.real,
    debit: column.real,
    credit: column.real,
    notes: column.text,
    source_type: column.text,
    source_id: column.text,
    created_by: column.text,
    created_at: column.text,
    row_number: column.integer,
    is_corrected: column.integer,
    correction_of_id: column.text,
    corrected_by_entry_id: column.text,
    correction_reason: column.text,
  },
  {
    indexes: {
      by_customer: ["customer_id", "entry_date"],
      by_date: ["entry_date"],
    },
  }
);

const customer_reservations = new Table(
  {
    customer_id: column.text,
    partner_customer_id: column.text,
    product_id: column.text,
    entry_date: column.text,
    description: column.text,
    credit: column.real,
    debit: column.real,
    notes: column.text,
    source_type: column.text,
    source_id: column.text,
    created_by: column.text,
    created_at: column.text,
    row_number: column.integer,
    is_corrected: column.integer,
    correction_of_id: column.text,
    corrected_by_entry_id: column.text,
    correction_reason: column.text,
  },
  {
    indexes: {
      by_customer: ["customer_id", "entry_date"],
      by_partner: ["partner_customer_id"],
      by_date: ["entry_date"],
    },
  }
);

const suppliers = new Table(
  {
    name: column.text,
    phone: column.text,
    address: column.text,
    notes: column.text,
    is_active: column.integer,
    created_at: column.text,
  },
  { indexes: { by_active: ["is_active"] } }
);

const supplier_transactions = new Table(
  {
    supplier_id: column.text,
    entry_date: column.text,
    description: column.text,
    quantity: column.real,
    price: column.real,
    debit: column.real,
    credit: column.real,
    notes: column.text,
    source_type: column.text,
    source_id: column.text,
    created_by: column.text,
    created_at: column.text,
    row_number: column.integer,
    is_corrected: column.integer,
    correction_of_id: column.text,
    corrected_by_entry_id: column.text,
    correction_reason: column.text,
  },
  {
    indexes: {
      by_supplier: ["supplier_id", "entry_date"],
      by_date: ["entry_date"],
    },
  }
);

export const AppSchema = new Schema({
  profiles,
  customers,
  products,
  daily_cement,
  daily_inventory,
  daily_deposits,
  daily_cash_balance,
  daily_cashier,
  correction_requests,
  action_requests,
  banks,
  bank_transactions,
  customer_transactions,
  customer_reservations,
  suppliers,
  supplier_transactions,
});

export type Database = (typeof AppSchema)["types"];
