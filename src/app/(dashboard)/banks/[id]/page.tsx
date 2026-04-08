import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { BankDetailClient } from "./client-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function BankDetailPage({ params }: PageProps) {
  const { id } = await params;
  const supabase = await createClient();

  let bank = null;
  let transactions: any[] = [];
  let editHistory: any[] = [];

  try {
    const { data } = await supabase.from("banks").select("*").eq("id", id).single();
    bank = data;

    const [txResult, histResult] = await Promise.all([
      supabase
        .from("bank_transactions")
        .select("*, creator:profiles!created_by(id, full_name)")
        .eq("bank_id", id)
        .order("entry_date", { ascending: true })
        .order("row_number", { ascending: true }),
      supabase
        .from("action_requests")
        .select("*, requester:profiles!requested_by(id, full_name), reviewer:profiles!reviewed_by(id, full_name)")
        .eq("entity", "bank")
        .eq("entity_id", id)
        .order("created_at", { ascending: false }),
    ]);
    transactions = txResult.data ?? [];
    editHistory = histResult.data ?? [];
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title={bank ? `كشف حساب: ${bank.name}` : "كشف حساب"} />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <BankDetailClient bankId={id} bank={bank} transactions={transactions} editHistory={editHistory} />
      </div>
    </div>
  );
}
