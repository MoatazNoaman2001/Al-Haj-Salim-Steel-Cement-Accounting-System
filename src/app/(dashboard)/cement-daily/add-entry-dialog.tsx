"use client";

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
import { CustomerCombobox } from "@/components/shared/customer-combobox";
import { ProductSelect } from "@/components/shared/product-select";
import { useCustomers, useCementProducts } from "@/hooks/use-cement-daily-queries";
import { useAddCementEntry } from "@/hooks/use-cement-daily-mutations";

interface AddEntryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string;
  userId: string;
  isAdmin: boolean;
  category?: string;
}

export function AddEntryDialog({
  open,
  onOpenChange,
  date,
  userId,
  isAdmin,
  category = "cement",
}: AddEntryDialogProps) {
  const { data: customers = [] } = useCustomers();
  const { data: products = [] } = useCementProducts(category);
  const addEntry = useAddCementEntry(date);

  const form = useForm<AddEntryFormValues>({
    resolver: zodResolver(addEntrySchema),
    defaultValues: {
      entry_date: date,
      customer_id: "",
      product_id: "",
      quantity: "0",
      price_per_ton: "0",
      amount_paid: "0",
      transport_cost: "0",
      driver_name: "",
      cost_per_ton: "",
      notes: "",
    },
  });

  const quantity = form.watch("quantity") || 0;
  const pricePerTon = form.watch("price_per_ton") || 0;
  const amountPaid = form.watch("amount_paid") || 0;
  const transportCost = form.watch("transport_cost") || 0;
  const total = Number(quantity) * Number(pricePerTon);
  const remaining = total - Number(amountPaid);
  const totalTransport = Number(quantity) * Number(transportCost);

  async function onSubmit(values: AddEntryFormValues) {
    const insertData: Record<string, unknown> = {
      entry_date: values.entry_date,
      customer_id: values.customer_id,
      product_id: values.product_id,
      quantity: Number(values.quantity),
      price_per_ton: Number(values.price_per_ton),
      amount_paid: Number(values.amount_paid),
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
          amount_paid: "0",
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>إضافة عملية جديدة</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
              <div className="space-y-2">
                <label className="text-sm font-medium">الإجمالي</label>
                <div className="flex h-9 items-center rounded-md border bg-muted px-3 text-sm font-semibold">
                  {formatCurrency(total)}
                </div>
              </div>
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
                    <FormLabel>النولون</FormLabel>
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
              {isAdmin && (
                <FormField
                  control={form.control}
                  name="cost_per_ton"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>سعر التكلفة</FormLabel>
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
              )}
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
