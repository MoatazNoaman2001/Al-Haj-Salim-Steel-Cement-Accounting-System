"use client";

// Cement-daily mutations — PowerSync-first with safe-fetch fallback.
//
// When PowerSync is initialized, writes land in the local SQLite database
// immediately and are queued for upload via the SupabaseConnector. When
// PowerSync is not available (provider still initializing or init failed),
// we fall back to the legacy safeInsert/safeUpdate/safeDelete path which
// writes directly to Supabase online or queues to IndexedDB offline.
//
// Generated columns (total_amount, remaining_balance, profit_per_ton,
// total_profit) and SERIAL columns (row_number) are NOT written locally —
// PowerSync pulls the server-computed values back after sync.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { usePowerSync } from "@powersync/react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { safeInsert, safeUpdate, safeDelete } from "@/lib/supabase/safe-fetch";
import { cementDailyKeys } from "@/lib/react-query/keys";
import { MESSAGES } from "@/lib/constants";

function newId(): string {
  return crypto.randomUUID();
}

function nowISO(): string {
  return new Date().toISOString();
}

export function useAddCementEntry(date: string) {
  const db = usePowerSync();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insertData: Record<string, unknown>) => {
      if (db) {
        const id = newId();
        const now = nowISO();
        await db.execute(
          `INSERT INTO daily_cement (
             id, entry_date, customer_id, product_id, quantity, price_per_ton,
             amount_paid, transport_cost, driver_name, notes, cost_per_ton,
             is_corrected, created_by, created_at, updated_at
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
          [
            id,
            insertData.entry_date,
            insertData.customer_id,
            insertData.product_id,
            insertData.quantity,
            insertData.price_per_ton,
            insertData.amount_paid,
            insertData.transport_cost,
            insertData.driver_name ?? null,
            insertData.notes ?? null,
            insertData.cost_per_ton ?? null,
            insertData.created_by,
            now,
            now,
          ],
        );
        return;
      }
      const { error } = await safeInsert("daily_cement", insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(MESSAGES.entryAdded);
      if (!db) {
        queryClient.invalidateQueries({ queryKey: ["cement-daily", "entries", date] });
        queryClient.invalidateQueries({ queryKey: cementDailyKeys.customers() });
      }
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}

export function useAddDeposit(date: string) {
  const db = usePowerSync();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (insertData: {
      entry_date: string;
      amount: number;
      description: string | null;
      created_by: string;
    }) => {
      if (db) {
        const id = newId();
        const now = nowISO();
        await db.execute(
          `INSERT INTO daily_deposits (
             id, entry_date, amount, description, created_by, created_at
           ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            id,
            insertData.entry_date,
            insertData.amount,
            insertData.description,
            insertData.created_by,
            now,
          ],
        );
        return;
      }
      const { error } = await safeInsert("daily_deposits", insertData);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(MESSAGES.depositAdded);
      if (!db) {
        queryClient.invalidateQueries({ queryKey: cementDailyKeys.deposits(date) });
      }
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}

export function useDeleteDeposit(date: string) {
  const db = usePowerSync();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      if (db) {
        await db.execute(`DELETE FROM daily_deposits WHERE id = ?`, [id]);
        return;
      }
      const { error } = await safeDelete("daily_deposits", { id });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(MESSAGES.depositDeleted);
      if (!db) {
        queryClient.invalidateQueries({ queryKey: cementDailyKeys.deposits(date) });
      }
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}

export function useUpsertInventory(date: string) {
  const db = usePowerSync();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      inventoryId,
      upsertData,
    }: {
      inventoryId: string | null;
      upsertData: Record<string, unknown>;
    }) => {
      if (db) {
        const now = nowISO();
        if (inventoryId) {
          await db.execute(
            `UPDATE daily_inventory
             SET previous_balance = ?, added = ?, cost_price = ?, updated_at = ?
             WHERE id = ?`,
            [
              upsertData.previous_balance,
              upsertData.added,
              upsertData.cost_price,
              now,
              inventoryId,
            ],
          );
        } else {
          await db.execute(
            `INSERT INTO daily_inventory (
               id, entry_date, product_id, previous_balance, added,
               cost_price, notes, created_by, created_at, updated_at
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              newId(),
              upsertData.entry_date,
              upsertData.product_id,
              upsertData.previous_balance,
              upsertData.added,
              upsertData.cost_price,
              upsertData.notes ?? null,
              upsertData.created_by,
              now,
              now,
            ],
          );
        }
        return;
      }
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
      if (!db) {
        queryClient.invalidateQueries({ queryKey: ["cement-daily", "inventory", date] });
      }
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}

export function useRequestCorrection() {
  const db = usePowerSync();

  return useMutation({
    mutationFn: async (insertData: {
      entry_id: string;
      proposed_changes: Record<string, unknown>;
      reason: string;
      requested_by: string;
    }) => {
      if (db) {
        const now = nowISO();
        await db.execute(
          `INSERT INTO correction_requests (
             id, entry_id, proposed_changes, reason, status,
             requested_by, created_at
           ) VALUES (?, ?, ?, ?, 'pending', ?, ?)`,
          [
            newId(),
            insertData.entry_id,
            JSON.stringify(insertData.proposed_changes),
            insertData.reason,
            insertData.requested_by,
            now,
          ],
        );
        return;
      }
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
  const db = usePowerSync();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { name: string; phone: string | null }) => {
      if (db) {
        const id = newId();
        const now = nowISO();
        await db.execute(
          `INSERT INTO customers (id, name, phone, is_active, created_at)
           VALUES (?, ?, ?, 1, ?)`,
          [id, data.name, data.phone, now],
        );
        return { id, name: data.name };
      }
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
      if (!db) {
        queryClient.invalidateQueries({ queryKey: cementDailyKeys.customers() });
      }
    },
    onError: () => {
      toast.error(MESSAGES.error);
    },
  });
}
