"use client";

import { Wifi, WifiOff, RefreshCw, CloudUpload } from "lucide-react";
import { useOnlineStatus } from "@/hooks/use-online-status";
import { Button } from "@/components/ui/button";

export function OfflineIndicator() {
  const { isOnline, pendingCount, isSyncing, sync } = useOnlineStatus();

  // Online with nothing pending — hide completely
  if (isOnline && pendingCount === 0) return null;

  return (
    <div className="fixed bottom-4 start-4 z-50 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 shadow-lg text-sm">
      {!isOnline ? (
        <>
          <WifiOff className="h-4 w-4 text-destructive" />
          <span className="text-destructive font-medium">غير متصل</span>
        </>
      ) : (
        <>
          <Wifi className="h-4 w-4 text-green-600" />
          <span className="text-green-600 font-medium">متصل</span>
        </>
      )}

      {pendingCount > 0 && (
        <>
          <span className="text-muted-foreground">|</span>
          <CloudUpload className="h-4 w-4 text-amber-500" />
          <span className="text-amber-600">{pendingCount} معلّق</span>
          {isOnline && (
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={sync} disabled={isSyncing}>
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            </Button>
          )}
        </>
      )}
    </div>
  );
}
