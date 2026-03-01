"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  FileText,
  ClipboardCheck,
  Calculator,
  Package,
  Landmark,
  Users,
  BarChart3,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME, NAV_ITEMS, ROLE_LABELS } from "@/lib/constants";
import { useUser } from "@/hooks/use-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const iconMap = {
  FileText,
  ClipboardCheck,
  Calculator,
  Package,
  Landmark,
  Users,
  BarChart3,
} as const;

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isAdmin } = useUser();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-64 flex-col border-s bg-sidebar text-sidebar-foreground">
      <div className="p-4">
        <h1 className="text-lg font-bold">{APP_NAME}</h1>
        <p className="text-xs text-muted-foreground">نظام الحسابات</p>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = iconMap[item.icon];
            const isActive = pathname.startsWith(item.href) && item.href !== "#";

            return (
              <Link
                key={item.label}
                href={item.active ? item.href : "#"}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : item.active
                      ? "hover:bg-sidebar-accent/50"
                      : "text-muted-foreground cursor-not-allowed opacity-50"
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
                {!item.active && (
                  <Badge variant="outline" className="ms-auto text-[10px] px-1.5">
                    قريباً
                  </Badge>
                )}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>
      <Separator />
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{profile.full_name}</p>
            <Badge variant="secondary" className="text-[10px]">
              {ROLE_LABELS[profile.role]}
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          تسجيل الخروج
        </Button>
      </div>
    </aside>
  );
}
