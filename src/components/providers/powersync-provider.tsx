"use client";

// Provides the PowerSync database via @powersync/react's PowerSyncContext.
//
// Fail-open design: the context wrapper is always present so children
// don't remount when PowerSync finishes initializing. Consumers must
// handle a null db (see use-ps-query.ts, use-cement-daily-*). If init
// fails entirely, db stays null and consumers fall back to the legacy
// React Query / Supabase path.

import { useEffect, useState } from "react";
import { PowerSyncContext } from "@powersync/react";
import type { PowerSyncDatabase } from "@powersync/web";
import type { AbstractPowerSyncDatabase } from "@powersync/common";
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

  // The context's declared type is non-null AbstractPowerSyncDatabase, but we
  // intentionally allow null here. usePowerSync() from @powersync/react reads
  // this context with React.useContext — our consumer hooks check the result
  // and fall back to the legacy path when it's null.
  return (
    <PowerSyncContext.Provider value={db as unknown as AbstractPowerSyncDatabase}>
      {children}
    </PowerSyncContext.Provider>
  );
}
