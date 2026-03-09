"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarIcon, Printer } from "lucide-react";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INVENTORY_TABLE_HEADERS } from "@/lib/constants";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { useRealtimeInventory } from "@/hooks/use-realtime";
import type { DailyInventoryWithProduct, Product } from "@/types/database";

interface InventoryClientProps {
  products: Pick<Product, "id" | "name" | "category">[];
  inventory: DailyInventoryWithProduct[];
  sales: { product_id: string; quantity: number; is_corrected: boolean }[];
  initialDate: string;
  initialCategory: string;
}

export function InventoryClient({ products, inventory, sales, initialDate, initialCategory }: InventoryClientProps) {
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);

  useRealtimeInventory(initialDate);

  const soldByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const sale of sales) { map[sale.product_id] = (map[sale.product_id] || 0) + sale.quantity; }
    return map;
  }, [sales]);

  const rows = useMemo(() => {
    return products.map((product) => {
      const inv = inventory.find((i) => i.product_id === product.id);
      const previousBalance = inv?.previous_balance ?? 0;
      const added = inv?.added ?? 0;
      const sold = soldByProduct[product.id] ?? 0;
      const netRemaining = previousBalance + added - sold;
      const costPrice = inv?.cost_price ?? 0;
      return { product, previousBalance, added, sold, netRemaining, costPrice, remainingCost: netRemaining * costPrice };
    });
  }, [products, inventory, soldByProduct]);

  const totalRemainingCost = rows.reduce((sum, r) => sum + r.remainingCost, 0);

  const selectedDate = new Date(initialDate + "T00:00:00");

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2"><CalendarIcon className="h-4 w-4" />{formatDate(initialDate)}</Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={selectedDate} onSelect={(d) => { if (d) { router.push(`/inventory?date=${d.toISOString().split("T")[0]}&category=${initialCategory}`); setCalendarOpen(false); } }} />
            </PopoverContent>
          </Popover>
          <Select value={initialCategory} onValueChange={(v) => router.push(`/inventory?date=${initialDate}&category=${v}`)}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="cement">اسمنت</SelectItem>
              <SelectItem value="steel">حديد</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={() => window.print()}>
          <Printer className="h-4 w-4" />طباعة
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">{INVENTORY_TABLE_HEADERS.product}</TableHead>
              <TableHead className="text-start">{INVENTORY_TABLE_HEADERS.previousBalance}</TableHead>
              <TableHead className="text-start">{INVENTORY_TABLE_HEADERS.added}</TableHead>
              <TableHead className="text-start">{INVENTORY_TABLE_HEADERS.sold}</TableHead>
              <TableHead className="text-start">{INVENTORY_TABLE_HEADERS.netRemaining}</TableHead>
              <TableHead className="text-start">{INVENTORY_TABLE_HEADERS.costPrice}</TableHead>
              <TableHead className="text-start">{INVENTORY_TABLE_HEADERS.remainingCost}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? rows.map((row) => (
              <TableRow key={row.product.id}>
                <TableCell className="font-medium">{row.product.name}</TableCell>
                <TableCell>{formatQuantity(row.previousBalance)}</TableCell>
                <TableCell className="text-green-600">{formatQuantity(row.added)}</TableCell>
                <TableCell className="text-red-600">{formatQuantity(row.sold)}</TableCell>
                <TableCell className="font-bold">{formatQuantity(row.netRemaining)}</TableCell>
                <TableCell>{formatCurrency(row.costPrice)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(row.remainingCost)}</TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">لا توجد بيانات جرد</TableCell></TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={6}>إجمالي تكلفة المخزون</TableCell>
                <TableCell className="font-bold">{formatCurrency(totalRemainingCost)}</TableCell>
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
