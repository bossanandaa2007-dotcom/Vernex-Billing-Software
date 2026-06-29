const base = process.env.BASE_URL || 'http://localhost:3000';
const jsonHeaders = { 'content-type': 'application/json' };
const h = (role) => ({ ...jsonHeaders, 'x-vernex-test-role': role });
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function request(path, { role = 'OWNER', method = 'GET', body, expected = 200, json = true } = {}) {
  const response = await fetch(base + path, { method, headers: h(role), body: body === undefined ? undefined : JSON.stringify(body) });
  const data = json ? await response.json().catch(() => ({})) : await response.text();
  if (response.status !== expected) throw new Error(`${method} ${path}: expected ${expected}, got ${response.status}: ${JSON.stringify(data).slice(0, 300)}`);
  return data;
}

const post = (path, body, role = 'OWNER', expected = 200) => request(path, { method: 'POST', body, role, expected });
const patch = (path, body, role = 'OWNER', expected = 200) => request(path, { method: 'PATCH', body, role, expected });

const originalShop = (await request('/api/shopdata')).data;
await post('/api/shopdata', { billPrefix: 'P7T', billPadding: 6 }, 'OWNER');
const customer = await post('/api/customers', { name: 'Phase Seven Customer', phone: '+91 90000 00007', email: `phase7-${Date.now()}@example.com`, country: 'India' }, 'OWNER', 201);

const incomplete = await post('/api/transactions', undefined, 'OWNER', 201);
await post('/api/onsale', { productId: 'TEA-001', transactionId: incomplete.id, qTy: 1 }, 'OWNER', 201);

const saleStart = await post('/api/transactions', undefined, 'OWNER', 201);
await post('/api/onsale', { productId: 'TEA-001', transactionId: saleStart.id, qTy: 2 }, 'OWNER', 201);
const sale = await patch(`/api/transactions/${saleStart.id}`, { discount: 0, paymentMethod: 'UPI', amountReceived: 40, customerId: customer.id }, 'OWNER');
const receipt = await request(`/api/transactions/${sale.id}`, { role: 'OWNER' });
await post('/api/returns', { transactionId: sale.id, refundMethod: 'CASH', reason: 'Phase 7 verification return', items: [{ saleLineId: receipt.items[0].id, quantity: 1 }] }, 'MANAGER', 201);

const dashboard = await request('/api/dashboard', { role: 'OWNER' });
assert(typeof dashboard.netRevenueToday === 'number', 'Dashboard net revenue missing.');
assert(dashboard.todayBills >= 1, 'Dashboard completed bill count missing.');
assert(dashboard.topSellingProduct, 'Dashboard top product missing.');

const sales = await request('/api/reports/sales?preset=today', { role: 'OWNER' });
assert(sales.sales.some((item) => item.id === sale.id), 'Completed sale missing from sales report.');
assert(!sales.sales.some((item) => item.id === incomplete.id), 'Incomplete cart leaked into sales report.');

const last7 = await request('/api/reports/sales?preset=last7', { role: 'MANAGER' });
assert(last7.range.preset === 'last7', 'Date preset failed.');

const payments = await request('/api/reports/payments?preset=today', { role: 'OWNER' });
assert(payments.totals.UPI > 0, 'UPI payment total missing.');
assert(payments.refundTotal > 0, 'Refund total missing from payment report.');
assert(payments.netCollection <= payments.grossCollection, 'Net collection did not account for refunds.');

const products = await request('/api/reports/products?preset=today', { role: 'OWNER' });
assert(products.products.some((item) => item.productName === 'Tea'), 'Product report missing Tea sale.');

const customers = await request('/api/reports/customers?preset=today', { role: 'OWNER' });
assert(customers.customers.some((item) => item.id === customer.id), 'Customer report missing verification customer.');

const inventory = await request('/api/reports/inventory?preset=today', { role: 'MANAGER' });
assert(inventory.movements.some((item) => item.referenceBillNumber === sale.billNumber), 'Inventory report missing sale/return movements.');

const returnsReport = await request('/api/reports/returns?preset=today', { role: 'OWNER' });
assert(returnsReport.returns.some((item) => item.originalBillNumber === sale.billNumber), 'Returns report missing return.');

await request('/api/reports/staff?preset=today', { role: 'CASHIER', expected: 403 });
await request('/api/reports/sales?preset=today', { role: 'CASHIER', expected: 403 });
const csv = await request('/api/reports/export?type=sales&preset=today', { role: 'OWNER', json: false });
assert(csv.includes('billNumber'), 'CSV export missing headers.');
await request('/api/reports/export?type=sales&preset=today', { role: 'CASHIER', expected: 403 });

const tech = await fetch(base + '/technologies');
assert(tech.status === 404, `/technologies expected 404, got ${tech.status}`);

await request(`/api/transactions/${incomplete.id}`, { method: 'DELETE', role: 'OWNER' });
await request(`/api/customers/${customer.id}`, { method: 'DELETE', role: 'OWNER' });
await post('/api/shopdata', { billPrefix: originalShop.billPrefix || 'VNX', billPadding: originalShop.billPadding || 6 }, 'OWNER');

console.log(JSON.stringify({
  ok: true,
  dashboardDynamic: true,
  reportsExcludeIncompleteCarts: true,
  dateFilters: true,
  paymentTotals: true,
  productReport: true,
  customerReport: true,
  inventoryReport: true,
  returnsSeparated: true,
  roleBlocks: true,
  csvExport: true,
  technologies404: true,
  verificationBill: sale.billNumber,
}, null, 2));

