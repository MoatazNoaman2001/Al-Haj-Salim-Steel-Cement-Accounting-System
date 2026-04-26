"use client";

// Bridge between PowerSync's local SQLite database and Supabase.
//
// - fetchCredentials(): tells PowerSync which backend endpoint to hit and what
//   JWT to use (we reuse the Supabase session access_token).
// - uploadData(): replays local CRUD ops against Supabase when the client is
//   online. Generated columns are stripped before push so Postgres doesn't
//   reject the write.

import {
  AbstractPowerSyncDatabase,
  BaseObserver,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
  type PowerSyncCredentials,
} from "@powersync/web";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

// Postgres error codes that should NOT be retried — throwing them back at
// PowerSync would block the upload queue forever. We log + discard instead.
const FATAL_RESPONSE_CODES = [
  /^22...$/, // Data exception (type mismatch, range error, etc.)
  /^23...$/, // Integrity constraint (NOT NULL, FK, UNIQUE)
  /^42501$/, // Insufficient privilege (RLS denied)
];

// Columns that must be stripped from PUT/PATCH payloads before pushing to
// Postgres. Two reasons a column ends up here — both verified against the
// migration SQL in supabase/migration*.sql:
//
//   1. GENERATED ALWAYS AS (...) STORED — Postgres raises error 428C9
//      ("cannot insert a non-DEFAULT value into column") if you try to write
//      these. The server recomputes them from their source columns on every
//      insert/update and sends the true value back via pull replication.
//
//   2. SERIAL — Postgres accepts writes, but the per-table sequence is not
//      advanced when a client supplies its own value. Two offline clients
//      inserting into the same table would compute colliding row_numbers
//      (e.g. both pick MAX+1 locally) and one would fail a UNIQUE check
//      on reconnect. Stripping lets the server's sequence assign cleanly.
//
// If you add a new GENERATED or SERIAL column in a Supabase migration,
// mirror it here or the next upload will fail.
const SERVER_MANAGED_COLUMNS: Record<string, readonly string[]> = {
  daily_cement: [
    // GENERATED ALWAYS AS ... STORED
    "total_amount", // = quantity * price_per_ton
    "remaining_balance", // = total_amount - amount_paid
    "profit_per_ton", // = price_per_ton - cost_per_ton (nullable)
    "total_profit", // = profit_per_ton * quantity (nullable)
    // SERIAL
    "row_number",
  ],
  // SERIAL only
  daily_cashier: ["row_number"],
  daily_deposits: ["row_number"],
  bank_transactions: ["row_number"],
  customer_transactions: ["row_number"],
  customer_reservations: ["row_number"],
  supplier_transactions: ["row_number"],
};

function stripServerManaged(
  table: string,
  data: Record<string, unknown>
): Record<string, unknown> {
  const managed = SERVER_MANAGED_COLUMNS[table];
  if (!managed || managed.length === 0) return data;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!managed.includes(k)) out[k] = v;
  }
  return out;
}

type ConnectorListener = {
  initialized: () => void;
};

export class SupabaseConnector
  extends BaseObserver<ConnectorListener>
  implements PowerSyncBackendConnector
{
  readonly client: SupabaseClient;
  private readonly powersyncUrl: string;

  constructor() {
    super();
    this.client = createClient() as unknown as SupabaseClient;

    const url = process.env.NEXT_PUBLIC_POWERSYNC_URL;
    if (!url) {
      throw new Error(
        "NEXT_PUBLIC_POWERSYNC_URL is not set. Add it to .env after completing Phase 0 (PowerSync instance setup)."
      );
    }
    this.powersyncUrl = url;
  }

  async fetchCredentials(): Promise<PowerSyncCredentials> {
    const { data, error } = await this.client.auth.getSession();
    if (error || !data.session) {
      throw new Error(
        `PowerSync: could not fetch Supabase session — ${error?.message ?? "no active session"}`
      );
    }
    return {
      endpoint: this.powersyncUrl,
      token: data.session.access_token,
    };
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();
    if (!transaction) return;

    let lastOp: CrudEntry | null = null;
    try {
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);

        let result: { error: unknown } | undefined;
        switch (op.op) {
          case UpdateType.PUT: {
            const record = stripServerManaged(op.table, {
              ...(op.opData ?? {}),
              id: op.id,
            });
            result = await table.upsert(record);
            break;
          }
          case UpdateType.PATCH: {
            const patch = stripServerManaged(op.table, op.opData ?? {});
            result = await table.update(patch).eq("id", op.id);
            break;
          }
          case UpdateType.DELETE: {
            result = await table.delete().eq("id", op.id);
            break;
          }
        }

        if (result?.error) {
          const err = result.error as { code?: string; message?: string };
          throw Object.assign(new Error(), err, {
            message: `PowerSync upload failed (${op.table} ${op.op}): ${err.message ?? "unknown"}`,
          });
        }
      }

      await transaction.complete();
    } catch (ex) {
      const code = (ex as { code?: string }).code;
      if (code && FATAL_RESPONSE_CODES.some((re) => re.test(code))) {
        // Non-recoverable — discard to unblock the queue. This is a last resort;
        // if protecting against data loss matters, persist `lastOp` to an error
        // log before completing.
        console.error("PowerSync: discarding fatal upload op", {
          op: lastOp,
          error: ex,
        });
        await transaction.complete();
        return;
      }
      // Retryable (network, 5xx, etc.) — rethrow so PowerSync keeps the txn queued.
      throw ex;
    }
  }
}
