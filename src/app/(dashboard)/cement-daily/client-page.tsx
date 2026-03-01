"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DataTable } from "./data-table";
import type { DailyCementWithRelations, Customer, Product } from "@/types/database";

interface CementDailyClientProps {
  data: DailyCementWithRelations[];
  customers: Pick<Customer, "id" | "name">[];
  products: Pick<Product, "id" | "name">[];
  initialDate: string;
}

export function CementDailyClient({
  data,
  customers,
  products,
  initialDate,
}: CementDailyClientProps) {
  const router = useRouter();

  function handleDateChange(date: string) {
    router.push(`/cement-daily?date=${date}`);
  }

  return (
    <DataTable
      data={data}
      customers={customers}
      products={products}
      initialDate={initialDate}
      onDateChange={handleDateChange}
    />
  );
}
