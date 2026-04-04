"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Search, Users } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";

interface CustomerResult {
  id: string;
  name: string;
  phone: string | null;
  total_debit: number;
  total_credit: number;
  balance: number;
}

export function CustomerSearchDialog() {
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<CustomerResult[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Ctrl+K shortcut
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  // Load customers when dialog opens
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .rpc("search_customers_with_balance", { p_search: "" })
      .then(({ data }: { data: CustomerResult[] | null }) => {
        setResults(data ?? []);
        setLoading(false);
      });
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = useCallback(
    (customerId: string) => {
      setOpen(false);
      router.push(`/customers/${customerId}`);
    },
    [router]
  );

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        <Search className="h-4 w-4" />
        <span className="hidden sm:inline">بحث عن عميل...</span>
        <kbd className="hidden sm:inline-flex pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
          Ctrl+K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="ابحث بالاسم أو رقم الهاتف..." />
        <CommandList>
          <CommandEmpty>
            {loading ? "جاري البحث..." : "لا يوجد عميل بهذا الاسم"}
          </CommandEmpty>
          <CommandGroup heading="العملاء">
            {results.map((customer) => (
              <CommandItem
                key={customer.id}
                value={`${customer.name} ${customer.phone ?? ""}`}
                onSelect={() => handleSelect(customer.id)}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="font-medium">{customer.name}</span>
                    {customer.phone && (
                      <span className="text-xs text-muted-foreground ms-2" dir="ltr">
                        {customer.phone}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className="text-red-600">
                    عليه: {formatCurrency(customer.total_debit)}
                  </span>
                  <span className="text-green-600">
                    له: {formatCurrency(customer.total_credit)}
                  </span>
                  <span
                    className={`font-bold ${
                      customer.balance > 0
                        ? "text-red-600"
                        : customer.balance < 0
                          ? "text-green-600"
                          : ""
                    }`}
                  >
                    {formatCurrency(Math.abs(customer.balance))}
                    {customer.balance > 0 ? " مدين" : customer.balance < 0 ? " دائن" : ""}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
