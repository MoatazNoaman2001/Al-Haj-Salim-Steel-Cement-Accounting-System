"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getLocal, setLocal } from "@/lib/offline-store";
import type { SupabaseClient } from "@supabase/supabase-js";

interface UseOfflineQueryOptions<T> {
  key: string;
  queryFn: (supabase: SupabaseClient) => PromiseLike<{ data: T | null; error: unknown }>;
  fallback: T;
  realtimeTable?: string;
  realtimeFilter?: string;
}

export function useOfflineQuery<T>({ key, queryFn, fallback, realtimeTable, realtimeFilter }: UseOfflineQueryOptions<T>) {
  const [data, setData] = useState<T>(fallback);
  const [isLoading, setIsLoading] = useState(true);
  const supabaseRef = useRef(createClient());
  const mountedRef = useRef(true);
  const queryFnRef = useRef(queryFn);
  queryFnRef.current = queryFn;

  const fetchRemote = useCallback(async () => {
    try {
      const { data: remote, error } = await queryFnRef.current(supabaseRef.current);
      if (!error && remote != null && mountedRef.current) {
        setData(remote);
        await setLocal(key, remote);
      }
    } catch {
      // Offline — ignore
    }
  }, [key]);

  // 1. Load from local DB immediately, then fetch remote
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    (async () => {
      // Read local first
      const local = await getLocal<T>(key);
      if (!cancelled && local != null) {
        setData(local);
      }
      setIsLoading(false);

      // Then try remote
      if (navigator.onLine) {
        await fetchRemote();
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
    };
  }, [key, fetchRemote]);

  // 2. Realtime subscription — refetch on changes
  useEffect(() => {
    if (!realtimeTable) return;

    const supabase = supabaseRef.current;
    const channelName = realtimeFilter ? `${realtimeTable}-${realtimeFilter}` : realtimeTable;

    const opts: Parameters<ReturnType<typeof supabase.channel>["on"]>[1] = {
      event: "*",
      schema: "public",
      table: realtimeTable,
    };
    if (realtimeFilter) {
      (opts as any).filter = realtimeFilter;
    }

    const channel = supabase
      .channel(channelName)
      .on("postgres_changes", opts, () => {
        fetchRemote();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [realtimeTable, realtimeFilter, fetchRemote]);

  // 3. Re-sync when coming back online
  useEffect(() => {
    function handleOnline() {
      fetchRemote();
    }
    window.addEventListener("online", handleOnline);
    return () => window.removeEventListener("online", handleOnline);
  }, [fetchRemote]);

  return { data, isLoading, refetch: fetchRemote };
}
