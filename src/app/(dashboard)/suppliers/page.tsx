import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { SuppliersClient } from "./client-page";

export default async function SuppliersPage() {
  const supabase = await createClient();

  let suppliers: any[] = [];
  try {
    const { data } = await supabase
      .from("supplier_balances")
      .select("*")
      .eq("is_active", true)
      .order("name", { ascending: true });
    suppliers = data ?? [];
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="الموردين" />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <SuppliersClient suppliers={suppliers} />
      </div>
    </div>
  );
}
