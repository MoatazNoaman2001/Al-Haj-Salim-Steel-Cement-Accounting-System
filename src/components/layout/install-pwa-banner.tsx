"use client";

import { useEffect, useState } from "react";
import { Download, X, Share, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Browser hook for the install prompt event. Chrome/Edge fire this when the
// PWA install criteria are met; iOS Safari does not fire it at all (Apple
// requires manual "Add to Home Screen" via the Share menu).
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const DISMISS_KEY = "pwa-install-dismissed-at";
const DISMISS_DAYS = 7;

function isIOS(): boolean {
  if (typeof window === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(window.navigator.userAgent)
    && !("MSStream" in window);
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  // Modern browsers
  if (window.matchMedia?.("(display-mode: standalone)").matches) return true;
  // iOS Safari legacy
  if ("standalone" in window.navigator) {
    return Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);
  }
  return false;
}

function recentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  const ts = window.localStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  const then = Number(ts);
  if (Number.isNaN(then)) return false;
  const ageDays = (Date.now() - then) / (1000 * 60 * 60 * 24);
  return ageDays < DISMISS_DAYS;
}

export function InstallPwaBanner() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIosHint, setShowIosHint] = useState(false);
  const [dismissed, setDismissed] = useState(true); // start hidden until checks run

  useEffect(() => {
    if (isStandalone()) return; // already installed
    if (recentlyDismissed()) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvent(e as BeforeInstallPromptEvent);
      setDismissed(false);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    if (isIOS()) {
      setShowIosHint(true);
      setDismissed(false);
    }

    const onInstalled = () => {
      setInstallEvent(null);
      setShowIosHint(false);
      setDismissed(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setDismissed(true);
  }

  async function handleInstall() {
    if (!installEvent) return;
    await installEvent.prompt();
    const result = await installEvent.userChoice;
    if (result.outcome === "accepted") {
      setInstallEvent(null);
    } else {
      dismiss();
    }
  }

  if (dismissed) return null;
  if (!installEvent && !showIosHint) return null;

  return (
    <div
      className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-xl border bg-background shadow-lg"
      role="region"
      aria-label="تثبيت التطبيق"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Download className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold">تثبيت التطبيق على جهازك</div>
          {installEvent ? (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              يفتح أسرع، يعمل بدون إنترنت، ويظهر كأي تطبيق على الشاشة الرئيسية.
            </p>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              للتثبيت على iPhone: اضغط على زر <Share className="inline h-3 w-3 mx-0.5" /> المشاركة في الأسفل
              ثم اختر <span className="inline-flex items-center gap-0.5 font-medium">
                <Plus className="inline h-3 w-3" />
                إضافة إلى الشاشة الرئيسية
              </span>.
            </p>
          )}
          <div className="mt-3 flex gap-2">
            {installEvent && (
              <Button size="sm" className="gap-2" onClick={handleInstall}>
                <Download className="h-4 w-4" />
                تثبيت الآن
              </Button>
            )}
            <Button size="sm" variant="outline" onClick={dismiss}>
              {installEvent ? "ربما لاحقاً" : "حسناً"}
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 text-muted-foreground"
          onClick={dismiss}
          aria-label="إغلاق"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
