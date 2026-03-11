"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Landmark, Plus, Pencil, Trash2 } from "lucide-react";
import {
  Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BANK_TABLE_HEADERS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useRealtimeBanks } from "@/hooks/use-realtime";
import { useUser } from "@/hooks/use-user";
import { AddBankDialog } from "./add-bank-dialog";
import { EditBankDialog } from "./edit-bank-dialog";
import { DeleteBankDialog } from "./delete-bank-dialog";
import type { Bank } from "@/types/database";

interface BankWithTotals extends Bank {
  totalDebit: number;
  totalCredit: number;
  currentBalance: number;
}

interface BanksClientProps {
  banks: BankWithTotals[];
}

export function BanksClient({ banks }: BanksClientProps) {
  const { isAdmin } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editBank, setEditBank] = useState<BankWithTotals | null>(null);
  const [deleteBank, setDeleteBank] = useState<BankWithTotals | null>(null);

  useRealtimeBanks();

  const { grandDebit, grandCredit, grandBalance } = useMemo(() => ({
    grandDebit: banks.reduce((sum, b) => sum + b.totalDebit, 0),
    grandCredit: banks.reduce((sum, b) => sum + b.totalCredit, 0),
    grandBalance: banks.reduce((sum, b) => sum + b.currentBalance, 0),
  }), [banks]);

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Landmark className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">الارصدة</p>
                <p className="text-2xl font-bold">{formatCurrency(grandBalance)}</p>
              </div>
            </div>
            <Badge variant="secondary">{banks.length} حساب</Badge>
          </CardContent>
        </Card>
        {isAdmin && (
          <Button size="sm" className="gap-2 ms-4" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة بنك
          </Button>
        )}
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">{BANK_TABLE_HEADERS.rowNum}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.bankName}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.debit}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.credit}</TableHead>
              <TableHead className="text-start">{BANK_TABLE_HEADERS.balance}</TableHead>
              <TableHead className="text-start w-[100px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banks.length ? banks.map((bank, index) => (
              <TableRow key={bank.id} className="hover:bg-muted/50">
                <TableCell>{index + 1}</TableCell>
                <TableCell className="font-medium">
                  <Link href={`/banks/${bank.id}`} className="hover:underline">
                    {bank.name}
                  </Link>
                </TableCell>
                <TableCell className="text-red-600">{formatCurrency(bank.totalDebit)}</TableCell>
                <TableCell className="text-green-600">{formatCurrency(bank.totalCredit)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(bank.currentBalance)}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditBank(bank)} title="طلب تعديل">
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteBank(bank)} title="طلب حذف">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )) : (
              <TableRow><TableCell colSpan={6} className="h-24 text-center text-muted-foreground">لا توجد حسابات بنكية</TableCell></TableRow>
            )}
          </TableBody>
          {banks.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2}>الإجمالي</TableCell>
                <TableCell className="text-red-600">{formatCurrency(grandDebit)}</TableCell>
                <TableCell className="text-green-600">{formatCurrency(grandCredit)}</TableCell>
                <TableCell className="font-bold">{formatCurrency(grandBalance)}</TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AddBankDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditBankDialog bank={editBank} onClose={() => setEditBank(null)} />
      <DeleteBankDialog bank={deleteBank} onClose={() => setDeleteBank(null)} />
    </div>
  );
}
