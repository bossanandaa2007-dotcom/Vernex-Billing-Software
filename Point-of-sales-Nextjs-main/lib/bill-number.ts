export function formatBillNumber(value: number, prefix = 'VNX', padding = 6) {
  const safePrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 12) || 'VNX';
  const safePadding = Math.min(10, Math.max(1, Math.trunc(padding)));
  return `${safePrefix}-${String(value).padStart(safePadding, '0')}`;
}
