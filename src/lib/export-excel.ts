import * as XLSX from "xlsx";
import { saveAs } from "file-saver";

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

// =====================================================
// Customer Account Statement (كشف حساب العميل)
// =====================================================

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

// =====================================================
// Bank Account Statement (كشف حساب البنك)
// =====================================================

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

// =====================================================
// Cashier Daily (يومية الكاشير)
// =====================================================

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

// =====================================================
// Inventory (الجرد)
// =====================================================

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
    // Add customer breakdown under each product
    row.customers.forEach((cust) => {
      wsData.push([`  ↳ ${cust.name}`, null, null, cust.quantity, null, null, null]);
    });
  });

  wsData.push([null, null, null, null, null, "إجمالي تكلفة المخزون", totalRemainingCost]);

  createWorkbook("الجرد", wsData, [22, 12, 10, 10, 10, 14, 14], `جرد ${categoryLabel} - ${date}`);
}

// =====================================================
// Reports Summary (التقارير)
// =====================================================

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

  // Sheet 1: Summary
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

  // Sheet 2: Product breakdown
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

  // Sheet 3: Bank balances
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
