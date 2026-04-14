"use client";

import { Info } from "lucide-react";

/**
 * Small banner shown at the top of a page when mock data is being
 * displayed (dev mode only). Makes it obvious at a glance that the
 * content is fake so nobody mistakes it for real accounting data.
 */
export function DevMockBanner({ label = "عرض بيانات تجريبية" }: { label?: string }) {
  if (process.env.NODE_ENV !== "development") return null;
  return (
    <div className="mb-3 flex items-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>{label} — للتطوير فقط</span>
    </div>
  );
}
