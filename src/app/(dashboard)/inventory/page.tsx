import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { InventoryClient } from "./client-page";

interface PageProps {
  searchParams: Promise<{ date?: string; category?: string }>;
}

export default async function InventoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const date = params.date || todayISO();
  const category = params.category || "cement";
  const supabase = await createClient();

  let products: any[] = [];
  let inventory: any[] = [];
  let filteredSales: any[] = [];

  try {
    const { data: productsData } = await supabase
      .from("products").select("id, name, category").eq("category", category).eq("is_active", true).order("name");

    const { data: inventoryData } = await supabase
      .from("daily_inventory").select(`*, product:products!product_id(id, name)`).eq("entry_date", date);

    const { data: salesData } = await supabase
      .from("daily_cement").select("product_id, quantity, is_corrected, customer:customers!customer_id(id, name)").eq("entry_date", date).eq("is_corrected", false);

    products = productsData ?? [];
    inventory = inventoryData ?? [];

    const productIds = new Set((productsData ?? []).map((p) => p.id));
    filteredSales = (salesData ?? [])
      .filter((s) => productIds.has(s.product_id))
      .map((s) => ({
        ...s,
        customer: Array.isArray(s.customer) ? s.customer[0] ?? null : s.customer,
      }));
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="الجرد" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <InventoryClient products={products} inventory={inventory} sales={filteredSales} initialDate={date} initialCategory={category} />
      </div>
    </div>
  );
}
