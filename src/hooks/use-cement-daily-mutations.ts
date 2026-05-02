"use client";

// Cement-daily mutations — Supabase via safe-fetch (online) with offline
// queue fallback. PowerSync was removed; writes go straight to Postgres
// or queue in IndexedDB until the network returns.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { safeInsert, safeUpdate, safeDelete } from "@/lib/supabase/safe-fetch";
import { cementDailyKeys } from "@/lib/react-query/keys";
import { MESSAGES } from "@/lib/constants";

export function useAddCementEntry(date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insertData: Record<string, unknown>) => {
      const { error } = await safeInsert("daily_cement", insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(MESSAGES.entryAdded);
      queryClient.invalidateQueries({ queryKey: cementDailyKeys.entries(date) });
      queryClient.invalidateQueries({ queryKey: cementDailyKeys.customers() });
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}

export function useAddDeposit(date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insertData: {
      entry_date: string;
      amount: number;
      description: string | null;
      created_by: string;
    }) => {
      const { error } = await safeInsert("daily_deposits", insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(MESSAGES.depositAdded);
      queryClient.invalidateQueries({ queryKey: cementDailyKeys.deposits(date) });
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}

export function useDeleteDeposit(date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await safeDelete("daily_deposits", { id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(MESSAGES.depositDeleted);
      queryClient.invalidateQueries({ queryKey: cementDailyKeys.deposits(date) });
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}

export function useUpsertInventory(date: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inventoryId,
      upsertData,
    }: {
      inventoryId: string | null;
      upsertData: Record<string, unknown>;
    }) => {
      const { error } = inventoryId
        ? await safeUpdate(
            "daily_inventory",
            {
              previous_balance: upsertData.previous_balance,
              added: upsertData.added,
              cost_price: upsertData.cost_price,
              updated_at: new Date().toISOString(),
            },
            { id: inventoryId },
          )
        : await safeInsert("daily_inventory", upsertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(MESSAGES.inventoryUpdated);
      queryClient.invalidateQueries({ queryKey: cementDailyKeys.inventory(date) });
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}

export function useRequestCorrection() {
  return useMutation({
    mutationFn: async (insertData: {
      entry_id: string;
      proposed_changes: Record<string, unknown>;
      reason: string;
      requested_by: string;
    }) => {
      const { error } = await safeInsert("correction_requests", insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(MESSAGES.correctionRequested);
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}

export function useAddCustomer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; phone: string | null }) => {
      const supabase = createClient();
      const { data: customer, error } = await supabase
        .from("customers")
        .insert(data)
        .select("id, name")
        .single();
      if (error) throw error;
      return customer;
    },
    onSuccess: () => {
      toast.success(MESSAGES.customerAdded);
      queryClient.invalidateQueries({ queryKey: cementDailyKeys.customers() });
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}
