"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import { cementDailyKeys } from "@/lib/react-query/keys";

export function useRealtimeCementRQ(date: string) {
  const queryClient = useQueryClient();
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("cement-daily-changes-rq")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_cement",
          filter: `entry_date=eq.${date}`,
        },
        () => {
          // Prefix-match so both cement and steel variants get invalidated.
          queryClient.invalidateQueries({
            queryKey: ["cement-daily", "entries", date],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, queryClient]);
}

export function useRealtimeInventoryRQ(date: string) {
  const queryClient = useQueryClient();
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("inventory-daily-changes-rq")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_inventory",
          filter: `entry_date=eq.${date}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["cement-daily", "inventory", date],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, queryClient]);
}

export function useRealtimeDepositsRQ(date: string) {
  const queryClient = useQueryClient();
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    const channel = supabase
      .channel("deposits-daily-changes-rq")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_deposits",
          filter: `entry_date=eq.${date}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: cementDailyKeys.deposits(date) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [date, queryClient]);
}
