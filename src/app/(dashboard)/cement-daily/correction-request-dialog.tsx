"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useCustomers, useCementProducts } from "@/hooks/use-cement-daily-queries";
import { useBanks } from "@/hooks/use-banks";
import { useCustomerBankAccounts } from "@/hooks/use-customer-bank-accounts";
import { useRequestCorrection } from "@/hooks/use-cement-daily-mutations";
import {
  correctionRequestSchema,
  type CorrectionRequestFormValues,
} from "@/lib/validations/cement-daily";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { CustomerCombobox } from "@/components/shared/customer-combobox";
import { ProductSelect } from "@/components/shared/product-select";
import { BankSelect } from "@/components/shared/bank-select";
import { CustomerBankSelect } from "@/components/shared/customer-bank-select";
import type { DailyCementWithRelations } from "@/types/database";
import { toast } from "sonner";

interface CorrectionRequestDialogProps {
  entry: DailyCementWithRelations | null;
  onClose: () => void;
}

export function CorrectionRequestDialog({
  entry,
  onClose,
}: CorrectionRequestDialogProps) {
  const { userId } = useUser();
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useCementProducts();
  const { data: banks = [] } = useBanks();
  const requestCorrection = useRequestCorrection();

  const form = useForm<CorrectionRequestFormValues>({
    resolver: zodResolver(correctionRequestSchema),
    values: entry
      ? {
          reason: "",
          customer_id: entry.customer_id,
          product_id: entry.product_id,
          quantity: String(entry.quantity),
          price_per_ton: String(entry.price_per_ton),
          transport_in: String(entry.transport_in ?? 0),
          tanzeel: String(entry.tanzeel ?? 0),
          amount_paid: String(entry.amount_paid),
          bank_id: entry.bank_id ?? "",
          customer_bank_id: entry.customer_bank_id ?? "",
          transport_cost: String(entry.transport_cost),
          driver_name: entry.driver_name ?? "",
          notes: entry.notes ?? "",
        }
      : undefined,
  });

  const selectedCustomerId = form.watch("customer_id");
  const { data: customerBanks = [] } = useCustomerBankAccounts(selectedCustomerId || entry?.customer_id);

  useEffect(() => {
    if (!entry) return;
    if (selectedCustomerId && selectedCustomerId !== entry.customer_id) {
      form.setValue("customer_bank_id", "");
    }
  }, [selectedCustomerId, entry, form]);

  async function onSubmit(values: CorrectionRequestFormValues) {
    if (!entry) return;

    const { reason, ...proposed } = values;
    const proposedChanges: Record<string, unknown> = {};

    if (proposed.customer_id !== entry.customer_id)
      proposedChanges.customer_id = proposed.customer_id;
    if (proposed.product_id !== entry.product_id)
      proposedChanges.product_id = proposed.product_id;
    if (Number(proposed.quantity) !== entry.quantity)
      proposedChanges.quantity = Number(proposed.quantity);
    if (Number(proposed.price_per_ton) !== entry.price_per_ton)
      proposedChanges.price_per_ton = Number(proposed.price_per_ton);
    if (Number(proposed.transport_in) !== (entry.transport_in ?? 0))
      proposedChanges.transport_in = Number(proposed.transport_in);
    if (Number(proposed.tanzeel) !== (entry.tanzeel ?? 0))
      proposedChanges.tanzeel = Number(proposed.tanzeel);
    if (Number(proposed.amount_paid) !== entry.amount_paid)
      proposedChanges.amount_paid = Number(proposed.amount_paid);
    if ((proposed.bank_id ?? "") !== (entry.bank_id ?? ""))
      proposedChanges.bank_id = proposed.bank_id || null;
    if ((proposed.customer_bank_id ?? "") !== (entry.customer_bank_id ?? ""))
      proposedChanges.customer_bank_id = proposed.customer_bank_id || null;
    if (Number(proposed.transport_cost) !== entry.transport_cost)
      proposedChanges.transport_cost = Number(proposed.transport_cost);
    if ((proposed.driver_name ?? "") !== (entry.driver_name ?? ""))
      proposedChanges.driver_name = proposed.driver_name || null;
    if ((proposed.notes ?? "") !== (entry.notes ?? ""))
      proposedChanges.notes = proposed.notes;

    if (Object.keys(proposedChanges).length === 0) {
      toast.error("لم يتم تغيير أي قيمة");
      return;
    }

    requestCorrection.mutate(
      {
        entry_id: entry.id,
        proposed_changes: proposedChanges,
        reason,
        requested_by: userId,
      },
      {
        onSuccess: () => {
          onClose();
        },
      }
    );
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>طلب تصحيح عملية</DialogTitle>
        </DialogHeader>
        {entry && (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="reason"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سبب التصحيح *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="اكتب سبب التصحيح (10 أحرف على الأقل)..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>العميل</FormLabel>
                      <FormControl>
                        <CustomerCombobox
                          customers={customers}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="product_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الصنف</FormLabel>
                      <FormControl>
                        <ProductSelect
                          products={products}
                          value={field.value}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="quantity"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>الكمية (طن)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.001" min="0" {...field} dir="ltr" className="text-left" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="price_per_ton"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر الطن</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transport_in"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نقلة (تحصيل نقل)</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="tanzeel"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>التنزيل</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="amount_paid"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>المدفوع</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="bank_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>البنك</FormLabel>
                      <FormControl>
                        <BankSelect
                          banks={banks}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="كاش / بدون بنك"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="transport_cost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>النولون</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" min="0" {...field} dir="ltr" className="text-left" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {customerBanks.length > 0 && (
                  <FormField
                    control={form.control}
                    name="customer_bank_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>حساب العميل البنكي</FormLabel>
                        <FormControl>
                          <CustomerBankSelect
                            accounts={customerBanks}
                            value={field.value ?? ""}
                            onChange={field.onChange}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
                <FormField
                  control={form.control}
                  name="driver_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>السائق</FormLabel>
                      <FormControl>
                        <Input type="text" placeholder="اسم السائق" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ملاحظات</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={onClose}>
                  إلغاء
                </Button>
                <Button type="submit" disabled={requestCorrection.isPending}>
                  {requestCorrection.isPending
                    ? "جاري الإرسال..."
                    : "إرسال طلب التصحيح"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}