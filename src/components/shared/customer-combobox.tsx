"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, Plus, Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Customer } from "@/types/database";
import { useAddCustomer } from "@/hooks/use-cement-daily-mutations";

interface CustomerComboboxProps {
  customers: Pick<Customer, "id" | "name">[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function CustomerCombobox({
  customers,
  value,
  onChange,
  disabled,
}: CustomerComboboxProps) {
  const [open, setOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const selectedCustomer = customers.find((c) => c.id === value);
  const addCustomer = useAddCustomer();

  function handleAddCustomer() {
    if (!newName.trim()) {
      return;
    }

    addCustomer.mutate(
      { name: newName.trim(), phone: newPhone.trim() || null },
      {
        onSuccess: (customer) => {
          onChange(customer.id);
          setNewName("");
          setNewPhone("");
          setAddDialogOpen(false);
          setOpen(false);
        },
      }
    );
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedCustomer?.name ?? "اختر العميل..."}
              <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command>
            <CommandInput placeholder="ابحث عن عميل..." />
            <CommandList>
              <CommandEmpty>لا يوجد عميل بهذا الاسم</CommandEmpty>
              <CommandGroup>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.name}
                    onSelect={() => {
                      onChange(customer.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "me-2 h-4 w-4",
                        value === customer.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {customer.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setAddDialogOpen(true);
                    setOpen(false);
                  }}
                >
                  <Plus className="me-2 h-4 w-4" />
                  إضافة عميل جديد
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
        </Popover>
        {value && (
          <Link href={`/customers/${value}`} target="_blank">
            <Button variant="outline" size="icon" type="button" title="كشف حساب العميل">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>إضافة عميل جديد</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">اسم العميل *</label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="اسم العميل"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">رقم الهاتف</label>
              <Input
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                placeholder="رقم الهاتف (اختياري)"
                dir="ltr"
                className="text-left"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
              >
                إلغاء
              </Button>
              <Button onClick={handleAddCustomer} disabled={addCustomer.isPending}>
                {addCustomer.isPending ? (
                  <>
                    <Loader2 className="me-2 h-4 w-4 animate-spin" />
                    جاري الإضافة...
                  </>
                ) : (
                  "إضافة"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
