"use client";

import { useEffect, useState } from "react";
import { UserContext } from "@/hooks/use-user";
import { QueryProvider } from "@/lib/react-query/provider";
import { Sidebar } from "./sidebar";
import { PageTransition } from "./page-transition";
import { OfflineIndicator } from "./offline-indicator";
import { InstallPwaBanner } from "./install-pwa-banner";
import { getLocal, setLocal } from "@/lib/offline-store";
import type { Profile } from "@/types/database";

interface AppShellProps {
  userId: string;
  profile: Profile;
  children: React.ReactNode;
}

const USER_CACHE_KEY = "auth-user";

export function AppShell({ userId: serverUserId, profile: serverProfile, children }: AppShellProps) {
  const isOffline = serverUserId === "offline";
  const [restored, setRestored] = useState(!isOffline);
  const [userId, setUserId] = useState(serverUserId);
  const [profile, setProfile] = useState(serverProfile);

  useEffect(() => {
    if (!isOffline) {
      // Online — cache user data for offline use
      setLocal(USER_CACHE_KEY, { userId: serverUserId, profile: serverProfile });
    } else {
      // Offline — restore from cache, block until done
      getLocal<{ userId: string; profile: Profile }>(USER_CACHE_KEY).then((cached) => {
        if (cached) {
          setUserId(cached.userId);
          setProfile(cached.profile);
        }
        setRestored(true);
      });
    }
  }, [isOffline, serverUserId, serverProfile]);

  // Block rendering until user data is restored from IndexedDB
  if (!restored) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        جاري تحميل البيانات...
      </div>
    );
  }

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
          <main className="flex-1 overflow-auto min-w-0">
            <PageTransition>{children}</PageTransition>
          </main>
          <OfflineIndicator />
          <InstallPwaBanner />
        </div>
      </QueryProvider>
    </UserContext.Provider>
  );
}
