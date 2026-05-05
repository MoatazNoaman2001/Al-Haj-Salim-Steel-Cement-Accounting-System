"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export interface Bank {
  id: string;
  name: string;
  account_number: string | null;
  balance: number;
  is_active: boolean;
}

export function useBanks(activeOnly = true) {
  return useQuery({
    queryKey: ["banks", { activeOnly }],
    queryFn: async () => {
      const supabase = createClient();
      let query = supabase
        .from("banks")
        .select("id, name, account_number, balance, is_active")
        .order("name");

      if (activeOnly) {
        query = query.eq("is_active", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Bank[];
    },
    staleTime: 5 * 60 * 1000,
  });
}