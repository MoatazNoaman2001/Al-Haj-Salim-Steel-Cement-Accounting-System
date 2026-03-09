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
import { useRealtimeCustomers } from "@/hooks/use-realtime";
import { AddCustomerDialog } from "./add-customer-dialog";
import { useUser } from "@/hooks/use-user";
import type { Customer } from "@/types/database";

interface CustomersClientProps {
  customers: Customer[];
}

export function CustomersClient({ customers }: CustomersClientProps) {
  const { isAdmin } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  useRealtimeCustomers();

  const filtered = useMemo(() => {
    if (!search) return customers;
    const s = search.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.phone?.toLowerCase().includes(s) ||
        c.address?.toLowerCase().includes(s)
    );
  }, [customers, search]);

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن عميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-9 w-[300px]"
            />
          </div>
          <Badge variant="secondary">{filtered.length} عميل</Badge>
        </div>
        {isAdmin && (
          <Button size="sm" className="gap-2" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة عميل
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">م</TableHead>
              <TableHead className="text-start">اسم العميل</TableHead>
              <TableHead className="text-start">الهاتف</TableHead>
              <TableHead className="text-start">العنوان</TableHead>
              <TableHead className="text-start">ملاحظات</TableHead>
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
                  <TableCell>{customer.address ?? "—"}</TableCell>
                  <TableCell>{customer.notes ?? "—"}</TableCell>
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
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  لا يوجد عملاء
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AddCustomerDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
