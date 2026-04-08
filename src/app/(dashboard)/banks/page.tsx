import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { BanksClient } from "./client-page";

export default async function BanksPage() {
  const supabase = await createClient();

  let banksWithTotals: any[] = [];

  try {
    const { data: banks } = await supabase
      .from("banks").select("*").eq("is_active", true).order("created_at", { ascending: true });

    const { data: transactions } = await supabase
      .from("bank_transactions")
      .select("bank_id, debit, credit")
      .eq("is_corrected", false);

    const totalsMap: Record<string, { totalDebit: number; totalCredit: number }> = {};
    (transactions ?? []).forEach((tx) => {
      if (!totalsMap[tx.bank_id]) {
        totalsMap[tx.bank_id] = { totalDebit: 0, totalCredit: 0 };
      }
      totalsMap[tx.bank_id].totalDebit += tx.debit;
      totalsMap[tx.bank_id].totalCredit += tx.credit;
    });

    banksWithTotals = (banks ?? []).map((bank) => {
      const t = totalsMap[bank.id] ?? { totalDebit: 0, totalCredit: 0 };
      return {
        ...bank,
        totalDebit: t.totalDebit,
        totalCredit: t.totalCredit,
        currentBalance: bank.balance + t.totalCredit - t.totalDebit,
      };
    });
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="حسابات البنوك" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <BanksClient banks={banksWithTotals} />
      </div>
    </div>
  );
}
