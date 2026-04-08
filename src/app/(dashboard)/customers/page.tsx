import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CustomersClient } from "./client-page";

export default async function CustomersPage() {
  const supabase = await createClient();

  let customers: any[] = [];
  try {
    const { data } = await supabase
      .from("customer_balances")
      .select("*")
      .order("name", { ascending: true });
    customers = data ?? [];
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="العملاء" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <CustomersClient customers={customers} />
      </div>
    </div>
  );
}
