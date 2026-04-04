"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DEPOSIT_TABLE_HEADERS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useDailyDeposits } from "@/hooks/use-cement-daily-queries";
import { useDeleteDeposit } from "@/hooks/use-cement-daily-mutations";
import { useRealtimeDepositsRQ } from "@/hooks/use-cement-daily-realtime";
import { AddDepositDialog } from "./add-deposit-dialog";

interface DepositsTableProps {
  date: string;
}

export function DepositsTable({ date }: DepositsTableProps) {
  const { isAdmin, userId } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data = [] } = useDailyDeposits(date);
  const deleteDeposit = useDeleteDeposit(date);

  useRealtimeDepositsRQ(date);

  const totalDeposits = useMemo(
    () => data.reduce((sum, d) => sum + (d.amount ?? 0), 0),
    [data]
  );

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">الايداعات</h3>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          إضافة إيداع
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">
                {DEPOSIT_TABLE_HEADERS.rowNum}
              </TableHead>
              <TableHead className="text-start">
                {DEPOSIT_TABLE_HEADERS.amount}
              </TableHead>
              <TableHead className="text-start">
                {DEPOSIT_TABLE_HEADERS.description}
              </TableHead>
              <TableHead className="text-start">
                {DEPOSIT_TABLE_HEADERS.createdBy}
              </TableHead>
              {isAdmin && (
                <TableHead className="text-start">
                  {DEPOSIT_TABLE_HEADERS.actions}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length ? (
              data.map((deposit, index) => (
                <TableRow key={deposit.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(deposit.amount)}
                  </TableCell>
                  <TableCell>{deposit.description ?? "—"}</TableCell>
                  <TableCell>{deposit.creator?.full_name ?? "—"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteDeposit.mutate(deposit.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={isAdmin ? 5 : 4}
                  className="h-16 text-center text-muted-foreground"
                >
                  لا توجد إيداعات لهذا اليوم
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell className="text-start">الإجمالي</TableCell>
                <TableCell className="font-bold">
                  {formatCurrency(totalDeposits)}
                </TableCell>
                <TableCell colSpan={isAdmin ? 3 : 2} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AddDepositDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        date={date}
        userId={userId}
      />
    </div>
  );
}
