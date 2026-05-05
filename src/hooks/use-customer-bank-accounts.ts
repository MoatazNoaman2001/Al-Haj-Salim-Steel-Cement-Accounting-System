"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import type { CustomerBankAccount } from "@/types/database";

const QUERY_KEY = (customerId: string) => ["customer-bank-accounts", customerId];

export function useCustomerBankAccounts(customerId: string | null | undefined) {
  return useQuery({
    queryKey: QUERY_KEY(customerId ?? ""),
    queryFn: async () => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customer_bank_accounts")
        .select("*")
        .eq("customer_id", customerId!)
        .eq("is_active", true)
        .order("bank_name");
      if (error) throw error;
      return data as CustomerBankAccount[];
    },
    enabled: !!customerId,
    staleTime: 3 * 60 * 1000,
  });
}

export interface AddCustomerBankInput {
  customer_id: string;
  bank_name: string;
  account_number?: string | null;
  notes?: string | null;
}

export function useAddCustomerBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AddCustomerBankInput) => {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("customer_bank_accounts")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data as CustomerBankAccount;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY(vars.customer_id) });
    },
  });
}

export function useDeleteCustomerBankAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, customer_id }: { id: string; customer_id: string }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("customer_bank_accounts")
        .update({ is_active: false })
        .eq("id", id);
      if (error) throw error;
      return { id, customer_id };
    },
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: QUERY_KEY(result.customer_id) });
    },
  });
}
