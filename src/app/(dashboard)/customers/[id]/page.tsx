import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CustomerDetailClient } from "./client-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  let customer = null;
  let transactions: any[] = [];
  let reservations: any[] = [];
  let banks: any[] = [];

  try {
    const { data } = await supabase
      .from("customers").select("*").eq("id", id).single();
    customer = data;

    const [txResult, resResult, bankResult] = await Promise.all([
      supabase
        .from("customer_transactions")
        .select("*, creator:profiles!created_by(id, full_name)")
        .eq("customer_id", id)
        .order("entry_date", { ascending: true })
        .order("row_number", { ascending: true }),
      supabase
        .from("customer_reservations")
        .select(
          `*,
           partner_customer:customers!partner_customer_id(id, name),
           product:products!product_id(id, name),
           creator:profiles!created_by(id, full_name)`,
        )
        .eq("customer_id", id)
        .order("entry_date", { ascending: true })
        .order("row_number", { ascending: true }),
      supabase
        .from("banks")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true }),
    ]);
    transactions = txResult.data ?? [];
    reservations = resResult.data ?? [];
    banks = bankResult.data ?? [];
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={customer ? `كشف حساب: ${customer.name}` : "كشف حساب"} />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <CustomerDetailClient
          customerId={id}
          customer={customer}
          transactions={transactions}
          reservations={reservations}
          banks={banks}
        />
      </div>
    </div>
  );
}
