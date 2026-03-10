import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CustomerDetailClient } from "./client-page";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: customer } = await supabase
    .from("customers").select("*").eq("id", id).single();

  if (!customer) notFound();

  const [{ data: transactions }, { data: banks }] = await Promise.all([
    supabase
      .from("customer_transactions")
      .select(`*, creator:profiles!created_by(id, full_name)`)
      .eq("customer_id", id)
      .order("entry_date", { ascending: true })
      .order("row_number", { ascending: true }),
    supabase
      .from("banks")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: true }),
  ]);

  return (
    <div className="flex flex-col h-full">
      <Header title={`كشف حساب: ${customer.name}`} />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <CustomerDetailClient
          customer={customer}
          transactions={transactions ?? []}
          banks={banks ?? []}
        />
      </div>
    </div>
  );
}
