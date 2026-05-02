import * as XLSX from "xlsx";
import * as XLSXStyle from "xlsx-js-style";
import { saveAs } from "file-saver";
import { APP_FULL_NAME } from "@/lib/constants";
import type { ExportOptions } from "@/components/export-options-dialog";

// =====================================================
// Pro Excel helpers (xlsx-js-style)
// =====================================================
// Shared building blocks for the styled supplier/reservation reports.
// Plain (non-styled) reports below still use the lightweight `xlsx` lib.

const COLORS = {
  titleBg: "1E3A8A",      // navy
  titleFg: "FFFFFF",
  subBg: "E0E7FF",        // very light indigo
  headerBg: "DBEAFE",     // light blue
  totalBg: "F1F5F9",      // slate-100
  alt: "F8FAFC",          // slate-50 (zebra)
  border: "94A3B8",       // slate-400
  red: "DC2626",
  green: "16A34A",
  muted: "475569",        // slate-600
};

const FMT_CURRENCY = '#,##0.00;[Red]-#,##0.00;"-"';
const FMT_QUANTITY = "#,##0.##";
const FMT_DATE = "yyyy-mm-dd";

type CellInput = string | number | null | undefined | StyledCell;

interface StyledCell {
  v: string | number | null | undefined;
  t?: "s" | "n" | "d";
  numFmt?: string;
  font?: { bold?: boolean; size?: number; color?: string; italic?: boolean };
  fill?: string;
  align?: "left" | "right" | "center";
  border?: BorderSpec;
  wrap?: boolean;
}

interface BorderSpec {
  top?: BorderStyle;
  bottom?: BorderStyle;
  left?: BorderStyle;
  right?: BorderStyle;
  all?: BorderStyle;
}

type BorderStyle = "thin" | "medium" | "thick" | "double" | "dotted";

function makeCell(input: CellInput) {
  if (input == null) return { v: "", t: "s", s: baseStyle({}) };
  if (typeof input === "string" || typeof input === "number") {
    return {
      v: input,
      t: typeof input === "number" ? "n" : "s",
      s: baseStyle({}),
    };
  }
  // StyledCell
  const v = input.v ?? "";
  const t = input.t ?? (typeof v === "number" ? "n" : "s");
  return {
    v,
    t,
    z: input.numFmt,
    s: baseStyle(input),
  };
}

function baseStyle(c: Partial<StyledCell>) {
  const borderColor = { rgb: COLORS.border };
  const border: Record<string, { style: BorderStyle; color: { rgb: string } }> = {};
  if (c.border?.all) {
    border.top = { style: c.border.all, color: borderColor };
    border.bottom = { style: c.border.all, color: borderColor };
    border.left = { style: c.border.all, color: borderColor };
    border.right = { style: c.border.all, color: borderColor };
  }
  if (c.border?.top) border.top = { style: c.border.top, color: borderColor };
  if (c.border?.bottom) border.bottom = { style: c.border.bottom, color: borderColor };
  if (c.border?.left) border.left = { style: c.border.left, color: borderColor };
  if (c.border?.right) border.right = { style: c.border.right, color: borderColor };

  const align = c.align ?? "right";
  return {
    font: {
      name: "Cairo",
      sz: c.font?.size ?? 11,
      bold: c.font?.bold ?? false,
      italic: c.font?.italic ?? false,
      color: c.font?.color ? { rgb: c.font.color } : undefined,
    },
    fill: c.fill ? { fgColor: { rgb: c.fill } } : undefined,
    alignment: {
      horizontal: align,
      vertical: "center",
      wrapText: c.wrap ?? false,
      readingOrder: 2, // RTL
    },
    border: Object.keys(border).length ? border : undefined,
    numFmt: c.numFmt,
  };
}

function titleCell(value: string): StyledCell {
  return {
    v: value,
    font: { bold: true, size: 16, color: COLORS.titleFg },
    fill: COLORS.titleBg,
    align: "center",
  };
}

function subTitleCell(value: string): StyledCell {
  return {
    v: value,
    font: { bold: true, size: 11, color: COLORS.muted },
    fill: COLORS.subBg,
    align: "center",
    border: { all: "thin" },
  };
}

function noteCell(value: string): StyledCell {
  return {
    v: value,
    font: { italic: true, size: 10, color: COLORS.muted },
    align: "center",
    wrap: true,
  };
}

function headerCell(value: string): StyledCell {
  return {
    v: value,
    font: { bold: true, size: 11 },
    fill: COLORS.headerBg,
    align: "center",
    border: { all: "thin" },
  };
}

function dataCell(
  value: string | number | null | undefined,
  opts: { numFmt?: string; align?: "left" | "right" | "center"; zebra?: boolean; color?: string; bold?: boolean } = {},
): StyledCell {
  return {
    v: value,
    numFmt: opts.numFmt,
    align: opts.align ?? (typeof value === "number" ? "right" : "right"),
    fill: opts.zebra ? COLORS.alt : undefined,
    font: { color: opts.color, bold: opts.bold },
    border: { all: "thin" },
  };
}

function totalCell(
  value: string | number | null | undefined,
  opts: { numFmt?: string; align?: "left" | "right" | "center"; color?: string } = {},
): StyledCell {
  return {
    v: value,
    numFmt: opts.numFmt,
    font: { bold: true, size: 11, color: opts.color },
    fill: COLORS.totalBg,
    align: opts.align ?? (typeof value === "number" ? "right" : "right"),
    border: { all: "thin", top: "double" },
  };
}

