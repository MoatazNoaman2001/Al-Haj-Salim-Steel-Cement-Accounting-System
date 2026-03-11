import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CorrectionsClient } from "./client-page";

export default async function CorrectionsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/cement-daily");

  const [{ data: corrections }, { data: actionRequests }] = await Promise.all([
    supabase
      .from("correction_requests")
      .select(
        `
        *,
        entry:daily_cement!entry_id(
          *,
          customer:customers!customer_id(id, name),
          product:products!product_id(id, name),
          creator:profiles!created_by(id, full_name)
        ),
        requester:profiles!requested_by(id, full_name),
        reviewer:profiles!reviewed_by(id, full_name)
      `
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("action_requests")
      .select(
        `
        *,
        requester:profiles!requested_by(id, full_name),
        reviewer:profiles!reviewed_by(id, full_name)
      `
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="flex flex-col h-full">
      <Header title="طلبات التصحيح والإجراءات" />
      <div className="flex-1 overflow-auto px-6 pb-6">
        <CorrectionsClient
          requests={corrections ?? []}
          actionRequests={actionRequests ?? []}
        />
      </div>
    </div>
  );
}
