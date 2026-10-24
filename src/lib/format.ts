export function money(value: number, currency: 'CAD' | 'USD', compact = false): string {
  return new Intl.NumberFormat('en-CA', { style: 'currency', currency, maximumFractionDigits: compact ? 1 : 0, notation: compact ? 'compact' : 'standard' }).format(value);
}
export const integer = (value: number) => new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 }).format(value);
export const pct = (value: number) => `${value.toFixed(1)}%`;
