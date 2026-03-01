import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const currencyFormatter = new Intl.NumberFormat("ar-EG", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const quantityFormatter = new Intl.NumberFormat("ar-EG", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export function formatCurrency(value: number | null | undefined): string {
  if (value == null) return "—";
  return currencyFormatter.format(value);
}

export function formatQuantity(value: number | null | undefined): string {
  if (value == null) return "—";
  return quantityFormatter.format(value);
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}
