"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Eye, Landmark } from "lucide-react";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { useRealtimeBanks } from "@/hooks/use-realtime";
import type { Bank } from "@/types/database";

interface BanksClientProps {
  banks: Bank[];
}

export function BanksClient({ banks }: BanksClientProps) {
  useRealtimeBanks();

  const totalBalance = useMemo(() => banks.reduce((sum, b) => sum + b.balance, 0), [banks]);

  return (
    <div>
      <div className="py-4">
        <Card>
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Landmark className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">إجمالي الأرصدة</p>
                <p className="text-2xl font-bold">{formatCurrency(totalBalance)}</p>
              </div>
            </div>
            <Badge variant="secondary">{banks.length} حساب</Badge>
          </CardContent>
        </Card>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">م</TableHead>
              <TableHead className="text-start">اسم البنك</TableHead>
              <TableHead className="text-start">رقم الحساب</TableHead>
              <TableHead className="text-start">الرصيد</TableHead>
              <TableHead className="text-start w-[80px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.length ? banks.map((bank, index) => (
              <TableRow key={bank.id}>
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">{bank.name}</TableCell>
                <TableCell dir="ltr" className="text-start">{bank.account_number ?? "—"}</TableCell>
                <TableCell className="font-bold">{formatCurrency(bank.balance)}</TableCell>
                <TableCell>
                  <Link href={`/banks/${bank.id}`}>
                    <Button variant="ghost" size="sm" className="gap-1"><Eye className="h-4 w-4" />كشف</Button>
                  </Link>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">لا توجد حسابات بنكية</TableCell></TableRow>
            )}
          </TableBody>
          {banks.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={3}>الإجمالي</TableCell>
                <TableCell className="font-bold">{formatCurrency(totalBalance)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}
