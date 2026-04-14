/**
 * Development-only mock data generators.
 *
 * Used to populate daily pages with realistic sample data in dev mode
 * so that all features (corrections, totals, admin profit columns, etc.)
 * can be visually verified without needing real entries in the DB.
 *
 * Mocks activate only when:
 *   1. process.env.NODE_ENV === "development"
 *   2. the real query returned an empty array
 *   3. required lookup data (products, customers) is present
 *
 * All mock records have IDs prefixed with "mock-" so callers can detect
 * and disable destructive interactions on them.
 */

import type {
  DailyCashierWithCreator,
  DailyCementWithRelations,
  DailyDepositWithCreator,
  DailyInventoryWithProduct,
  BankTransactionWithCreator,
  CustomerTransactionWithCreator,
} from "@/types/database";

export const IS_DEV_MOCK_ENABLED = process.env.NODE_ENV === "development";

export function isMockId(id: string | null | undefined): boolean {
  return typeof id === "string" && id.startsWith("mock-");
}

const MOCK_CUSTOMER_NAMES = [
  "كمباوند كنوز",
  "أحمد توفيق",
  "شركة البدري للمقاولات",
  "مؤسسة النور",
  "محمد علي",
  "شركة الأفق",
];

const MOCK_DRIVERS = ["سامي", "أحمد", "محمود", "علي"];

const MOCK_NOTES = [
  "تسليم عاجل",
  "دفعة أولى فقط",
  "ملاحظة: عميل قديم",
  null,
  null,
];

function pick<T>(arr: T[], index: number): T {
  return arr[index % arr.length];
}

function mockCreator(userId: string, fullName = "مستخدم تجريبي") {
  return { id: userId, full_name: fullName };
}

/**
 * Build a realistic set of cement/steel daily entries with:
 *  - multiple customers and products
 *  - at least one correction pair (is_corrected + correction_of_id)
 *  - varied payment states (fully paid, partial, unpaid)
 *  - cost_per_ton set so admin profit columns display
 */
export function mockCementEntries(
  date: string,
  products: { id: string; name: string }[],
  customers: { id: string; name: string }[],
  userId: string,
): DailyCementWithRelations[] {
  if (!products.length || !customers.length) return [];

  const now = new Date(date + "T10:00:00").toISOString();

  // Use real customers if we have enough, otherwise pad with mock-labeled ones
  const displayCustomers = customers.length >= 4
    ? customers.slice(0, 4)
    : [
        ...customers,
        ...MOCK_CUSTOMER_NAMES.slice(0, 4 - customers.length).map((name, i) => ({
          id: `mock-customer-${i}`,
          name,
        })),
      ];

  const base: Array<{
    customerIdx: number;
    productIdx: number;
    quantity: number;
    price: number;
    paid: number;
    transport: number;
    cost: number;
    driver: string;
    notes: string | null;
  }> = [
    { customerIdx: 0, productIdx: 0, quantity: 65, price: 4200, paid: 273000, transport: 50, cost: 3900, driver: MOCK_DRIVERS[0], notes: MOCK_NOTES[0] },
    { customerIdx: 1, productIdx: 0, quantity: 34, price: 4200, paid: 100000, transport: 50, cost: 3900, driver: MOCK_DRIVERS[1], notes: MOCK_NOTES[1] },
    { customerIdx: 2, productIdx: 1 % products.length, quantity: 20, price: 4350, paid: 87000, transport: 60, cost: 4050, driver: MOCK_DRIVERS[2], notes: MOCK_NOTES[2] },
    { customerIdx: 3, productIdx: 0, quantity: 15, price: 4200, paid: 0, transport: 50, cost: 3900, driver: MOCK_DRIVERS[3], notes: MOCK_NOTES[3] },
    { customerIdx: 0, productIdx: 1 % products.length, quantity: 40, price: 4350, paid: 174000, transport: 60, cost: 4050, driver: MOCK_DRIVERS[0], notes: MOCK_NOTES[4] },
    { customerIdx: 1, productIdx: 0, quantity: 25, price: 4200, paid: 50000, transport: 50, cost: 3900, driver: MOCK_DRIVERS[1], notes: null },
  ];

  const rows: DailyCementWithRelations[] = base.map((b, i) => {
    const customer = pick(displayCustomers, b.customerIdx);
    const product = pick(products, b.productIdx);
    const total = b.quantity * b.price;
    return {
      id: `mock-cement-${i + 1}`,
      entry_date: date,
      customer_id: customer.id,
      product_id: product.id,
      quantity: b.quantity,
      price_per_ton: b.price,
      total_amount: total,
      amount_paid: b.paid,
      remaining_balance: total - b.paid,
      transport_cost: b.transport,
      driver_name: b.driver,
      notes: b.notes,
      cost_per_ton: b.cost,
      profit_per_ton: b.price - b.cost,
      total_profit: (b.price - b.cost) * b.quantity,
      is_corrected: false,
      correction_of_id: null,
      corrected_by_entry_id: null,
      correction_reason: null,
      created_by: userId,
      created_at: now,
      updated_at: now,
      row_number: i + 1,
      customer: { id: customer.id, name: customer.name },
      product: { id: product.id, name: product.name },
      creator: mockCreator(userId),
    };
  });

  // Add a correction pair: mark entry #3 as corrected, append correction entry
  const originalIdx = 2;
  const original = rows[originalIdx];
  const correctionId = `mock-cement-correction-1`;
  rows[originalIdx] = {
    ...original,
    is_corrected: true,
    corrected_by_entry_id: correctionId,
    correction_reason: "خطأ في السعر",
  };

  const correctedQty = 22;
  const correctedPrice = 4400;
  const correctedTotal = correctedQty * correctedPrice;
  const correctedPaid = 96800;
  const correctionRow: DailyCementWithRelations = {
    ...original,
    id: correctionId,
    quantity: correctedQty,
    price_per_ton: correctedPrice,
    total_amount: correctedTotal,
    amount_paid: correctedPaid,
    remaining_balance: correctedTotal - correctedPaid,
    cost_per_ton: original.cost_per_ton,
    profit_per_ton: original.cost_per_ton != null ? correctedPrice - original.cost_per_ton : null,
    total_profit: original.cost_per_ton != null ? (correctedPrice - original.cost_per_ton) * correctedQty : null,
    is_corrected: false,
    correction_of_id: original.id,
    corrected_by_entry_id: null,
    correction_reason: "تصحيح السعر والكمية",
    row_number: rows.length + 1,
  };
  rows.push(correctionRow);

  return rows;
}

