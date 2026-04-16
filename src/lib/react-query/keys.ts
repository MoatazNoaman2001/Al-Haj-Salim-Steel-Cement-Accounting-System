export const cementDailyKeys = {
  all: ["cement-daily"] as const,
  entries: (date: string, category: string = "cement") =>
    ["cement-daily", "entries", date, category] as const,
  customers: () => ["cement-daily", "customers"] as const,
  products: (category: string) => ["cement-daily", "products", category] as const,
  inventory: (date: string, category: string = "cement") =>
    ["cement-daily", "inventory", date, category] as const,
  deposits: (date: string) => ["cement-daily", "deposits", date] as const,
  cashBalance: (date: string) => ["cement-daily", "cash-balance", date] as const,
};
