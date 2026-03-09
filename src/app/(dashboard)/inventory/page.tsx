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

  const { data: products } = await supabase
    .from("products").select("id, name, category").eq("category", category).eq("is_active", true).order("name");

  const { data: inventory } = await supabase
    .from("daily_inventory").select(`*, product:products!product_id(id, name)`).eq("entry_date", date);

  const { data: sales } = await supabase
    .from("daily_cement").select("product_id, quantity, is_corrected").eq("entry_date", date).eq("is_corrected", false);

  const productIds = new Set((products ?? []).map((p) => p.id));
  const filteredSales = (sales ?? []).filter((s) => productIds.has(s.product_id));

  return (
    <div className="flex flex-col h-full">
      <Header title="الجرد" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <InventoryClient products={products ?? []} inventory={inventory ?? []} sales={filteredSales} initialDate={date} initialCategory={category} />
      </div>
    </div>
  );
}
