"use client";

// Suppliers queries — PowerSync-first with Supabase fallback.
//
// Mirrors use-customers-queries.ts but for suppliers, with INVERTED balance:
//   balance = credit - debit
// (positive when supplier holds our credit, negative when we still owe them).

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { usePSQuery } from "@/hooks/use-ps-query";
import type {
  Supplier,
  SupplierWithBalance,
  SupplierTransactionWithCreator,
} from "@/types/database";

type SupplierBalanceRow = Omit<Supplier, "is_active"> & {
  total_debit: number;
  total_credit: number;
  balance: number;
  is_active: number;
};

export function useSupplierBalances(initialData: SupplierWithBalance[]) {
  const ps = usePSQuery<SupplierBalanceRow>(
    `SELECT
       s.*,
       COALESCE(SUM(CASE WHEN st.is_corrected = 0 THEN st.debit  ELSE 0 END), 0) AS total_debit,
       COALESCE(SUM(CASE WHEN st.is_corrected = 0 THEN st.credit ELSE 0 END), 0) AS total_credit,
       COALESCE(SUM(CASE WHEN st.is_corrected = 0 THEN st.credit - st.debit ELSE 0 END), 0) AS balance
     FROM suppliers s
     LEFT JOIN supplier_transactions st ON st.supplier_id = s.id
     GROUP BY s.id
     ORDER BY s.name ASC`,
    [],
    ["suppliers", "supplier_transactions"],
  );

  const rq = useQuery({
    queryKey: ["supplier-balances"],
    queryFn: async (): Promise<SupplierWithBalance[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplier_balances")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as SupplierWithBalance[];
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    const data: SupplierWithBalance[] = ps.data.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
    }));
    return { data, isLoading: ps.isLoading, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

export function useSupplier(supplierId: string, initialData: Supplier | null) {
  const ps = usePSQuery<Omit<Supplier, "is_active"> & { is_active: number }>(
    `SELECT * FROM suppliers WHERE id = ? LIMIT 1`,
    [supplierId],
    ["suppliers"],
  );

  const rq = useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: async (): Promise<Supplier | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", supplierId)
        .single();
      if (error) throw error;
      return data as Supplier;
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    const row = ps.data[0];
    const data: Supplier | null = row
      ? { ...row, is_active: Boolean(row.is_active) }
      : null;
    return { data, isLoading: ps.isLoading, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

type SupplierTxRow = Omit<SupplierTransactionWithCreator, "is_corrected" | "creator"> & {
  is_corrected: number;
  creator_name: string | null;
};

export function useSupplierTransactions(
  supplierId: string,
  initialData: SupplierTransactionWithCreator[],
) {
  const ps = usePSQuery<SupplierTxRow>(
    `SELECT t.*, pr.full_name AS creator_name
     FROM supplier_transactions t
     LEFT JOIN profiles pr ON pr.id = t.created_by
     WHERE t.supplier_id = ?
     ORDER BY t.entry_date ASC, t.row_number ASC`,
    [supplierId],
    ["supplier_transactions", "profiles"],
  );

  const rq = useQuery({
    queryKey: ["supplier-tx", supplierId],
    queryFn: async (): Promise<SupplierTransactionWithCreator[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("supplier_transactions")
        .select("*, creator:profiles!created_by(id, full_name)")
        .eq("supplier_id", supplierId)
        .order("entry_date", { ascending: true })
        .order("row_number", { ascending: true });
      if (error) throw error;
      return data as SupplierTransactionWithCreator[];
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    const data: SupplierTransactionWithCreator[] = ps.data.map((r) => ({
      ...r,
      is_corrected: Boolean(r.is_corrected),
      creator: { id: r.created_by, full_name: r.creator_name ?? "" },
    }));
    return { data, isLoading: ps.isLoading, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}
