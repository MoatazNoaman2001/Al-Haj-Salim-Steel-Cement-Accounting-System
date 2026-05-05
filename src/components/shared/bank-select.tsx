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
import { Check, ChevronsUpDown, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Bank {
  id: string;
  name: string;
  account_number?: string | null;
  balance?: number;
}

interface BankSelectProps {
  banks: Bank[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function BankSelect({
  banks,
  value,
  onChange,
  placeholder = "اختر البنك...",
}: BankSelectProps) {
  const [open, setOpen] = useState(false);
  const selected = banks.find((b) => b.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-start font-normal"
        >
          {selected ? (
            <span className="truncate">{selected.name}</span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="بحث بالبنك..." />
          <CommandList>
            <CommandEmpty>لا يوجد بنك بهذا الاسم</CommandEmpty>
            <CommandGroup>
              {banks.map((bank) => (
                <CommandItem
                  key={bank.id}
                  value={bank.name}
                  onSelect={() => {
                    onChange(bank.id === value ? "" : bank.id);
                    setOpen(false);
                  }}
                >
                  <Building2 className="me-2 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{bank.name}</span>
                  <Check
                    className={cn(
                      "ms-auto h-4 w-4",
                      value === bank.id ? "opacity-100" : "opacity-0"
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