interface SheetSpec {
  name: string;
  rows: CellInput[][];
  colWidths: number[];
  freezeRows?: number;
  merges?: { s: { r: number; c: number }; e: { r: number; c: number } }[];
  rowHeights?: { row: number; hpt: number }[];
}

function appendStyledSheet(wb: XLSX.WorkBook, spec: SheetSpec) {
  const aoa = spec.rows.map((row) => row.map(makeCell));
  const ws = XLSXStyle.utils.aoa_to_sheet(aoa);
  ws["!cols"] = spec.colWidths.map((wch) => ({ wch }));
  ws["!rtl"] = true;
  if (spec.merges?.length) ws["!merges"] = spec.merges;
  if (spec.freezeRows) {
    ws["!views"] = [{ state: "frozen", ySplit: spec.freezeRows, xSplit: 0 }];
  }
  if (spec.rowHeights?.length) {
    ws["!rows"] = [];
    for (const r of spec.rowHeights) {
      ws["!rows"][r.row] = { hpt: r.hpt };
    }
  }

  // The aoa_to_sheet helper doesn't always carry our `s` (style) object onto
  // the resulting cell — re-attach it explicitly so xlsx-js-style picks it up.
  for (let r = 0; r < aoa.length; r++) {
    for (let c = 0; c < aoa[r].length; c++) {
      const ref = XLSX.utils.encode_cell({ r, c });
      const built = aoa[r][c];
      if (ws[ref] && built && typeof built === "object" && "s" in built) {
        ws[ref].s = built.s;
        if (built.z) ws[ref].z = built.z;
      }
    }
  }

  XLSXStyle.utils.book_append_sheet(wb, ws, spec.name);
}

function writeStyledWorkbook(wb: XLSX.WorkBook, fileName: string) {
  const wbOut = XLSXStyle.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], { type: "application/octet-stream" });
  saveAs(blob, `${fileName}.xlsx`);
}

function isWithinRange(date: string, from: string, to: string): boolean {
  if (from && date < from) return false;
  if (to && date > to) return false;
  return true;
}

function monthKey(date: string): string {
  return date.slice(0, 7); // YYYY-MM
}

function formatRangeLabel(from: string, to: string): string {
  if (!from && !to) return "كل الفترات";
  if (from && to) return `من ${from} إلى ${to}`;
  if (from) return `من ${from}`;
  return `إلى ${to}`;
}

function buildHeaderBlock(
  reportTitle: string,
  subjectLabel: string,
  subjectName: string,
  rangeLabel: string,
  headerNote: string | undefined,
  totalCols: number,
): { rows: CellInput[][]; merges: { s: { r: number; c: number }; e: { r: number; c: number } }[]; rowsCount: number; rowHeights: { row: number; hpt: number }[] } {
  const merges = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: totalCols - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: totalCols - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: totalCols - 1 } },
  ];
  const rowHeights = [
    { row: 0, hpt: 28 },
    { row: 1, hpt: 22 },
    { row: 2, hpt: 18 },
    { row: 3, hpt: 18 },
  ];
  const rows: CellInput[][] = [
    [titleCell(APP_FULL_NAME), ...new Array(totalCols - 1).fill(null)],
    [subTitleCell(reportTitle), ...new Array(totalCols - 1).fill(null)],
    [
      {
        v: `${subjectLabel}: ${subjectName}    •    ${rangeLabel}`,
        font: { bold: true, size: 11 },
        align: "center",
      },
      ...new Array(totalCols - 1).fill(null),
    ],
    [
      headerNote
        ? noteCell(headerNote)
        : noteCell(`تاريخ التصدير: ${new Date().toISOString().slice(0, 10)}`),
      ...new Array(totalCols - 1).fill(null),
    ],
  ];
  return { rows, merges, rowsCount: rows.length, rowHeights };
}

// =====================================================
// PRO: Supplier Account Statement
// =====================================================

export interface SupplierProTransaction {
  entry_date: string;
  description: string;
  quantity: number | null;
  price: number | null;
  debit: number;
  credit: number;
  source_type?: string | null;
  source_id?: string | null;
  is_corrected: boolean;
  notes?: string | null;
}

export interface ExportSupplierProInput {
  supplierName: string;
  supplierPhone?: string | null;
  transactions: SupplierProTransaction[];
  bankNameMap: Record<string, string>;
  options: ExportOptions;
}

const SUPPLIER_COLUMN_KEYS = ["row", "date", "description", "quantity", "price", "debit", "credit", "source", "balance", "notes"] as const;
type SupplierColKey = (typeof SUPPLIER_COLUMN_KEYS)[number];

const SUPPLIER_COLUMN_LABELS: Record<SupplierColKey, string> = {
  row: "م",
  date: "التاريخ",
  description: "البيان",
  quantity: "العدد",
  price: "السعر",
  debit: "عليه",
  credit: "له",
  source: "مصدر الدفع",
  balance: "الرصيد",
  notes: "ملاحظات",
};

const SUPPLIER_COLUMN_WIDTHS: Record<SupplierColKey, number> = {
  row: 6,
  date: 12,
  description: 30,
  quantity: 10,
  price: 12,
  debit: 14,
  credit: 14,
  source: 16,
  balance: 14,
  notes: 22,
};

