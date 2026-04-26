import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { ReservationsIndexClient } from "./client-page";

export default async function ReservationsIndexPage() {
  const supabase = await createClient();

  let balances: any[] = [];
  try {
    const { data } = await supabase
      .from("customer_reservation_balances")
      .select("*")
      .order("customer_name", { ascending: true });
    balances = data ?? [];
  } catch {
    // Offline / view missing — client-side hooks will retry.
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="الحجوزات" />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <ReservationsIndexClient balances={balances} />
      </div>
    </div>
  );
}
