import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Header } from "@/components/layout/header";
import { CorrectionsClient } from "./client-page";

export default async function CorrectionsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore.getAll().some((c) => c.name.startsWith("sb-"));

  let user = null;
  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    if (error && !hasAuthCookie) redirect("/login");
  } catch {
    if (!hasAuthCookie) redirect("/login");
  }

  if (!user) {
    if (!hasAuthCookie) redirect("/login");
    // Offline but authenticated — show empty corrections
    return (
      <div className="flex flex-col h-full">
        <Header title="طلبات التصحيح والإجراءات" />
        <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
          <CorrectionsClient requests={[]} actionRequests={[]} />
        </div>
      </div>
    );
  }

  let isAdmin = false;
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    isAdmin = profile?.role === "admin";
  } catch {
    // Offline — can't verify, allow access if they got this far
    isAdmin = true;
  }

  if (!isAdmin) redirect("/cement-daily");

  let corrections: any[] = [];
  let actionRequests: any[] = [];

  try {
    const [corrResult, actionResult] = await Promise.all([
      supabase
        .from("correction_requests")
        .select(`
          *,
          entry:daily_cement!entry_id(
            *,
            customer:customers!customer_id(id, name),
            product:products!product_id(id, name),
            creator:profiles!created_by(id, full_name)
          ),
          requester:profiles!requested_by(id, full_name),
          reviewer:profiles!reviewed_by(id, full_name)
        `)
        .order("created_at", { ascending: false }),
      supabase
        .from("action_requests")
        .select(`
          *,
          requester:profiles!requested_by(id, full_name),
          reviewer:profiles!reviewed_by(id, full_name)
        `)
        .order("created_at", { ascending: false }),
    ]);
    corrections = corrResult.data ?? [];
    actionRequests = actionResult.data ?? [];
  } catch {
    // Offline
  }

  return (
    <div className="flex flex-col h-full">
      <Header title="طلبات التصحيح والإجراءات" />
      <div className="flex-1 overflow-auto px-4 pb-6 md:px-6">
        <CorrectionsClient
          requests={corrections}
          actionRequests={actionRequests}
        />
      </div>
    </div>
  );
}
