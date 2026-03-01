"use client";

import { formatDate, todayISO } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import { useUser } from "@/hooks/use-user";
import { Badge } from "@/components/ui/badge";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { profile } = useUser();

  return (
    <header className="flex items-center justify-between border-b px-6 py-3">
      <h2 className="text-xl font-bold">{title}</h2>
      <div className="flex items-center gap-4">
        <span className="text-sm text-muted-foreground">
          {formatDate(todayISO())}
        </span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{profile.full_name}</span>
          <Badge variant="outline">{ROLE_LABELS[profile.role]}</Badge>
        </div>
      </div>
    </header>
  );
}
