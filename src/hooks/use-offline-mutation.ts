"use client";

import { useCallback, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { queueMutation } from "@/lib/offline-queue";
import type { SupabaseClient } from "@supabase/supabase-js";

interface UseOfflineMutationOptions {
  table: string;
  type: "insert" | "update" | "delete";
  match?: Record<string, unknown>;
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useOfflineMutation({ table, type, match, onSuccess, onError }: UseOfflineMutationOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const supabaseRef = useRef(createClient());

  const mutate = useCallback(async (data: Record<string, unknown>) => {
    setIsLoading(true);
    try {
      if (navigator.onLine) {
        const supabase = supabaseRef.current;
        let error: unknown = null;

        if (type === "insert") {
          const res = await supabase.from(table).insert(data);
          error = res.error;
        } else if (type === "update" && match) {
          let q = supabase.from(table).update(data) as any;
          for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
          const res = await q;
          error = res.error;
        } else if (type === "delete" && match) {
          let q = supabase.from(table).delete() as any;
          for (const [k, v] of Object.entries(match)) q = q.eq(k, v);
          const res = await q;
          error = res.error;
        }

        if (error) {
          onError?.(error);
        } else {
          onSuccess?.();
        }
      } else {
        await queueMutation({ table, type, data, match });
        onSuccess?.();
      }
    } catch (e) {
      // Network failed mid-request — queue it
      await queueMutation({ table, type, data, match });
      onSuccess?.();
    } finally {
      setIsLoading(false);
    }
  }, [table, type, match, onSuccess, onError]);

  return { mutate, isLoading };
}
