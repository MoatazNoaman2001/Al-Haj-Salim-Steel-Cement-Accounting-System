"use client";

import { UserContext } from "@/hooks/use-user";
import { Sidebar } from "./sidebar";
import type { Profile } from "@/types/database";

interface AppShellProps {
  userId: string;
  profile: Profile;
  children: React.ReactNode;
}

export function AppShell({ userId, profile, children }: AppShellProps) {
  return (
    <UserContext.Provider
      value={{
        userId,
        profile,
        isAdmin: profile.role === "admin",
      }}
    >
      <div className="flex h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </UserContext.Provider>
  );
}
