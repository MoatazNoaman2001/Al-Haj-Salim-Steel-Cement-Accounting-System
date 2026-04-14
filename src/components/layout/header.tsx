"use client";

import { formatDate, todayISO } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { useUser } from "@/hooks/use-user";
import { Badge } from "@/components/ui/badge";
import { CustomerSearchDialog } from "@/components/shared/customer-search-dialog";
import { MobileSidebar } from "./sidebar";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { profile } = useUser();

  return (
    <header className="flex items-center justify-between border-b px-4 py-3 md:px-6">
      <div className="flex items-center gap-2">
        <MobileSidebar />
        <h2 className="text-lg font-bold md:text-xl">{title}</h2>
      </div>
      <div className="flex items-center gap-2 md:gap-4">
        <CustomerSearchDialog />
        <span className="hidden text-sm text-muted-foreground sm:inline">
          {formatDate(todayISO())}
        </span>
        <div className="hidden items-center gap-2 sm:flex">
          <span className="text-sm font-medium">{profile.full_name}</span>
          <Badge variant="outline">{ROLE_LABELS[profile.role]}</Badge>
        </div>
      </div>
    </header>
  );
}
