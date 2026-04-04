"use client";

import { UserContext } from "@/hooks/use-user";
import { QueryProvider } from "@/lib/react-query/provider";
import { Sidebar } from "./sidebar";
import { PageTransition } from "./page-transition";
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
      <QueryProvider>
        <div className="flex h-screen">
          <Sidebar />
          <main className="flex-1 overflow-auto">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </QueryProvider>
    </UserContext.Provider>
  );
}
