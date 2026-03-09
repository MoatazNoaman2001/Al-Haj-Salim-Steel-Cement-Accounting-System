import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { BankDetailClient } from "./client-page";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BankDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: bank } = await supabase.from("banks").select("*").eq("id", id).single();
  if (!bank) notFound();

  const { data: transactions } = await supabase
    .from("bank_transactions")
    .select(`*, creator:profiles!created_by(id, full_name)`)
    .eq("bank_id", id)
    .order("entry_date", { ascending: true })
    .order("row_number", { ascending: true });

  return (
    <div className="flex flex-col h-full">
      <Header title={`كشف حساب: ${bank.name}`} />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <BankDetailClient bank={bank} transactions={transactions ?? []} />
      </div>
    </div>
  );
}
