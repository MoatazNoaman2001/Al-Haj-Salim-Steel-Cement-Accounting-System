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
import { DevMockBanner } from "@/components/dev-mock-banner";
import { CASHIER_TABLE_HEADERS } from "@/lib/constants";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRealtimeCashier } from "@/hooks/use-realtime";
import { AddCashierEntryDialog } from "./add-entry-dialog";
import { exportCashierReport } from "@/lib/export-excel";
import { IS_DEV_MOCK_ENABLED, mockCashierEntries } from "@/lib/dev-mocks";
import type { DailyCashierWithCreator } from "@/types/database";

interface CashierDataTableProps {
  data: DailyCashierWithCreator[];
  initialDate: string;
  onDateChange: (date: string) => void;
}

export function CashierDataTable({
  data: realData,
  initialDate,
  onDateChange,
}: CashierDataTableProps) {
  const { userId } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  useRealtimeCashier(initialDate);

  // Dev-only mock fallback for empty days
  const data = useMemo(() => {
    if (realData.length > 0) return realData;
    if (!IS_DEV_MOCK_ENABLED) return realData;
    return mockCashierEntries(initialDate, userId);
  }, [realData, initialDate, userId]);
  const isUsingMock = data !== realData && data.length > 0;

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
      {isUsingMock && <DevMockBanner label="قيود كاشير تجريبية" />}
      {/* Toolbar */}
      <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
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
            <span className="hidden sm:inline">تصدير Excel</span>
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

      {/* Table (desktop) */}
      <div className="hidden md:block rounded-md border overflow-x-auto">
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

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
        {rows.length ? (
          <>
            {rows.map((entry, index) => (
              <div
                key={entry.id}
                className={cn(
                  "rounded-lg border p-3 space-y-2 text-sm",
                  entry.is_corrected && "opacity-50 line-through",
                  entry.correction_of_id && "bg-green-50",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">
                        #{index + 1}
                      </span>
                      <span className="font-semibold break-words">
                        {entry.description}
                      </span>
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                      {entry.creator?.full_name ?? "—"}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div>
                    <div className="text-[10px] text-muted-foreground">
                      {CASHIER_TABLE_HEADERS.debit}
                    </div>
                    <div
                      className={
                        entry.debit > 0 ? "text-red-600 font-semibold" : ""
                      }
                    >
                      {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">
                      {CASHIER_TABLE_HEADERS.credit}
                    </div>
                    <div
                      className={
                        entry.credit > 0 ? "text-green-600 font-semibold" : ""
                      }
                    >
                      {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">
                      {CASHIER_TABLE_HEADERS.balance}
                    </div>
                    <div className="font-bold">
                      {formatCurrency(entry.runningBalance)}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Mobile totals card */}
            <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
              <div className="font-bold text-sm">الإجمالي</div>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    {CASHIER_TABLE_HEADERS.debit}
                  </div>
                  <div className="font-bold text-red-600">
                    {formatCurrency(totalDebit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    {CASHIER_TABLE_HEADERS.credit}
                  </div>
                  <div className="font-bold text-green-600">
                    {formatCurrency(totalCredit)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground">
                    {CASHIER_TABLE_HEADERS.balance}
                  </div>
                  <div
                    className={cn(
                      "font-bold",
                      isBalanced ? "text-green-600" : "text-red-600",
                    )}
                  >
                    {formatCurrency(totalCredit - totalDebit)}
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
            لا توجد قيود لهذا اليوم
          </div>
        )}
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
