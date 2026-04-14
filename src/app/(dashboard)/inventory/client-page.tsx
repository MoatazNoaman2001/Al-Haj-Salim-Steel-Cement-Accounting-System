"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { CalendarIcon, Download, ChevronDown, ChevronLeft } from "lucide-react";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { INVENTORY_TABLE_HEADERS } from "@/lib/constants";
import { formatCurrency, formatQuantity, formatDate } from "@/lib/utils";
import { useOfflineQuery } from "@/hooks/use-offline-query";
import { exportInventoryReport } from "@/lib/export-excel";
import type { DailyInventoryWithProduct, Product } from "@/types/database";

interface SaleEntry {
  product_id: string;
  quantity: number;
  is_corrected: boolean;
  customer: { id: string; name: string } | null;
}

interface InventoryClientProps {
  products: Pick<Product, "id" | "name" | "category">[];
  inventory: DailyInventoryWithProduct[];
  sales: SaleEntry[];
  initialDate: string;
  initialCategory: string;
}

// TODO: Remove mock data after testing
const MOCK_SALES: SaleEntry[] = [
  { product_id: "__FIRST__", quantity: 65, is_corrected: false, customer: { id: "mock-1", name: "كمباوند كنوز" } },
  { product_id: "__FIRST__", quantity: 34, is_corrected: false, customer: { id: "mock-2", name: "احمد توفيق" } },
  { product_id: "__SECOND__", quantity: 20, is_corrected: false, customer: { id: "mock-1", name: "كمباوند كنوز" } },
  { product_id: "__SECOND__", quantity: 15, is_corrected: false, customer: { id: "mock-3", name: "شركة البدري" } },
];

function getMockSales(products: Pick<Product, "id" | "name" | "category">[]): SaleEntry[] {
  if (products.length < 2) return [];
  return MOCK_SALES.map((s) => ({
    ...s,
    product_id: s.product_id === "__FIRST__" ? products[0].id : products[1].id,
  }));
}