/**
 * Realistic daily deposits with varied amounts.
 */
export function mockDeposits(
  date: string,
  userId: string,
): DailyDepositWithCreator[] {
  const now = new Date(date + "T11:00:00").toISOString();
  const base = [
    { amount: 100000, description: "إيداع نقدي - البنك الأهلي" },
    { amount: 50000, description: "إيداع شيك #1234" },
    { amount: 25000, description: "إيداع نقدي" },
  ];
  return base.map((b, i) => ({
    id: `mock-deposit-${i + 1}`,
    entry_date: date,
    amount: b.amount,
    description: b.description,
    created_by: userId,
    created_at: now,
    row_number: i + 1,
    creator: mockCreator(userId),
  }));
}

/**
 * Inventory rows with varied balances + cost prices so the totals
 * and admin remaining-cost columns populate meaningfully.
 */
export function mockInventory(
  date: string,
  products: { id: string; name: string }[],
  userId: string,
): DailyInventoryWithProduct[] {
  if (!products.length) return [];
  const now = new Date(date + "T08:00:00").toISOString();
  const template = [
    { previous_balance: 500, added: 200, cost_price: 3900 },
    { previous_balance: 300, added: 100, cost_price: 4050 },
    { previous_balance: 150, added: 50, cost_price: 4100 },
    { previous_balance: 80, added: 30, cost_price: 4200 },
  ];
  return products.slice(0, template.length).map((product, i) => ({
    id: `mock-inventory-${i + 1}`,
    entry_date: date,
    product_id: product.id,
    previous_balance: template[i].previous_balance,
    added: template[i].added,
    cost_price: template[i].cost_price,
    notes: null,
    created_by: userId,
    created_at: now,
    updated_at: now,
    product: { id: product.id, name: product.name },
  }));
}

/**
 * Cashier ledger entries showcasing debit/credit flow with
 * a balanced day and a correction pair.
 */
