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

      // Fire-and-forget connect. The local DB is fully usable before the
      // first pull completes — awaiting here would delay setDb() and keep
      // the app on a loading state while the initial sync (potentially
      // thousands of rows) streams into IndexedDB.
      try {
        const connector = new SupabaseConnector();
        void db.connect(connector).catch((err) => {
          console.warn("[PowerSync] connect() failed — running in local-only mode:", err);
        });
      } catch (err) {
        // Missing env var or constructor throw — the DB still works locally.
        console.warn("[PowerSync] connector construction failed:", err);
      }

      return db;
    })();
  }

  return dbPromise;
}
