"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatCurrency } from "@/lib/utils";
import {
  addEntrySchema,
  type AddEntryFormValues,
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
import { Separator } from "@/components/ui/separator";
import { CustomerCombobox } from "@/components/shared/customer-combobox";
import { ProductSelect } from "@/components/shared/product-select";
import { BankSelect } from "@/components/shared/bank-select";
import { CustomerBankSelect } from "@/components/shared/customer-bank-select";
import { useCustomers, useCementProducts } from "@/hooks/use-cement-daily-queries";
import { useBanks } from "@/hooks/use-banks";
import { useCustomerBankAccounts } from "@/hooks/use-customer-bank-accounts";
import { useAddCementEntry } from "@/hooks/use-cement-daily-mutations";

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  userId: string;
  isAdmin: boolean;
}

export function AddEntryDialog({
  open,
  onOpenChange,
  date,
  userId,
  isAdmin,
}: AddEntryDialogProps) {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useCementProducts();
  const { data: banks = [] } = useBanks();
  const addEntry = useAddCementEntry(date);

  const form = useForm<AddEntryFormValues>({
    resolver: zodResolver(addEntrySchema),
    defaultValues: {
      entry_date: date,
      customer_id: "",
      product_id: "",
      quantity: "0",
      price_per_ton: "0",
      transport_in: "0",
      tanzeel: "0",
      amount_paid: "0",
      bank_id: "",
      customer_bank_id: "",
      transport_cost: "0",
      driver_name: "",
      cost_per_ton: "",
      notes: "",
    },
  });

  const selectedCustomerId = form.watch("customer_id");
  const { data: customerBanks = [] } = useCustomerBankAccounts(selectedCustomerId);

  // Reset customer bank when customer changes
  useEffect(() => {
    form.setValue("customer_bank_id", "");
  }, [selectedCustomerId, form]);

  // Computed values for preview
  const quantity = Number(form.watch("quantity") || 0);
  const pricePerTon = Number(form.watch("price_per_ton") || 0);
  const transportIn = Number(form.watch("transport_in") || 0);
  const tanzeel = Number(form.watch("tanzeel") || 0);
  const amountPaid = Number(form.watch("amount_paid") || 0);
  const transportCost = Number(form.watch("transport_cost") || 0);
  const costPerTon = Number(form.watch("cost_per_ton") || 0);

  const total = quantity * pricePerTon;
  const netTotal = total + transportIn - tanzeel;
  const remaining = netTotal - amountPaid;
  const totalTransport = quantity * transportCost;

  const profitPreview =
    isAdmin && costPerTon > 0
      ? total + transportIn - quantity * costPerTon - quantity * transportCost - tanzeel
      : null;

  async function onSubmit(values: AddEntryFormValues) {
    const insertData: Record<string, unknown> = {
      entry_date: values.entry_date,
      customer_id: values.customer_id,
      product_id: values.product_id,
      quantity: Number(values.quantity),
      price_per_ton: Number(values.price_per_ton),
      transport_in: Number(values.transport_in),
      tanzeel: Number(values.tanzeel),
      amount_paid: Number(values.amount_paid),
      bank_id: values.bank_id || null,
      customer_bank_id: values.customer_bank_id || null,
      transport_cost: Number(values.transport_cost),
      driver_name: values.driver_name || null,
      notes: values.notes || null,
      created_by: userId,
    };

    if (isAdmin && values.cost_per_ton) {
      insertData.cost_per_ton = Number(values.cost_per_ton);
    }

    addEntry.mutate(insertData, {
      onSuccess: () => {
        form.reset({
          entry_date: date,
          customer_id: "",
          product_id: "",
          quantity: "0",
          price_per_ton: "0",
          transport_in: "0",
          tanzeel: "0",
          amount_paid: "0",
          bank_id: "",
          customer_bank_id: "",
          transport_cost: "0",
          driver_name: "",
          cost_per_ton: "",
          notes: "",
        });
        onOpenChange(false);
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>إضافة عملية جديدة</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Row 1: Date + Customer */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="entry_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التاريخ</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} dir="ltr" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
            </div>

            {/* Row 2: Product + Quantity */}
            <div className="grid grid-cols-2 gap-4">
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
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        {...field}
                        dir="ltr"
                        className="text-left"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 3: Price + Transport In */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price_per_ton"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>سعر الطن</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        dir="ltr"
                        className="text-left"
                      />
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
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        dir="ltr"
                        className="text-left"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 4: Total + Tanzeel */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الإجمالي</label>
                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-semibold">
                  {formatCurrency(total)}
                </div>
              </div>
              <FormField
                control={form.control}
                name="tanzeel"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>التنزيل</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        dir="ltr"
                        className="text-left"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Net total preview */}
            <div className="rounded-md border bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">الإجمالي + النقلة - التنزيل</span>
                <span className="font-semibold">
                  {formatCurrency(total)} + {formatCurrency(transportIn)} - {formatCurrency(tanzeel)} = {formatCurrency(netTotal)}
                </span>
              </div>
            </div>

            {/* Row 5: Amount Paid + Bank */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="amount_paid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>المدفوع</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        dir="ltr"
                        className="text-left"
                      />
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
                    <FormLabel>البنك (اختياري)</FormLabel>
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
            </div>

            {/* Customer Bank (shown when customer has accounts on file) */}
            {customerBanks.length > 0 && (
              <FormField
                control={form.control}
                name="customer_bank_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>حساب العميل البنكي (اختياري)</FormLabel>
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

            {/* Row 6: Remaining + Transport Cost */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">الباقي</label>
                <div
                  className={`flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-semibold ${
                    remaining > 0 ? "text-destructive" : "text-green-600"
                  }`}
                >
                  {formatCurrency(remaining)}
                </div>
              </div>
              <FormField
                control={form.control}
                name="transport_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>النولون (للطن)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        {...field}
                        dir="ltr"
                        className="text-left"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Row 7: Total Transport + Driver */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">إجمالي النولون</label>
                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-semibold">
                  {formatCurrency(totalTransport)}
                </div>
              </div>
              <FormField
                control={form.control}
                name="driver_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>السائق</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="اسم السائق"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Admin: Cost Per Ton + Profit Preview */}
            {isAdmin && (
              <>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="cost_per_ton"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>سعر التكلفة (للطن)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            {...field}
                            value={field.value ?? ""}
                            dir="ltr"
                            className="text-left"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="space-y-2">
                    <label className="text-sm font-medium">إجمالي الربح (تقديري)</label>
                    <div
                      className={`flex h-9 items-center rounded-md border px-3 text-sm font-semibold ${
                        profitPreview != null
                          ? profitPreview >= 0
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-red-50 text-destructive border-red-200"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {profitPreview != null
                        ? formatCurrency(profitPreview)
                        : "أدخل سعر التكلفة"}
                    </div>
                  </div>
                </div>
              </>
            )}

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
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                إلغاء
              </Button>
              <Button type="submit" disabled={addEntry.isPending}>
                {addEntry.isPending ? "جاري الحفظ..." : "حفظ"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}