const base = process.env.BASE_URL || 'http://localhost:3000';
const jsonHeaders = { 'content-type': 'application/json' };
const h = (role) => ({ ...jsonHeaders, 'x-vernex-test-role': role });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function request(path, { role = 'OWNER', method = 'GET', body, expected = 200 } = {}) {
  const response = await fetch(base + path, { method, headers: h(role), body: body === undefined ? undefined : JSON.stringify(body) });
  const data = await response.json().catch(() => ({}));
  if (response.status !== expected) throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(data)}`);
  return data;
}

const post = (path, body, role = 'OWNER', expected = 200) => request(path, { method: 'POST', body, role, expected });
const patch = (path, body, role = 'OWNER', expected = 200) => request(path, { method: 'PATCH', body, role, expected });

await request('/api/auth/context', { role: 'OWNER' });
await request('/api/staff', { role: 'OWNER' });
await request('/api/staff', { role: 'MANAGER', expected: 403 });
await request('/api/audit-logs', { role: 'CASHIER', expected: 403 });
await request('/api/profit?start=2026-01-01&end=2026-01-02', { role: 'CASHIER', expected: 403 });
await post('/api/inventory-ledger', { productId: 'PEN-001', newStock: 200, reason: 'Phase 6 cashier block' }, 'CASHIER', 403);
await post('/api/restock', { productId: 'PEN-001', stock: 1, reason: 'Phase 6 manager restock' }, 'MANAGER');

const originalShop = (await request('/api/shopdata', { role: 'OWNER' })).data;
await post('/api/shopdata', { billPrefix: 'P6T', billPadding: 6 }, 'MANAGER', 403);
await post('/api/shopdata', { billPrefix: 'P6T', billPadding: 6 }, 'OWNER');

const customer = await post('/api/customers', { name: 'Phase Six Customer', phone: '+91 90000 00006', email: `phase6-${Date.now()}@example.com`, country: 'India' }, 'CASHIER', 201);
const bill = await post('/api/transactions', undefined, 'CASHIER', 201);
await post('/api/onsale', { productId: 'PEN-001', transactionId: bill.id, qTy: 1 }, 'CASHIER', 201);
const sale = await patch(`/api/transactions/${bill.id}`, { discount: 0, paymentMethod: 'CASH', amountReceived: 20, customerId: customer.id }, 'CASHIER');
assert(sale.billNumber?.startsWith('P6T-'), 'Owner bill settings did not apply.');

const receipt = await request(`/api/transactions/${sale.id}`, { role: 'MANAGER' });
await post('/api/returns', { transactionId: sale.id, refundMethod: 'CASH', reason: 'Phase 6 verification return', items: [{ saleLineId: receipt.items[0].id, quantity: 1 }] }, 'CASHIER', 403);
await post('/api/returns', { transactionId: sale.id, refundMethod: 'CASH', reason: 'Phase 6 verification return', items: [{ saleLineId: receipt.items[0].id, quantity: 1 }] }, 'MANAGER', 201);

const logs = await request('/api/audit-logs', { role: 'OWNER' });
assert(logs.some((log) => log.action === 'SALE_COMPLETED' && log.referenceNumber === sale.billNumber), 'Sale audit log missing.');
assert(logs.some((log) => log.action === 'RETURN_CREATED' && log.referenceNumber === sale.billNumber), 'Return audit log missing.');
assert(logs.some((log) => log.action === 'STOCK_RESTOCKED'), 'Stock audit log missing.');

await request(`/api/customers/${customer.id}`, { method: 'DELETE', role: 'OWNER' });
await post('/api/shopdata', {
  billPrefix: originalShop.billPrefix || 'VNX',
  billPadding: originalShop.billPadding || 6,
  showBusinessLogo: originalShop.showBusinessLogo,
  showTaxId: originalShop.showTaxId,
  showCustomerDetails: originalShop.showCustomerDetails,
  showItemTax: originalShop.showItemTax,
  showFooter: originalShop.showFooter,
}, 'OWNER');

console.log(JSON.stringify({
  ok: true,
  ownerAccess: true,
  managerBlockedFromStaff: true,
  cashierBlockedFromReportsSettingsStockReturns: true,
  cashierCheckoutBill: sale.billNumber,
  managerReturn: true,
  auditSale: true,
  auditReturn: true,
  auditStock: true,
}, null, 2));

