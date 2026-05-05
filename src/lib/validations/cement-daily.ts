import { z } from "zod/v4";

const numericString = (msg: string) =>
  z
    .string()
    .min(1, msg)
    .refine((val) => !isNaN(Number(val)), "يرجى إدخال رقم صحيح");

const positiveNumericString = (msg: string) =>
  numericString(msg).refine((val) => Number(val) > 0, msg);

const nonNegativeNumericString = (msg: string) =>
  numericString(msg).refine((val) => Number(val) >= 0, msg);

export const addEntrySchema = z.object({
  entry_date: z.string().min(1, "التاريخ مطلوب"),
  customer_id: z.string().min(1, "العميل مطلوب"),
  product_id: z.string().min(1, "الصنف مطلوب"),
  quantity: positiveNumericString("الكمية يجب أن تكون أكبر من صفر"),
  price_per_ton: positiveNumericString("السعر يجب أن يكون أكبر من صفر"),
  amount_paid: nonNegativeNumericString("المبلغ لا يمكن أن يكون سالب"),
  transport_cost: nonNegativeNumericString("النولون لا يمكن أن يكون سالب"),
  transport_in: nonNegativeNumericString("النولون الداخل لا يمكن أن يكون سالب"),
  tanzeel: nonNegativeNumericString("التنزيل لا يمكن أن يكون سالب"),
  bank_id: z.string().nonempty("البنك مطلوب"),
  customer_bank_id: z.string().optional(),
  driver_name: z.string().optional(),
  cost_per_ton: z.string().optional(),
  notes: z.string().optional(),
});

export type AddEntryFormValues = z.infer<typeof addEntrySchema>;

export const correctionRequestSchema = z.object({
  reason: z.string().min(10, "سبب التصحيح يجب أن يكون 10 أحرف على الأقل"),
  customer_id: z.string().min(1, "العميل مطلوب"),
  product_id: z.string().min(1, "الصنف مطلوب"),
  quantity: positiveNumericString("الكمية يجب أن تكون أكبر من صفر"),
  price_per_ton: positiveNumericString("السعر يجب أن يكون أكبر من صفر"),
  amount_paid: nonNegativeNumericString("المبلغ لا يمكن أن يكون سالب"),
  transport_cost: nonNegativeNumericString("النولون لا يمكن أن يكون سالب"),
  transport_in: nonNegativeNumericString("النولون الداخل لا يمكن أن يكون سالب"),
  tanzeel: nonNegativeNumericString("التنزيل لا يمكن أن يكون سالب"),
  bank_id: z.string().nonempty("البنك مطلوب"),
  customer_bank_id: z.string().optional(),
  driver_name: z.string().optional(),
  notes: z.string().optional(),
});

export type CorrectionRequestFormValues = z.infer<typeof correctionRequestSchema>;

export const addDepositSchema = z.object({
  entry_date: z.string().min(1, "التاريخ مطلوب"),
  amount: positiveNumericString("المبلغ يجب أن يكون أكبر من صفر"),
  description: z.string().optional(),
});

export type AddDepositFormValues = z.infer<typeof addDepositSchema>;

export const addCashierEntrySchema = z.object({
  entry_date: z.string().min(1, "التاريخ مطلوب"),
  description: z.string().min(1, "التفاصيل مطلوبة"),
  debit: nonNegativeNumericString("القيمة لا يمكن أن تكون سالبة"),
  credit: nonNegativeNumericString("القيمة لا يمكن أن تكون سالبة"),
});

export type AddCashierEntryFormValues = z.infer<typeof addCashierEntrySchema>;
