"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { syncOfflineQueue, getQueue } from "@/lib/offline-queue";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);

  const refreshPendingCount = useCallback(async () => {
    const queue = await getQueue();
    setPendingCount(queue.length);
  }, []);

  const sync = useCallback(async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      const result = await syncOfflineQueue();
      if (result.success > 0) {
        toast.success(`تم مزامنة ${result.success} عملية بنجاح`);
      }
      if (result.failed > 0) {
        toast.error(`فشل مزامنة ${result.failed} عملية — ستتم إعادة المحاولة`);
      }
      await refreshPendingCount();
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshPendingCount]);

  useEffect(() => {
    // Set initial state
    setIsOnline(navigator.onLine);
    refreshPendingCount();

    function handleOnline() {
      setIsOnline(true);
      toast.success("تم استعادة الاتصال");
      // Auto-sync when back online
      sync();
    }

    function handleOffline() {
      setIsOnline(false);
      toast.warning("أنت غير متصل بالإنترنت — التغييرات ستُحفظ محلياً");
    }

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [refreshPendingCount, sync]);

  return { isOnline, pendingCount, isSyncing, sync, refreshPendingCount };
}
