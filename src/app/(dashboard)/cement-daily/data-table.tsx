"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DevMockBanner } from "@/components/dev-mock-banner";
import { cn, formatCurrency, formatQuantity, todayISO } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useCementEntries, useCustomers, useCementProducts } from "@/hooks/use-cement-daily-queries";
import { useRealtimeCementRQ } from "@/hooks/use-cement-daily-realtime";
import { buildColumns } from "./columns";
import { DataTableToolbar } from "./data-table-toolbar";
import { AddEntryDialog } from "./add-entry-dialog";
import { CorrectionRequestDialog } from "./correction-request-dialog";
import type { DailyCementWithRelations } from "@/types/database";
import { APP_FULL_NAME } from "@/lib/constants";
import { IS_DEV_MOCK_ENABLED, isMockId, mockCementEntries } from "@/lib/dev-mocks";
import { Loader2 } from "lucide-react";

interface DataTableProps {
  initialDate: string;
  onDateChange: (date: string) => void;
}

export function DataTable({
  initialDate,
  onDateChange,
}: DataTableProps) {
  const { isAdmin, userId } = useUser();
  const { data: realData = [], isLoading } = useCementEntries(initialDate);
  const { data: products = [] } = useCementProducts();
  const { data: customers = [] } = useCustomers();

  // Dev-only: fall back to mock data when the day has no real entries
  // so all features (correction pair, totals, admin profit) are visible.
  const data = useMemo(() => {
    if (realData.length > 0) return realData;
    if (!IS_DEV_MOCK_ENABLED) return realData;
    return mockCementEntries(initialDate, products, customers, userId);
  }, [realData, initialDate, products, customers, userId]);
  const isUsingMock = data !== realData && data.length > 0;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const [correctionEntry, setCorrectionEntry] =
    useState<DailyCementWithRelations | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useRealtimeCementRQ(initialDate);

  const handleRequestCorrection = useCallback(
    (entry: DailyCementWithRelations) => {
      if (isMockId(entry.id)) return; // no-op on dev mock rows
      setCorrectionEntry(entry);
    },
    []
  );

  const columns = useMemo(
    () => buildColumns(isAdmin, handleRequestCorrection),
    [isAdmin, handleRequestCorrection]
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: {
      sorting,
      globalFilter: customerFilter,
    },
    onGlobalFilterChange: setCustomerFilter,
    globalFilterFn: (row, _columnId, filterValue) => {
      const customerName = row.original.customer?.name ?? "";
      return customerName.includes(filterValue);
    },
  });

  const totals = useMemo(() => {
    const rows = table.getFilteredRowModel().rows;
    const activeRows = rows.filter((r) => !r.original.is_corrected);
    return {
      totalAmount: activeRows.reduce((s, r) => s + (r.original.total_amount ?? 0), 0),
      amountPaid: activeRows.reduce((s, r) => s + (r.original.amount_paid ?? 0), 0),
      remaining: activeRows.reduce((s, r) => s + (r.original.remaining_balance ?? 0), 0),
      transport: activeRows.reduce((s, r) => s + (r.original.transport_cost ?? 0), 0),
      totalTransport: activeRows.reduce((s, r) => s + ((r.original.quantity ?? 0) * (r.original.transport_cost ?? 0)), 0),
      totalProfit: isAdmin
        ? activeRows.reduce((s, r) => s + (r.original.total_profit ?? 0), 0)
        : null,
      profitLoss: isAdmin
        ? activeRows.reduce((s, r) => {
            if (r.original.cost_per_ton == null) return s;
            const totalCost = (r.original.cost_per_ton + r.original.transport_cost) * r.original.quantity;
            const totalSelling = r.original.price_per_ton * r.original.quantity;
            return s + (totalSelling - totalCost);
          }, 0)
        : null,
    };
  }, [table, isAdmin]);

  function handlePrint() {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>يومية الاسمنت - ${initialDate}</title>
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
          body { font-family: 'Cairo', sans-serif; padding: 20px; }
          h1 { text-align: center; font-size: 18px; margin-bottom: 4px; }
          h2 { text-align: center; font-size: 14px; color: #666; margin-bottom: 16px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
          th { background: #f5f5f5; font-weight: 600; }
          .corrected { text-decoration: line-through; opacity: 0.5; }
          .correction { background: #f0fdf4; }
          .totals { font-weight: 700; background: #fafafa; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>${APP_FULL_NAME}</h1>
        <h2>يومية الاسمنت - ${initialDate}</h2>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <>
      {isUsingMock && <DevMockBanner label="يومية تجريبية" />}
      <DataTableToolbar
        date={initialDate}
        onDateChange={onDateChange}
        onAddEntry={() => setAddDialogOpen(true)}
        onPrint={handlePrint}
        customerFilter={customerFilter}
        onCustomerFilterChange={setCustomerFilter}
      />

      <div ref={printRef}>
        <div className="hidden md:block rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-start whitespace-nowrap">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    className={cn(
                      row.original.is_corrected &&
                        "line-through opacity-50 bg-red-50",
                      row.original.correction_of_id &&
                        !row.original.is_corrected &&
                        "bg-green-50",
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="whitespace-nowrap">
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    لا توجد عمليات لهذا اليوم
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
            {table.getRowModel().rows?.length > 0 && (
              <TableFooter>
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={5} className="text-start">
                    الإجمالي
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(totals.totalAmount)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(totals.amountPaid)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-destructive">
                    {formatCurrency(totals.remaining)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(totals.transport)}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatCurrency(totals.totalTransport)}
                  </TableCell>
                  <TableCell />
                  {isAdmin && (
                    <>
                      <TableCell />
                      <TableCell />
                      <TableCell />
                      <TableCell className="whitespace-nowrap text-green-600">
                        {formatCurrency(totals.totalProfit)}
                      </TableCell>
                      <TableCell className={`whitespace-nowrap font-semibold ${(totals.profitLoss ?? 0) >= 0 ? "text-green-600" : "text-destructive"}`}>
                        {formatCurrency(totals.profitLoss)}
                      </TableCell>
                    </>
                  )}
                  <TableCell
                    colSpan={isAdmin ? 2 : 3}
                  />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </div>

        {/* Mobile card view */}
        <div className="md:hidden space-y-3">
          {table.getRowModel().rows?.length ? (
            <>
              {table.getRowModel().rows.map((row) => {
                const entry = row.original;
                const totalTransport = (entry.quantity ?? 0) * (entry.transport_cost ?? 0);
                const profitLoss =
                  isAdmin && entry.cost_per_ton != null
                    ? entry.price_per_ton * entry.quantity -
                      (entry.cost_per_ton + entry.transport_cost) * entry.quantity
                    : null;
                return (
                  <div
                    key={row.id}
                    className={cn(
                      "rounded-lg border p-3 space-y-2 text-sm",
                      entry.is_corrected && "line-through opacity-50 bg-red-50",
                      entry.correction_of_id && !entry.is_corrected && "bg-green-50",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            #{entry.row_number}
                          </span>
                          <span className="font-semibold truncate">
                            {entry.customer?.name ?? "—"}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {entry.product?.name ?? "—"} · {formatQuantity(entry.quantity)}
                        </div>
                      </div>
                      {entry.is_corrected ? (
                        <Badge variant="destructive" className="shrink-0">
                          تم التصحيح
                        </Badge>
                      ) : entry.correction_of_id ? (
                        <Badge className="bg-green-600 hover:bg-green-700 shrink-0">
                          تصحيح
                        </Badge>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                      <div>
                        <div className="text-[10px] text-muted-foreground">الإجمالي</div>
                        <div className="font-bold">
                          {formatCurrency(entry.total_amount)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">المدفوع</div>
                        <div>{formatCurrency(entry.amount_paid)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">المتبقي</div>
                        <div
                          className={
                            entry.remaining_balance > 0
                              ? "text-destructive font-medium"
                              : "text-green-600"
                          }
                        >
                          {formatCurrency(entry.remaining_balance)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">
                          سعر الطن
                        </div>
                        <div>{formatCurrency(entry.price_per_ton)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">
                          نقل الطن
                        </div>
                        <div>{formatCurrency(entry.transport_cost)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">
                          إجمالي النقل
                        </div>
                        <div>{formatCurrency(totalTransport)}</div>
                      </div>
                      {isAdmin && entry.total_profit != null && (
                        <>
                          <div>
                            <div className="text-[10px] text-muted-foreground">
                              إجمالي الربح
                            </div>
                            <div className="text-green-600 font-semibold">
                              {formatCurrency(entry.total_profit)}
                            </div>
                          </div>
                          {profitLoss != null && (
                            <div>
                              <div className="text-[10px] text-muted-foreground">
                                الربح/الخسارة
                              </div>
                              <div
                                className={
                                  profitLoss >= 0
                                    ? "text-green-600 font-semibold"
                                    : "text-destructive font-semibold"
                                }
                              >
                                {formatCurrency(profitLoss)}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {(entry.driver_name || entry.notes) && (
                      <div className="pt-2 border-t space-y-1">
                        {entry.driver_name && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">السائق: </span>
                            {entry.driver_name}
                          </div>
                        )}
                        {entry.notes && (
                          <div className="text-xs">
                            <span className="text-muted-foreground">ملاحظات: </span>
                            {entry.notes}
                          </div>
                        )}
                      </div>
                    )}

                    {!entry.is_corrected && !entry.correction_of_id && (
                      <div className="pt-2 border-t">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() => handleRequestCorrection(entry)}
                        >
                          طلب تصحيح
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Mobile totals card */}
              <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
                <div className="font-bold text-sm">الإجمالي</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-[10px] text-muted-foreground">المبيعات</div>
                    <div className="font-bold">
                      {formatCurrency(totals.totalAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">المدفوع</div>
                    <div className="font-bold">
                      {formatCurrency(totals.amountPaid)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">المتبقي</div>
                    <div className="font-bold text-destructive">
                      {formatCurrency(totals.remaining)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-foreground">
                      إجمالي النقل
                    </div>
                    <div className="font-bold">
                      {formatCurrency(totals.totalTransport)}
                    </div>
                  </div>
                  {isAdmin && totals.totalProfit != null && (
                    <>
                      <div>
                        <div className="text-[10px] text-muted-foreground">
                          الربح
                        </div>
                        <div className="font-bold text-green-600">
                          {formatCurrency(totals.totalProfit)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-muted-foreground">
                          الربح/الخسارة
                        </div>
                        <div
                          className={cn(
                            "font-bold",
                            (totals.profitLoss ?? 0) >= 0
                              ? "text-green-600"
                              : "text-destructive",
                          )}
                        >
                          {formatCurrency(totals.profitLoss)}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="rounded-lg border h-24 flex items-center justify-center text-muted-foreground text-sm">
              لا توجد عمليات لهذا اليوم
            </div>
          )}
        </div>
      </div>

      <AddEntryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        date={initialDate}
        userId={userId}
        isAdmin={isAdmin}
      />

      <CorrectionRequestDialog
        entry={correctionEntry}
        onClose={() => setCorrectionEntry(null)}
      />
    </>
  );
}
