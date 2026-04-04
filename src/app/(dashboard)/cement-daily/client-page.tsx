"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "./data-table";
import { DepositsTable } from "./deposits-table";
import { InventoryTable } from "./inventory-table";
import { CashBalanceSummary } from "./cash-balance-summary";

interface CementDailyClientProps {
  initialDate: string;
}

export function CementDailyClient({ initialDate }: CementDailyClientProps) {
  const router = useRouter();

  function handleDateChange(date: string) {
    router.push(`/cement-daily?date=${date}`);
  }

  return (
    <>
      <DataTable
        initialDate={initialDate}
        onDateChange={handleDateChange}
      />

      <DepositsTable date={initialDate} />

      <InventoryTable date={initialDate} />

      <CashBalanceSummary date={initialDate} />
    </>
  );
}
