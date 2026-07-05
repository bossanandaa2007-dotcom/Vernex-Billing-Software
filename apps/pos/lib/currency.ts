export const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '\u20B9',
  USD: '$',
  EUR: '\u20AC',
  GBP: '\u00A3',
  AED: '\u062F.\u0625',
};

export function getCurrencySymbol(currency = 'INR') {
  return CURRENCY_SYMBOLS[currency] ?? currency;
}

export function formatMoney(value: number | string | null | undefined, currency = 'INR') {
  const amount = Number(value ?? 0);
  return `${getCurrencySymbol(currency)}${amount.toFixed(2)}`;
}
