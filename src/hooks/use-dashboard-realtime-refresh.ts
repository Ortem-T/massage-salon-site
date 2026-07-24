"use client";

import { useEffect, useMemo, useRef } from "react";

import { createSupabaseRealtimeBrowserClient } from "@/lib/supabase/browser";

type DashboardRealtimeTable = "bookings" | "schedule_blocks" | "app_settings";
type DashboardRealtimeEvent = "INSERT" | "UPDATE" | "DELETE";

type UseDashboardRealtimeRefreshOptions = {
  channelName: string;
  debounceMs?: number;
  enabled?: boolean;
  onRefresh: () => void;
  tables: readonly DashboardRealtimeTable[];
};

const realtimeEvents: readonly DashboardRealtimeEvent[] = ["INSERT", "UPDATE", "DELETE"];

export function useDashboardRealtimeRefresh({
  channelName,
  debounceMs = 350,
  enabled = true,
  onRefresh,
  tables
}: UseDashboardRealtimeRefreshOptions) {
  const tablesKey = useMemo(() => [...tables].sort().join(","), [tables]);
  const refreshTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const realtimeTables = tablesKey
      .split(",")
      .filter((table): table is DashboardRealtimeTable =>
        table === "bookings" || table === "schedule_blocks" || table === "app_settings"
      );

    if (!enabled || realtimeTables.length === 0) {
      return;
    }

    const supabase = createSupabaseRealtimeBrowserClient();
    const channel = supabase.channel(`${channelName}:${tablesKey}`);

    const scheduleRefresh = () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null;
        onRefresh();
      }, debounceMs);
    };

    realtimeTables.forEach((table) => {
      realtimeEvents.forEach((event) => {
        channel.on("postgres_changes", { event, schema: "public", table }, scheduleRefresh);
      });
    });

    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        scheduleRefresh();
        return;
      }

      if (process.env.NODE_ENV !== "production" && (status === "CHANNEL_ERROR" || status === "TIMED_OUT")) {
        console.warn(`[dashboard realtime] ${channelName} subscription status: ${status}`);
      }
    });

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }

      void supabase.removeChannel(channel);
    };
  }, [channelName, debounceMs, enabled, onRefresh, tablesKey]);
}