export function exportSupplierReportPro({
  supplierName,
  supplierPhone,
  transactions,
  bankNameMap,
  options,
}: ExportSupplierProInput) {
  const wb = XLSXStyle.utils.book_new();

  const active = transactions.filter((t) => !t.is_corrected);

  // Opening balance: supplier convention runningBalance = SUM(credit - debit) for rows BEFORE fromDate
  let opening = 0;
  if (options.fromDate) {
    for (const t of active) {
      if (t.entry_date < options.fromDate) opening += t.credit - t.debit;
    }
  }

  const filtered = active.filter((t) => isWithinRange(t.entry_date, options.fromDate, options.toDate));

  // Recompute running balance over filtered set
  let running = opening;
  const computed = filtered.map((t) => {
    running += t.credit - t.debit;
    return { ...t, runningBalance: running };
  });

  const totalDebit = computed.reduce((s, r) => s + r.debit, 0);
  const totalCredit = computed.reduce((s, r) => s + r.credit, 0);
  const finalBalance = opening + totalCredit - totalDebit;

  const visibleCols = SUPPLIER_COLUMN_KEYS.filter((k) => options.columns[k] ?? false);
  if (visibleCols.length === 0) {
    // safety: at least date + balance
    visibleCols.push("date", "balance");
  }
  const colCount = visibleCols.length;

  // -------- Sheet 1: Statement --------
  const headerBlock = buildHeaderBlock(
    "كشف حساب مورد",
    "اسم المورد",
    supplierPhone ? `${supplierName}  (${supplierPhone})` : supplierName,
    formatRangeLabel(options.fromDate, options.toDate),
    options.headerNote,
    colCount,
  );

  const rows: CellInput[][] = [...headerBlock.rows];
  // Column header row
  rows.push(visibleCols.map((k) => headerCell(SUPPLIER_COLUMN_LABELS[k])));

  // Opening balance row (shown only if there's a range or non-zero opening)
  if (options.fromDate || opening !== 0) {
    rows.push(
      visibleCols.map((k) => {
        if (k === "description") {
          return {
            v: "رصيد افتتاحي",
            font: { bold: true, italic: true, color: COLORS.muted },
            fill: COLORS.totalBg,
            align: "right",
            border: { all: "thin" },
          };
        }
        if (k === "balance") {
          return {
            v: opening,
            numFmt: FMT_CURRENCY,
            font: { bold: true, color: opening < 0 ? COLORS.red : opening > 0 ? COLORS.green : undefined },
            fill: COLORS.totalBg,
            align: "right",
            border: { all: "thin" },
          };
        }
        return {
          v: "",
          fill: COLORS.totalBg,
          border: { all: "thin" },
        } as StyledCell;
      }),
    );
  }

  // Data rows
  computed.forEach((t, i) => {
    const zebra = i % 2 === 1;
    const sourceLabel = t.source_type === "bank" && t.source_id ? bankNameMap[t.source_id] ?? "بنك" : t.source_type === "cashier" ? "كاشير" : t.source_type === "manual" ? "تعديل يدوي" : "";

    const rowMap: Record<SupplierColKey, CellInput> = {
      row: dataCell(i + 1, { align: "center", zebra }),
      date: dataCell(t.entry_date, { numFmt: FMT_DATE, align: "center", zebra }),
      description: dataCell(t.description, { align: "right", zebra }),
      quantity: dataCell(t.quantity ?? "", { numFmt: t.quantity != null ? FMT_QUANTITY : undefined, align: "center", zebra }),
      price: dataCell(t.price ?? "", { numFmt: t.price != null ? FMT_CURRENCY : undefined, align: "right", zebra }),
      debit: dataCell(t.debit > 0 ? t.debit : "", { numFmt: t.debit > 0 ? FMT_CURRENCY : undefined, align: "right", zebra, color: t.debit > 0 ? COLORS.red : undefined, bold: t.debit > 0 }),
      credit: dataCell(t.credit > 0 ? t.credit : "", { numFmt: t.credit > 0 ? FMT_CURRENCY : undefined, align: "right", zebra, color: t.credit > 0 ? COLORS.green : undefined, bold: t.credit > 0 }),
      source: dataCell(sourceLabel, { align: "center", zebra }),
      balance: dataCell(t.runningBalance, { numFmt: FMT_CURRENCY, align: "right", zebra, color: t.runningBalance < 0 ? COLORS.red : t.runningBalance > 0 ? COLORS.green : undefined, bold: true }),
      notes: dataCell(t.notes ?? "", { align: "right", zebra }),
    };
    rows.push(visibleCols.map((k) => rowMap[k]));
  });

  // Totals row
  const totalsMap: Record<SupplierColKey, CellInput> = {
    row: totalCell(""),
    date: totalCell(""),
    description: totalCell("الإجمالي", { align: "right" }),
    quantity: totalCell(""),
    price: totalCell(""),
    debit: totalCell(totalDebit, { numFmt: FMT_CURRENCY, color: COLORS.red }),
    credit: totalCell(totalCredit, { numFmt: FMT_CURRENCY, color: COLORS.green }),
    source: totalCell(""),
    balance: totalCell(finalBalance, { numFmt: FMT_CURRENCY, color: finalBalance < 0 ? COLORS.red : finalBalance > 0 ? COLORS.green : undefined }),
    notes: totalCell(""),
  };
  rows.push(visibleCols.map((k) => totalsMap[k]));

  // Final balance interpretation row
  const interpretation = finalBalance < 0 ? "علينا للمورد" : finalBalance > 0 ? "لنا رصيد عند المورد" : "متزن";
  rows.push([
    {
      v: `الرصيد النهائي: ${interpretation} — ${Math.abs(finalBalance).toFixed(2)}`,
      font: { bold: true, size: 12, color: finalBalance < 0 ? COLORS.red : COLORS.green },
      align: "center",
    },
    ...new Array(colCount - 1).fill(null),
  ]);

  const colWidths = visibleCols.map((k) => SUPPLIER_COLUMN_WIDTHS[k]);

  appendStyledSheet(wb, {
    name: "كشف الحساب",
    rows,
    colWidths,
    freezeRows: headerBlock.rowsCount + 1, // freeze through header row
    merges: [
      ...headerBlock.merges,
      // Final balance row merge (last row)
      { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: colCount - 1 } },
    ],
    rowHeights: [...headerBlock.rowHeights, { row: rows.length - 1, hpt: 22 }],
  });

  // -------- Sheet 2: Summary --------
  const summaryRows: CellInput[][] = [];
  const summaryHeader = buildHeaderBlock(
    "ملخص كشف الحساب",
    "اسم المورد",
    supplierName,
    formatRangeLabel(options.fromDate, options.toDate),
    options.headerNote,
    2,
  );
  summaryRows.push(...summaryHeader.rows);
  summaryRows.push([headerCell("البند"), headerCell("القيمة")]);

  const summaryData: [string, number, string?][] = [
    ["رصيد افتتاحي", opening, opening < 0 ? COLORS.red : opening > 0 ? COLORS.green : undefined],
    ["إجمالي المشتريات (عليه)", totalDebit, COLORS.red],
    ["إجمالي المدفوعات (له)", totalCredit, COLORS.green],
    ["صافي الحركة", totalCredit - totalDebit, totalCredit - totalDebit < 0 ? COLORS.red : totalCredit - totalDebit > 0 ? COLORS.green : undefined],
    ["الرصيد النهائي", finalBalance, finalBalance < 0 ? COLORS.red : finalBalance > 0 ? COLORS.green : undefined],
    ["عدد الحركات", computed.length],
  ];

  summaryData.forEach(([label, value, color]) => {
    summaryRows.push([
      dataCell(label, { align: "right", bold: true }),
      dataCell(value, {
        numFmt: typeof value === "number" && !Number.isInteger(value) || label !== "عدد الحركات" ? FMT_CURRENCY : "0",
        color,
        bold: true,
      }),
    ]);
  });

  appendStyledSheet(wb, {
    name: "الملخص",
    rows: summaryRows,
    colWidths: [28, 18],
    freezeRows: summaryHeader.rowsCount + 1,
    merges: summaryHeader.merges,
    rowHeights: summaryHeader.rowHeights,
  });

  // -------- Sheet 3 (optional): Monthly grouping --------
  if (options.groupByMonth && computed.length > 0) {
    const monthMap = new Map<string, { debit: number; credit: number; count: number }>();
    for (const t of computed) {
      const m = monthKey(t.entry_date);
      const cur = monthMap.get(m) ?? { debit: 0, credit: 0, count: 0 };
      cur.debit += t.debit;
      cur.credit += t.credit;
      cur.count += 1;
      monthMap.set(m, cur);
    }
    const months = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    const monthHeaderBlock = buildHeaderBlock(
      "ملخص شهري",
      "اسم المورد",
      supplierName,
      formatRangeLabel(options.fromDate, options.toDate),
      options.headerNote,
      5,
    );

    const monthRows: CellInput[][] = [...monthHeaderBlock.rows];
    monthRows.push([
      headerCell("الشهر"),
      headerCell("عدد الحركات"),
      headerCell("عليه"),
      headerCell("له"),
      headerCell("الصافي"),
    ]);

    let runMonth = opening;
    for (const [m, agg] of months) {
      const net = agg.credit - agg.debit;
      runMonth += net;
      monthRows.push([
        dataCell(m, { align: "center", bold: true }),
        dataCell(agg.count, { align: "center", numFmt: "0" }),
        dataCell(agg.debit, { numFmt: FMT_CURRENCY, color: COLORS.red }),
        dataCell(agg.credit, { numFmt: FMT_CURRENCY, color: COLORS.green }),
        dataCell(net, { numFmt: FMT_CURRENCY, color: net < 0 ? COLORS.red : net > 0 ? COLORS.green : undefined, bold: true }),
      ]);
    }

    monthRows.push([
      totalCell("الإجمالي", { align: "right" }),
      totalCell(computed.length, { numFmt: "0", align: "center" }),
      totalCell(totalDebit, { numFmt: FMT_CURRENCY, color: COLORS.red }),
      totalCell(totalCredit, { numFmt: FMT_CURRENCY, color: COLORS.green }),
      totalCell(totalCredit - totalDebit, { numFmt: FMT_CURRENCY, color: totalCredit - totalDebit < 0 ? COLORS.red : COLORS.green }),
    ]);

    appendStyledSheet(wb, {
      name: "ملخص شهري",
      rows: monthRows,
      colWidths: [12, 12, 14, 14, 14],
      freezeRows: monthHeaderBlock.rowsCount + 1,
      merges: monthHeaderBlock.merges,
      rowHeights: monthHeaderBlock.rowHeights,
    });
  }

  const fileSuffix = options.fromDate || options.toDate
    ? ` ${options.fromDate || "..."}_${options.toDate || "..."}`
    : "";
  writeStyledWorkbook(wb, `كشف حساب مورد - ${supplierName}${fileSuffix}`);
}

