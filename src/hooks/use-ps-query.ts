"use client";

// PowerSync has been removed from the project. This stub keeps the existing
// `if (ps.isReady) { ... } else { reactQueryFallback }` branches in every
// consumer hook compiling — `isReady` is permanently false, so the React
// Query / Supabase path is the only one that runs.

export interface PSQueryResult<T> {
  data: T[];
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
}

export function usePSQuery<T>(
  _sql: string,
  _params: readonly unknown[] = [],
  _tables: readonly string[] = [],
): PSQueryResult<T> {
  void _sql;
  void _params;
  void _tables;
  return { data: [] as T[], isLoading: false, isReady: false, error: null };
}
