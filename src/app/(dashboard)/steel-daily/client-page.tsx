"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "../cement-daily/data-table";
import { InventoryTable } from "../cement-daily/inventory-table";

interface SteelDailyClientProps {
  initialDate: string;
}

export function SteelDailyClient({ initialDate }: SteelDailyClientProps) {
  const router = useRouter();

  function handleDateChange(date: string) {
    router.push(`/steel-daily?date=${date}`);
  }

  return (
    <>
      <DataTable initialDate={initialDate} onDateChange={handleDateChange} />
      <InventoryTable date={initialDate} category="steel" />
    </>
  );
}
