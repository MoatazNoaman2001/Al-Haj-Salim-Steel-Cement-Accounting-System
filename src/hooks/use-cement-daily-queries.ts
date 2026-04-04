"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cementDailyKeys } from "@/lib/react-query/keys";
import type {
  DailyCementWithRelations,
  DailyInventoryWithProduct,
  DailyDepositWithCreator,
  DailyCashBalance,
  Customer,
  Product,
} from "@/types/database";

export function useCementEntries(date: string) {
  return useQuery({
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
        `
        )
        .eq("entry_date", date)
        .order("row_number", { ascending: true });

      if (error) throw error;
      return data as DailyCementWithRelations[];
    },
  });
}

export function useCustomers() {
  return useQuery({
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
  });
}

export function useCementProducts() {
  return useQuery({
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
  });
}

export function useDailyInventory(date: string) {
  return useQuery({
    queryKey: cementDailyKeys.inventory(date),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_inventory")
        .select(
          `
          *,
          product:products!product_id(id, name)
        `
        )
        .eq("entry_date", date);

      if (error) throw error;
      return data as DailyInventoryWithProduct[];
    },
  });
}

export function useDailyDeposits(date: string) {
  return useQuery({
    queryKey: cementDailyKeys.deposits(date),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("daily_deposits")
        .select(
          `
          *,
          creator:profiles!created_by(id, full_name)
        `
        )
        .eq("entry_date", date)
        .order("row_number", { ascending: true });

      if (error) throw error;
      return data as DailyDepositWithCreator[];
    },
  });
}

export function useDailyCashBalance(date: string) {
  return useQuery({
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
  });
}
