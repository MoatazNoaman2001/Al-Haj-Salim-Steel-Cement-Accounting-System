import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { BanksClient } from "./client-page";

export default async function BanksPage() {
  const supabase = await createClient();

  const { data: banks } = await supabase
    .from("banks").select("*").eq("is_active", true).order("balance", { ascending: false });

  return (
    <div className="flex flex-col h-full">
      <Header title="حسابات البنوك" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <BanksClient banks={banks ?? []} />
      </div>
    </div>
  );
}
