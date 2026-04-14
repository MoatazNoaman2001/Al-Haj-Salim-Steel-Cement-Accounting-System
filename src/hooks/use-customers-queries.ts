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
