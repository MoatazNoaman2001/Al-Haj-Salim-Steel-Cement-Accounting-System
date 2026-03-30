export const APP_NAME = "شركة الحاج سليم";
export const APP_FULL_NAME = "شركة الحاج سليم لتوزيع الحديد والأسمنت";

export const ROLES = {
  ADMIN: "admin" as const,
  CASHIER: "cashier" as const,
};

export const ROLE_LABELS: Record<string, string> = {
  admin: "مدير",
  cashier: "كاشير",
};

export const CORRECTION_STATUS_LABELS: Record<string, string> = {
  pending: "بانتظار المراجعة",
  approved: "تمت الموافقة",
  rejected: "مرفوض",
};

export const NAV_ITEMS = [
  { href: "/dashboard", label: "لوحة التحكم", icon: "LayoutDashboard" as const, active: true },
  { href: "/cement-daily", label: "يومية الاسمنت", icon: "FileText" as const, active: true },
  { href: "/steel-daily", label: "يومية الحديد", icon: "Hammer" as const, active: true },
  { href: "/cashier-daily", label: "يومية الكاشير", icon: "Calculator" as const, active: true },
  { href: "/corrections", label: "طلبات التصحيح", icon: "ClipboardCheck" as const, active: true, adminOnly: true },
  { href: "/inventory", label: "الجرد", icon: "Package" as const, active: true },
  { href: "/banks", label: "البنوك", icon: "Landmark" as const, active: true },
  { href: "/customers", label: "العملاء", icon: "Users" as const, active: true },
  { href: "/reports", label: "التقارير", icon: "BarChart3" as const, active: true },
];

export const TABLE_HEADERS = {
  rowNum: "م",
  date: "التاريخ",
  customer: "العميل",
  product: "الصنف",
  quantity: "الكمية",
  pricePerTon: "سعر الطن",
  total: "الإجمالي",
  costPerTon: "سعر التكلفة",
  profitPerTon: "ربح الطن",
  totalProfit: "إجمالي الربح",
  amountPaid: "المدفوع",
  remaining: "الباقي",
  transportCost: "النولون",
  totalTransport: "إجمالي النولون",
  driver: "السائق",
  profitLoss: "أرباح/خسائر",
  notes: "ملاحظات",
  createdBy: "بواسطة",
  status: "الحالة",
  actions: "إجراءات",
};

export const INVENTORY_TABLE_HEADERS = {
  product: "النوع",
  previousBalance: "الرصيد المتبقي",
  added: "المضاف",
  sold: "المباع",
  netRemaining: "الباقي",
  costPrice: "سعر القطع",
  remainingCost: "تكلفة الرصيد المتبقي",
};

export const DEPOSIT_TABLE_HEADERS = {
  rowNum: "م",
  amount: "المبلغ",
  description: "التفاصيل",
  createdBy: "بواسطة",
  actions: "إجراءات",
};

export const CASHIER_TABLE_HEADERS = {
  rowNum: "م",
  date: "التاريخ",
  description: "التفاصيل",
  debit: "عليه",
  credit: "له",
  balance: "الرصيد",
  createdBy: "بواسطة",
  status: "الحالة",
  actions: "إجراءات",
};

export const MESSAGES = {
  loginSuccess: "تم تسجيل الدخول بنجاح",
  loginError: "خطأ في البريد الإلكتروني أو كلمة المرور",
  entryAdded: "تم إضافة العملية بنجاح",
  correctionRequested: "تم إرسال طلب التصحيح بنجاح",
  correctionApproved: "تمت الموافقة على التصحيح",
  correctionRejected: "تم رفض طلب التصحيح",
  inventoryUpdated: "تم تحديث جدول البونات",
  depositAdded: "تم إضافة الإيداع بنجاح",
  depositDeleted: "تم حذف الإيداع بنجاح",
  cashierEntryAdded: "تم إضافة القيد بنجاح",
  cashBalanceUpdated: "تم تحديث الرصيد النقدي",
  bankTransactionAdded: "تم إضافة العملية البنكية بنجاح",
  bankAdded: "تم إضافة البنك بنجاح",
  customerAdded: "تم إضافة العميل بنجاح",
  customerUpdated: "تم تحديث بيانات العميل بنجاح",
  customerTransactionAdded: "تم إضافة القيد بنجاح",
  error: "حدث خطأ، يرجى المحاولة مرة أخرى",
  requiredField: "هذا الحقل مطلوب",
  invalidNumber: "يرجى إدخال رقم صحيح",
  minValue: "القيمة يجب أن تكون أكبر من صفر",
};

export const BANK_TABLE_HEADERS = {
  rowNum: "الرقم",
  bankName: "اسم البنك",
  date: "التاريخ",
  name: "الاسم",
  debit: "مدين",
  credit: "دائن",
  balance: "الرصيد",
  createdBy: "بواسطة",
};

export const CUSTOMER_TX_HEADERS = {
  rowNum: "م",
  date: "التاريخ",
  description: "التفاصيل",
  quantity: "العدد",
  price: "السعر",
  debit: "عليه",
  credit: "له",
  balance: "الرصيد",
  source: "مصدر الدفع",
  createdBy: "بواسطة",
};
