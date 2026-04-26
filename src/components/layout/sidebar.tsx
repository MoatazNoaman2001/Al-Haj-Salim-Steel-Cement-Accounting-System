"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  FileText,
  Hammer,
  ClipboardCheck,
  Calculator,
  Package,
  Landmark,
  Users,
  Truck,
  CalendarCheck,
  BarChart3,
  LogOut,
  Menu,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { APP_NAME, NAV_ITEMS, ROLE_LABELS } from "@/lib/constants";
import { useUser } from "@/hooks/use-user";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

const iconMap = {
  LayoutDashboard,
  FileText,
  Hammer,
  ClipboardCheck,
  Calculator,
  Package,
  Landmark,
  Users,
  Truck,
  CalendarCheck,
  BarChart3,
} as const;

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
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
    <div className="flex h-full flex-col">
      <div className="p-4">
        <h1 className="text-lg font-bold">{APP_NAME}</h1>
        <p className="text-xs text-muted-foreground">نظام الحسابات</p>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-3 py-2">
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            if (item.adminOnly && !isAdmin) return null;
            const Icon = iconMap[item.icon as keyof typeof iconMap];
            const isActive = pathname.startsWith(item.href) && item.href !== "#";

            return (
              <Link
                key={item.label}
                href={item.active ? item.href : "#"}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                    : item.active
                      ? "hover:bg-sidebar-accent/50"
                      : "text-muted-foreground cursor-not-allowed opacity-50"
                )}
              >
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
    </div>
  );
}

/** Desktop sidebar */
export function Sidebar() {
  return (
    <aside className="hidden md:flex h-screen w-64 flex-col border-s bg-sidebar text-sidebar-foreground">
      <SidebarContent />
    </aside>
  );
}

/** Mobile drawer */
export function MobileSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen(true)}
        aria-label="فتح القائمة"
      >
        <Menu className="h-5 w-5" />
      </Button>
      <Drawer open={open} onOpenChange={setOpen} direction="right">
        <DrawerContent
          className={cn(
            "end-auto! start-auto! right-0! left-auto!",
            "h-full w-64 max-w-[80vw] bg-sidebar text-sidebar-foreground",
          )}
        >
          <DrawerTitle className="sr-only">القائمة الرئيسية</DrawerTitle>
          <DrawerDescription className="sr-only">
            قائمة التنقل الرئيسية
          </DrawerDescription>
          <SidebarContent onNavigate={() => setOpen(false)} />
        </DrawerContent>
      </Drawer>
    </>
  );
}
