"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { CashierDataTable } from "./data-table";
import { useOfflineQuery } from "@/hooks/use-offline-query";
import type { DailyCashierWithCreator } from "@/types/database";

interface CashierDailyClientProps {
  data: DailyCashierWithCreator[];
  initialDate: string;
}

export function CashierDailyClient({ data: serverData, initialDate }: CashierDailyClientProps) {
  const router = useRouter();

  const queryFn = useCallback(
    (supabase: any) =>
      supabase
        .from("daily_cashier")
        .select("*, creator:profiles!created_by(id, full_name)")
        .eq("entry_date", initialDate)
        .order("row_number", { ascending: true }),
    [initialDate]
  );

  const { data } = useOfflineQuery<DailyCashierWithCreator[]>({
    key: `cashier-daily:${initialDate}`,
    queryFn,
    fallback: serverData,
    realtimeTable: "daily_cashier",
    realtimeFilter: `entry_date=eq.${initialDate}`,
  });

  return (
    <CashierDataTable
      data={data}
      initialDate={initialDate}
      onDateChange={(date) => router.push(`/cashier-daily?date=${date}`)}
    />
  );
}
