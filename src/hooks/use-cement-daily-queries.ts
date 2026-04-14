"use client";

// Cement-daily data queries — PowerSync-first with React Query fallback.
//
// Each hook calls both paths. When PowerSync has initialized, we return
// results from local SQLite (instant, offline-capable, auto-refreshing on
// CRUD). While PowerSync is still initializing (or if init failed), the
// React Query path hits Supabase directly. The `enabled` flag suppresses
// the server fetch once PowerSync is primary, so we don't double-load.

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cementDailyKeys } from "@/lib/react-query/keys";
import { usePSQuery } from "@/hooks/use-ps-query";
import type {
  DailyCementWithRelations,
  DailyInventoryWithProduct,
  DailyDepositWithCreator,
  DailyCashBalance,
  Customer,
  Product,
} from "@/types/database";

type CementEntryRow = DailyCementWithRelations & {
  customer_name: string | null;
  product_name: string | null;
  creator_name: string | null;
};

function shapeCementEntries(rows: CementEntryRow[]): DailyCementWithRelations[] {
  return rows.map((r) => ({
    ...r,
    is_corrected: Boolean(r.is_corrected),
    customer: { id: r.customer_id, name: r.customer_name ?? "" },
    product: { id: r.product_id, name: r.product_name ?? "" },
    creator: { id: r.created_by, full_name: r.creator_name ?? "" },
  }));
}

export function useCementEntries(date: string) {
  const ps = usePSQuery<CementEntryRow>(
    `SELECT
       c.*,
       cu.name AS customer_name,
       p.name  AS product_name,
       pr.full_name AS creator_name
     FROM daily_cement c
     LEFT JOIN customers cu ON cu.id = c.customer_id
     LEFT JOIN products  p  ON p.id  = c.product_id
     LEFT JOIN profiles  pr ON pr.id = c.created_by
     WHERE c.entry_date = ?
     ORDER BY c.row_number ASC`,
    [date],
    ["daily_cement", "customers", "products", "profiles"],
  );

  const rq = useQuery({
    queryKey: cementDailyKeys.entries(date),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_cement")
        .select(
          `
          *,
          customer:customers!customer_id(id, name),
          product:products!product_id(id, name),
          creator:profiles!created_by(id, full_name)
        `,
        )
        .eq("entry_date", date)
        .order("row_number", { ascending: true });

      if (error) throw error;
      return data as DailyCementWithRelations[];
    },
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    return {
      data: shapeCementEntries(ps.data),
      isLoading: ps.isLoading,
      error: ps.error,
    };
  }
  return rq;
}

export function useCustomers() {
  const ps = usePSQuery<Pick<Customer, "id" | "name">>(
    `SELECT id, name FROM customers WHERE is_active = 1 ORDER BY name`,
    [],
    ["customers"],
  );

  const rq = useQuery({
    queryKey: cementDailyKeys.customers(),
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
    staleTime: 5 * 60 * 1000,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    return { data: ps.data, isLoading: ps.isLoading, error: ps.error };
  }
  return rq;
}

export function useCementProducts() {
  const ps = usePSQuery<Pick<Product, "id" | "name">>(
    `SELECT id, name FROM products
     WHERE category = 'cement' AND is_active = 1
     ORDER BY name`,
    [],
    ["products"],
  );

  const rq = useQuery({
    queryKey: cementDailyKeys.products("cement"),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("category", "cement")
        .eq("is_active", true)
        .order("name");

      if (error) throw error;
      return data as Pick<Product, "id" | "name">[];
    },
    staleTime: 5 * 60 * 1000,
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    return { data: ps.data, isLoading: ps.isLoading, error: ps.error };
  }
  return rq;
}

type InventoryRow = DailyInventoryWithProduct & { product_name: string | null };

export function useDailyInventory(date: string) {
  const ps = usePSQuery<InventoryRow>(
    `SELECT i.*, p.name AS product_name
     FROM daily_inventory i
     LEFT JOIN products p ON p.id = i.product_id
     WHERE i.entry_date = ?`,
    [date],
    ["daily_inventory", "products"],
  );

  const rq = useQuery({
    queryKey: cementDailyKeys.inventory(date),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_inventory")
        .select(
          `
          *,
          product:products!product_id(id, name)
        `,
        )
        .eq("entry_date", date);

      if (error) throw error;
      return data as DailyInventoryWithProduct[];
    },
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    return {
      data: ps.data.map((r) => ({
        ...r,
        product: { id: r.product_id, name: r.product_name ?? "" },
      })),
      isLoading: ps.isLoading,
      error: ps.error,
    };
  }
  return rq;
}

type DepositRow = DailyDepositWithCreator & { creator_name: string | null };

export function useDailyDeposits(date: string) {
  const ps = usePSQuery<DepositRow>(
    `SELECT d.*, pr.full_name AS creator_name
     FROM daily_deposits d
     LEFT JOIN profiles pr ON pr.id = d.created_by
     WHERE d.entry_date = ?
     ORDER BY d.row_number ASC`,
    [date],
    ["daily_deposits", "profiles"],
  );

  const rq = useQuery({
    queryKey: cementDailyKeys.deposits(date),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_deposits")
        .select(
          `
          *,
          creator:profiles!created_by(id, full_name)
        `,
        )
        .eq("entry_date", date)
        .order("row_number", { ascending: true });

      if (error) throw error;
      return data as DailyDepositWithCreator[];
    },
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    return {
      data: ps.data.map((r) => ({
        ...r,
        creator: { id: r.created_by, full_name: r.creator_name ?? "" },
      })),
      isLoading: ps.isLoading,
      error: ps.error,
    };
  }
  return rq;
}

export function useDailyCashBalance(date: string) {
  const ps = usePSQuery<DailyCashBalance>(
    `SELECT * FROM daily_cash_balance WHERE balance_date = ? LIMIT 1`,
    [date],
    ["daily_cash_balance"],
  );

  const rq = useQuery({
    queryKey: cementDailyKeys.cashBalance(date),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_cash_balance")
        .select("*")
        .eq("balance_date", date)
        .maybeSingle();

      if (error) throw error;
      return data as DailyCashBalance | null;
    },
    enabled: !ps.isReady,
  });

  if (ps.isReady) {
    return {
      data: (ps.data[0] ?? null) as DailyCashBalance | null,
      isLoading: ps.isLoading,
      error: ps.error,
    };
  }
  return rq;
}
