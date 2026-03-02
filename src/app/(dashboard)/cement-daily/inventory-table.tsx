"use client";

import { useMemo, useState } from "react";
import { Save } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
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
import { INVENTORY_TABLE_HEADERS, MESSAGES } from "@/lib/constants";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRealtimeInventory } from "@/hooks/use-realtime";
import type {
  DailyInventoryWithProduct,
  DailyCementWithRelations,
  Product,
} from "@/types/database";

interface InventoryTableProps {
  inventory: DailyInventoryWithProduct[];
  products: Pick<Product, "id" | "name">[];
  entries: DailyCementWithRelations[];
  date: string;
}

export function InventoryTable({
  inventory,
  products,
  entries,
  date,
}: InventoryTableProps) {
  const { isAdmin, userId } = useUser();
  const supabase = createClient();
  const router = useRouter();

  useRealtimeInventory(date);

  // Compute sold per product from daily_cement entries
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

  // Build rows: one per product
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

  // State for editable fields
  const [editedValues, setEditedValues] = useState<
    Record<
      string,
      { added?: string; cost_price?: string; previous_balance?: string }
    >
  >({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

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

  async function handleSave(productId: string) {
    const edited = editedValues[productId];
    if (!edited) return;

    const row = rows.find((r) => r.product.id === productId);
    if (!row) return;

    setSaving((prev) => ({ ...prev, [productId]: true }));

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

    const { error } = row.inventory_id
      ? await supabase
          .from("daily_inventory")
          .update({
            previous_balance: upsertData.previous_balance,
            added: upsertData.added,
            cost_price: upsertData.cost_price,
            updated_at: new Date().toISOString(),
          })
          .eq("id", row.inventory_id)
      : await supabase.from("daily_inventory").insert(upsertData);

    setSaving((prev) => ({ ...prev, [productId]: false }));

    if (error) {
      toast.error(MESSAGES.error);
      return;
    }

    toast.success(MESSAGES.inventoryUpdated);
    setEditedValues((prev) => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
    router.refresh();
  }

  // Totals
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
                        disabled={saving[row.product.id]}
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
