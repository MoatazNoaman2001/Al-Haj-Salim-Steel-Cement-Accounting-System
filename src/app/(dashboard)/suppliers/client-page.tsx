"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Eye } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useSupplierBalances } from "@/hooks/use-suppliers-queries";
import { useUser } from "@/hooks/use-user";
import { AddSupplierDialog } from "./add-supplier-dialog";
import { formatCurrency, cn } from "@/lib/utils";
import type { SupplierWithBalance } from "@/types/database";

interface SuppliersClientProps {
  suppliers: SupplierWithBalance[];
}

export function SuppliersClient({ suppliers }: SuppliersClientProps) {
  const { isAdmin } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data } = useSupplierBalances(suppliers);

  const filtered = useMemo(() => {
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter(
      (sup) =>
        sup.name.toLowerCase().includes(s) ||
        sup.phone?.toLowerCase().includes(s) ||
        sup.address?.toLowerCase().includes(s),
    );
  }, [data, search]);

  // For suppliers: balance = credit - debit
  //   balance < 0 → we still owe the supplier (مدين لنا)
  //   balance > 0 → supplier holds our credit (لنا رصيد)
  function balanceLabel(b: number) {
    if (b < 0) return "علينا";
    if (b > 0) return "لنا رصيد";
    return "متزن";
  }
  function balanceClass(b: number) {
    if (b < 0) return "text-red-600";
    if (b > 0) return "text-green-600";
    return "";
  }

  return (
    <div>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن مورد..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 w-full sm:w-[300px]"
            />
          </div>
          <Badge variant="secondary" className="shrink-0">{filtered.length} مورد</Badge>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2 shrink-0" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة مورد
          </Button>
        )}
      </div>

      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">م</TableHead>
              <TableHead className="text-start">اسم المورد</TableHead>
              <TableHead className="text-start">الهاتف</TableHead>
              <TableHead className="text-start">المشتريات</TableHead>
              <TableHead className="text-start">المدفوع</TableHead>
              <TableHead className="text-start">الرصيد</TableHead>
              <TableHead className="text-start">الحالة</TableHead>
              <TableHead className="text-start w-[80px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? filtered.map((sup, i) => (
              <TableRow key={sup.id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{sup.name}</TableCell>
                <TableCell dir="ltr" className="text-start">{sup.phone ?? "—"}</TableCell>
                <TableCell className="text-red-600 font-medium">
                  {formatCurrency(Number(sup.total_debit ?? 0))}
                </TableCell>
                <TableCell className="text-green-600 font-medium">
                  {formatCurrency(Number(sup.total_credit ?? 0))}
                </TableCell>
                <TableCell className={cn("font-bold", balanceClass(Number(sup.balance ?? 0)))}>
                  {formatCurrency(Number(sup.balance ?? 0))}
                  <span className="ms-1 text-xs">{balanceLabel(Number(sup.balance ?? 0))}</span>
                </TableCell>
                <TableCell>
                  <Badge variant={sup.is_active ? "default" : "secondary"}>
                    {sup.is_active ? "نشط" : "غير نشط"}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Link href={`/suppliers/${sup.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Eye className="h-4 w-4" />
                      كشف
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  لا يوجد موردين
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {filtered.length ? filtered.map((sup, i) => (
          <Link
            key={sup.id}
            href={`/suppliers/${sup.id}`}
            className="block rounded-lg border p-3 space-y-2 hover:bg-muted/50"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">#{i + 1}</span>
                  <span className="font-semibold truncate">{sup.name}</span>
                </div>
                {sup.phone && (
                  <div dir="ltr" className="text-xs text-muted-foreground mt-0.5 text-start">
                    {sup.phone}
                  </div>
                )}
              </div>
              <Badge variant={sup.is_active ? "default" : "secondary"} className="shrink-0 text-[10px]">
                {sup.is_active ? "نشط" : "غير نشط"}
              </Badge>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t text-sm">
              <div>
                <div className="text-[10px] text-muted-foreground">مشتريات</div>
                <div className="text-red-600 font-medium">
                  {formatCurrency(Number(sup.total_debit ?? 0))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">مدفوع</div>
                <div className="text-green-600 font-medium">
                  {formatCurrency(Number(sup.total_credit ?? 0))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">الرصيد</div>
                <div className={cn("font-bold", balanceClass(Number(sup.balance ?? 0)))}>
                  {formatCurrency(Number(sup.balance ?? 0))}
                </div>
              </div>
            </div>
          </Link>
        )) : (
          <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
            لا يوجد موردين
          </div>
        )}
      </div>

      <AddSupplierDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
