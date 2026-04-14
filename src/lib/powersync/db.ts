"use client";

// Singleton PowerSyncDatabase instance.
//
// Initialized lazily on first access from a client component. Server-side
// access throws — PowerSync depends on IndexedDB + WASM and cannot run in
// Node/RSC. If connect() fails (e.g. PowerSync instance unreachable), the
// local SQLite DB still works and uploads will queue until reconnect.

import { PowerSyncDatabase } from "@powersync/web";
import { AppSchema } from "./schema";
import { SupabaseConnector } from "./connector";

let dbPromise: Promise<PowerSyncDatabase> | null = null;

export function getPowerSyncDB(): Promise<PowerSyncDatabase> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new Error("getPowerSyncDB() called on the server — PowerSync is client-only")
    );
  }

  if (!dbPromise) {
    dbPromise = (async () => {
      const db = new PowerSyncDatabase({
        schema: AppSchema,
        database: { dbFilename: "al-haj-salim.db" },
      });

      // init() opens the local SQLite file and applies the schema as views.
      await db.init();

      // connect() is async and non-throwing for network errors — it reports
      // status via db.currentStatus / db.registerListener(). We don't await
      // it strictly because the local DB is usable before the first pull.
      try {
        const connector = new SupabaseConnector();
        await db.connect(connector);
      } catch (err) {
        // Missing env var or constructor throw — log but don't block the app.
        // The DB still works locally; sync just won't happen.
        console.warn(
          "[PowerSync] connect() failed — running in local-only mode:",
          err
        );
      }

      return db;
    })();
  }

  return dbPromise;
}
