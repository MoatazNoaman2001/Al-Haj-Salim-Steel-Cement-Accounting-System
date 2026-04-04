"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { INVENTORY_TABLE_HEADERS } from "@/lib/constants";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useDailyInventory, useCementProducts, useCementEntries } from "@/hooks/use-cement-daily-queries";
import { useUpsertInventory } from "@/hooks/use-cement-daily-mutations";
import { useRealtimeInventoryRQ } from "@/hooks/use-cement-daily-realtime";

interface InventoryTableProps {
  date: string;
}

export function InventoryTable({ date }: InventoryTableProps) {
  const { isAdmin, userId } = useUser();
  const { data: inventory = [] } = useDailyInventory(date);
  const { data: products = [] } = useCementProducts();
  const { data: entries = [] } = useCementEntries(date);
  const upsertInventory = useUpsertInventory(date);

  useRealtimeInventoryRQ(date);

  const soldByProduct = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of entries) {
      if (!entry.is_corrected) {
        map[entry.product_id] =
          (map[entry.product_id] || 0) + entry.quantity;
      }
    }
    return map;
  }, [entries]);

  const rows = useMemo(() => {
    return products.map((product) => {
      const inv = inventory.find((i) => i.product_id === product.id);
      const previous_balance = inv?.previous_balance ?? 0;
      const added = inv?.added ?? 0;
      const sold = soldByProduct[product.id] ?? 0;
      const net_remaining = previous_balance + added - sold;
      const cost_price = inv?.cost_price ?? 0;
      const remaining_cost = net_remaining * cost_price;

      return {
        product,
        previous_balance,
        added,
        sold,
        net_remaining,
        cost_price,
        remaining_cost,
        inventory_id: inv?.id ?? null,
      };
    });
  }, [products, inventory, soldByProduct]);

  const [editedValues, setEditedValues] = useState<
    Record<
      string,
      { added?: string; cost_price?: string; previous_balance?: string }
    >
  >({});

  function handleFieldChange(
    productId: string,
    field: "added" | "cost_price" | "previous_balance",
    value: string
  ) {
    setEditedValues((prev) => ({
      ...prev,
      [productId]: { ...prev[productId], [field]: value },
    }));
  }

  function handleSave(productId: string) {
    const edited = editedValues[productId];
    if (!edited) return;

    const row = rows.find((r) => r.product.id === productId);
    if (!row) return;

    const upsertData = {
      entry_date: date,
      product_id: productId,
      previous_balance:
        edited.previous_balance != null
          ? Number(edited.previous_balance)
          : row.previous_balance,
      added: edited.added != null ? Number(edited.added) : row.added,
      cost_price:
        edited.cost_price != null
          ? Number(edited.cost_price)
          : row.cost_price,
      created_by: userId,
    };

    upsertInventory.mutate(
      { inventoryId: row.inventory_id, upsertData },
      {
        onSuccess: () => {
          setEditedValues((prev) => {
            const next = { ...prev };
            delete next[productId];
            return next;
          });
        },
      }
    );
  }

  const totals = useMemo(
    () => ({
      previous_balance: rows.reduce((sum, r) => sum + r.previous_balance, 0),
      added: rows.reduce((sum, r) => sum + r.added, 0),
      sold: rows.reduce((sum, r) => sum + r.sold, 0),
      net_remaining: rows.reduce((sum, r) => sum + r.net_remaining, 0),
      remaining_cost: rows.reduce((sum, r) => sum + r.remaining_cost, 0),
    }),
    [rows]
  );

  const hasEdits = (productId: string) => {
    const e = editedValues[productId];
    return (
      e &&
      (e.added != null ||
        e.cost_price != null ||
        e.previous_balance != null)
    );
  };

  return (
    <div className="mt-8">
      <h3 className="text-lg font-semibold mb-3">جدول البونات (المخزون)</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start">
                {INVENTORY_TABLE_HEADERS.product}
              </TableHead>
              <TableHead className="text-start">
                {INVENTORY_TABLE_HEADERS.previousBalance}
              </TableHead>
              <TableHead className="text-start">
                {INVENTORY_TABLE_HEADERS.added}
              </TableHead>
              <TableHead className="text-start">
                {INVENTORY_TABLE_HEADERS.sold}
              </TableHead>
              <TableHead className="text-start">
                {INVENTORY_TABLE_HEADERS.netRemaining}
              </TableHead>
              {isAdmin && (
                <>
                  <TableHead className="text-start">
                    {INVENTORY_TABLE_HEADERS.costPrice}
                  </TableHead>
                  <TableHead className="text-start">
                    {INVENTORY_TABLE_HEADERS.remainingCost}
                  </TableHead>
                </>
              )}
              <TableHead className="text-start w-[60px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const edited = editedValues[row.product.id];
              const currentAdded =
                edited?.added != null ? Number(edited.added) : row.added;
              const currentPrevBalance =
                edited?.previous_balance != null
                  ? Number(edited.previous_balance)
                  : row.previous_balance;
              const currentNetRemaining =
                currentPrevBalance + currentAdded - row.sold;
              const currentCostPrice =
                edited?.cost_price != null
                  ? Number(edited.cost_price)
                  : row.cost_price;
              const currentRemainingCost =
                currentNetRemaining * currentCostPrice;

              return (
                <TableRow key={row.product.id}>
                  <TableCell className="font-medium">
                    {row.product.name}
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      className="w-24 h-8 text-left"
                      dir="ltr"
                      defaultValue={row.previous_balance}
                      onChange={(e) =>
                        handleFieldChange(
                          row.product.id,
                          "previous_balance",
                          e.target.value
                        )
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      step="0.001"
                      min="0"
                      className="w-24 h-8 text-left"
                      dir="ltr"
                      defaultValue={row.added}
                      onChange={(e) =>
                        handleFieldChange(
                          row.product.id,
                          "added",
                          e.target.value
                        )
                      }
                    />
                  </TableCell>
                  <TableCell className="font-semibold text-red-600">
                    {formatQuantity(row.sold)}
                  </TableCell>
                  <TableCell className="font-bold">
                    {formatQuantity(currentNetRemaining)}
                  </TableCell>
                  {isAdmin && (
                    <>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-28 h-8 text-left"
                          dir="ltr"
                          defaultValue={row.cost_price}
                          onChange={(e) =>
                            handleFieldChange(
                              row.product.id,
                              "cost_price",
                              e.target.value
                            )
                          }
                        />
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(currentRemainingCost)}
                      </TableCell>
                    </>
                  )}
                  <TableCell>
                    {hasEdits(row.product.id) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={upsertInventory.isPending}
                        onClick={() => handleSave(row.product.id)}
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
          <TableFooter>
            <TableRow className="font-bold bg-muted/50">
              <TableCell>الإجمالي</TableCell>
              <TableCell>{formatQuantity(totals.previous_balance)}</TableCell>
              <TableCell>{formatQuantity(totals.added)}</TableCell>
              <TableCell className="text-red-600">
                {formatQuantity(totals.sold)}
              </TableCell>
              <TableCell>{formatQuantity(totals.net_remaining)}</TableCell>
              {isAdmin && (
                <>
                  <TableCell>—</TableCell>
                  <TableCell>
                    {formatCurrency(totals.remaining_cost)}
                  </TableCell>
                </>
              )}
              <TableCell />
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </div>
  );
}
