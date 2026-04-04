"use client";

import { useMemo, useState } from "react";
import { Plus, Download, CalendarIcon } from "lucide-react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { CASHIER_TABLE_HEADERS } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRealtimeCashier } from "@/hooks/use-realtime";
import { AddCashierEntryDialog } from "./add-entry-dialog";
import { exportCashierReport } from "@/lib/export-excel";
import type { DailyCashierWithCreator } from "@/types/database";

interface CashierDataTableProps {
  data: DailyCashierWithCreator[];
  initialDate: string;
  onDateChange: (date: string) => void;
}

export function CashierDataTable({
  data,
  initialDate,
  onDateChange,
}: CashierDataTableProps) {
  const { userId } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useRealtimeCashier(initialDate);

  // Compute running balance and totals
  const { rows, totalDebit, totalCredit } = useMemo(() => {
    let runningBalance = 0;
    const activeEntries = data.filter((e) => !e.is_corrected);
    const computedRows = activeEntries.map((entry) => {
      runningBalance += entry.credit - entry.debit;
      return { ...entry, runningBalance };
    });
    const totalDebit = activeEntries.reduce((sum, e) => sum + e.debit, 0);
    const totalCredit = activeEntries.reduce((sum, e) => sum + e.credit, 0);
    return { rows: computedRows, totalDebit, totalCredit };
  }, [data]);

  const isBalanced = totalDebit === totalCredit && data.length > 0;

  const selectedDate = new Date(initialDate + "T00:00:00");

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" className="gap-2">
                <CalendarIcon className="h-4 w-4" />
                {formatDate(initialDate)}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => {
                  if (d) {
                    onDateChange(d.toISOString().split("T")[0]);
                    setCalendarOpen(false);
                  }
                }}
              />
            </PopoverContent>
          </Popover>
          {data.length > 0 && (
            <Badge variant={isBalanced ? "default" : "destructive"}>
              {isBalanced ? "اليومية متزنة" : "اليومية غير متزنة"}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => exportCashierReport(initialDate, rows, totalDebit, totalCredit)}
          >
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setAddDialogOpen(true)}
          >
            <Plus className="h-4 w-4" />
            إضافة قيد
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">
                {CASHIER_TABLE_HEADERS.rowNum}
              </TableHead>
              <TableHead className="text-start">
                {CASHIER_TABLE_HEADERS.description}
              </TableHead>
              <TableHead className="text-start">
                {CASHIER_TABLE_HEADERS.debit}
              </TableHead>
              <TableHead className="text-start">
                {CASHIER_TABLE_HEADERS.credit}
              </TableHead>
              <TableHead className="text-start">
                {CASHIER_TABLE_HEADERS.balance}
              </TableHead>
              <TableHead className="text-start">
                {CASHIER_TABLE_HEADERS.createdBy}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length ? (
              rows.map((entry, index) => (
                <TableRow
                  key={entry.id}
                  className={cn(
                    entry.is_corrected && "opacity-50 line-through",
                    entry.correction_of_id && "bg-green-50"
                  )}
                >
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{entry.description}</TableCell>
                  <TableCell
                    className={
                      entry.debit > 0 ? "text-red-600 font-semibold" : ""
                    }
                  >
                    {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                  </TableCell>
                  <TableCell
                    className={
                      entry.credit > 0 ? "text-green-600 font-semibold" : ""
                    }
                  >
                    {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                  </TableCell>
                  <TableCell className="font-bold">
                    {formatCurrency(entry.runningBalance)}
                  </TableCell>
                  <TableCell>{entry.creator?.full_name ?? "—"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="h-24 text-center text-muted-foreground"
                >
                  لا توجد قيود لهذا اليوم
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {rows.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell>الإجمالي</TableCell>
                <TableCell />
                <TableCell className="text-red-600">
                  {formatCurrency(totalDebit)}
                </TableCell>
                <TableCell className="text-green-600">
                  {formatCurrency(totalCredit)}
                </TableCell>
                <TableCell
                  className={cn(
                    "font-bold",
                    isBalanced ? "text-green-600" : "text-red-600"
                  )}
                >
                  {formatCurrency(totalCredit - totalDebit)}
                </TableCell>
                <TableCell />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AddCashierEntryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        date={initialDate}
        userId={userId}
      />
    </div>
  );
}
