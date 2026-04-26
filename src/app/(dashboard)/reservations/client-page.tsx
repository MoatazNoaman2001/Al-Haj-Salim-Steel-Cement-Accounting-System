"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Eye } from "lucide-react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  useCustomerReservationBalances,
  type CustomerReservationBalance,
} from "@/hooks/use-customers-queries";
import { formatCurrency, cn } from "@/lib/utils";

interface ReservationsIndexClientProps {
  balances: CustomerReservationBalance[];
}

export function ReservationsIndexClient({ balances }: ReservationsIndexClientProps) {
  const [search, setSearch] = useState("");
  const { data } = useCustomerReservationBalances(balances);

  const active = useMemo(
    () => data.filter((b) => b.total_credit > 0 || b.total_debit > 0),
    [data],
  );

  const filtered = useMemo(() => {
    if (!search) return active;
    const s = search.toLowerCase();
    return active.filter((b) => b.customer_name.toLowerCase().includes(s));
  }, [active, search]);

  const totals = useMemo(() => {
    return active.reduce(
      (acc, b) => ({
        credit: acc.credit + Number(b.total_credit ?? 0),
        debit: acc.debit + Number(b.total_debit ?? 0),
        balance: acc.balance + Number(b.balance ?? 0),
      }),
      { credit: 0, debit: 0, balance: 0 },
    );
  }, [active]);

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4">
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي الحجوزات</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totals.credit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">إجمالي السحوبات</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totals.debit)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <p className="text-sm text-muted-foreground">صافي الرصيد</p>
          <p className={cn(
            "text-xl font-bold",
            totals.balance > 0 ? "text-green-600" :
              totals.balance < 0 ? "text-red-600" : "",
          )}>
            {formatCurrency(totals.balance)}
          </p>
        </CardContent></Card>
      </div>

      <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className="relative flex-1 sm:flex-none">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن عميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 w-full sm:w-[300px]"
            />
          </div>
          <Badge variant="secondary" className="shrink-0">{filtered.length} عميل</Badge>
        </div>
      </div>

      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">م</TableHead>
              <TableHead className="text-start">اسم العميل</TableHead>
              <TableHead className="text-start">إجمالي الحجوزات</TableHead>
              <TableHead className="text-start">إجمالي السحوبات</TableHead>
              <TableHead className="text-start">الرصيد</TableHead>
              <TableHead className="text-start w-[120px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? filtered.map((b, i) => (
              <TableRow key={b.customer_id}>
                <TableCell>{i + 1}</TableCell>
                <TableCell className="font-medium">{b.customer_name}</TableCell>
                <TableCell className="text-green-600 font-medium">
                  {formatCurrency(Number(b.total_credit ?? 0))}
                </TableCell>
                <TableCell className="text-red-600 font-medium">
                  {formatCurrency(Number(b.total_debit ?? 0))}
                </TableCell>
                <TableCell className={cn(
                  "font-bold",
                  Number(b.balance) > 0 ? "text-green-600" :
                    Number(b.balance) < 0 ? "text-red-600" : "",
                )}>
                  {formatCurrency(Number(b.balance ?? 0))}
                </TableCell>
                <TableCell>
                  <Link href={`/customers/${b.customer_id}`}>
                    <Button variant="ghost" size="sm" className="gap-1">
                      <Eye className="h-4 w-4" />فتح
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  لا توجد حجوزات حالياً
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {filtered.length ? filtered.map((b, i) => (
          <Link
            key={b.customer_id}
            href={`/customers/${b.customer_id}`}
            className="block rounded-lg border p-3 space-y-2 hover:bg-muted/50"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">#{i + 1}</span>
              <span className="font-semibold truncate">{b.customer_name}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t text-sm">
              <div>
                <div className="text-[10px] text-muted-foreground">حجوزات</div>
                <div className="text-green-600 font-medium">
                  {formatCurrency(Number(b.total_credit ?? 0))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">سحوبات</div>
                <div className="text-red-600 font-medium">
                  {formatCurrency(Number(b.total_debit ?? 0))}
                </div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground">الرصيد</div>
                <div className={cn(
                  "font-bold",
                  Number(b.balance) > 0 ? "text-green-600" :
                    Number(b.balance) < 0 ? "text-red-600" : "",
                )}>
                  {formatCurrency(Number(b.balance ?? 0))}
                </div>
              </div>
            </div>
          </Link>
        )) : (
          <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
            لا توجد حجوزات حالياً
          </div>
        )}
      </div>
    </div>
  );
}
