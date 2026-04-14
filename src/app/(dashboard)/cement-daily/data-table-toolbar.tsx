"use client";

import { CalendarIcon, Plus, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { formatDate } from "@/lib/utils";

interface DataTableToolbarProps {
  date: string;
  onDateChange: (date: string) => void;
  onAddEntry: () => void;
  onPrint: () => void;
  customerFilter: string;
  onCustomerFilterChange: (value: string) => void;
}

export function DataTableToolbar({
  date,
  onDateChange,
  onAddEntry,
  onPrint,
  customerFilter,
  onCustomerFilterChange,
}: DataTableToolbarProps) {
  return (
    <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2 shrink-0">
              <CalendarIcon className="h-4 w-4" />
              {formatDate(date)}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={new Date(date)}
              onSelect={(d) => {
                if (d) {
                  const iso = d.toISOString().split("T")[0];
                  onDateChange(iso);
                }
              }}
            />
          </PopoverContent>
        </Popover>
        <Input
          placeholder="بحث بالعميل..."
          value={customerFilter}
          onChange={(e) => onCustomerFilterChange(e.target.value)}
          className="flex-1 sm:max-w-[200px]"
        />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" className="gap-2" onClick={onPrint}>
          <Printer className="h-4 w-4" />
          <span className="hidden sm:inline">طباعة</span>
        </Button>
        <Button className="gap-2" onClick={onAddEntry}>
          <Plus className="h-4 w-4" />
          إضافة عملية
        </Button>
      </div>
    </div>
  );
}