// =====================================================
// PRO: Customer Reservations Pivot Report
// =====================================================

export interface ReservationProRow {
  entry_date: string;
  description: string;
  partner_customer_id: string;
  partner_name: string;
  credit: number;
  debit: number;
  is_corrected: boolean;
  notes?: string | null;
}

export interface ExportReservationProInput {
  customerName: string;
  reservations: ReservationProRow[];
  /** Whitelist of partner IDs to include (the dialog filters via column toggles). */
  partnerIds: string[];
  /** id → name map for stable column ordering */
  partnerNameById: Record<string, string>;
  options: ExportOptions;
}

export function exportCustomerReservationReportPro({
  customerName,
  reservations,
  partnerIds,
  partnerNameById,
  options,
}: ExportReservationProInput) {
  const wb = XLSXStyle.utils.book_new();

  const active = reservations.filter((r) => !r.is_corrected);

  // Opening (running balance is SUM(credit - debit) for the customer's reservations before fromDate
  let opening = 0;
  if (options.fromDate) {
    for (const r of active) {
      if (r.entry_date < options.fromDate) opening += r.credit - r.debit;
    }
  }

  const filtered = active.filter((r) => isWithinRange(r.entry_date, options.fromDate, options.toDate));

  // Build active partner set from filtered, then keep only those toggled on (or all if `partnerIds` empty)
  const filterPartnerSet = new Set(partnerIds.length ? partnerIds : Array.from(new Set(filtered.map((r) => r.partner_customer_id))));
  const presentPartners = Array.from(new Set(filtered.map((r) => r.partner_customer_id)));
  const activePartnerIds = presentPartners.filter((id) => filterPartnerSet.has(id));

  // Stable column order, alphabetical by partner name
  const partnerCols = activePartnerIds
    .map((id) => ({ id, name: partnerNameById[id] ?? "—" }))
    .sort((a, b) => a.name.localeCompare(b.name, "ar"));

  // Group rows that share the same date+description so partner amounts align in one row
  // Pivot key = entry_date + "::" + description
  const pivotMap = new Map<string, { entry_date: string; description: string; partnerAmounts: Record<string, { credit: number; debit: number }> }>();
  for (const r of filtered) {
    if (!filterPartnerSet.has(r.partner_customer_id)) continue;
    const key = `${r.entry_date}::${r.description}`;
    const existing = pivotMap.get(key) ?? {
      entry_date: r.entry_date,
      description: r.description,
      partnerAmounts: {},
    };
    const cur = existing.partnerAmounts[r.partner_customer_id] ?? { credit: 0, debit: 0 };
    cur.credit += r.credit;
    cur.debit += r.debit;
    existing.partnerAmounts[r.partner_customer_id] = cur;
    pivotMap.set(key, existing);
  }
  const pivotRows = Array.from(pivotMap.values()).sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  // Running balance per pivot row (sum of all partner deltas in that row)
  let running = opening;
  const computed = pivotRows.map((row) => {
    let delta = 0;
    for (const id of Object.keys(row.partnerAmounts)) {
      delta += row.partnerAmounts[id].credit - row.partnerAmounts[id].debit;
    }
    running += delta;
    return { ...row, runningBalance: running };
  });

  // Totals
  const totalsByPartner: Record<string, { credit: number; debit: number }> = {};
  let totalCredit = 0, totalDebit = 0;
  for (const r of filtered) {
    if (!filterPartnerSet.has(r.partner_customer_id)) continue;
    const cur = totalsByPartner[r.partner_customer_id] ?? { credit: 0, debit: 0 };
    cur.credit += r.credit;
    cur.debit += r.debit;
    totalsByPartner[r.partner_customer_id] = cur;
    totalCredit += r.credit;
    totalDebit += r.debit;
  }
  const finalBalance = opening + totalCredit - totalDebit;

  // Optional non-pivot columns (date, description, balance) — locked
  const showRow = options.columns.row ?? true;
  const showDate = options.columns.date ?? true;
  const showDescription = options.columns.description ?? true;
  const showBalance = options.columns.balance ?? true;

  const fixedHeader: string[] = [];
  if (showRow) fixedHeader.push("م");
  if (showDate) fixedHeader.push("التاريخ");
  if (showDescription) fixedHeader.push("التفاصيل");
  const partnerLabels = partnerCols.map((p) => p.name);
  const trailHeader: string[] = [];
  if (showBalance) trailHeader.push("الرصيد");

  const allHeaders = [...fixedHeader, ...partnerLabels, ...trailHeader];
  const colCount = allHeaders.length;

  // -------- Sheet 1: Pivot --------
  const headerBlock = buildHeaderBlock(
    "محجوز العملاء",
    "اسم العميل",
    customerName,
    formatRangeLabel(options.fromDate, options.toDate),
    options.headerNote,
    colCount,
  );
  const rows: CellInput[][] = [...headerBlock.rows];
  rows.push(allHeaders.map((h) => headerCell(h)));

  if (options.fromDate || opening !== 0) {
    const openingRow: CellInput[] = [];
    if (showRow) openingRow.push({ v: "", fill: COLORS.totalBg, border: { all: "thin" } });
    if (showDate) openingRow.push({ v: "", fill: COLORS.totalBg, border: { all: "thin" } });
    if (showDescription) openingRow.push({ v: "رصيد افتتاحي", font: { bold: true, italic: true, color: COLORS.muted }, fill: COLORS.totalBg, align: "right", border: { all: "thin" } });
    for (let i = 0; i < partnerCols.length; i++) {
      openingRow.push({ v: "", fill: COLORS.totalBg, border: { all: "thin" } });
    }
    if (showBalance) openingRow.push({ v: opening, numFmt: FMT_CURRENCY, font: { bold: true, color: opening < 0 ? COLORS.red : opening > 0 ? COLORS.green : undefined }, fill: COLORS.totalBg, align: "right", border: { all: "thin" } });
    rows.push(openingRow);
  }

  computed.forEach((row, i) => {
    const zebra = i % 2 === 1;
    const cells: CellInput[] = [];
    if (showRow) cells.push(dataCell(i + 1, { align: "center", zebra }));
    if (showDate) cells.push(dataCell(row.entry_date, { numFmt: FMT_DATE, align: "center", zebra }));
    if (showDescription) cells.push(dataCell(row.description, { align: "right", zebra }));
    for (const p of partnerCols) {
      const v = row.partnerAmounts[p.id];
      if (!v || (v.credit === 0 && v.debit === 0)) {
        cells.push(dataCell("", { zebra }));
      } else if (v.credit > 0) {
        cells.push(dataCell(v.credit, { numFmt: FMT_CURRENCY, color: COLORS.green, bold: true, zebra }));
      } else {
        cells.push(dataCell(-v.debit, { numFmt: FMT_CURRENCY, color: COLORS.red, bold: true, zebra }));
      }
    }
    if (showBalance) cells.push(dataCell(row.runningBalance, { numFmt: FMT_CURRENCY, color: row.runningBalance < 0 ? COLORS.red : row.runningBalance > 0 ? COLORS.green : undefined, bold: true, zebra }));
    rows.push(cells);
  });

  // Totals
  const totalsCells: CellInput[] = [];
  if (showRow) totalsCells.push(totalCell(""));
  if (showDate) totalsCells.push(totalCell(""));
  if (showDescription) totalsCells.push(totalCell("الإجمالي", { align: "right" }));
  for (const p of partnerCols) {
    const t = totalsByPartner[p.id] ?? { credit: 0, debit: 0 };
    const net = t.credit - t.debit;
    if (net === 0) {
      totalsCells.push(totalCell(""));
    } else {
      totalsCells.push(totalCell(net, { numFmt: FMT_CURRENCY, color: net < 0 ? COLORS.red : COLORS.green }));
    }
  }
  if (showBalance) totalsCells.push(totalCell(finalBalance, { numFmt: FMT_CURRENCY, color: finalBalance < 0 ? COLORS.red : finalBalance > 0 ? COLORS.green : undefined }));
  rows.push(totalsCells);

  // Final summary row
  const summaryLabel = `إجمالي الحجوزات: ${totalCredit.toFixed(2)}    |    إجمالي السحوبات: ${totalDebit.toFixed(2)}    |    الرصيد المتبقي: ${finalBalance.toFixed(2)}`;
  rows.push([
    {
      v: summaryLabel,
      font: { bold: true, size: 12, color: finalBalance < 0 ? COLORS.red : COLORS.green },
      align: "center",
    },
    ...new Array(colCount - 1).fill(null),
  ]);

  const colWidths: number[] = [];
  if (showRow) colWidths.push(6);
  if (showDate) colWidths.push(12);
  if (showDescription) colWidths.push(28);
  for (let i = 0; i < partnerCols.length; i++) colWidths.push(14);
  if (showBalance) colWidths.push(14);

  appendStyledSheet(wb, {
    name: "محجوز العملاء",
    rows,
    colWidths,
    freezeRows: headerBlock.rowsCount + 1,
    merges: [
      ...headerBlock.merges,
      { s: { r: rows.length - 1, c: 0 }, e: { r: rows.length - 1, c: colCount - 1 } },
    ],
    rowHeights: [...headerBlock.rowHeights, { row: rows.length - 1, hpt: 22 }],
  });

  // -------- Sheet 2: Per-Partner Breakdown --------
  if (partnerCols.length > 0) {
    const breakHeader = buildHeaderBlock(
      "ملخص حسب الشريك",
      "اسم العميل",
      customerName,
      formatRangeLabel(options.fromDate, options.toDate),
      options.headerNote,
      4,
    );
    const breakRows: CellInput[][] = [...breakHeader.rows];
    breakRows.push([
      headerCell("الشريك"),
      headerCell("الحجوزات (له)"),
      headerCell("السحوبات (عليه)"),
      headerCell("الصافي"),
    ]);
    for (const p of partnerCols) {
      const t = totalsByPartner[p.id] ?? { credit: 0, debit: 0 };
      const net = t.credit - t.debit;
      breakRows.push([
        dataCell(p.name, { align: "right", bold: true }),
        dataCell(t.credit, { numFmt: FMT_CURRENCY, color: COLORS.green }),
        dataCell(t.debit, { numFmt: FMT_CURRENCY, color: COLORS.red }),
        dataCell(net, { numFmt: FMT_CURRENCY, color: net < 0 ? COLORS.red : net > 0 ? COLORS.green : undefined, bold: true }),
      ]);
    }
    breakRows.push([
      totalCell("الإجمالي", { align: "right" }),
      totalCell(totalCredit, { numFmt: FMT_CURRENCY, color: COLORS.green }),
      totalCell(totalDebit, { numFmt: FMT_CURRENCY, color: COLORS.red }),
      totalCell(totalCredit - totalDebit, { numFmt: FMT_CURRENCY, color: totalCredit - totalDebit < 0 ? COLORS.red : COLORS.green }),
    ]);

    appendStyledSheet(wb, {
      name: "ملخص الشركاء",
      rows: breakRows,
      colWidths: [22, 16, 16, 16],
      freezeRows: breakHeader.rowsCount + 1,
      merges: breakHeader.merges,
      rowHeights: breakHeader.rowHeights,
    });
  }

  // -------- Sheet 3 (optional): Monthly --------
  if (options.groupByMonth && filtered.length > 0) {
    const monthMap = new Map<string, { credit: number; debit: number; count: number }>();
    for (const r of filtered) {
      if (!filterPartnerSet.has(r.partner_customer_id)) continue;
      const m = monthKey(r.entry_date);
      const cur = monthMap.get(m) ?? { credit: 0, debit: 0, count: 0 };
      cur.credit += r.credit;
      cur.debit += r.debit;
      cur.count += 1;
      monthMap.set(m, cur);
    }
    const months = Array.from(monthMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    const monthHeader = buildHeaderBlock(
      "ملخص شهري",
      "اسم العميل",
      customerName,
      formatRangeLabel(options.fromDate, options.toDate),
      options.headerNote,
      5,
    );
    const monthRows: CellInput[][] = [...monthHeader.rows];
    monthRows.push([
      headerCell("الشهر"),
      headerCell("عدد الحركات"),
      headerCell("الحجوزات"),
      headerCell("السحوبات"),
      headerCell("الصافي"),
    ]);
    for (const [m, agg] of months) {
      const net = agg.credit - agg.debit;
      monthRows.push([
        dataCell(m, { align: "center", bold: true }),
        dataCell(agg.count, { align: "center", numFmt: "0" }),
        dataCell(agg.credit, { numFmt: FMT_CURRENCY, color: COLORS.green }),
        dataCell(agg.debit, { numFmt: FMT_CURRENCY, color: COLORS.red }),
        dataCell(net, { numFmt: FMT_CURRENCY, color: net < 0 ? COLORS.red : net > 0 ? COLORS.green : undefined, bold: true }),
      ]);
    }
    monthRows.push([
      totalCell("الإجمالي", { align: "right" }),
      totalCell(filtered.filter((r) => filterPartnerSet.has(r.partner_customer_id)).length, { numFmt: "0", align: "center" }),
      totalCell(totalCredit, { numFmt: FMT_CURRENCY, color: COLORS.green }),
      totalCell(totalDebit, { numFmt: FMT_CURRENCY, color: COLORS.red }),
      totalCell(totalCredit - totalDebit, { numFmt: FMT_CURRENCY, color: totalCredit - totalDebit < 0 ? COLORS.red : COLORS.green }),
    ]);

    appendStyledSheet(wb, {
      name: "ملخص شهري",
      rows: monthRows,
      colWidths: [12, 12, 14, 14, 14],
      freezeRows: monthHeader.rowsCount + 1,
      merges: monthHeader.merges,
      rowHeights: monthHeader.rowHeights,
    });
  }

  const fileSuffix = options.fromDate || options.toDate
    ? ` ${options.fromDate || "..."}_${options.toDate || "..."}`
    : "";
  writeStyledWorkbook(wb, `محجوز العملاء - ${customerName}${fileSuffix}`);
}

// =====================================================
// LEGACY: keep the existing simple exports for other reports
// =====================================================

function createWorkbook(
  sheetName: string,
  wsData: (string | number | null)[][],
  colWidths: number[],
  fileName: string
) {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  ws["!cols"] = colWidths.map((wch) => ({ wch }));
  ws["!rtl"] = true;
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], { type: "application/octet-stream" });
  saveAs(blob, `${fileName}.xlsx`);
}

