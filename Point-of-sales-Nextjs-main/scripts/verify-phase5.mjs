const base = process.env.BASE_URL || 'http://localhost:3000';
const assert = (condition, message) => { if (!condition) throw new Error(message); };
async function request(path, options = {}, expected = 200) {
  const response = await fetch(base + path, { ...options, headers: { 'content-type': 'application/json', ...(options.headers || {}) } });
  const body = await response.json().catch(() => ({}));
  if (response.status !== expected) throw new Error(`${path}: expected ${expected}, received ${response.status}: ${JSON.stringify(body)}`);
  return body;
}
const post = (path, body, expected) => request(path, { method: 'POST', body: JSON.stringify(body) }, expected);
const patch = (path, body, expected) => request(path, { method: 'PATCH', body: JSON.stringify(body) }, expected);

const originalShop = (await request('/api/shopdata')).data;
await post('/api/shopdata', { billPrefix: 'P5T', billPadding: 6 });
const customer = await post('/api/customers', { name: 'Phase Five Safety Customer', phone: '+91 90000 00005', email: 'phase5@example.com', country: 'India' }, 201);
const found = await request('/api/customers?q=90000');
assert(found.some((item) => item.id === customer.id), 'Customer search failed.');

const saleStart = await post('/api/transactions', undefined, 201);
await post('/api/onsale', { productId: 'PEN-001', transactionId: saleStart.id, qTy: 2 }, 201);
const sale = await patch(`/api/transactions/${saleStart.id}`, { discount: 0, paymentMethod: 'CASH', amountReceived: 25, customerId: customer.id }, 200);
assert(sale.billNumber.startsWith('P5T-'), 'Configured bill prefix was not applied.');
assert(sale.customerId === customer.id, 'Customer was not linked to checkout.');
await patch(`/api/transactions/${sale.id}`, { discount: 0, paymentMethod: 'CASH', amountReceived: 25 }, 409);

const receiptBefore = await request(`/api/transactions/${sale.id}`);
const snapshot = (items) => JSON.stringify(items.map(({ id, productName, quantity, unitPrice, costPrice, taxRate, lineSubtotal, taxAmount, lineTotal }) => ({ id, productName, quantity, unitPrice, costPrice, taxRate, lineSubtotal, taxAmount, lineTotal })));
const originalSnapshot = snapshot(receiptBefore.items);
const saleLedger = await request('/api/inventory-ledger?productId=PEN-001');
assert(saleLedger.some((item) => item.movementType === 'SALE' && item.referenceId === sale.id), 'Sale ledger entry missing.');
await post('/api/restock', { productId: 'PEN-001', stock: 1, reason: 'Phase 5 safety verification' });
const saleLine = receiptBefore.items[0];
await post('/api/returns', { transactionId: sale.id, refundMethod: 'CASH', reason: 'Phase 5 safety verification', items: [{ saleLineId: saleLine.id, quantity: 1 }] }, 201);
const receiptAfter = await request(`/api/transactions/${sale.id}`);
assert(snapshot(receiptAfter.items) === originalSnapshot, 'Original sale snapshot changed after return.');
assert(receiptAfter.transaction.returnStatus === 'PARTIAL', 'Partial return status missing.');
const returnLedger = await request('/api/inventory-ledger?productId=PEN-001');
assert(returnLedger.some((item) => item.movementType === 'RETURN' && item.referenceBillNumber === sale.billNumber), 'Return ledger entry missing.');
assert(returnLedger.some((item) => item.movementType === 'RESTOCK'), 'Restock ledger entry missing.');
await post('/api/inventory-ledger', { productId: 'PEN-001', newStock: 200, reason: 'Phase 5 adjustment verification' });
const adjustmentLedger = await request('/api/inventory-ledger?productId=PEN-001');
assert(adjustmentLedger.some((item) => item.movementType === 'ADJUSTMENT'), 'Adjustment ledger entry missing.');

const noCustomerStart = await post('/api/transactions', undefined, 201);
await post('/api/onsale', { productId: 'WATER-001', transactionId: noCustomerStart.id, qTy: 1 }, 201);
const noCustomerSale = await patch(`/api/transactions/${noCustomerStart.id}`, { discount: 0, paymentMethod: 'CASH', amountReceived: 25 }, 200);
assert(!noCustomerSale.customerId, 'Walk-in checkout unexpectedly linked a customer.');
assert(noCustomerSale.billNumber !== sale.billNumber, 'Duplicate bill number generated.');

const guardStart = await post('/api/transactions', undefined, 201);
await post('/api/onsale', { productId: 'PEN-001', transactionId: guardStart.id, qTy: 999999 }, 409);
await request(`/api/transactions/${guardStart.id}`, { method: 'DELETE' }, 200);
await request(`/api/customers/${customer.id}`, { method: 'DELETE' }, 200);
await post('/api/shopdata', { billPrefix: originalShop.billPrefix || 'VNX', billPadding: originalShop.billPadding || 6, showBusinessLogo: originalShop.showBusinessLogo, showTaxId: originalShop.showTaxId, showCustomerDetails: originalShop.showCustomerDetails, showItemTax: originalShop.showItemTax, showFooter: originalShop.showFooter });
const dashboard = await request('/api/dashboard');
assert(typeof dashboard.todayRevenue === 'number', 'Dashboard calculation failed.');
console.log(JSON.stringify({ ok: true, customerCheckoutBill: sale.billNumber, walkInBill: noCustomerSale.billNumber, duplicateCheckout: 409, saleLedger: true, restockLedger: true, returnLedger: true, adjustmentLedger: true, immutableReceipt: true, negativeStockGuard: true }, null, 2));
