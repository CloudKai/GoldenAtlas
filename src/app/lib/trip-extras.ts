// Pure helpers for trip expenses, companions and the cover photo.
import type { Trip, TripExpense } from "../types/domain";

/** The numeric(12,2) column holds just under 10 billion. */
export const MAX_EXPENSE = 9_999_999_999.99;

/** Currencies offered first; any other code from a country's default is added to the list automatically. */
export const COMMON_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF", "CNY", "HKD", "SGD", "NZD", "THB", "MYR", "IDR", "INR", "KRW", "PHP", "VND", "AED", "MXN", "BRL", "ZAR", "SEK", "NOK", "DKK"] as const;

export function currencyOptions(extra: Array<string | undefined> = []) {
  const codes = new Set<string>(COMMON_CURRENCIES);
  extra.forEach((code) => { if (code && /^[A-Z]{3}$/.test(code)) codes.add(code); });
  return [...codes];
}

/** Reads what a person typed ("1,234.5", "$ 80") into an amount, or undefined when it is not a usable number. */
export function parseAmount(text: string): number | undefined {
  const cleaned = text.replace(/[\s,$€£¥]/g, "");
  if (!/^\d*\.?\d*$/.test(cleaned) || cleaned === "" || cleaned === ".") return undefined;
  const value = Math.round(Number(cleaned) * 100) / 100;
  return Number.isFinite(value) && value >= 0 && value <= MAX_EXPENSE ? value : undefined;
}

export function formatMoney(amount: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, { style: "currency", currency, maximumFractionDigits: amount % 1 === 0 ? 0 : 2 }).format(amount);
  } catch {
    return `${currency} ${amount.toFixed(2)}`;
  }
}

/** Why an expense cannot be saved, or null. */
export function expenseProblem(expense: TripExpense | undefined) {
  if (!expense) return null;
  if (!Number.isFinite(expense.amount) || expense.amount < 0 || expense.amount > MAX_EXPENSE) return "Enter an expense between 0 and 9,999,999,999.99.";
  if (!/^[A-Z]{3}$/.test(expense.currency)) return "Choose a currency for the expense.";
  return null;
}

export interface ExpenseTotal {
  currency: string;
  amount: number;
  trips: number;
}

/** Totals per currency. Different currencies are never added together. */
export function expenseTotals(trips: readonly Pick<Trip, "expense">[]): ExpenseTotal[] {
  const totals = new Map<string, ExpenseTotal>();
  trips.forEach(({ expense }) => {
    if (!expense) return;
    const current = totals.get(expense.currency) ?? { currency: expense.currency, amount: 0, trips: 0 };
    current.amount = Math.round((current.amount + expense.amount) * 100) / 100;
    current.trips += 1;
    totals.set(expense.currency, current);
  });
  return [...totals.values()].sort((a, b) => b.trips - a.trips || a.currency.localeCompare(b.currency));
}

/** Adds a companion by name, ignoring blanks and duplicates (case-insensitive). */
export function addCompanion(list: readonly string[], name: string): string[] {
  const trimmed = name.trim().replace(/\s+/g, " ").slice(0, 120);
  if (!trimmed || list.some((existing) => existing.toLowerCase() === trimmed.toLowerCase())) return [...list];
  return [...list, trimmed];
}

/** The cover is the trip's first photo, so choosing a cover moves that photo to the front. */
export function setCoverPhoto(trip: Trip, photoId: string): Trip {
  const chosen = trip.photos.find((photo) => photo.id === photoId);
  if (!chosen || trip.photos[0]?.id === photoId) return trip;
  return { ...trip, photos: [chosen, ...trip.photos.filter((photo) => photo.id !== photoId)] };
}
