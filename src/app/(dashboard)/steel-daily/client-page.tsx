"use client";

import { useRouter } from "next/navigation";
import { DataTable } from "../cement-daily/data-table";
import { InventoryTable } from "../cement-daily/inventory-table";
import type {
  DailyCementWithRelations,
  DailyInventoryWithProduct,
  Customer,
  Product,
} from "@/types/database";

interface SteelDailyClientProps {
  data: DailyCementWithRelations[];
  customers: Pick<Customer, "id" | "name">[];
  products: Pick<Product, "id" | "name">[];
  inventory: DailyInventoryWithProduct[];
  initialDate: string;
}

export function SteelDailyClient({
  data,
  customers,
  products,
  inventory,
  initialDate,
}: SteelDailyClientProps) {
  const router = useRouter();

  function handleDateChange(date: string) {
    router.push(`/steel-daily?date=${date}`);
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

      <InventoryTable
        inventory={inventory}
        products={products}
        entries={data}
        date={initialDate}
      />
    </>
  );
}
