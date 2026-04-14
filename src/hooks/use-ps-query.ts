"use client";

// Thin wrapper around PowerSync's local SQLite. Handles the null-db case
// (provider still initializing, or init failed) by reporting isReady=false
// so callers can fall back to the legacy Supabase-backed React Query path.
//
// Why not @powersync/react's useQuery: it assumes a non-null PowerSyncContext
// and will throw when the provider is in fail-open mode. We need a helper
// that degrades gracefully during the migration window.

import { useEffect, useRef, useState } from "react";
import { usePowerSync } from "@powersync/react";

export interface PSQueryResult<T> {
  data: T[];
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
}

export function usePSQuery<T>(
  sql: string,
  params: readonly unknown[] = [],
  tables: readonly string[] = [],
): PSQueryResult<T> {
  const db = usePowerSync();
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const paramsKey = JSON.stringify(params);
  const tablesKey = tables.join(",");
  const paramsRef = useRef(params);
  paramsRef.current = params;

  useEffect(() => {
    if (!db) {
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    const run = async () => {
      try {
        const rows = await db.getAll<T>(sql, [...paramsRef.current] as unknown[]);
        if (!cancelled) {
          setData(rows);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setIsLoading(false);
        }
      }
    };

    run();

    const dispose = db.onChange(
      { onChange: () => void run() },
      { tables: [...tables] },
    );

    return () => {
      cancelled = true;
      dispose();
    };
  }, [db, sql, paramsKey, tablesKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    data,
    isLoading,
    isReady: db != null,
    error,
  };
}
