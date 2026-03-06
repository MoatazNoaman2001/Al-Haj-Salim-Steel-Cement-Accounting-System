import { createClient } from "@/lib/supabase/server";
import { todayISO } from "@/lib/utils";
import { Header } from "@/components/layout/header";
import { SteelDailyClient } from "./client-page";

interface PageProps {
  searchParams: Promise<{ date?: string }>;
}

export default async function SteelDailyPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const date = params.date || todayISO();
  const supabase = await createClient();

  // Fetch steel products first to filter entries
  const productsResult = await supabase
    .from("products")
    .select("id, name")
    .eq("category", "steel")
    .eq("is_active", true)
    .order("name");

  const steelProductIds = (productsResult.data ?? []).map((p) => p.id);

  const [entriesResult, customersResult, inventoryResult] = await Promise.all([
    steelProductIds.length > 0
      ? supabase
          .from("daily_cement")
          .select(
            `
            *,
            customer:customers!customer_id(id, name),
            product:products!product_id(id, name),
            creator:profiles!created_by(id, full_name)
          `
          )
          .eq("entry_date", date)
          .in("product_id", steelProductIds)
          .order("row_number", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from("customers")
      .select("id, name")
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("daily_inventory")
      .select(
        `
        *,
        product:products!product_id(id, name)
      `
      )
      .eq("entry_date", date)
      .in(
        "product_id",
        steelProductIds.length > 0 ? steelProductIds : ["00000000-0000-0000-0000-000000000000"]
      ),
  ]);

  return (
    <div className="flex flex-col h-full">
      <Header title="يومية الحديد" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <SteelDailyClient
          data={entriesResult.data ?? []}
          customers={customersResult.data ?? []}
          products={productsResult.data ?? []}
          inventory={inventoryResult.data ?? []}
          initialDate={date}
        />
      </div>
    </div>
  );
}
