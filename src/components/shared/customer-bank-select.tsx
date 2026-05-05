"use client";

import { useState } from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Check, ChevronsUpDown, CreditCard } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CustomerBankAccount } from "@/types/database";

interface CustomerBankSelectProps {
  accounts: CustomerBankAccount[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export function CustomerBankSelect({
  accounts,
  value,
  onChange,
  placeholder = "حساب العميل البنكي (اختياري)",
  disabled,
}: CustomerBankSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = accounts.find((a) => a.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between text-start font-normal"
        >
          {selected ? (
            <span className="truncate">
              {selected.bank_name}
              {selected.account_number && (
                <span className="text-muted-foreground ms-1 text-xs">
                  · {selected.account_number}
                </span>
              )}
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="بحث..." />
          <CommandList>
            <CommandEmpty>لا توجد حسابات مسجلة</CommandEmpty>
            <CommandGroup>
              {value && (
                <CommandItem
                  value="__clear__"
                  onSelect={() => { onChange(""); setOpen(false); }}
                >
                  <span className="text-muted-foreground">— بدون تحديد —</span>
                </CommandItem>
              )}
              {accounts.map((acc) => (
                <CommandItem
                  key={acc.id}
                  value={`${acc.bank_name} ${acc.account_number ?? ""}`}
                  onSelect={() => {
                    onChange(acc.id === value ? "" : acc.id);
                    setOpen(false);
                  }}
                >
                  <CreditCard className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{acc.bank_name}</span>
                  {acc.account_number && (
                    <span className="text-muted-foreground ms-2 text-xs shrink-0">
                      {acc.account_number}
                    </span>
                  )}
                  <Check
                    className={cn(
                      "ms-auto h-4 w-4 shrink-0",
                      value === acc.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