export function mockCashierEntries(
  date: string,
  userId: string,
): DailyCashierWithCreator[] {
  const now = new Date(date + "T09:00:00").toISOString();
  const base: Array<{
    description: string;
    debit: number;
    credit: number;
  }> = [
    { description: "رصيد افتتاحي", debit: 0, credit: 500000 },
    { description: "بيع اسمنت - كمباوند كنوز", debit: 0, credit: 273000 },
    { description: "بيع اسمنت - أحمد توفيق", debit: 0, credit: 100000 },
    { description: "إيداع بنكي - البنك الأهلي", debit: 100000, credit: 0 },
    { description: "صرف نثريات", debit: 5000, credit: 0 },
    { description: "شراء وقود", debit: 3000, credit: 0 },
    { description: "بيع حديد - شركة البدري", debit: 0, credit: 87000 },
  ];

  const rows: DailyCashierWithCreator[] = base.map((b, i) => ({
    id: `mock-cashier-${i + 1}`,
    entry_date: date,
    description: b.description,
    debit: b.debit,
    credit: b.credit,
    created_by: userId,
    created_at: now,
    row_number: i + 1,
    is_corrected: false,
    correction_of_id: null,
    corrected_by_entry_id: null,
    correction_reason: null,
    creator: mockCreator(userId),
  }));

  // Add a correction pair
  const originalIdx = 4;
  rows[originalIdx] = {
    ...rows[originalIdx],
    is_corrected: true,
    corrected_by_entry_id: "mock-cashier-correction-1",
    correction_reason: "مبلغ خاطئ",
  };
  rows.push({
    id: "mock-cashier-correction-1",
    entry_date: date,
    description: "صرف نثريات (تصحيح)",
    debit: 5500,
    credit: 0,
    created_by: userId,
    created_at: now,
    row_number: rows.length + 1,
    is_corrected: false,
    correction_of_id: rows[originalIdx].id,
    corrected_by_entry_id: null,
    correction_reason: "تصحيح المبلغ",
    creator: mockCreator(userId),
  });

  return rows;
}

/**
 * Bank transactions with varied debit/credit flow for bank detail page.
 */
export function mockBankTransactions(
  bankId: string,
  userId: string,
): BankTransactionWithCreator[] {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();
  const base: Array<{
    description: string;
    debit: number;
    credit: number;
    days_ago: number;
  }> = [
    { description: "إيداع نقدي من الكاشير", debit: 0, credit: 100000, days_ago: 0 },
    { description: "سحب لصرف رواتب", debit: 50000, credit: 0, days_ago: 1 },
    { description: "إيداع شيك #1234", debit: 0, credit: 50000, days_ago: 2 },
    { description: "تحويل لمورد", debit: 30000, credit: 0, days_ago: 3 },
    { description: "رسوم بنكية", debit: 500, credit: 0, days_ago: 4 },
  ];
  return base.map((b, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - b.days_ago);
    return {
      id: `mock-bank-tx-${i + 1}`,
      bank_id: bankId,
      entry_date: d.toISOString().split("T")[0],
      description: b.description,
      debit: b.debit,
      credit: b.credit,
      notes: null,
      created_by: userId,
      created_at: now,
      row_number: i + 1,
      is_corrected: false,
      correction_of_id: null,
      corrected_by_entry_id: null,
      correction_reason: null,
      creator: mockCreator(userId),
    };
  });
}

/**
 * Customer transactions with varied debit/credit (purchase vs payment) flow.
 */
export function mockCustomerTransactions(
  customerId: string,
  userId: string,
): CustomerTransactionWithCreator[] {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date().toISOString();
  const base: Array<{
    description: string;
    quantity: number | null;
    price: number | null;
    debit: number;
    credit: number;
    days_ago: number;
  }> = [
    { description: "شراء اسمنت", quantity: 65, price: 4200, debit: 273000, credit: 0, days_ago: 0 },
    { description: "دفعة نقدية", quantity: null, price: null, debit: 0, credit: 150000, days_ago: 0 },
    { description: "شراء حديد", quantity: 20, price: 4350, debit: 87000, credit: 0, days_ago: 2 },
    { description: "دفعة شيك #5678", quantity: null, price: null, debit: 0, credit: 100000, days_ago: 3 },
    { description: "شراء اسمنت", quantity: 40, price: 4200, debit: 168000, credit: 0, days_ago: 5 },
  ];
  return base.map((b, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - b.days_ago);
    return {
      id: `mock-cust-tx-${i + 1}`,
      customer_id: customerId,
      entry_date: d.toISOString().split("T")[0],
      description: b.description,
      quantity: b.quantity,
      price: b.price,
      debit: b.debit,
      credit: b.credit,
      notes: null,
      source_type: null,
      source_id: null,
      created_by: userId,
      created_at: now,
      row_number: i + 1,
      is_corrected: false,
      correction_of_id: null,
      corrected_by_entry_id: null,
      correction_reason: null,
      creator: mockCreator(userId),
    };
  });
}
