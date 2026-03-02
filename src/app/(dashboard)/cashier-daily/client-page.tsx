"use client";

import { useRouter } from "next/navigation";
import { CashierDataTable } from "./data-table";
import type { DailyCashierWithCreator } from "@/types/database";

interface CashierDailyClientProps {
  data: DailyCashierWithCreator[];
  initialDate: string;
}

export function CashierDailyClient({
  data,
  initialDate,
}: CashierDailyClientProps) {
  const router = useRouter();

  function handleDateChange(date: string) {
    router.push(`/cashier-daily?date=${date}`);
  }

  return (
    <CashierDataTable
      data={data}
      initialDate={initialDate}
      onDateChange={handleDateChange}
    />
  );
}
