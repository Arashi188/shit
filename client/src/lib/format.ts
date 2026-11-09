export function formatMoney(amountMinor: number, currencyCode: string, exponent: number): string {
  const major = amountMinor / 10 ** exponent;
  try {
    return new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    }).format(major);
  } catch {
    return `${currencyCode} ${major.toLocaleString("en-GB", {
      minimumFractionDigits: exponent,
      maximumFractionDigits: exponent,
    })}`;
  }
}

export function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { month: "short", day: "numeric", year: "numeric" });
}

export function discountPercent(priceMinor: number, compareAtMinor: number | null): number | null {
  if (!compareAtMinor || compareAtMinor <= priceMinor) return null;
  return Math.round(((compareAtMinor - priceMinor) / compareAtMinor) * 100);
}
