"use client";

// This file is no longer used — replaced by useOfflineQuery.
// Kept temporarily to avoid broken imports during migration.
// TODO: Remove after verifying no imports remain.

export function useHydratedData<T>(_key: string, serverData: T, _hasData: boolean): T {
  return serverData;
}
