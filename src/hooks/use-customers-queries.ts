"use client";

// Customers queries — PowerSync-first with Supabase fallback.
//
// The Postgres `customer_balances` view is reproduced in SQL here so the
// same aggregation runs locally on IndexedDB-backed SQLite. When PS isn't
// ready, we hit the view directly via Supabase.

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { usePSQuery } from "@/hooks/use-ps-query";
import type {
  Customer,
  CustomerWithBalance,
  CustomerTransactionWithCreator,
  CustomerReservationWithRelations,
} from "@/types/database";

type CustomerBalanceRow = Omit<Customer, "is_active"> & {
  total_debit: number;
  total_credit: number;
  balance: number;
  is_active: number;
};

export function useCustomerBalances(initialData: CustomerWithBalance[]) {
  const ps = usePSQuery<CustomerBalanceRow>(
    `SELECT
       c.*,
       COALESCE(SUM(CASE WHEN ct.is_corrected = 0 THEN ct.debit  ELSE 0 END), 0) AS total_debit,
       COALESCE(SUM(CASE WHEN ct.is_corrected = 0 THEN ct.credit ELSE 0 END), 0) AS total_credit,
       COALESCE(SUM(CASE WHEN ct.is_corrected = 0 THEN ct.debit - ct.credit ELSE 0 END), 0) AS balance
     FROM customers c
     LEFT JOIN customer_transactions ct ON ct.customer_id = c.id
     GROUP BY c.id
     ORDER BY c.name ASC`,
    [],
    ["customers", "customer_transactions"],
  );

  const rq = useQuery({
    queryKey: ["customer-balances"],
    queryFn: async (): Promise<CustomerWithBalance[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customer_balances")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as CustomerWithBalance[];
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    const data: CustomerWithBalance[] = ps.data.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
    }));
    return { data, isLoading: ps.isLoading, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

export function useCustomer(customerId: string, initialData: Customer | null) {
  const ps = usePSQuery<Omit<Customer, "is_active"> & { is_active: number }>(
    `SELECT * FROM customers WHERE id = ? LIMIT 1`,
    [customerId],
    ["customers"],
  );

  const rq = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async (): Promise<Customer | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", customerId)
        .single();
      if (error) throw error;
      return data as Customer;
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    const row = ps.data[0];
    const data: Customer | null = row
      ? { ...row, is_active: Boolean(row.is_active) }
      : null;
    return { data, isLoading: ps.isLoading, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

type CustomerTxRow = Omit<CustomerTransactionWithCreator, "is_corrected" | "creator"> & {
  is_corrected: number;
  creator_name: string | null;
};

export function useCustomerTransactions(
  customerId: string,
  initialData: CustomerTransactionWithCreator[],
) {
  const ps = usePSQuery<CustomerTxRow>(
    `SELECT t.*, pr.full_name AS creator_name
     FROM customer_transactions t
     LEFT JOIN profiles pr ON pr.id = t.created_by
     WHERE t.customer_id = ?
     ORDER BY t.entry_date ASC, t.row_number ASC`,
    [customerId],
    ["customer_transactions", "profiles"],
  );

  const rq = useQuery({
    queryKey: ["customer-tx", customerId],
    queryFn: async (): Promise<CustomerTransactionWithCreator[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customer_transactions")
        .select("*, creator:profiles!created_by(id, full_name)")
        .eq("customer_id", customerId)
        .order("entry_date", { ascending: true })
        .order("row_number", { ascending: true });
      if (error) throw error;
      return data as CustomerTransactionWithCreator[];
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    const data: CustomerTransactionWithCreator[] = ps.data.map((r) => ({
      ...r,
      is_corrected: Boolean(r.is_corrected),
      creator: { id: r.created_by, full_name: r.creator_name ?? "" },
    }));
    return { data, isLoading: ps.isLoading, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

type CustomerReservationRow =
  Omit<CustomerReservationWithRelations, "is_corrected" | "partner_customer" | "product" | "creator"> & {
    is_corrected: number;
    partner_name: string | null;
    product_name: string | null;
    creator_name: string | null;
  };

export function useCustomerReservations(
  customerId: string,
  initialData: CustomerReservationWithRelations[],
) {
  const ps = usePSQuery<CustomerReservationRow>(
    `SELECT r.*,
            pc.name AS partner_name,
            p.name  AS product_name,
            pr.full_name AS creator_name
     FROM customer_reservations r
     LEFT JOIN customers pc ON pc.id = r.partner_customer_id
     LEFT JOIN products  p  ON p.id  = r.product_id
     LEFT JOIN profiles  pr ON pr.id = r.created_by
     WHERE r.customer_id = ?
     ORDER BY r.entry_date ASC, r.row_number ASC`,
    [customerId],
    ["customer_reservations", "customers", "products", "profiles"],
  );

  const rq = useQuery({
    queryKey: ["customer-reservations", customerId],
    queryFn: async (): Promise<CustomerReservationWithRelations[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customer_reservations")
        .select(
          `*,
           partner_customer:customers!partner_customer_id(id, name),
           product:products!product_id(id, name),
           creator:profiles!created_by(id, full_name)`,
        )
        .eq("customer_id", customerId)
        .order("entry_date", { ascending: true })
        .order("row_number", { ascending: true });
      if (error) throw error;
      return data as CustomerReservationWithRelations[];
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    const data: CustomerReservationWithRelations[] = ps.data.map((r) => ({
      ...r,
      is_corrected: Boolean(r.is_corrected),
      partner_customer: { id: r.partner_customer_id, name: r.partner_name ?? "" },
      product: r.product_id ? { id: r.product_id, name: r.product_name ?? "" } : null,
      creator: { id: r.created_by, full_name: r.creator_name ?? "" },
    }));
    return { data, isLoading: ps.isLoading, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

export interface CustomerReservationBalance {
  customer_id: string;
  customer_name: string;
  total_credit: number;
  total_debit: number;
  balance: number;
}

// Per-customer reservation totals — drives the global /reservations index.
// Mirrors the Postgres view `customer_reservation_balances` locally.
export function useCustomerReservationBalances(
  initialData: CustomerReservationBalance[] = [],
) {
  const ps = usePSQuery<CustomerReservationBalance>(
    `SELECT
       c.id   AS customer_id,
       c.name AS customer_name,
       COALESCE(SUM(CASE WHEN r.is_corrected = 0 THEN r.credit ELSE 0 END), 0) AS total_credit,
       COALESCE(SUM(CASE WHEN r.is_corrected = 0 THEN r.debit  ELSE 0 END), 0) AS total_debit,
       COALESCE(SUM(CASE WHEN r.is_corrected = 0 THEN r.credit - r.debit ELSE 0 END), 0) AS balance
     FROM customers c
     LEFT JOIN customer_reservations r ON r.customer_id = c.id
     GROUP BY c.id, c.name
     ORDER BY c.name ASC`,
    [],
    ["customers", "customer_reservations"],
  );

  const rq = useQuery({
    queryKey: ["customer-reservation-balances"],
    queryFn: async (): Promise<CustomerReservationBalance[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customer_reservation_balances")
        .select("*")
        .order("customer_name", { ascending: true });
      if (error) throw error;
      return data as CustomerReservationBalance[];
    },
    initialData: initialData.length ? initialData : undefined,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    return { data: ps.data, isLoading: ps.isLoading, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

// Active customers, used as the partner-customer dropdown source.
export function useActiveCustomers(initialData: Pick<Customer, "id" | "name">[] = []) {
  const ps = usePSQuery<Pick<Customer, "id" | "name">>(
    `SELECT id, name FROM customers WHERE is_active = 1 ORDER BY name`,
    [],
    ["customers"],
  );

  const rq = useQuery({
    queryKey: ["customers", "active-list"],
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Pick<Customer, "id" | "name">[];
    },
    initialData: initialData.length ? initialData : undefined,
    staleTime: 5 * 60 * 1000,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    return { data: ps.data, isLoading: ps.isLoading, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}
