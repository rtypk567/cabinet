// Демо-данные: на втором шаге заменяются запросами к базе.
// Даты считаются от текущего дня, чтобы экран выглядел живым.

export type Operation = {
  id: string;
  kind: "sale" | "payment";
  title: string;
  category: string;
  day: "today" | "yesterday";
  time: string;
  amount: number;
  tax: number | null;
};

export const TAX_RATE = 0.04;

const sale = (
  id: string,
  category: string,
  day: Operation["day"],
  time: string,
  amount: number,
): Operation => ({
  id,
  kind: "sale",
  title: "Продажа",
  category,
  day,
  time,
  amount,
  tax: Math.round(amount * TAX_RATE * 100) / 100,
});

export const operations: Operation[] = [
  sale("op-3", "услуга", "today", "12:53", 1150),
  sale("op-2", "услуга", "today", "11:04", 890),
  sale("op-1", "товар", "yesterday", "18:30", 1500),
  {
    id: "op-0",
    kind: "payment",
    title: "Налог оплачен",
    category: "за прошлый месяц",
    day: "yesterday",
    time: "10:12",
    amount: 980,
    tax: null,
  },
];

export function getSummary(now = new Date()) {
  const sales = operations.filter((o) => o.kind === "sale");
  const revenue = sales.reduce((s, o) => s + o.amount, 0);
  const preliminaryTax = Math.round(revenue * TAX_RATE * 100) / 100;

  const month = now.toLocaleDateString("ru-RU", { month: "long" });
  const nextMonth28 = new Date(now.getFullYear(), now.getMonth() + 1, 28);

  return {
    monthLabel: month,
    revenue,
    preliminaryTax,
    debt: 0,
    taxToPay: 1250,
    payUntil: nextMonth28.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }),
    salesCount: sales.length,
  };
}

export function getMonthlyBars(now = new Date()) {
  const heights = [38, 52, 46, 70, 94]; // демо-значения, % от максимума
  return heights.map((h, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (heights.length - 1 - i), 1);
    const raw = d.toLocaleDateString("ru-RU", { month: "short" }).replace(".", "");
    return { label: raw.charAt(0).toUpperCase() + raw.slice(1), height: h, current: i === heights.length - 1 };
  });
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

export function formatMoneyShort(value: number): string {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(value);
}
