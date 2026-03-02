"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "./data-table";
import { BondsTable } from "./bonds-table";
import { CashBalanceSummary } from "./cash-balance-summary";
import type {
  DailyCementWithRelations,
  DailyBondWithRelations,
  DailyCashBalance,
  Customer,
  Product,
} from "@/types/database";

interface CementDailyClientProps {
  data: DailyCementWithRelations[];
  customers: Pick<Customer, "id" | "name">[];
  products: Pick<Product, "id" | "name">[];
  bonds: DailyBondWithRelations[];
  cashBalance: DailyCashBalance | null;
  initialDate: string;
}

export function CementDailyClient({
  data,
  customers,
  products,
  bonds,
  cashBalance,
  initialDate,
}: CementDailyClientProps) {
  const router = useRouter();

  function handleDateChange(date: string) {
    router.push(`/cement-daily?date=${date}`);
  }

  return (
    <>
      <DataTable
        data={data}
        customers={customers}
        products={products}
        initialDate={initialDate}
        onDateChange={handleDateChange}
      />

      <BondsTable data={bonds} customers={customers} date={initialDate} />

      <CashBalanceSummary
        entries={data}
        bonds={bonds}
        cashBalance={cashBalance}
      />
    </>
  );
}
