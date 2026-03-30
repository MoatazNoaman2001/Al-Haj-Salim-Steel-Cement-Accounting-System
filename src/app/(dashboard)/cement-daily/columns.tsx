"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TABLE_HEADERS } from "@/lib/constants";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import type { DailyCementWithRelations } from "@/types/database";

function SortableHeader({
  column,
  label,
}: {
  column: { toggleSorting: (desc: boolean) => void; getIsSorted: () => string | false };
  label: string;
}) {
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ms-3 h-8"
      onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
    >
      {label}
      <ArrowUpDown className="ms-1 h-3 w-3" />
    </Button>
  );
}

export function getBaseColumns(
  onRequestCorrection: (entry: DailyCementWithRelations) => void
): ColumnDef<DailyCementWithRelations>[] {
  return [
    {
      accessorKey: "row_number",
      header: TABLE_HEADERS.rowNum,
      size: 50,
      enableSorting: false,
    },
    {
      accessorKey: "customer.name",
      id: "customer_name",
      header: ({ column }) => (
        <SortableHeader column={column} label={TABLE_HEADERS.customer} />
      ),
      cell: ({ row }) => row.original.customer?.name ?? "—",
      size: 150,
    },
    {
      accessorKey: "product.name",
      id: "product_name",
      header: TABLE_HEADERS.product,
      cell: ({ row }) => row.original.product?.name ?? "—",
      size: 120,
    },
    {
      accessorKey: "quantity",
      header: ({ column }) => (
        <SortableHeader column={column} label={TABLE_HEADERS.quantity} />
      ),
      cell: ({ getValue }) => formatQuantity(getValue() as number),
      size: 90,
    },
    {
      accessorKey: "price_per_ton",
      header: TABLE_HEADERS.pricePerTon,
      cell: ({ getValue }) => formatCurrency(getValue() as number),
      size: 110,
    },
    {
      accessorKey: "total_amount",
      header: ({ column }) => (
        <SortableHeader column={column} label={TABLE_HEADERS.total} />
      ),
      cell: ({ getValue }) => (
        <span className="font-semibold">
          {formatCurrency(getValue() as number)}
        </span>
      ),
      size: 120,
    },
    {
      accessorKey: "amount_paid",
      header: TABLE_HEADERS.amountPaid,
      cell: ({ getValue }) => formatCurrency(getValue() as number),
      size: 110,
    },
    {
      accessorKey: "remaining_balance",
      header: TABLE_HEADERS.remaining,
      cell: ({ getValue }) => {
        const val = getValue() as number;
        return (
          <span className={val > 0 ? "text-destructive font-medium" : "text-green-600"}>
            {formatCurrency(val)}
          </span>
        );
      },
      size: 110,
    },
    {
      accessorKey: "transport_cost",
      header: TABLE_HEADERS.transportCost,
      cell: ({ getValue }) => formatCurrency(getValue() as number),
      size: 100,
    },
    {
      id: "total_transport",
      header: TABLE_HEADERS.totalTransport,
      cell: ({ row }) => {
        const val = (row.original.quantity ?? 0) * (row.original.transport_cost ?? 0);
        return formatCurrency(val);
      },
      size: 120,
    },
    {
      accessorKey: "driver_name",
      header: TABLE_HEADERS.driver,
      cell: ({ getValue }) => (getValue() as string | null) ?? "—",
      size: 100,
    },
    {
      accessorKey: "notes",
      header: TABLE_HEADERS.notes,
      cell: ({ getValue }) => {
        const val = getValue() as string | null;
        return val ? (
          <span className="max-w-[150px] truncate block" title={val}>
            {val}
          </span>
        ) : (
          "—"
        );
      },
      size: 150,
    },
    {
      accessorKey: "creator.full_name",
      id: "creator_name",
      header: TABLE_HEADERS.createdBy,
      cell: ({ row }) => row.original.creator?.full_name ?? "—",
      size: 100,
    },
    {
      id: "status",
      header: TABLE_HEADERS.status,
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.is_corrected) {
          return <Badge variant="destructive">تم التصحيح</Badge>;
        }
        if (entry.correction_of_id) {
          return (
            <Badge className="bg-green-600 hover:bg-green-700">تصحيح</Badge>
          );
        }
        return null;
      },
      size: 90,
    },
    {
      id: "actions",
      header: TABLE_HEADERS.actions,
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.is_corrected || entry.correction_of_id) return null;
        return (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => onRequestCorrection(entry)}
          >
            طلب تصحيح
          </Button>
        );
      },
      size: 100,
    },
  ];
}

export function getAdminColumns(): ColumnDef<DailyCementWithRelations>[] {
  return [
    {
      accessorKey: "cost_per_ton",
      header: TABLE_HEADERS.costPerTon,
      cell: ({ getValue }) => formatCurrency(getValue() as number | null),
      size: 110,
    },
    {
      accessorKey: "profit_per_ton",
      header: TABLE_HEADERS.profitPerTon,
      cell: ({ getValue }) => {
        const val = getValue() as number | null;
        return (
          <span className={val != null && val > 0 ? "text-green-600 font-medium" : ""}>
            {formatCurrency(val)}
          </span>
        );
      },
      size: 100,
    },
    {
      accessorKey: "total_profit",
      header: TABLE_HEADERS.totalProfit,
      cell: ({ getValue }) => {
        const val = getValue() as number | null;
        return (
          <span className={val != null && val > 0 ? "text-green-600 font-semibold" : ""}>
            {formatCurrency(val)}
          </span>
        );
      },
      size: 120,
    },
    {
      id: "profit_loss",
      header: TABLE_HEADERS.profitLoss,
      cell: ({ row }) => {
        const entry = row.original;
        if (entry.cost_per_ton == null) return "—";
        const totalCost = (entry.cost_per_ton + entry.transport_cost) * entry.quantity;
        const totalSelling = entry.price_per_ton * entry.quantity;
        const profitLoss = totalSelling - totalCost;
        return (
          <span className={profitLoss >= 0 ? "text-green-600 font-semibold" : "text-destructive font-semibold"}>
            {formatCurrency(profitLoss)}
          </span>
        );
      },
      size: 120,
    },
  ];
}

export function buildColumns(
  isAdmin: boolean,
  onRequestCorrection: (entry: DailyCementWithRelations) => void
): ColumnDef<DailyCementWithRelations>[] {
  const base = getBaseColumns(onRequestCorrection);
  if (!isAdmin) return base;

  // Insert admin columns after "remaining_balance" (index 7)
  const adminCols = getAdminColumns();
  const insertIndex = base.findIndex((c) => c.id === "status");
  return [
    ...base.slice(0, insertIndex),
    ...adminCols,
    ...base.slice(insertIndex),
  ];
}
