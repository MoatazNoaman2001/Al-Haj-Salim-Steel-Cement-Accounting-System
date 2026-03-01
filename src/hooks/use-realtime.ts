"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function useRealtimeCement(date: string) {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("cement-daily-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_cement",
          filter: `entry_date=eq.${date}`,
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, router, supabase]);
}

export function useRealtimeCorrections() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel("correction-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "correction_requests",
        },
        () => {
          router.refresh();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router, supabase]);
}
