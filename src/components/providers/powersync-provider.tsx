"use client";

// Provides the PowerSync database via @powersync/react's PowerSyncContext.
// Children can then use usePowerSync() and useQuery() from @powersync/react.
//
// Fail-open design: if PowerSync fails to initialize (missing env var,
// unreachable instance, WASM load failure), children still render without
// the context. During the migration, pages fall back to the legacy
// useOfflineQuery path in that case.

import { useEffect, useState } from "react";
import { PowerSyncContext } from "@powersync/react";
import type { PowerSyncDatabase } from "@powersync/web";
import { getPowerSyncDB } from "@/lib/powersync/db";

export function PowerSyncProvider({ children }: { children: React.ReactNode }) {
  const [db, setDb] = useState<PowerSyncDatabase | null>(null);

  useEffect(() => {
    let mounted = true;
    getPowerSyncDB()
      .then((instance) => {
        if (mounted) setDb(instance);
      })
      .catch((err) => {
        console.warn("[PowerSync] init failed — falling back to legacy stack:", err);
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!db) {
    // Render children without PowerSyncContext. Pages that haven't been
    // migrated yet use useOfflineQuery directly and don't need this context.
    // Pages migrated in Phase 2+ should handle a missing context gracefully.
    return <>{children}</>;
  }

  return (
    <PowerSyncContext.Provider value={db}>{children}</PowerSyncContext.Provider>
  );
}
