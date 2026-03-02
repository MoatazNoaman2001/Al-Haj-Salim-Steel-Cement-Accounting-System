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
  { href: "/cement-daily", label: "يومية الاسمنت", icon: "FileText" as const, active: true },
  { href: "/corrections", label: "طلبات التصحيح", icon: "ClipboardCheck" as const, active: true, adminOnly: true },
  { href: "#", label: "يومية الكاشير", icon: "Calculator" as const, active: false },
  { href: "#", label: "الجرد", icon: "Package" as const, active: false },
  { href: "#", label: "البنوك", icon: "Landmark" as const, active: false },
  { href: "#", label: "العملاء", icon: "Users" as const, active: false },
  { href: "#", label: "التقارير", icon: "BarChart3" as const, active: false },
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
  notes: "ملاحظات",
  createdBy: "بواسطة",
  status: "الحالة",
  actions: "إجراءات",
};

export const BOND_TABLE_HEADERS = {
  rowNum: "م",
  customer: "العميل",
  amount: "المبلغ",
  bondNumber: "رقم البون",
  notes: "ملاحظات",
  createdBy: "بواسطة",
  actions: "إجراءات",
};

export const MESSAGES = {
  loginSuccess: "تم تسجيل الدخول بنجاح",
  loginError: "خطأ في البريد الإلكتروني أو كلمة المرور",
  entryAdded: "تم إضافة العملية بنجاح",
  correctionRequested: "تم إرسال طلب التصحيح بنجاح",
  correctionApproved: "تمت الموافقة على التصحيح",
  correctionRejected: "تم رفض طلب التصحيح",
  bondAdded: "تم إضافة البون بنجاح",
  bondDeleted: "تم حذف البون بنجاح",
  cashBalanceUpdated: "تم تحديث الرصيد النقدي",
  error: "حدث خطأ، يرجى المحاولة مرة أخرى",
  requiredField: "هذا الحقل مطلوب",
  invalidNumber: "يرجى إدخال رقم صحيح",
  minValue: "القيمة يجب أن تكون أكبر من صفر",
};
