"use client";

import { useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
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
import { Button } from "@/components/ui/button";
import { BOND_TABLE_HEADERS, MESSAGES } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useRealtimeBonds } from "@/hooks/use-realtime";
import { AddBondDialog } from "./add-bond-dialog";
import type { DailyBondWithRelations, Customer } from "@/types/database";

interface BondsTableProps {
  data: DailyBondWithRelations[];
  customers: Pick<Customer, "id" | "name">[];
  date: string;
}

export function BondsTable({ data, customers, date }: BondsTableProps) {
  const { isAdmin, userId } = useUser();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  useRealtimeBonds(date);

  const totalBonds = useMemo(
    () => data.reduce((sum, bond) => sum + (bond.amount ?? 0), 0),
    [data]
  );

  async function handleDelete(id: string) {
    const { error } = await supabase.from("daily_bonds").delete().eq("id", id);
    if (error) {
      toast.error(MESSAGES.error);
      return;
    }
    toast.success(MESSAGES.bondDeleted);
    router.refresh();
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">جدول البونات</h3>
        <Button
          size="sm"
          className="gap-2"
          onClick={() => setAddDialogOpen(true)}
        >
          <Plus className="h-4 w-4" />
          إضافة بون
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-start w-[50px]">
                {BOND_TABLE_HEADERS.rowNum}
              </TableHead>
              <TableHead className="text-start">
                {BOND_TABLE_HEADERS.customer}
              </TableHead>
              <TableHead className="text-start">
                {BOND_TABLE_HEADERS.amount}
              </TableHead>
              <TableHead className="text-start">
                {BOND_TABLE_HEADERS.bondNumber}
              </TableHead>
              <TableHead className="text-start">
                {BOND_TABLE_HEADERS.notes}
              </TableHead>
              <TableHead className="text-start">
                {BOND_TABLE_HEADERS.createdBy}
              </TableHead>
              {isAdmin && (
                <TableHead className="text-start">
                  {BOND_TABLE_HEADERS.actions}
                </TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length ? (
              data.map((bond, index) => (
                <TableRow key={bond.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>{bond.customer?.name ?? "—"}</TableCell>
                  <TableCell className="font-semibold">
                    {formatCurrency(bond.amount)}
                  </TableCell>
                  <TableCell>{bond.bond_number ?? "—"}</TableCell>
                  <TableCell>
                    {bond.notes ? (
                      <span
                        className="max-w-[150px] truncate block"
                        title={bond.notes}
                      >
                        {bond.notes}
                      </span>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell>{bond.creator?.full_name ?? "—"}</TableCell>
                  {isAdmin && (
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => handleDelete(bond.id)}
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
                  colSpan={isAdmin ? 7 : 6}
                  className="h-16 text-center text-muted-foreground"
                >
                  لا توجد بونات لهذا اليوم
                </TableCell>
              </TableRow>
            )}
          </TableBody>
          {data.length > 0 && (
            <TableFooter>
              <TableRow className="font-bold bg-muted/50">
                <TableCell colSpan={2} className="text-start">
                  إجمالي البونات
                </TableCell>
                <TableCell className="whitespace-nowrap font-bold">
                  {formatCurrency(totalBonds)}
                </TableCell>
                <TableCell colSpan={isAdmin ? 4 : 3} />
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>

      <AddBondDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        customers={customers}
        date={date}
        userId={userId}
      />
    </div>
  );
}
