export const cementDailyKeys = {
  all: ["cement-daily"] as const,
  entries: (date: string) => ["cement-daily", "entries", date] as const,
  customers: () => ["cement-daily", "customers"] as const,
  products: (category: string) => ["cement-daily", "products", category] as const,
  inventory: (date: string) => ["cement-daily", "inventory", date] as const,
  deposits: (date: string) => ["cement-daily", "deposits", date] as const,
  cashBalance: (date: string) => ["cement-daily", "cash-balance", date] as const,
};
