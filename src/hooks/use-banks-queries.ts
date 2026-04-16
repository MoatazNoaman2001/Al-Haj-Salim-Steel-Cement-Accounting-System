"use client";

// Banks queries — PowerSync-first with Supabase fallback.
//
// When PowerSync has initialized, we run the same aggregation that the
// Supabase Postgres side does (opening balance + sum of non-corrected
// debits/credits) directly against local SQLite via usePSQuery. When PS
// isn't ready, we fall back to the original useOfflineQuery path so no
// page breaks during the init window or if PS can't connect.

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { usePSQuery } from "@/hooks/use-ps-query";
import type { Bank, BankTransactionWithCreator } from "@/types/database";

export interface BankWithTotals extends Bank {
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
}

type BankAggRow = Omit<Bank, "is_active"> & {
  total_debit: number;
  total_credit: number;
  is_active: number; // SQLite boolean (0/1)
};

export function useBanksWithTotals(initialData: BankWithTotals[]) {
  const ps = usePSQuery<BankAggRow>(
    `SELECT
       b.*,
       COALESCE(SUM(CASE WHEN t.is_corrected = 0 THEN t.debit  ELSE 0 END), 0) AS total_debit,
       COALESCE(SUM(CASE WHEN t.is_corrected = 0 THEN t.credit ELSE 0 END), 0) AS total_credit
     FROM banks b
     LEFT JOIN bank_transactions t ON t.bank_id = b.id
     WHERE b.is_active = 1
     GROUP BY b.id
     ORDER BY b.created_at ASC`,
    [],
    ["banks", "bank_transactions"],
  );

  const rq = useQuery({
    queryKey: ["banks-with-totals"],
    queryFn: async (): Promise<BankWithTotals[]> => {
      const supabase = createClient();
      const [banksRes, txRes] = await Promise.all([
        supabase
          .from("banks")
          .select("*")
          .eq("is_active", true)
          .order("created_at", { ascending: true }),
        supabase
          .from("bank_transactions")
          .select("bank_id, debit, credit")
          .eq("is_corrected", false),
      ]);
      if (banksRes.error) throw banksRes.error;
      if (txRes.error) throw txRes.error;

      const totals: Record<string, { d: number; c: number }> = {};
      for (const tx of txRes.data ?? []) {
        if (!totals[tx.bank_id]) totals[tx.bank_id] = { d: 0, c: 0 };
        totals[tx.bank_id].d += tx.debit;
        totals[tx.bank_id].c += tx.credit;
      }
      return (banksRes.data ?? []).map((b: Bank) => ({
        ...b,
        totalDebit: totals[b.id]?.d ?? 0,
        totalCredit: totals[b.id]?.c ?? 0,
        currentBalance: b.balance + (totals[b.id]?.c ?? 0) - (totals[b.id]?.d ?? 0),
      }));
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady && !ps.isLoading) {
    const data: BankWithTotals[] = ps.data.map((r) => ({
      ...r,
      is_active: Boolean(r.is_active),
      totalDebit: r.total_debit,
      totalCredit: r.total_credit,
      currentBalance: r.balance + r.total_credit - r.total_debit,
    }));
    return { data, isLoading: false, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

export function useActiveBanks(initialData: Bank[]) {
  const ps = usePSQuery<Omit<Bank, "is_active"> & { is_active: number }>(
    `SELECT * FROM banks WHERE is_active = 1 ORDER BY created_at ASC`,
    [],
    ["banks"],
  );

  const rq = useQuery({
    queryKey: ["banks-active"],
    queryFn: async (): Promise<Bank[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("banks")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as Bank[];
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady && !ps.isLoading) {
    const data: Bank[] = ps.data.map((r) => ({ ...r, is_active: Boolean(r.is_active) }));
    return { data, isLoading: false, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

export function useBank(bankId: string, initialData: Bank | null) {
  const ps = usePSQuery<Omit<Bank, "is_active"> & { is_active: number }>(
    `SELECT * FROM banks WHERE id = ? LIMIT 1`,
    [bankId],
    ["banks"],
  );

  const rq = useQuery({
    queryKey: ["bank", bankId],
    queryFn: async (): Promise<Bank | null> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("banks")
        .select("*")
        .eq("id", bankId)
        .single();
      if (error) throw error;
      return data as Bank;
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady && !ps.isLoading) {
    const row = ps.data[0];
    const data: Bank | null = row
      ? { ...row, is_active: Boolean(row.is_active) }
      : null;
    return { data, isLoading: false, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}

type BankTxRow = Omit<BankTransactionWithCreator, "is_corrected" | "creator"> & {
  creator_name: string | null;
  is_corrected: number;
};

export function useBankTransactions(
  bankId: string,
  initialData: BankTransactionWithCreator[],
) {
  const ps = usePSQuery<BankTxRow>(
    `SELECT t.*, pr.full_name AS creator_name
     FROM bank_transactions t
     LEFT JOIN profiles pr ON pr.id = t.created_by
     WHERE t.bank_id = ?
     ORDER BY t.entry_date ASC, t.row_number ASC`,
    [bankId],
    ["bank_transactions", "profiles"],
  );

  const rq = useQuery({
    queryKey: ["bank-tx", bankId],
    queryFn: async (): Promise<BankTransactionWithCreator[]> => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("bank_transactions")
        .select("*, creator:profiles!created_by(id, full_name)")
        .eq("bank_id", bankId)
        .order("entry_date", { ascending: true })
        .order("row_number", { ascending: true });
      if (error) throw error;
      return data as BankTransactionWithCreator[];
    },
    initialData,
    enabled: !ps.isReady,
  });

  if (ps.isReady && !ps.isLoading) {
    const data: BankTransactionWithCreator[] = ps.data.map((r) => ({
      ...r,
      is_corrected: Boolean(r.is_corrected),
      creator: { id: r.created_by, full_name: r.creator_name ?? "" },
    }));
    return { data, isLoading: false, error: ps.error };
  }
  return { data: rq.data ?? initialData, isLoading: rq.isLoading, error: rq.error };
}
