"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Plus, Search, Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useOfflineQuery } from "@/hooks/use-offline-query";
import { AddCustomerDialog } from "./add-customer-dialog";
import { useUser } from "@/hooks/use-user";
import { formatCurrency } from "@/lib/utils";
import type { CustomerWithBalance } from "@/types/database";

interface CustomersClientProps {
  customers: CustomerWithBalance[];
}

export function CustomersClient({ customers }: CustomersClientProps) {
  const { isAdmin } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const { data } = useOfflineQuery<CustomerWithBalance[]>({
    key: "customers",
    queryFn: (supabase) => supabase.from("customer_balances").select("*").order("name", { ascending: true }),
    fallback: customers,
    realtimeTable: "customers",
  });

  const filtered = useMemo(() => {
    if (!search) return data;
    const s = search.toLowerCase();
    return data.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.phone?.toLowerCase().includes(s) ||
        c.address?.toLowerCase().includes(s)
    );
  }, [data, search]);

  return (
    <div>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
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
        {isAdmin && (
          <Button size="sm" className="gap-2 shrink-0" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة عميل
          </Button>
        )}
      </div>

      <div className="hidden md:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">م</TableHead>
              <TableHead className="text-start">اسم العميل</TableHead>
              <TableHead className="text-start">الهاتف</TableHead>
              <TableHead className="text-start">عليه</TableHead>
              <TableHead className="text-start">له</TableHead>
              <TableHead className="text-start">الرصيد</TableHead>
              <TableHead className="text-start">الحالة</TableHead>
              <TableHead className="text-start w-[80px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length ? (
              filtered.map((customer, index) => (
                <TableRow key={customer.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-medium">{customer.name}</TableCell>
                  <TableCell dir="ltr" className="text-start">{customer.phone ?? "—"}</TableCell>
                  <TableCell className="text-red-600 font-medium">
                    {formatCurrency(customer.total_debit)}
                  </TableCell>
                  <TableCell className="text-green-600 font-medium">
                    {formatCurrency(customer.total_credit)}
                  </TableCell>
                  <TableCell className={`font-bold ${customer.balance > 0 ? "text-red-600" : customer.balance < 0 ? "text-green-600" : ""}`}>
                    {formatCurrency(Math.abs(customer.balance))}
                    {customer.balance > 0 ? " مدين" : customer.balance < 0 ? " دائن" : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={customer.is_active ? "default" : "secondary"}>
                      {customer.is_active ? "نشط" : "غير نشط"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Link href={`/customers/${customer.id}`}>
                      <Button variant="ghost" size="sm" className="gap-1">
                        <Eye className="h-4 w-4" />
                        كشف
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                  لا يوجد عملاء
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {filtered.length ? (
          filtered.map((customer, index) => (
            <Link
              key={customer.id}
              href={`/customers/${customer.id}`}
              className="block rounded-lg border p-3 space-y-2 hover:bg-muted/50"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">
                      #{index + 1}
                    </span>
                    <span className="font-semibold truncate">
                      {customer.name}
                    </span>
                  </div>
                  {customer.phone && (
                    <div
                      dir="ltr"
                      className="text-xs text-muted-foreground mt-0.5 text-start"
                    >
                      {customer.phone}
                    </div>
                  )}
                </div>
                <Badge
                  variant={customer.is_active ? "default" : "secondary"}
                  className="shrink-0 text-[10px]"
                >
                  {customer.is_active ? "نشط" : "غير نشط"}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t text-sm">
                <div>
                  <div className="text-[10px] text-muted-foreground">عليه</div>
                  <div className="text-red-600 font-medium">
                    {formatCurrency(customer.total_debit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">له</div>
                  <div className="text-green-600 font-medium">
                    {formatCurrency(customer.total_credit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">الرصيد</div>
                  <div
                    className={`font-bold ${
                      customer.balance > 0
                        ? "text-red-600"
                        : customer.balance < 0
                          ? "text-green-600"
                          : ""
                    }`}
                  >
                    {formatCurrency(Math.abs(customer.balance))}
                    {customer.balance > 0
                      ? " مدين"
                      : customer.balance < 0
                        ? " دائن"
                        : ""}
                  </div>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
            لا يوجد عملاء
          </div>
        )}
      </div>

      <AddCustomerDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
