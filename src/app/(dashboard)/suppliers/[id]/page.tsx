import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { SupplierDetailClient } from "./client-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function SupplierDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  let supplier = null;
  let transactions: any[] = [];
  let banks: any[] = [];

  try {
    const { data } = await supabase
      .from("suppliers").select("*").eq("id", id).single();
    supplier = data;

    const [txResult, bankResult] = await Promise.all([
      supabase
        .from("supplier_transactions")
        .select("*, creator:profiles!created_by(id, full_name)")
        .eq("supplier_id", id)
        .order("entry_date", { ascending: true })
        .order("row_number", { ascending: true }),
      supabase
        .from("banks")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
    ]);
    transactions = txResult.data ?? [];
    banks = bankResult.data ?? [];
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={supplier ? `كشف حساب المورد: ${supplier.name}` : "كشف حساب مورد"} />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <SupplierDetailClient
          supplierId={id}
          supplier={supplier}
          transactions={transactions}
          banks={banks}
        />
      </div>
    </div>
  );
}
