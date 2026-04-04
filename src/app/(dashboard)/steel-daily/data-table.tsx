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
import { cn, formatCurrency, todayISO } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRealtimeCement } from "@/hooks/use-realtime";
import { buildColumns } from "../cement-daily/columns";
import { DataTableToolbar } from "../cement-daily/data-table-toolbar";
import { AddEntryDialog } from "./add-entry-dialog";
import { CorrectionRequestDialog } from "./correction-request-dialog";
import type { DailyCementWithRelations } from "@/types/database";
import type { Customer, Product } from "@/types/database";
import { APP_FULL_NAME } from "@/lib/constants";

interface DataTableProps {
  data: DailyCementWithRelations[];
  customers: Pick<Customer, "id" | "name">[];
  products: Pick<Product, "id" | "name">[];
  initialDate: string;
  onDateChange: (date: string) => void;
}

export function DataTable({
  data,
  customers,
  products,
  initialDate,
  onDateChange,
}: DataTableProps) {
  const { isAdmin, userId } = useUser();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [localCustomers, setLocalCustomers] = useState(customers);

  const handleCustomerAdded = useCallback(
    (customer: Pick<Customer, "id" | "name">) => {
      setLocalCustomers((prev) => [...prev, customer]);
    },
    []
  );
  const [correctionEntry, setCorrectionEntry] =
    useState<DailyCementWithRelations | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useRealtimeCement(initialDate);

  const handleRequestCorrection = useCallback(
    (entry: DailyCementWithRelations) => {
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
        <title>يومية الحديد - ${initialDate}</title>
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
        <h2>يومية الحديد - ${initialDate}</h2>
        ${printContent.innerHTML}
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  }

  return (
    <>
      <DataTableToolbar
        date={initialDate}
        onDateChange={onDateChange}
        onAddEntry={() => setAddDialogOpen(true)}
        onPrint={handlePrint}
        customerFilter={customerFilter}
        onCustomerFilterChange={setCustomerFilter}
      />

      <div ref={printRef}>
        <div className="rounded-md border">
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
      </div>

      <AddEntryDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        customers={localCustomers}
        products={products}
        date={initialDate}
        userId={userId}
        isAdmin={isAdmin}
        onCustomerAdded={handleCustomerAdded}
      />

      <CorrectionRequestDialog
        entry={correctionEntry}
        onClose={() => setCorrectionEntry(null)}
        customers={localCustomers}
        products={products}
      />
    </>
  );
}
