"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export interface ExportColumnOption {
  key: string;
  label: string;
  default?: boolean;
  /** Locked columns cannot be toggled off (e.g. date, balance). */
  locked?: boolean;
}

export interface ExportOptions {
  /** YYYY-MM-DD; empty string means "no lower bound". */
  fromDate: string;
  toDate: string;
  columns: Record<string, boolean>;
  groupByMonth: boolean;
  headerNote: string;
}

interface ExportOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  /** Preselect the date inputs. Pass the data's earliest/latest entry date. */
  defaultFromDate?: string;
  defaultToDate?: string;
  columns: ExportColumnOption[];
  showGroupByMonth?: boolean;
  showHeaderNote?: boolean;
  onExport: (opts: ExportOptions) => void;
}

export function ExportOptionsDialog({
  open,
  onOpenChange,
  title,
  description,
  defaultFromDate = "",
  defaultToDate = "",
  columns,
  showGroupByMonth = true,
  showHeaderNote = true,
  onExport,
}: ExportOptionsDialogProps) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(defaultToDate);
  const [headerNote, setHeaderNote] = useState("");
  const [groupByMonth, setGroupByMonth] = useState(true);
  const [columnState, setColumnState] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(columns.map((c) => [c.key, c.default ?? true])),
  );

  // Re-sync when the dialog re-opens with new defaults.
  useEffect(() => {
    if (!open) return;
    setFromDate(defaultFromDate);
    setToDate(defaultToDate);
    setHeaderNote("");
    setGroupByMonth(true);
    setColumnState(
      Object.fromEntries(columns.map((c) => [c.key, c.default ?? true])),
    );
  }, [open, defaultFromDate, defaultToDate, columns]);

  function toggle(key: string) {
    const col = columns.find((c) => c.key === key);
    if (col?.locked) return;
    setColumnState((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function selectAll() {
    setColumnState(Object.fromEntries(columns.map((c) => [c.key, true])));
  }

  function selectNone() {
    setColumnState(
      Object.fromEntries(
        columns.map((c) => [c.key, c.locked ? true : false]),
      ),
    );
  }

  function handleExport() {
    onExport({
      fromDate: fromDate || "",
      toDate: toDate || "",
      columns: columnState,
      groupByMonth,
      headerNote: headerNote.trim(),
    });
    onOpenChange(false);
  }

  const enabledColumnCount = Object.values(columnState).filter(Boolean).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pe-3">
          <div className="space-y-5">
            {/* Date range */}
            <section className="space-y-2">
              <h4 className="text-sm font-semibold">نطاق التاريخ</h4>
              <p className="text-xs text-muted-foreground">
                اترك الحقول فارغة لتصدير كل الحركات.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="exp-from" className="text-xs">من</Label>
                  <Input
                    id="exp-from"
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    dir="ltr"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="exp-to" className="text-xs">إلى</Label>
                  <Input
                    id="exp-to"
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    dir="ltr"
                  />
                </div>
              </div>
              {(fromDate || toDate) && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setFromDate(""); setToDate(""); }}
                  className="h-7 px-2 text-xs"
                >
                  مسح التاريخ
                </Button>
              )}
            </section>

            <Separator />

            {/* Columns */}
            <section className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold">الأعمدة المعروضة</h4>
                <div className="flex gap-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectAll}
                    className="h-7 px-2 text-xs"
                  >
                    تحديد الكل
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={selectNone}
                    className="h-7 px-2 text-xs"
                  >
                    إلغاء التحديد
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                {enabledColumnCount} من {columns.length} عمود محدد.
              </p>
              <div className="grid grid-cols-2 gap-2">
                {columns.map((col) => {
                  const checked = columnState[col.key] ?? false;
                  return (
                    <label
                      key={col.key}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                        col.locked
                          ? "bg-muted/40 cursor-default"
                          : "cursor-pointer hover:bg-accent",
                        checked && !col.locked ? "border-primary/40 bg-primary/5" : "",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary"
                        checked={checked}
                        disabled={col.locked}
                        onChange={() => toggle(col.key)}
                      />
                      <span className={cn("flex-1", col.locked && "text-muted-foreground")}>
                        {col.label}
                      </span>
                      {col.locked && (
                        <span className="text-[10px] text-muted-foreground">ثابت</span>
                      )}
                    </label>
                  );
                })}
              </div>
            </section>

            {showGroupByMonth && (
              <>
                <Separator />
                <section>
                  <label className="flex items-start gap-3 cursor-pointer rounded-md border px-3 py-2 hover:bg-accent">
                    <input
                      type="checkbox"
                      className="mt-0.5 h-4 w-4 accent-primary"
                      checked={groupByMonth}
                      onChange={(e) => setGroupByMonth(e.target.checked)}
                    />
                    <div>
                      <div className="text-sm font-medium">إضافة ملخص شهري</div>
                      <div className="text-xs text-muted-foreground">
                        ورقة منفصلة بإجمالي كل شهر (مدين / دائن / صافي).
                      </div>
                    </div>
                  </label>
                </section>
              </>
            )}

            {showHeaderNote && (
              <>
                <Separator />
                <section className="space-y-1">
                  <Label htmlFor="exp-note" className="text-sm font-semibold">
                    ملاحظة في الترويسة (اختياري)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    تظهر تحت اسم الشركة في أعلى التقرير.
                  </p>
                  <Textarea
                    id="exp-note"
                    value={headerNote}
                    onChange={(e) => setHeaderNote(e.target.value)}
                    rows={2}
                    placeholder="مثال: تقرير ربع سنوي للمراجعة الداخلية"
                  />
                </section>
              </>
            )}
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
          <Button
            type="button"
            onClick={handleExport}
            disabled={enabledColumnCount === 0}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            تصدير Excel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
