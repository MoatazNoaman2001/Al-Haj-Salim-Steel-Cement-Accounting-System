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
import { DevMockBanner } from "@/components/dev-mock-banner";
import { useUser } from "@/hooks/use-user";
import { useDailyInventory, useCementProducts, useCementEntries, useCustomers } from "@/hooks/use-cement-daily-queries";
import { useUpsertInventory } from "@/hooks/use-cement-daily-mutations";
import { useRealtimeInventoryRQ } from "@/hooks/use-cement-daily-realtime";
import { IS_DEV_MOCK_ENABLED, mockInventory, mockCementEntries } from "@/lib/dev-mocks";

interface InventoryTableProps {
  date: string;
  category?: "cement" | "steel";
}

export function InventoryTable({ date, category = "cement" }: InventoryTableProps) {
  const { isAdmin, userId } = useUser();
  const { data: realInventory = [] } = useDailyInventory(date);
  const { data: products = [] } = useCementProducts(category);
  const { data: realEntries = [] } = useCementEntries(date);
  const { data: customers = [] } = useCustomers();
  const upsertInventory = useUpsertInventory(date);

  useRealtimeInventoryRQ(date);

  // Dev-only: fallback to mock inventory + mock sales so the جدول البونات
  // shows realistic previous/added/sold/cost values
  const inventory = useMemo(() => {
    if (realInventory.length > 0) return realInventory;
    if (!IS_DEV_MOCK_ENABLED) return realInventory;
    return mockInventory(date, products, userId);
  }, [realInventory, date, products, userId]);

  const entries = useMemo(() => {
    if (realEntries.length > 0) return realEntries;
    if (!IS_DEV_MOCK_ENABLED) return realEntries;
    return mockCementEntries(date, products, customers, userId);
  }, [realEntries, date, products, customers, userId]);

  const isUsingMock =
    (inventory !== realInventory && inventory.length > 0) ||
    (entries !== realEntries && entries.length > 0);

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
      {isUsingMock && <DevMockBanner label="جرد تجريبي" />}
      <h3 className="text-lg font-semibold mb-3">جدول البونات (المخزون)</h3>
      <div className="hidden md:block rounded-md border overflow-x-auto">
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

      {/* Mobile card view */}
      <div className="md:hidden space-y-3">
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
          const currentRemainingCost = currentNetRemaining * currentCostPrice;

          return (
            <div
              key={row.product.id}
              className="rounded-lg border p-3 space-y-3"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">{row.product.name}</div>
                <div className="text-right">
                  <div className="text-[10px] text-muted-foreground">
                    {INVENTORY_TABLE_HEADERS.netRemaining}
                  </div>
                  <div className="font-bold text-base">
                    {formatQuantity(currentNetRemaining)}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">
                    {INVENTORY_TABLE_HEADERS.previousBalance}
                  </div>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    className="h-8 text-left"
                    dir="ltr"
                    defaultValue={row.previous_balance}
                    onChange={(e) =>
                      handleFieldChange(
                        row.product.id,
                        "previous_balance",
                        e.target.value,
                      )
                    }
                  />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">
                    {INVENTORY_TABLE_HEADERS.added}
                  </div>
                  <Input
                    type="number"
                    step="0.001"
                    min="0"
                    className="h-8 text-left"
                    dir="ltr"
                    defaultValue={row.added}
                    onChange={(e) =>
                      handleFieldChange(
                        row.product.id,
                        "added",
                        e.target.value,
                      )
                    }
                  />
                </div>
                <div>
                  <div className="text-[10px] text-muted-foreground mb-1">
                    {INVENTORY_TABLE_HEADERS.sold}
                  </div>
                  <div className="h-8 flex items-center font-semibold text-red-600">
                    {formatQuantity(row.sold)}
                  </div>
                </div>
                {isAdmin && (
                  <div>
                    <div className="text-[10px] text-muted-foreground mb-1">
                      {INVENTORY_TABLE_HEADERS.costPrice}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      className="h-8 text-left"
                      dir="ltr"
                      defaultValue={row.cost_price}
                      onChange={(e) =>
                        handleFieldChange(
                          row.product.id,
                          "cost_price",
                          e.target.value,
                        )
                      }
                    />
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="flex items-center justify-between pt-2 border-t">
                  <span className="text-xs text-muted-foreground">
                    {INVENTORY_TABLE_HEADERS.remainingCost}
                  </span>
                  <span className="font-semibold">
                    {formatCurrency(currentRemainingCost)}
                  </span>
                </div>
              )}

              {hasEdits(row.product.id) && (
                <Button
                  size="sm"
                  className="w-full gap-2"
                  disabled={upsertInventory.isPending}
                  onClick={() => handleSave(row.product.id)}
                >
                  <Save className="h-4 w-4" />
                  حفظ
                </Button>
              )}
            </div>
          );
        })}

        {/* Mobile totals card */}
        <div className="rounded-lg border bg-muted/50 p-3 space-y-2">
          <div className="font-bold text-sm">الإجمالي</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <div className="text-[10px] text-muted-foreground">
                {INVENTORY_TABLE_HEADERS.previousBalance}
              </div>
              <div className="font-bold">
                {formatQuantity(totals.previous_balance)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">
                {INVENTORY_TABLE_HEADERS.added}
              </div>
              <div className="font-bold">{formatQuantity(totals.added)}</div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">
                {INVENTORY_TABLE_HEADERS.sold}
              </div>
              <div className="font-bold text-red-600">
                {formatQuantity(totals.sold)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-muted-foreground">
                {INVENTORY_TABLE_HEADERS.netRemaining}
              </div>
              <div className="font-bold">
                {formatQuantity(totals.net_remaining)}
              </div>
            </div>
            {isAdmin && (
              <div className="col-span-2">
                <div className="text-[10px] text-muted-foreground">
                  {INVENTORY_TABLE_HEADERS.remainingCost}
                </div>
                <div className="font-bold">
                  {formatCurrency(totals.remaining_cost)}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
