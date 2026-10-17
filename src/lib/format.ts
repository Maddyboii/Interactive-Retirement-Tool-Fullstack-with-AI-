export type CurrencyCode = "INR" | "USD" | "EUR" | "GBP";

export const CURRENCIES: Record<CurrencyCode, { locale: string; symbol: string; label: string }> = {
  INR: { locale: "en-IN", symbol: "₹", label: "Indian Rupee (₹)" },
  USD: { locale: "en-US", symbol: "$", label: "US Dollar ($)" },
  EUR: { locale: "de-DE", symbol: "€", label: "Euro (€)" },
  GBP: { locale: "en-GB", symbol: "£", label: "British Pound (£)" },
};

export function formatMoney(value: number, currency: CurrencyCode): string {
  if (!Number.isFinite(value)) return "—";
  const c = CURRENCIES[currency];
  return new Intl.NumberFormat(c.locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(value);
}

/** Compact: ₹1.25 Cr / ₹4.5 L for INR, $1.2M otherwise. */
export function formatCompact(value: number, currency: CurrencyCode): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value < 0 ? "-" : "";
  const v = Math.abs(value);
  const sym = CURRENCIES[currency].symbol;
  if (currency === "INR") {
    if (v >= 1e7) return `${sign}${sym}${(v / 1e7).toFixed(2)} Cr`;
    if (v >= 1e5) return `${sign}${sym}${(v / 1e5).toFixed(2)} L`;
    if (v >= 1e3) return `${sign}${sym}${(v / 1e3).toFixed(1)}K`;
    return `${sign}${sym}${v.toFixed(0)}`;
  }
  return sign + new Intl.NumberFormat(CURRENCIES[currency].locale, { style: "currency", currency, notation: "compact", maximumFractionDigits: 2 }).format(v);
}

export const formatPct = (v: number, digits = 0) => (Number.isFinite(v) ? `${v.toFixed(digits)}%` : "—");