// Customer Account Statement (كشف حساب العميل)
interface CustomerReportRow {
  entry_date: string;
  description: string;
  quantity: number | null;
  price: number | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

export function exportCustomerReport(
  customerName: string,
  rows: CustomerReportRow[],
  totalDebit: number,
  totalCredit: number,
  finalBalance: number
) {
  const wsData: (string | number | null)[][] = [
    ["اسم العميل", customerName, null, null, null, null, null],
    ["التاريخ", "التفاصيل", "العدد", "السعر", `عليه (${customerName})`, `له (${customerName})`, "الرصيد"],
    [null, null, null, null, null, null, 0],
  ];

  rows.forEach((row) => {
    wsData.push([
      row.entry_date, row.description, row.quantity, row.price,
      row.debit || null, row.credit || null, row.runningBalance,
    ]);
  });

  wsData.push([null, "الرصيد الحالى", null, null, totalDebit, totalCredit, finalBalance]);

  createWorkbook("كشف حساب", wsData, [14, 22, 10, 12, 14, 14, 14], `كشف حساب - ${customerName}`);
}

// Bank Account Statement
interface BankReportRow {
  entry_date: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export function exportBankReport(
  bankName: string,
  openingBalance: number,
  rows: BankReportRow[],
  totalDebit: number,
  totalCredit: number,
  currentBalance: number
) {
  const wsData: (string | number | null)[][] = [
    ["اسم البنك", bankName, null, null, null],
    ["التاريخ", "البيان", "مدين", "دائن", "الرصيد"],
    [null, "رصيد افتتاحي", null, openingBalance, openingBalance],
  ];

  rows.forEach((row) => {
    wsData.push([
      row.entry_date, row.description,
      row.debit || null, row.credit || null, row.runningBalance,
    ]);
  });

  wsData.push([null, "الإجمالي", totalDebit, totalCredit, currentBalance]);

  createWorkbook("كشف حساب بنك", wsData, [14, 25, 14, 14, 14], `كشف حساب - ${bankName}`);
}

// Cashier Daily
interface CashierReportRow {
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export function exportCashierReport(
  date: string,
  rows: CashierReportRow[],
  totalDebit: number,
  totalCredit: number
) {
  const wsData: (string | number | null)[][] = [
    ["يومية الكاشير", date, null, null, null],
    ["م", "البيان", "عليه", "له", "الرصيد"],
  ];

  rows.forEach((row, i) => {
    wsData.push([
      i + 1, row.description,
      row.debit || null, row.credit || null, row.runningBalance,
    ]);
  });

  wsData.push([null, "الإجمالي", totalDebit, totalCredit, totalCredit - totalDebit]);

  createWorkbook("يومية الكاشير", wsData, [6, 30, 14, 14, 14], `يومية الكاشير - ${date}`);
}

// Inventory
interface InventoryReportRow {
  productName: string;
  previousBalance: number;
  added: number;
  sold: number;
  netRemaining: number;
  costPrice: number;
  remainingCost: number;
  customers: { name: string; quantity: number }[];
}

export function exportInventoryReport(
  date: string,
  category: string,
  rows: InventoryReportRow[],
  totalRemainingCost: number
) {
  const categoryLabel = category === "cement" ? "اسمنت" : "حديد";
  const wsData: (string | number | null)[][] = [
    [`جرد ${categoryLabel}`, date, null, null, null, null, null],
    ["الصنف", "الرصيد السابق", "الوارد", "المباع", "الباقي", "سعر التكلفة", "تكلفة الرصيد"],
  ];

  rows.forEach((row) => {
    wsData.push([
      row.productName, row.previousBalance, row.added,
      row.sold, row.netRemaining, row.costPrice, row.remainingCost,
    ]);
    row.customers.forEach((cust) => {
      wsData.push([`  ↳ ${cust.name}`, null, null, cust.quantity, null, null, null]);
    });
  });

  wsData.push([null, null, null, null, null, "إجمالي تكلفة المخزون", totalRemainingCost]);

  createWorkbook("الجرد", wsData, [22, 12, 10, 10, 10, 14, 14], `جرد ${categoryLabel} - ${date}`);
}

// Reports Summary
interface ProductBreakdown {
  name: string;
  quantity: number;
  total: number;
  profit: number;
}

export function exportSummaryReport(
  fromDate: string,
  toDate: string,
  totalSales: number,
  totalQuantity: number,
  totalProfit: number,
  totalDeposits: number,
  cashierDebit: number,
  cashierCredit: number,
  banks: { name: string; balance: number }[],
  productBreakdown: ProductBreakdown[],
  isAdmin: boolean
) {
  const wb = XLSX.utils.book_new();

  const summaryData: (string | number | null)[][] = [
    ["تقرير الفترة", `${fromDate} إلى ${toDate}`, null],
    [null, null, null],
    ["البند", "القيمة", null],
    ["إجمالي المبيعات", totalSales, null],
    ["إجمالي الكمية (طن)", totalQuantity, null],
    ...(isAdmin ? [["إجمالي الأرباح" as string | number | null, totalProfit as string | number | null, null as string | number | null]] : []),
    ["إجمالي الإيداعات", totalDeposits, null],
    [null, null, null],
    ["يومية الكاشير", null, null],
    ["إجمالي عليه (خروج)", cashierDebit, null],
    ["إجمالي له (دخول)", cashierCredit, null],
    ["الفرق", cashierCredit - cashierDebit, null],
  ];

  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  ws1["!cols"] = [{ wch: 25 }, { wch: 18 }, { wch: 14 }];
  ws1["!rtl"] = true;
  XLSX.utils.book_append_sheet(wb, ws1, "ملخص");

  const headers = isAdmin
    ? ["الصنف", "الكمية", "الإجمالي", "الأرباح"]
    : ["الصنف", "الكمية", "الإجمالي"];
  const productData: (string | number | null)[][] = [headers];
  productBreakdown.forEach((row) => {
    const r: (string | number | null)[] = [row.name, row.quantity, row.total];
    if (isAdmin) r.push(row.profit);
    productData.push(r);
  });
  const totalsRow: (string | number | null)[] = ["الإجمالي", totalQuantity, totalSales];
  if (isAdmin) totalsRow.push(totalProfit);
  productData.push(totalsRow);

  const ws2 = XLSX.utils.aoa_to_sheet(productData);
  ws2["!cols"] = [{ wch: 22 }, { wch: 12 }, { wch: 14 }, ...(isAdmin ? [{ wch: 14 }] : [])];
  ws2["!rtl"] = true;
  XLSX.utils.book_append_sheet(wb, ws2, "تفصيل المبيعات");

  const bankData: (string | number | null)[][] = [["البنك", "الرصيد"]];
  banks.forEach((b) => bankData.push([b.name, b.balance]));
  bankData.push(["الإجمالي", banks.reduce((s, b) => s + b.balance, 0)]);

  const ws3 = XLSX.utils.aoa_to_sheet(bankData);
  ws3["!cols"] = [{ wch: 30 }, { wch: 16 }];
  ws3["!rtl"] = true;
  XLSX.utils.book_append_sheet(wb, ws3, "أرصدة البنوك");

  const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const blob = new Blob([wbOut], { type: "application/octet-stream" });
  saveAs(blob, `تقرير ${fromDate} - ${toDate}.xlsx`);
}
