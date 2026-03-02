"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "./data-table";
import { DepositsTable } from "./deposits-table";
import { InventoryTable } from "./inventory-table";
import { CashBalanceSummary } from "./cash-balance-summary";
import type {
  DailyCementWithRelations,
  DailyInventoryWithProduct,
  DailyDepositWithCreator,
  DailyCashBalance,
  Customer,
  Product,
} from "@/types/database";

interface CementDailyClientProps {
  data: DailyCementWithRelations[];
  customers: Pick<Customer, "id" | "name">[];
  products: Pick<Product, "id" | "name">[];
  inventory: DailyInventoryWithProduct[];
  deposits: DailyDepositWithCreator[];
  cashBalance: DailyCashBalance | null;
  initialDate: string;
}

export function CementDailyClient({
  data,
  customers,
  products,
  inventory,
  deposits,
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

      <DepositsTable data={deposits} date={initialDate} />

      <InventoryTable
        inventory={inventory}
        products={products}
        entries={data}
        date={initialDate}
      />

      <CashBalanceSummary
        entries={data}
        deposits={deposits}
        cashBalance={cashBalance}
      />
    </>
  );
}
