"use client";

import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  Hammer,
  FileText,
  Coins,
  Calculator,
  CheckCircle2,
  XCircle,
  CircleAlert,
  Landmark,
  Users,
  Truck,
  CalendarCheck,
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRight,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatCurrency, formatQuantity, formatDate, cn } from "@/lib/utils";
import { useUser } from "@/hooks/use-user";
import { useDashboardData } from "@/hooks/use-dashboard-data";

export interface DashboardData {
  today: string;
  cement: { revenue: number; quantity: number; count: number };
  steel:  { revenue: number; quantity: number; count: number };
  profit: number;
  cashier: { debit: number; credit: number; count: number; balanced: boolean };
  deposits: number;
  cashBalance: number;
  banks: { id: string; name: string; balance: number }[];
  receivables:      { total: number; count: number };
  payables:         { total: number; count: number };
  reservationsHeld: { total: number; count: number };
}

interface DashboardClientProps {
  data: DashboardData;
}

export function DashboardClient({ data: serverData }: DashboardClientProps) {
  const { isAdmin } = useUser();
  const { data, isFetching, isOffline } = useDashboardData(serverData);

  const totalBankBalance = data.banks.reduce((s, b) => s + b.balance, 0);
  const liquidity = data.cashBalance + totalBankBalance;
  const cashierDelta = data.cashier.credit - data.cashier.debit;

  return (
    <div className="py-6 space-y-6">
      {/* ============== Tier 1: Liquidity Hero ============== */}
      <section>
        <Card className="border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="p-6 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Wallet className="h-4 w-4" />
                  إجمالي السيولة المتاحة
                  {isOffline && (
                    <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/40 text-amber-600">
                      <WifiOff className="h-3 w-3" />
                      وضع عدم الاتصال
                    </Badge>
                  )}
                  {isFetching && !isOffline && (
                    <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
                  )}
                </div>
                <p className="text-4xl font-bold text-primary tracking-tight mt-2">
                  {formatCurrency(liquidity)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  اعتباراً من {formatDate(data.today)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3 min-w-[280px]">
                <MiniStat
                  icon={<Coins className="h-4 w-4" />}
                  label="نقدية في الخزنة"
                  value={data.cashBalance}
                />
                <MiniStat
                  icon={<Landmark className="h-4 w-4" />}
                  label="إجمالي البنوك"
                  value={totalBankBalance}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ============== Tier 2: Today's Pulse ============== */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">نبض اليوم</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Cement */}
          <KpiCard
            icon={<FileText className="h-4 w-4" />}
            label="مبيعات الأسمنت"
            value={formatCurrency(data.cement.revenue)}
            valueColor="text-emerald-600"
            footer={
              data.cement.count
                ? `${formatQuantity(data.cement.quantity)} طن • ${data.cement.count} عملية`
                : "لا توجد مبيعات"
            }
            href="/cement-daily"
          />
          {/* Steel */}
          <KpiCard
            icon={<Hammer className="h-4 w-4" />}
            label="مبيعات الحديد"
            value={formatCurrency(data.steel.revenue)}
            valueColor="text-emerald-600"
            footer={
              data.steel.count
                ? `${formatQuantity(data.steel.quantity)} طن • ${data.steel.count} عملية`
                : "لا توجد مبيعات"
            }
            href="/steel-daily"
          />
          {/* Profit (admin only) */}
          {isAdmin && (
            <KpiCard
              icon={<TrendingUp className="h-4 w-4" />}
              label="ربح اليوم"
              value={formatCurrency(data.profit)}
              valueColor={
                data.profit > 0 ? "text-emerald-600" :
                data.profit < 0 ? "text-red-600" : ""
              }
              footer="مجموع الأسمنت والحديد"
              href="/reports"
            />
          )}
          {/* Cashier */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calculator className="h-4 w-4" />
                حالة يومية الكاشير
              </div>
              {data.cashier.count > 0 ? (
                <>
                  <div className="flex items-center gap-2 mt-2">
                    {data.cashier.balanced ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        <span className="text-lg font-bold text-emerald-600">متزنة</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="h-5 w-5 text-red-600" />
                        <span className="text-lg font-bold text-red-600">غير متزنة</span>
                      </>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-2">
                    عليه: <span className="text-red-600 font-medium">{formatCurrency(data.cashier.debit)}</span>
                    {" • "}
                    له: <span className="text-emerald-600 font-medium">{formatCurrency(data.cashier.credit)}</span>
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    الفرق: <span className={cn(
                      "font-semibold",
                      cashierDelta < 0 ? "text-red-600" : cashierDelta > 0 ? "text-emerald-600" : "",
                    )}>{formatCurrency(cashierDelta)}</span>
                    {" • "}{data.cashier.count} قيد
                  </p>
                </>
              ) : (
                <div className="mt-2 flex items-center gap-2 text-muted-foreground">
                  <CircleAlert className="h-4 w-4" />
                  <span className="text-sm">لا توجد قيود اليوم</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ============== Tier 3: Money Map ============== */}
      <section>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3">خريطة الأموال</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Bank balances */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Landmark className="h-4 w-4" />
                  أرصدة البنوك
                </CardTitle>
                <Link href="/banks" className="text-xs text-primary hover:underline flex items-center gap-1">
                  عرض الكل <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {data.banks.length ? (
                <div className="flex flex-col">
                  <ScrollArea className="h-[260px] pe-2">
                    <ul className="space-y-1">
                      {data.banks.map((bank) => (
                        <li key={bank.id}>
                          <Link
                            href={`/banks/${bank.id}`}
                            className="flex items-center justify-between rounded-md px-2 py-1.5 text-sm hover:bg-accent transition-colors"
                          >
                            <span className="font-medium truncate">{bank.name}</span>
                            <span className={cn(
                              "font-semibold tabular-nums",
                              bank.balance < 0 ? "text-red-600" : "text-foreground",
                            )}>
                              {formatCurrency(bank.balance)}
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </ScrollArea>
                  <Separator className="my-2" />
                  <div className="flex items-center justify-between px-2 py-1 text-sm font-bold">
                    <span>الإجمالي</span>
                    <span className="text-primary tabular-nums">{formatCurrency(totalBankBalance)}</span>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-6">
                  لا توجد بنوك مسجلة بعد.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Receivables / Payables / Reservations */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUpFromLine className="h-4 w-4" />
                المستحقات والالتزامات
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              <MoneyRow
                icon={<Users className="h-4 w-4 text-emerald-600" />}
                label="مستحقات على العملاء"
                hint="ما يدين به العملاء لنا"
                value={data.receivables.total}
                count={data.receivables.count}
                valueColor="text-emerald-600"
                href="/customers"
              />
              <Separator />
              <MoneyRow
                icon={<Truck className="h-4 w-4 text-red-600" />}
                label="علينا للموردين"
                hint="ما ندين به للموردين"
                value={data.payables.total}
                count={data.payables.count}
                valueColor="text-red-600"
                href="/suppliers"
              />
              <Separator />
              <MoneyRow
                icon={<CalendarCheck className="h-4 w-4 text-blue-600" />}
                label="محجوز للعملاء"
                hint="مبالغ محتجزة كحجوزات"
                value={data.reservationsHeld.total}
                count={data.reservationsHeld.count}
                valueColor="text-blue-600"
                href="/reservations"
              />
              <Separator className="my-2" />
              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2">
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <ArrowDownToLine className="h-4 w-4" />
                  صافي المركز المالي
                </div>
                <span className={cn(
                  "text-lg font-bold tabular-nums",
                  (data.receivables.total - data.payables.total) >= 0 ? "text-emerald-600" : "text-red-600",
                )}>
                  {formatCurrency(data.receivables.total - data.payables.total)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-md border bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className={cn(
        "text-base font-bold tabular-nums mt-1",
        value < 0 ? "text-red-600" : "",
      )}>
        {formatCurrency(value)}
      </p>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  valueColor,
  footer,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
  footer?: string;
  href?: string;
}) {
  const inner = (
    <Card className={cn(href && "hover:border-primary/40 transition-colors cursor-pointer")}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {icon}
          {label}
        </div>
        <p className={cn("text-2xl font-bold tabular-nums mt-2", valueColor)}>
          {value}
        </p>
        {footer && (
          <p className="text-[11px] text-muted-foreground mt-1.5">{footer}</p>
        )}
      </CardContent>
    </Card>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}

function MoneyRow({
  icon,
  label,
  hint,
  value,
  count,
  valueColor,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  hint: string;
  value: number;
  count: number;
  valueColor?: string;
  href?: string;
}) {
  const inner = (
    <div className={cn(
      "flex items-center justify-between rounded-md px-2 py-2 transition-colors",
      href && "hover:bg-accent cursor-pointer",
    )}>
      <div className="flex items-start gap-2 min-w-0">
        <span className="mt-0.5">{icon}</span>
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{label}</div>
          <div className="text-[11px] text-muted-foreground truncate">{hint}</div>
        </div>
      </div>
      <div className="flex flex-col items-end gap-1 shrink-0">
        <span className={cn("font-bold tabular-nums", valueColor)}>
          {formatCurrency(value)}
        </span>
        <Badge variant="secondary" className="text-[10px] px-1.5 h-4">
          {count}
        </Badge>
      </div>
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
