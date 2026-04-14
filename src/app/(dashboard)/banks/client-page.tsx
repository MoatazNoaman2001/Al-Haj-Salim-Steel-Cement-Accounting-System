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
import { useBanksWithTotals, type BankWithTotals } from "@/hooks/use-banks-queries";
import { useUser } from "@/hooks/use-user";
import { AddBankDialog } from "./add-bank-dialog";
import { EditBankDialog } from "./edit-bank-dialog";
import { DeleteBankDialog } from "./delete-bank-dialog";

interface BanksClientProps {
  banks: BankWithTotals[];
}

export function BanksClient({ banks }: BanksClientProps) {
  const { isAdmin } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editBank, setEditBank] = useState<BankWithTotals | null>(null);
  const [deleteBank, setDeleteBank] = useState<BankWithTotals | null>(null);
  const { data } = useBanksWithTotals(banks);

  const { grandDebit, grandCredit, grandBalance } = useMemo(() => ({
    grandDebit: data.reduce((sum, b) => sum + b.totalDebit, 0),
    grandCredit: data.reduce((sum, b) => sum + b.totalCredit, 0),
    grandBalance: data.reduce((sum, b) => sum + b.currentBalance, 0),
  }), [data]);

  return (
    <div>
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
        <Card className="flex-1">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Landmark className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">الارصدة</p>
                <p className="text-2xl font-bold">{formatCurrency(grandBalance)}</p>
              </div>
            </div>
            <Badge variant="secondary">{data.length} حساب</Badge>
          </CardContent>
        </Card>
        {isAdmin && (
          <Button size="sm" className="gap-2 shrink-0" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4" />
            إضافة بنك
          </Button>
        )}
      </div>

      <div className="hidden md:block rounded-md border overflow-x-auto">
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
            {data.length ? data.map((bank, index) => (
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
          {data.length > 0 && (
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

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {data.length ? (
          <>
            {data.map((bank, index) => (
              <div key={bank.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                      <Link
                        href={`/banks/${bank.id}`}
                        className="font-semibold hover:underline truncate"
                      >
                        {bank.name}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setEditBank(bank)}
                      title="طلب تعديل"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => setDeleteBank(bank)}
                      title="طلب حذف"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-2 border-t text-sm">
                  <div>
                    <div className="text-[10px] text-muted-foreground">
                      {BANK_TABLE_HEADERS.debit}
                    </div>
                    <div className="text-red-600 font-medium">
                      {formatCurrency(bank.totalDebit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">
                      {BANK_TABLE_HEADERS.credit}
                    </div>
                    <div className="text-green-600 font-medium">
                      {formatCurrency(bank.totalCredit)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">
                      {BANK_TABLE_HEADERS.balance}
                    </div>
                    <div className="font-bold">
                      {formatCurrency(bank.currentBalance)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <div className="font-bold text-sm">الإجمالي</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    {BANK_TABLE_HEADERS.debit}
                  </div>
                  <div className="font-bold text-red-600">
                    {formatCurrency(grandDebit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    {BANK_TABLE_HEADERS.credit}
                  </div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(grandCredit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    {BANK_TABLE_HEADERS.balance}
                  </div>
                  <div className="font-bold">{formatCurrency(grandBalance)}</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
            لا توجد حسابات بنكية
          </div>
        )}
      </div>

      <AddBankDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditBankDialog bank={editBank} onClose={() => setEditBank(null)} />
      <DeleteBankDialog bank={deleteBank} onClose={() => setDeleteBank(null)} />
    </div>
  );
}
