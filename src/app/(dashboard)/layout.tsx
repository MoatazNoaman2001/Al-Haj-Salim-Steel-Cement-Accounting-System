import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import type { Profile } from "@/types/database";

const OFFLINE_PROFILE: Profile = {
  id: "offline",
  full_name: "غير متصل",
  role: "cashier",
  is_active: true,
  created_at: "",
  updated_at: "",
};

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const hasAuthCookie = cookieStore.getAll().some((c) => c.name.startsWith("sb-"));

  let user = null;
  let authError = false;

  try {
    const { data, error } = await supabase.auth.getUser();
    user = data.user;
    if (error) authError = true;
  } catch {
    authError = true;
  }

  // No user and no auth cookie → genuinely not logged in
  if (!user && !hasAuthCookie) {
    redirect("/login");
  }

  // No user but has auth cookie → offline, render with fallback profile
  if (!user && hasAuthCookie) {
    return (
      <AppShell userId="offline" profile={OFFLINE_PROFILE}>
        {children}
      </AppShell>
    );
  }

  // User exists — try to get profile
  let profile: Profile | null = null;

  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user!.id)
      .single();
    if (!error) profile = data as Profile | null;
  } catch {
    // Offline
  }

  // Profile fetch failed but user authenticated → use fallback
  if (!profile) {
    if (authError || hasAuthCookie) {
      profile = { ...OFFLINE_PROFILE, id: user!.id, full_name: user!.email ?? "مستخدم" };
    } else {
      redirect("/login");
    }
  }

  return (
    <AppShell userId={user!.id} profile={profile}>
      {children}
    </AppShell>
  );
}