export function InventoryClient({ products, inventory, sales, initialDate, initialCategory }: InventoryClientProps) {
  const router = useRouter();
  const [calendarOpen, setCalendarOpen] = useState(false);

  const { data: inventoryData } = useOfflineQuery<{ products: typeof products; inventory: typeof inventory; sales: typeof sales }>({
    key: `inventory:${initialDate}:${initialCategory}`,
    queryFn: async (supabase) => {
      const [pRes, iRes, sRes] = await Promise.all([
        supabase.from("products").select("id, name, category").eq("category", initialCategory).eq("is_active", true).order("name"),
        supabase.from("daily_inventory").select("*, product:products!product_id(id, name)").eq("entry_date", initialDate),
        supabase.from("daily_cement").select("product_id, quantity, is_corrected, customer:customers!customer_id(id, name)").eq("entry_date", initialDate).eq("is_corrected", false),
      ]);
      if (pRes.error || iRes.error || sRes.error) return { data: null, error: pRes.error || iRes.error || sRes.error };
      const productIds = new Set((pRes.data ?? []).map((p: any) => p.id));
      const filteredSales = (sRes.data ?? []).filter((s: any) => productIds.has(s.product_id)).map((s: any) => ({
        ...s, customer: Array.isArray(s.customer) ? s.customer[0] ?? null : s.customer,
      }));
      return { data: { products: pRes.data ?? [], inventory: iRes.data ?? [], sales: filteredSales }, error: null };
    },
    fallback: { products, inventory, sales },
    realtimeTable: "daily_inventory",
    realtimeFilter: `entry_date=eq.${initialDate}`,
  });

  const pData = inventoryData.products;
  const iData = inventoryData.inventory;
  const sData = inventoryData.sales;

  // TODO: Remove mock fallback after testing
  const effectiveSales = sData.length > 0 ? sData : getMockSales(pData);

  const { soldByProduct, customersByProduct } = useMemo(() => {
    const soldMap: Record<string, number> = {};
    const custMap: Record<string, { id: string; name: string; quantity: number }[]> = {};
    for (const sale of effectiveSales) {
      soldMap[sale.product_id] = (soldMap[sale.product_id] || 0) + sale.quantity;
      if (sale.customer) {
        if (!custMap[sale.product_id]) custMap[sale.product_id] = [];
        const existing = custMap[sale.product_id].find((c) => c.id === sale.customer!.id);
        if (existing) { existing.quantity += sale.quantity; }
        else { custMap[sale.product_id].push({ id: sale.customer.id, name: sale.customer.name, quantity: sale.quantity }); }
      }
    }
    return { soldByProduct: soldMap, customersByProduct: custMap };
  }, [effectiveSales]);

  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  const rows = useMemo(() => {
    return pData.map((product) => {
      const inv = iData.find((i) => i.product_id === product.id);
      const previousBalance = inv?.previous_balance ?? 0;
      const added = inv?.added ?? 0;
      const sold = soldByProduct[product.id] ?? 0;
      const netRemaining = previousBalance + added - sold;
      const costPrice = inv?.cost_price ?? 0;
      const customers = customersByProduct[product.id] ?? [];
      return { product, previousBalance, added, sold, netRemaining, costPrice, remainingCost: netRemaining * costPrice, customers };
    });
  }, [pData, iData, soldByProduct, customersByProduct]);

  const totalRemainingCost = rows.reduce((sum, r) => sum + r.remainingCost, 0);

  const selectedDate = new Date(initialDate + "T00:00:00");

  function handleExport() {
    exportInventoryReport(
      initialDate,
      initialCategory,
      rows.map((r) => ({
        productName: r.product.name,
        previousBalance: r.previousBalance,
        added: r.added,
        sold: r.sold,
        netRemaining: r.netRemaining,
        costPrice: r.costPrice,
        remainingCost: r.remainingCost,
        customers: r.customers,
      })),
      totalRemainingCost
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
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
        <Button variant="outline" size="sm" className="gap-2 shrink-0" onClick={handleExport}>
          <Download className="h-4 w-4" /><span className="hidden sm:inline">تصدير Excel</span>
        </Button>
      </div>

      <div className="hidden md:block rounded-md border overflow-x-auto">
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
            {rows.length ? rows.map((row) => {
              const isExpanded = expandedProduct === row.product.id;
              const hasCust = row.customers.length > 0;
              return (
                <Fragment key={row.product.id}>
                  <TableRow
                    className={hasCust ? "cursor-pointer hover:bg-muted/50" : ""}
                    onClick={() => hasCust && setExpandedProduct(isExpanded ? null : row.product.id)}
                  >
                    <TableCell className="font-medium">
                      <span className="flex items-center gap-1">
                        {hasCust && (isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />)}
                        {row.product.name}
                      </span>
                    </TableCell>
                    <TableCell>{formatQuantity(row.previousBalance)}</TableCell>
                    <TableCell className="text-green-600">{formatQuantity(row.added)}</TableCell>
                    <TableCell className="text-red-600">{formatQuantity(row.sold)}</TableCell>
                    <TableCell className="font-bold">{formatQuantity(row.netRemaining)}</TableCell>
                    <TableCell>{formatCurrency(row.costPrice)}</TableCell>
                    <TableCell className="font-bold">{formatCurrency(row.remainingCost)}</TableCell>
                  </TableRow>
                  {isExpanded && row.customers.map((cust) => (
                    <TableRow key={`${row.product.id}-${cust.id}`} className="bg-muted/30">
                      <TableCell className="ps-10 text-sm text-muted-foreground">
                        <Link href={`/customers/${cust.id}`} className="hover:underline text-primary">
                          ↳ {cust.name}
                        </Link>
                      </TableCell>
                      <TableCell />
                      <TableCell />
                      <TableCell className="text-sm text-red-600">{formatQuantity(cust.quantity)}</TableCell>
                      <TableCell colSpan={3} />
                    </TableRow>
                  ))}
                </Fragment>
              );
            }) : (
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

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {rows.length ? (
          <>
            {rows.map((row) => {
              const isExpanded = expandedProduct === row.product.id;
              const hasCust = row.customers.length > 0;
              return (
                <div key={row.product.id} className="rounded-lg border p-3 space-y-2">
                  <div
                    className={hasCust ? "cursor-pointer" : ""}
                    onClick={() => hasCust && setExpandedProduct(isExpanded ? null : row.product.id)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1 font-semibold">
                        {hasCust && (
                          isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />
                        )}
                        {row.product.name}
                      </div>
                      <div className="text-right">
                        <div className="text-[10px] text-muted-foreground">
                          {INVENTORY_TABLE_HEADERS.netRemaining}
                        </div>
                        <div className="font-bold">
                          {formatQuantity(row.netRemaining)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t text-sm">
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        {INVENTORY_TABLE_HEADERS.previousBalance}
                      </div>
                      <div>{formatQuantity(row.previousBalance)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        {INVENTORY_TABLE_HEADERS.added}
                      </div>
                      <div className="text-green-600">
                        {formatQuantity(row.added)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        {INVENTORY_TABLE_HEADERS.sold}
                      </div>
                      <div className="text-red-600">
                        {formatQuantity(row.sold)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-muted-foreground">
                        {INVENTORY_TABLE_HEADERS.costPrice}
                      </div>
                      <div>{formatCurrency(row.costPrice)}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] text-muted-foreground">
                        {INVENTORY_TABLE_HEADERS.remainingCost}
                      </div>
                      <div className="font-bold">
                        {formatCurrency(row.remainingCost)}
                      </div>
                    </div>
                  </div>
                  {isExpanded && row.customers.length > 0 && (
                    <div className="pt-2 border-t space-y-1">
                      <div className="text-[10px] text-muted-foreground mb-1">
                        العملاء
                      </div>
                      {row.customers.map((cust) => (
                        <Link
                          key={cust.id}
                          href={`/customers/${cust.id}`}
                          className="flex items-center justify-between text-xs hover:underline"
                        >
                          <span className="text-primary">↳ {cust.name}</span>
                          <span className="text-red-600 font-medium">
                            {formatQuantity(cust.quantity)}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            <div className="rounded-lg border bg-muted/50 p-3 flex items-center justify-between">
              <span className="font-bold text-sm">إجمالي تكلفة المخزون</span>
              <span className="font-bold">{formatCurrency(totalRemainingCost)}</span>
            </div>
          </>
        ) : (
          <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
            لا توجد بيانات جرد
          </div>
        )}
      </div>
    </div>
  );
}
